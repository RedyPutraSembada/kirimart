'use client'

import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Laptop, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
	const { setTheme, theme, systemTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	// hanya render setelah client mount biar ga mismatch
	useEffect(() => {
		requestAnimationFrame(() => {
			setMounted(true)
		})
	}, [])

	if (!mounted) {
		// optional: bisa return skeleton atau tombol kosong
		return (
			<Button variant='outline' size='icon' className='rounded-full'>
				<Sun className='h-[1.2rem] w-[1.2rem]' />
			</Button>
		)
	}

	const currentTheme = theme === 'system' ? systemTheme : theme

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='outline' size='icon' className='rounded-full'>
					{currentTheme === 'dark' ? (
						<Moon className='h-[1.2rem] w-[1.2rem]' />
					) : (
						<Sun className='h-[1.2rem] w-[1.2rem]' />
					)}
					<span className='sr-only'>Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuItem onClick={() => setTheme('light')}>
					<Sun className='mr-2 h-4 w-4' /> Light
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme('dark')}>
					<Moon className='mr-2 h-4 w-4' /> Dark
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme('system')}>
					<Laptop className='mr-2 h-4 w-4' /> System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
