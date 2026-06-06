import { Navbar } from "@/features/public/navbar"
import { Footer } from "@/features/public/footer"
import { BottomNavigator } from "@/components/layout/public/bottom-navigator"

export default function PublicLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-16 md:pb-0">
        {children}
      </main>
      <Footer />
      <BottomNavigator />
    </div>
  )
}
