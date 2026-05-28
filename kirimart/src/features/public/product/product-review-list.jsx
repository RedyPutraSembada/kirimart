"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getProductReviews, getProductReviewStats } from "@/actions/public/review.actions"
import { Star, ChevronDown, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import Image from "next/image"

function timeAgo(date) {
	const now = new Date()
	const d = new Date(date)
	const diff = Math.floor((now - d) / 1000)
	if (diff < 60) return "Baru saja"
	if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
	if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
	if (diff < 2592000) return `${Math.floor(diff / 86400)} hari lalu`
	return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

function StarRating({ rating, size = "sm" }) {
	const sizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
	return (
		<div className="flex items-center gap-0.5">
			{[1, 2, 3, 4, 5].map((star) => (
				<Star
					key={star}
					className={cn(
						sizeClass,
						star <= rating
							? "fill-amber-400 text-amber-400"
							: "fill-muted text-muted"
					)}
				/>
			))}
		</div>
	)
}

export function ProductReviewList({ productId }) {
	const [page, setPage] = useState(1)
	const [allReviews, setAllReviews] = useState([])

	// Stats (histogram)
	const { data: statsData } = useQuery({
		queryKey: ["product-review-stats", productId],
		queryFn: () => getProductReviewStats(productId),
	})

	// Reviews (paginated)
	const { data: reviewsData, isLoading, isFetching } = useQuery({
		queryKey: ["product-reviews", productId, page],
		queryFn: async () => {
			const res = await getProductReviews(productId, { page, limit: 5 })
			if (res.success && page > 1) {
				setAllReviews((prev) => [...prev, ...res.data])
			} else if (res.success) {
				setAllReviews(res.data)
			}
			return res
		},
	})

	const stats = statsData?.data
	const total = stats?.totalReviews || 0
	const hasMore = reviewsData?.hasMore || false

	if (total === 0) {
		return (
			<div className="space-y-4 py-6">
				<h3 className="text-sm font-semibold flex items-center gap-2">
					<MessageSquare className="h-4 w-4" /> Ulasan Produk
				</h3>
				<div className="text-center py-10 text-muted-foreground text-sm">
					<div className="text-3xl mb-2">📝</div>
					Belum ada ulasan untuk produk ini.
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-5 py-6">
			<h3 className="text-sm font-semibold flex items-center gap-2">
				<MessageSquare className="h-4 w-4" /> Ulasan Produk ({total})
			</h3>

			{/* Rating Summary Card */}
			{stats && (
				<div className="flex gap-6 p-4 bg-muted/30 rounded-xl border border-border/40">
					{/* Left: Big rating number */}
					<div className="flex flex-col items-center justify-center gap-1 min-w-[80px]">
						<span className="text-4xl font-black text-foreground leading-none">
							{stats.avgRating.toFixed(1)}
						</span>
						<StarRating rating={Math.round(stats.avgRating)} size="md" />
						<span className="text-[11px] text-muted-foreground mt-1">
							{total} ulasan
						</span>
					</div>

					{/* Right: Star histogram */}
					<div className="flex-1 space-y-1.5">
						{[5, 4, 3, 2, 1].map((star) => {
							const count = stats.stars[star] || 0
							const percent = total > 0 ? (count / total) * 100 : 0
							return (
								<div key={star} className="flex items-center gap-2">
									<div className="flex items-center gap-0.5 w-[50px] justify-end">
										<Star className="h-3 w-3 fill-amber-400 text-amber-400" />
										<span className="text-[11px] font-medium text-foreground w-3 text-right">{star}</span>
									</div>
									<Progress value={percent} className="h-2 flex-1" />
									<span className="text-[10px] text-muted-foreground w-6 text-right">{count}</span>
								</div>
							)
						})}
					</div>
				</div>
			)}

			<Separator />

			{/* Review List */}
			<div className="space-y-4">
				{allReviews.map((review) => (
					<div key={review.id} className="space-y-2 pb-4 border-b border-border/30 last:border-b-0">
						{/* Header */}
						<div className="flex items-center gap-2.5">
							<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
								{review.user?.image ? (
									<Image src={review.user.image} alt="" width={32} height={32} className="object-cover" unoptimized />
								) : (
									review.user?.name?.charAt(0)?.toUpperCase() || "?"
								)}
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-xs font-semibold text-foreground truncate">
									{review.user?.name || "Pembeli"}
								</p>
								<p className="text-[10px] text-muted-foreground">
									{timeAgo(review.createdAt)}
								</p>
							</div>
						</div>

						{/* Stars */}
						<StarRating rating={review.rating} />

						{/* Comment */}
						{review.comment && (
							<p className="text-sm text-muted-foreground leading-relaxed">
								{review.comment}
							</p>
						)}

						{/* Review Image */}
						{review.imageUrl && (
							<div className="h-20 w-20 rounded-lg overflow-hidden border border-border/40 relative">
								<Image src={review.imageUrl} alt="Review" fill unoptimized className="object-cover" />
							</div>
						)}

						{/* Seller Reply */}
						{review.sellerReply && (
							<div className="ml-4 mt-2 p-3 bg-muted/50 rounded-lg border border-border/30">
								<div className="flex items-center gap-1.5 mb-1">
									<div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
										<span className="text-[8px] font-bold text-primary">🏪</span>
									</div>
									<span className="text-[11px] font-semibold text-foreground">Balasan Penjual</span>
									{review.sellerReplyAt && (
										<span className="text-[10px] text-muted-foreground ml-auto">
											{timeAgo(review.sellerReplyAt)}
										</span>
									)}
								</div>
								<p className="text-xs text-muted-foreground leading-relaxed">
									{review.sellerReply}
								</p>
							</div>
						)}
					</div>
				))}
			</div>

			{/* Load More */}
			{hasMore && (
				<div className="flex justify-center">
					<Button
						variant="outline"
						size="sm"
						className="text-xs font-semibold gap-1.5"
						onClick={() => setPage((p) => p + 1)}
						disabled={isFetching}
					>
						{isFetching ? (
							"Memuat..."
						) : (
							<>
								Lihat ulasan lainnya
								<ChevronDown className="h-3.5 w-3.5" />
							</>
						)}
					</Button>
				</div>
			)}
		</div>
	)
}
