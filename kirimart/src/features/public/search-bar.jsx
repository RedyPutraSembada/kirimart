"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import Image from "next/image"
import { Search, Clock, TrendingUp, ArrowRight, Loader2, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useDebouncedCallback } from "use-debounce"
import { searchProductsAutocomplete } from "@/actions/public/search.actions"
import { formatPrice } from "@/lib/utils"

// ============================================
// CONSTANTS
// ============================================

const MAX_RECENT = 5
const STORAGE_KEY = "kirimart-recent-searches"

// ============================================
// HELPER
// ============================================

function getRecentSearches() {
	if (typeof window === "undefined") return []
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
	} catch {
		return []
	}
}

function saveRecentSearch(keyword) {
	if (!keyword.trim()) return
	const recent = getRecentSearches().filter((k) => k !== keyword)
	recent.unshift(keyword)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

// ============================================
// SEARCH BAR COMPONENT
// ============================================

export function SearchBar() {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	// Sinkronkan nilai input dengan URL saat user berada di halaman katalog
	const urlSearch = pathname === "/katalog" ? (searchParams.get("search") || "") : ""

	const [query, setQuery] = useState(urlSearch)
	const [debouncedQuery, setDebouncedQuery] = useState(urlSearch)
	const [isOpen, setIsOpen] = useState(false)
	const [recentSearches, setRecentSearches] = useState([])
	const inputRef = useRef(null)
	const containerRef = useRef(null)

	// Sinkronkan input saat URL berubah dari luar (misal: badge filter dihapus)
	useEffect(() => {
		setQuery(urlSearch)
		setDebouncedQuery(urlSearch)
	}, [urlSearch])

	// Debounce the search query to avoid spamming server requests
	const debounce = useDebouncedCallback((val) => setDebouncedQuery(val), 300)

	// Auto-fetch autocomplete results
	const { data: autocompleteResult, isFetching } = useQuery({
		queryKey: ["search-autocomplete", debouncedQuery],
		queryFn: () => searchProductsAutocomplete(debouncedQuery),
		enabled: debouncedQuery.trim().length >= 2,
		staleTime: 30_000,
	})
	const suggestions = autocompleteResult?.data || []

	// Load recent searches when dropdown opens
	useEffect(() => {
		if (isOpen) {
			setRecentSearches(getRecentSearches())
		}
	}, [isOpen])

	// Close dropdown on outside click
	useEffect(() => {
		function handleClickOutside(e) {
			if (containerRef.current && !containerRef.current.contains(e.target)) {
				setIsOpen(false)
			}
		}
		document.addEventListener("mousedown", handleClickOutside)
		return () => document.removeEventListener("mousedown", handleClickOutside)
	}, [])

	// Keyboard shortcut Ctrl+K or Cmd+K to focus
	useEffect(() => {
		function handleKeyDown(e) {
			if ((e.ctrlKey || e.metaKey) && e.key === "k") {
				e.preventDefault()
				inputRef.current?.focus()
				setIsOpen(true)
			}
			if (e.key === "Escape") {
				setIsOpen(false)
				inputRef.current?.blur()
			}
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [])

	const handleInputChange = (e) => {
		const val = e.target.value
		setQuery(val)
		debounce(val)
		if (!isOpen) setIsOpen(true)
	}

	const handleSubmit = (keyword = query) => {
		const trimmed = keyword.trim()
		if (!trimmed) return
		saveRecentSearch(trimmed)
		setIsOpen(false)
		setQuery(trimmed)
		// Gunakan param "search" agar sinkron dengan catalog-list.jsx
		router.push(`/katalog?search=${encodeURIComponent(trimmed)}`)
	}

	const handleKeyDown = (e) => {
		if (e.key === "Enter") handleSubmit()
	}

	const handleClear = () => {
		setQuery("")
		setDebouncedQuery("")
		inputRef.current?.focus()
	}

	const handleSuggestionClick = (product) => {
		saveRecentSearch(product.name)
		setIsOpen(false)
		router.push(`/product/${product.id}`)
	}

	const showRecent = query.trim().length < 2
	const showSuggestions = query.trim().length >= 2

	return (
		<div ref={containerRef} className="relative">
			{/* Input */}
			<div className="relative group">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={handleInputChange}
					onFocus={() => setIsOpen(true)}
					onKeyDown={handleKeyDown}
					placeholder="Cari produk... (Ctrl+K)"
					className="pl-9 pr-8 h-9 w-44 rounded-full bg-muted/50 border border-transparent focus:border-primary/30 text-xs focus:w-60 transition-all duration-300 outline-none focus:bg-background focus:shadow-sm"
				/>
				{query && (
					<button
						onClick={handleClear}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
					>
						<X className="h-3 w-3" />
					</button>
				)}
				{isFetching && !query && (
					<Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
				)}
			</div>

			{/* Dropdown */}
			{isOpen && (
				<div className="absolute top-full mt-2 right-0 w-80 bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">

					{/* Autocomplete Results */}
					{showSuggestions && (
						<div>
							{isFetching ? (
								<div className="flex items-center gap-2 px-4 py-3 text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span className="text-xs">Mencari...</span>
								</div>
							) : suggestions.length > 0 ? (
								<>
									<p className="text-[10px] font-semibold text-muted-foreground px-4 pt-3 pb-1 uppercase tracking-wider">
										Produk
									</p>
									{suggestions.map((product) => {
										const img = product.images?.[0]?.imageUrl
										return (
											<button
												key={product.id}
												onClick={() => handleSuggestionClick(product)}
												className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left group"
											>
												<div className="h-10 w-10 rounded-lg bg-muted overflow-hidden shrink-0 relative">
													{img && <Image src={img} alt={product.name} fill sizes="40px" className="object-cover" />}
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{product.name}</p>
													<p className="text-[10px] text-muted-foreground">{formatPrice(product.basePrice)}</p>
												</div>
											</button>
										)
									})}
									<button
										onClick={() => handleSubmit()}
										className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-primary font-semibold hover:bg-primary/5 transition-colors border-t border-border/40"
									>
										<span>Lihat semua hasil untuk &ldquo;{query}&rdquo;</span>
										<ArrowRight className="h-3.5 w-3.5" />
									</button>
								</>
							) : (
								<div className="px-4 py-6 text-center">
									<p className="text-xs text-muted-foreground">Tidak ada produk untuk &ldquo;{query}&rdquo;</p>
									<button
										onClick={() => handleSubmit()}
										className="text-xs text-primary font-semibold mt-1 hover:underline"
									>
										Cari di Katalog →
									</button>
								</div>
							)}
						</div>
					)}

					{/* Recent Searches */}
					{showRecent && (
						<div>
							{recentSearches.length > 0 ? (
								<>
									<p className="text-[10px] font-semibold text-muted-foreground px-4 pt-3 pb-1 uppercase tracking-wider flex items-center gap-1.5">
										<Clock className="h-3 w-3" /> Pencarian Terakhir
									</p>
									{recentSearches.map((keyword) => (
										<button
											key={keyword}
											onClick={() => handleSubmit(keyword)}
											className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-muted/60 transition-colors text-left"
										>
											<Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
											<span className="text-xs">{keyword}</span>
										</button>
									))}
								</>
							) : (
								<>
									<p className="text-[10px] font-semibold text-muted-foreground px-4 pt-3 pb-1 uppercase tracking-wider flex items-center gap-1.5">
										<TrendingUp className="h-3 w-3" /> Mulai Mencari
									</p>
									<p className="text-xs text-muted-foreground px-4 pb-4">
										Ketik nama produk yang ingin Anda cari
									</p>
								</>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	)
}
