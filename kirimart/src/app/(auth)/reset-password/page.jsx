'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, CheckCircle2, ShieldAlert } from 'lucide-react'

export default function ResetPasswordPage() {
	return (
		<Suspense fallback={
			<div className="flex min-h-screen items-center justify-center">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		}>
			<ResetPasswordContent />
		</Suspense>
	)
}

function ResetPasswordContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const token = searchParams.get('token')

	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [isSuccess, setIsSuccess] = useState(false)

	async function handleSubmit(e) {
		e.preventDefault()

		if (password.length < 8) {
			toast.error('Password minimal 8 karakter')
			return
		}

		if (!/[A-Z]/.test(password)) {
			toast.error('Password harus memiliki huruf besar')
			return
		}

		if (!/[0-9]/.test(password)) {
			toast.error('Password harus memiliki angka')
			return
		}

		if (password !== confirmPassword) {
			toast.error('Password tidak cocok')
			return
		}

		if (!token) {
			toast.error('Token reset tidak ditemukan. Silakan kirim ulang link reset password.')
			return
		}

		setIsLoading(true)
		try {
			const result = await authClient.resetPassword({
				newPassword: password,
				token,
			})

			if (result.error) {
				toast.error(result.error.message || 'Gagal mereset password. Token mungkin sudah kedaluwarsa.')
				setIsLoading(false)
				return
			}

			setIsSuccess(true)
			toast.success('Password berhasil diubah!')
		} catch {
			toast.error('Terjadi kesalahan. Silakan coba lagi.')
		}
		setIsLoading(false)
	}

	// Token tidak ada
	if (!token && !isSuccess) {
		return (
			<div className='flex min-h-screen items-center justify-center px-4 py-12'>
				<div className='w-full max-w-[420px] space-y-6'>
					<div className='flex flex-col items-center gap-3 text-center'>
						<div className="mx-auto h-14 w-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
							<ShieldAlert className="h-7 w-7 text-red-500" />
						</div>
						<h1 className='text-2xl font-bold tracking-tight'>Link Tidak Valid</h1>
						<p className='text-sm text-muted-foreground'>
							Link reset password tidak valid atau sudah kedaluwarsa. Silakan kirim ulang.
						</p>
						<Button asChild className="mt-2 rounded-xl">
							<Link href="/forgot-password">Kirim Ulang Link</Link>
						</Button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='flex min-h-screen items-center justify-center px-4 py-12'>
			<div className='w-full max-w-[420px] space-y-6'>
				{/* Header */}
				<div className='flex flex-col items-center gap-3 text-center'>
					<Link href="/" className="flex items-center gap-1.5">
						<div className="h-8 w-8 rounded-lg overflow-hidden">
							<img src="/images/kawanbelanja.png" alt="Logo" className="h-full w-full object-contain" />
						</div>
						<div className="flex items-center">
							<span className="text-xl font-black tracking-tighter text-primary">kawan</span>
							<span className="text-xl font-black tracking-tighter">belanja</span>
						</div>
					</Link>
					<div className="space-y-1">
						<h1 className='text-2xl font-bold tracking-tight'>
							{isSuccess ? 'Password Diubah!' : 'Buat Password Baru'}
						</h1>
						<p className='text-sm text-muted-foreground'>
							{isSuccess
								? 'Password Anda berhasil diperbarui'
								: 'Masukkan password baru untuk akun Anda'
							}
						</p>
					</div>
				</div>

				{/* Card */}
				<div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
					{isSuccess ? (
						<div className="space-y-4 text-center">
							<div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
								<CheckCircle2 className="h-7 w-7 text-emerald-500" />
							</div>
							<p className="text-sm text-muted-foreground">
								Silakan masuk dengan password baru Anda.
							</p>
							<Button asChild className="w-full h-10 rounded-xl font-bold text-sm">
								<Link href="/sign-in">Masuk Sekarang</Link>
							</Button>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-1.5">
								<label className="text-xs font-medium">Password Baru</label>
								<div className="relative">
									<Input
										type={showPassword ? 'text' : 'password'}
										placeholder="Min. 8 karakter, huruf besar & angka"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="h-10 rounded-xl text-sm pr-10"
										disabled={isLoading}
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
									>
										{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									</button>
								</div>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-medium">Konfirmasi Password Baru</label>
								<div className="relative">
									<Input
										type={showConfirm ? 'text' : 'password'}
										placeholder="Ulangi password baru"
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										className="h-10 rounded-xl text-sm pr-10"
										disabled={isLoading}
									/>
									<button
										type="button"
										onClick={() => setShowConfirm(!showConfirm)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
									>
										{showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									</button>
								</div>
							</div>

							<Button
								type="submit"
								className="w-full h-10 rounded-xl font-bold text-sm"
								disabled={isLoading || !password || !confirmPassword}
							>
								{isLoading ? (
									<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
								) : (
									'Simpan Password Baru'
								)}
							</Button>
						</form>
					)}
				</div>
			</div>
		</div>
	)
}
