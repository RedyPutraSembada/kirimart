import { getMyStore } from "@/actions/seller-dashboard/seller.dashboard.actions";
import { getMyStoreMetrics } from "@/actions/seller-dashboard/score.actions";
import { useQuery } from "@tanstack/react-query";

export function useGetMyStore() {
    return useQuery({
        queryFn: async () => getMyStore(),
        queryKey: ['my-store'],
    })
}

export function useGetMyStoreMetrics() {
    return useQuery({
        queryFn: async () => getMyStoreMetrics(),
        queryKey: ['my-store-metrics'],
    })
}