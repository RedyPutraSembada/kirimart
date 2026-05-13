"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
	Store, MapPin, Globe, Pencil, Save, Star, ShoppingCart, Package, Image as ImageIcon,
} from "lucide-react"

import { useGetMyStore } from "@/app/data/seller-dashboard/dashboard-data"

export function StoreProfile() {
	const { data: storeResponse, isLoading } = useGetMyStore()
	const store = storeResponse?.data

	if (isLoading) {
		return <div className="p-8 text-center">Memuat profil toko...</div>
	}

	if (!store) {
		return <div className="p-8 text-center text-red-500">Gagal memuat profil toko.</div>
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Profil Toko</h1>
				<p className="text-muted-foreground">Kelola informasi dan tampilan toko Anda.</p>
			</div>

			{/* Store Banner + Info Card */}
			<Card className="overflow-hidden">
				{/* Banner */}
				<div 
					className="relative h-40 md:h-52 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center"
					style={store.bannerUrl ? { backgroundImage: `url(${store.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
				>
					{!store.bannerUrl && (
						<div className="text-center text-muted-foreground">
							<ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
							<p className="text-sm">Banner Toko (1200×300)</p>
						</div>
					)}
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
								{store.logoUrl && <AvatarImage src={store.logoUrl} alt={store.name} />}
								<AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
									{store.name?.charAt(0) || "T"}
								</AvatarFallback>
							</Avatar>
							<button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
								<Pencil className="h-3 w-3" />
							</button>
						</div>

						{/* Name & Meta */}
						<div className="flex-1 pt-2 sm:pt-4">
							<div className="flex flex-col sm:flex-row sm:items-center gap-2">
								<h2 className="text-xl font-bold">{store.name}</h2>
								<Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 w-fit dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950">
									Terverifikasi
								</Badge>
							</div>
							<div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
								<div className="flex items-center gap-1">
									<Globe className="h-3.5 w-3.5" />
									kawanbelanja.com/{store.domainSlug}
								</div>
								{store.address?.provinceId && (
									<div className="flex items-center gap-1">
										<MapPin className="h-3.5 w-3.5" />
										{store.address.cityId}, {store.address.provinceId}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Quick Stats */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
						{[
							{ label: "Produk", val: 0, icon: Package, color: "text-blue-600" },
							{ label: "Pesanan", val: 0, icon: ShoppingCart, color: "text-violet-600" },
							{ label: "Ulasan", val: 0, icon: Star, color: "text-amber-600" },
							{ label: "Rating", val: 0.0, icon: Star, color: "text-emerald-600" },
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
							<Input defaultValue={store.name} />
						</div>
						<div className="space-y-2">
							<Label>Domain Toko</Label>
							<div className="flex items-center">
								<span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground text-sm">kawanbelanja.com/</span>
								<Input className="rounded-l-none" defaultValue={store.domainSlug} />
							</div>
						</div>
						<div className="space-y-2">
							<Label>Deskripsi Toko</Label>
							<Textarea defaultValue={store.description || ""} className="min-h-[100px]" />
						</div>
						<Button><Save className="mr-2 h-4 w-4" />Simpan Perubahan</Button>
					</CardContent>
				</Card>

				<AddressFormWrapper store={store} />
			</div>
		</div>
	)
}

import { useForm, FormProvider } from "react-hook-form"
import { AddressForm } from "@/components/shared/address-form"

function AddressFormWrapper({ store }) {
	const methods = useForm({
		defaultValues: {
			recipientName: store.address?.recipientName || store.name || "",
			recipientPhone: store.address?.recipientPhone || "",
			provinceId: store.address?.provinceId || "",
			cityId: store.address?.cityId || "",
			kecamatanId: store.address?.kecamatanId || "",
			kelurahanId: store.address?.kelurahanId || "",
			zipcode: store.address?.zipcode || "",
			detailAddress: store.address?.detailAddress || "",
		}
	})

	const onSubmit = (data) => {
		console.log("Simpan Alamat Toko:", data)
		// TODO: Hit API to save address to database
	}

	return (
		<Card>
			<FormProvider {...methods}>
				<form onSubmit={methods.handleSubmit(onSubmit)}>
					<AddressForm 
						title="Alamat Penjemputan (Toko)" 
						description="Penting: Alamat ini digunakan oleh kurir KiriminAja untuk mengambil paket dari toko Anda dan menghitung ongkos kirim." 
					/>
					<CardContent className="pt-0">
						<div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:bg-amber-950/30 dark:border-amber-800 mb-4 mt-2">
							<p className="text-sm text-amber-800 dark:text-amber-300">
								⚠️ <strong>Catatan Sistem:</strong> Pencarian alamat saat ini masih menggunakan <em>Data Simulasi (Mock Data)</em> karena API Key KiriminAja resmi belum diintegrasikan. Pilihan area sangat terbatas untuk keperluan *testing* antarmuka.
							</p>
						</div>
						<div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:bg-blue-950/30 dark:border-blue-800 mb-4">
							<p className="text-sm text-blue-800 dark:text-blue-300">
								📍 Pastikan alamat sudah tepat hingga level Kelurahan agar ongkos kirim akurat dan kurir tidak tersesat saat pickup paket.
							</p>
						</div>
						<Button type="submit"><Save className="mr-2 h-4 w-4" />Simpan Alamat</Button>
					</CardContent>
				</form>
			</FormProvider>
		</Card>
	)
}
