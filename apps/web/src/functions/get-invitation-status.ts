import { createServerFn } from "@tanstack/react-start";

import { organizationRepository } from "@mukinho/db/repositories";

export type InvitationStatus =
  | { valid: true; email: string }
  | { valid: false; reason: "not_found" | "not_pending" | "expired" };

export const getInvitationStatus = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const invite = await organizationRepository.findInvitationById(data.id);

    if (!invite) {
      return { valid: false, reason: "not_found" } as const;
    }

    if (invite.status !== "pending") {
      return { valid: false, reason: "not_pending" } as const;
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return { valid: false, reason: "expired" } as const;
    }

    return { valid: true, email: invite.email } as const;
  });
