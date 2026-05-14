"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Image as ImageIcon, ArrowLeft, Search, MoreVertical, Phone, Check, CheckCheck, Store, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import Link from "next/link"

const MY_ID = "user-1"

const MOCK_CONVERSATIONS = [
  {
    id: 1,
    store: { name: "Cartiera Official", logo: "/images/kawanbelanja.png", slug: "cartiera-official", isOnline: true, isStar: true },
    lastMessage: "Baik kak, stok warna Jet Black ready semua ya 🙏",
    lastTime: "14:32",
    unread: 2,
    messages: [
      { id: 1, senderId: "user-1", body: "Halo kak, mau tanya stok Polo Shirt warna Jet Black ukuran M masih ada?", createdAt: "14:20" },
      { id: 2, senderId: "store-1", body: "Halo kak! Terima kasih sudah menghubungi Cartiera Official 😊", createdAt: "14:22" },
      { id: 3, senderId: "store-1", body: "Untuk Polo Shirt Scuba 280 GSM warna Jet Black ukuran M masih ready kak, stok masih banyak.", createdAt: "14:23" },
      { id: 4, senderId: "user-1", body: "Kalau warna Brown ada juga kak?", createdAt: "14:25" },
      { id: 5, senderId: "store-1", body: "Ada kak, warna Brown juga ready. Mau sekalian order kak?", createdAt: "14:27" },
      { id: 6, senderId: "user-1", body: "Oke kak, saya ambil yang Jet Black aja dulu. Bisa dikasih harga spesial gak kak kalau beli 2?", createdAt: "14:29" },
      { id: 7, senderId: "store-1", body: "Boleh kak, kalau beli 2 saya kasih diskon 10% ya. Langsung checkout aja kak 🛒", createdAt: "14:30" },
      { id: 8, senderId: "store-1", body: "Baik kak, stok warna Jet Black ready semua ya 🙏", createdAt: "14:32" },
    ],
    product: { name: "Polo Shirt Pria Scuba 280 GSM", img: "/images/ml.png", price: 139885, id: 1 },
  },
  {
    id: 2,
    store: { name: "Nike Indonesia", logo: "/images/kawanbelanja.png", slug: "nike-indonesia", isOnline: false, isStar: false },
    lastMessage: "Estimasi pengiriman 2-3 hari kerja kak",
    lastTime: "Kemarin",
    unread: 0,
    messages: [
      { id: 1, senderId: "user-1", body: "Kak, Air Max 270 ukuran 42 ready?", createdAt: "Kemarin 10:15" },
      { id: 2, senderId: "store-2", body: "Ready kak, mau order?", createdAt: "Kemarin 10:30" },
      { id: 3, senderId: "user-1", body: "Berapa lama pengirimannya kak?", createdAt: "Kemarin 10:32" },
      { id: 4, senderId: "store-2", body: "Estimasi pengiriman 2-3 hari kerja kak", createdAt: "Kemarin 10:45" },
    ],
    product: null,
  },
  {
    id: 3,
    store: { name: "TechZone Store", logo: "/images/kawanbelanja.png", slug: "techzone", isOnline: true, isStar: true },
    lastMessage: "Untuk garansi 1 tahun resmi ya kak",
    lastTime: "12:05",
    unread: 0,
    messages: [
      { id: 1, senderId: "user-1", body: "Headphone ANC nya ada garansi kak?", createdAt: "11:50" },
      { id: 2, senderId: "store-3", body: "Untuk garansi 1 tahun resmi ya kak", createdAt: "12:05" },
    ],
    product: { name: "Headphone Bluetooth ANC 40 Jam", img: "/images/ml.png", price: 449000, id: 4 },
  },
]

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function ChatView() {
  const [activeConvId, setActiveConvId] = useState(null)
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS)
  const [inputMsg, setInputMsg] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const chatEndRef = useRef(null)

  const activeConv = conversations.find(c => c.id === activeConvId)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeConv?.messages?.length])

  const sendMessage = () => {
    if (!inputMsg.trim() || !activeConvId) return
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    setConversations(prev => prev.map(c => {
      if (c.id !== activeConvId) return c
      return {
        ...c,
        lastMessage: inputMsg.trim(),
        lastTime: timeStr,
        messages: [...c.messages, { id: Date.now(), senderId: MY_ID, body: inputMsg.trim(), createdAt: timeStr }],
      }
    }))
    setInputMsg("")
  }

  const filteredConvs = conversations.filter(c =>
    c.store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto px-0 md:px-6 max-w-7xl">
      <div className="flex h-[calc(100vh-7rem)] bg-card border border-border/50 rounded-none md:rounded-2xl overflow-hidden shadow-sm">

        {/* ─── Left: Conversation List ─── */}
        <div className={cn(
          "w-full md:w-80 lg:w-96 border-r border-border/50 flex flex-col shrink-0 bg-background",
          activeConvId ? "hidden md:flex" : "flex"
        )}>
          {/* Header */}
          <div className="p-4 border-b border-border/50 space-y-3">
            <h2 className="text-lg font-bold">Chat</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari percakapan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs bg-muted/50 border-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada percakapan</div>
            ) : (
              filteredConvs.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 text-left transition-colors border-b border-border/30",
                    activeConvId === conv.id ? "bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="h-11 w-11 rounded-full overflow-hidden bg-white border">
                      <img src={conv.store.logo} alt={conv.store.name} className="h-full w-full object-contain" />
                    </div>
                    {conv.store.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate max-w-[120px]">{conv.store.name}</span>
                        {conv.store.isStar && <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[8px] font-bold px-1 py-0 h-3.5 border-none">Star</Badge>}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{conv.lastTime}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{conv.lastMessage}</p>
                      {conv.unread > 0 && (
                        <span className="h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shrink-0">{conv.unread}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ─── Right: Chat Area ─── */}
        {activeConv ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden shrink-0" onClick={() => setActiveConvId(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="relative">
                  <div className="h-9 w-9 rounded-full overflow-hidden bg-white border">
                    <img src={activeConv.store.logo} alt={activeConv.store.name} className="h-full w-full object-contain" />
                  </div>
                  {activeConv.store.isOnline && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold">{activeConv.store.name}</h3>
                    {activeConv.store.isStar && <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[8px] font-bold px-1 py-0 h-3.5 border-none">Star</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{activeConv.store.isOnline ? "Online" : "Offline"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href={`/store/${activeConv.store.slug}`}><Store className="h-4 w-4" /></Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Pinned Product */}
            {activeConv.product && (
              <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30">
                <Link href={`/product/${activeConv.product.id}`} className="flex items-center gap-3 group">
                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted border shrink-0">
                    <img src={activeConv.product.img} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{activeConv.product.name}</p>
                    <p className="text-xs font-bold text-primary">{fmt(activeConv.product.price)}</p>
                  </div>
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/20">
              {activeConv.messages.map(msg => {
                const isMe = msg.senderId === MY_ID
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] md:max-w-[65%] rounded-2xl px-3.5 py-2 space-y-1",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border/50 rounded-bl-md"
                    )}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      <div className={cn("flex items-center gap-1 justify-end", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                        <span className="text-[9px]">{msg.createdAt}</span>
                        {isMe && <CheckCheck className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border/50 bg-background">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary">
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <Input
                  placeholder="Tulis pesan..."
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  className="h-9 rounded-full text-sm bg-muted/50 border-none"
                />
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0"
                  onClick={sendMessage}
                  disabled={!inputMsg.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center p-8 bg-muted/10">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Send className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Pilih Percakapan</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Pilih percakapan di sebelah kiri untuk mulai chat dengan penjual</p>
          </div>
        )}
      </div>
    </div>
  )
}
