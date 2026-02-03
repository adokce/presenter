import { createServerFn } from "@tanstack/react-start";
import { db } from "@mukinho/db";
import * as schema from "@mukinho/db/schema/auth";

export const getSignupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const result = await db.select({ id: schema.user.id }).from(schema.user).limit(1);
  return { hasUsers: result.length > 0 };
});
