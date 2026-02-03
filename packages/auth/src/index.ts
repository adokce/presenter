import { tanstackStartCookies } from "better-auth/tanstack-start";
import { organization } from "better-auth/plugins";
import { db } from "@mukinho/db";
import * as schema from "@mukinho/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq, and, count } from "drizzle-orm";

const trustedOrigin1 = process.env.CORS_ORIGIN; // e.g., "http://localhost:3003"
const trustedOrigin2 = process.env.TAILSCALE_URL; // e.g., "http://100.80.3.78:3003"
const trustedOrigin3 = process.env.TAILSCALE_URL_MAGIC; // e.g., "http://omarchy-x220:3003"
const trustedOriginsList = [trustedOrigin1, trustedOrigin2, trustedOrigin3].filter(
  (value): value is string => Boolean(value && value.trim())
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: schema,
  }),
  trustedOrigins: trustedOriginsList,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    tanstackStartCookies(),
    organization({
      // Only admin can create organizations
      allowUserToCreateOrganization: async (user) => {
        const dbUser = await db.query.user.findFirst({
          where: eq(schema.user.id, user.id),
        });
        return dbUser?.role === "admin";
      },
      // Admin is the owner of organizations they create
      creatorRole: "owner",
      // Invitation links valid for 7 days
      invitationExpiresIn: 60 * 60 * 24 * 7,
      // We won't send emails - just generate links
      async sendInvitationEmail(data) {
        // No-op: We'll generate links via tRPC instead
        console.log(
          `[Invite] Generated invite for ${data.email} to org ${data.organization.name}: /accept-invitation/${data.id}`
        );
      },
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // Users can't set their own role
      },
    },
  },
  session: {
    additionalFields: {
      activeOrganizationId: {
        type: "string",
        required: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Check if this is the first user (admin)
          const userCount = await db
            .select({ value: count() })
            .from(schema.user);
          const isFirstUser = (userCount[0]?.value ?? 0) === 0;

          if (isFirstUser) {
            // First user becomes admin, no invite needed
            return {
              data: {
                ...user,
                role: "admin",
              },
            };
          }

          // Everyone else needs a valid, pending invitation
          const invite = await db.query.invitation.findFirst({
            where: and(
              eq(schema.invitation.email, user.email),
              eq(schema.invitation.status, "pending")
            ),
          });

          if (!invite) {
            throw new Error(
              "Signup is invite-only. Please use a valid invitation link."
            );
          }

          return { data: user };
        },
        after: async (user) => {
          // After user is created, if they had an invitation, add them to the org
          const invite = await db.query.invitation.findFirst({
            where: and(
              eq(schema.invitation.email, user.email),
              eq(schema.invitation.status, "pending")
            ),
          });

          if (invite) {
            // Add user as member of the organization
            await db.insert(schema.member).values({
              id: crypto.randomUUID(),
              userId: user.id,
              organizationId: invite.organizationId,
              role: invite.role || "member",
            });

            // Mark invitation as accepted
            await db
              .update(schema.invitation)
              .set({ status: "accepted" })
              .where(eq(schema.invitation.id, invite.id));
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          // Set the active organization to the user's first organization
          const membership = await db.query.member.findFirst({
            where: eq(schema.member.userId, session.userId),
          });

          if (membership) {
            return {
              data: {
                ...session,
                activeOrganizationId: membership.organizationId,
              },
            };
          }

          return { data: session };
        },
      },
    },
  },
});
