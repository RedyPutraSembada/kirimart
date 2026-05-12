"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
	Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form"
import { Save, Loader2, Camera, User as UserIcon } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { updateProfileSchema } from "@/lib/validations/user-dashboard/profile"
import { env } from "@/config/env"
import { toast } from "sonner"
import { updateProfileAction } from "@/actions/user-dashboard/profile.actions"
import { useMutation, useQueryClient } from "@tanstack/react-query"

const uriUpload = env.NEXT_PUBLIC_UPLOAD_URI
const uploadApiKey = env.NEXT_PUBLIC_UPLOAD_API_KEY
const MAX_FILE_SIZE_MB = env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || 2

export function UserProfile() {
	const queryClient = useQueryClient()
	const { data: session, isPending: isSessionLoading } = authClient.useSession()
	const user = session?.user
	const [isLoadingImage, setIsLoadingImage] = useState(false)
	
	const updateMutation = useMutation({
		mutationFn: updateProfileAction,
		onSuccess: (res) => {
			if (res.success) {
				// Invalidate session to refresh user data
				queryClient.invalidateQueries({ queryKey: ["better-auth", "session"] })
				toast.success("Profil berhasil diperbarui!")
			} else {
				toast.error(res.error || "Gagal memperbarui profil.")
			}
		},
		onError: () => {
			toast.error("Terjadi kesalahan sistem.")
		}
	})

	const form = useForm({
		resolver: zodResolver(updateProfileSchema),
		defaultValues: {
			name: "",
			image: "",
			phoneNumber: "",
		},
	})

	// Set form values when session data is available
	useEffect(() => {
		if (user) {
			form.reset({
				name: user.name || "",
				image: user.image || "",
				phoneNumber: user.phoneNumber || "",
			})
		}
	}, [user, form])

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
		} catch (error) {
			console.error("Upload error:", error)
			return ""
		}
	}

	const onSubmit = async (values) => {
		await updateMutation.mutateAsync(values)
	}

	if (isSessionLoading) {
		return <div className="flex items-center justify-center py-10">Memuat data profil...</div>
	}

	if (!user) {
		return <div className="text-center py-10">Gagal memuat data profil. Silakan login kembali.</div>
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Profil Saya</h1>
				<p className="text-muted-foreground">Kelola informasi pribadi dan keamanan akun Anda.</p>
			</div>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Informasi Dasar</CardTitle>
							<CardDescription>Perbarui foto profil dan detail pribadi Anda di sini.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{/* Profile Image Upload */}
							<FormField
								control={form.control}
								name="image"
								render={({ field }) => (
									<FormItem className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
										<div className="relative group">
											<Avatar className="h-24 w-24 border-2 border-muted shadow-sm">
												<AvatarImage src={field.value || ""} alt={user.name} />
												<AvatarFallback className="text-2xl font-medium bg-primary/10 text-primary">
													{user.name?.charAt(0) || "U"}
												</AvatarFallback>
											</Avatar>
											{isLoadingImage && (
												<div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
													<Loader2 className="h-6 w-6 animate-spin text-white" />
												</div>
											)}
											<label 
												className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors"
												htmlFor="profile-upload"
											>
												<Camera className="h-4 w-4" />
												<input 
													id="profile-upload"
													type="file" 
													className="hidden" 
													accept="image/*"
													onChange={async (e) => {
														const file = e.target.files?.[0]
														if (file) {
															const fileSizeMB = file.size / (1024 * 1024)
															if (fileSizeMB > MAX_FILE_SIZE_MB) {
																toast.error(`Ukuran file maksimal ${MAX_FILE_SIZE_MB}MB`)
																return
															}
															setIsLoadingImage(true)
															const url = await uploadImage(file)
															if (url) {
																field.onChange(url)
																toast.success("Foto berhasil diunggah!")
															} else {
																toast.error("Gagal mengunggah foto.")
															}
															setIsLoadingImage(false)
														}
													}}
												/>
											</label>
										</div>
										<div className="space-y-1">
											<FormLabel className="text-base font-medium">Foto Profil</FormLabel>
											<p className="text-sm text-muted-foreground">
												Format JPG, GIF, atau PNG. Maksimal {MAX_FILE_SIZE_MB}MB.
											</p>
											<div className="flex gap-2 mt-2">
												<Button 
													variant="outline" 
													size="sm" 
													type="button"
													onClick={() => document.getElementById('profile-upload').click()}
													disabled={isLoadingImage || updateMutation.isPending}
												>
													Ubah Foto
												</Button>
												{field.value && (
													<Button 
														variant="ghost" 
														size="sm" 
														type="button"
														className="text-destructive hover:bg-destructive/10"
														onClick={() => field.onChange("")}
														disabled={isLoadingImage || updateMutation.isPending}
													>
														Hapus
													</Button>
												)}
											</div>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid gap-6 md:grid-cols-2">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Nama Lengkap</FormLabel>
											<FormControl>
												<Input placeholder="Nama Anda" {...field} disabled={updateMutation.isPending} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input value={user.email} disabled className="bg-muted/50" />
									</FormControl>
									<p className="text-[10px] text-muted-foreground mt-1">
										Email tidak dapat diubah karena terikat dengan akun login.
									</p>
								</FormItem>

								<FormField
									control={form.control}
									name="phoneNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Nomor Telepon</FormLabel>
											<FormControl>
												<Input placeholder="08123456789" {...field} disabled={updateMutation.isPending} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="flex justify-end pt-4">
								<Button type="submit" disabled={updateMutation.isPending || isLoadingImage}>
									{updateMutation.isPending ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Menyimpan...
										</>
									) : (
										<>
											<Save className="mr-2 h-4 w-4" />
											Simpan Perubahan
										</>
									)}
								</Button>
							</div>
						</CardContent>
					</Card>
				</form>
			</Form>
		</div>
	)
}
