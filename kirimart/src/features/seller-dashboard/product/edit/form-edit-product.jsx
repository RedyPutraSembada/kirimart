"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
	Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save, Plus, X, Loader2, Layers, Tag, Image as ImageIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { env } from "@/config/env"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { createProductSchema } from "@/lib/validations/seller-dashboard/product/product"
import { updateProduct } from "@/actions/seller-dashboard/product/product.actions"
import { statusProduct } from "@/lib/const-data"
import { generateCartesian, attrKey, uploadFile, OptionValuesInput } from "../shared/variant-helpers"

const uriUpload = env.NEXT_PUBLIC_UPLOAD_URI
const uploadApiKey = env.NEXT_PUBLIC_UPLOAD_API_KEY
const MAX_FILE_SIZE_MB = env.NEXT_PUBLIC_MAX_FILE_SIZE_MB

export function FormEditProduct({ categories, dataProduct }) {
	const queryClient = useQueryClient()
	const router = useRouter()
	const [isPending, setIsPending] = useState(false)
	const [isLoadingImage, setIsLoadingImage] = useState(false)

	const [images, setImages] = useState(
		dataProduct?.images?.map((image) => ({
			previewUrl: image.imageUrl,
			serverUrl: image.imageUrl,
		})) || []
	)

	// ── Variant state ────────────────────────────────────────────────────────
	const initVariantData = () => {
		const map = {}
		;(dataProduct.variants || []).forEach(v => {
			map[attrKey(v.attributes)] = {
				price: v.price, originalPrice: v.originalPrice ?? "",
				stock: v.stock, sku: v.sku ?? "", imageUrl: v.imageUrl ?? "",
			}
		})
		return map
	}

	const [variantData, setVariantData] = useState(initVariantData)
	const [optionValueImages, setOptionValueImages] = useState({})
	const [allCombinations, setAllCombinations] = useState([])
	const [enabledKeys, setEnabledKeys] = useState(new Set())

	const variantDataRef = useRef(variantData)
	useEffect(() => { variantDataRef.current = variantData }, [variantData])
	const allCombinationsRef = useRef(allCombinations)
	useEffect(() => { allCombinationsRef.current = allCombinations }, [allCombinations])
	const enabledKeysRef = useRef(enabledKeys)
	useEffect(() => { enabledKeysRef.current = enabledKeys }, [enabledKeys])

	const form = useForm({
		resolver: zodResolver(createProductSchema),
		defaultValues: {
			name: dataProduct.name || "",
			description: dataProduct.description || "",
			categoryId: dataProduct.categoryId ? String(dataProduct.categoryId) : "",
			weightGram: dataProduct.weightGram || "",
			status: dataProduct.status || "",
			basePrice: dataProduct.basePrice || "",
			originalPrice: dataProduct.originalPrice || "",
			baseStock: dataProduct.baseStock || "",
			images: dataProduct?.images?.map((image) => image.imageUrl) || [],
			hasVariants: (dataProduct.options?.length > 0) || false,
			options: (dataProduct.options || []).map(o => ({
				name: o.name, values: o.values || [], displayType: o.displayType || "text",
			})),
			variants: dataProduct.variants || [],
		},
	})

	const { clearErrors, setError: setFormError } = form
	const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
		control: form.control, name: "options",
	})

	const hasVariants = form.watch("hasVariants")
	const watchedOptions = form.watch("options")

	// ── Regenerate combinations ──────────────────────────────────────────────
	useEffect(() => {
		if (!hasVariants || !watchedOptions?.length) {
			setAllCombinations([]); setEnabledKeys(new Set()); form.setValue("variants", []); return
		}
		const validOpts = watchedOptions.filter(o => o.name?.trim() && o.values?.length > 0)
		if (!validOpts.length) { setAllCombinations([]); form.setValue("variants", []); return }
		const combos = generateCartesian(validOpts)
		setAllCombinations(combos)
		setEnabledKeys(prev => {
			const validSet = new Set(combos.map(attrKey))
			const filtered = new Set([...prev].filter(k => validSet.has(k)))
			return filtered.size === 0 ? new Set(combos.map(attrKey)) : filtered
		})
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(watchedOptions), hasVariants])

	// ── Sync form.variants ───────────────────────────────────────────────────
	useEffect(() => {
		if (!hasVariants) return
		const bp = form.getValues("basePrice"), bs = form.getValues("baseStock")
		const vd = variantDataRef.current
		const nv = allCombinations.filter(c => enabledKeys.has(attrKey(c))).map(c => {
			const k = attrKey(c), s = vd[k] || {}
			return {
				attributes: c,
				price: s.price !== undefined && s.price !== "" ? s.price : (bp ?? ""),
				originalPrice: s.originalPrice !== undefined ? s.originalPrice : "",
				stock: s.stock !== undefined && s.stock !== "" ? s.stock : (bs ?? ""),
				sku: s.sku ?? "", imageUrl: s.imageUrl ?? "",
			}
		})
		form.setValue("variants", nv, { shouldValidate: false })
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabledKeys, allCombinations, hasVariants])

	const updateVariantField = useCallback((combo, fieldName, value) => {
		setVariantData(prev => ({ ...prev, [attrKey(combo)]: { ...prev[attrKey(combo)], [fieldName]: value } }))
	}, [])

	const toggleCombo = useCallback((combo) => {
		const k = attrKey(combo)
		setEnabledKeys(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
	}, [])

	const toggleAll = useCallback((checked) => {
		setEnabledKeys(checked ? new Set(allCombinationsRef.current.map(attrKey)) : new Set())
	}, [])

	// ── Mutations ────────────────────────────────────────────────────────────
	const updateMutation = useMutation({
		mutationFn: (data) => updateProduct(dataProduct.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["seller-products"] })
			toast.success("Produk berhasil diperbarui!")
			router.push("/seller-dashboard/products")
		},
		onError: (error) => { toast.error(error?.message ?? "Gagal memperbarui produk."); setIsPending(false) },
	})

	async function onSubmit(data) {
		setIsPending(true)
		const cleaned = {
			...data,
			originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
			variants: data.variants?.map(v => ({
				...v, price: Number(v.price), stock: Number(v.stock),
				originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
				sku: v.sku || null, imageUrl: v.imageUrl || null,
			})),
		}
		try {
			const result = await updateMutation.mutateAsync(cleaned)
			if (!result?.success) { toast.error(result?.error ?? "Gagal menyimpan"); setIsPending(false) }
		} catch { setIsPending(false) }
	}

	function handleFormSubmit(e) {
		e.preventDefault()
		if (hasVariants && allCombinations.length > 0) {
			const bp = form.getValues("basePrice"), bs = form.getValues("baseStock")
			const vd = variantDataRef.current, ek = enabledKeysRef.current
			const fv = allCombinations.filter(c => ek.has(attrKey(c))).map(c => {
				const k = attrKey(c), s = vd[k] || {}
				return {
					attributes: c,
					price: s.price !== undefined && s.price !== "" ? Number(s.price) : (Number(bp) || 0),
					originalPrice: s.originalPrice ? Number(s.originalPrice) : null,
					stock: s.stock !== undefined && s.stock !== "" ? Number(s.stock) : (Number(bs) || 0),
					sku: s.sku || null, imageUrl: s.imageUrl || null,
				}
			})
			form.setValue("variants", fv, { shouldValidate: false })
		} else {
			form.setValue("options", [], { shouldValidate: false })
			form.setValue("variants", [], { shouldValidate: false })
		}
		form.handleSubmit(onSubmit)()
	}

	async function uploadImage(file) {
		const formData = new FormData()
		formData.append("file", file)
		try {
			const r = await fetch(`${uriUpload}/upload`, { method: "POST", headers: { "x-api-key": uploadApiKey ?? "" }, body: formData })
			if (!r.ok) throw new Error(r.statusText)
			const d = await r.json()
			return d?.file?.url ?? ""
		} catch { return "" }
	}

	const watchedCategory = form.watch("categoryId")
	const watchedPrice = form.watch("basePrice")
	const watchedStock = form.watch("baseStock")
	const watchedWeight = form.watch("weightGram")
	const watchedStatus = form.watch("status")
	const selectedCategory = categories.find(c => String(c.id) === watchedCategory)
	const allChecked = allCombinations.length > 0 && enabledKeys.size === allCombinations.length

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
				<form onSubmit={handleFormSubmit}>
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
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle>Harga & Stok</CardTitle>
										<FormField control={form.control} name="hasVariants" render={({ field }) => (
											<FormItem className="flex flex-row items-center space-x-2 space-y-0">
												<FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
												<FormLabel className="text-xs font-bold cursor-pointer">Gunakan Varian</FormLabel>
											</FormItem>
										)} />
									</div>
								</CardHeader>
								<CardContent>
									<div className="grid gap-4 sm:grid-cols-2">
										<FormField
											control={form.control}
											name="basePrice"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{hasVariants ? "Harga Dasar (Rp)" : "Harga Jual (Rp)"}</FormLabel>
													<FormControl>
														<Input type="number" placeholder="250000" {...field} disabled={isPending} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="originalPrice"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Harga Coret (Rp) — Opsional</FormLabel>
													<FormControl>
														<Input type="number" placeholder="Kosongkan jika tidak ada diskon" {...field} value={field.value ?? ""} disabled={isPending} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="baseStock"
											render={({ field }) => (
												<FormItem>
													<FormLabel>{hasVariants ? "Stok Dasar" : "Stok"}</FormLabel>
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

							{/* ── Pengaturan Varian ── */}
							{hasVariants && (
								<Card className="border-primary/20 shadow-md shadow-primary/5">
									<CardHeader className="bg-primary/5 rounded-t-xl">
										<div className="flex items-center gap-2">
											<Layers className="h-5 w-5 text-primary" />
											<CardTitle className="text-lg">Pengaturan Varian</CardTitle>
										</div>
									</CardHeader>
									<CardContent className="p-6 space-y-8">
										<div className="space-y-4">
											<div className="flex items-start gap-3">
												<div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
												<div>
													<p className="font-semibold text-sm">Definisikan Opsi Varian</p>
													<p className="text-xs text-muted-foreground">Contoh: opsi Warna, Ukuran</p>
												</div>
											</div>
											<div className="space-y-3 pl-9">
												{optionFields.map((field, index) => {
													const displayType = watchedOptions[index]?.displayType ?? "text"
													return (
														<div key={field.id} className="p-4 rounded-xl border bg-card relative space-y-4">
															<Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeOption(index)}><X className="h-4 w-4" /></Button>
															<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
																<FormField control={form.control} name={`options.${index}.name`} render={({ field }) => (
																	<FormItem><FormLabel className="text-xs font-semibold">Nama Opsi</FormLabel><FormControl><Input placeholder="Contoh: Warna" {...field} /></FormControl><FormMessage /></FormItem>
																)} />
																<FormField control={form.control} name={`options.${index}.displayType`} render={({ field }) => (
																	<FormItem><FormLabel className="text-xs font-semibold">Tipe Tampilan</FormLabel>
																		<Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="text">Teks</SelectItem><SelectItem value="image">Gambar</SelectItem></SelectContent></Select><FormMessage />
																	</FormItem>
																)} />
															</div>
															<FormField control={form.control} name={`options.${index}.values`} render={({ field }) => (
																<FormItem><FormLabel className="text-xs font-semibold">Nilai Opsi</FormLabel><FormControl>
																	<OptionValuesInput value={field.value} onChange={field.onChange} displayType={displayType} onUploadImage={async (valIdx, url) => {
																		setOptionValueImages(prev => ({ ...prev, [index]: { ...prev[index], [valIdx]: url } }))
																		const optName = form.getValues(`options.${index}.name`), valName = field.value[valIdx]
																		if (optName && valName) allCombinationsRef.current.forEach(c => { if (c[optName] === valName) updateVariantField(c, "imageUrl", url) })
																	}} />
																</FormControl><FormMessage /></FormItem>
															)} />
														</div>
													)
												})}
												<Button type="button" variant="outline" size="sm" className="w-full border-dashed" onClick={() => appendOption({ name: "", values: [], displayType: "text" })}><Plus className="mr-2 h-4 w-4" /> Tambah Opsi</Button>
											</div>
										</div>
										{allCombinations.length > 0 && (
											<div className="space-y-4">
												<Separator />
												<div className="flex items-start gap-3">
													<div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
													<p className="font-semibold text-sm">Atur Stok dan Harga per Kombinasi</p>
												</div>
												<div className="pl-9 space-y-2">
													<div className="flex items-center justify-between px-1">
														<label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={allChecked} onCheckedChange={toggleAll} /><span className="font-medium">Pilih Semua</span></label>
														<Badge variant="outline" className="text-xs">{enabledKeys.size}/{allCombinations.length}</Badge>
													</div>
													<div className="rounded-xl border overflow-x-auto">
														<table className="w-full text-xs min-w-[600px]">
															<thead><tr className="bg-muted/50 border-b">
																<th className="p-3 text-center w-10">&#10003;</th>
																<th className="p-3 text-left">Kombinasi</th>
																<th className="p-3 text-left w-[120px]">Harga</th>
																<th className="p-3 text-left w-[120px]">Harga Coret</th>
																<th className="p-3 text-left w-[90px]">Stok</th>
																<th className="p-3 text-left w-[110px]">SKU</th>
															</tr></thead>
															<tbody className="divide-y">{allCombinations.map((combo, i) => {
																const key = attrKey(combo), on = enabledKeys.has(key)
																return (<tr key={i} className={on ? "" : "opacity-35"}>
																	<td className="p-3 text-center"><Checkbox checked={on} onCheckedChange={() => toggleCombo(combo)} /></td>
																	<td className="p-3"><div className="flex gap-1 flex-wrap">{Object.values(combo).map(v => <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>)}</div></td>
																	<td className="p-2">{on ? <Input type="number" className="h-8 text-xs" defaultValue={variantData[key]?.price ?? form.getValues("basePrice") ?? ""} onChange={e => updateVariantField(combo, "price", e.target.value)} /> : "-"}</td>
																	<td className="p-2">{on ? <Input type="number" className="h-8 text-xs" placeholder="Opsional" defaultValue={variantData[key]?.originalPrice ?? ""} onChange={e => updateVariantField(combo, "originalPrice", e.target.value)} /> : "-"}</td>
																	<td className="p-2">{on ? <Input type="number" className="h-8 text-xs" defaultValue={variantData[key]?.stock ?? form.getValues("baseStock") ?? ""} onChange={e => updateVariantField(combo, "stock", e.target.value)} /> : "-"}</td>
																	<td className="p-2">{on ? <Input className="h-8 text-xs" placeholder="SKU" defaultValue={variantData[key]?.sku ?? ""} onChange={e => updateVariantField(combo, "sku", e.target.value)} /> : "-"}</td>
																</tr>)
															})}</tbody>
														</table>
													</div>
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							)}

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