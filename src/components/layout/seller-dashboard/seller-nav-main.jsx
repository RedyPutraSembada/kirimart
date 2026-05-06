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

export function SellerNavMain({ items }) {
	const pathname = usePathname()

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Menu</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => {
					const hasSubItems = !!item.items && item.items.length > 0

					// logic for parent item active state
					const isExactMatch = pathname === item.url
					const isSubPathMatch =
						item.url !== '/admin' &&
						item.url !== '/' &&
						pathname.startsWith(item.url + '/')

					// Check if any sub-item is an exact match (highest priority)
					const hasExactSubItemMatch =
						hasSubItems && item.items.some((sub) => pathname === sub.url)

					// If a sub-item is an exact match, the parent should be active but we don't
					// want the "List" sub-item to also be active via startsWith if "New" is exact.
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
												// Best match logic:
												// 1. Exact match always wins
												// 2. StartsWith only if no other sub-item is an exact match
												const isExactSubActive = pathname === subItem.url
												const isSubPathActive = pathname.startsWith(
													subItem.url + '/',
												)

												// If I'm at /new, only /new should be active.
												// /list (which is /admin/seg) should NOT be active even though /new starts with it.
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
									<Link href={item.url}>
										{item.icon && <item.icon />}
										<span>{item.title}</span>
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
