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
import { Save, Loader2, Camera, User as UserIcon, Lock, Eye, EyeOff } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { updateProfileSchema } from "@/lib/validations/user-dashboard/profile"
import { env } from "@/config/env"
import { uploadFile } from "@/lib/upload"
import { toast } from "sonner"
import { updateProfileAction } from "@/actions/user-dashboard/profile.actions"
import { useMutation, useQueryClient } from "@tanstack/react-query"

const MAX_FILE_SIZE_MB = env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || 2

export function UserProfile() {
	const queryClient = useQueryClient()
	const { data: session, isPending: isSessionLoading } = authClient.useSession()
	const user = session?.user
	const [isLoadingImage, setIsLoadingImage] = useState(false)

	// State form ganti password
	const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" })
	const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false })
	const [isChangingPw, setIsChangingPw] = useState(false)
	
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
															
																toast.error("Gagal mengunggah foto.")
															
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

			{/* Section: Keamanan Akun — Ganti Password */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Lock className="h-4 w-4" />
						Keamanan Akun
					</CardTitle>
					<CardDescription>Perbarui kata sandi akun Anda secara berkala untuk menjaga keamanan.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Password Lama */}
					<div className="space-y-1.5">
						<Label htmlFor="current-pw">Password Saat Ini</Label>
						<div className="relative">
							<Input
								id="current-pw"
								type={showPw.current ? "text" : "password"}
								placeholder="Masukkan password saat ini"
								value={pwForm.current}
								onChange={(e) => setPwForm(p => ({ ...p, current: e.target.value }))}
								disabled={isChangingPw}
							/>
							<button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(p => ({...p, current: !p.current}))}>
								{showPw.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>
					{/* Password Baru */}
					<div className="space-y-1.5">
						<Label htmlFor="new-pw">Password Baru</Label>
						<div className="relative">
							<Input
								id="new-pw"
								type={showPw.newPw ? "text" : "password"}
								placeholder="Minimal 8 karakter"
								value={pwForm.newPw}
								onChange={(e) => setPwForm(p => ({ ...p, newPw: e.target.value }))}
								disabled={isChangingPw}
							/>
							<button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(p => ({...p, newPw: !p.newPw}))}>
								{showPw.newPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>
					{/* Konfirmasi Password Baru */}
					<div className="space-y-1.5">
						<Label htmlFor="confirm-pw">Konfirmasi Password Baru</Label>
						<div className="relative">
							<Input
								id="confirm-pw"
								type={showPw.confirm ? "text" : "password"}
								placeholder="Ulangi password baru"
								value={pwForm.confirm}
								onChange={(e) => setPwForm(p => ({ ...p, confirm: e.target.value }))}
								disabled={isChangingPw}
							/>
							<button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPw(p => ({...p, confirm: !p.confirm}))}>
								{showPw.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						</div>
					</div>

					<div className="flex justify-end pt-2">
						<Button
							disabled={isChangingPw || !pwForm.current || !pwForm.newPw || !pwForm.confirm}
							onClick={async () => {
								if (pwForm.newPw.length < 8) {
									toast.error("Password baru minimal 8 karakter.")
									return
								}
								if (pwForm.newPw !== pwForm.confirm) {
									toast.error("Konfirmasi password tidak cocok.")
									return
								}
								setIsChangingPw(true)
								try {
									const res = await authClient.changePassword({
										currentPassword: pwForm.current,
										newPassword: pwForm.newPw,
										revokeOtherSessions: false,
									})
									if (res.error) {
										toast.error(res.error.message || "Password lama tidak benar.")
									} else {
										toast.success("Password berhasil diubah!")
										setPwForm({ current: "", newPw: "", confirm: "" })
									}
								} catch {
									toast.error("Terjadi kesalahan. Coba lagi.")
								} finally {
									setIsChangingPw(false)
								}
							}}
						>
							{isChangingPw ? (
								<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</>
							) : (
								<><Lock className="mr-2 h-4 w-4" />Ubah Password</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
