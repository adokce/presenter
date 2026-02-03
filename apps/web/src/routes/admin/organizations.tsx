import { useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Building2,
  Copy,
  Link2,
  MoreHorizontal,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

async function tryClipboardWrite(text: string) {
  if (!navigator?.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    return false;
  }
}

function tryLegacyCopy(text: string) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    return document.execCommand("copy");
  } catch (err) {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
}

const getRoleLabel = (role?: string | null) => {
  if (role === "admin") return m.role_admin();
  if (role === "owner") return m.role_owner();
  return m.role_member();
};

import { getUser } from "@/functions/get-user";
import { useTRPC } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/organizations")({
  component: OrganizationsPage,
  beforeLoad: async () => {
    const session = await getUser();
    return { session };
  },
  loader: async ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/login" });
    }
    if (context.session.user.role !== "admin") {
      throw redirect({ to: "/webinar" });
    }
  },
});

function OrganizationsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [manualCopyUrl, setManualCopyUrl] = useState<string | null>(null);
  const manualCopyInputRef = useRef<HTMLInputElement>(null);

  const organizations = useQuery(trpc.organization.list.queryOptions());

  const copyInviteLink = async (
    link: string,
    options?: { showManualDialog?: boolean }
  ) => {
    const showManualDialog = options?.showManualDialog ?? true;
    const clipboardSuccess = await tryClipboardWrite(link);
    if (clipboardSuccess) {
      toast.success(m.link_copied(), { description: link });
      setManualCopyUrl(null);
      return true;
    }

    const legacySuccess = tryLegacyCopy(link);
    if (legacySuccess) {
      toast.success(m.link_copied(), { description: link });
      setManualCopyUrl(null);
      return true;
    }

    // Fallback dialog will guide manual copy; no toast needed.
    if (showManualDialog) {
      setManualCopyUrl(link);
    }
    return false;
  };

  const createOrgMutation = useMutation(
    trpc.organization.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.organization.list.queryKey(),
        });
        toast.success(m.organization_created());
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deleteOrgMutation = useMutation(
    trpc.organization.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.organization.list.queryKey(),
        });
        toast.success(m.organization_deleted());
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const createInviteMutation = useMutation(
    trpc.organization.createInvitation.mutationOptions()
  );

  const handleCreateInvite = async (
    organizationId: string,
    email: string,
    role: "member" | "admin"
  ) => {
    try {
      const data = await createInviteMutation.mutateAsync({
        organizationId,
        email,
        role,
      });
      await queryClient.invalidateQueries({
        queryKey: trpc.organization.list.queryKey(),
      });
      return `${window.location.origin}${data.inviteLink}`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.invite_failed());
      return null;
    }
  };

  const cancelInviteMutation = useMutation(
    trpc.organization.cancelInvitation.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.organization.list.queryKey(),
        });
        toast.success(m.invitation_cancelled());
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {m.organizations_title()}
          </h1>
          <p className="text-muted-foreground">
            {m.organizations_subtitle()}
          </p>
        </div>
        <CreateOrganizationDialog
          onSubmit={(name) => createOrgMutation.mutate({ name })}
          isPending={createOrgMutation.isPending}
        />
      </div>

      {organizations.isLoading ? (
        <div className="text-muted-foreground">{m.loading()}</div>
      ) : organizations.data?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-medium">
              {m.no_organizations_title()}
            </h3>
            <p className="text-muted-foreground mb-4 text-center">
              {m.no_organizations_body()}
            </p>
            <CreateOrganizationDialog
              onSubmit={(name) => createOrgMutation.mutate({ name })}
              isPending={createOrgMutation.isPending}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {organizations.data?.map((org) => (
            <OrganizationCard
              key={org.id}
              organization={org}
              onDelete={() => deleteOrgMutation.mutate({ id: org.id })}
              onCreateInvite={(email, role) =>
                handleCreateInvite(org.id, email, role)
              }
              onCancelInvite={(invitationId) =>
                cancelInviteMutation.mutate({ invitationId })
              }
              onCopyInvite={(url, options) => copyInviteLink(url, options)}
              isDeleting={deleteOrgMutation.isPending}
              isCreatingInvite={createInviteMutation.isPending}
            />
          ))}
        </div>
      )}

      <Dialog
        open={!!manualCopyUrl}
        onOpenChange={(open) => {
          if (!open) {
            setManualCopyUrl(null);
          }
        }}
      >
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            manualCopyInputRef.current?.focus();
            manualCopyInputRef.current?.select();
          }}
        >
          <DialogHeader>
            <DialogTitle>{m.copy_invite_link()}</DialogTitle>
            <DialogDescription>
              {m.clipboard_unavailable()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex gap-2">
            <Input
              ref={manualCopyInputRef}
              value={manualCopyUrl || ""}
              readOnly
              className="w-full"
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (manualCopyUrl) {
                  void copyInviteLink(manualCopyUrl);
                }
              }}
            >
              <Copy className="h-4 w-4 mr-1" />
              {m.copy_button()}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setManualCopyUrl(null)}>{m.close_button()}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateOrganizationDialog({
  onSubmit,
  isPending,
}: {
  onSubmit: (name: string) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
      setName("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        {m.new_organization()}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{m.create_organization()}</DialogTitle>
            <DialogDescription>
              {m.create_org_description()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="org-name">{m.organization_name()}</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={m.org_placeholder()}
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {m.cancel()}
            </DialogClose>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? m.creating() : m.create()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: string | null;
    status: string;
    expiresAt: Date;
  }>;
}

function OrganizationCard({
  organization,
  onDelete,
  onCreateInvite,
  onCancelInvite,
  onCopyInvite,
  isDeleting,
  isCreatingInvite,
}: {
  organization: Organization;
  onDelete: () => void;
  onCreateInvite: (
    email: string,
    role: "member" | "admin"
  ) => Promise<string | null>;
  onCancelInvite: (invitationId: string) => void;
  onCopyInvite: (
    url: string,
    options?: { showManualDialog?: boolean }
  ) => Promise<boolean>;
  isDeleting: boolean;
  isCreatingInvite: boolean;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const inviteCopyInputRef = useRef<HTMLInputElement>(null);
  const locale = getLocale();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    const nextLink = await onCreateInvite(email, "member");
    if (!nextLink) return;

    setInviteEmail("");
    const copied = await onCopyInvite(nextLink, { showManualDialog: false });
    if (copied) {
      setInviteLink(null);
      setInviteDialogOpen(false);
      return;
    }

    setInviteLink(nextLink);
  };

  useLayoutEffect(() => {
    if (!inviteLink) return;
    inviteCopyInputRef.current?.focus();
    inviteCopyInputRef.current?.select();
  }, [inviteLink]);

  const pendingInvites = organization.invitations.filter(
    (inv) => inv.status === "pending"
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {organization.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {organization.slug && (
                <span className="text-muted-foreground">
                  /{organization.slug}
                </span>
              )}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" />}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={onDelete}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {m.delete_organization()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Members Section */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              {m.members_count({ count: organization.members.length })}
            </h4>
          </div>
          {organization.members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{m.name_column()}</TableHead>
                  <TableHead>{m.email_column()}</TableHead>
                  <TableHead>{m.role_column()}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organization.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.user.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.user.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.role === "owner" ? "default" : "secondary"
                        }
                      >
                        {getRoleLabel(member.role)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">{m.no_members()}</p>
          )}
        </div>

        {/* Pending Invitations Section */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4" />
              {m.pending_invitations_count({ count: pendingInvites.length })}
            </h4>
            <Dialog
              open={inviteDialogOpen}
              onOpenChange={(open) => {
                setInviteDialogOpen(open);
                if (!open) {
                  setInviteEmail("");
                  setInviteLink(null);
                }
              }}
            >
              <DialogTrigger render={<Button size="sm" variant="outline" />}>
                <Plus className="mr-1 h-3 w-3" />
                {m.invite_button()}
              </DialogTrigger>
              <DialogContent
                onCloseAutoFocus={(event) => {
                  // Prevent focus from jumping back to the trigger when closing.
                  event.preventDefault();
                }}
              >
                {inviteLink ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>{m.copy_invite_link()}</DialogTitle>
                      <DialogDescription>
                        {m.share_invite_link({
                          organization: organization.name,
                        })}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 flex gap-2">
                      <Input
                        ref={inviteCopyInputRef}
                        value={inviteLink}
                        readOnly
                        className="w-full"
                      />
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const copied = await onCopyInvite(inviteLink, {
                            showManualDialog: false,
                          });
                          if (copied) {
                            setInviteLink(null);
                            setInviteDialogOpen(false);
                          }
                        }}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        {m.copy_button()}
                      </Button>
                    </div>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>
                        {m.close_button()}
                      </DialogClose>
                    </DialogFooter>
                  </>
                ) : (
                  <form onSubmit={handleInvite}>
                    <DialogHeader>
                      <DialogTitle>{m.invite_user_title()}</DialogTitle>
                      <DialogDescription>
                        {m.invite_user_description({
                          organization: organization.name,
                        })}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="invite-email">{m.email_address()}</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="mt-2"
                        autoFocus
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>
                        {m.cancel()}
                      </DialogClose>
                      <Button
                        type="submit"
                        disabled={!inviteEmail.trim() || isCreatingInvite}
                      >
                        {isCreatingInvite ? m.creating() : m.create_invite_link()}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
          {pendingInvites.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{m.email_column()}</TableHead>
                  <TableHead>{m.role_column()}</TableHead>
                  <TableHead>{m.expires_column()}</TableHead>
                  <TableHead className="w-[100px]">{m.actions_column()}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium">
                      {invite.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getRoleLabel(invite.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => {
                            const link = `${window.location.origin}/invite/${invite.id}`;
                            onCopyInvite(link);
                          }}
                          title={m.copy_invite_link_title()}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => onCancelInvite(invite.id)}
                          title={m.cancel_invitation_title()}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">
              {m.no_pending_invitations()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
