"use client"

/**
 * Utility functions for Meta Pixel Event Tracking
 * Menggunakan pendekatan `trackSingle` agar event tidak bocor ke pixel toko lain
 * saat user bernavigasi di SPA (Single Page Application).
 */

const fireEvent = (eventName, params, storePixelId = null) => {
	if (typeof window === "undefined" || !window.fbq) return

	// ID Master Pixel disuntikkan ke window oleh komponen <MetaPixel />
	const masterPixelId = window.__MASTER_PIXEL_ID__

	// 1. Tembak ke Master Pixel (jika ada)
	if (masterPixelId) {
		window.fbq("trackSingle", masterPixelId, eventName, params)
	}

	// 2. Tembak ke Store Pixel (jika ada dan berbeda dengan master)
	if (storePixelId && storePixelId !== masterPixelId) {
		window.fbq("trackSingle", storePixelId, eventName, params)
	}
}

/**
 * Trigger PageView event
 * Dipanggil otomatis saat route berubah.
 */
export const pixelPageView = (storePixelId = null) => {
	fireEvent("PageView", {}, storePixelId)
}

/**
 * Trigger ViewContent event
 * Dipanggil saat user melihat halaman detail produk.
 */
export const pixelViewContent = ({ id, name, price, category }, storePixelId = null) => {
	fireEvent(
		"ViewContent",
		{
			content_ids: [String(id)],
			content_name: name,
			content_type: "product",
			content_category: category,
			value: price,
			currency: "IDR",
		},
		storePixelId
	)
}

/**
 * Trigger AddToCart event
 * Dipanggil saat user menekan tombol tambah ke keranjang.
 */
export const pixelAddToCart = ({ id, name, price, qty }, storePixelId = null) => {
	fireEvent(
		"AddToCart",
		{
			content_ids: [String(id)],
			content_name: name,
			content_type: "product",
			value: price * qty,
			currency: "IDR",
			num_items: qty,
		},
		storePixelId
	)
}

/**
 * Trigger InitiateCheckout event
 * Dipanggil saat user masuk ke halaman checkout.
 */
export const pixelInitiateCheckout = ({ totalValue, numItems }, storePixelId = null) => {
	fireEvent(
		"InitiateCheckout",
		{
			value: totalValue,
			currency: "IDR",
			num_items: numItems,
		},
		storePixelId
	)
}

/**
 * Trigger Purchase event
 * Dipanggil saat pesanan berhasil dibuat/dibayar.
 */
export const pixelPurchase = ({ orderId, totalValue, items }, storePixelId = null) => {
	fireEvent(
		"Purchase",
		{
			content_ids: items.map((i) => String(i.id)),
			content_type: "product",
			value: totalValue,
			currency: "IDR",
			order_id: String(orderId),
		},
		storePixelId
	)
}
