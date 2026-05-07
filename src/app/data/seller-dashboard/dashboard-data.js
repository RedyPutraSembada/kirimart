import { getMyStore } from "@/actions/seller-dashboard/seller.dashboard.actions";
import { useQuery } from "@tanstack/react-query";

export function useGetMyStore() {
    return useQuery({
        queryFn: async () => getMyStore(),
        queryKey: ['my-store'],
    })
}