'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { authClient } from '@/lib/auth-client'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [isSent, setIsSent] = useState(false)

	async function handleSubmit(e) {
		e.preventDefault()

		if (!email || !email.includes('@')) {
			toast.error('Masukkan email yang valid')
			return
		}

		setIsLoading(true)
		try {
			const result = await authClient.requestPasswordReset({
				email,
				redirectTo: '/reset-password',
			})

			if (result.error) {
				toast.error(result.error.message || 'Gagal mengirim link reset password')
				setIsLoading(false)
				return
			}

			setIsSent(true)
		} catch {
			toast.error('Terjadi kesalahan. Silakan coba lagi.')
		}
		setIsLoading(false)
	}

	return (
		<div className='flex min-h-screen items-center justify-center px-4 py-12'>
			<div className='w-full max-w-[420px] space-y-6'>
				{/* Header */}
				<div className='flex flex-col items-center gap-3 text-center'>
					<Link href="/" className="flex items-center gap-1.5">
						<div className="h-8 w-8 rounded-lg overflow-hidden relative">
							<Image src="/images/kawanbelanja.png" alt="Logo" fill sizes="32px" className="object-contain" />
						</div>
						<div className="flex items-center">
							<span className="text-xl font-black tracking-tighter text-primary">kawan</span>
							<span className="text-xl font-black tracking-tighter">belanja</span>
						</div>
					</Link>
					<div className="space-y-1">
						<h1 className='text-2xl font-bold tracking-tight'>
							{isSent ? 'Cek Email Anda' : 'Lupa Password?'}
						</h1>
						<p className='text-sm text-muted-foreground'>
							{isSent
								? 'Link reset password telah dikirim'
								: 'Masukkan email Anda untuk menerima link reset password'
							}
						</p>
					</div>
				</div>

				{/* Card */}
				<div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
					{isSent ? (
						/* Sukses */
						<div className="space-y-4 text-center">
							<div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
								<CheckCircle2 className="h-7 w-7 text-emerald-500" />
							</div>

							<div className="space-y-2">
								<div className="flex items-center gap-2 justify-center p-3 rounded-xl bg-muted/50">
									<Mail className="h-4 w-4 text-muted-foreground shrink-0" />
									<p className="text-sm font-semibold truncate">{email}</p>
								</div>
								<p className="text-xs text-muted-foreground">
									Jika email terdaftar, Anda akan menerima link untuk mereset password. 
									Cek juga folder spam.
								</p>
							</div>

							<Button
								variant="outline"
								className="w-full h-10 rounded-xl text-sm font-medium"
								onClick={() => { setIsSent(false); setEmail('') }}
							>
								Kirim Ulang
							</Button>
						</div>
					) : (
						/* Form */
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-1.5">
								<label className="text-xs font-medium">Email</label>
								<Input
									type="email"
									placeholder="nama@email.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="h-10 rounded-xl text-sm"
									disabled={isLoading}
								/>
							</div>

							<Button
								type="submit"
								className="w-full h-10 rounded-xl font-bold text-sm"
								disabled={isLoading || !email}
							>
								{isLoading ? (
									<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...</>
								) : (
									'Kirim Link Reset Password'
								)}
							</Button>
						</form>
					)}
				</div>

				{/* Back */}
				<div className="text-center">
					<Link href="/sign-in" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
						<ArrowLeft className="h-3.5 w-3.5" /> Kembali ke halaman masuk
					</Link>
				</div>
			</div>
		</div>
	)
}
