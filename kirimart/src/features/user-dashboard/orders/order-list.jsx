"use client"

import { useGetMyTransactions } from "@/app/data/user-dashboard/order-data"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

	const isPaymentSuccess = (status) => ['settlement', 'capture', 'paid'].includes(status)

	const handleResumePayment = async (payment) => {
		// Jika menggunakan Core API (tanpa snapToken), arahkan ke halaman instruksi
		if (!payment.snapToken) {
			router.push(`/checkout/payment/instruction?order_id=${payment.orderId}`)
			return
		}

		// Jika menggunakan Midtrans Snap
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
			{/* RIWAYAT PESANAN (TABS) */}
			{/* ========================================= */}
			<div className="space-y-4">
				<h3 className="font-semibold flex items-center gap-2">
					<Package className="h-4 w-4 text-primary" /> Riwayat Pesanan
				</h3>
				
				<Tabs defaultValue="all" className="w-full">
					<TabsList className="mb-4 flex overflow-x-auto whitespace-nowrap h-auto w-full justify-start gap-1 p-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
						<TabsTrigger value="all">Semua</TabsTrigger>
						<TabsTrigger value="pending">Menunggu Pembayaran</TabsTrigger>
						<TabsTrigger value="processing">Diproses</TabsTrigger>
						<TabsTrigger value="shipped">Dikirim</TabsTrigger>
						<TabsTrigger value="completed">Selesai</TabsTrigger>
						<TabsTrigger value="failed">Gagal/Batal</TabsTrigger>
						<TabsTrigger value="issues">Kendala</TabsTrigger>
					</TabsList>

					{[
						{ value: "all", filterFn: () => true },
						{ value: "pending", filterFn: (o) => o.status === "pending" },
						{ value: "processing", filterFn: (o) => ["paid", "processing"].includes(o.status) },
						{ value: "shipped", filterFn: (o) => o.status === "shipped" },
						{ value: "completed", filterFn: (o) => o.status === "completed" },
						{ value: "failed", filterFn: (o) => ["cancelled", "cancelled_by_seller"].includes(o.status) },
						{ value: "issues", filterFn: (o) => ["complained", "refunded", "return_requested", "return_shipped", "refund_processing"].includes(o.status) },
					].map(tab => {
						const filteredTrx = transactions.map(trx => {
							const matchingOrders = trx.orders?.filter(tab.filterFn) || []
							return { ...trx, orders: matchingOrders }
						}).filter(trx => trx.orders.length > 0)

						return (
							<TabsContent key={tab.value} value={tab.value}>
								{filteredTrx.length === 0 ? (
									<Card className="border-dashed">
										<CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
											<div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
												<Package className="h-6 w-6 text-muted-foreground" />
											</div>
											<div className="space-y-1">
												<p className="font-semibold text-lg">Tidak ada pesanan</p>
												<p className="text-sm text-muted-foreground">Anda belum memiliki riwayat belanja di kategori ini.</p>
											</div>
											{tab.value === "all" && <Button asChild><Link href="/">Mulai Belanja</Link></Button>}
										</CardContent>
									</Card>
								) : (
									<div className="space-y-4">
										{filteredTrx.map((trx) => {
											// Tampilan khusus jika transaksi masih pending (menunggu pembayaran)
											if (trx.status === "pending") {
												return (
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
												)
											}

											// Tampilan riwayat pesanan normal
											return (
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
																			 order.status === "cancelled" ? "Dibatalkan" : 
																			 order.status === "cancelled_by_seller" ? "Dibatalkan Penjual" :
																			 order.status === "complained" ? "Komplain Diproses" :
																			 order.status === "return_requested" ? "Menunggu Kirim Retur" :
																			 order.status === "return_shipped" ? "Retur Dikirim" :
																			 order.status === "refund_processing" ? "Proses Pengembalian Dana" :
																			 order.status === "refunded" ? "Dana Dikembalikan" : order.status}
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
														<span className="text-sm font-medium">Total Belanja (Transaksi Ini)</span>
														<span className="text-sm font-bold text-primary">{fmt(trx.totalAmount)}</span>
													</div>
												</Card>
											)
										})}
									</div>
								)}
							</TabsContent>
						)
					})}
				</Tabs>
			</div>
		</div>
	)
}

function StoreIcon() {
	return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 3v6"/></svg>
}
