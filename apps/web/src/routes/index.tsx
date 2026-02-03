import { createFileRoute, redirect } from "@tanstack/react-router";

import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
  loader: async ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/login" });
    }

    const role = (context.session.user as { role?: string } | undefined)?.role;
    if (role === "admin") {
      throw redirect({ to: "/admin/organizations" });
    }

    throw redirect({ to: "/webinar" });
  },
  component: () => null,
});
