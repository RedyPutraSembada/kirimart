"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { createStoreSchema } from "@/lib/validations/protected/create-store"
import { createStore } from "@/actions/protected/store.actions"
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
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"

const uriUpload = env.NEXT_PUBLIC_UPLOAD_URI
const uploadApiKey = env.NEXT_PUBLIC_UPLOAD_API_KEY
const MAX_FILE_SIZE_MB = env.NEXT_PUBLIC_MAX_FILE_SIZE_MB

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
			province: "",
			city: "",
			detailAddress: "",
			logo: "",
			banner: "",
			description: "",
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

	async function uploadImage(file) {
		toast.info("Uploading image...")
		const formData = new FormData()
		formData.append('file', file)
		const url = `${uriUpload}/upload`
		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'x-api-key': uploadApiKey ?? '' },
				body: formData,
			})
			console.log('response upload', response)

			if (!response.ok) throw new Error(`Error: ${response.statusText}`)
			const data = await response.json()
			return data?.file?.url ?? ''
		} catch {
			return ''
		}
	}

	return (
		<div className="w-full max-w-2xl mx-auto p-6 bg-card rounded-xl border shadow-sm">
			<div className="mb-8 text-center">
				<div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
					<StoreIcon className="w-6 h-6 text-primary" />
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
													const fileSizeMB = file.size / (1024 * 1024)
													if (fileSizeMB > MAX_FILE_SIZE_MB) {
														setFormError('logo', {
															type: 'manual',
															message: `Ukuran file tidak boleh lebih dari ${MAX_FILE_SIZE_MB} MB.`,
														})
													} else {
														clearErrors('logo')
														const uploadedUrl = await uploadImage(file)
														if (uploadedUrl) {
															field.onChange(uploadedUrl)
															setLogoPreview(URL.createObjectURL(file))
														}
													}
												}
												setIsLoadingLogo(false)
											}}
										/>

										{/* Preview jika ada hasil upload (object URL) */}
										{!isLoadingLogo && field.value && logoPreview !== '' && (
											<div className='w-full h-32 border p-2 border-dashed rounded-md shadow-md'>
												<div className='relative w-full h-full'>
													<img
														alt='Preview logo'
														className='w-full h-full object-contain rounded-md'
														src={logoPreview}
													/>
												</div>
											</div>
										)}

										{/* Preview jika previewUrl kosong tapi field value ada (URL eksternal) */}
										{!isLoadingLogo && field.value && logoPreview === '' && (
											<div className='w-full h-32 border p-2 border-dashed rounded-md shadow-md'>
												<div className='relative w-full h-full'>
													<img
														alt='Preview logo'
														className='w-full h-full object-contain rounded-md'
														src={field.value}
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
													const fileSizeMB = file.size / (1024 * 1024)
													if (fileSizeMB > MAX_FILE_SIZE_MB) {
														setFormError('banner', {
															type: 'manual',
															message: `Ukuran file tidak boleh lebih dari ${MAX_FILE_SIZE_MB} MB.`,
														})
													} else {
														clearErrors('banner')
														const uploadedUrl = await uploadImage(file)
														if (uploadedUrl) {
															field.onChange(uploadedUrl)
															setBannerPreview(URL.createObjectURL(file))
														}
													}
												}
												setIsLoadingBanner(false)
											}}
										/>

										{/* Preview jika ada hasil upload (object URL) */}
										{!isLoadingBanner && field.value && bannerPreview !== '' && (
											<div className='w-full h-48 border p-2 border-dashed rounded-md shadow-md'>
												<div className='relative w-full h-full'>
													<img
														alt='Preview banner'
														className='w-full h-full object-cover rounded-md'
														src={bannerPreview}
													/>
												</div>
											</div>
										)}

										{/* Preview jika previewUrl kosong tapi field value ada (URL eksternal) */}
										{!isLoadingBanner && field.value && bannerPreview === '' && (
											<div className='w-full h-48 border p-2 border-dashed rounded-md shadow-md'>
												<div className='relative w-full h-full'>
													<img
														alt='Preview banner'
														className='w-full h-full object-cover rounded-md'
														src={field.value}
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



					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<FormField
							control={form.control}
							name="province"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Provinsi Asal</FormLabel>
									<FormControl>
										<Input placeholder="Jawa Barat" {...field} disabled={isPending} />
									</FormControl>
									<FormDescription>
										*Akan diubah ke dropdown RajaOngkir nanti
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="city"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Kota Asal</FormLabel>
									<FormControl>
										<Input placeholder="Bandung" {...field} disabled={isPending} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name="detailAddress"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Alamat Lengkap Toko</FormLabel>
								<FormControl>
									<Textarea
										placeholder="Jl. Merdeka No. 123, RT 01/RW 02..."
										className="resize-none"
										{...field}
										disabled={isPending}
									/>
								</FormControl>
								<FormDescription>
									Alamat ini akan digunakan oleh kurir saat menjemput (pickup) pesanan.
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

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
