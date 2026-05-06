'use client'

import { Button } from '@/components/ui/button'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

const formSchema = z.object({
	name: z.string().min(1, 'Nama wajib diisi'),
	email: z.string().min(1, 'Email wajib diisi').email('Email tidak valid'),
	password: z.string().min(8, 'Password minimal 8 karakter'),
})

export default function SignUpPage() {
	const route = useRouter()
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: { name: '', email: '', password: '' },
	})

	async function onSubmit(data) {
		await authClient.signUp.email(
			{ ...data, callbackURL: '/' },
			{
				onSuccess: () => {
					toast.success(
						'Registrasi berhasil! Silakan cek email Anda untuk verifikasi.',
					)
					route.push('/sign-in')
				},
				onError: (ctx) => {
					// Tambahkan baris ini untuk melihat detail di Console Log
					console.log('Full Error Context:', ctx)
					console.log('Error Message:', ctx.error.message)

					toast.error(
						ctx.error.message || 'Gagal mendaftar. Silakan coba lagi.',
					)
				},
			},
		)
	}

	const signUpWithGoogle = async () => {
		try {
			await authClient.signIn.social({
				provider: 'google',
				role: 'user',
				callbackURL: '/',
			})
		} catch {
			toast.error('Gagal daftar dengan Google')
		}
	}

	const signUpWithGithub = async () => {
		try {
			await authClient.signIn.social({
				provider: 'github',
				role: 'user',
				callbackURL: '/',
			})
		} catch {
			toast.error('Gagal daftar dengan GitHub')
		}
	}

	return (
		<div className='flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950'>
			<div className='w-full max-w-[400px] space-y-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900'>
				{/* Header */}
				<div className='flex flex-col items-center gap-2 text-center'>
					<Image
						className='dark:invert mb-2'
						src='/next.svg'
						alt='Next.js logo'
						width={100}
						height={20}
						priority
					/>
					<h1 className='text-2xl font-semibold tracking-tight'>Daftar</h1>
					<p className='text-sm text-muted-foreground'>
						Buat akun baru untuk memulai.
					</p>
				</div>

				{/* Social Buttons */}
				<div className='grid grid-cols-2 gap-4'>
					<Button
						variant='outline'
						className='w-full'
						onClick={signUpWithGoogle}
						disabled={isLoading}
					>
						<svg className='mr-2 h-4 w-4' viewBox='0 0 24 24'>
							<path
								d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
								fill='#4285F4'
							/>
							<path
								d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
								fill='#34A853'
							/>
							<path
								d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z'
								fill='#FBBC05'
							/>
							<path
								d='M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
								fill='#EA4335'
							/>
						</svg>
						Google
					</Button>
					{/* <Button
						variant='outline'
						className='w-full'
						onClick={signUpWithGithub}
						disabled={isLoading}
					>
						<Github className='mr-2 h-4 w-4' />
						GitHub
					</Button> */}
				</div>

				{/* Divider */}
				<div className='relative'>
					<div className='absolute inset-0 flex items-center'>
						<span className='w-full border-t border-zinc-200 dark:border-zinc-800' />
					</div>
					<div className='relative flex justify-center text-xs uppercase'>
						<span className='bg-white px-2 text-muted-foreground dark:bg-zinc-900'>
							Atau lanjut dengan
						</span>
					</div>
				</div>

				{/* Form */}
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
						<FormField
							control={form.control}
							name='name'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nama</FormLabel>
									<FormControl>
										<Input placeholder='John Doe' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name='email'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											type='email'
											placeholder='nama@email.com'
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name='password'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Password</FormLabel>
									<FormControl>
										<div className='relative'>
											<Input
												type={showPassword ? 'text' : 'password'}
												placeholder='••••••••'
												className='pr-10'
												{...field}
											/>
											<button
												type='button'
												onClick={() => setShowPassword(!showPassword)}
												className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
											>
												{showPassword ? (
													<EyeOff className='w-4 h-4' />
												) : (
													<Eye className='w-4 h-4' />
												)}
											</button>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button
							type='submit'
							className='w-full font-medium'
							disabled={isLoading}
						>
							{isLoading ? 'Memproses...' : 'Daftar'}
						</Button>
					</form>
				</Form>

				<div className='text-center text-sm text-muted-foreground'>
					Sudah punya akun?{' '}
					<Link
						href='/sign-in'
						className='text-primary hover:underline font-medium'
					>
						Masuk sekarang
					</Link>
				</div>
			</div>
		</div>
	)
}
