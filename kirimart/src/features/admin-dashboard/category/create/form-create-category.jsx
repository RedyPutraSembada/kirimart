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
import { ArrowLeft, Save, Loader2, Plus, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { categorySchema } from "@/lib/validations/admin-dashboard/category/category"
import { createCategory } from "@/actions/admin-dashboard/category/category.actions"
import { useGetAllCategoriesForDropdown } from "@/app/data/admin-dashboard/category/category-data"
import { Checkbox } from "@/components/ui/checkbox"
import { uploadFile } from "@/lib/upload"


export function FormCreateCategory() {
	const queryClient = useQueryClient()
	const router = useRouter()
	const [isPending, setIsPending] = useState(false)
	const [imagePreview, setImagePreview] = useState(null)
	const [isLoadingImage, setIsLoadingImage] = useState(false)

	const { data: categoriesDropdown } = useGetAllCategoriesForDropdown()

	const form = useForm({
		resolver: zodResolver(categorySchema),
		defaultValues: {
			parentId: null,
			name: "",
			slug: "",
			iconUrl: "",
			description: "",
			isActive: true,
		},
	})

	const { clearErrors, setError: setFormError } = form

	const createMutation = useMutation({
		mutationFn: createCategory,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-categories"] })
			toast.success("Kategori berhasil dibuat!")
			router.push("/admin-dashboard/categories")
		},
		onError: (error) => {
			toast.error(error?.message ?? "Gagal membuat kategori.")
			setIsPending(false)
		},
	})

	async function onSubmit(data) {
		setIsPending(true)
		try {
			await createMutation.mutateAsync(data)
		} catch {
			setIsPending(false)
		}
	}

	return (
		<div className="space-y-6 max-w-3xl mx-auto">
			<div className="flex items-center gap-4">
				<Button variant="outline" size="icon" asChild>
					<Link href="/admin-dashboard/categories">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Tambah Kategori</h1>
					<p className="text-muted-foreground">Buat master data kategori baru.</p>
				</div>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<Card>
						<CardHeader><CardTitle>Detail Kategori</CardTitle></CardHeader>
						<CardContent className="space-y-4">
							<FormField
								control={form.control}
								name="parentId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Kategori Induk (Opsional)</FormLabel>
										<Select
											onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
											defaultValue={field.value ? field.value.toString() : "none"}
											disabled={isPending}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Pilih kategori induk jika ada" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="none">Tidak ada (Sebagai Kategori Utama)</SelectItem>
												{categoriesDropdown?.data?.map((c) => (
													<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormDescription>Pilih kategori induk jika ini adalah subkategori.</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Nama Kategori</FormLabel>
										<FormControl>
											<Input
												placeholder="Contoh: Pakaian Pria"
												{...field}
												onChange={(e) => {
													field.onChange(e)
													// Auto-generate slug
													const slug = e.target.value
														.toLowerCase()
														.replace(/[^a-z0-9]+/g, "-")
														.replace(/(^-|-$)+/g, "")
													form.setValue("slug", slug)
												}}
												disabled={isPending}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="slug"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Slug Kategori</FormLabel>
										<FormControl>
											<Input placeholder="contoh-pakaian-pria" {...field} disabled={isPending} />
										</FormControl>
										<FormDescription>URL ramah (contoh: /kategori/pakaian-pria).</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Deskripsi (Opsional)</FormLabel>
										<FormControl>
											<Input placeholder="Penjelasan singkat tentang kategori" {...field} value={field.value || ""} disabled={isPending} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="isActive"
								render={({ field }) => (
									<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={isPending}
											/>
										</FormControl>
										<div className="space-y-1 leading-none">
											<FormLabel>Kategori Aktif</FormLabel>
											<FormDescription>
												Kategori yang tidak aktif tidak akan muncul di halaman pembeli atau pilihan penjual.
											</FormDescription>
										</div>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="iconUrl"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Ikon Kategori (Opsional)</FormLabel>
										<FormControl>
											<div className="flex items-center gap-4">
												{imagePreview ? (
													<div className="relative h-16 w-16 rounded-md border overflow-hidden">
														<Image src={imagePreview} alt="Preview icon" fill sizes="64px" className="object-cover" unoptimized />
														<button
															type="button"
															onClick={() => {
																setImagePreview(null)
																field.onChange("")
															}}
															className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
														>
															<X className="h-3 w-3" />
														</button>
													</div>
												) : (
													<label className="h-16 w-16 rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground hover:border-primary/50 cursor-pointer">
														{isLoadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-6 w-6" />}
														<Input
															type="file"
															accept="image/*"
															className="hidden"
															disabled={isPending || isLoadingImage}
															onChange={async (e) => {
																setIsLoadingImage(true)
																const file = e.target.files?.[0]
																if (file) {
																	clearErrors("iconUrl")
																	const url = await uploadFile(file)
																	if (url) {
																		field.onChange(url)
																		setImagePreview(URL.createObjectURL(file))
																	}
																}
																setIsLoadingImage(false)
															}}
														/>
													</label>
												)}
											</div>
										</FormControl>
										<FormDescription>Format kotak (square), maksimal 1MB.</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

						</CardContent>
					</Card>
					
					<div className="mt-6 flex justify-end">
						<Button type="submit" disabled={isPending}>
							{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Simpan Kategori
						</Button>
					</div>
				</form>
			</Form>
		</div>
	)
}
