'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Home, Grid3X3, ShoppingCart, MessageCircle, User } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { useQuery } from '@tanstack/react-query'
import { getCartSummary } from '@/actions/public/cart.actions'
import { getUnreadChatCount } from '@/actions/public/chat.actions'
import { cn } from '@/lib/utils'

export function BottomNavigator() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isLoggedIn = !!session?.user
  
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cart badge
  const { data: cartData } = useQuery({
    queryKey: ["cart-summary", session?.user?.id],
    queryFn: getCartSummary,
    enabled: isLoggedIn,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  })
  const cartCount = isLoggedIn ? (cartData?.data?.totalItems || 0) : 0

  // Chat badge
  const { data: chatUnread } = useQuery({
    queryKey: ["chat-unread-count", session?.user?.id],
    queryFn: getUnreadChatCount,
    enabled: isLoggedIn,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  })
  const chatCount = isLoggedIn ? (chatUnread?.data || 0) : 0

  const navItems = [
    {
      title: 'Beranda',
      path: '/',
      icon: Home,
    },
    {
      title: 'Katalog',
      path: '/katalog',
      icon: Grid3X3,
    },
    {
      title: 'Keranjang',
      path: '/cart',
      icon: ShoppingCart,
      badge: cartCount,
    },
    {
      title: 'Chat',
      path: '/chat',
      icon: MessageCircle,
      badge: chatCount,
    },
    {
      title: 'Akun',
      path: mounted && isLoggedIn ? '/user-dashboard' : '/sign-in',
      icon: User,
    }
  ]

  // Sembunyikan bottom nav di dashboard penjual atau admin
  if (pathname.startsWith('/seller-dashboard') || pathname.startsWith('/admin-dashboard')) {
    return null
  }

  return (
    <div className='fixed bottom-0 left-0 z-50 w-full h-16 bg-background/95 backdrop-blur-md border-t border-border/50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden'>
      <div className='grid h-full max-w-lg grid-cols-5 mx-auto px-2'>
        {navItems.map((item, idx) => {
          // Khusus untuk home, harus exact match
          const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
          const Icon = item.icon

          return (
            <Link
              key={idx}
              href={item.path}
              className={cn(
                "inline-flex flex-col items-center justify-center group py-1 relative transition-colors duration-200",
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive ? 'scale-110 fill-primary/10' : 'group-hover:scale-105'
                  )}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-4 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className='capitalize text-[10px] mt-1 font-medium'>
                {item.title}
              </span>
              {isActive && (
                <span className='absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full' />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
