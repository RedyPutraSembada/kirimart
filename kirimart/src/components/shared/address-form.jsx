"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useFormContext } from "react-hook-form"
import {
	FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CardContent, CardHeader, CardTitle, CardDescription as CardDesc } from "@/components/ui/card"
import { MapPin, Search, Loader2, CheckCircle2 } from "lucide-react"
import { searchBiteshipArea } from "@/actions/public/biteship.actions"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"

const LocationPicker = dynamic(() => import("@/components/shared/location-picker"), {
	ssr: false,
	loading: () => <div className="w-full h-full bg-muted flex items-center justify-center text-sm text-muted-foreground animate-pulse rounded-md border">Memuat Peta...</div>
})

/**
 * AddressForm — Shared Biteship Autocomplete Address Form
 * 
 * Digunakan oleh:
 * 1. User Dashboard → Tambah/Edit Alamat (Buyer)
 * 2. Seller Dashboard → Profil Toko → Alamat Penjemputan
 * 3. Create Store (Onboarding) → Alamat Toko
 * 
 * Flow:
 * 1. User mengetik di input pencarian (misal: "Pesanggrahan Jakarta")
 * 2. Setelah 1 detik berhenti → hit searchBiteshipArea() [1 API hit = Rp 5]
 * 3. Muncul dropdown hasil (Kecamatan, Kota, Provinsi, Kode Pos)
 * 4. User pilih → otomatis isi: biteshipAreaId, provinceName, cityName, kecamatanName, zipcode
 * 5. User isi: detailAddress, recipientName, recipientPhone, label
 * 
 * Props:
 * - title: string — Judul section (default: "Alamat Pengiriman")
 * - description: string — Deskripsi section
 * - showRecipient: boolean — Tampilkan field nama/telp penerima (default: true)
 * - showLabel: boolean — Tampilkan field label alamat (default: true)
 */
export function AddressForm({
	title = "Alamat Pengiriman",
	description = "Cari wilayah Anda untuk mendapatkan data logistik yang akurat dari Biteship.",
	showRecipient = true,
	showLabel = true,
}) {
	const { control, setValue, watch } = useFormContext()

	const [searchQuery, setSearchQuery] = useState("")
	const [searchResults, setSearchResults] = useState([])
	const [isSearching, setIsSearching] = useState(false)
	const [showDropdown, setShowDropdown] = useState(false)
	const [selectedArea, setSelectedArea] = useState(null)
	const dropdownRef = useRef(null)
	const debounceRef = useRef(null)

	// Check if area is already selected (edit mode)
	const existingAreaId = watch("biteshipAreaId")
	const existingKecamatan = watch("kecamatanName")
	const existingCity = watch("cityName")
	const existingProvince = watch("provinceName")

	useEffect(() => {
		if (existingAreaId && existingKecamatan && !selectedArea) {
			setSelectedArea({
				id: existingAreaId,
				kecamatanName: existingKecamatan,
				cityName: existingCity,
				provinceName: existingProvince,
			})
		}
	}, [existingAreaId, existingKecamatan, existingCity, existingProvince, selectedArea])

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (e) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
				setShowDropdown(false)
			}
		}
		document.addEventListener("mousedown", handleClickOutside)
		return () => document.removeEventListener("mousedown", handleClickOutside)
	}, [])

	// Debounced search
	const handleSearchChange = useCallback((value) => {
		setSearchQuery(value)

		if (debounceRef.current) clearTimeout(debounceRef.current)

		if (value.trim().length < 3) {
			setSearchResults([])
			setShowDropdown(false)
			return
		}

		debounceRef.current = setTimeout(async () => {
			setIsSearching(true)
			setShowDropdown(true)
			try {
				const res = await searchBiteshipArea(value.trim())
				if (res.success) {
					setSearchResults(res.data)
				} else {
					setSearchResults([])
				}
			} catch {
				setSearchResults([])
			} finally {
				setIsSearching(false)
			}
		}, 1000) // 1 detik debounce — hemat API hit
	}, [])

	// Handle area selection
	const handleSelectArea = (area) => {
		setSelectedArea(area)
		setShowDropdown(false)
		setSearchQuery("")
		setSearchResults([])

		// Set form values
		setValue("biteshipAreaId", area.id, { shouldValidate: true })
		setValue("provinceName", area.provinceName, { shouldValidate: true })
		setValue("cityName", area.cityName, { shouldValidate: true })
		setValue("kecamatanName", area.kecamatanName, { shouldValidate: true })
		setValue("zipcode", area.postalCode ? String(area.postalCode) : "", { shouldValidate: true })
		// Set IDs (for backward compatibility)
		setValue("provinceId", area.provinceName)
		setValue("cityId", area.cityName)
		setValue("kecamatanId", area.kecamatanName)
	}

	// Reset selected area
	const handleResetArea = () => {
		setSelectedArea(null)
		setValue("biteshipAreaId", "")
		setValue("provinceName", "")
		setValue("cityName", "")
		setValue("kecamatanName", "")
		setValue("zipcode", "")
		setValue("provinceId", "")
		setValue("cityId", "")
		setValue("kecamatanId", "")
	}

	return (
		<>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<MapPin className="h-5 w-5 text-primary" />
					{title}
				</CardTitle>
				<CardDesc>{description}</CardDesc>
			</CardHeader>
			<CardContent className="space-y-5">
				{/* Recipient Name + Phone */}
				{showRecipient && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							control={control}
							name="recipientName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nama Penerima</FormLabel>
									<FormControl>
										<Input placeholder="Nama lengkap penerima" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={control}
							name="recipientPhone"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nomor Handphone</FormLabel>
									<FormControl>
										<Input placeholder="08123456789" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				)}

				{/* Label */}
				{showLabel && (
					<FormField
						control={control}
						name="label"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Label Alamat</FormLabel>
								<FormControl>
									<Input placeholder="Rumah, Kantor, Gudang, dll." {...field} value={field.value || ""} />
								</FormControl>
								<FormDescription>Opsional. Untuk membedakan alamat Anda.</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				{/* Area Search (Biteship Autocomplete) */}
				<div className="space-y-2">
					<FormLabel>Wilayah <span className="text-red-500">*</span></FormLabel>

					{/* Selected Area Display */}
					{selectedArea ? (
						<div className="flex items-center justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30">
							<div className="flex items-center gap-2 min-w-0">
								<CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
								<div className="min-w-0">
									<p className="text-sm font-medium truncate">
										{selectedArea.kecamatanName}, {selectedArea.cityName}
									</p>
									<p className="text-xs text-muted-foreground truncate">
										{selectedArea.provinceName}
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={handleResetArea}
								className="text-xs text-primary font-semibold hover:underline shrink-0 ml-2"
							>
								Ganti
							</button>
						</div>
					) : (
						/* Search Input */
						<div className="relative" ref={dropdownRef}>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Ketik nama kecamatan, kota, atau kode pos..."
									className="pl-9 pr-10"
									value={searchQuery}
									onChange={(e) => handleSearchChange(e.target.value)}
									onFocus={() => {
										if (searchResults.length > 0) setShowDropdown(true)
									}}
								/>
								{isSearching && (
									<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
								)}
							</div>

							{/* Search Results Dropdown */}
							{showDropdown && (
								<div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-64 overflow-y-auto">
									{isSearching ? (
										<div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
											<Loader2 className="h-4 w-4 animate-spin" />
											Mencari wilayah...
										</div>
									) : searchResults.length === 0 ? (
										<div className="p-4 text-sm text-muted-foreground text-center">
											{searchQuery.length >= 3
												? "Tidak ditemukan. Coba kata kunci lain."
												: "Ketik minimal 3 karakter..."}
										</div>
									) : (
										searchResults.map((area, idx) => (
											<button
												key={`${area.id}-${idx}`}
												type="button"
												onClick={() => handleSelectArea(area)}
												className={cn(
													"w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0",
													"flex items-start gap-3"
												)}
											>
												<MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
												<div className="min-w-0">
													<p className="text-sm font-medium truncate">
														{area.kecamatanName}, {area.cityName}
													</p>
													<p className="text-xs text-muted-foreground truncate">
														{area.provinceName} — {area.postalCode}
													</p>
												</div>
											</button>
										))
									)}
								</div>
							)}
						</div>
					)}
					<p className="text-xs text-muted-foreground">
						Cari berdasarkan nama kecamatan, kota, atau kode pos. Data dari Biteship.
					</p>

					{/* Hidden fields for form values */}
					<FormField control={control} name="biteshipAreaId" render={() => <FormMessage />} />
				</div>

				{/* Zipcode (auto-filled, editable) */}
				<FormField
					control={control}
					name="zipcode"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Kode Pos</FormLabel>
							<FormControl>
								<Input placeholder="Kode pos (otomatis terisi)" {...field} value={field.value || ""} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Detail Address */}
				<FormField
					control={control}
					name="detailAddress"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Alamat Lengkap <span className="text-red-500">*</span></FormLabel>
							<FormControl>
								<Textarea
									placeholder="Nama jalan, gedung, no. rumah, RT/RW, patokan..."
									className="resize-none min-h-[80px]"
									{...field}
								/>
							</FormControl>
							<FormDescription>
								Tulis detail alamat lengkap agar kurir mudah menemukan lokasi Anda.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Map Pin Point (Sembunyikan Sementara) */}
				{false && (
					<div className="space-y-3">
						<div className="space-y-1">
							<FormLabel>Pin Point Alamat (Peta)</FormLabel>
							<FormDescription>
								Geser pin merah untuk menyesuaikan lokasi presisi. Berguna untuk kurir Instant/Same-Day.
							</FormDescription>
						</div>
						<div className="h-[360px] w-full">
							<LocationPicker 
								defaultLat={watch("latitude") || -6.200000} 
								defaultLng={watch("longitude") || 106.816666} 
								onLocationSelect={(lat, lng) => {
									setValue("latitude", lat)
									setValue("longitude", lng)
								}}
							/>
						</div>
						{/* Hidden fields for latitude and longitude */}
						<FormField control={control} name="latitude" render={() => <FormMessage />} />
						<FormField control={control} name="longitude" render={() => <FormMessage />} />
					</div>
				)}
			</CardContent>
		</>
	)
}
