import { useState } from "react";
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

function copyToClipboard(
  text: string,
  onSuccess: () => void,
  onFallback: () => void
) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      fallbackCopyToClipboard(text, onSuccess, onFallback);
    });
  } else {
    fallbackCopyToClipboard(text, onSuccess, onFallback);
  }
}

function fallbackCopyToClipboard(
  text: string,
  onSuccess: () => void,
  onFallback: () => void
) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    if (successful) {
      onSuccess();
    } else {
      onFallback();
    }
  } catch (err) {
    document.body.removeChild(textArea);
    onFallback();
  }
}

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
      throw redirect({ to: "/dashboard" });
    }
  },
});

function OrganizationsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [manualCopyUrl, setManualCopyUrl] = useState<string | null>(null);

  const organizations = useQuery(trpc.organization.list.queryOptions());

  const createOrgMutation = useMutation(
    trpc.organization.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.organization.list.queryKey(),
        });
        toast.success("Organization created successfully");
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
        toast.success("Organization deleted");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const createInviteMutation = useMutation(
    trpc.organization.createInvitation.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.organization.list.queryKey(),
        });
        const fullLink = `${window.location.origin}${data.inviteLink}`;
        copyToClipboard(fullLink, () => toast.success("Invite link copied to clipboard!"), () => setManualCopyUrl(fullLink));
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const cancelInviteMutation = useMutation(
    trpc.organization.cancelInvitation.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.organization.list.queryKey(),
        });
        toast.success("Invitation cancelled");
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
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage client organizations and invite users
          </p>
        </div>
        <CreateOrganizationDialog
          onSubmit={(name) => createOrgMutation.mutate({ name })}
          isPending={createOrgMutation.isPending}
        />
      </div>

      {organizations.isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : organizations.data?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-medium">No organizations yet</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Create your first organization to start inviting users.
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
                createInviteMutation.mutate({
                  organizationId: org.id,
                  email,
                  role,
                })
              }
              onCancelInvite={(invitationId) =>
                cancelInviteMutation.mutate({ invitationId })
              }
              onCopyFallback={(url) => setManualCopyUrl(url)}
              isDeleting={deleteOrgMutation.isPending}
              isCreatingInvite={createInviteMutation.isPending}
            />
          ))}
        </div>
      )}

      <Dialog open={!!manualCopyUrl} onOpenChange={() => setManualCopyUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Invite Link</DialogTitle>
            <DialogDescription>
              Clipboard access is not available. Please copy the link below manually or try the Copy button.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex gap-2">
            <Input
              value={manualCopyUrl || ""}
              readOnly
              className="w-full"
              onFocus={(e) => e.target.select()}
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (manualCopyUrl) {
                  copyToClipboard(
                    manualCopyUrl,
                    () => {
                      toast.success("Copied to clipboard!");
                      setManualCopyUrl(null);
                    },
                    () => toast.error("Copy failed. Please select and copy manually.")
                  );
                }
              }}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setManualCopyUrl(null)}>Close</Button>
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
        New Organization
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Create a new client organization. You'll be able to invite users
              after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? "Creating..." : "Create"}
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
  onCopyFallback,
  isDeleting,
  isCreatingInvite,
}: {
  organization: Organization;
  onDelete: () => void;
  onCreateInvite: (email: string, role: "member" | "admin") => void;
  onCancelInvite: (invitationId: string) => void;
  onCopyFallback: (url: string) => void;
  isDeleting: boolean;
  isCreatingInvite: boolean;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmail.trim()) {
      onCreateInvite(inviteEmail.trim(), "member");
      setInviteEmail("");
      setInviteDialogOpen(false);
    }
  };

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
                Delete Organization
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
              Members ({organization.members.length})
            </h4>
          </div>
          {organization.members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
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
                        {member.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No members yet</p>
          )}
        </div>

        {/* Pending Invitations Section */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4" />
              Pending Invitations ({pendingInvites.length})
            </h4>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger render={<Button size="sm" variant="outline" />}>
                <Plus className="mr-1 h-3 w-3" />
                Invite
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleInvite}>
                  <DialogHeader>
                    <DialogTitle>Invite User</DialogTitle>
                    <DialogDescription>
                      Send an invitation link to join {organization.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="invite-email">Email Address</Label>
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
                      Cancel
                    </DialogClose>
                    <Button
                      type="submit"
                      disabled={!inviteEmail.trim() || isCreatingInvite}
                    >
                      {isCreatingInvite ? "Creating..." : "Create Invite Link"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {pendingInvites.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
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
                        {invite.role || "member"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => {
                            const link = `${window.location.origin}/invite/${invite.id}`;
                            copyToClipboard(link, () => toast.success("Link copied!"), () => onCopyFallback(link));
                          }}
                          title="Copy invite link"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => onCancelInvite(invite.id)}
                          title="Cancel invitation"
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
              No pending invitations
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
