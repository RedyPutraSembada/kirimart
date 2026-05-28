"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getSellerReviews, replyToReview } from "@/actions/seller-dashboard/review.actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Star, MessageSquare, Reply, Loader2, MessageCircle } from "lucide-react"
import { toast } from "sonner"
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

export function SellerReviewList() {
	const queryClient = useQueryClient()
	const [replyDialog, setReplyDialog] = useState({ open: false, reviewId: null, buyerName: "" })
	const [replyText, setReplyText] = useState("")

	const { data, isLoading } = useQuery({
		queryKey: ["seller-reviews"],
		queryFn: getSellerReviews,
	})

	const replyMutation = useMutation({
		mutationFn: ({ reviewId, text }) => replyToReview(reviewId, text),
		onSuccess: (result) => {
			if (result.success) {
				toast.success(result.message)
				setReplyDialog({ open: false, reviewId: null, buyerName: "" })
				setReplyText("")
				queryClient.invalidateQueries({ queryKey: ["seller-reviews"] })
			} else {
				toast.error(result.error)
			}
		},
		onError: () => toast.error("Gagal mengirim balasan."),
	})

	const reviews = data?.data || []

	// Stats
	const totalReviews = reviews.length
	const avgRating = totalReviews > 0
		? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
		: "0.0"
	const unreplied = reviews.filter(r => !r.sellerReply).length

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 space-y-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Memuat ulasan...</p>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Ulasan Produk</h1>
				<p className="text-muted-foreground">Kelola ulasan dari pembeli untuk produk toko Anda.</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card>
					<CardContent className="p-4 flex items-center gap-4">
						<div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
							<Star className="h-5 w-5 text-amber-500" />
						</div>
						<div>
							<p className="text-2xl font-bold">{avgRating}</p>
							<p className="text-xs text-muted-foreground">Rating Rata-rata</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 flex items-center gap-4">
						<div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
							<MessageSquare className="h-5 w-5 text-blue-500" />
						</div>
						<div>
							<p className="text-2xl font-bold">{totalReviews}</p>
							<p className="text-xs text-muted-foreground">Total Ulasan</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 flex items-center gap-4">
						<div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
							<Reply className="h-5 w-5 text-orange-500" />
						</div>
						<div>
							<p className="text-2xl font-bold">{unreplied}</p>
							<p className="text-xs text-muted-foreground">Belum Dibalas</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Review List */}
			{reviews.length === 0 ? (
				<Card>
					<CardContent className="p-10 text-center">
						<div className="text-4xl mb-3">📝</div>
						<p className="text-sm text-muted-foreground">Belum ada ulasan masuk untuk toko Anda.</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-3">
					{reviews.map((review) => (
						<Card key={review.id} className="overflow-hidden">
							<CardContent className="p-4 space-y-3">
								{/* Product + Buyer Row */}
								<div className="flex items-start gap-3">
									{/* Product Image */}
									<div className="h-12 w-12 rounded-md bg-muted border overflow-hidden relative shrink-0">
										{review.product?.imageUrl ? (
											<Image src={review.product.imageUrl} alt="" fill unoptimized className="object-cover" />
										) : (
											<div className="h-full w-full flex items-center justify-center text-lg">📦</div>
										)}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium line-clamp-1">{review.product?.name}</p>
										<div className="flex items-center gap-2 mt-0.5">
											<div className="flex items-center gap-0.5">
												{[1, 2, 3, 4, 5].map(star => (
													<Star
														key={star}
														className={`h-3 w-3 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
													/>
												))}
											</div>
											<span className="text-[10px] text-muted-foreground">
												{timeAgo(review.createdAt)}
											</span>
										</div>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										{review.sellerReply ? (
											<Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
												Sudah Dibalas
											</Badge>
										) : (
											<Button
												variant="outline"
												size="sm"
												className="text-xs h-7 gap-1"
												onClick={() => {
													setReplyDialog({ open: true, reviewId: review.id, buyerName: review.user?.name })
													setReplyText("")
												}}
											>
												<Reply className="h-3 w-3" />
												Balas
											</Button>
										)}
									</div>
								</div>

								{/* Buyer Info */}
								<div className="flex items-center gap-2 pl-1">
									<div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0 overflow-hidden">
										{review.user?.image ? (
											<Image src={review.user.image} alt="" width={20} height={20} className="object-cover" unoptimized />
										) : (
											review.user?.name?.charAt(0)?.toUpperCase() || "?"
										)}
									</div>
									<span className="text-[11px] font-medium text-foreground">{review.user?.name || "Pembeli"}</span>
								</div>

								{/* Comment */}
								{review.comment && (
									<p className="text-sm text-muted-foreground leading-relaxed pl-1">
										{review.comment}
									</p>
								)}

								{/* Review Image */}
								{review.imageUrl && (
									<div className="h-20 w-20 rounded-lg overflow-hidden border border-border/40 relative ml-1">
										<Image src={review.imageUrl} alt="Review" fill unoptimized className="object-cover" />
									</div>
								)}

								{/* Seller Reply (if exists) */}
								{review.sellerReply && (
									<div className="ml-4 p-3 bg-muted/40 rounded-lg border border-border/30">
										<div className="flex items-center gap-1.5 mb-1">
											<MessageCircle className="h-3 w-3 text-primary" />
											<span className="text-[11px] font-semibold text-foreground">Balasan Anda</span>
											{review.sellerReplyAt && (
												<span className="text-[10px] text-muted-foreground ml-auto">
													{timeAgo(review.sellerReplyAt)}
												</span>
											)}
										</div>
										<p className="text-xs text-muted-foreground leading-relaxed">{review.sellerReply}</p>
									</div>
								)}
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Reply Dialog */}
			<Dialog open={replyDialog.open} onOpenChange={(open) => { if (!open) setReplyDialog({ open: false, reviewId: null, buyerName: "" }) }}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Reply className="h-5 w-5 text-primary" />
							Balas Ulasan
						</DialogTitle>
						<DialogDescription>
							Tulis balasan Anda untuk ulasan dari <strong>{replyDialog.buyerName || "pembeli"}</strong>.
						</DialogDescription>
					</DialogHeader>
					<Textarea
						placeholder="Terima kasih atas ulasannya..."
						value={replyText}
						onChange={(e) => setReplyText(e.target.value)}
						rows={4}
						className="resize-none"
					/>
					<DialogFooter>
						<Button variant="outline" onClick={() => setReplyDialog({ open: false, reviewId: null, buyerName: "" })}>
							Batal
						</Button>
						<Button
							onClick={() => replyMutation.mutate({ reviewId: replyDialog.reviewId, text: replyText })}
							disabled={replyMutation.isPending || !replyText.trim()}
						>
							{replyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Kirim Balasan
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
