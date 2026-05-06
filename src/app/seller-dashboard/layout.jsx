import { DynamicBreadcrumb } from '@/components/global/dynamic-breadcrumb'
import { ThemeToggle } from '@/components/global/theme-toggle'
import { AppSidebar } from '@/components/layout/dashboard/app-sidebar'
import { SellerAppSidebar } from '@/components/layout/seller-dashboard/seller-app-sidebar'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

export default async function AdminLayout({
	children,
}) {
	return (
		<SidebarProvider>
			<SellerAppSidebar />
			<SidebarInset>
				<header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
					<div className='flex items-center gap-2 px-4'>
						<SidebarTrigger className='-ml-1' />
						<Separator orientation='vertical' className='mr-2 data-[orientation=vertical]:h-4' />
						<ThemeToggle />
						<DynamicBreadcrumb basePath='/admin' />
					</div>
				</header>

				<div className='flex flex-1 flex-col gap-4 p-6'>{children}</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
