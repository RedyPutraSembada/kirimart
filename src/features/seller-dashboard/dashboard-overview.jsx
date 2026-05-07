"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
	Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
	DollarSign, Package, ShoppingCart, TrendingUp, ArrowUpRight,
	ArrowDownRight, Star, Eye, Globe, MapPin, Store,
} from "lucide-react"
import Image from "next/image"
import { useGetMyStore } from "@/app/data/seller-dashboard/dashboard-data"

// --- Data Statis (Mock) ---
const statsData = [
	{
		title: "Total Pendapatan",
		value: "Rp 12.450.000",
		change: "+12.5%",
		trend: "up",
		icon: DollarSign,
		description: "vs bulan lalu",
		color: "text-emerald-600",
		bgColor: "bg-emerald-500/10",
	},
	{
		title: "Total Pesanan",
		value: "156",
		change: "+8.2%",
		trend: "up",
		icon: ShoppingCart,
		description: "vs bulan lalu",
		color: "text-blue-600",
		bgColor: "bg-blue-500/10",
	},
	{
		title: "Produk Aktif",
		value: "48",
		change: "+3",
		trend: "up",
		icon: Package,
		description: "produk baru",
		color: "text-violet-600",
		bgColor: "bg-violet-500/10",
	},
	{
		title: "Rating Toko",
		value: "4.8",
		change: "+0.2",
		trend: "up",
		icon: Star,
		description: "dari 120 ulasan",
		color: "text-amber-600",
		bgColor: "bg-amber-500/10",
	},
]

const recentOrders = [
	{ id: "ORD-001", customer: "Budi Santoso", product: "Sepatu Nike Air Max", total: "Rp 1.250.000", status: "paid", date: "7 Mei 2026" },
	{ id: "ORD-002", customer: "Siti Rahayu", product: "Kaos Polos Premium", total: "Rp 150.000", status: "shipped", date: "6 Mei 2026" },
	{ id: "ORD-003", customer: "Ahmad Fauzi", product: "Tas Ransel Outdoor", total: "Rp 450.000", status: "completed", date: "5 Mei 2026" },
	{ id: "ORD-004", customer: "Dewi Lestari", product: "Jam Tangan Casio", total: "Rp 875.000", status: "pending", date: "5 Mei 2026" },
	{ id: "ORD-005", customer: "Rudi Hartono", product: "Celana Jeans Slim Fit", total: "Rp 320.000", status: "paid", date: "4 Mei 2026" },
]

const topProducts = [
	{ name: "Sepatu Nike Air Max", sold: 42, revenue: "Rp 52.500.000", views: 1280 },
	{ name: "Kaos Polos Premium", sold: 38, revenue: "Rp 5.700.000", views: 956 },
	{ name: "Tas Ransel Outdoor", sold: 25, revenue: "Rp 11.250.000", views: 734 },
	{ name: "Jam Tangan Casio", sold: 18, revenue: "Rp 15.750.000", views: 612 },
	{ name: "Celana Jeans Slim Fit", sold: 15, revenue: "Rp 4.800.000", views: 489 },
]

const statusConfig = {
	pending: { label: "Menunggu", variant: "outline", className: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950" },
	paid: { label: "Dibayar", variant: "outline", className: "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950" },
	shipped: { label: "Dikirim", variant: "outline", className: "border-violet-300 text-violet-700 bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:bg-violet-950" },
	completed: { label: "Selesai", variant: "outline", className: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950" },
}

// --- Komponen ---
function StatCard({ stat }) {
	const Icon = stat.icon
	return (
		<Card className="relative overflow-hidden">
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">
					{stat.title}
				</CardTitle>
				<div className={`rounded-lg p-2 ${stat.bgColor}`}>
					<Icon className={`h-4 w-4 ${stat.color}`} />
				</div>
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{stat.value}</div>
				<div className="flex items-center gap-1 mt-1">
					{stat.trend === "up" ? (
						<ArrowUpRight className="h-3 w-3 text-emerald-600" />
					) : (
						<ArrowDownRight className="h-3 w-3 text-red-600" />
					)}
					<span className={`text-xs font-medium ${stat.trend === "up" ? "text-emerald-600" : "text-red-600"}`}>
						{stat.change}
					</span>
					<span className="text-xs text-muted-foreground">{stat.description}</span>
				</div>
			</CardContent>
			<div className={`absolute bottom-0 left-0 right-0 h-1 ${stat.color === 'text-emerald-600' ? 'bg-gradient-to-r from-emerald-500 to-emerald-300' : stat.color === 'text-blue-600' ? 'bg-gradient-to-r from-blue-500 to-blue-300' : stat.color === 'text-violet-600' ? 'bg-gradient-to-r from-violet-500 to-violet-300' : 'bg-gradient-to-r from-amber-500 to-amber-300'}`} />
		</Card>
	)
}

function StoreInfoCard({ store, isLoading }) {
	if (isLoading) {
		return (
			<Card className="overflow-hidden">
				<div className="h-40 md:h-52 bg-muted animate-pulse" />
				<CardContent className="pt-0">
					<div className="flex items-center gap-4 -mt-12">
						<Skeleton className="h-24 w-24 rounded-full border-4 border-background" />
						<div className="space-y-2 pt-4">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-4 w-56" />
						</div>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (!store) return null

	return (
		<Card className="overflow-hidden">
			{/* Banner */}
			<div className="relative h-40 md:h-52">
				{store.bannerUrl ? (
					<Image
						src={store.bannerUrl}
						alt={`Banner ${store.name}`}
						fill
						className="object-cover"
						priority
						sizes="(max-width: 768px) 100vw, 1200px"
						unoptimized
					/>
				) : (
					<div className="w-full h-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
				)}
			</div>

			{/* Store Info */}
			<CardContent className="pt-0">
				<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 -mt-12">
					<div className="relative h-24 w-24 shrink-0 rounded-full border-4 border-background shadow-lg overflow-hidden bg-background">
						{store.logoUrl ? (
							<Image
								src={store.logoUrl}
								alt={`Logo ${store.name}`}
								fill
								className="object-cover"
								sizes="80px"
								unoptimized
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xl font-bold">
								{store.name?.charAt(0)?.toUpperCase()}
							</div>
						)}
					</div>

					<div className="flex-1 pt-2 sm:pt-4">
						<div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
							<h2 className="text-lg font-bold">{store.name}</h2>
							<Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 w-fit text-xs dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950">
								Aktif
							</Badge>
						</div>
						<div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
							<div className="flex items-center gap-1">
								<Globe className="h-3.5 w-3.5" />
								kirimart.com/{store.domainSlug}
							</div>
						</div>
						{store.description && (
							<p className="text-sm text-muted-foreground mt-2 line-clamp-2">{store.description}</p>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export function DashboardOverview() {
	const { data: storeResponse, isLoading } = useGetMyStore()
	const store = storeResponse?.data

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground">
					{isLoading
						? "Memuat data toko..."
						: store
							? `Selamat datang kembali di ${store.name}! Berikut ringkasan performa toko Anda.`
							: "Selamat datang kembali! Berikut ringkasan performa toko Anda."
					}
				</p>
			</div>

			{/* Store Info Card */}
			<StoreInfoCard store={store} isLoading={isLoading} />

			{/* Stats Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{statsData.map((stat) => (
					<StatCard key={stat.title} stat={stat} />
				))}
			</div>

			{/* Charts Area */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5 text-muted-foreground" />
						Pendapatan 7 Hari Terakhir
					</CardTitle>
					<CardDescription>Grafik pendapatan harian toko Anda</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-end justify-between gap-2 h-48">
						{[
							{ day: "Sen", value: 65 },
							{ day: "Sel", value: 45 },
							{ day: "Rab", value: 80 },
							{ day: "Kam", value: 55 },
							{ day: "Jum", value: 90 },
							{ day: "Sab", value: 100 },
							{ day: "Min", value: 70 },
						].map((item) => (
							<div key={item.day} className="flex flex-1 flex-col items-center gap-2">
								<div className="w-full relative group">
									<div
										className="w-full rounded-t-md bg-gradient-to-t from-primary/80 to-primary/40 transition-all duration-300 group-hover:from-primary group-hover:to-primary/60 group-hover:shadow-lg group-hover:shadow-primary/20"
										style={{ height: `${(item.value / 100) * 160}px` }}
									/>
									<div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-xs px-2 py-1 rounded whitespace-nowrap">
										Rp {(item.value * 18000).toLocaleString("id-ID")}
									</div>
								</div>
								<span className="text-xs text-muted-foreground font-medium">{item.day}</span>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-5">
				{/* Recent Orders */}
				<Card className="lg:col-span-3">
					<CardHeader>
						<CardTitle>Pesanan Terbaru</CardTitle>
						<CardDescription>5 pesanan terakhir yang masuk ke toko Anda</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>ID Pesanan</TableHead>
									<TableHead>Pelanggan</TableHead>
									<TableHead className="hidden md:table-cell">Produk</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead className="text-center">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{recentOrders.map((order) => {
									const status = statusConfig[order.status]
									return (
										<TableRow key={order.id} className="group cursor-pointer hover:bg-muted/50 transition-colors">
											<TableCell className="font-mono text-xs font-medium">{order.id}</TableCell>
											<TableCell className="font-medium">{order.customer}</TableCell>
											<TableCell className="hidden md:table-cell text-muted-foreground max-w-[180px] truncate">{order.product}</TableCell>
											<TableCell className="text-right font-medium">{order.total}</TableCell>
											<TableCell className="text-center">
												<Badge variant={status.variant} className={status.className}>{status.label}</Badge>
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				{/* Top Products */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Produk Terlaris</CardTitle>
						<CardDescription>Produk dengan penjualan tertinggi</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{topProducts.map((product, index) => (
								<div key={product.name} className="flex items-center gap-3">
									<div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : index === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' : 'bg-muted text-muted-foreground'}`}>
										{index + 1}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">{product.name}</p>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<span>{product.sold} terjual</span>
											<span>•</span>
											<div className="flex items-center gap-0.5">
												<Eye className="h-3 w-3" />
												{product.views}
											</div>
										</div>
									</div>
									<div className="text-right">
										<p className="text-sm font-semibold">{product.revenue}</p>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
