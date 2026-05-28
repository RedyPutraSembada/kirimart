"use server"

import { mockProvinces, mockCities, mockKecamatan, mockKelurahan } from "@/lib/kiriminaja-mock"

// Helper simulasi delay jaringan
const delay = (ms) => new Promise(res => setTimeout(res, ms));

export async function getProvincesAction() {
	try {
		await delay(500); // simulasi network latency
		// TODO: Ganti dengan Fetch ke KiriminAja API jika API_KEY sudah ada
		// const res = await fetch(`${process.env.KIRIMINAJA_API_URL}/api/mitra/province`, { headers: { Authorization: `Bearer ${process.env.KIRIMINAJA_API_KEY}` } })
		
		return { success: true, data: mockProvinces }
	} catch (error) {
		console.error("Error fetching provinces", error)
		return { success: false, error: "Gagal mengambil data provinsi" }
	}
}

export async function getCitiesAction(provinceId) {
	try {
		await delay(500);
		const data = mockCities[provinceId] || [];
		return { success: true, data }
	} catch (error) {
		console.error("Error fetching cities", error)
		return { success: false, error: "Gagal mengambil data kota" }
	}
}

export async function getKecamatanAction(cityId) {
	try {
		await delay(500);
		const data = mockKecamatan[cityId] || [];
		return { success: true, data }
	} catch (error) {
		console.error("Error fetching kecamatan", error)
		return { success: false, error: "Gagal mengambil data kecamatan" }
	}
}

export async function getKelurahanAction(kecamatanId) {
	try {
		await delay(500);
		const data = mockKelurahan[kecamatanId] || [];
		return { success: true, data }
	} catch (error) {
		console.error("Error fetching kelurahan", error)
		return { success: false, error: "Gagal mengambil data kelurahan" }
	}
}
