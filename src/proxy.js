import { NextResponse } from 'next/server'
import { auth } from './lib/auth'

// ============================================
// CONFIGURASI ROUTES
// ============================================

const ROUTES = {
	auth: ['/sign-in', '/sign-up'],
	protected: ['/admin-dashboard'],
	closed: ['/sign-up'],
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createRedirect(req, targetPath, includeCallback = false) {
	const url = new URL(targetPath, req.url)

	if (includeCallback) {
		// Tambahkan URL saat ini sebagai callback agar pengguna kembali setelah login
		url.searchParams.set('callbackUrl', req.nextUrl.pathname)
	}

	return NextResponse.redirect(url)
}

// ============================================
// PROXY FUNCTION (Menggantikan Middleware di Next.js 16+)
// ============================================

export async function proxy(req) {
	const { pathname } = req.nextUrl

	// ============================================
	// RULE 0: Pencegahan Akses Permanen (Sign-up Ditutup)
	// ============================================
	const isClosedRoute = ROUTES.closed.some((route) =>
		pathname.startsWith(route),
	)
	if (isClosedRoute) {
		return createRedirect(req, '/')
	}

	// 1. Ambil Sesi yang Divalidasi Penuh dari Server/Database
	// Ini adalah langkah KRITIS untuk keamanan
	const session = await auth.api.getSession({
		// Better Auth akan membaca cookie dari headers permintaan
		headers: req.headers,
	})

	const isAuthenticated = !!session
	const userRole = session?.user?.role

	// ============================================
	// RULE 1: Redirect jika sudah login dan mencoba mengakses Auth Routes
	// ============================================
	const isAuthRoute = ROUTES.auth.some((route) => pathname.startsWith(route))
	if (isAuthRoute && isAuthenticated) {
		return createRedirect(req, '/')
	}

	// ============================================
	// RULE 2: Protect Admin Route
	// ============================================
	const isAdminRoute = ROUTES.protected.some((route) =>
		pathname.startsWith(route),
	)
	if (isAdminRoute) {
		if (!isAuthenticated) {
			// Belum login: Redirect ke sign-in
			return createRedirect(req, '/sign-in', true)
		}

		// Otorisasi Role (Opsional, tapi penting untuk /dashboard)
		if (userRole !== 'admin') {
			// Login, tapi bukan Admin: Redirect ke home atau halaman 403
			return createRedirect(req, '/')
		}
	}

	return NextResponse.next()
}

// ============================================
// MATCHER CONFIG
// ============================================

export const config = {
	matcher: ['/sign-in', '/sign-up', '/admin-dashboard/:path*'],
}
