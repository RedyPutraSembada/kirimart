'use client'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
// import { Github } from 'lucide-react' // Pastikan sudah install lucide-react
import { authClient } from '@/lib/auth-client'

const formSchema = z.object({
	email: z.string().email('Email tidak valid').min(1, 'Email wajib diisi'),
	password: z.string().min(6, 'Password minimal 6 karakter'),
})

export default function SignInPage() {
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	})

	async function onSubmit(values) {
		await authClient.signIn.email(
			{
				role: 'user',
				email: values.email,
				password: values.password,
				callbackURL: '/dashboard', // Pastikan env terbaca di client
			},
			{
				// 1. Menangkap saat request baru dimulai
				onRequest: () => {
					console.log('Sedang mencoba login...')
				},
				// 2. Menangkap Response Sukses
				onSuccess: (ctx) => {
					console.log('Login Berhasil:', ctx.data)
					toast.success('Selamat datang kembali!')
					// Arahkan user atau lakukan sesuatu
				},
				// 3. Menangkap Detail Error
				onError: (ctx) => {
					console.error('Detail Error:', ctx.error)

					// Cek kode error spesifik jika ada
					const message =
						ctx.error.message || 'Gagal login. Cek kembali email/password.'
					toast.error(message)
				},
			},
		)
	}

	const signInWithGoogle = async () => {
		try {
			await authClient.signIn.social({
				provider: 'google',
				role: 'user',
				callbackURL: '/', // Tambahkan tujuan setelah login berhasil
			})
		} catch (error) {
			toast.error('Gagal login dengan Google')
		}
	}

	// Jangan lupa buat juga untuk GitHub-nya
	const signInWithGithub = async () => {
		try {
			await authClient.signIn.social({
				provider: 'github',
				callbackURL: '/',
			})
		} catch (error) {
			toast.error('Gagal login dengan GitHub')
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
					<h1 className='text-2xl font-semibold tracking-tight'>Sign In</h1>
					<p className='text-sm text-muted-foreground'>
						Selamat datang kembali! Silakan masuk.
					</p>
				</div>

				{/* Social Login Buttons */}
				<div className='grid grid-cols-2 gap-4'>
					<Button
						variant='outline'
						className='w-full'
						onClick={signInWithGoogle}
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
						onClick={() => console.log('Github login')}
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

				{/* Form Login */}
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
						<Field>
							<FieldLabel htmlFor='email'>Email</FieldLabel>
							<Input
								id='email'
								type='email'
								placeholder='nama@email.com'
								{...form.register('email')}
							/>
							<FieldError />
						</Field>

						<Field>
							<div className='flex items-center justify-between'>
								<FieldLabel htmlFor='password'>Password</FieldLabel>
								<Link href='#' className='text-xs text-primary hover:underline'>
									Lupa password?
								</Link>
							</div>
							<Input
								id='password'
								type='password'
								placeholder='••••••••'
								{...form.register('password')}
							/>
							<FieldError />
						</Field>

						<Button type='submit' className='w-full font-medium'>
							Masuk
						</Button>
					</form>
				</Form>

				<div className='text-center text-sm text-muted-foreground'>
					Belum punya akun?{' '}
					<Link
						href='/sign-up'
						className='text-primary hover:underline font-medium'
					>
						Daftar sekarang
					</Link>
				</div>
			</div>
		</div>
	)
}
