import { auth } from "@/lib/auth"; // Impor auth instance yang sudah dibuat
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
