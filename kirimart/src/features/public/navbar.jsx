"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ShoppingCart, Search, User, ChevronDown, MapPin,
  Store, Package, LogOut, LayoutDashboard, ShieldCheck, Heart, MessageCircle, Bell, Check, Grid3X3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { getCategories } from "@/actions/seller-dashboard/product/product.actions"
import { getCartSummary } from "@/actions/public/cart.actions"
import { getUnreadChatCount } from "@/actions/public/chat.actions"
import { getUnreadNotifCount, getMyNotifications, markAllNotifsAsRead, markNotifAsRead } from "@/actions/public/notification.actions"
import { ThemeToggle } from "@/components/global/theme-toggle"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useSession, signOut } from "@/lib/auth-client"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { SearchBar } from "@/features/public/search-bar"

// ============================================
// HELPER
// ============================================

function getInitials(name) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

// ============================================
// NAVBAR COMPONENT
// ============================================

export function Navbar() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [categories, setCategories] = useState([])
  const [isScrolled, setIsScrolled] = useState(false)

  const isLoggedIn = !!session?.user
  const userRole = session?.user?.role
  const userName = session?.user?.name
  const userEmail = session?.user?.email
  const userImage = session?.user?.image

  // Cart badge — reactive
  const { data: cartData } = useQuery({
    queryKey: ["cart-summary", session?.user?.id],
    queryFn: getCartSummary,
    enabled: isLoggedIn,
    refetchOnWindowFocus: true,
  })
  const cartCount = isLoggedIn ? (cartData?.data?.totalItems || 0) : 0

  // Chat unread badge
  const queryClient = useQueryClient()
  const { data: chatUnread } = useQuery({
    queryKey: ["chat-unread-count", session?.user?.id],
    queryFn: getUnreadChatCount,
    enabled: isLoggedIn,
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Polling tiap 10 detik sebagai fallback
  })
  const chatCount = isLoggedIn ? (chatUnread?.data || 0) : 0

  // Notification unread badge
  const { data: notifUnread } = useQuery({
    queryKey: ["notif-unread-count", session?.user?.id],
    queryFn: getUnreadNotifCount,
    enabled: isLoggedIn,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  })
  const notifCount = isLoggedIn ? (notifUnread?.data || 0) : 0

  // Notification list (hanya fetch saat popover dibuka)
  const [notifOpen, setNotifOpen] = useState(false)
  const { data: notifsResult } = useQuery({
    queryKey: ["my-notifications", session?.user?.id],
    queryFn: getMyNotifications,
    enabled: isLoggedIn && notifOpen,
    staleTime: 0,
    refetchOnMount: "always",
  })
  const notifList = notifsResult?.data || []

  // Listen BroadcastChannel untuk update badge real-time
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return

    const chatChannel = new BroadcastChannel('kawanbelanja-chat')
    chatChannel.onmessage = (event) => {
      if (event.data?.type === 'unread-update') {
        queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] })
      }
    }

    const notifChannel = new BroadcastChannel('kawanbelanja-notif')
    notifChannel.onmessage = (event) => {
      if (event.data?.type === 'new-notification') {
        queryClient.invalidateQueries({ queryKey: ["notif-unread-count"] })
        queryClient.invalidateQueries({ queryKey: ["my-notifications"] })
      }
    }

    return () => {
      chatChannel.close()
      notifChannel.close()
    }
  }, [queryClient])

  // Mark all notifs as read — optimistic update langsung
  const handleMarkAllRead = async () => {
    // 1. Optimistic: badge langsung 0
    queryClient.setQueryData(["notif-unread-count"], (old) => ({
      ...old, success: true, data: 0
    }))
    // 2. Optimistic: semua notif jadi isRead
    queryClient.setQueryData(["my-notifications"], (old) => {
      if (!old?.data) return old
      return { ...old, data: old.data.map(n => ({ ...n, isRead: true })) }
    })
    // 3. Server update (background)
    await markAllNotifsAsRead()
    // 4. Refetch sebagai backup
    queryClient.invalidateQueries({ queryKey: ["notif-unread-count"] })
    queryClient.invalidateQueries({ queryKey: ["my-notifications"] })
  }

  // Notif icon by type
  const getNotifIcon = (type) => {
    const icons = {
      new_order: "🛒", payment_success: "✅", order_processing: "📦",
      order_shipped: "🚚", order_delivered: "✅", order_status_changed: "📦", new_review: "⭐",
    }
    return icons[type] || "🔔"
  }

  // Format relative time
  const formatNotifTime = (dateStr) => {
    const now = new Date()
    const d = new Date(dateStr)
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60) return "Baru saja"
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`
    return `${Math.floor(diff / 86400)}h lalu`
  }

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await getCategories()
      if (res.success) setCategories(res.data)
    }
    fetchCategories()

    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleLogout = async () => {
    await signOut()
    toast.success("Berhasil keluar!")
    router.push("/")
    router.refresh()
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-500 ${isScrolled ? 'p-2' : 'p-4'} pointer-events-none`}>
      <nav className={`flex items-center justify-between w-full max-w-7xl h-14 px-6 rounded-full border border-border/50 bg-background/80 dark:bg-card/80 backdrop-blur-md shadow-sm pointer-events-auto transition-all duration-300 ${isScrolled ? 'max-w-6xl' : ''}`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="h-7 w-7 rounded-lg overflow-hidden relative">
            <Image src="/images/kawanbelanja.png" alt="Logo" fill sizes="28px" className="object-contain" />
          </div>
          <div className="flex items-center gap-0">
            <span className="text-xl font-black tracking-tighter text-primary">kawan</span>
            <span className="text-xl font-black tracking-tighter text-foreground">belanja</span>
          </div>
        </Link>

        {/* Desktop Nav - Centered */}
        <div className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
          <Link href="/" className="text-xs font-bold hover:text-primary transition-colors">Beranda</Link>

          {/* Katalog Mega Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-xs font-bold hover:text-primary transition-colors outline-none cursor-pointer">
              Katalog <ChevronDown className="h-3 w-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 rounded-2xl p-3 shadow-2xl border-border/50 backdrop-blur-lg">
              {/* Lihat semua link */}
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Grid3X3 className="h-3 w-3" /> Kategori
                </p>
                <Link href="/katalog" className="text-[10px] text-primary font-semibold hover:underline">
                  Lihat Semua →
                </Link>
              </div>
              {/* Mega Menu Grid */}
              <div className="grid grid-cols-3 gap-1">
                {categories.map((cat) => (
                  <DropdownMenuItem key={cat.id} asChild className="rounded-xl cursor-pointer p-0 focus:bg-transparent">
                    <Link
                      href={`/katalog?category=${cat.slug || cat.id}`}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors text-center group w-full"
                    >
                      {cat.iconUrl ? (
                        <Image src={cat.iconUrl} alt={cat.name} width={24} height={24} unoptimized className="object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-[10px] font-bold">
                          {cat.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-[10px] font-medium leading-tight line-clamp-2">{cat.name}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Role-based menu items */}
          {isLoggedIn && userRole === 'seller' && (
            <Link href="/seller-dashboard" className="text-xs font-bold hover:text-primary transition-colors flex items-center gap-1">
              <Store className="h-3 w-3" /> Dashboard
            </Link>
          )}

          {isLoggedIn && userRole === 'admin' && (
            <Link href="/admin-dashboard" className="text-xs font-bold hover:text-primary transition-colors flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Admin
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="hidden lg:flex relative">
            <Suspense fallback={<div className="h-10 w-64 bg-muted rounded-full animate-pulse" />}>
              <SearchBar />
            </Suspense>
          </div>

          <ThemeToggle />

          {/* Chat (Hidden on Mobile) */}
          {isLoggedIn && (
            <Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-colors relative" asChild>
              <Link href="/chat">
                <MessageCircle className="h-4 w-4" />
                {chatCount > 0 && (
                  <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-primary text-[8px] font-bold text-white flex items-center justify-center">{chatCount > 99 ? "99+" : chatCount}</span>
                )}
              </Link>
            </Button>
          )}

          {/* Notifications 🔔 */}
          {isLoggedIn && (
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-colors relative">
                  <Bell className="h-4 w-4" />
                  {notifCount > 0 && (
                    <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-destructive text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                      {notifCount > 99 ? "99+" : notifCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 rounded-xl shadow-2xl border-border/50" sideOffset={8}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                  <h4 className="text-sm font-bold">Notifikasi</h4>
                  {notifCount > 0 && (
                    <button className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1" onClick={handleMarkAllRead}>
                      <Check className="h-3 w-3" /> Tandai dibaca
                    </button>
                  )}
                </div>
                <div className="max-h-[360px] overflow-y-auto overscroll-contain">
                  {notifList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Bell className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-xs">Belum ada notifikasi</p>
                    </div>
                  ) : (
                    <div>
                      {notifList.slice(0, 15).map((notif) => (
                        <button
                          key={notif.id}
                          className={`w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex items-start gap-2.5 border-b border-border/20 last:border-0 ${!notif.isRead ? "bg-primary/5" : ""
                            }`}
                          onClick={async () => {
                            if (!notif.isRead) {
                              // Optimistic: badge -1
                              queryClient.setQueryData(["notif-unread-count"], (old) => ({
                                ...old, data: Math.max(0, (old?.data || 1) - 1)
                              }))
                              // Optimistic: item jadi isRead
                              queryClient.setQueryData(["my-notifications"], (old) => {
                                if (!old?.data) return old
                                return { ...old, data: old.data.map(n => n.id === notif.id ? { ...n, isRead: true } : n) }
                              })
                              // Server update
                              markNotifAsRead(notif.id)
                            }
                            if (notif.data?.orderId && notif.type?.startsWith("order")) {
                              router.push("/user-dashboard/orders")
                            } else if (notif.type === "new_order") {
                              router.push("/seller-dashboard/orders")
                            } else if (notif.type === "payment_success") {
                              router.push("/user-dashboard/orders")
                            }
                            setNotifOpen(false)
                          }}
                        >
                          <span className="text-base shrink-0 mt-0.5">{getNotifIcon(notif.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] font-semibold truncate ${!notif.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                              {notif.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{notif.message}</p>
                            <p className="text-[9px] text-muted-foreground/50 mt-0.5">{formatNotifTime(notif.createdAt)}</p>
                          </div>
                          {!notif.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Cart (Hidden on Mobile) */}
          <Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-colors relative" asChild>
            <Link href="/cart">
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">{cartCount > 99 ? "99+" : cartCount}</span>
              )}
            </Link>
          </Button>

          {/* Auth Section */}
          <div className="flex items-center gap-2">
            {isPending ? (
              <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            ) : isLoggedIn ? (
              /* Logged In — User Dropdown */
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20 hover:ring-primary/40 transition-all cursor-pointer">
                    <AvatarImage src={userImage} alt={userName} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 shadow-xl border-border/50">
                  {/* User Info */}
                  <DropdownMenuLabel className="px-3 py-2">
                    <p className="text-sm font-bold truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Menus */}
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2">
                    <Link href="/user-dashboard"><User className="h-3.5 w-3.5" /> Profil Saya</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2">
                    <Link href="/user-dashboard/address"><MapPin className="h-3.5 w-3.5" /> Alamat</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2">
                    <Link href="/user-dashboard/orders"><Package className="h-3.5 w-3.5" /> Pesanan Saya</Link>
                  </DropdownMenuItem>

                  {/* Seller / Admin specific */}
                  {userRole === 'user' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2 text-primary font-semibold">
                        <Link href="/create-store"><Store className="h-3.5 w-3.5" /> Buka Toko</Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {userRole === 'seller' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2">
                        <Link href="/seller-dashboard"><LayoutDashboard className="h-3.5 w-3.5" /> Dashboard Seller</Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {userRole === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="rounded-lg cursor-pointer gap-2">
                        <Link href="/admin-dashboard"><ShieldCheck className="h-3.5 w-3.5" /> Admin Dashboard</Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-lg cursor-pointer gap-2 text-red-500 focus:text-red-500">
                    <LogOut className="h-3.5 w-3.5" /> Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Not Logged In */
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="rounded-full h-9 text-xs font-semibold px-4 hidden sm:flex">
                  <Link href="/sign-up">Daftar</Link>
                </Button>
                <Button asChild variant="default" size="sm" className="rounded-full px-6 h-9 text-xs font-bold shadow-md shadow-primary/20 transition-transform active:scale-95 bg-primary hover:bg-primary/90">
                  <Link href="/sign-in">Masuk</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
