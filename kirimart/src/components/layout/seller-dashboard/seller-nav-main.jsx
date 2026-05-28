'use client'

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getUnreadChatCount } from '@/actions/public/chat.actions'
import { getUnreadNotifCount } from '@/actions/public/notification.actions'

export function SellerNavMain({ items }) {
	const pathname = usePathname()

	// Chat unread count for badge
	const { data: chatUnread } = useQuery({
		queryKey: ['chat-unread-count'],
		queryFn: getUnreadChatCount,
		refetchOnWindowFocus: true,
		refetchInterval: 30000,
	})
	const chatCount = chatUnread?.data || 0

	// Notification unread count for badge (pesanan baru, dll)
	const { data: notifUnread } = useQuery({
		queryKey: ['notif-unread-count'],
		queryFn: getUnreadNotifCount,
		refetchOnWindowFocus: true,
		refetchInterval: 15000,
	})
	const notifCount = notifUnread?.data || 0

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Menu</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => {
					const hasSubItems = !!item.items && item.items.length > 0

					const isExactMatch = pathname === item.url
					const isSubPathMatch =
						item.url !== '/admin' &&
						item.url !== '/' &&
						pathname.startsWith(item.url + '/')

					const hasExactSubItemMatch =
						hasSubItems && item.items.some((sub) => pathname === sub.url)

					const isGroupActive =
						isExactMatch ||
						isSubPathMatch ||
						(hasSubItems &&
							item.items.some((sub) =>
								pathname.startsWith(sub.url + '/'),
							)) ||
						hasExactSubItemMatch

					if (hasSubItems) {
						return (
							<Collapsible
								key={item.title}
								asChild
								defaultOpen={isGroupActive}
								className='group/collapsible'
							>
								<SidebarMenuItem>
									<CollapsibleTrigger asChild>
										<SidebarMenuButton
											tooltip={item.title}
											className={cn(
												'w-full transition-colors',
												isGroupActive &&
												'bg-primary/5 text-primary font-semibold',
											)}
										>
											{item.icon && <item.icon />}
											<span>{item.title}</span>
											<ChevronRight
												className={cn(
													'ml-auto h-4 w-4 transition-transform duration-200',
													'group-data-[state=open]/collapsible:rotate-90',
												)}
											/>
										</SidebarMenuButton>
									</CollapsibleTrigger>

									<CollapsibleContent>
										<SidebarMenuSub className='mr-0 pr-0 border-l border-primary/20 ml-5'>
											{item.items?.map((subItem) => {
												const isExactSubActive = pathname === subItem.url
												const isSubPathActive = pathname.startsWith(
													subItem.url + '/',
												)
												const isActualSubActive =
													isExactSubActive ||
													(isSubPathActive && !hasExactSubItemMatch)

												return (
													<SidebarMenuSubItem key={subItem.title}>
														<SidebarMenuSubButton asChild>
															<Link
																href={subItem.url}
																className={cn(
																	'transition-all duration-200 rounded-md px-2 py-1',
																	isActualSubActive
																		? 'bg-primary/10 text-primary font-semibold translate-x-1'
																		: 'text-foreground/60 hover:text-foreground hover:bg-black/5',
																)}
															>
																<span>{subItem.title}</span>
															</Link>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												)
											})}
										</SidebarMenuSub>
									</CollapsibleContent>
								</SidebarMenuItem>
							</Collapsible>
						)
					} else {
						const isStandaloneActive = pathname === item.url
						const isChatItem = item.title === 'Chat'
						const isOrderItem = item.title === 'Pesanan' || item.title === 'Orders'
						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton
									asChild
									tooltip={item.title}
									className={cn(
										'w-full transition-colors',
										isStandaloneActive &&
										'bg-primary/5 text-primary font-semibold',
									)}
								>
									<Link href={item.url} className="flex items-center justify-between w-full">
										<span className="flex items-center gap-2">
											{item.icon && <item.icon className="h-4 w-4" />}
											<span>{item.title}</span>
										</span>
										{isChatItem && chatCount > 0 && (
											<span className="bg-primary text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shrink-0">
												{chatCount > 99 ? "99+" : chatCount}
											</span>
										)}
										{isOrderItem && notifCount > 0 && (
											<span className="bg-destructive text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shrink-0 animate-pulse">
												{notifCount > 99 ? "99+" : notifCount}
											</span>
										)}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						)
					}
				})}
			</SidebarMenu>
		</SidebarGroup>
	)
}
