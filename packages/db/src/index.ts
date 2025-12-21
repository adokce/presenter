import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

const isLocal = process.env.USE_LOCAL_DB === "yessir";
const dbUrl = isLocal
  ? process.env.DATABASE_URL_LOCAL || ""
  : process.env.DATABASE_URL || "";
const dbAuthToken = isLocal
  ? process.env.DATABASE_AUTH_TOKEN_LOCAL
  : process.env.DATABASE_AUTH_TOKEN;

const client = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

export const db = drizzle({ client, schema });
