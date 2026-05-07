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
import { AppleIcon, Loader2 } from 'lucide-react'
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
						<SidebarMenuButton asChild className='data-[slot=sidebar-menu-button]:p-1.5!'>
							<Link href='/'>
								<AppleIcon className='size-5!' />
								<span className='text-base font-semibold'>{env.NEXT_PUBLIC_APP_NAME} Seller</span>
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
