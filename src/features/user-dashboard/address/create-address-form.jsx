"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm, FormProvider } from "react-hook-form"
import { ArrowLeft, Save } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { AddressForm } from "@/components/shared/address-form"
import { saveUserAddressAction } from "@/actions/user-dashboard/address.actions"

import { useMutation, useQueryClient } from "@tanstack/react-query"

export function CreateAddressForm() {
	const router = useRouter()
	const queryClient = useQueryClient()

	const saveMutation = useMutation({
		mutationFn: saveUserAddressAction,
		onSuccess: (res) => {
			if (res.success) {
				toast.success("Alamat berhasil ditambahkan!")
				queryClient.invalidateQueries({ queryKey: ["user-addresses"] })
				router.push("/user-dashboard/address")
			} else {
				toast.error(res.error || "Gagal menyimpan alamat.")
			}
		},
		onError: () => {
			toast.error("Terjadi kesalahan sistem.")
		}
	})

	const methods = useForm({
		defaultValues: {
			recipientName: "",
			recipientPhone: "",
			provinceId: "",
			cityId: "",
			kecamatanId: "",
			kelurahanId: "",
			zipcode: "",
			detailAddress: "",
		}
	})

	const onSubmit = async (data) => {
		await saveMutation.mutateAsync(data)
	}

	return (
		<div className="space-y-6 max-w-3xl">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/user-dashboard/address">
						<ArrowLeft className="h-5 w-5" />
					</Link>
				</Button>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Tambah Alamat Baru</h1>
					<p className="text-muted-foreground">Lengkapi form di bawah ini dengan alamat pengiriman Anda.</p>
				</div>
			</div>

			<Card>
				<FormProvider {...methods}>
					<form onSubmit={methods.handleSubmit(onSubmit)}>
						<AddressForm 
							title="Alamat Pengiriman (Pembeli)" 
							description="Penting: Alamat ini akan digunakan untuk menghitung tarif ongkos kirim saat Anda berbelanja." 
						/>
						
						<CardContent className="pt-0">
							<div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:bg-amber-950/30 dark:border-amber-800 mb-4 mt-2">
								<p className="text-sm text-amber-800 dark:text-amber-300">
									⚠️ <strong>Catatan Sistem:</strong> Pencarian alamat saat ini menggunakan <em>Mock Data</em>. Pilihan provinsi yang tersedia hanya DKI Jakarta, DI Yogyakarta, dan Jawa Barat untuk keperluan ujicoba.
								</p>
							</div>

							<div className="flex items-center justify-end gap-4 mt-6">
								<Button variant="outline" type="button" asChild disabled={saveMutation.isPending}>
									<Link href="/user-dashboard/address">Batal</Link>
								</Button>
								<Button type="submit" disabled={saveMutation.isPending}>
									<Save className="mr-2 h-4 w-4" />
									{saveMutation.isPending ? "Menyimpan..." : "Simpan Alamat"}
								</Button>
							</div>
						</CardContent>
					</form>
				</FormProvider>
			</Card>
		</div>
	)
}
