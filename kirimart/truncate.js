import { sql } from "drizzle-orm";
import { db } from "./src/config/db/index.js";

async function main() {
    try {
        await db.execute(sql`TRUNCATE TABLE categories CASCADE;`);
        console.log("Categories truncated successfully.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
