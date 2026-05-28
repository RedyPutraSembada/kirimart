'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'

// ============================================
// SCHEMA
// ============================================

const loginSchema = z.object({
	email: z.string().email('Email tidak valid'),
	password: z.string().min(1, 'Password wajib diisi'),
})

// ============================================
// SIGN IN PAGE — 2 Step: Password → OTP
// ============================================

export default function SignInPage() {
	const router = useRouter()
	const [showPassword, setShowPassword] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	// OTP step state
	const [step, setStep] = useState('login') // 'login' | 'otp'
	const [verifiedEmail, setVerifiedEmail] = useState('')
	const [otpValue, setOtpValue] = useState('')
	const [otpLoading, setOtpLoading] = useState(false)
	const [resendCooldown, setResendCooldown] = useState(0)

	const form = useForm({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: '', password: '' },
	})

	// ============================================
	// HELPER
	// ============================================

	const getRedirectUrl = (role) => {
		switch (role) {
			case 'admin': return '/admin-dashboard'
			case 'seller': return '/seller-dashboard'
			default: return '/'
		}
	}

	function startResendCooldown() {
		setResendCooldown(60)
		const interval = setInterval(() => {
			setResendCooldown(prev => {
				if (prev <= 1) { clearInterval(interval); return 0 }
				return prev - 1
			})
		}, 1000)
	}

	// ============================================
	// STEP 1: Verifikasi password → kirim OTP
	// ============================================

	async function onPasswordSubmit(values) {
		setIsLoading(true)

		// Verifikasi credentials melalui signIn.email
		// Jika berhasil, session terbuat tapi kita TAHAN redirect
		await authClient.signIn.email(
			{
				email: values.email,
				password: values.password,
			},
			{
				onSuccess: async () => {
					// Credentials valid → kirim OTP ke email
					setVerifiedEmail(values.email)

					try {
						const otpResult = await authClient.emailOtp.sendVerificationOtp({
							email: values.email,
							type: 'sign-in',
						})

						if (otpResult.error) {
							toast.error('Gagal mengirim kode OTP. Silakan coba lagi.')
							setIsLoading(false)
							return
						}

						toast.success('Kode OTP dikirim ke email Anda!')
						setStep('otp')
						startResendCooldown()
					} catch {
						toast.error('Gagal mengirim kode OTP.')
					}
					setIsLoading(false)
				},
				onError: (ctx) => {
					toast.error(ctx.error.message || 'Email atau password salah.')
					setIsLoading(false)
				},
			},
		)
	}

	// ============================================
	// STEP 2: Verifikasi OTP → redirect
	// ============================================

	async function handleVerifyOtp() {
		if (otpValue.length !== 6) {
			toast.error('Masukkan 6 digit kode OTP')
			return
		}

		setOtpLoading(true)
		try {
			const result = await authClient.signIn.emailOtp({
				email: verifiedEmail,
				otp: otpValue,
			})

			if (result.error) {
				toast.error(result.error.message || 'Kode OTP tidak valid atau sudah kedaluwarsa')
				setOtpValue('')
				setOtpLoading(false)
				return
			}

			// OTP verified → ambil session dan redirect berdasarkan role
			toast.success('Verifikasi berhasil! Selamat datang kembali.')
			const role = result.data?.user?.role
			router.push(getRedirectUrl(role))
		} catch {
			toast.error('Kode OTP tidak valid atau sudah kedaluwarsa')
			setOtpValue('')
			setOtpLoading(false)
		}
	}

	// Kirim ulang OTP
	async function handleResendOtp() {
		setOtpLoading(true)
		try {
			await authClient.emailOtp.sendVerificationOtp({
				email: verifiedEmail,
				type: 'sign-in',
			})
			toast.success('Kode OTP dikirim ulang!')
			startResendCooldown()
		} catch {
			toast.error('Gagal mengirim ulang kode OTP')
		}
		setOtpLoading(false)
	}

	// ============================================
	// Google login (tanpa OTP)
	// ============================================

	const signInWithGoogle = async () => {
		try {
			await authClient.signIn.social({
				provider: 'google',
				callbackURL: '/',
			})
		} catch {
			toast.error('Gagal login dengan Google')
		}
	}

	// ============================================
	// RENDER
	// ============================================

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
							{step === 'login' ? 'Masuk ke Akun' : 'Verifikasi OTP'}
						</h1>
						<p className='text-sm text-muted-foreground'>
							{step === 'login'
								? 'Masukkan email dan password untuk melanjutkan'
								: 'Masukkan kode verifikasi yang dikirim ke email Anda'
							}
						</p>
					</div>
				</div>

				{/* Card */}
				<div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-5">

					{step === 'login' ? (
						<>
							{/* Google OAuth — langsung login tanpa OTP */}
							<Button
								variant='outline'
								className='w-full h-10 rounded-xl text-sm font-medium'
								onClick={signInWithGoogle}
								disabled={isLoading}
							>
								<svg className='mr-2 h-4 w-4' viewBox='0 0 24 24'>
									<path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4' />
									<path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853' />
									<path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z' fill='#FBBC05' />
									<path d='M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335' />
								</svg>
								Masuk dengan Google
							</Button>

							{/* Divider */}
							<div className='relative'>
								<div className='absolute inset-0 flex items-center'>
									<span className='w-full border-t' />
								</div>
								<div className='relative flex justify-center text-xs uppercase'>
									<span className='bg-card px-3 text-muted-foreground'>atau masuk dengan email</span>
								</div>
							</div>

							{/* Password Form */}
							<Form {...form}>
								<form onSubmit={form.handleSubmit(onPasswordSubmit)} className='space-y-4'>
									<FormField
										control={form.control}
										name='email'
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-xs font-medium">Email</FormLabel>
												<FormControl>
													<Input type='email' placeholder='nama@email.com' className="h-10 rounded-xl text-sm" {...field} />
												</FormControl>
												<FormMessage className="text-xs" />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name='password'
										render={({ field }) => (
											<FormItem>
												<div className='flex items-center justify-between'>
													<FormLabel className="text-xs font-medium">Password</FormLabel>
													<Link href='/forgot-password' className='text-[11px] text-primary hover:underline font-medium'>
														Lupa password?
													</Link>
												</div>
												<FormControl>
													<div className='relative'>
														<Input
															type={showPassword ? 'text' : 'password'}
															placeholder='••••••••'
															className='pr-10 h-10 rounded-xl text-sm'
															{...field}
														/>
														<button
															type='button'
															onClick={() => setShowPassword(!showPassword)}
															className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
														>
															{showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
														</button>
													</div>
												</FormControl>
												<FormMessage className="text-xs" />
											</FormItem>
										)}
									/>

									<Button type='submit' className='w-full h-10 rounded-xl font-bold text-sm' disabled={isLoading}>
										{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memverifikasi...</> : 'Masuk'}
									</Button>
								</form>
							</Form>
						</>
					) : (
						/* ============================================ */
						/* STEP 2: OTP Verification */
						/* ============================================ */
						<div className="space-y-5">
							<button
								onClick={() => { setStep('login'); setOtpValue(''); setVerifiedEmail('') }}
								className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
							>
								<ArrowLeft className="h-3.5 w-3.5" /> Kembali ke login
							</button>

							{/* Email info */}
							<div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/40">
								<div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
									<Mail className="h-4 w-4 text-primary" />
								</div>
								<div>
									<p className="text-xs text-muted-foreground">Kode dikirim ke</p>
									<p className="text-sm font-semibold">{verifiedEmail}</p>
								</div>
							</div>

							{/* OTP Input */}
							<div className="flex justify-center py-2">
								<InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
									<InputOTPGroup>
										<InputOTPSlot index={0} className="h-12 w-11 rounded-lg text-lg font-bold" />
										<InputOTPSlot index={1} className="h-12 w-11 rounded-lg text-lg font-bold" />
										<InputOTPSlot index={2} className="h-12 w-11 rounded-lg text-lg font-bold" />
										<InputOTPSlot index={3} className="h-12 w-11 rounded-lg text-lg font-bold" />
										<InputOTPSlot index={4} className="h-12 w-11 rounded-lg text-lg font-bold" />
										<InputOTPSlot index={5} className="h-12 w-11 rounded-lg text-lg font-bold" />
									</InputOTPGroup>
								</InputOTP>
							</div>

							{/* Verify Button */}
							<Button
								className="w-full h-10 rounded-xl font-bold text-sm"
								onClick={handleVerifyOtp}
								disabled={otpLoading || otpValue.length !== 6}
							>
								{otpLoading ? (
									<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memverifikasi...</>
								) : (
									'Verifikasi & Masuk'
								)}
							</Button>

							{/* Resend */}
							<div className="text-center">
								{resendCooldown > 0 ? (
									<p className="text-xs text-muted-foreground">
										Kirim ulang dalam <span className="font-semibold text-foreground">{resendCooldown}s</span>
									</p>
								) : (
									<button
										onClick={handleResendOtp}
										className="text-xs text-primary hover:underline font-semibold"
										disabled={otpLoading}
									>
										Kirim Ulang Kode
									</button>
								)}
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				{step === 'login' && (
					<p className='text-center text-sm text-muted-foreground'>
						Belum punya akun?{' '}
						<Link href='/sign-up' className='text-primary hover:underline font-semibold'>
							Daftar sekarang
						</Link>
					</p>
				)}
			</div>
		</div>
	)
}
