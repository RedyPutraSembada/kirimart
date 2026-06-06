import { Redis } from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
let redisClient = null;

function getRedis() {
    if (!redisClient) {
        redisClient = new Redis(REDIS_URL);
    }
    return redisClient;
}

export async function recalculateAllScores(pool) {
    console.log("[FAIR-RANK] Starting recalculation of visibility scores...");
    const client = await pool.connect();
    
    try {
        await client.query("BEGIN");
        
        // 1. Update store_metrics (UPSERT)
        console.log("[FAIR-RANK] Step 1: Precomputing store metrics...");
        await client.query(`
            INSERT INTO store_metrics (
                store_id, total_orders, completed_orders, cancelled_orders, 
                total_complaints, complaint_rate, has_active_voucher, last_product_at, profile_completeness, updated_at
            )
            SELECT 
                s.id as store_id,
                COALESCE(o.total_orders, 0) as total_orders,
                COALESCE(o.completed_orders, 0) as completed_orders,
                COALESCE(o.cancelled_orders, 0) as cancelled_orders,
                COALESCE(c.total_complaints, 0) as total_complaints,
                CASE 
                    WHEN COALESCE(o.total_orders, 0) = 0 THEN 0
                    ELSE CAST(COALESCE(c.total_complaints, 0) AS DECIMAL) / COALESCE(o.total_orders, 1)
                END as complaint_rate,
                COALESCE(v.has_active, false) as has_active_voucher,
                p.last_product_at,
                (
                    (CASE WHEN s.logo_url IS NOT NULL THEN 20 ELSE 0 END) +
                    (CASE WHEN s.banner_url IS NOT NULL THEN 20 ELSE 0 END) +
                    (CASE WHEN s.description IS NOT NULL THEN 20 ELSE 0 END) +
                    (CASE WHEN s.bank_account_number IS NOT NULL THEN 20 ELSE 0 END) +
                    (CASE WHEN s.enabled_couriers IS NOT NULL THEN 20 ELSE 0 END)
                ) as profile_completeness,
                NOW()
            FROM stores s
            LEFT JOIN (
                SELECT store_id, 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
                FROM orders GROUP BY store_id
            ) o ON o.store_id = s.id
            LEFT JOIN (
                SELECT store_id, COUNT(*) as total_complaints FROM complaints GROUP BY store_id
            ) c ON c.store_id = s.id
            LEFT JOIN (
                SELECT store_id, true as has_active FROM vouchers 
                WHERE status = 'active' AND start_date <= NOW() AND end_date >= NOW()
                GROUP BY store_id
            ) v ON v.store_id = s.id
            LEFT JOIN (
                SELECT store_id, MAX(created_at) as last_product_at FROM products GROUP BY store_id
            ) p ON p.store_id = s.id
            ON CONFLICT (store_id) DO UPDATE SET
                total_orders = EXCLUDED.total_orders,
                completed_orders = EXCLUDED.completed_orders,
                cancelled_orders = EXCLUDED.cancelled_orders,
                total_complaints = EXCLUDED.total_complaints,
                complaint_rate = EXCLUDED.complaint_rate,
                has_active_voucher = EXCLUDED.has_active_voucher,
                last_product_at = EXCLUDED.last_product_at,
                profile_completeness = EXCLUDED.profile_completeness,
                updated_at = NOW();
        `);

        // 2. Fetch products & calculate scores
        console.log("[FAIR-RANK] Step 2: Calculating scores per product...");
        const { rows: products } = await client.query(`
            SELECT 
                p.id as product_id, p.store_id, p.rating as product_rating, p.total_reviews as product_reviews, p.sold_count as product_sold, p.original_price, p.created_at as product_created_at,
                s.rating as store_rating, s.total_reviews as store_reviews, s.is_verified as store_verified,
                m.complaint_rate, m.has_active_voucher, m.last_product_at, m.profile_completeness
            FROM products p
            JOIN stores s ON p.store_id = s.id
            JOIN store_metrics m ON s.id = m.store_id
            WHERE p.status = 'active';
        `);

        const timeBucket = Math.floor(Date.now() / 1000 / 21600); // 6 hours

        for (const p of products) {
            // -- MERIT SCORE (0-100) --
            // Product Quality (max 40)
            const pRating = Math.max(1, parseFloat(p.product_rating || 5));
            const pRatingScore = ((pRating - 1) / 4) * 15;
            const pReviewScore = Math.min(10, Math.log2(Number(p.product_reviews || 0) + 1) * 2);
            const pSoldScore = Math.min(10, Math.log2(Number(p.product_sold || 0) + 1) * 1.5);
            const pDiscountScore = p.original_price ? 5 : 0;
            const productQuality = Math.min(40, pRatingScore + pReviewScore + pSoldScore + pDiscountScore);

            // Store Reputation (max 40)
            const sRating = Math.max(1, parseFloat(p.store_rating || 5));
            const sRatingScore = ((sRating - 1) / 4) * 15;
            const sVerifiedScore = p.store_verified ? 10 : 0;
            const sReviewScore = Math.min(10, Math.log2(Number(p.store_reviews || 0) + 1) * 2);
            const complaintRate = parseFloat(p.complaint_rate || 0);
            const sComplaintPenalty = Math.max(-5, -complaintRate * 5);
            const storeReputation = Math.min(40, Math.max(0, sRatingScore + sVerifiedScore + sReviewScore + sComplaintPenalty));

            // Activity Bonus (max 20)
            const activityVoucher = p.has_active_voucher ? 5 : 0;
            const profileComp = (Number(p.profile_completeness || 0) / 100) * 5;
            const lastProdDate = new Date(p.last_product_at || 0);
            const daysSinceLastProd = (Date.now() - lastProdDate.getTime()) / (1000 * 60 * 60 * 24);
            const activityFresh = daysSinceLastProd < 30 ? 5 : 0;
            const activityBonus = Math.min(20, activityVoucher + profileComp + activityFresh);

            const meritScore = Math.round(productQuality + storeReputation + activityBonus);

            // -- FRESHNESS BOOST (0-30) --
            const productDate = new Date(p.product_created_at || Date.now());
            const ageInDays = (Date.now() - productDate.getTime()) / (1000 * 60 * 60 * 24);
            const freshnessBoost = ageInDays < 7 ? Math.round(30 * (1 - (ageInDays / 7))) : 0;

            // -- RANDOMIZER (0-10) --
            let hash = 0;
            const seedStr = `${p.product_id}_${timeBucket}`;
            for (let i = 0; i < seedStr.length; i++) {
                hash = Math.imul(31, hash) + seedStr.charCodeAt(i) | 0;
            }
            const randomizer = Math.abs(hash % 1000) / 100; // 0.0 to 9.9
            const randomizerRounded = Math.round(randomizer);

            // -- TOTAL --
            const totalScore = meritScore + freshnessBoost + randomizerRounded;
            
            const breakdown = JSON.stringify({ productQuality, storeReputation, activityBonus });

            await client.query(
                `UPDATE products SET visibility_score = $1, score_updated_at = NOW() WHERE id = $2`,
                [totalScore, p.product_id]
            );

            await client.query(
                `INSERT INTO score_logs (product_id, store_id, merit_score, freshness_boost, randomizer, total_score, breakdown) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [p.product_id, p.store_id, meritScore, freshnessBoost, randomizerRounded, totalScore, breakdown]
            );
        }

        if (products.length > 0) {
            console.log(`[FAIR-RANK] ✅ Updated ${products.length} products.`);
        } else {
            console.log(`[FAIR-RANK] No active products found to update.`);
        }

        // 3. Cleanup old logs (keep last 30 days)
        await client.query(`DELETE FROM score_logs WHERE calculated_at < NOW() - INTERVAL '30 days'`);

        await client.query("COMMIT");

        // 4. Invalidate Redis Cache
        const redis = getRedis();
        // Mengambil keys bisa blocking untuk db besar, tapi untuk MVP tidak masalah
        const keys = await redis.keys("cache:products:*");
        if (keys.length > 0) {
            await redis.del(keys);
            console.log(`[FAIR-RANK] 🧹 Cleared ${keys.length} product cache entries.`);
        }

        return { success: true, processed: products.length };
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("[FAIR-RANK] ❌ Error recalculating scores:", err);
        throw err;
    } finally {
        client.release();
    }
}
