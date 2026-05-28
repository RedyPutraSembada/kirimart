"use client"

import { useEffect } from "react"
import Script from "next/script"
import { usePathname, useSearchParams } from "next/navigation"
import { pixelPageView } from "@/lib/pixel"

export function MetaPixel({ masterPixelId }) {
	const pathname = usePathname()
	const searchParams = useSearchParams()

	// Simpan master pixel ID ke window agar bisa diakses oleh helper event
	useEffect(() => {
		if (masterPixelId) {
			window.__MASTER_PIXEL_ID__ = masterPixelId
		} else {
			window.__MASTER_PIXEL_ID__ = null
		}
	}, [masterPixelId])

	// Lacak PageView global setiap kali rute berubah
	useEffect(() => {
		if (pathname) {
			// Delay sedikit agar DOM dan title document sudah terupdate
			const timer = setTimeout(() => {
				pixelPageView()
			}, 500)
			return () => clearTimeout(timer)
		}
	}, [pathname, searchParams])

	return (
		<>
			{/* Base Script Facebook Pixel */}
			<Script
				id="fb-pixel"
				strategy="afterInteractive"
				dangerouslySetInnerHTML={{
					__html: `
						!function(f,b,e,v,n,t,s)
						{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
						n.callMethod.apply(n,arguments):n.queue.push(arguments)};
						if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
						n.queue=[];t=b.createElement(e);t.async=!0;
						t.src=v;s=b.getElementsByTagName(e)[0];
						s.parentNode.insertBefore(t,s)}(window, document,'script',
						'https://connect.facebook.net/en_US/fbevents.js');
						
						// Inisialisasi Master Pixel
						${masterPixelId ? `fbq('init', '${masterPixelId}');` : "/* No master pixel configured */"}
					`,
				}}
			/>
		</>
	)
}
