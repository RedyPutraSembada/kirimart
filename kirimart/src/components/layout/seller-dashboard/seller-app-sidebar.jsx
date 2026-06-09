'use client'

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { menusSeller } from '@/config/constants/menu'
import { env } from '@/config/env'
import { useSession } from '@/lib/auth-client'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import * as React from 'react'
import { NavUser } from '../dashboard/nav-user'
import { SellerNavMain } from './seller-nav-main'

export function SellerAppSidebar({ ...props }) {
	const { data: session, isPending } = useSession()

	return (
		<Sidebar collapsible='icon' {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size='lg' asChild>
							<Link href='/'>
								<div className='flex aspect-square size-8 items-center justify-center rounded-lg'>
									<Image src='/images/kawanbelanja.png' alt='Logo' width={32} height={32} className='rounded-md object-contain' />
								</div>
								<div className='flex flex-col gap-0.5 leading-none'>
									<span className='font-semibold text-base'>{env.NEXT_PUBLIC_APP_NAME}</span>
									<span className='text-xs text-muted-foreground'>Seller Panel</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SellerNavMain items={menusSeller} />
			</SidebarContent>
			<SidebarFooter>
				{isPending || !session ? (
					<div className='flex items-center gap-2 px-4 py-2'>
						<Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />
						<Skeleton className='h-4 w-full rounded' />
					</div>
				) : (
					<NavUser user={session.user} />
				)}
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
