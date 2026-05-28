// components/seller-dashboard/product/FormCreateProduct.jsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
	Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
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
import { createProduct } from "@/actions/seller-dashboard/product/product.actions"
import { statusProduct } from "@/lib/const-data"
import { generateCartesian, attrKey, uploadFile, OptionValuesInput } from "../shared/variant-helpers"

// ─── Main Form ────────────────────────────────────────────────────────────────
export function FormCreateProduct({ categories }) {
	const queryClient = useQueryClient()
	const router = useRouter()
	const [isPending, setIsPending] = useState(false)
	const [imagesPreviews, setImagesPreviews] = useState([])
	const [isLoadingImage, setIsLoadingImage] = useState(false)

	// Sumber kebenaran data per varian — TIDAK pernah di-reset oleh RHF
	const [variantData, setVariantData] = useState({})
	const [optionValueImages, setOptionValueImages] = useState({})
	const [allCombinations, setAllCombinations] = useState([])
	const [enabledKeys, setEnabledKeys] = useState(new Set())

	// Ref untuk akses variantData terbaru di dalam fungsi tanpa stale closure
	const variantDataRef = useRef(variantData)
	useEffect(() => { variantDataRef.current = variantData }, [variantData])

	const allCombinationsRef = useRef(allCombinations)
	useEffect(() => { allCombinationsRef.current = allCombinations }, [allCombinations])

	const enabledKeysRef = useRef(enabledKeys)
	useEffect(() => { enabledKeysRef.current = enabledKeys }, [enabledKeys])

	const form = useForm({
		resolver: zodResolver(createProductSchema),
		defaultValues: {
			name: "",
			description: "",
			categoryId: "",
			weightGram: "",
			status: "active",
			basePrice: "",
			originalPrice: "",
			baseStock: "",
			images: [],
			hasVariants: false,
			options: [],
			variants: [],
		},
	})

	const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
		control: form.control,
		name: "options",
	})

	// ── watch di level atas, bukan di dalam loop render ──────────────────────
	const hasVariants = form.watch("hasVariants")
	const watchedOptions = form.watch("options")

	// ── Regenerate combinations saat opsi berubah ────────────────────────────
	useEffect(() => {
		if (!hasVariants || !watchedOptions?.length) {
			setAllCombinations([])
			setEnabledKeys(new Set())
			form.setValue("variants", [])
			return
		}

		const validOptions = watchedOptions.filter(o => o.name?.trim() && o.values?.length > 0)
		if (!validOptions.length) {
			setAllCombinations([])
			form.setValue("variants", [])
			return
		}

		const combos = generateCartesian(validOptions)
		setAllCombinations(combos)

		setEnabledKeys(prev => {
			const validKeySet = new Set(combos.map(attrKey))
			const filtered = new Set([...prev].filter(k => validKeySet.has(k)))
			return filtered.size === 0 ? new Set(combos.map(attrKey)) : filtered
		})
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(watchedOptions), hasVariants])

	// ── Sinkronisasi form.variants dari enabledKeys + variantData ─────────────
	// Ini hanya untuk menjaga form.variants tetap valid untuk validasi Zod
	useEffect(() => {
		if (!hasVariants) return

		const basePrice = form.getValues("basePrice")
		const baseStock = form.getValues("baseStock")
		const currentVarData = variantDataRef.current

		const newVariants = allCombinations
			.filter(combo => enabledKeys.has(attrKey(combo)))
			.map(combo => {
				const key = attrKey(combo)
				const saved = currentVarData[key] || {}
				return {
					attributes: combo,
					price: saved.price !== undefined && saved.price !== "" ? saved.price : (basePrice ?? ""),
					originalPrice: saved.originalPrice !== undefined ? saved.originalPrice : "",
					stock: saved.stock !== undefined && saved.stock !== "" ? saved.stock : (baseStock ?? ""),
					sku: saved.sku ?? "",
					imageUrl: saved.imageUrl ?? "",
				}
			})

		form.setValue("variants", newVariants, { shouldValidate: false })
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabledKeys, allCombinations, hasVariants])

	// ── Update field di variantData (state) ──────────────────────────────────
	// TIDAK langsung update form.variants agar tidak trigger re-render masif
	const updateVariantField = useCallback((combo, fieldName, value) => {
		const key = attrKey(combo)
		setVariantData(prev => ({
			...prev,
			[key]: { ...prev[key], [fieldName]: value }
		}))
	}, [])

	// ── Getter nilai untuk tampilan di tabel ─────────────────────────────────
	const getVariantVal = useCallback((combo, fieldName) => {
		const key = attrKey(combo)
		const fromState = variantDataRef.current[key]?.[fieldName]
		if (fromState !== undefined) return fromState
		// Fallback ke basePrice/baseStock
		if (fieldName === "price") return form.getValues("basePrice") ?? ""
		if (fieldName === "stock") return form.getValues("baseStock") ?? ""
		return ""
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	// ── Toggle ────────────────────────────────────────────────────────────────
	const toggleCombo = useCallback((combo) => {
		const key = attrKey(combo)
		setEnabledKeys(prev => {
			const next = new Set(prev)
			if (next.has(key)) next.delete(key)
			else next.add(key)
			return next
		})
	}, [])

	const toggleAll = useCallback((checked) => {
		setEnabledKeys(checked ? new Set(allCombinationsRef.current.map(attrKey)) : new Set())
	}, [])

	// ── Submit — sinkronkan variantData ke form.variants SEBELUM validasi ─────
	const createMutation = useMutation({
		mutationFn: createProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["seller-products"] })
			toast.success("Produk berhasil ditambahkan!")
			router.push("/seller-dashboard/products")
		},
		onError: (error) => {
			toast.error(error?.message ?? "Gagal menambahkan produk.")
			setIsPending(false)
		},
	})

	async function onSubmit(data) {
		setIsPending(true)
		const cleaned = {
			...data,
			originalPrice: data.originalPrice ? Number(data.originalPrice) : null,
			variants: data.variants?.map(v => ({
				...v,
				price: Number(v.price),
				stock: Number(v.stock),
				originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
				sku: v.sku || null,
				imageUrl: v.imageUrl || null,
			})),
		}
		try {
			const result = await createMutation.mutateAsync(cleaned)
			if (!result?.success) {
				toast.error(result?.error ?? "Gagal menyimpan produk")
				setIsPending(false)
			}
		} catch {
			setIsPending(false)
		}
	}

	// ── handleSubmit custom: sinkron variantData dulu, baru submit ke RHF ─────
	function handleFormSubmit(e) {
		e.preventDefault()

		if (hasVariants && allCombinations.length > 0) {
			// Bangun array variants final dari variantData (source of truth)
			const basePrice = form.getValues("basePrice")
			const baseStock = form.getValues("baseStock")
			const currentVarData = variantDataRef.current
			const currentEnabledKeys = enabledKeysRef.current

			const finalVariants = allCombinations
				.filter(combo => currentEnabledKeys.has(attrKey(combo)))
				.map(combo => {
					const key = attrKey(combo)
					const saved = currentVarData[key] || {}
					return {
						attributes: combo,
						price: saved.price !== undefined && saved.price !== "" ? Number(saved.price) : (Number(basePrice) || 0),
						originalPrice: saved.originalPrice ? Number(saved.originalPrice) : null,
						stock: saved.stock !== undefined && saved.stock !== "" ? Number(saved.stock) : (Number(baseStock) || 0),
						sku: saved.sku || null,
						imageUrl: saved.imageUrl || null,
					}
				})

			// Set langsung ke form — ini sinkron di RHF
			form.setValue("variants", finalVariants, { shouldValidate: false })
		} else {
			// hasVariants false → kosongkan agar superRefine tidak reject
			form.setValue("options", [], { shouldValidate: false })
			form.setValue("variants", [], { shouldValidate: false })
		}

		// Panggil handleSubmit langsung — TANPA setTimeout
		// form.setValue sudah sinkron di RHF internal store
		form.handleSubmit(onSubmit)()
	}


	const allChecked = allCombinations.length > 0 && enabledKeys.size === allCombinations.length

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="outline" size="icon" asChild>
					<Link href="/seller-dashboard/products"><ArrowLeft className="h-4 w-4" /></Link>
				</Button>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Tambah Produk Baru</h1>
					<p className="text-muted-foreground">Isi detail produk dan varian yang ingin Anda jual.</p>
				</div>
			</div>

			<Form {...form}>
				{/* Gunakan handleFormSubmit, bukan form.handleSubmit langsung */}
				<form onSubmit={handleFormSubmit}>
					<div className="grid gap-6 lg:grid-cols-3">
						<div className="lg:col-span-2 space-y-6">

							{/* ── Informasi Dasar ──────────────────────────────────────── */}
							<Card>
								<CardHeader><CardTitle>Informasi Dasar</CardTitle></CardHeader>
								<CardContent className="space-y-4">
									<FormField control={form.control} name="name" render={({ field }) => (
										<FormItem>
											<FormLabel>Nama Produk</FormLabel>
											<FormControl>
												<Input placeholder="Contoh: Kaos Polo Premium" {...field} disabled={isPending} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)} />
									<FormField control={form.control} name="description" render={({ field }) => (
										<FormItem>
											<FormLabel>Deskripsi</FormLabel>
											<FormControl>
												<Textarea placeholder="Detail produk..." className="min-h-[100px]" {...field} disabled={isPending} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)} />
									<div className="grid grid-cols-2 gap-4">
										<FormField control={form.control} name="categoryId" render={({ field }) => (
											<FormItem>
												<FormLabel>Kategori</FormLabel>
												<Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
													<FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger></FormControl>
													<SelectContent>
														{categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)} />
										<FormField control={form.control} name="weightGram" render={({ field }) => (
											<FormItem>
												<FormLabel>Berat (gram)</FormLabel>
												<FormControl><Input type="number" {...field} disabled={isPending} /></FormControl>
												<FormMessage />
											</FormItem>
										)} />
									</div>
								</CardContent>
							</Card>

							{/* ── Harga & Stok ─────────────────────────────────────────── */}
							<Card>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle>Harga & Stok</CardTitle>
										<FormField control={form.control} name="hasVariants" render={({ field }) => (
											<FormItem className="flex flex-row items-center space-x-2 space-y-0">
												<FormControl>
													<Switch checked={field.value} onCheckedChange={field.onChange} />
												</FormControl>
												<FormLabel className="text-xs font-bold cursor-pointer">Gunakan Varian</FormLabel>
											</FormItem>
										)} />
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<FormField control={form.control} name="basePrice" render={({ field }) => (
											<FormItem>
												<FormLabel>{hasVariants ? "Harga Dasar (Rp)" : "Harga Jual (Rp)"}</FormLabel>
												<FormControl><Input type="number" placeholder="0" {...field} disabled={isPending} /></FormControl>
												<FormMessage />
											</FormItem>
										)} />
										<FormField control={form.control} name="originalPrice" render={({ field }) => (
											<FormItem>
												<div className="flex items-center gap-1.5">
													<FormLabel>{hasVariants ? "Harga Coret Dasar" : "Harga Coret (Rp)"}</FormLabel>
													<Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
														<Tag className="h-2.5 w-2.5" /> Opsional
													</Badge>
												</div>
												<FormControl>
													<Input
														type="number"
														placeholder="Kosongkan jika tidak ada diskon"
														{...field}
														value={field.value ?? ""}
														disabled={isPending}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)} />
									</div>
									<FormField control={form.control} name="baseStock" render={({ field }) => (
										<FormItem>
											<FormLabel>{hasVariants ? "Stok Dasar (default tiap varian baru)" : "Stok"}</FormLabel>
											<FormControl><Input type="number" placeholder="0" {...field} disabled={isPending} /></FormControl>
											<FormMessage />
										</FormItem>
									)} />
								</CardContent>
							</Card>

							{/* ── Pengaturan Varian ─────────────────────────────────────── */}
							{hasVariants && (
								<Card className="border-primary/20 shadow-md shadow-primary/5">
									<CardHeader className="bg-primary/5 rounded-t-xl">
										<div className="flex items-center gap-2">
											<Layers className="h-5 w-5 text-primary" />
											<CardTitle className="text-lg">Pengaturan Varian</CardTitle>
										</div>
									</CardHeader>
									<CardContent className="p-6 space-y-8">

										{/* STEP 1 */}
										<div className="space-y-4">
											<div className="flex items-start gap-3">
												<div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
												<div>
													<p className="font-semibold text-sm">Definisikan Opsi Varian</p>
													<p className="text-xs text-muted-foreground">
														Contoh: opsi <strong>Warna</strong> → nilai <em>Hitam, Merah, Biru</em> — atau opsi <strong>Ukuran</strong> → nilai <em>S, M, L, XL</em>
													</p>
												</div>
											</div>

											<div className="space-y-3 pl-9">
												{optionFields.map((field, index) => {
													// ── Ambil watch di luar loop via index, bukan di dalam ──
													const displayType = watchedOptions[index]?.displayType ?? "text"
													const currentValues = watchedOptions[index]?.values ?? []

													return (
														<div key={field.id} className="p-4 rounded-xl border bg-card relative space-y-4">
															<Button
																type="button"
																variant="ghost" size="icon"
																className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
																onClick={() => removeOption(index)}
															>
																<X className="h-4 w-4" />
															</Button>

															<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
																<FormField control={form.control} name={`options.${index}.name`} render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-xs font-semibold">Nama Opsi</FormLabel>
																		<FormControl>
																			<Input placeholder="Contoh: Warna, Ukuran, Bahan" {...field} />
																		</FormControl>
																		<FormMessage />
																	</FormItem>
																)} />
																<FormField control={form.control} name={`options.${index}.displayType`} render={({ field }) => (
																	<FormItem>
																		<FormLabel className="text-xs font-semibold">Tipe Tampilan</FormLabel>
																		<Select onValueChange={field.onChange} value={field.value}>
																			<FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
																			<SelectContent>
																				<SelectItem value="text">
																					<span className="flex items-center gap-2">
																						<span>🔤</span>
																						<span>Teks — cocok untuk Ukuran, Bahan</span>
																					</span>
																				</SelectItem>
																				<SelectItem value="image">
																					<span className="flex items-center gap-2">
																						<span>🎨</span>
																						<span>Gambar — cocok untuk Warna, Motif</span>
																					</span>
																				</SelectItem>
																			</SelectContent>
																		</Select>
																		<FormMessage />
																	</FormItem>
																)} />
															</div>

															<FormField control={form.control} name={`options.${index}.values`} render={({ field }) => (
																<FormItem>
																	<FormLabel className="text-xs font-semibold">
																		Nilai-nilai Opsi
																		{displayType === "image" && (
																			<span className="ml-1 font-normal text-muted-foreground">(tambahkan nama lalu upload gambar di tiap tag)</span>
																		)}
																	</FormLabel>
																	<FormControl>
																		<OptionValuesInput
																			value={field.value}
																			onChange={field.onChange}
																			displayType={displayType}
																			onUploadImage={async (valIdx, url) => {
																				setOptionValueImages(prev => ({
																					...prev,
																					[index]: { ...prev[index], [valIdx]: url }
																				}))
																				const optName = form.getValues(`options.${index}.name`)
																				const valName = field.value[valIdx]
																				if (optName && valName) {
																					allCombinationsRef.current.forEach(combo => {
																						if (combo[optName] === valName) {
																							updateVariantField(combo, "imageUrl", url)
																						}
																					})
																				}
																			}}
																		/>
																	</FormControl>
																	<FormMessage />
																</FormItem>
															)} />

															{/* Preview gambar untuk displayType=image */}
															{displayType === "image" && currentValues.length > 0 && (
																<div>
																	<p className="text-[11px] font-semibold text-muted-foreground mb-2">Preview gambar nilai:</p>
																	<div className="flex flex-wrap gap-3">
																		{currentValues.map((val, valIdx) => {
																			const imgUrl = optionValueImages[index]?.[valIdx]
																			return (
																				<div key={valIdx} className="flex flex-col items-center gap-1">
																					<label className="cursor-pointer group">
																						<div className={`w-14 h-14 rounded-lg border-2 overflow-hidden flex items-center justify-center transition-all
																							${imgUrl
																								? "border-primary/50 shadow-sm"
																								: "border-dashed border-muted-foreground/30 hover:border-primary/50 bg-muted/20 hover:bg-muted/40"
																							}`}>
																							{imgUrl
																								? <img src={imgUrl} className="w-full h-full object-cover" alt={val} />
																								: <ImageIcon className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
																							}
																						</div>
																						<input
																							type="file" accept="image/*" className="hidden"
																							onChange={async (e) => {
																								const file = e.target.files?.[0]
																								if (!file) return
																								const url = await uploadFile(file)
																								if (url) {
																									setOptionValueImages(prev => ({
																										...prev,
																										[index]: { ...prev[index], [valIdx]: url }
																									}))
																									const optName = form.getValues(`options.${index}.name`)
																									allCombinationsRef.current.forEach(combo => {
																										if (combo[optName] === val) {
																											updateVariantField(combo, "imageUrl", url)
																										}
																									})
																								}
																								e.target.value = ""
																							}}
																						/>
																					</label>
																					<span className="text-[10px] text-center text-muted-foreground max-w-[56px] truncate">{val}</span>
																				</div>
																			)
																		})}
																	</div>
																</div>
															)}
														</div>
													)
												})}

												<Button
													type="button" variant="outline" size="sm" className="w-full border-dashed"
													onClick={() => appendOption({ name: "", values: [], displayType: "text" })}
												>
													<Plus className="mr-2 h-4 w-4" /> Tambah Opsi Baru
												</Button>
											</div>
										</div>

										{/* STEP 2 */}
										{allCombinations.length > 0 && (
											<div className="space-y-4">
												<Separator />
												<div className="flex items-start gap-3">
													<div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
													<div>
														<p className="font-semibold text-sm">Atur Stok & Harga per Kombinasi</p>
														<p className="text-xs text-muted-foreground">
															<strong>Hilangkan centang</strong> pada kombinasi yang tidak tersedia → akan otomatis <span className="text-destructive font-semibold">disabled</span> di halaman produk.
														</p>
													</div>
												</div>

												<div className="pl-9 space-y-2">
													<div className="flex items-center justify-between px-1">
														<label className="flex items-center gap-2 text-xs cursor-pointer select-none">
															<Checkbox checked={allChecked} onCheckedChange={toggleAll} />
															<span className="font-medium">Pilih / Hapus Semua</span>
														</label>
														<Badge variant="outline" className="text-xs">
															{enabledKeys.size} / {allCombinations.length} tersedia
														</Badge>
													</div>

													<div className="rounded-xl border overflow-x-auto">
														<table className="w-full text-xs min-w-[600px]">
															<thead>
																<tr className="bg-muted/50 border-b">
																	<th className="p-3 text-center w-10 font-medium text-muted-foreground">✓</th>
																	<th className="p-3 text-left font-medium text-muted-foreground">Kombinasi</th>
																	<th className="p-3 text-left font-medium text-muted-foreground w-[120px]">Harga Jual (Rp)</th>
																	<th className="p-3 text-left font-medium text-muted-foreground w-[120px]">Harga Coret (Rp)</th>
																	<th className="p-3 text-left font-medium text-muted-foreground w-[90px]">Stok</th>
																	<th className="p-3 text-left font-medium text-muted-foreground w-[110px]">SKU</th>
																</tr>
															</thead>
															<tbody className="divide-y">
																{allCombinations.map((combo, cIdx) => {
																	const key = attrKey(combo)
																	const isEnabled = enabledKeys.has(key)
																	return (
																		<tr
																			key={cIdx}
																			className={`transition-opacity ${isEnabled ? "" : "opacity-35"}`}
																		>
																			<td className="p-3 text-center">
																				<Checkbox
																					checked={isEnabled}
																					onCheckedChange={() => toggleCombo(combo)}
																				/>
																			</td>
																			<td className="p-3">
																				<div className="flex gap-1 flex-wrap">
																					{Object.entries(combo).map(([optName, val]) => {
																						const optIdx = watchedOptions.findIndex(o => o.name === optName)
																						const valIdx = watchedOptions[optIdx]?.values?.indexOf(val) ?? -1
																						const imgUrl = optionValueImages[optIdx]?.[valIdx]
																						return (
																							<span key={optName} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
																								{imgUrl && <img src={imgUrl} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" alt="" />}
																								{val}
																							</span>
																						)
																					})}
																				</div>
																			</td>
																			<td className="p-2">
																				{isEnabled
																					? (
																						<Input
																							type="number"
																							className="h-8 text-xs"
																							placeholder="Harga"
																							defaultValue={variantData[key]?.price ?? form.getValues("basePrice") ?? ""}
																							onChange={e => updateVariantField(combo, "price", e.target.value)}
																						/>
																					)
																					: <span className="px-2 text-muted-foreground">—</span>
																				}
																			</td>
																			<td className="p-2">
																				{isEnabled
																					? (
																						<Input
																							type="number"
																							className="h-8 text-xs"
																							placeholder="Opsional"
																							defaultValue={variantData[key]?.originalPrice ?? ""}
																							onChange={e => updateVariantField(combo, "originalPrice", e.target.value)}
																						/>
																					)
																					: <span className="px-2 text-muted-foreground">—</span>
																				}
																			</td>
																			<td className="p-2">
																				{isEnabled
																					? (
																						<Input
																							type="number"
																							className="h-8 text-xs"
																							placeholder="0"
																							defaultValue={variantData[key]?.stock ?? form.getValues("baseStock") ?? ""}
																							onChange={e => updateVariantField(combo, "stock", e.target.value)}
																						/>
																					)
																					: <span className="px-2 text-muted-foreground">—</span>
																				}
																			</td>
																			<td className="p-2">
																				{isEnabled
																					? (
																						<Input
																							className="h-8 text-xs"
																							placeholder="SKU (opsional)"
																							defaultValue={variantData[key]?.sku ?? ""}
																							onChange={e => updateVariantField(combo, "sku", e.target.value)}
																						/>
																					)
																					: <span className="px-2 text-muted-foreground">—</span>
																				}
																			</td>
																		</tr>
																	)
																})}
															</tbody>
														</table>
													</div>
												</div>
											</div>
										)}
									</CardContent>
								</Card>
							)}

							{/* ── Foto Produk ───────────────────────────────────────────── */}
							<Card>
								<CardHeader><CardTitle>Foto Produk</CardTitle></CardHeader>
								<CardContent>
									<FormField control={form.control} name="images" render={({ field }) => (
										<FormItem>
											<FormControl>
												<div className="grid grid-cols-4 gap-4">
													{imagesPreviews.map((preview, idx) => (
														<div key={idx} className="relative aspect-square rounded-lg border overflow-hidden group">
															<img src={preview} className="w-full h-full object-cover" alt="" />
															<button
																type="button"
																className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
																onClick={() => {
																	setImagesPreviews(prev => prev.filter((_, i) => i !== idx))
																	field.onChange(field.value.filter((_, i) => i !== idx))
																}}
															>
																<X className="h-3 w-3" />
															</button>
															{idx === 0 && (
																<div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center text-[10px] py-0.5">
																	Utama
																</div>
															)}
														</div>
													))}
													{isLoadingImage ? (
														<div className="aspect-square border rounded-lg flex items-center justify-center">
															<Loader2 className="animate-spin" />
														</div>
													) : (
														<label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
															<Plus className="h-6 w-6 text-muted-foreground" />
															<span className="text-xs text-muted-foreground mt-1">Tambah Foto</span>
															<Input type="file" accept="image/*" className="hidden" onChange={async e => {
																const file = e.target.files?.[0]
																if (!file) return
																setIsLoadingImage(true)
																const url = await uploadFile(file)
																if (url) {
																	field.onChange([...(field.value || []), url])
																	setImagesPreviews(prev => [...prev, URL.createObjectURL(file)])
																}
																setIsLoadingImage(false)
																e.target.value = ""
															}} />
														</label>
													)}
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)} />
								</CardContent>
							</Card>
						</div>

						{/* ── Sidebar ───────────────────────────────────────────────── */}
						<div className="space-y-6">
							<Card>
								<CardHeader><CardTitle>Status & Simpan</CardTitle></CardHeader>
								<CardContent className="space-y-4">
									<FormField control={form.control} name="status" render={({ field }) => (
										<FormItem>
											<FormLabel>Status</FormLabel>
											<Select onValueChange={field.onChange} defaultValue={field.value}>
												<FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
												<SelectContent>
													{statusProduct.map(s => (
														<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
										</FormItem>
									)} />

									<Separator />

									{/* Error summary — tampilkan jika ada error validasi */}
									{Object.keys(form.formState.errors).length > 0 && (
										<div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1">
											<p className="text-xs font-semibold text-destructive">Ada field yang belum diisi:</p>
											{Object.entries(form.formState.errors).map(([key, err]) => (
												<p key={key} className="text-[11px] text-destructive">
													• {String(err?.message ?? key)}
												</p>
											))}
										</div>
									)}

									{hasVariants && allCombinations.length > 0 && (
										<div className="text-xs bg-muted/40 rounded-lg p-3 space-y-1.5 border">
											<p className="font-semibold text-sm">Ringkasan Varian</p>
											<div className="flex justify-between text-muted-foreground">
												<span>Total kombinasi</span>
												<span className="font-medium text-foreground">{allCombinations.length}</span>
											</div>
											<div className="flex justify-between text-muted-foreground">
												<span>Aktif (tersedia)</span>
												<span className="font-medium text-primary">{enabledKeys.size}</span>
											</div>
											<div className="flex justify-between text-muted-foreground">
												<span>Disabled di UI</span>
												<span className="font-medium text-destructive">{allCombinations.length - enabledKeys.size}</span>
											</div>
										</div>
									)}

									<Button type="submit" className="w-full" disabled={isPending}>
										{isPending
											? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
											: <Save className="mr-2 h-4 w-4" />
										}
										Simpan Produk
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