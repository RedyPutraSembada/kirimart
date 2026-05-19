"use client"

import { useGetMyTransactions } from "@/app/data/user-dashboard/order-data"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, Package, Clock, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function OrderList() {
	const router = useRouter()
	const [isResumingPayment, setIsResumingPayment] = useState(false)

	const { data: queryData, isLoading, isError, refetch } = useGetMyTransactions()

	const transactions = queryData?.data || []

	// Pisahkan transaksi pending dari transaksi lain
	const pendingTransactions = transactions.filter(t => t.status === "pending")
	const otherTransactions = transactions.filter(t => t.status !== "pending")

	const isPaymentSuccess = (status) => ['settlement', 'capture', 'paid'].includes(status)

	const handleResumePayment = async (payment) => {
		if (!payment.snapToken) {
			toast.error("Token pembayaran tidak ditemukan. Silakan buat transaksi baru.")
			return
		}

		if (typeof window.snap === 'undefined') {
			toast.error("Sistem pembayaran sedang dimuat. Silakan coba lagi.")
			return
		}

		setIsResumingPayment(true)

		window.snap.pay(payment.snapToken, {
			onSuccess: () => {
				toast.success("Pembayaran berhasil!")
				refetch()
				setIsResumingPayment(false)
			},
			onPending: () => {
				toast.info("Pembayaran masih tertunda.")
				setIsResumingPayment(false)
			},
			onError: () => {
				toast.error("Pembayaran gagal.")
				refetch()
				setIsResumingPayment(false)
			},
			onClose: () => {
				setIsResumingPayment(false)
			},
		})
	}

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 space-y-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Memuat riwayat pesanan...</p>
			</div>
		)
	}

	if (isError) {
		return (
			<div className="text-center py-20">
				<p className="text-red-500 font-semibold mb-4">Gagal memuat pesanan.</p>
				<Button onClick={() => refetch()} variant="outline">Coba Lagi</Button>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Pesanan Saya</h2>
				<p className="text-muted-foreground">Pantau status pesanan dan riwayat belanja Anda.</p>
			</div>

			{/* ========================================= */}
			{/* TRANSAKSI PENDING */}
			{/* ========================================= */}
			{pendingTransactions.length > 0 && (
				<div className="space-y-4">
					<h3 className="font-semibold flex items-center gap-2">
						<Clock className="h-4 w-4 text-amber-500" /> Menunggu Pembayaran
					</h3>
					{pendingTransactions.map((trx) => (
						<Card key={trx.id} className="border-amber-500/30 bg-amber-500/5">
							<CardContent className="p-4 md:p-6">
								<div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="text-xs font-mono font-semibold text-muted-foreground">{trx.orderId}</span>
											<Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/10">Pending</Badge>
										</div>
										<p className="text-sm font-semibold">Total Tagihan: <span className="text-primary">{fmt(trx.totalAmount)}</span></p>
										<p className="text-xs text-muted-foreground">Selesaikan pembayaran sebelum batas waktu berakhir.</p>
									</div>
									<Button 
										onClick={() => handleResumePayment(trx)} 
										disabled={isResumingPayment}
										className="shrink-0"
									>
										{isResumingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
										Lanjutkan Pembayaran
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* ========================================= */}
			{/* RIWAYAT PESANAN */}
			{/* ========================================= */}
			<div className="space-y-4">
				<h3 className="font-semibold flex items-center gap-2">
					<Package className="h-4 w-4 text-primary" /> Riwayat Pesanan
				</h3>
				
				{otherTransactions.length === 0 ? (
					<Card className="border-dashed">
						<CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
							<div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
								<Package className="h-6 w-6 text-muted-foreground" />
							</div>
							<div className="space-y-1">
								<p className="font-semibold text-lg">Belum ada pesanan</p>
								<p className="text-sm text-muted-foreground">Anda belum memiliki riwayat belanja.</p>
							</div>
							<Button asChild><Link href="/">Mulai Belanja</Link></Button>
						</CardContent>
					</Card>
				) : (
					<div className="space-y-4">
						{otherTransactions.map((trx) => (
							<Card key={trx.id}>
								<CardHeader className="pb-3 border-b bg-muted/20">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span className="text-xs font-mono font-medium">{trx.orderId}</span>
											<span className="text-xs text-muted-foreground">·</span>
											<span className="text-xs text-muted-foreground">
												{new Date(trx.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
											</span>
										</div>
										<Badge variant="outline" className={
											isPaymentSuccess(trx.status) ? "border-green-500 text-green-600 bg-green-500/10" :
											"border-red-500 text-red-600 bg-red-500/10"
										}>
											{isPaymentSuccess(trx.status) ? "Pembayaran Berhasil" : "Gagal/Dibatalkan"}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="pt-4 space-y-4">
									{trx.orders?.map((order) => (
										<div key={order.id} className="space-y-3">
											<div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
												<div className="flex items-center gap-2">
													<StoreIcon /> <span className="text-sm font-semibold">{order.store?.name}</span>
												</div>
												<div className="flex items-center gap-2">
													<Badge variant="secondary" className="text-[10px] tracking-wide font-medium">
														{order.status === "pending" ? "Menunggu Konfirmasi" :
														 order.status === "paid" ? "Pesanan Diproses" :
														 order.status === "processing" ? "Sedang Dikemas" :
														 order.status === "shipped" ? "Sedang Dikirim" :
														 order.status === "completed" ? "Selesai" :
														 order.status === "cancelled" ? "Dibatalkan" : order.status}
													</Badge>
													{isPaymentSuccess(trx.status) && (
														<Button asChild variant="outline" size="sm" className="h-6 text-[10px] px-2 border-primary/50 text-primary hover:bg-primary/10">
															<Link href={`/user-dashboard/orders/${order.id}`}>Lihat Detail</Link>
														</Button>
													)}
												</div>
											</div>
											{order.items?.map((item) => (
												<div key={item.id} className="flex gap-4 ml-6">
													<div className="h-16 w-16 rounded-md bg-muted border overflow-hidden relative shrink-0">
														{item.product?.images?.[0]?.imageUrl ? (
															<Image src={item.product.images[0].imageUrl} alt="Produk" fill unoptimized className="object-cover" />
														) : (
															<div className="h-full w-full flex items-center justify-center text-xs">📦</div>
														)}
													</div>
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium line-clamp-1">{item.productNameSnapshot}</p>
														{item.variantNameSnapshot && <p className="text-xs text-muted-foreground">{item.variantNameSnapshot}</p>}
														<p className="text-xs text-muted-foreground mt-1">{item.quantity} barang x {fmt(item.priceSnapshot)}</p>
													</div>
												</div>
											))}
										</div>
									))}
								</CardContent>
								<div className="px-6 py-3 border-t flex items-center justify-between bg-muted/10">
									<span className="text-sm font-medium">Total Belanja</span>
									<span className="text-sm font-bold text-primary">{fmt(trx.totalAmount)}</span>
								</div>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

function StoreIcon() {
	return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 3v6"/></svg>
}
