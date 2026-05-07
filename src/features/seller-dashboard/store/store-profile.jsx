"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
	Store, MapPin, Globe, Pencil, Save, Star, ShoppingCart, Package, Image as ImageIcon,
} from "lucide-react"

const storeData = {
	name: "Toko Maju Jaya",
	domain: "toko-maju-jaya",
	description: "Menjual berbagai produk fashion pria berkualitas dengan harga terjangkau. Trusted seller sejak 2024.",
	province: "Jawa Barat",
	city: "Bandung",
	address: "Jl. Merdeka No. 123, RT 01/RW 02, Kel. Citarum, Kec. Bandung Wetan",
	logo: null,
	banner: null,
	stats: {
		totalProducts: 48,
		totalOrders: 156,
		totalReviews: 120,
		rating: 4.8,
	},
}

export function StoreProfile() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Profil Toko</h1>
				<p className="text-muted-foreground">Kelola informasi dan tampilan toko Anda.</p>
			</div>

			{/* Store Banner + Info Card */}
			<Card className="overflow-hidden">
				{/* Banner */}
				<div className="relative h-40 md:h-52 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center">
					<div className="text-center text-muted-foreground">
						<ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
						<p className="text-sm">Banner Toko (1200×300)</p>
					</div>
					<Button variant="secondary" size="sm" className="absolute top-3 right-3">
						<Pencil className="mr-2 h-3 w-3" />Ubah Banner
					</Button>
				</div>

				{/* Store Info Overlay */}
				<CardContent className="relative pt-0">
					<div className="flex flex-col sm:flex-row gap-4 -mt-10 sm:-mt-12">
						{/* Logo */}
						<div className="relative">
							<Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-lg">
								<AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
									{storeData.name.charAt(0)}
								</AvatarFallback>
							</Avatar>
							<button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
								<Pencil className="h-3 w-3" />
							</button>
						</div>

						{/* Name & Meta */}
						<div className="flex-1 pt-2 sm:pt-4">
							<div className="flex flex-col sm:flex-row sm:items-center gap-2">
								<h2 className="text-xl font-bold">{storeData.name}</h2>
								<Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 w-fit dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950">
									Terverifikasi
								</Badge>
							</div>
							<div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
								<div className="flex items-center gap-1">
									<Globe className="h-3.5 w-3.5" />
									kirimart.com/{storeData.domain}
								</div>
								<div className="flex items-center gap-1">
									<MapPin className="h-3.5 w-3.5" />
									{storeData.city}, {storeData.province}
								</div>
							</div>
						</div>
					</div>

					{/* Quick Stats */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
						{[
							{ label: "Produk", val: storeData.stats.totalProducts, icon: Package, color: "text-blue-600" },
							{ label: "Pesanan", val: storeData.stats.totalOrders, icon: ShoppingCart, color: "text-violet-600" },
							{ label: "Ulasan", val: storeData.stats.totalReviews, icon: Star, color: "text-amber-600" },
							{ label: "Rating", val: storeData.stats.rating, icon: Star, color: "text-emerald-600" },
						].map(s => (
							<div key={s.label} className="text-center">
								<p className="text-2xl font-bold">{s.val}</p>
								<p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
									<s.icon className={`h-3 w-3 ${s.color}`} />{s.label}
								</p>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Edit Form */}
			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" />Informasi Toko</CardTitle>
						<CardDescription>Detail dasar tentang toko Anda</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label>Nama Toko</Label>
							<Input defaultValue={storeData.name} />
						</div>
						<div className="space-y-2">
							<Label>Domain Toko</Label>
							<div className="flex items-center">
								<span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground text-sm">kirimart.com/</span>
								<Input className="rounded-l-none" defaultValue={storeData.domain} />
							</div>
						</div>
						<div className="space-y-2">
							<Label>Deskripsi Toko</Label>
							<Textarea defaultValue={storeData.description} className="min-h-[100px]" />
						</div>
						<Button><Save className="mr-2 h-4 w-4" />Simpan Perubahan</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Alamat Toko</CardTitle>
						<CardDescription>Alamat ini digunakan untuk kalkulasi ongkos kirim</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label>Provinsi</Label>
								<Input defaultValue={storeData.province} />
							</div>
							<div className="space-y-2">
								<Label>Kota</Label>
								<Input defaultValue={storeData.city} />
							</div>
						</div>
						<div className="space-y-2">
							<Label>Alamat Lengkap</Label>
							<Textarea defaultValue={storeData.address} className="min-h-[100px]" />
						</div>
						<div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:bg-blue-950/30 dark:border-blue-800">
							<p className="text-sm text-blue-800 dark:text-blue-300">
								📍 Alamat ini sangat penting karena digunakan oleh RajaOngkir untuk menghitung ongkos kirim ke pembeli.
							</p>
						</div>
						<Button><Save className="mr-2 h-4 w-4" />Simpan Alamat</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
