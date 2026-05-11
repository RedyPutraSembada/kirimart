"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
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
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save, Plus, X, Loader2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { env } from "@/config/env"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { createProductSchema } from "@/lib/validations/seller-dashboard/product/product"
import { updateProduct } from "@/actions/seller-dashboard/product/product.actions"
import { statusProduct } from "@/lib/const-data"

const uriUpload = env.NEXT_PUBLIC_UPLOAD_URI
const uploadApiKey = env.NEXT_PUBLIC_UPLOAD_API_KEY
const MAX_FILE_SIZE_MB = env.NEXT_PUBLIC_MAX_FILE_SIZE_MB

export function FormEditProduct({ categories, dataProduct }) {
	const queryClient = useQueryClient()
	const router = useRouter()
	const [isPending, setIsPending] = useState(false)
	const [isLoadingImage, setIsLoadingImage] = useState(false)

	// Gabungkan previewUrl & serverUrl dalam satu array agar selalu sinkron by index
	const [images, setImages] = useState(
		dataProduct?.images?.map((image) => ({
			previewUrl: image.imageUrl,
			serverUrl: image.imageUrl,
		})) || []
	)

	const form = useForm({
		resolver: zodResolver(createProductSchema),
		defaultValues: {
			name: dataProduct.name || "",
			description: dataProduct.description || "",
			categoryId: dataProduct.categoryId ? String(dataProduct.categoryId) : "",
			weightGram: dataProduct.weightGram || "",
			status: dataProduct.status || "",
			price: dataProduct.price || "",
			stock: dataProduct.stock || "",
			images: dataProduct?.images?.map((image) => image.imageUrl) || [],
		},
	})

	const { clearErrors, setError: setFormError } = form

	const updateMutation = useMutation({
		mutationFn: (data) => updateProduct(dataProduct.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["seller-products"] })
			toast.success("Produk berhasil diperbarui!")
			router.push("/seller-dashboard/products")
		},
		onError: (error) => {
			toast.error(error?.message ?? "Gagal memperbarui produk.")
			setIsPending(false)
		},
	})

	async function onSubmit(data) {
		setIsPending(true)
		try {
			await updateMutation.mutateAsync(data)
		} catch {
			setIsPending(false)
		}
	}

	async function uploadImage(file) {
		const formData = new FormData()
		formData.append("file", file)
		try {
			const response = await fetch(`${uriUpload}/upload`, {
				method: "POST",
				headers: { "x-api-key": uploadApiKey ?? "" },
				body: formData,
			})
			if (!response.ok) throw new Error(`Error: ${response.statusText}`)
			const data = await response.json()
			return data?.file?.url ?? ""
		} catch {
			return ""
		}
	}

	// Watch values for sidebar summary
	const watchedCategory = form.watch("categoryId")
	const watchedPrice = form.watch("price")
	const watchedStock = form.watch("stock")
	const watchedWeight = form.watch("weightGram")
	const watchedStatus = form.watch("status")

	const selectedCategory = categories.find(c => String(c.id) === watchedCategory)

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="outline" size="icon" asChild>
					<Link href="/seller-dashboard/products">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Edit Produk</h1>
					<p className="text-muted-foreground">Ubah detail produk yang ingin Anda jual.</p>
				</div>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit, (errors) => {
					console.log("Validation errors:", JSON.stringify(errors, null, 2))
				})}>
					<div className="grid gap-6 lg:grid-cols-3">
						{/* Main Form */}
						<div className="lg:col-span-2 space-y-6">

							{/* Informasi Dasar */}
							<Card>
								<CardHeader><CardTitle>Informasi Dasar</CardTitle></CardHeader>
								<CardContent className="space-y-4">
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Nama Produk</FormLabel>
												<FormControl>
													<Input placeholder="Contoh: Sepatu Nike Air Max 270" {...field} disabled={isPending} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="description"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Deskripsi Produk</FormLabel>
												<FormControl>
													<Textarea
														placeholder="Jelaskan detail produk Anda..."
														className="min-h-[120px]"
														{...field}
														value={field.value || ""}
														disabled={isPending}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-3">
										<FormField
											control={form.control}
											name="categoryId"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Kategori</FormLabel>
													<Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
														<FormControl>
															<SelectTrigger className="w-full">
																<SelectValue placeholder="Pilih kategori" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{categories.map((c) => (
																<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="weightGram"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Berat (gram)</FormLabel>
													<FormControl>
														<Input type="number" placeholder="800" className="w-full" {...field} disabled={isPending} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="status"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Status Produk</FormLabel>
													<Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
														<FormControl>
															<SelectTrigger className="w-full">
																<SelectValue placeholder="Pilih status" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{statusProduct.map((c) => (
																<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</CardContent>
							</Card>

							{/* Harga & Stok */}
							<Card>
								<CardHeader><CardTitle>Harga & Stok</CardTitle></CardHeader>
								<CardContent>
									<div className="grid gap-4 sm:grid-cols-2">
										<FormField
											control={form.control}
											name="price"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Harga (Rp)</FormLabel>
													<FormControl>
														<Input type="number" placeholder="250000" {...field} disabled={isPending} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="stock"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Stok</FormLabel>
													<FormControl>
														<Input type="number" placeholder="100" {...field} disabled={isPending} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</CardContent>
							</Card>

							{/* Foto Produk */}
							<Card>
								<CardHeader><CardTitle>Foto Produk</CardTitle></CardHeader>
								<CardContent>
									<FormField
										control={form.control}
										name="images"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<div className="space-y-3">
														<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
															{/* Preview images */}
															{images.map((img, index) => (
																<div
																	key={index}
																	className="relative aspect-square rounded-lg border bg-muted/50 flex items-center justify-center group overflow-hidden"
																>
																	<img
																		src={img.previewUrl}
																		alt={`Preview ${index + 1}`}
																		className="w-full h-full object-cover rounded-lg"
																	/>
																	<button
																		type="button"
																		onClick={() => {
																			// Hapus entry dari images state dan sync ke field.value
																			const newImages = images.filter((_, i) => i !== index)
																			setImages(newImages)
																			field.onChange(newImages.map((img) => img.serverUrl))
																		}}
																		className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
																	>
																		<X className="h-3 w-3" />
																	</button>
																	{index === 0 && (
																		<span className="absolute bottom-1 left-1 text-[10px] font-medium bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
																			Utama
																		</span>
																	)}
																</div>
															))}

															{/* Loading state */}
															{isLoadingImage && (
																<div className="aspect-square rounded-lg border bg-muted/50 flex items-center justify-center">
																	<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
																</div>
															)}

															{/* Upload button */}
															{!isLoadingImage && (
																<label className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors cursor-pointer">
																	<Plus className="h-6 w-6" />
																	<span className="text-xs">Tambah</span>
																	<Input
																		type="file"
																		accept="image/png, image/jpeg, image/jpg"
																		className="hidden"
																		disabled={isPending}
																		onChange={async (e) => {
																			setIsLoadingImage(true)
																			const file = e.target.files?.[0]
																			if (file) {
																				const fileSizeMB = file.size / (1024 * 1024)
																				if (fileSizeMB > MAX_FILE_SIZE_MB) {
																					setFormError("images", {
																						type: "manual",
																						message: `Ukuran file tidak boleh lebih dari ${MAX_FILE_SIZE_MB} MB.`,
																					})
																				} else {
																					clearErrors("images")
																					const uploadedUrl = await uploadImage(file)
																					if (uploadedUrl) {
																						const newEntry = {
																							previewUrl: URL.createObjectURL(file), // hanya untuk preview lokal
																							serverUrl: uploadedUrl,               // URL asli untuk disimpan
																						}
																						const newImages = [...images, newEntry]
																						setImages(newImages)
																						field.onChange(newImages.map((img) => img.serverUrl))
																					}
																				}
																			}
																			setIsLoadingImage(false)
																		}}
																	/>
																</label>
															)}
														</div>
													</div>
												</FormControl>
												<FormDescription>
													Format: JPG, PNG. Maks {MAX_FILE_SIZE_MB || 1} MB per gambar. Foto pertama akan jadi foto utama.
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								</CardContent>
							</Card>
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							<Card>
								<CardHeader><CardTitle>Ringkasan</CardTitle></CardHeader>
								<CardContent className="space-y-3 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">Status</span>
										<span className="font-medium text-amber-600">{watchedStatus}</span>
									</div>
									<Separator />
									<div className="flex justify-between">
										<span className="text-muted-foreground">Kategori</span>
										<span className="font-medium">{selectedCategory?.name ?? "-"}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Harga</span>
										<span className="font-medium">
											{watchedPrice ? `Rp ${Number(watchedPrice).toLocaleString("id-ID")}` : "-"}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Stok</span>
										<span className="font-medium">{watchedStock || "-"}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Berat</span>
										<span className="font-medium">{watchedWeight ? `${watchedWeight} gram` : "-"}</span>
									</div>
									<Separator />
									<Button type="submit" className="w-full" disabled={isPending}>
										{isPending ? (
											<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>
										) : (
											<><Save className="mr-2 h-4 w-4" />Simpan Produk</>
										)}
									</Button>
									<Button variant="outline" className="w-full" type="button" disabled={isPending}>
										Simpan sebagai Draft
									</Button>
								</CardContent>
							</Card>

							<Card className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
								<CardContent className="pt-6">
									<p className="text-sm text-blue-800 dark:text-blue-300">
										💡 <strong>Tips:</strong> Produk dengan foto yang jelas dan deskripsi lengkap memiliki peluang terjual 3x lebih tinggi!
									</p>
								</CardContent>
							</Card>
						</div>
					</div>
				</form>
			</Form>
		</div>
	)
}