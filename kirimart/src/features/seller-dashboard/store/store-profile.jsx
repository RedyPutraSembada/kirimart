"use client"

import { useState } from "react"
import Image from "next/image"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
	Store, MapPin, Globe, Pencil, Save, Star, ShoppingCart, Package, Image as ImageIcon, Clock, Users, Activity
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

	const storeRating = store.rating ? parseFloat(store.rating) : 5.0

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Profil Toko</h1>
				<p className="text-muted-foreground">Kelola informasi dan tampilan toko Anda.</p>
			</div>

			{/* Store Banner + Info Card */}
			<Card className="overflow-hidden">
				{/* Banner */}
				<div className="relative w-full aspect-[21/9] sm:aspect-[7/2] bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center">
					{store.bannerUrl && (
						<Image
							src={store.bannerUrl}
							alt={`Banner ${store.name}`}
							fill
							className="object-cover"
							priority
							sizes="(max-width: 768px) 100vw, 1200px"
							unoptimized
						/>
					)}
					{!store.bannerUrl && (
						<div className="text-center text-muted-foreground z-10">
							<ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
							<p className="text-sm">Banner Toko (1200×300)</p>
						</div>
					)}
					<Button variant="secondary" size="sm" className="absolute top-3 right-3 z-10">
						<Pencil className="mr-2 h-3 w-3" />Ubah Banner
					</Button>
				</div>

				{/* Store Info Overlay */}
				<CardContent className="relative pt-0">
					<div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
						{/* Logo */}
						<div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-full border-4 border-background shadow-lg bg-background -mt-12 sm:-mt-14 z-10">
							{store.logoUrl ? (
								<Image
									src={store.logoUrl}
									alt={`Logo ${store.name}`}
									fill
									className="object-cover rounded-full"
									sizes="(max-width: 640px) 96px, 112px"
									unoptimized
								/>
							) : (
								<div className="w-full h-full rounded-full flex items-center justify-center bg-primary/10 text-primary text-xl sm:text-3xl font-bold">
									{store.name?.charAt(0)?.toUpperCase()}
								</div>
							)}
							<button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors z-20 border-2 border-background">
								<Pencil className="h-3 w-3" />
							</button>
						</div>

						{/* Name & Meta */}
						<div className="flex-1 pt-3 sm:pt-4 pb-2">
							<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
								<div className="space-y-1.5">
									<div className="flex items-center gap-2">
										<h2 className="text-xl sm:text-2xl font-bold">{store.name}</h2>
										{store.isVerified && (
											<Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950">
												Terverifikasi
											</Badge>
										)}
									</div>
									<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
										<div className="flex items-center gap-1.5">
											<Globe className="h-4 w-4" />
											<span>kawanbelanja.com/{store.domainSlug}</span>
										</div>
										{store.address?.cityName && (
											<div className="flex items-center gap-1.5">
												<MapPin className="h-4 w-4" />
												<span>{store.address.cityName}, {store.address.provinceName}</span>
											</div>
										)}
										<div className="flex items-center gap-1.5">
											<Clock className="h-4 w-4" />
											<span>{store.openTime || "09:00"} - {store.closeTime || "21:00"}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Quick Stats */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
						{[
							{ label: "Produk", val: store.products?.length || 0, icon: Package, color: "text-blue-600" },
							{ label: "Pengikut", val: store.followerCount || 0, icon: Users, color: "text-violet-600" },
							{ label: "Ulasan", val: store.totalReviews || 0, icon: Star, color: "text-amber-600" },
							{ label: "Rating", val: storeRating.toFixed(1), icon: Star, color: "text-emerald-600" },
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
				<StoreInfoForm store={store} />
				<AddressFormWrapper store={store} />
			</div>

			{/* Pengaturan Kurir */}
			<CourierConfigSection store={store} />

			{/* Pengaturan Meta Pixel */}
			<StorePixelConfigSection store={store} />
		</div>
	)
}

// ============================================
// STORE INFO FORM (Nama, Deskripsi, Jam Operasional)
// ============================================

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateStoreProfile, saveStoreAddressAction, updateStoreCouriersAction } from "@/actions/seller-dashboard/seller.dashboard.actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useForm, FormProvider } from "react-hook-form"
import { AddressForm } from "@/components/shared/address-form"

function StoreInfoForm({ store }) {
	const queryClient = useQueryClient()
	const [formData, setFormData] = useState({
		name: store.name || "",
		domainSlug: store.domainSlug || "",
		description: store.description || "",
		openTime: store.openTime || "09:00",
		closeTime: store.closeTime || "21:00",
	})

	const saveMutation = useMutation({
		mutationFn: (data) => updateStoreProfile(data),
		onSuccess: (res) => {
			if (res.success) {
				toast.success(res.message)
				queryClient.invalidateQueries({ queryKey: ["my-store"] })
			} else {
				toast.error(res.error)
			}
		},
		onError: () => toast.error("Terjadi kesalahan sistem."),
	})

	const handleChange = (field, value) => {
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" />Informasi Toko</CardTitle>
				<CardDescription>Detail dasar tentang toko Anda</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label>Nama Toko</Label>
					<Input
						value={formData.name}
						onChange={(e) => handleChange("name", e.target.value)}
					/>
				</div>
				<div className="space-y-2">
					<Label>Domain Toko</Label>
					<div className="flex items-center">
						<span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground text-sm">kawanbelanja.com/</span>
						<Input
							className="rounded-l-none"
							value={formData.domainSlug}
							onChange={(e) => handleChange("domainSlug", e.target.value)}
						/>
					</div>
				</div>
				<div className="space-y-2">
					<Label>Deskripsi Toko</Label>
					<Textarea
						value={formData.description}
						onChange={(e) => handleChange("description", e.target.value)}
						className="min-h-[100px]"
					/>
				</div>

				{/* Jam Operasional */}
				<div className="space-y-2">
					<Label className="flex items-center gap-2">
						<Clock className="h-4 w-4 text-blue-500" /> Jam Operasional
					</Label>
					<div className="flex items-center gap-3">
						<Input
							type="time"
							value={formData.openTime}
							onChange={(e) => handleChange("openTime", e.target.value)}
							className="w-32"
						/>
						<span className="text-sm text-muted-foreground font-medium">sampai</span>
						<Input
							type="time"
							value={formData.closeTime}
							onChange={(e) => handleChange("closeTime", e.target.value)}
							className="w-32"
						/>
					</div>
					<p className="text-xs text-muted-foreground">Waktu buka dan tutup toko yang tampil di halaman publik.</p>
				</div>

				<Button
					onClick={() => saveMutation.mutate(formData)}
					disabled={saveMutation.isPending}
				>
					{saveMutation.isPending ? (
						<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>
					) : (
						<><Save className="mr-2 h-4 w-4" />Simpan Perubahan</>
					)}
				</Button>
			</CardContent>
		</Card>
	)
}

function AddressFormWrapper({ store }) {
	const queryClient = useQueryClient()

	const saveMutation = useMutation({
		mutationFn: saveStoreAddressAction,
		onSuccess: (res) => {
			if (res.success) {
				toast.success("Alamat toko berhasil disimpan!")
				queryClient.invalidateQueries({ queryKey: ["my-store"] })
			} else {
				toast.error(res.error || "Gagal menyimpan alamat toko.")
			}
		},
		onError: () => {
			toast.error("Terjadi kesalahan sistem.")
		}
	})

	const methods = useForm({
		defaultValues: {
			recipientName: store.address?.recipientName || store.name || "",
			recipientPhone: store.address?.recipientPhone || "",
			label: store.address?.label || "Toko",
			biteshipAreaId: store.address?.biteshipAreaId || "",
			provinceName: store.address?.provinceName || "",
			cityName: store.address?.cityName || "",
			kecamatanName: store.address?.kecamatanName || "",
			provinceId: store.address?.provinceId || "",
			cityId: store.address?.cityId || "",
			kecamatanId: store.address?.kecamatanId || "",
			kelurahanId: store.address?.kelurahanId || "",
			zipcode: store.address?.zipcode || "",
			detailAddress: store.address?.detailAddress || "",
			latitude: store.address?.latitude || null,
			longitude: store.address?.longitude || null,
		}
	})

	const onSubmit = async (data) => {
		if (!data.biteshipAreaId) {
			toast.error("Pilih wilayah terlebih dahulu menggunakan kolom pencarian.")
			return
		}
		if (!data.detailAddress?.trim()) {
			toast.error("Alamat lengkap wajib diisi.")
			return
		}
		await saveMutation.mutateAsync(data)
	}

	return (
		<Card>
			<FormProvider {...methods}>
				<form onSubmit={methods.handleSubmit(onSubmit)}>
					<AddressForm
						title="Alamat Penjemputan (Toko)"
						description="Alamat ini digunakan oleh kurir untuk mengambil paket dari toko Anda dan menghitung ongkos kirim."
						showLabel={false}
					/>
					<CardContent className="pt-0">
						<div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:bg-blue-950/30 dark:border-blue-800 mb-4">
							<p className="text-sm text-blue-800 dark:text-blue-300">
								📍 Pastikan alamat sudah tepat hingga level Kecamatan agar ongkos kirim akurat dan kurir tidak tersesat saat pickup paket.
							</p>
						</div>
						<Button type="submit" disabled={saveMutation.isPending}>
							{saveMutation.isPending ? (
								<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>
							) : (
								<><Save className="mr-2 h-4 w-4" />Simpan Alamat</>
							)}
						</Button>
					</CardContent>
				</form>
			</FormProvider>
		</Card>
	)
}

// ============================================
// COURIER CONFIG SECTION
// ============================================

import { Checkbox } from "@/components/ui/checkbox"
import { Truck } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getBiteshipCouriers } from "@/actions/public/biteship.actions"

function CourierConfigSection({ store }) {
	const queryClient = useQueryClient()
	const currentCouriers = store.enabledCouriers ? store.enabledCouriers.split(",").map(c => c.trim()) : []
	const [selected, setSelected] = useState(currentCouriers.length > 0 ? currentCouriers : [])

	// Fetch dynamic couriers dari Biteship
	const { data: couriersResponse, isLoading: isLoadingCouriers } = useQuery({
		queryKey: ["biteship-couriers"],
		queryFn: async () => {
			const res = await getBiteshipCouriers()
			return res.success ? res.data : []
		},
		staleTime: 1000 * 60 * 60 * 24, // cache 24 jam
	})

	const AVAILABLE_COURIERS = couriersResponse || []

	const saveMutation = useMutation({
		mutationFn: (couriers) => updateStoreCouriersAction(couriers),
		onSuccess: (res) => {
			if (res.success) {
				toast.success("Kurir berhasil diperbarui!")
				queryClient.invalidateQueries({ queryKey: ["my-store"] })
			} else {
				toast.error(res.error || "Gagal menyimpan kurir.")
			}
		},
		onError: () => toast.error("Terjadi kesalahan sistem."),
	})

	const toggleCourier = (code) => {
		setSelected(prev =>
			prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
		)
	}

	const handleSave = () => {
		if (selected.length === 0) {
			toast.error("Pilih minimal 1 kurir.")
			return
		}
		saveMutation.mutate(selected.join(","))
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Truck className="h-5 w-5" />
					Pengaturan Kurir
				</CardTitle>
				<CardDescription>
					Pilih kurir yang tersedia di lokasi toko Anda. Pembeli hanya bisa memilih kurir yang Anda aktifkan.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{isLoadingCouriers ? (
					<div className="flex items-center justify-center p-8 text-muted-foreground">
						<Loader2 className="mr-2 h-6 w-6 animate-spin" />
						Memuat daftar kurir...
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{AVAILABLE_COURIERS.map(courier => {
							const isChecked = selected.includes(courier.code)
							return (
								<div
									key={courier.code}
									onClick={() => toggleCourier(courier.code)}
									className={`flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${isChecked
											? "border-primary bg-primary/5 ring-1 ring-primary/20"
											: "border-border hover:border-primary/30"
										}`}
								>
									<Checkbox
										checked={isChecked}
										onCheckedChange={() => toggleCourier(courier.code)}
										className="shrink-0 pointer-events-none"
									/>
									<div className="min-w-0">
										<p className="text-sm font-semibold">{courier.name}</p>
										<p className="text-[11px] text-muted-foreground">{courier.desc}</p>
									</div>
								</div>
							)
						})}
					</div>
				)}

				{selected.length === 0 && (
					<div className="p-3 rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/30 dark:border-red-800">
						<p className="text-xs text-red-800 dark:text-red-300">
							⚠️ Pilih minimal 1 kurir agar pembeli bisa checkout.
						</p>
					</div>
				)}

				<div className="flex items-center justify-between pt-2">
					<p className="text-xs text-muted-foreground">
						{selected.length} kurir aktif
					</p>
					<Button onClick={handleSave} disabled={saveMutation.isPending}>
						{saveMutation.isPending ? (
							<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>
						) : (
							<><Save className="mr-2 h-4 w-4" />Simpan Kurir</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}

// ============================================
// STORE PIXEL CONFIG SECTION
// ============================================

function StorePixelConfigSection({ store }) {
	const queryClient = useQueryClient()
	const [pixelId, setPixelId] = useState(store.metaPixelId || "")

	const saveMutation = useMutation({
		mutationFn: (data) => updateStoreProfile(data),
		onSuccess: (res) => {
			if (res.success) {
				toast.success("Meta Pixel ID berhasil disimpan!")
				queryClient.invalidateQueries({ queryKey: ["my-store"] })
			} else {
				toast.error(res.error || "Gagal menyimpan Meta Pixel ID.")
			}
		},
		onError: () => toast.error("Terjadi kesalahan sistem."),
	})

	const handleSave = () => {
		saveMutation.mutate({
			name: store.name,
			domainSlug: store.domainSlug,
			description: store.description,
			openTime: store.openTime,
			closeTime: store.closeTime,
			metaPixelId: pixelId,
		})
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Activity className="h-5 w-5" />
					Pengaturan Meta Pixel
				</CardTitle>
				<CardDescription>
					Masukkan ID Meta Pixel (Facebook Pixel) Anda untuk melacak pengunjung,
					tambahan keranjang, dan konversi dari toko Anda sendiri.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label>Meta Pixel ID</Label>
					<Input
						placeholder="Contoh: 123456789012345"
						value={pixelId}
						onChange={(e) => setPixelId(e.target.value)}
					/>
					<p className="text-xs text-muted-foreground">
						Kosongkan jika Anda tidak ingin menggunakan Meta Pixel.
					</p>
				</div>
				<div className="flex justify-end">
					<Button onClick={handleSave} disabled={saveMutation.isPending}>
						{saveMutation.isPending ? (
							<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>
						) : (
							<><Save className="mr-2 h-4 w-4" />Simpan Pixel</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
