
import { drizzle } from "drizzle-orm/node-postgres";

import { env } from "../env";
import * as schema from "./schema";

export function createDb() {
    return drizzle({
        connection: env.DATABASE_URL,
        schema,
        mode: 'default',
    });
}

export const db = createDb();
