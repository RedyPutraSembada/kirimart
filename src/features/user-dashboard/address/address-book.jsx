"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Plus, Trash2, Edit2 } from "lucide-react"
import { useGetUserAddresses } from "@/app/data/user-dashboard/address-data"

export function AddressBook() {
	const { data: res, isLoading } = useGetUserAddresses()
	const addresses = res?.data || []

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Buku Alamat</h1>
					<p className="text-muted-foreground">Kelola alamat pengiriman untuk mempermudah checkout.</p>
				</div>
				<Link href="/user-dashboard/address/create">
					<Button className="w-full sm:w-auto">
						<Plus className="mr-2 h-4 w-4" />
						Tambah Alamat
					</Button>
				</Link>
			</div>

			{isLoading ? (
				<div className="grid gap-4 md:grid-cols-2">
					{[1, 2].map(i => (
						<Card key={i} className="animate-pulse">
							<CardHeader className="h-24 bg-muted/50" />
							<CardContent className="h-32 bg-muted/20" />
						</Card>
					))}
				</div>
			) : addresses.length === 0 ? (
				<Card className="flex flex-col items-center justify-center py-12 text-center">
					<div className="rounded-full bg-primary/10 p-4 mb-4">
						<MapPin className="h-8 w-8 text-primary" />
					</div>
					<h3 className="text-lg font-bold">Belum Ada Alamat</h3>
					<p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
						Anda belum menyimpan alamat pengiriman. Tambahkan alamat sekarang untuk mempercepat proses pesanan Anda.
					</p>
					<Link href="/user-dashboard/address/create">
						<Button variant="outline">
							<Plus className="mr-2 h-4 w-4" />
							Tambah Alamat Pertama
						</Button>
					</Link>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{addresses.map((address) => (
					<Card key={address.id} className="relative overflow-hidden">
						{address.isDefault && (
							<div className="absolute top-0 right-0">
								<Badge className="rounded-tl-none rounded-br-none border-none">Utama</Badge>
							</div>
						)}
						<CardHeader className="pb-3">
							<CardTitle className="text-base flex items-center gap-2">
								<MapPin className="h-4 w-4 text-primary" />
								{address.recipientName || "Penerima"}
								{address.label && (
									<Badge variant="outline" className="text-[10px] font-normal">{address.label}</Badge>
								)}
							</CardTitle>
							<CardDescription>{address.recipientPhone || "-"}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="text-sm">
								<p>{address.detailAddress}</p>
								<p className="text-muted-foreground mt-1">
									{address.kecamatanName || address.kecamatanId || "-"}, {address.cityName || address.cityId || "-"}
								</p>
								<p className="text-muted-foreground">
									{address.provinceName || address.provinceId || "-"}, {address.zipcode || "-"}
								</p>
							</div>
							
							<div className="flex items-center gap-2 pt-2 border-t">
								<Button variant="outline" size="sm" className="w-full">
									<Edit2 className="mr-2 h-3.5 w-3.5" />
									Ubah
								</Button>
								<Button variant="outline" size="sm" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
									<Trash2 className="mr-2 h-3.5 w-3.5" />
									Hapus
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
				</div>
			)}
		</div>
	)
}
