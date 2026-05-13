"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
	User, MapPin, Package, LogOut, ChevronRight, Menu 
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const sidebarNavItems = [
	{
		title: "Profil Saya",
		href: "/user-dashboard",
		icon: User,
	},
	{
		title: "Buku Alamat",
		href: "/user-dashboard/address",
		icon: MapPin,
	},
	{
		title: "Pesanan Saya",
		href: "/user-dashboard/orders",
		icon: Package,
	},
]

import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { useEffect } from "react"

export default function UserDashboardLayout({ children }) {
	const pathname = usePathname()
	const router = useRouter()
	const { data: session, isPending } = authClient.useSession()

	useEffect(() => {
		if (!isPending && !session) {
			router.push("/sign-in")
		}
		if (!isPending && session && session.user.role !== "user") {
			router.push("/")
		}
	}, [session, isPending, router])

	if (isPending) {
		return <div className="flex min-h-screen items-center justify-center">Memuat...</div>
	}

	if (!session) {
		return null // Will redirect in useEffect
	}
	const NavItems = () => (
		<nav className="grid items-start gap-2">
			{sidebarNavItems.map((item, index) => {
				const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/user-dashboard")
				return (
					<Link key={index} href={item.href}>
						<span
							className={cn(
								"group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
								isActive ? "bg-accent" : "transparent"
							)}
						>
							<span className="flex items-center">
								<item.icon className="mr-2 h-4 w-4" />
								<span>{item.title}</span>
							</span>
							<ChevronRight className={cn(
								"h-4 w-4 transition-transform",
								isActive ? "text-foreground" : "text-muted-foreground opacity-0 group-hover:opacity-100"
							)} />
						</span>
					</Link>
				)
			})}
			<Button 
				variant="ghost" 
				className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 mt-4"
				onClick={async () => {
					await authClient.signOut({
						fetchOptions: {
							onSuccess: () => {
								router.push("/sign-in")
							}
						}
					})
				}}
			>
				<LogOut className="mr-2 h-4 w-4" />
				Keluar
			</Button>
		</nav>
	)

	return (
		<div className="flex min-h-screen flex-col bg-muted/40">
			{/* Top Header */}
			<header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
				<Sheet>
					<SheetTrigger asChild>
						<Button variant="outline" size="icon" className="shrink-0 md:hidden">
							<Menu className="h-5 w-5" />
							<span className="sr-only">Toggle navigation menu</span>
						</Button>
					</SheetTrigger>
					<SheetContent side="left">
						<div className="flex h-full flex-col gap-6 pt-10">
							<div className="flex items-center px-2">
								<Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
									<div className="h-6 w-6 rounded-md overflow-hidden">
										<img src="/images/kawanbelanja.png" alt="Logo" className="h-full w-full object-contain" />
									</div>
									<div className="flex items-center gap-0">
										<span className="text-primary font-black tracking-tighter">kawan</span>
										<span className="text-foreground font-black tracking-tighter">belanja</span>
									</div>
								</Link>
							</div>
							<NavItems />
						</div>
					</SheetContent>
				</Sheet>
				<div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
					<Link href="/" className="hidden md:flex items-center gap-2 font-bold text-xl tracking-tight mr-auto">
						<div className="h-6 w-6 rounded-md overflow-hidden">
							<img src="/images/kawanbelanja.png" alt="Logo" className="h-full w-full object-contain" />
						</div>
						<div className="flex items-center gap-0">
							<span className="text-primary font-black tracking-tighter">kawan</span>
							<span className="text-foreground font-black tracking-tighter">belanja</span>
						</div>
					</Link>
					<div className="ml-auto flex items-center gap-2">
						<span className="text-sm font-medium hidden sm:inline-block">
							{session.user.name}
						</span>
						<Avatar className="h-8 w-8 border">
							{session.user.image && <AvatarImage src={session.user.image} alt={session.user.name} />}
							<AvatarFallback className="text-xs bg-primary/10 text-primary">
								{session.user.name?.charAt(0) || "U"}
							</AvatarFallback>
						</Avatar>
					</div>
				</div>
			</header>

			{/* Main Content Area */}
			<div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 max-w-6xl mx-auto w-full">
				<div className="grid w-full gap-6 md:grid-cols-[200px_1fr] lg:grid-cols-[250px_1fr]">
					{/* Sidebar (Desktop) */}
					<aside className="hidden w-[200px] flex-col md:flex lg:w-[250px]">
						<div className="sticky top-24">
							<NavItems />
						</div>
					</aside>

					{/* Page Content */}
					<main className="flex w-full flex-col overflow-hidden">
						{children}
					</main>
				</div>
			</div>
		</div>
	)
}
