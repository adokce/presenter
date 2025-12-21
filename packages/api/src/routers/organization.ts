import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "../index";
import { db } from "@mukinho/db";
import * as schema from "@mukinho/db/schema/auth";

export const organizationRouter = router({
  // Get invitation details (public - for invite link page)
  getInvitation: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const invite = await db.query.invitation.findFirst({
        where: eq(schema.invitation.id, input.id),
        with: {
          organization: true,
          inviter: true,
        },
      });

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
      }

      if (invite.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation is no longer valid" });
      }

      if (new Date(invite.expiresAt) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation has expired" });
      }

      return {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        organizationName: invite.organization.name,
        inviterName: invite.inviter.name,
        expiresAt: invite.expiresAt,
      };
    }),

  // List all organizations (admin only)
  list: adminProcedure.query(async () => {
    const organizations = await db.query.organization.findMany({
      with: {
        members: {
          with: {
            user: true,
          },
        },
        invitations: true,
      },
    });
    return organizations;
  }),

  // Get a single organization by ID
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const org = await db.query.organization.findFirst({
        where: eq(schema.organization.id, input.id),
        with: {
          members: {
            with: {
              user: true,
            },
          },
          invitations: true,
        },
      });

      if (!org) {
        throw new Error("Organization not found");
      }

      return org;
    }),

  // Create a new organization
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        slug: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = crypto.randomUUID();
      const slug =
        input.slug ||
        input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      // Create the organization
      await db.insert(schema.organization).values({
        id,
        name: input.name,
        slug,
      });

      // Add admin as owner of the organization
      await db.insert(schema.member).values({
        id: crypto.randomUUID(),
        organizationId: id,
        userId: ctx.session.user.id,
        role: "owner",
      });

      return { id, name: input.name, slug };
    }),

  // Create an invitation link for an organization
  createInvitation: adminProcedure
    .input(
      z.object({
        organizationId: z.string(),
        email: z.string().email("Valid email required"),
        role: z.enum(["member", "admin"]).default("member"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify organization exists
      const org = await db.query.organization.findFirst({
        where: eq(schema.organization.id, input.organizationId),
      });

      if (!org) {
        throw new Error("Organization not found");
      }

      const id = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await db.insert(schema.invitation).values({
        id,
        organizationId: input.organizationId,
        email: input.email,
        role: input.role,
        status: "pending",
        expiresAt,
        inviterId: ctx.session.user.id,
      });

      // Generate the invite link (frontend will handle this route)
      const inviteLink = `/invite/${id}`;

      return {
        id,
        email: input.email,
        organizationId: input.organizationId,
        organizationName: org.name,
        role: input.role,
        expiresAt,
        inviteLink,
      };
    }),

  // List all invitations for an organization
  listInvitations: adminProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      const invitations = await db.query.invitation.findMany({
        where: eq(schema.invitation.organizationId, input.organizationId),
        with: {
          inviter: true,
          organization: true,
        },
      });
      return invitations;
    }),

  // Cancel an invitation
  cancelInvitation: adminProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.invitation)
        .set({ status: "canceled" })
        .where(eq(schema.invitation.id, input.invitationId));

      return { success: true };
    }),

  // Delete an organization
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .delete(schema.organization)
        .where(eq(schema.organization.id, input.id));

      return { success: true };
    }),
});

