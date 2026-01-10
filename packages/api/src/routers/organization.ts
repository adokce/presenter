import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "../index";
import { organizationRepository } from "@mukinho/db/repositories";

export const organizationRouter = router({
  // Get invitation details (public - for invite link page)
  getInvitation: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const invite = await organizationRepository.findInvitationById(input.id);

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
    return organizationRepository.findAllOrganizations();
  }),

  // Get a single organization by ID
  getById: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const org = await organizationRepository.findOrganizationById(input.id);

      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
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
      await organizationRepository.createOrganization({
        id,
        name: input.name,
        slug,
      });

      // Add admin as owner of the organization
      await organizationRepository.createMember({
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
      const org = await organizationRepository.findOrganizationById(input.organizationId);

      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }

      const id = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await organizationRepository.createInvitation({
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
      return organizationRepository.findInvitationsByOrganizationId(input.organizationId);
    }),

  // Cancel an invitation
  cancelInvitation: adminProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ input }) => {
      await organizationRepository.updateInvitationStatus(input.invitationId, "canceled");
      return { success: true };
    }),

  // Delete an organization
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await organizationRepository.deleteOrganization(input.id);
      return { success: true };
    }),
});

