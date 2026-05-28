import { getPlatformSettings } from "@/actions/admin-dashboard/settings.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetPlatformSettings() {
	return useQuery({
		queryFn: async () => getPlatformSettings(),
		queryKey: ["admin-platform-settings"],
	})
}
