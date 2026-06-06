"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { createStoreSchema } from "@/lib/validations/protected/create-store"
import { createStore } from "@/actions/protected/store.actions"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { StoreIcon, Loader2 } from "lucide-react"
import { env } from "@/config/env"
import { uploadFile } from "@/lib/upload"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AddressForm } from "@/components/shared/address-form"

const MAX_FILE_SIZE_MB = env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || 2

export function CreateStoreForm() {
	const queryClient = useQueryClient()
	const router = useRouter()
	const [error, setError] = useState(null)
	const [isPending, setIsPending] = useState(false)
	const [isLoadingLogo, setIsLoadingLogo] = useState(false)
	const [isLoadingBanner, setIsLoadingBanner] = useState(false)
	const [logoPreview, setLogoPreview] = useState('')
	const [bannerPreview, setBannerPreview] = useState('')

	const form = useForm({
		resolver: zodResolver(createStoreSchema),
		defaultValues: {
			name: "",
			domainSlug: "",
			recipientName: "",
			recipientPhone: "",
			label: "Toko",
			biteshipAreaId: "",
			provinceName: "",
			cityName: "",
			kecamatanName: "",
			provinceId: "",
			cityId: "",
			kecamatanId: "",
			kelurahanId: "",
			zipcode: "",
			detailAddress: "",
			logo: "",
			banner: "",
			description: "",
			bankName: "",
			bankAccountNumber: "",
			bankAccountHolder: "",
		},
	})

	const createMutation = useMutation({
		mutationFn: async (data) => {
			const result = await createStore(data)
			if (!result.success) throw new Error(result.error)
			return result
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['my-store'] })
			toast.success("Toko berhasil dibuat! Selamat berjualan.")
			router.push("/seller-dashboard")
		},
		onError: (error) => {
			toast.error(error.message || "Gagal membuat toko. Silakan coba lagi.")
			setIsPending(false)
		},
	})

	const { clearErrors, setError: setFormError } = form

	async function onSubmit(data) {
		setIsPending(true)
		try {
			await createMutation.mutateAsync(data)
		} catch (err) {
			setError(err)
			setIsPending(false)
		}
	}

	return (
		<div className="w-full max-w-2xl mx-auto p-6 bg-card rounded-xl border shadow-sm">
			<div className="mb-8 text-center">
				<div className="mx-auto relative w-20 h-20 mb-4 drop-shadow-md">
					<Image 
						src="/images/kawanbelanja.png" 
						alt="Logo Kawan Belanja" 
						fill
						className="object-contain"
					/>
				</div>
				<h2 className="text-2xl font-bold">Buka Toko Anda</h2>
				<p className="text-muted-foreground mt-2">
					Isi detail di bawah ini untuk mulai berjualan di KawanBelanja.
				</p>
			</div>

			{/* {globalError && (
				<Alert variant="destructive" className="mb-6">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{globalError}</AlertDescription>
				</Alert>
			)} */}

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Nama Toko</FormLabel>
								<FormControl>
									<Input placeholder="Toko Maju Jaya" {...field} disabled={isPending} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="domainSlug"
						render={({ field }) => (
							<FormItem>
								<FormLabel>URL Toko (Domain)</FormLabel>
								<FormControl>
									<div className="flex items-center">
										<span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-muted-foreground text-sm">
											kawanbelanja.com/
										</span>
										<Input
											className="rounded-l-none"
											placeholder="toko-maju-jaya"
											{...field}
											disabled={isPending}
										/>
									</div>
								</FormControl>
								<FormDescription>
									Hanya gunakan huruf kecil, angka, dan strip (-).
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name='logo'
						render={({ field }) => (
							<FormItem className='space-y-4'>
								<FormLabel>Upload Logo Toko (Opsional)</FormLabel>
								<FormControl>
									<div className='flex flex-col w-full space-y-1'>
										<Input
											type='file'
											accept='image/png, image/jpeg, image/jpg'
											onChange={async (e) => {
												setIsLoadingLogo(true)
												const file = e.target.files?.[0]
												if (file) {

													clearErrors('logo')
													const uploadedUrl = await uploadFile(file)
													if (uploadedUrl) {
														field.onChange(uploadedUrl)
														setLogoPreview(URL.createObjectURL(file))

													}
												}
												setIsLoadingLogo(false)
											}}
										/>

										{/* Preview jika ada hasil upload (object URL) */}
										{!isLoadingLogo && field.value && logoPreview !== '' && (
											<div className='w-full h-32 border p-2 border-dashed rounded-md shadow-md'>
												<div className='relative w-full h-full'>
													<Image
														alt='Preview logo'
														className='object-contain rounded-md'
														src={logoPreview}
														fill
														sizes="128px"
														unoptimized
													/>
												</div>
											</div>
										)}

										{/* Preview jika previewUrl kosong tapi field value ada (URL eksternal) */}
										{!isLoadingLogo && field.value && logoPreview === '' && (
											<div className='w-full h-32 border p-2 border-dashed rounded-md shadow-md'>
												<div className='relative w-full h-full'>
													<Image
														alt='Preview logo'
														className='object-contain rounded-md'
														src={field.value}
														fill
														sizes="128px"
														unoptimized
													/>
												</div>
											</div>
										)}

										{/* Loading State */}
										{isLoadingLogo && (
											<div className='w-full h-32 border p-2 border-dashed rounded-md shadow-md flex items-center justify-center'>
												<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
											</div>
										)}
									</div>
								</FormControl>
								<FormDescription>
									{`Format: PNG/JPG. Maks ${MAX_FILE_SIZE_MB || 1} MB.`}
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Deskripsi Toko</FormLabel>
								<FormControl>
									<Textarea
										placeholder="Ceritakan sedikit tentang toko Anda..."
										className="resize-none h-24"
										{...field}
										value={field.value || ''}
										disabled={isPending}
									/>
								</FormControl>
								<FormDescription>
									Opsional. Akan ditampilkan di halaman profil toko Anda.
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name='banner'
						render={({ field }) => (
							<FormItem className='space-y-4'>
								<FormLabel>Upload Banner Toko (Opsional)</FormLabel>
								<FormControl>
									<div className='flex flex-col w-full space-y-1'>
										<Input
											type='file'
											accept='image/png, image/jpeg, image/jpg'
											onChange={async (e) => {
												setIsLoadingBanner(true)
												const file = e.target.files?.[0]
												if (file) {

													clearErrors('banner')
													const uploadedUrl = await uploadFile(file)
													if (uploadedUrl) {
														field.onChange(uploadedUrl)
														setBannerPreview(URL.createObjectURL(file))

													}
												}
												setIsLoadingBanner(false)
											}}
										/>

										{/* Preview jika ada hasil upload (object URL) */}
										{!isLoadingBanner && field.value && bannerPreview !== '' && (
											<div className='w-full h-48 border p-2 border-dashed rounded-md shadow-md'>
												<div className='relative w-full h-full'>
													<Image
														alt='Preview banner'
														className='object-cover rounded-md'
														src={bannerPreview}
														fill
														sizes="(max-width: 768px) 100vw, 33vw"
														unoptimized
													/>
												</div>
											</div>
										)}

										{/* Preview jika previewUrl kosong tapi field value ada (URL eksternal) */}
										{!isLoadingBanner && field.value && bannerPreview === '' && (
											<div className='w-full h-48 border p-2 border-dashed rounded-md shadow-md'>
												<div className='relative w-full h-full'>
													<Image
														alt='Preview banner'
														className='object-cover rounded-md'
														src={field.value}
														fill
														sizes="(max-width: 768px) 100vw, 33vw"
														unoptimized
													/>
												</div>
											</div>
										)}

										{/* Loading State */}
										{isLoadingBanner && (
											<div className='w-full h-48 border p-2 border-dashed rounded-md shadow-md flex items-center justify-center'>
												<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
											</div>
										)}
									</div>
								</FormControl>
								<FormDescription>
									{`Format: PNG/JPG. Akan muncul di halaman utama toko Anda.`}
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>


					{/* ─── Informasi Rekening Bank ─── */}
					<div className="border-t pt-6">
						<h3 className="text-sm font-semibold mb-1">Informasi Rekening Bank</h3>
						<p className="text-xs text-muted-foreground mb-4">Wajib diisi. Digunakan untuk pencairan dana penjualan Anda.</p>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<FormField
								control={form.control}
								name="bankName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Nama Bank</FormLabel>
										<FormControl>
											<Input placeholder="BCA, Mandiri, BNI, dll" {...field} disabled={isPending} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="bankAccountNumber"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Nomor Rekening</FormLabel>
										<FormControl>
											<Input placeholder="1234567890" {...field} disabled={isPending} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<FormField
							control={form.control}
							name="bankAccountHolder"
							render={({ field }) => (
								<FormItem className="mt-4">
									<FormLabel>Nama Pemilik Rekening</FormLabel>
									<FormControl>
										<Input placeholder="Sesuai buku tabungan" {...field} disabled={isPending} />
									</FormControl>
									<FormDescription>
										Pastikan nama sesuai dengan rekening bank Anda.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="border-t pt-6">
						<h3 className="text-sm font-semibold mb-1">Informasi Alamat Toko</h3>
						<p className="text-xs text-muted-foreground mb-4">Tentukan lokasi toko Anda untuk keperluan penjemputan barang.</p>
						
						<AddressForm 
							title="Alamat Penjemputan (Toko)" 
							description="Alamat ini digunakan oleh kurir untuk mengambil paket dari toko Anda dan menghitung ongkos kirim."
							showLabel={false}
						/>
					</div>

					<Button type="submit" className="w-full" disabled={isPending}>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Membuka Toko...
							</>
						) : (
							"Daftar Toko Sekarang"
						)}
					</Button>
				</form>
			</Form>
		</div>
	)
}
