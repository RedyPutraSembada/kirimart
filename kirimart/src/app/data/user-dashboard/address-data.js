import { useQuery } from "@tanstack/react-query"
import { getUserAddressesAction } from "@/actions/user-dashboard/address.actions"

export function useGetUserAddresses() {
	return useQuery({
		queryFn: async () => getUserAddressesAction(),
		queryKey: ["user-addresses"],
	})
}
