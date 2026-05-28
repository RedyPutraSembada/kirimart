"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useGetProductById } from "@/app/data/seller-dashboard/product/product-data"
import Image from "next/image"
import { Package, Layers } from "lucide-react"

const statusCfg = {
    active: { label: "Aktif", cls: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950" },
    out_of_stock: { label: "Habis", cls: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950" },
    low_stock: { label: "Stok Menipis", cls: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950" },
    draft: { label: "Draft", cls: "border-gray-300 text-gray-600 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-950" },
    inactive: { label: "Nonaktif", cls: "border-gray-300 text-gray-600 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-950" },
    banned: { label: "Banned", cls: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950" },
}
const DEFAULT_STATUS = { label: "Tidak Diketahui", cls: "border-gray-300 text-gray-500 bg-gray-50" }

const fmt = (n) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function ProductViewSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-20 rounded-lg" />
                ))}
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ViewProductModal({ productId, open, onClose }) {
    const [activeImg, setActiveImg] = useState(0)

    const { data, isLoading, error } = useGetProductById(productId)
    const product = data?.data

    // Reset active image saat modal dibuka dengan produk berbeda
    const handleOpenChange = (val) => {
        if (!val) {
            setActiveImg(0)
            onClose()
        }
    }

    const st = statusCfg[product?.status] ?? DEFAULT_STATUS
    const hasVariants = product?.options?.length > 0

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Detail Produk</DialogTitle>
                </DialogHeader>

                {isLoading && <ProductViewSkeleton />}

                {error && (
                    <p className="text-sm text-destructive">Gagal memuat data produk.</p>
                )}

                {!isLoading && product && (
                    <div className="space-y-5">
                        {/* Gambar */}
                        {product.images?.length > 0 ? (
                            <div className="space-y-2">
                                {/* Gambar utama */}
                                <div className="relative h-64 w-full rounded-lg border bg-muted/50 overflow-hidden">
                                    <Image
                                        src={product.images[activeImg]?.imageUrl}
                                        alt={product.name}
                                        fill
                                        unoptimized
                                        className="object-contain"
                                    />
                                </div>
                                {/* Thumbnail */}
                                {product.images.length > 1 && (
                                    <div className="flex gap-2 flex-wrap">
                                        {product.images.map((img, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setActiveImg(i)}
                                                className={`relative h-16 w-16 rounded-md border-2 overflow-hidden transition-colors ${activeImg === i ? "border-primary" : "border-transparent"
                                                    }`}
                                            >
                                                <Image
                                                    src={img.imageUrl}
                                                    alt={`Foto ${i + 1}`}
                                                    fill
                                                    unoptimized
                                                    className="object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/50">
                                <Package className="h-10 w-10 text-muted-foreground" />
                            </div>
                        )}

                        {/* Nama & status */}
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="text-lg font-semibold leading-tight">{product.name}</h2>
                            <Badge variant="outline" className={`shrink-0 ${st.cls}`}>{st.label}</Badge>
                        </div>

                        {/* Deskripsi */}
                        {product.description && (
                            <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
                        )}

                        <Separator />

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div>
                                <p className="text-muted-foreground">Kategori</p>
                                <p className="font-medium">{product.category?.name ?? "-"}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{hasVariants ? "Harga Dasar" : "Harga"}</p>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium">{fmt(product.basePrice)}</p>
                                    {product.originalPrice && (
                                        <p className="text-xs text-muted-foreground line-through">{fmt(product.originalPrice)}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{hasVariants ? "Stok Dasar" : "Stok"}</p>
                                <p className="font-medium">{product.baseStock}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Terjual</p>
                                <p className="font-medium">{product.soldCount ?? 0}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Berat</p>
                                <p className="font-medium">{product.weightGram} gram</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Rating</p>
                                <p className="font-medium">⭐ {product.rating ?? "5.0"}</p>
                            </div>
                        </div>

                        {/* Varian Section */}
                        {hasVariants && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-primary" />
                                        <h3 className="font-semibold text-sm">Opsi Varian</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {product.options.map((opt) => (
                                            <div key={opt.id} className="text-xs">
                                                <span className="font-medium text-muted-foreground">{opt.name}: </span>
                                                {opt.values?.map((v, i) => (
                                                    <Badge key={i} variant="secondary" className="mr-1 mb-1 text-xs">{v}</Badge>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {product.variants?.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-sm">Daftar Kombinasi ({product.variants.length} aktif)</h3>
                                        <div className="rounded-lg border overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-muted/50 border-b">
                                                        <th className="p-2.5 text-left font-medium text-muted-foreground">Kombinasi</th>
                                                        <th className="p-2.5 text-right font-medium text-muted-foreground">Harga</th>
                                                        <th className="p-2.5 text-center font-medium text-muted-foreground">Stok</th>
                                                        <th className="p-2.5 text-left font-medium text-muted-foreground">SKU</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {product.variants.map((v) => (
                                                        <tr key={v.id}>
                                                            <td className="p-2.5">
                                                                <div className="flex gap-1 flex-wrap">
                                                                    {Object.entries(v.attributes || {}).map(([key, val]) => (
                                                                        <Badge key={key} variant="outline" className="text-[10px] py-0">{val}</Badge>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="p-2.5 text-right font-medium">{fmt(v.price)}</td>
                                                            <td className="p-2.5 text-center">{v.stock}</td>
                                                            <td className="p-2.5 text-muted-foreground">{v.sku || "—"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}