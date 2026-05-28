import { env } from './src/config/env/index.js';
import { defineConfig } from "drizzle-kit";


export default defineConfig({
  schema: "./src/config/db/schema/index.js",
  out: "./src/config/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
