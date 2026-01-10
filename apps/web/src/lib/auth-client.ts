import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import type { auth } from "@mukinho/auth";

export const authClient = createAuthClient<typeof auth>({
  plugins: [organizationClient()],
});
