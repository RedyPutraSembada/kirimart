'use client'

import {
	isServer,
	QueryClient,
	QueryClientProvider,
} from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000,
			},
		},
	})
}

let browserQueryClient

function getQueryClient() {
	if (isServer) {
		return makeQueryClient()
	} else {
		if (!browserQueryClient) browserQueryClient = makeQueryClient()
		return browserQueryClient
	}
}

export function ReactQueryProvider({ children }) {
	const queryClient = getQueryClient()
	return (
		<QueryClientProvider client={queryClient}>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	)
}
