"use client"

import { useState } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { completeOrderAndReview } from "@/actions/user-dashboard/order.actions"
import { trackOrderShipment } from "@/actions/public/tracking.actions"
import { useGetOrderDetail } from "@/app/data/user-dashboard/order-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, ArrowLeft, Truck, Package, CheckCircle2, ClipboardCopy, Receipt, MapPin, Star, PackageCheck, Navigation } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function OrderDetail({ orderId }) {
	const queryClient = useQueryClient()
	const [showReviewDialog, setShowReviewDialog] = useState(false)
	const [showTrackingDialog, setShowTrackingDialog] = useState(false)
	const [reviewsState, setReviewsState] = useState([]) // { orderItemId, productId, rating, comment }

	const { data: queryData, isLoading, isError, refetch } = useGetOrderDetail(orderId)

	const completeMutation = useMutation({
		mutationFn: ({ orderId, reviews }) => completeOrderAndReview(orderId, reviews),
		onSuccess: (result) => {
			if (result.success) {
				toast.success(result.message)
				setShowReviewDialog(false)
				queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] })
				queryClient.invalidateQueries({ queryKey: ["my-transactions"] })
			} else {
				toast.error(result.error)
			}
		},
		onError: () => toast.error("Terjadi kesalahan."),
	})

	const order = queryData?.data

	// Live tracking data dari Biteship — shared dengan modal (queryKey sama)
	const shouldTrack = !isLoading && !!order && ['shipped', 'completed'].includes(order?.status) && !!order?.shipment?.awbNumber
	const { data: liveTracking } = useQuery({
		queryKey: ["tracking", orderId],
		queryFn: () => trackOrderShipment(orderId),
		enabled: shouldTrack,
		refetchInterval: 30000,
	})

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 space-y-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Memuat detail pesanan...</p>
			</div>
		)
	}

	if (isError || !order) {
		return (
			<div className="text-center py-20">
				<p className="text-red-500 font-semibold mb-4">Gagal memuat pesanan.</p>
				<Button onClick={() => refetch()} variant="outline">Coba Lagi</Button>
			</div>
		)
	}

	const handleCopy = (text, type) => {
		navigator.clipboard.writeText(text)
		toast.success(`${type} berhasil disalin!`)
	}

	const handleOpenReviewDialog = () => {
		// Initialize review state for each item
		const initialReviews = order.items?.map(item => ({
			orderItemId: item.id,
			productId: item.productId,
			rating: 0,
			comment: "",
		})) || []
		setReviewsState(initialReviews)
		setShowReviewDialog(true)
	}

	const handleSubmitReview = () => {
		// Validate all ratings filled
		const hasEmptyRating = reviewsState.some(r => r.rating < 1)
		if (hasEmptyRating) {
			toast.error("Rating bintang wajib diisi untuk semua produk.")
			return
		}
		completeMutation.mutate({ orderId: order.id, reviews: reviewsState })
	}

	const updateReview = (index, field, value) => {
		setReviewsState(prev => {
			const next = [...prev]
			next[index] = { ...next[index], [field]: value }
			return next
		})
	}

	// Status Tracker UI (with processing step)
	const statuses = [
		{ id: 'pending', label: 'Menunggu', icon: Receipt },
		{ id: 'paid', label: 'Dibayar', icon: Receipt },
		{ id: 'processing', label: 'Dikemas', icon: PackageCheck },
		{ id: 'shipped', label: 'Dikirim', icon: Truck },
		{ id: 'completed', label: 'Selesai', icon: CheckCircle2 }
	]

	const currentStatusIndex = statuses.findIndex(s => s.id === order.status)

	// Build unified timeline: static events + live tracking data
	const buildTimeline = () => {
		const tl = []
		tl.push({ date: order.createdAt, status: 'Pesanan dibuat.' })

		if (['paid', 'processing', 'shipped', 'completed'].includes(order.status)) {
			tl.push({ date: order.payment?.paidAt || order.createdAt, status: 'Pembayaran berhasil. Pesanan diteruskan ke penjual.' })
		}
		if (['processing', 'shipped', 'completed'].includes(order.status)) {
			tl.push({ date: null, status: 'Pesanan sedang dikemas oleh penjual.' })
		}

		// Jika ada live tracking data, gunakan itu (bukan text statis)
		// Biteship timeline sudah sorted newest-first, kita reverse agar jadi oldest-first
		// lalu final .reverse() di bawah akan membuat semuanya newest-first
		if (liveTracking?.success && liveTracking.data?.timeline?.length > 0) {
			const oldestFirst = [...liveTracking.data.timeline].reverse()
			oldestFirst.forEach(t => {
				tl.push({
					date: t.date,
					status: t.note || shipmentStatusLabel[t.status] || t.status,
				})
			})
		} else if (['shipped', 'completed'].includes(order.status)) {
			// Fallback statis jika live tracking belum tersedia
			tl.push({ date: null, status: `Paket diproses oleh ${order.shipment?.courier?.toUpperCase() || 'kurir'}. Resi: ${order.shipment?.awbNumber || '-'}` })
		}

		if (order.status === 'completed') {
			tl.push({ date: null, status: 'Pesanan telah selesai dan diterima oleh pembeli.' })
		}

		return tl
	}

	// Reverse so latest is on top
	const sortedTimeline = [...buildTimeline()].reverse()

	return (
		<div className="space-y-6">
			<Button variant="ghost" size="sm" asChild className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
				<Link href="/user-dashboard/orders">
					<ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke Daftar Pesanan
				</Link>
			</Button>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				
				{/* Kolom Kiri: Status & Info Barang */}
				<div className="lg:col-span-2 space-y-6">
					
					{/* Status Tracker */}
					<Card>
						<CardContent className="p-6">
							<div className="flex justify-between items-center mb-8 relative">
								{/* Garis background */}
								<div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full" />
								
								{/* Garis progres */}
								<div 
									className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full transition-all duration-500" 
									style={{ width: `${currentStatusIndex >= 0 ? (currentStatusIndex / (statuses.length - 1)) * 100 : 0}%` }} 
								/>

								{/* Titik Status */}
								{statuses.map((step, idx) => {
									const isActive = currentStatusIndex >= idx;
									const Icon = step.icon;
									return (
										<div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
											<div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 bg-background transition-colors
												${isActive ? 'border-primary text-primary shadow-md' : 'border-muted-foreground/30 text-muted-foreground/50'}`}
											>
												<Icon className="h-4 w-4" />
											</div>
											<span className={`text-xs font-medium absolute -bottom-6 w-24 text-center
												${isActive ? 'text-foreground' : 'text-muted-foreground/50'}`}>
												{step.label}
											</span>
										</div>
									)
								})}
							</div>
							
							{order.status === 'cancelled' && (
								<div className="mt-8 p-3 bg-red-50 text-red-600 rounded-md text-sm text-center font-medium border border-red-100">
									Pesanan ini telah dibatalkan.
								</div>
							)}

							{/* Tombol Pesanan Diterima */}
						{order.status === 'shipped' && (() => {
							const isDelivered = liveTracking?.data?.status === 'delivered' || order.shipment?.status === 'delivered'
							return (
								<div className={`mt-8 p-4 rounded-lg text-center space-y-3 border
									${isDelivered
										? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
										: 'bg-primary/5 border-primary/20'}`}>
									{isDelivered ? (
										<>
											<div className="flex items-center justify-center gap-2">
												<CheckCircle2 className="h-5 w-5 text-emerald-600" />
												<p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Paket Sudah Tiba!</p>
											</div>
											<p className="text-xs text-emerald-600 dark:text-emerald-500">Konfirmasi penerimaan dan berikan ulasan untuk penjual.</p>
										</>
									) : (
										<p className="text-sm font-medium text-foreground">Pesanan Anda sedang dikirim. Sudah menerima paketnya?</p>
									)}
									<div className="flex gap-2 justify-center">
										<Button variant="outline" onClick={() => setShowTrackingDialog(true)}>
											<Navigation className="h-4 w-4 mr-2" />
											Lacak Resi
										</Button>
										<Button onClick={handleOpenReviewDialog} className={isDelivered ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg" : "shadow-lg"}>
											<CheckCircle2 className="h-4 w-4 mr-2" />
											Pesanan Diterima & Beri Ulasan
										</Button>
									</div>
								</div>
							)
						})()}
						</CardContent>
					</Card>

					{/* Daftar Barang */}
					<Card>
						<CardHeader className="pb-3 border-b">
							<div className="flex items-center gap-2">
								<Package className="h-4 w-4 text-primary" />
								<CardTitle className="text-base">Daftar Produk</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="pt-4 space-y-4">
							<div className="flex items-center gap-2 mb-2">
								<span className="text-sm font-semibold">{order.store?.name}</span>
							</div>
							
							{order.items?.map((item) => (
								<div key={item.id} className="flex gap-4">
									<div className="h-16 w-16 rounded-md bg-muted border overflow-hidden relative shrink-0">
										{item.product?.images?.[0]?.imageUrl ? (
											<Image src={item.product.images[0].imageUrl} alt="Produk" fill unoptimized className="object-cover" />
										) : (
											<div className="h-full w-full flex items-center justify-center text-xs">📦</div>
										)}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium line-clamp-2">{item.productNameSnapshot}</p>
										{item.variantNameSnapshot && <p className="text-xs text-muted-foreground mt-0.5">{item.variantNameSnapshot}</p>}
										<p className="text-sm font-bold mt-1 text-primary">{fmt(item.priceSnapshot)} <span className="text-xs text-muted-foreground font-normal">x {item.quantity}</span></p>
									</div>
									<div className="text-right">
										<p className="text-sm font-semibold">{fmt(item.priceSnapshot * item.quantity)}</p>
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				</div>

				{/* Kolom Kanan: Pengiriman & Pembayaran */}
				<div className="space-y-6">
					
					{/* Info Pengiriman & Lacak Resi */}
					<Card>
						<CardHeader className="pb-3 border-b">
							<div className="flex items-center gap-2">
								<Truck className="h-4 w-4 text-primary" />
								<CardTitle className="text-base">Info Pengiriman</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="pt-4 space-y-4">
							<div className="space-y-1">
								<p className="text-xs text-muted-foreground">Kurir</p>
								<p className="text-sm font-medium">{order.shipment?.courier || order.payment?.metadataLocal?.stores?.find(s => s.storeId === order.storeId)?.selectedShipping?.name || "Reguler"}</p>
							</div>
							
							{order.shipment?.awbNumber && (
								<div className="space-y-1">
									<p className="text-xs text-muted-foreground">No. Resi</p>
									<div className="flex items-center justify-between bg-muted/50 p-2 rounded-md border">
										<p className="text-sm font-mono font-bold tracking-wider">{order.shipment.awbNumber}</p>
										<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(order.shipment.awbNumber, "Nomor Resi")}>
											<ClipboardCopy className="h-3 w-3" />
										</Button>
									</div>
								</div>
							)}

							<div className="space-y-1 pt-2 border-t">
								<p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="h-3 w-3" /> Alamat Tujuan</p>
								<p className="text-sm font-medium">{order.payment?.metadataLocal?.address?.name}</p>
								<p className="text-xs text-muted-foreground">{order.payment?.metadataLocal?.address?.phone}</p>
								<p className="text-xs text-muted-foreground line-clamp-3">{order.payment?.metadataLocal?.address?.detail}</p>
							</div>

							{/* Live Tracking Timeline */}
							<div className="pt-4 border-t space-y-4">
								<div className="flex items-center justify-between">
									<p className="text-xs font-semibold">Status Pelacakan</p>
									{order.shipment?.awbNumber && (
										<Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setShowTrackingDialog(true)}>
											<Navigation className="h-3 w-3 mr-1" />
											Lihat Detail
										</Button>
									)}
								</div>
								<div className="relative pl-4 border-l-2 border-border/50 space-y-4">
									{sortedTimeline.map((tl, i) => (
										<div key={i} className="relative">
											<div className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${i === 0 ? 'bg-primary ring-4 ring-primary/20' : 'bg-muted-foreground/30'}`} />
											<p className={`text-xs ${i === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{tl.status}</p>
											{tl.date && (
												<p className="text-[10px] text-muted-foreground mt-0.5">
													{new Date(tl.date).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
												</p>
											)}
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Rincian Pembayaran */}
					<Card>
						<CardHeader className="pb-3 border-b">
							<div className="flex items-center gap-2">
								<Receipt className="h-4 w-4 text-primary" />
								<CardTitle className="text-base">Rincian Pembayaran</CardTitle>
							</div>
						</CardHeader>
						<CardContent className="pt-4 space-y-3">
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Total Harga Produk</span>
								<span className="font-medium">{fmt(order.grandTotal - order.totalShipping + order.discountAmount)}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Total Ongkos Kirim</span>
								<span className="font-medium">{fmt(order.totalShipping)}</span>
							</div>
							
							{order.discountAmount > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Diskon Toko</span>
									<span className="font-medium text-green-600">-{fmt(order.discountAmount)}</span>
								</div>
							)}

							<div className="pt-3 border-t flex justify-between items-center">
								<span className="font-bold">Total Tagihan Toko</span>
								<span className="font-bold text-foreground">{fmt(order.grandTotal)}</span>
							</div>

							{order.payment && (
								<div className="pt-4 mt-2 border-t border-dashed space-y-3">
									<p className="text-xs font-semibold text-muted-foreground">Informasi Transaksi Gabungan (Semua Toko)</p>
									{order.payment.metadataLocal?.serviceFee > 0 && (
										<div className="flex justify-between text-xs">
											<span className="text-muted-foreground">Biaya Layanan & Penanganan</span>
											<span className="font-medium">{fmt(order.payment.metadataLocal.serviceFee)}</span>
										</div>
									)}
									<div className="flex justify-between text-sm items-center">
										<span className="font-bold">Total Keseluruhan Transaksi</span>
										<span className="font-bold text-primary">{fmt(order.payment.totalAmount)}</span>
									</div>
								</div>
							)}
						</CardContent>
					</Card>

				</div>
			</div>

			{/* Dialog: Review & Selesaikan Pesanan */}
			<Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
				<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Konfirmasi Pesanan Diterima</DialogTitle>
						<DialogDescription>Berikan rating untuk setiap produk yang Anda beli. Rating bintang wajib diisi.</DialogDescription>
					</DialogHeader>
					<div className="space-y-6 py-2">
						{reviewsState.map((review, idx) => {
							const item = order.items?.find(i => i.id === review.orderItemId)
							return (
								<div key={review.orderItemId} className="space-y-3 p-4 bg-muted/30 rounded-lg border">
									<div className="flex gap-3">
										<div className="h-12 w-12 rounded-md bg-muted border overflow-hidden relative shrink-0">
											{item?.product?.images?.[0]?.imageUrl ? (
												<Image src={item.product.images[0].imageUrl} alt="" fill unoptimized className="object-cover" />
											) : (
												<div className="h-full w-full flex items-center justify-center text-xs">📦</div>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium line-clamp-1">{item?.productNameSnapshot}</p>
											{item?.variantNameSnapshot && <p className="text-xs text-muted-foreground">{item.variantNameSnapshot}</p>}
										</div>
									</div>
									
									{/* Star Rating */}
									<div className="space-y-1">
										<p className="text-xs font-medium">Rating <span className="text-red-500">*</span></p>
										<div className="flex gap-1">
											{[1, 2, 3, 4, 5].map(star => (
												<button
													key={star}
													type="button"
													onClick={() => updateReview(idx, "rating", star)}
													className="transition-transform hover:scale-110"
												>
													<Star
														className={`h-7 w-7 transition-colors ${
															star <= review.rating
																? "fill-amber-400 text-amber-400"
																: "fill-none text-muted-foreground/30 hover:text-amber-300"
														}`}
													/>
												</button>
											))}
										</div>
									</div>

									{/* Comment (optional) */}
									<div className="space-y-1">
										<p className="text-xs font-medium">Komentar <span className="text-muted-foreground">(opsional)</span></p>
										<Textarea
											placeholder="Tulis ulasan Anda..."
											value={review.comment}
											onChange={(e) => updateReview(idx, "comment", e.target.value)}
											rows={2}
											className="resize-none"
										/>
									</div>
								</div>
							)
						})}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowReviewDialog(false)}>Batal</Button>
						<Button onClick={handleSubmitReview} disabled={completeMutation.isPending}>
							{completeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Konfirmasi & Kirim Ulasan
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Dialog: Lacak Resi */}
			<Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Navigation className="h-5 w-5 text-primary" />
							Lacak Resi #{order.id}
						</DialogTitle>
						<DialogDescription>Lacak posisi paket secara real-time.</DialogDescription>
					</DialogHeader>
					<BuyerTrackingContent trackingData={liveTracking} />
				</DialogContent>
			</Dialog>
		</div>
	)
}

// Label status detail berdasarkan shipments.status dari Biteship
const shipmentStatusLabel = {
	pending: "Menunggu Proses",
	confirmed: "Menunggu Penjemputan",
	allocated: "Kurir Dialokasikan",
	picking_up: "Kurir Sedang Menjemput",
	picked: "Paket Dijemput",
	in_transit: "Dalam Perjalanan",
	dropping_off: "Kurir Mengantar",
	delivered: "Tiba di Tujuan",
	returned: "Dikembalikan",
	cancelled: "Dibatalkan",
}

function BuyerTrackingContent({ trackingData }) {
	if (!trackingData) {
		return (
			<div className="flex flex-col items-center justify-center py-8 gap-3">
				<Loader2 className="h-6 w-6 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Memuat data pelacakan...</p>
			</div>
		)
	}

	if (!trackingData?.success) {
		return (
			<div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
				<p className="text-sm text-red-600">{trackingData?.error || "Gagal memuat data pelacakan."}</p>
			</div>
		)
	}

	const { awbNumber, courier, service, status, timeline, _fallback } = trackingData.data

	return (
		<div className="space-y-4 max-h-[50vh] overflow-y-auto">
			<div className="rounded-lg border p-3 bg-muted/30 space-y-2">
				<div className="flex justify-between items-center">
					<div>
						<p className="text-xs text-muted-foreground">Nomor Resi</p>
						<p className="font-mono font-bold text-sm tracking-wider">{awbNumber}</p>
					</div>
					<Badge variant="outline" className="text-xs capitalize">
						{shipmentStatusLabel[status] || status}
					</Badge>
				</div>
				<p className="text-xs text-muted-foreground">{courier?.toUpperCase()} — {service}</p>
			</div>

			{_fallback && (
				<div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-2">
					⚠️ Data dari database lokal (mode sandbox). Tracking live tidak tersedia.
				</div>
			)}

			<div className="relative pl-6 space-y-4">
				{timeline.map((t, i) => (
					<div key={i} className="relative">
						{i < timeline.length - 1 && (
							<div className="absolute left-[-18px] top-3 bottom-[-20px] w-0.5 bg-border" />
						)}
						<div className={`absolute left-[-22px] top-1 h-2.5 w-2.5 rounded-full border-2 bg-background
							${i === 0 ? "border-primary ring-4 ring-primary/20" : "border-muted-foreground/30"}`}
						/>
						<div>
							<p className={`text-xs font-medium ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>
								{t.note || shipmentStatusLabel[t.status] || t.status}
							</p>
							{t.date && (
								<p className="text-[10px] text-muted-foreground mt-0.5">
									{new Date(t.date).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
								</p>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
