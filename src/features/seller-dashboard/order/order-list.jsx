"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateOrderStatus } from "@/actions/seller-dashboard/order.actions"
import { useGetSellerOrders } from "@/app/data/seller-dashboard/order/order-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
	Search, MoreHorizontal, Eye, Truck, CheckCircle2, Clock, Package, CircleDollarSign, Loader2, PackageCheck,
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

const statusCfg = {
	pending: { label: "Menunggu Bayar", cls: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950", icon: Clock },
	paid: { label: "Dibayar", cls: "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950", icon: CircleDollarSign },
	processing: { label: "Dikemas", cls: "border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-950", icon: PackageCheck },
	shipped: { label: "Dikirim", cls: "border-violet-300 text-violet-700 bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:bg-violet-950", icon: Truck },
	completed: { label: "Selesai", cls: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950", icon: CheckCircle2 },
	cancelled: { label: "Dibatalkan", cls: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950", icon: Clock },
}

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

function OrderTable({ data, onProcess, onShip, onViewDetail }) {
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
									<Badge variant="outline" className={st.cls}>{st.label}</Badge>
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
													<Truck className="mr-2 h-4 w-4" />Input Resi & Kirim
												</DropdownMenuItem>
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

export function OrderList() {
	const queryClient = useQueryClient()
	const [searchQuery, setSearchQuery] = useState("")
	const [shipDialog, setShipDialog] = useState(null)
	const [detailDialog, setDetailDialog] = useState(null)
	const [courier, setCourier] = useState("")
	const [awbNumber, setAwbNumber] = useState("")

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

	const shipMutation = useMutation({
		mutationFn: ({ orderId, courier, awbNumber }) =>
			updateOrderStatus(orderId, "shipped", { courier, awbNumber }),
		onSuccess: (result) => {
			if (result.success) {
				toast.success(result.message)
				queryClient.invalidateQueries({ queryKey: ["seller-orders"] })
				setShipDialog(null)
				setCourier("")
				setAwbNumber("")
			} else {
				toast.error(result.error)
			}
		},
		onError: () => toast.error("Terjadi kesalahan."),
	})

	const handleProcess = (orderId) => {
		processMutation.mutate(orderId)
	}

	const handleOpenShipDialog = (order) => {
		setShipDialog(order)
		setCourier("")
		setAwbNumber("")
	}

	const handleShipSubmit = () => {
		if (!courier || !awbNumber) {
			toast.error("Kurir dan nomor resi wajib diisi.")
			return
		}
		shipMutation.mutate({
			orderId: shipDialog.id,
			courier,
			awbNumber,
		})
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
							<TabsTrigger value="paid">Perlu Diproses ({counts.paid})</TabsTrigger>
							<TabsTrigger value="processing">Dikemas ({counts.processing})</TabsTrigger>
							<TabsTrigger value="shipped">Dikirim ({counts.shipped})</TabsTrigger>
							<TabsTrigger value="completed">Selesai ({counts.completed})</TabsTrigger>
						</TabsList>
						<TabsContent value="all">
							<OrderTable data={filteredOrders} onProcess={handleProcess} onShip={handleOpenShipDialog} onViewDetail={setDetailDialog} />
						</TabsContent>
						<TabsContent value="paid">
							<OrderTable data={filteredOrders.filter(o => o.status === "paid")} onProcess={handleProcess} onShip={handleOpenShipDialog} onViewDetail={setDetailDialog} />
						</TabsContent>
						<TabsContent value="processing">
							<OrderTable data={filteredOrders.filter(o => o.status === "processing")} onProcess={handleProcess} onShip={handleOpenShipDialog} onViewDetail={setDetailDialog} />
						</TabsContent>
						<TabsContent value="shipped">
							<OrderTable data={filteredOrders.filter(o => o.status === "shipped")} onProcess={handleProcess} onShip={handleOpenShipDialog} onViewDetail={setDetailDialog} />
						</TabsContent>
						<TabsContent value="completed">
							<OrderTable data={filteredOrders.filter(o => o.status === "completed")} onProcess={handleProcess} onShip={handleOpenShipDialog} onViewDetail={setDetailDialog} />
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			{/* Dialog: Input Resi */}
			<Dialog open={!!shipDialog} onOpenChange={(open) => !open && setShipDialog(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Kirim Pesanan #{shipDialog?.id}</DialogTitle>
						<DialogDescription>Masukkan informasi pengiriman untuk pesanan ini.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label>Nama Kurir</Label>
							<Input placeholder="Contoh: JNE, JNT, SiCepat" value={courier} onChange={(e) => setCourier(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Nomor Resi (AWB)</Label>
							<Input placeholder="Contoh: JP1234567890" value={awbNumber} onChange={(e) => setAwbNumber(e.target.value)} />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShipDialog(null)}>Batal</Button>
						<Button onClick={handleShipSubmit} disabled={shipMutation.isPending}>
							{shipMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Konfirmasi Kirim
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
								<p className="text-sm">{detailDialog.payment?.metadataLocal?.address?.detail || "-"}</p>
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
		</div>
	)
}
