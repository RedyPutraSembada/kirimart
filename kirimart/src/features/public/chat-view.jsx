"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Image as ImageIcon, ArrowLeft, Search, MoreVertical, CheckCheck, Store, Package, Loader2, MessageSquare, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getMyConversations, getConversationMessages, sendMessage as sendMessageAction } from "@/actions/public/chat.actions"
import { useSocket } from "@/hooks/use-socket"
import { uploadFile } from "@/lib/upload"
import { toast } from "sonner"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

/**
 * @param {Object} props
 * @param {string} props.sessionToken
 * @param {string} props.currentUserId
 * @param {number|null} props.initialConversationId
 * @param {Object|null} props.productContext — produk yang dibawa dari halaman detail
 */
export function ChatView({ sessionToken, currentUserId, initialConversationId = null, productContext = null }) {
  const [activeConvId, setActiveConvId] = useState(initialConversationId)
  const [inputMsg, setInputMsg] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [localMessages, setLocalMessages] = useState([])
  const [typingUsers, setTypingUsers] = useState({}) // { conversationId: { userName, timeout } }
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const chatScrollRef = useRef(null) // Ref ke container scroll chat, BUKAN ke halaman
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const queryClient = useQueryClient()

  // ─── SOCKET.IO CONNECTION ───
  const { socket, isConnected } = useSocket("/chat", {
    sessionToken,
  })

  // ─── FETCH CONVERSATIONS ───
  const { data: convsResult, isLoading: convsLoading } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => getMyConversations(),
    refetchInterval: 30000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    staleTime: 0,
  })

  const conversations = convsResult?.data || []

  // ─── FETCH MESSAGES ───
  const { data: msgsResult, isLoading: msgsLoading } = useQuery({
    queryKey: ["chat-messages", activeConvId],
    queryFn: () => getConversationMessages(activeConvId),
    enabled: !!activeConvId,
    refetchOnMount: "always",
    staleTime: 0,
  })

  const dbMessages = msgsResult?.data || []

  // Gabungkan pesan DB + local, hindari duplikat
  const allMessages = [
    ...dbMessages,
    ...localMessages.filter(lm => !dbMessages.some(dm => dm.id === lm.id))
  ]

  const activeConv = conversations.find(c => c.id === activeConvId)

  // ─── Hapus temp messages saat dbMessages berubah (fix duplikat) ───
  useEffect(() => {
    if (dbMessages.length > 0) {
      setLocalMessages(prev => prev.filter(m => !String(m.id).startsWith("temp-")))
    }
  }, [dbMessages])

  // ─── SOCKET.IO: JOIN ROOM & LISTEN ───
  useEffect(() => {
    if (!socket || !activeConvId) return

    socket.emit("join-conversation", { conversationId: activeConvId })

    const handleNewMessage = (data) => {
      if (data.conversationId !== activeConvId) return
      if (data.message.senderId === currentUserId) return

      setLocalMessages(prev => {
        // Cek duplikat
        if (prev.some(m => m.id === data.message.id)) return prev
        return [...prev, {
          id: data.message.id,
          senderId: data.message.senderId,
          senderName: data.message.senderName,
          body: data.message.body,
          imageUrl: data.message.imageUrl,
          createdAt: data.message.createdAt,
        }]
      })

      // Langsung update sidebar cache
      queryClient.setQueryData(["chat-conversations"], (old) => {
        if (!old?.data) return old
        const updated = old.data.map((conv) =>
          conv.id === activeConvId
            ? { ...conv, lastMessage: data.message.body || "📷 Gambar", lastTime: "Baru saja" }
            : conv
        )
        updated.sort((a, b) => {
          if (a.id === activeConvId) return -1
          if (b.id === activeConvId) return 1
          return 0
        })
        return { ...old, data: updated }
      })

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })
      }, 2000)
    }

    const handleTyping = (data) => {
      if (data.conversationId !== activeConvId) return
      setTypingUsers(prev => {
        // Clear previous timeout for this user
        if (prev[data.userId]?.timeout) {
          clearTimeout(prev[data.userId].timeout)
        }

        if (data.isTyping) {
          const timeout = setTimeout(() => {
            setTypingUsers(p => {
              const copy = { ...p }
              delete copy[data.userId]
              return copy
            })
          }, 3000)
          return { ...prev, [data.userId]: { userName: data.userName, timeout } }
        } else {
          const copy = { ...prev }
          delete copy[data.userId]
          return copy
        }
      })
    }

    socket.on("new-message", handleNewMessage)
    socket.on("user-typing", handleTyping)

    return () => {
      socket.emit("leave-conversation", { conversationId: activeConvId })
      socket.off("new-message", handleNewMessage)
      socket.off("user-typing", handleTyping)
    }
  }, [socket, activeConvId, currentUserId, queryClient])

  // ─── SOCKET.IO: LISTEN SIDEBAR UPDATES (untuk semua conversation) ───
  useEffect(() => {
    if (!socket) return

    const handleSidebarUpdate = (data) => {
      // LANGSUNG update cache sidebar (bukan menunggu refetch dari server)
      queryClient.setQueryData(["chat-conversations"], (old) => {
        if (!old?.data) return old
        const updated = old.data.map((conv) =>
          conv.id === data.conversationId
            ? { ...conv, lastMessage: data.lastMessage, lastTime: "Baru saja" }
            : conv
        )
        // Sort: conversation dengan pesan terbaru di atas
        updated.sort((a, b) => {
          if (a.id === data.conversationId) return -1
          if (b.id === data.conversationId) return 1
          return 0
        })
        return { ...old, data: updated }
      })

      // Update unread count jika pesan BUKAN dari kita
      if (data.senderId !== currentUserId) {
        queryClient.setQueryData(["chat-unread-count"], (old) => {
          const currentCount = old?.data || 0
          return { ...old, success: true, data: currentCount + 1 }
        })
        // Broadcast ke navbar agar badge update real-time
        try {
          const channel = new BroadcastChannel('kawanbelanja-chat')
          channel.postMessage({ type: 'unread-update' })
          channel.close()
        } catch (e) { /* BroadcastChannel not supported */ }
      }

      // Delayed refetch sebagai backup sync — tidak langsung agar optimistic update tidak tertimpa
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })
        queryClient.invalidateQueries({ queryKey: ["chat-unread-count"] })
      }, 2000)
    }

    socket.on("sidebar-update", handleSidebarUpdate)

    return () => {
      socket.off("sidebar-update", handleSidebarUpdate)
    }
  }, [socket, queryClient, currentUserId])

  // ─── AUTO SCROLL DALAM CONTAINER CHAT (bukan halaman) ───
  useEffect(() => {
    const container = chatScrollRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [allMessages.length])

  // ─── CLEAR LOCAL MESSAGES saat ganti conversation ───
  useEffect(() => {
    setLocalMessages([])
    setTypingUsers({})
  }, [activeConvId])

  // ─── SEND MESSAGE ───
  const sendMutation = useMutation({
    mutationFn: ({ convId, body, imageUrl }) => sendMessageAction(convId, body, imageUrl),
    onSuccess: (result) => {
      if (result.success) {
        // Messages: refetch langsung agar temp messages diganti real messages
        queryClient.invalidateQueries({ queryKey: ["chat-messages", activeConvId] })
        // Conversations: delay agar optimistic sidebar update tidak tertimpa
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })
        }, 2000)
      }
    },
  })

  const handleSendMessage = useCallback(() => {
    if (!inputMsg.trim() || !activeConvId) return

    const body = inputMsg.trim()

    // Optimistic update — sidebar langsung update
    queryClient.setQueryData(["chat-conversations"], (old) => {
      if (!old?.data) return old
      const updated = old.data.map((conv) =>
        conv.id === activeConvId
          ? { ...conv, lastMessage: body, lastTime: "Baru saja" }
          : conv
      )
      updated.sort((a, b) => {
        if (a.id === activeConvId) return -1
        if (b.id === activeConvId) return 1
        return 0
      })
      return { ...old, data: updated }
    })

    // Optimistic update — bubble chat
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      body,
      imageUrl: null,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    }
    setLocalMessages(prev => [...prev, optimisticMsg])
    setInputMsg("")
    inputRef.current?.focus()

    // Stop typing indicator
    if (socket && activeConvId) {
      socket.emit("typing", { conversationId: activeConvId, isTyping: false })
    }

    sendMutation.mutate({ convId: activeConvId, body })
  }, [inputMsg, activeConvId, currentUserId, sendMutation, socket, queryClient])

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !activeConvId) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 2MB")
      return
    }

    try {
      setIsUploadingImage(true)
      const url = await uploadFile(file)
      if (!url) {
        toast.error("Gagal mengupload gambar")
        return
      }

      // Optimistic update
      const optimisticMsg = {
        id: `temp-${Date.now()}`,
        senderId: currentUserId,
        body: "",
        imageUrl: url,
        createdAt: new Date().toISOString(),
        _optimistic: true,
      }
      setLocalMessages(prev => [...prev, optimisticMsg])

      sendMutation.mutate({ convId: activeConvId, body: "", imageUrl: url })
    } catch (error) {
      console.error(error)
      toast.error("Terjadi kesalahan saat upload")
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ─── TYPING INDICATOR — emit saat mengetik ───
  const handleInputChange = useCallback((e) => {
    setInputMsg(e.target.value)

    if (socket && activeConvId) {
      socket.emit("typing", { conversationId: activeConvId, isTyping: true })

      // Auto stop typing after 2 detik tidak ketik
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", { conversationId: activeConvId, isTyping: false })
      }, 2000)
    }
  }, [socket, activeConvId])

  // ─── SEARCH FILTER ───
  const filteredConvs = conversations.filter(c =>
    c.store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.buyer?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatMsgTime = (dateStr) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  }

  // Nama-nama yang sedang mengetik
  const typingNames = Object.values(typingUsers).map(t => t.userName).filter(Boolean)

  // ─── RENDER ───
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Chat</h2>
              <div className="flex items-center gap-1.5">
                {isConnected ? (
                  <Badge variant="outline" className="text-[9px] gap-1 text-green-600 border-green-200 bg-green-50">
                    <Wifi className="h-2.5 w-2.5" /> Live
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] gap-1 text-muted-foreground">
                    <WifiOff className="h-2.5 w-2.5" /> Offline
                  </Badge>
                )}
              </div>
            </div>
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
            {convsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {conversations.length === 0
                    ? "Belum ada percakapan. Mulai chat dari halaman produk!"
                    : "Tidak ada percakapan yang cocok"}
                </p>
              </div>
            ) : (
              filteredConvs.map(conv => {
                const displayName = conv.isSeller ? conv.buyer.name : conv.store.name
                const displayLogo = conv.isSeller
                  ? (conv.buyer.image || "/images/kawanbelanja.png")
                  : conv.store.logo

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-4 text-left transition-colors border-b border-border/30",
                      activeConvId === conv.id ? "bg-primary/5" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-full overflow-hidden bg-white border relative">
                        <Image src={displayLogo} alt={displayName} fill sizes="44px" className="object-contain" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold truncate max-w-[120px]">{displayName}</span>
                          {!conv.isSeller && conv.store.isStar && (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[8px] font-bold px-1 py-0 h-3.5 border-none">Star</Badge>
                          )}
                          {conv.isSeller && (
                            <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/10 text-[8px] font-bold px-1 py-0 h-3.5 border-none">Pembeli</Badge>
                          )}
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
                )
              })
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
                  <div className="h-9 w-9 rounded-full overflow-hidden bg-white border relative">
                    <Image
                      src={activeConv.isSeller ? (activeConv.buyer.image || "/images/kawanbelanja.png") : activeConv.store.logo}
                      alt=""
                      fill
                      sizes="36px"
                      className="object-contain"
                    />
                  </div>
                  {isConnected && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold">
                      {activeConv.isSeller ? activeConv.buyer.name : activeConv.store.name}
                    </h3>
                    {!activeConv.isSeller && activeConv.store.isStar && (
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[8px] font-bold px-1 py-0 h-3.5 border-none">Star</Badge>
                    )}
                  </div>
                  {typingNames.length > 0 ? (
                    <p className="text-[10px] text-green-600 animate-pulse">
                      {typingNames.join(", ")} sedang mengetik...
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      {isConnected ? "Online" : "Offline"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!activeConv.isSeller && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href={`/store/${activeConv.store.slug}`}><Store className="h-4 w-4" /></Link>
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Pinned Product Context — dari DB (tersedia untuk buyer DAN seller) */}
            {(() => {
              // Prioritas: data dari DB, fallback ke URL params
              const pc = activeConv?.productContext || (activeConvId === initialConversationId ? productContext : null)
              if (!pc) return null
              return (
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30">
                  <Link href={`/product/${pc.id}`} className="flex items-center gap-3 group">
                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted border shrink-0 relative">
                      <Image src={pc.image} alt="" fill sizes="40px" className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{pc.name}</p>
                      <p className="text-xs font-bold text-primary">{fmt(pc.price)}</p>
                    </div>
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                </div>
              )
            })()}

            {/* Messages */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/20">
              {msgsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : allMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada pesan. Mulai percakapan!</p>
                </div>
              ) : (
                allMessages.map(msg => {
                  const isMe = msg.senderId === currentUserId
                  return (
                    <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[75%] md:max-w-[65%] rounded-2xl px-3.5 py-2 space-y-1",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border/50 rounded-bl-md",
                        msg._optimistic && "opacity-70"
                      )}>
                        {msg.imageUrl && (
                          <div className="relative h-48 w-48 max-w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
                            {msg.imageUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i) ? (
                              <video src={msg.imageUrl} controls className="max-w-full max-h-full object-contain" />
                            ) : (
                              <Image src={msg.imageUrl} alt="" fill sizes="192px" className="object-cover" />
                            )}
                          </div>
                        )}
                        {msg.body && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                        )}
                        <div className={cn("flex items-center gap-1 justify-end", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                          <span className="text-[9px]">{formatMsgTime(msg.createdAt)}</span>
                          {isMe && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}

              {/* Typing indicator bubble */}
              {typingNames.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border/50 bg-background">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, video/mp4, video/webm, video/quicktime"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                </Button>
                <Input
                  ref={inputRef}
                  placeholder="Tulis pesan..."
                  value={inputMsg}
                  onChange={handleInputChange}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                  className="h-9 rounded-full text-sm bg-muted/50 border-none"
                />
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0"
                  onClick={handleSendMessage}
                  disabled={!inputMsg.trim() || sendMutation.isPending}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
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
