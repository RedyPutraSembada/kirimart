"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
	Package, Star, Users, Clock, Globe, MapPin, Store, Wallet, TrendingUp
} from "lucide-react"
import Image from "next/image"
import { useGetMyStore, useGetMyStoreMetrics } from "@/app/data/seller-dashboard/dashboard-data"

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
				{stat.description && (
					<p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
				)}
			</CardContent>
			<div className={`absolute bottom-0 left-0 right-0 h-1 ${stat.gradientClass}`} />
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
							<Badge variant="outline" className={`w-fit text-xs ${
								store.status === 'active'
									? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950'
									: 'border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950'
							}`}>
								{store.status === 'active' ? 'Aktif' : store.status === 'banned' ? 'Ditangguhkan' : 'Nonaktif'}
							</Badge>
						</div>
						<div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
							<div className="flex items-center gap-1">
								<Globe className="h-3.5 w-3.5" />
								kawanbelanja.com/{store.domainSlug}
							</div>
							{store.address?.cityName && (
								<div className="flex items-center gap-1">
									<MapPin className="h-3.5 w-3.5" />
									{store.address.cityName}, {store.address.provinceName}
								</div>
							)}
							<div className="flex items-center gap-1">
								<Clock className="h-3.5 w-3.5" />
								{store.openTime || "09:00"} - {store.closeTime || "21:00"}
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
	const { data: metricsResponse, isLoading: isLoadingMetrics } = useGetMyStoreMetrics()
	const store = storeResponse?.data
	const metrics = metricsResponse?.data

	const storeRating = store?.rating ? parseFloat(store.rating) : 5.0
	const totalProducts = store?.products?.length || 0
	const totalReviews = store?.totalReviews || 0
	const followerCount = store?.followerCount || 0
	const balance = store?.balance || 0

	const statsData = [
		{
			title: "Saldo Toko",
			value: `Rp ${balance.toLocaleString("id-ID")}`,
			icon: Wallet,
			description: "Pendapatan yang bisa ditarik",
			color: "text-emerald-600",
			bgColor: "bg-emerald-500/10",
			gradientClass: "bg-gradient-to-r from-emerald-500 to-emerald-300",
		},
		{
			title: "Produk Aktif",
			value: totalProducts.toString(),
			icon: Package,
			description: "Produk yang dijual",
			color: "text-blue-600",
			bgColor: "bg-blue-500/10",
			gradientClass: "bg-gradient-to-r from-blue-500 to-blue-300",
		},
		{
			title: "Pengikut",
			value: followerCount.toString(),
			icon: Users,
			description: "Pelanggan yang mengikuti toko",
			color: "text-violet-600",
			bgColor: "bg-violet-500/10",
			gradientClass: "bg-gradient-to-r from-violet-500 to-violet-300",
		},
		{
			title: "Rating Toko",
			value: storeRating.toFixed(1),
			icon: Star,
			description: `dari ${totalReviews} ulasan`,
			color: "text-amber-600",
			bgColor: "bg-amber-500/10",
			gradientClass: "bg-gradient-to-r from-amber-500 to-amber-300",
		},
	]

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
				{isLoading ? (
					Array.from({ length: 4 }).map((_, i) => (
						<Card key={i} className="relative overflow-hidden">
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-8 w-8 rounded-lg" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-7 w-20 mb-2" />
								<Skeleton className="h-3 w-32" />
							</CardContent>
						</Card>
					))
				) : (
					statsData.map((stat) => (
						<StatCard key={stat.title} stat={stat} />
					))
				)}
			</div>

			{/* Content Grid */}
			<div className="grid gap-6 lg:grid-cols-5">
				{/* Produk Peringkat Teratas */}
				<Card className="lg:col-span-3">
					<CardHeader>
						<CardTitle>Peringkat Produk (Fair Rank)</CardTitle>
						<CardDescription>Produk dengan visibilitas tertinggi di pencarian</CardDescription>
					</CardHeader>
					<CardContent>
						{!store?.products || store.products.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
								<p className="text-sm">Belum ada data produk.</p>
							</div>
						) : (
							<div className="space-y-4">
								{[...store.products]
									.sort((a, b) => (b.visibilityScore || 0) - (a.visibilityScore || 0))
									.slice(0, 5)
									.map((product, index) => (
										<div key={product.id} className="flex items-center gap-3">
											<div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
												index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
												: index === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
												: index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
												: 'bg-muted text-muted-foreground'
											}`}>
												{index + 1}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">{product.name || `Produk #${product.id}`}</p>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<span className="font-semibold text-emerald-600 dark:text-emerald-400">Skor: {product.visibilityScore || 0}</span>
													<span>•</span>
													<span>{product.soldCount || 0} terjual</span>
												</div>
											</div>
										</div>
									))
								}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Right Column (Ringkasan & Metrik) */}
				<div className="space-y-6 lg:col-span-2">
					{/* Ringkasan Toko */}
					<Card>
					<CardHeader>
						<CardTitle>Ringkasan Toko</CardTitle>
						<CardDescription>Informasi singkat tentang toko Anda</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Status Toko</span>
							<Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950">
								{store?.status === 'active' ? 'Aktif' : 'Nonaktif'}
							</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Jam Operasional</span>
							<span className="text-sm font-medium">{store?.openTime || "09:00"} - {store?.closeTime || "21:00"}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Kurir Aktif</span>
							<span className="text-sm font-medium">{store?.enabledCouriers ? store.enabledCouriers.split(",").length : 0} kurir</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Sudah Ditarik</span>
							<span className="text-sm font-medium">Rp {(store?.withdrawnAmount || 0).toLocaleString("id-ID")}</span>
						</div>
						{store?.isVerified && (
							<div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-500/10 px-3 py-2 rounded-lg mt-2">
								<Store className="h-4 w-4" /> Toko Terverifikasi
							</div>
						)}
					</CardContent>
				</Card>
				
				{/* Metrik Fair Rank */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="h-5 w-5 text-emerald-500" />
							Metrik Fair Rank
						</CardTitle>
						<CardDescription>Faktor penentu skor visibilitas Anda</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{isLoadingMetrics ? (
							<Skeleton className="h-20 w-full" />
						) : (
							<>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Tingkat Komplain</span>
									<span className="text-sm font-medium text-amber-600">
										{metrics ? (parseFloat(metrics.complaintRate) * 100).toFixed(1) : 0}%
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Kelengkapan Profil</span>
									<span className="text-sm font-medium text-blue-600">
										{metrics?.profileCompleteness || 0}%
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">Voucher Aktif</span>
									<span className="text-sm font-medium">
										{metrics?.hasActiveVoucher ? (
											<Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950">
												Ya (+5 Poin)
											</Badge>
										) : (
											<span className="text-muted-foreground">Tidak Ada</span>
										)}
									</span>
								</div>
							</>
						)}
					</CardContent>
				</Card>
				</div>
			</div>
		</div>
	)
}
