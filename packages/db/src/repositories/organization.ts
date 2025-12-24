import { eq } from "drizzle-orm";
import { db } from "../index";
import * as schema from "../schema";

// Types
export type Organization = typeof schema.organization.$inferSelect;
export type NewOrganization = typeof schema.organization.$inferInsert;
export type Invitation = typeof schema.invitation.$inferSelect;
export type NewInvitation = typeof schema.invitation.$inferInsert;
export type Member = typeof schema.member.$inferSelect;
export type NewMember = typeof schema.member.$inferInsert;

// Organization queries
export async function findOrganizationById(id: string) {
  return db.query.organization.findFirst({
    where: eq(schema.organization.id, id),
    with: {
      members: {
        with: {
          user: true,
        },
      },
      invitations: true,
    },
  });
}

export async function findAllOrganizations() {
  return db.query.organization.findMany({
    with: {
      members: {
        with: {
          user: true,
        },
      },
      invitations: true,
    },
  });
}

export async function createOrganization(data: NewOrganization) {
  await db.insert(schema.organization).values(data);
  return data;
}

export async function deleteOrganization(id: string) {
  await db.delete(schema.organization).where(eq(schema.organization.id, id));
}

// Member queries
export async function createMember(data: NewMember) {
  await db.insert(schema.member).values(data);
  return data;
}

// Invitation queries
export async function findInvitationById(id: string) {
  return db.query.invitation.findFirst({
    where: eq(schema.invitation.id, id),
    with: {
      organization: true,
      inviter: true,
    },
  });
}

export async function findInvitationsByOrganizationId(organizationId: string) {
  return db.query.invitation.findMany({
    where: eq(schema.invitation.organizationId, organizationId),
    with: {
      inviter: true,
      organization: true,
    },
  });
}

export async function createInvitation(data: NewInvitation) {
  await db.insert(schema.invitation).values(data);
  return data;
}

export async function updateInvitationStatus(id: string, status: "pending" | "accepted" | "rejected" | "canceled") {
  await db
    .update(schema.invitation)
    .set({ status })
    .where(eq(schema.invitation.id, id));
}

