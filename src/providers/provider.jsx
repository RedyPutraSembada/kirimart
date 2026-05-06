'use client'

import { Toaster } from '@/components/ui/sonner'
import { ReactQueryProvider } from './react-query-provider'
import { ThemeProvider } from './theme-provider'

export function Providers({ children }) {
	return (
		<ThemeProvider attribute='class' defaultTheme='light' enableSystem disableTransitionOnChange>
			<ReactQueryProvider>
				<div className='relative flex min-h-svh flex-col bg-background'>
					{children}
				</div>
				<Toaster position='top-center' />
			</ReactQueryProvider>
		</ThemeProvider>
	)
}
