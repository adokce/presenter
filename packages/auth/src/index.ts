import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { db } from "@mukinho/db";
import * as schema from "@mukinho/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",

    schema: schema,
  }),
  trustedOrigins: [process.env.CORS_ORIGIN || ""],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies()]
});
