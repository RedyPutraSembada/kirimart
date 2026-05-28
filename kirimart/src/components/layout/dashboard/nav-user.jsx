'use client'

import { ChevronsUpDown, LogOut } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar'
import { signOut } from '@/lib/auth-client'
import { getInitials } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function NavUser({
	user,
}) {
	// console.log(user)
	const { isMobile } = useSidebar()
	const router = useRouter()

	const handleSignOut = async () => {
		try {
			await signOut({
				fetchOptions: {
					onSuccess: () => {
						router.replace('/auth/sign-in')
					},
				},
			})
			toast.success('You have been Log out.')
		} catch (error) {
			console.error('Error during sign out:', error)
			toast.error('Failed to Log out. Please try again.')
		}
	}

	const name = user?.name ?? ''
	const email = user?.email ?? ''
	const image = user?.image ?? '/avatars/shadcn.jpg'
	const fallback = getInitials(name)
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size='lg'
							className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
						>
							<Avatar className='h-8 w-8 rounded-lg'>
								<AvatarImage src={image} alt={name} />
								<AvatarFallback className='rounded-lg'>{fallback}</AvatarFallback>
							</Avatar>
							<div className='grid flex-1 text-left text-sm leading-tight'>
								<span className='truncate font-medium'>{name}</span>
								<span className='truncate text-xs'>{email}</span>
							</div>
							<ChevronsUpDown className='ml-auto size-4' />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
						side={isMobile ? 'bottom' : 'right'}
						align='end'
						sideOffset={4}
					>
						<DropdownMenuLabel className='p-0 font-normal'>
							<div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
								<Avatar className='h-8 w-8 rounded-lg'>
									<AvatarImage src={image} alt={name} />
									<AvatarFallback className='rounded-lg'>{fallback}</AvatarFallback>
								</Avatar>
								<div className='grid flex-1 text-left text-sm leading-tight'>
									<span className='truncate font-medium'>{name}</span>
									<span className='truncate text-xs'>{email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleSignOut}>
							<LogOut />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
