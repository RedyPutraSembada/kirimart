"use client"

import { useState, useEffect } from "react"
import { useFormContext } from "react-hook-form"
import {
	FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
	getProvincesAction, getCitiesAction, getKecamatanAction, getKelurahanAction 
} from "@/actions/kiriminaja/regional.actions"

export function AddressForm({ 
	title = "Alamat Pengiriman", 
	description = "Pilih lokasi menggunakan area yang didukung oleh KiriminAja." 
}) {
	const { control, watch, setValue, formState: { errors } } = useFormContext()

	const [provinces, setProvinces] = useState([])
	const [cities, setCities] = useState([])
	const [kecamatans, setKecamatans] = useState([])
	const [kelurahans, setKelurahans] = useState([])

	const [loadingState, setLoadingState] = useState({
		prov: true, city: false, kec: false, kel: false
	})

	const provinceId = watch("provinceId")
	const cityId = watch("cityId")
	const kecamatanId = watch("kecamatanId")

	// Load Provinces on mount
	useEffect(() => {
		const fetchProv = async () => {
			setLoadingState(p => ({ ...p, prov: true }))
			const res = await getProvincesAction()
			if (res.success) setProvinces(res.data)
			setLoadingState(p => ({ ...p, prov: false }))
		}
		fetchProv()
	}, [])

	// Load Cities when Province changes
	useEffect(() => {
		if (!provinceId) return
		const fetchCity = async () => {
			setLoadingState(p => ({ ...p, city: true }))
			const res = await getCitiesAction(provinceId)
			if (res.success) setCities(res.data)
			setLoadingState(p => ({ ...p, city: false }))
		}
		fetchCity()
	}, [provinceId])

	// Load Kecamatan when City changes
	useEffect(() => {
		if (!cityId) return
		const fetchKec = async () => {
			setLoadingState(p => ({ ...p, kec: true }))
			const res = await getKecamatanAction(cityId)
			if (res.success) setKecamatans(res.data)
			setLoadingState(p => ({ ...p, kec: false }))
		}
		fetchKec()
	}, [cityId])

	// Load Kelurahan when Kecamatan changes
	useEffect(() => {
		if (!kecamatanId) return
		const fetchKel = async () => {
			setLoadingState(p => ({ ...p, kel: true }))
			const res = await getKelurahanAction(kecamatanId)
			if (res.success) setKelurahans(res.data)
			setLoadingState(p => ({ ...p, kel: false }))
		}
		fetchKel()
	}, [kecamatanId])

	// Handler untuk mereset child dropdown ketika parent diubah
	const handleProvChange = (val) => {
		setValue("provinceId", val)
		setValue("cityId", "")
		setValue("kecamatanId", "")
		setValue("kelurahanId", "")
		setValue("zipcode", "")
		setCities([])
		setKecamatans([])
		setKelurahans([])
	}

	const handleCityChange = (val) => {
		setValue("cityId", val)
		setValue("kecamatanId", "")
		setValue("kelurahanId", "")
		setValue("zipcode", "")
		setKecamatans([])
		setKelurahans([])
	}

	const handleKecChange = (val) => {
		setValue("kecamatanId", val)
		setValue("kelurahanId", "")
		setValue("zipcode", "")
		setKelurahans([])
	}

	const handleKelChange = (val) => {
		setValue("kelurahanId", val)
		const kel = kelurahans.find(k => k.id === val)
		if (kel && kel.zipcode) {
			setValue("zipcode", kel.zipcode)
		}
	}

	return (
		<div className="space-y-6 bg-card p-6 rounded-lg border">
			<div>
				<h3 className="text-lg font-medium">{title}</h3>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<FormField
					control={control}
					name="recipientName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Nama Penerima</FormLabel>
							<FormControl>
								<Input placeholder="John Doe" {...field} />
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

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<FormField
					control={control}
					name="provinceId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Provinsi</FormLabel>
							<Select onValueChange={handleProvChange} value={field.value || ""}>
								<FormControl>
									<SelectTrigger disabled={loadingState.prov}>
										<SelectValue placeholder={loadingState.prov ? "Memuat..." : "Pilih Provinsi"} />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{provinces.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={control}
					name="cityId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Kota/Kabupaten</FormLabel>
							<Select onValueChange={handleCityChange} value={field.value || ""} disabled={!provinceId || loadingState.city}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder={loadingState.city ? "Memuat..." : "Pilih Kota/Kabupaten"} />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={control}
					name="kecamatanId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Kecamatan</FormLabel>
							<Select onValueChange={handleKecChange} value={field.value || ""} disabled={!cityId || loadingState.kec}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder={loadingState.kec ? "Memuat..." : "Pilih Kecamatan"} />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{kecamatans.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={control}
					name="kelurahanId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Kelurahan</FormLabel>
							<Select onValueChange={handleKelChange} value={field.value || ""} disabled={!kecamatanId || loadingState.kel}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder={loadingState.kel ? "Memuat..." : "Pilih Kelurahan"} />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{kelurahans.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			<div className="grid grid-cols-1 gap-6">
				<FormField
					control={control}
					name="detailAddress"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Alamat Lengkap</FormLabel>
							<FormControl>
								<Textarea 
									placeholder="Nama jalan, gedung, no. rumah, RT/RW, patokan..." 
									className="resize-none"
									{...field} 
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={control}
					name="zipcode"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Kode Pos</FormLabel>
							<FormControl>
								<Input placeholder="Kode Pos" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>
		</div>
	)
}
