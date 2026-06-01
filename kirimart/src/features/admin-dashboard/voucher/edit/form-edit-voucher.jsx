"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
	Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ArrowLeft, Save, Loader2, CalendarIcon, Plus, X } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { createVoucherAdminSchema } from "@/lib/validations/admin-dashboard/voucher/voucher"
import { updateAdminVoucher } from "@/actions/admin-dashboard/voucher/voucher.actions"
import { discountTypes, statusVoucher } from "@/lib/const-data"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { env } from "@/config/env"

const uriUpload = env.NEXT_PUBLIC_UPLOAD_URI
const uploadApiKey = env.NEXT_PUBLIC_UPLOAD_API_KEY
const MAX_FILE_SIZE_MB = env.NEXT_PUBLIC_MAX_FILE_SIZE_MB

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function FormEditVoucher({ dataVoucher }) {
	const queryClient = useQueryClient()
	const router = useRouter()
	const [isPending, setIsPending] = useState(false)
	const [imagePreview, setImagePreview] = useState(dataVoucher?.imageUrl || null)
	const [isLoadingImage, setIsLoadingImage] = useState(false)

	const form = useForm({
		resolver: zodResolver(createVoucherAdminSchema),
		defaultValues: {
			name: dataVoucher.name || "",
			code: dataVoucher.code || "",
			discountType: dataVoucher.discountType || "fixed",
			discountValue: dataVoucher.discountValue || "",
			maxDiscount: dataVoucher.maxDiscount || "",
			minPurchase: dataVoucher.minPurchase || "0",
			quota: dataVoucher.quota || "100",
			startDate: dataVoucher.startDate ? new Date(dataVoucher.startDate) : undefined,
			endDate: dataVoucher.endDate ? new Date(dataVoucher.endDate) : undefined,
			status: dataVoucher.status || "active",
			imageUrl: dataVoucher.imageUrl || "",
		},
	})

	const { clearErrors, setError: setFormError } = form
	const watchedDiscountType = form.watch("discountType")

	const updateMutation = useMutation({
		mutationFn: (data) => updateAdminVoucher(dataVoucher.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] })
			toast.success("Voucher berhasil diperbarui!")
			router.push("/admin-dashboard/vouchers")
		},
		onError: (error) => {
			toast.error(error?.message ?? "Gagal memperbarui voucher.")
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

	// Watch for sidebar summary
	const watchedName = form.watch("name")
	const watchedCode = form.watch("code")
	const watchedDiscountValue = form.watch("discountValue")
	const watchedMinPurchase = form.watch("minPurchase")
	const watchedQuota = form.watch("quota")
	const watchedStatus = form.watch("status")
	const watchedStartDate = form.watch("startDate")
	const watchedEndDate = form.watch("endDate")

	const selectedDiscountType = discountTypes.find(d => d.value === watchedDiscountType)
	const selectedStatus = statusVoucher.find(s => s.value === watchedStatus)

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="outline" size="icon" asChild>
					<Link href="/admin-dashboard/vouchers">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Edit Voucher</h1>
					<p className="text-muted-foreground">Ubah detail voucher Anda.</p>
				</div>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit, (errors) => {
					console.log("Validation errors:", JSON.stringify(errors, null, 2))
				})}>
					<div className="grid gap-6 lg:grid-cols-3">
						{/* Main Form */}
						<div className="lg:col-span-2 space-y-6">

							{/* Informasi Voucher */}
							<Card>
								<CardHeader><CardTitle>Informasi Voucher</CardTitle></CardHeader>
								<CardContent className="space-y-4">
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Nama Voucher</FormLabel>
												<FormControl>
													<Input placeholder="Contoh: Diskon Akhir Pekan" {...field} disabled={isPending} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<FormField
											control={form.control}
											name="code"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Kode Voucher</FormLabel>
													<FormControl>
														<Input
															placeholder="Contoh: DISKON10K"
															{...field}
															onChange={(e) => field.onChange(e.target.value.toUpperCase())}
															disabled={isPending}
														/>
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
													<FormLabel>Status</FormLabel>
													<Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
														<FormControl>
															<SelectTrigger className="w-full">
																<SelectValue placeholder="Pilih status" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{statusVoucher.map((s) => (
																<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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

							{/* Diskon */}
							<Card>
								<CardHeader><CardTitle>Detail Diskon</CardTitle></CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<FormField
											control={form.control}
											name="discountType"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Tipe Diskon</FormLabel>
													<Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
														<FormControl>
															<SelectTrigger className="w-full">
																<SelectValue placeholder="Pilih tipe" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{discountTypes.map((d) => (
																<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="discountValue"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														{watchedDiscountType === "percentage" ? "Nilai Diskon (%)" : watchedDiscountType === "free_shipping" ? "Maks Potongan Ongkir (Rp)" : "Nilai Diskon (Rp)"}
													</FormLabel>
													<FormControl>
														<Input type="number" placeholder={watchedDiscountType === "percentage" ? "15" : "10000"} {...field} disabled={isPending} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									{watchedDiscountType === "percentage" && (
										<FormField
											control={form.control}
											name="maxDiscount"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Maksimal Potongan (Rp)</FormLabel>
													<FormControl>
														<Input type="number" placeholder="50000" {...field} value={field.value || ""} disabled={isPending} />
													</FormControl>
													<FormDescription>Batas atas potongan untuk tipe persentase.</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
									)}

									<FormField
										control={form.control}
										name="minPurchase"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Minimum Belanja (Rp)</FormLabel>
												<FormControl>
													<Input type="number" placeholder="100000" {...field} disabled={isPending} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</CardContent>
							</Card>

							{/* Kuota & Periode */}
							<Card>
								<CardHeader><CardTitle>Kuota & Periode</CardTitle></CardHeader>
								<CardContent className="space-y-4">
									<FormField
										control={form.control}
										name="quota"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Kuota Penggunaan</FormLabel>
												<FormControl>
													<Input type="number" placeholder="100" {...field} disabled={isPending} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<FormField
											control={form.control}
											name="startDate"
											render={({ field }) => (
												<FormItem className="flex flex-col">
													<FormLabel>Tanggal Mulai</FormLabel>
													<Popover>
														<PopoverTrigger asChild>
															<FormControl>
																<Button
																	variant="outline"
																	className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
																	disabled={isPending}
																>
																	{field.value ? format(field.value, "dd MMMM yyyy", { locale: localeId }) : "Pilih tanggal"}
																	<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
																</Button>
															</FormControl>
														</PopoverTrigger>
														<PopoverContent className="w-auto p-0" align="start">
															<Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
														</PopoverContent>
													</Popover>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="endDate"
											render={({ field }) => (
												<FormItem className="flex flex-col">
													<FormLabel>Tanggal Berakhir</FormLabel>
													<Popover>
														<PopoverTrigger asChild>
															<FormControl>
																<Button
																	variant="outline"
																	className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
																	disabled={isPending}
																>
																	{field.value ? format(field.value, "dd MMMM yyyy", { locale: localeId }) : "Pilih tanggal"}
																	<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
																</Button>
															</FormControl>
														</PopoverTrigger>
														<PopoverContent className="w-auto p-0" align="start">
															<Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
														</PopoverContent>
													</Popover>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</CardContent>
							</Card>

							{/* Gambar Voucher */}
							<Card>
								<CardHeader><CardTitle>Banner Voucher (Opsional)</CardTitle></CardHeader>
								<CardContent>
									<FormField
										control={form.control}
										name="imageUrl"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<div className="space-y-3">
														<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
															{imagePreview && (
																<div className="relative aspect-video rounded-lg border bg-muted/50 flex items-center justify-center group overflow-hidden col-span-2">
																	<Image src={imagePreview} alt="Preview banner" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover rounded-lg" unoptimized />
																	<button
																		type="button"
																		onClick={() => {
																			setImagePreview(null)
																			field.onChange("")
																		}}
																		className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
																	>
																		<X className="h-3 w-3" />
																	</button>
																</div>
															)}

															{isLoadingImage && (
																<div className="aspect-video rounded-lg border bg-muted/50 flex items-center justify-center col-span-2">
																	<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
																</div>
															)}

															{!isLoadingImage && !imagePreview && (
																<label className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors cursor-pointer col-span-2">
																	<Plus className="h-6 w-6" />
																	<span className="text-xs">Tambah Banner</span>
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
																					setFormError("imageUrl", {
																						type: "manual",
																						message: `Ukuran file tidak boleh lebih dari ${MAX_FILE_SIZE_MB} MB.`,
																					})
																				} else {
																					clearErrors("imageUrl")
																					const uploadedUrl = await uploadImage(file)
																					if (uploadedUrl) {
																						field.onChange(uploadedUrl)
																						setImagePreview(URL.createObjectURL(file))
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
												<FormDescription>Format: JPG, PNG. Maks {MAX_FILE_SIZE_MB || 1} MB.</FormDescription>
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
										<span className="text-muted-foreground">Nama</span>
										<span className="font-medium truncate max-w-[150px]">{watchedName || "-"}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Kode</span>
										<code className="font-semibold">{watchedCode || "-"}</code>
									</div>
									<Separator />
									<div className="flex justify-between">
										<span className="text-muted-foreground">Tipe</span>
										<span className="font-medium">{selectedDiscountType?.label ?? "-"}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Potongan</span>
										<span className="font-medium">
											{watchedDiscountType === "percentage" ? `${watchedDiscountValue || 0}%` : watchedDiscountType === "free_shipping" ? "Gratis Ongkir" : watchedDiscountValue ? fmt(watchedDiscountValue) : "-"}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Min. Belanja</span>
										<span className="font-medium">{watchedMinPurchase ? fmt(watchedMinPurchase) : "-"}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Kuota</span>
										<span className="font-medium">{watchedQuota || "-"}</span>
									</div>
									<Separator />
									<div className="flex justify-between">
										<span className="text-muted-foreground">Status</span>
										<span className="font-medium text-amber-600">{selectedStatus?.label ?? "-"}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Mulai</span>
										<span className="font-medium text-xs">{watchedStartDate ? format(watchedStartDate, "dd MMM yyyy", { locale: localeId }) : "-"}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Berakhir</span>
										<span className="font-medium text-xs">{watchedEndDate ? format(watchedEndDate, "dd MMM yyyy", { locale: localeId }) : "-"}</span>
									</div>
									<Separator />
									<Button type="submit" className="w-full" disabled={isPending}>
										{isPending ? (
											<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>
										) : (
											<><Save className="mr-2 h-4 w-4" />Simpan Perubahan</>
										)}
									</Button>
								</CardContent>
							</Card>
						</div>
					</div>
				</form>
			</Form>
		</div>
	)
}
