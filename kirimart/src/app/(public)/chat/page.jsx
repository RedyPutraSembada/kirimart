import { ChatView } from "@/features/public/chat-view"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export const metadata = {
  title: "Chat - Kawan Belanja",
  description: "Chat dengan penjual untuk tanya produk dan nego harga",
}

export default async function ChatPage({ searchParams }) {
  // 1. Cek autentikasi — chat butuh login
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect("/sign-in?callbackUrl=/chat")
  }

  // 2. Ambil session token dari cookie
  const cookieStore = await cookies()
  
  // Better Auth cookie: bisa include CSRF signature setelah titik
  // Format cookie: "token.csrfSignature" → kita hanya butuh bagian "token"
  const rawCookieValue = cookieStore.get("better-auth.session_token")?.value || null
  
  // Better Auth menyimpan "token.csrfHash" di cookie, tapi di DB hanya "token"
  // Split by "." dan ambil bagian pertama
  const sessionToken = rawCookieValue?.split(".")[0] || null
  
  console.log("[CHAT PAGE] Raw cookie value:", rawCookieValue)
  console.log("[CHAT PAGE] Extracted token:", sessionToken)
  console.log("[CHAT PAGE] Token length:", sessionToken?.length)

  // 3. Ambil params dari URL
  const params = await searchParams
  const initialConversationId = params?.conv ? parseInt(params.conv) : null

  // 4. Ambil product context jika ada
  let productContext = null
  if (params?.productId) {
    productContext = {
      id: parseInt(params.productId),
      name: params.productName ? decodeURIComponent(params.productName) : "",
      image: params.productImage ? decodeURIComponent(params.productImage) : "",
      price: params.productPrice ? parseInt(params.productPrice) : 0,
    }
  }

  return (
    <ChatView
      sessionToken={sessionToken}
      currentUserId={session.user.id}
      initialConversationId={initialConversationId}
      productContext={productContext}
    />
  )
}
