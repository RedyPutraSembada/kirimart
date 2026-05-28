"use client"

import { useState } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { updateOrderStatus, getOrderShippingDetail, shipOrderViaBiteship } from "@/actions/seller-dashboard/order.actions"
import { trackOrderShipment } from "@/actions/public/tracking.actions"
import { useGetSellerOrders } from "@/app/data/seller-dashboard/order/order-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
	Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
	DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
	Search, MoreHorizontal, Eye, Truck, CheckCircle2, Clock, Package, CircleDollarSign, Loader2, PackageCheck, AlertCircle, MapPin, Printer, Navigation,
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

const statusCfg = {
	pending: { label: "Menunggu Bayar", cls: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950", icon: Clock },
	paid: { label: "Pesanan Baru", cls: "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950", icon: CircleDollarSign },
	processing: { label: "Sedang Dikemas", cls: "border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-950", icon: PackageCheck },
	shipped: { label: "Dalam Pengiriman", cls: "border-violet-300 text-violet-700 bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:bg-violet-950", icon: Truck },
	completed: { label: "Selesai", cls: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950", icon: CheckCircle2 },
	cancelled: { label: "Dibatalkan", cls: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950", icon: Clock },
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

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

function OrderTable({ data, onProcess, onShip, onViewDetail, onTrack, onPrintLabel }) {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>ID</TableHead>
						<TableHead>Pelanggan</TableHead>
						<TableHead className="hidden md:table-cell">Produk</TableHead>
						<TableHead className="text-right">Total</TableHead>
						<TableHead className="text-center">Status</TableHead>
						<TableHead className="hidden lg:table-cell">Tanggal</TableHead>
						<TableHead className="text-center w-[70px]">Aksi</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.length === 0 ? (
						<TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Belum ada pesanan.</TableCell></TableRow>
					) : data.map(o => {
						// Gunakan status detail dari shipment jika tersedia
						const shipStatus = o.shipment?.status
						const st = statusCfg[o.status] || statusCfg.pending
						const productSummary = o.items?.map(i => i.productNameSnapshot).join(", ") || "-"
						return (
							<TableRow key={o.id} className="hover:bg-muted/50 transition-colors">
								<TableCell className="font-mono text-xs font-medium">#{o.id}</TableCell>
								<TableCell>
									<div>
										<p className="font-medium text-sm">{o.user?.name || "Pembeli"}</p>
										<p className="text-xs text-muted-foreground">{o.user?.email}</p>
									</div>
								</TableCell>
								<TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[180px] text-sm">{productSummary}</TableCell>
								<TableCell className="text-right font-medium">{fmt(o.grandTotal)}</TableCell>
								<TableCell className="text-center">
									<div className="flex flex-col items-center gap-0.5">
										<Badge variant="outline" className={st.cls}>{st.label}</Badge>
										{o.status === "shipped" && shipStatus && shipmentStatusLabel[shipStatus] && (
											<span className="text-[10px] text-muted-foreground">{shipmentStatusLabel[shipStatus]}</span>
										)}
									</div>
								</TableCell>
								<TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
									{new Date(o.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
								</TableCell>
								<TableCell className="text-center">
									<DropdownMenu>
										<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onClick={() => onViewDetail(o)}>
												<Eye className="mr-2 h-4 w-4" />Detail Pesanan
											</DropdownMenuItem>
											{o.status === "paid" && (
												<DropdownMenuItem onClick={() => onProcess(o.id)}>
													<PackageCheck className="mr-2 h-4 w-4" />Proses Pesanan
												</DropdownMenuItem>
											)}
											{o.status === "processing" && (
												<DropdownMenuItem onClick={() => onShip(o)}>
													<Truck className="mr-2 h-4 w-4" />Proses Pengiriman
												</DropdownMenuItem>
											)}
											{o.status === "shipped" && o.shipment?.awbNumber && (
												<>
													<DropdownMenuItem onClick={() => onTrack(o)}>
														<Navigation className="mr-2 h-4 w-4" />Lacak Resi
													</DropdownMenuItem>
													<DropdownMenuItem onClick={() => onPrintLabel(o)}>
														<Printer className="mr-2 h-4 w-4" />Cetak Label
													</DropdownMenuItem>
												</>
											)}
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
		</div>
	)
}

// Komponen internal: Isi dialog Lacak Resi
function TrackingContent({ orderId }) {
	const { data: trackingResult, isLoading, isError, refetch } = useQuery({
		queryKey: ["tracking", orderId],
		queryFn: () => trackOrderShipment(orderId),
		enabled: !!orderId,
		refetchInterval: 30000, // Auto-refresh setiap 30 detik
	})

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-8 gap-3">
				<Loader2 className="h-6 w-6 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Memuat data pelacakan...</p>
			</div>
		)
	}

	if (!trackingResult?.success) {
		return (
			<div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
				<AlertCircle className="h-8 w-8 text-red-500" />
				<p className="text-sm text-red-600">{trackingResult?.error || "Gagal memuat data pelacakan."}</p>
				<Button variant="outline" size="sm" onClick={() => refetch()}>Coba Lagi</Button>
			</div>
		)
	}

	const { awbNumber, courier, service, status, timeline, _fallback } = trackingResult.data

	return (
		<div className="space-y-4 max-h-[50vh] overflow-y-auto">
			{/* Info Resi */}
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
				<p className="text-xs text-muted-foreground">
					{courier?.toUpperCase()} — {service}
				</p>
			</div>

			{_fallback && (
				<div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-2">
					⚠️ Data dari database lokal (mode sandbox). Tracking live dari Biteship tidak tersedia.
				</div>
			)}

			{/* Timeline */}
			<div className="relative pl-6 space-y-4">
				{timeline.map((t, i) => (
					<div key={i} className="relative">
						{/* Garis vertikal */}
						{i < timeline.length - 1 && (
							<div className="absolute left-[-18px] top-3 bottom-[-20px] w-0.5 bg-border" />
						)}
						{/* Titik */}
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

export function OrderList() {
	const queryClient = useQueryClient()
	const [searchQuery, setSearchQuery] = useState("")
	const [shipDialog, setShipDialog] = useState(null)
	const [detailDialog, setDetailDialog] = useState(null)
	const [trackingDialog, setTrackingDialog] = useState(null)
	const [pickupMethod, setPickupMethod] = useState("pickup")

	const { data: queryData, isLoading, isError, refetch } = useGetSellerOrders()

	const orders = queryData?.data || []

	// Filter orders by paid status from payment (only show orders whose payment was successful)
	const paidOrders = orders.filter(o => !["pending"].includes(o.status) || o.payment?.status === "paid")

	const processMutation = useMutation({
		mutationFn: (orderId) => updateOrderStatus(orderId, "processing"),
		onSuccess: (result) => {
			if (result.success) {
				toast.success(result.message)
				queryClient.invalidateQueries({ queryKey: ["seller-orders"] })
			} else {
				toast.error(result.error)
			}
		},
		onError: () => toast.error("Terjadi kesalahan."),
	})

	// Fetch shipping detail saat dialog dibuka
	const { data: shippingDetail, isLoading: isLoadingShipping, refetch: refetchShipping } = useQuery({
		queryKey: ["order-shipping-detail", shipDialog?.id],
		queryFn: () => getOrderShippingDetail(shipDialog.id),
		enabled: !!shipDialog?.id,
	})

	const shipMutation = useMutation({
		mutationFn: ({ orderId, pickupMethod }) =>
			shipOrderViaBiteship(orderId, pickupMethod),
		onSuccess: (result) => {
			if (result.success) {
				toast.success(result.message || "Pesanan berhasil dikirim!")
				if (result.data?.awbNumber) {
					toast.info(`Nomor Resi: ${result.data.awbNumber}`)
				}
				queryClient.invalidateQueries({ queryKey: ["seller-orders"] })
				setShipDialog(null)
			} else {
				toast.error(result.error)
			}
		},
		onError: () => toast.error("Terjadi kesalahan saat mengirim pesanan."),
	})

	const handleProcess = (orderId) => {
		processMutation.mutate(orderId)
	}

	const handleOpenShipDialog = (order) => {
		setShipDialog(order)
		setPickupMethod("pickup")
	}

	const handleShipSubmit = () => {
		shipMutation.mutate({
			orderId: shipDialog.id,
			pickupMethod,
		})
	}

	const handleOpenTrackingDialog = (order) => {
		setTrackingDialog(order)
	}

	const handlePrintLabel = (order) => {
		// Buka halaman print di tab baru
		window.open(`/seller/orders/${order.id}/print`, "_blank")
	}

	// Filter by search
	const filteredOrders = paidOrders.filter(o => {
		if (!searchQuery) return true
		const q = searchQuery.toLowerCase()
		return (
			String(o.id).includes(q) ||
			o.user?.name?.toLowerCase().includes(q) ||
			o.items?.some(i => i.productNameSnapshot?.toLowerCase().includes(q))
		)
	})

	const counts = {
		all: filteredOrders.length,
		paid: filteredOrders.filter(o => o.status === "paid").length,
		processing: filteredOrders.filter(o => o.status === "processing").length,
		shipped: filteredOrders.filter(o => o.status === "shipped").length,
		completed: filteredOrders.filter(o => o.status === "completed").length,
	}

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 space-y-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Memuat pesanan...</p>
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
				<h1 className="text-2xl font-bold tracking-tight">Pesanan Masuk</h1>
				<p className="text-muted-foreground">Kelola semua pesanan yang masuk ke toko Anda.</p>
			</div>

			{/* Summary */}
			<div className="grid gap-4 sm:grid-cols-4">
				{[
					{ label: "Perlu Diproses", val: counts.paid, color: "text-blue-600", bg: "bg-blue-500/10", icon: Package },
					{ label: "Dikemas", val: counts.processing, color: "text-orange-600", bg: "bg-orange-500/10", icon: PackageCheck },
					{ label: "Dalam Pengiriman", val: counts.shipped, color: "text-violet-600", bg: "bg-violet-500/10", icon: Truck },
					{ label: "Selesai", val: counts.completed, color: "text-emerald-600", bg: "bg-emerald-500/10", icon: CheckCircle2 },
				].map(s => (
					<Card key={s.label}>
						<CardContent className="flex items-center gap-3 pt-6">
							<div className={`rounded-lg p-2.5 ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
							<div>
								<p className="text-sm text-muted-foreground">{s.label}</p>
								<p className="text-2xl font-bold">{s.val}</p>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Order Table with Tabs */}
			<Card>
				<CardHeader className="pb-3">
					<div className="relative max-w-sm">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Cari pesanan..."
							className="pl-9"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="all">
						<TabsList className="mb-4">
							<TabsTrigger value="all">Semua ({counts.all})</TabsTrigger>
							<TabsTrigger value="paid">Pesanan Baru ({counts.paid})</TabsTrigger>
							<TabsTrigger value="processing">Sedang Dikemas ({counts.processing})</TabsTrigger>
							<TabsTrigger value="shipped">Dalam Pengiriman ({counts.shipped})</TabsTrigger>
							<TabsTrigger value="completed">Selesai ({counts.completed})</TabsTrigger>
						</TabsList>
						<TabsContent value="all">
							<OrderTable data={filteredOrders} onProcess={handleProcess} onShip={handleOpenShipDialog} onViewDetail={setDetailDialog} onTrack={handleOpenTrackingDialog} onPrintLabel={handlePrintLabel} />
						</TabsContent>
						<TabsContent value="paid">
							<OrderTable data={filteredOrders.filter(o => o.status === "paid")} onProcess={handleProcess} onShip={handleOpenShipDialog} onViewDetail={setDetailDialog} onTrack={handleOpenTrackingDialog} onPrintLabel={handlePrintLabel} />
						</TabsContent>
						<TabsContent value="processing">
							<OrderTable data={filteredOrders.filter(o => o.status === "processing")} onProcess={handleProcess} onShip={handleOpenShipDialog} onViewDetail={setDetailDialog} onTrack={handleOpenTrackingDialog} onPrintLabel={handlePrintLabel} />
						</TabsContent>
						<TabsContent value="shipped">
							<OrderTable data={filteredOrders.filter(o => o.status === "shipped")} onProcess={handleProcess} onShip={handleOpenShipDialog} onViewDetail={setDetailDialog} onTrack={handleOpenTrackingDialog} onPrintLabel={handlePrintLabel} />
						</TabsContent>
						<TabsContent value="completed">
							<OrderTable data={filteredOrders.filter(o => o.status === "completed")} onProcess={handleProcess} onShip={handleOpenShipDialog} onViewDetail={setDetailDialog} onTrack={handleOpenTrackingDialog} onPrintLabel={handlePrintLabel} />
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			{/* Dialog: Kirim Pesanan via Biteship */}
			<Dialog open={!!shipDialog} onOpenChange={(open) => !open && setShipDialog(null)}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Truck className="h-5 w-5 text-primary" />
							Proses Pengiriman #{shipDialog?.id}
						</DialogTitle>
						<DialogDescription>Pilih metode penyerahan paket. Sistem akan otomatis menghubungi kurir via Biteship.</DialogDescription>
					</DialogHeader>

					{isLoadingShipping ? (
						<div className="flex flex-col items-center justify-center py-8 gap-3">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
							<p className="text-sm text-muted-foreground">Memuat data pengiriman...</p>
						</div>
					) : shippingDetail?.success ? (
						<div className="space-y-4 py-2">
							{/* Kurir yang dipilih pembeli */}
							<div className="rounded-lg border p-3 bg-muted/30 space-y-2">
								<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kurir Pilihan Pembeli</p>
								<div className="flex justify-between items-center">
									<div>
										<p className="font-semibold text-sm">{shippingDetail.data.serviceName} — {shippingDetail.data.courier}</p>
										<p className="text-xs text-muted-foreground">{shippingDetail.data.courierCode?.toUpperCase()} {shippingDetail.data.serviceCode?.toUpperCase()}</p>
									</div>
									<p className="font-bold text-primary">{fmt(shippingDetail.data.price)}</p>
								</div>
							</div>

							{/* Alamat Tujuan */}
							<div className="rounded-lg border p-3 space-y-1">
								<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
									<MapPin className="h-3 w-3" /> Alamat Tujuan
								</p>
								<p className="text-sm font-medium">{shippingDetail.data.buyerName}</p>
								<p className="text-xs text-muted-foreground">{shippingDetail.data.buyerPhone}</p>
								<p className="text-xs text-muted-foreground">{shippingDetail.data.buyerDetailAddress}</p>
								<p className="text-xs text-muted-foreground">{shippingDetail.data.buyerCity}, {shippingDetail.data.buyerProvince}</p>
							</div>

							{/* Metode Pengiriman */}
							<div className="space-y-3">
								<Label className="text-sm font-semibold">Metode Penyerahan Paket</Label>
								<RadioGroup value={pickupMethod} onValueChange={setPickupMethod} className="space-y-2">
									{(shippingDetail.data.collectionMethod.length === 0 || shippingDetail.data.collectionMethod.includes("pickup")) && (
										<div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setPickupMethod("pickup")}>
											<RadioGroupItem value="pickup" id="pickup" className="mt-0.5" />
											<div>
												<Label htmlFor="pickup" className="font-medium text-sm cursor-pointer">Minta Dijemput (Pickup)</Label>
												<p className="text-xs text-muted-foreground">Kurir akan datang ke alamat toko Anda untuk mengambil paket.</p>
											</div>
										</div>
									)}
									{(shippingDetail.data.collectionMethod.length === 0 || shippingDetail.data.collectionMethod.includes("drop_off")) && (
										<div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setPickupMethod("drop_off")}>
											<RadioGroupItem value="drop_off" id="drop_off" className="mt-0.5" />
											<div>
												<Label htmlFor="drop_off" className="font-medium text-sm cursor-pointer">Antar ke Gerai (Drop-off)</Label>
												<p className="text-xs text-muted-foreground">Anda mengantar paket ke gerai/drop point kurir terdekat.</p>
											</div>
										</div>
									)}
								</RadioGroup>
							</div>

							{shippingDetail.data.notes && (
								<div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-2">
									<span className="font-semibold">Catatan Pembeli:</span> {shippingDetail.data.notes}
								</div>
							)}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
							<AlertCircle className="h-8 w-8 text-red-500" />
							<p className="text-sm text-red-600">{shippingDetail?.error || "Gagal memuat data pengiriman."}</p>
							<Button variant="outline" size="sm" onClick={() => refetchShipping()}>Coba Lagi</Button>
						</div>
					)}

					<DialogFooter>
						<Button variant="outline" onClick={() => setShipDialog(null)} disabled={shipMutation.isPending}>Batal</Button>
						<Button
							onClick={handleShipSubmit}
							disabled={shipMutation.isPending || !shippingDetail?.success}
						>
							{shipMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							<Truck className="h-4 w-4 mr-2" />
							{shipMutation.isPending
								? "Memproses..."
								: pickupMethod === "pickup" ? "Request Kurir" : "Generate Resi"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Dialog: Detail Pesanan */}
			<Dialog open={!!detailDialog} onOpenChange={(open) => !open && setDetailDialog(null)}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Detail Pesanan #{detailDialog?.id}</DialogTitle>
					</DialogHeader>
					{detailDialog && (
						<div className="space-y-4 max-h-[60vh] overflow-y-auto">
							<div className="space-y-1">
								<p className="text-xs text-muted-foreground">Pelanggan</p>
								<p className="text-sm font-medium">{detailDialog.user?.name} ({detailDialog.user?.email})</p>
							</div>
							<div className="space-y-1">
								<p className="text-xs text-muted-foreground">Alamat Pengiriman</p>
								<p className="text-sm">
									{detailDialog.payment?.metadataLocal?.address?.detailAddress || detailDialog.payment?.metadataLocal?.address?.detail || "-"}
								</p>
								<p className="text-xs text-muted-foreground">
									{detailDialog.payment?.metadataLocal?.address?.cityName}, {detailDialog.payment?.metadataLocal?.address?.provinceName}
								</p>
							</div>
							{detailDialog.notes && (
								<div className="space-y-1">
									<p className="text-xs text-muted-foreground">Catatan</p>
									<p className="text-sm">{detailDialog.notes}</p>
								</div>
							)}
							<div className="border-t pt-4 space-y-3">
								<p className="text-xs font-semibold">Daftar Produk</p>
								{detailDialog.items?.map(item => (
									<div key={item.id} className="flex gap-3">
										<div className="h-12 w-12 rounded-md bg-muted border overflow-hidden relative shrink-0">
											{item.product?.images?.[0]?.imageUrl ? (
												<Image src={item.product.images[0].imageUrl} alt="" fill unoptimized className="object-cover" />
											) : (
												<div className="h-full w-full flex items-center justify-center text-xs">📦</div>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium line-clamp-1">{item.productNameSnapshot}</p>
											{item.variantNameSnapshot && <p className="text-xs text-muted-foreground">{item.variantNameSnapshot}</p>}
											<p className="text-xs text-muted-foreground">{item.quantity}x {fmt(item.priceSnapshot)}</p>
										</div>
										<p className="text-sm font-semibold">{fmt(item.priceSnapshot * item.quantity)}</p>
									</div>
								))}
							</div>
							<div className="border-t pt-3 flex justify-between items-center">
								<span className="font-bold text-sm">Total</span>
								<span className="font-bold text-primary">{fmt(detailDialog.grandTotal)}</span>
							</div>
							{detailDialog.shipment?.awbNumber && (
								<div className="border-t pt-3 space-y-1">
									<p className="text-xs text-muted-foreground">Nomor Resi</p>
									<p className="text-sm font-mono font-bold">{detailDialog.shipment.courier} - {detailDialog.shipment.awbNumber}</p>
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Dialog: Lacak Resi */}
			<Dialog open={!!trackingDialog} onOpenChange={(open) => !open && setTrackingDialog(null)}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Navigation className="h-5 w-5 text-primary" />
							Lacak Resi #{trackingDialog?.id}
						</DialogTitle>
						<DialogDescription>Lacak posisi paket secara real-time.</DialogDescription>
					</DialogHeader>
					<TrackingContent orderId={trackingDialog?.id} />
				</DialogContent>
			</Dialog>
		</div>
	)
}
