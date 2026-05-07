"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save, Image as ImageIcon, Plus, X } from "lucide-react"
import Link from "next/link"

const categories = [
	{ id: 1, name: "Sepatu" },
	{ id: 2, name: "Pakaian" },
	{ id: 3, name: "Tas" },
	{ id: 4, name: "Aksesoris" },
	{ id: 5, name: "Elektronik" },
]

export function FormCreateProduct() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="outline" size="icon" asChild>
					<Link href="/seller-dashboard/products"><ArrowLeft className="h-4 w-4" /></Link>
				</Button>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Tambah Produk Baru</h1>
					<p className="text-muted-foreground">Isi detail produk yang ingin Anda jual.</p>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Main Form */}
				<div className="lg:col-span-2 space-y-6">
					{/* Info Dasar */}
					<Card>
						<CardHeader><CardTitle>Informasi Dasar</CardTitle></CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="name">Nama Produk</Label>
								<Input id="name" placeholder="Contoh: Sepatu Nike Air Max 270" />
							</div>
							<div className="space-y-2">
								<Label htmlFor="description">Deskripsi Produk</Label>
								<Textarea id="description" placeholder="Jelaskan detail produk Anda..." className="min-h-[120px]" />
							</div>
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="category">Kategori</Label>
									<Select>
										<SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
										<SelectContent>
											{categories.map(c => (
												<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="weight">Berat (gram)</Label>
									<Input id="weight" type="number" placeholder="800" />
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Harga & Stok */}
					<Card>
						<CardHeader><CardTitle>Harga & Stok</CardTitle></CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="price">Harga (Rp)</Label>
									<Input id="price" type="number" placeholder="250000" />
								</div>
								<div className="space-y-2">
									<Label htmlFor="stock">Stok</Label>
									<Input id="stock" type="number" placeholder="100" />
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Media */}
					<Card>
						<CardHeader><CardTitle>Foto Produk</CardTitle></CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
								{/* Existing preview placeholders */}
								{[1, 2].map(i => (
									<div key={i} className="relative aspect-square rounded-lg border bg-muted/50 flex items-center justify-center group">
										<ImageIcon className="h-8 w-8 text-muted-foreground" />
										<button className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
											<X className="h-3 w-3" />
										</button>
										{i === 1 && (
											<span className="absolute bottom-1 left-1 text-[10px] font-medium bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Utama</span>
										)}
									</div>
								))}
								{/* Upload button */}
								<button className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors cursor-pointer">
									<Plus className="h-6 w-6" />
									<span className="text-xs">Tambah</span>
								</button>
							</div>
							<p className="text-xs text-muted-foreground mt-3">Format: JPG, PNG. Maks 1 MB per gambar. Foto pertama akan jadi foto utama.</p>
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					<Card>
						<CardHeader><CardTitle>Ringkasan</CardTitle></CardHeader>
						<CardContent className="space-y-3 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Status</span>
								<span className="font-medium text-amber-600">Draft</span>
							</div>
							<Separator />
							<div className="flex justify-between">
								<span className="text-muted-foreground">Kategori</span>
								<span className="font-medium">-</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Harga</span>
								<span className="font-medium">-</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Stok</span>
								<span className="font-medium">-</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Berat</span>
								<span className="font-medium">-</span>
							</div>
							<Separator />
							<Button className="w-full"><Save className="mr-2 h-4 w-4" />Simpan Produk</Button>
							<Button variant="outline" className="w-full">Simpan sebagai Draft</Button>
						</CardContent>
					</Card>

					<Card className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
						<CardContent className="pt-6">
							<p className="text-sm text-blue-800 dark:text-blue-300">
								💡 <strong>Tips:</strong> Produk dengan foto yang jelas dan deskripsi lengkap memiliki peluang terjual 3x lebih tinggi!
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
