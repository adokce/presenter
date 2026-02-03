import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, UserPlus, AlertCircle } from "lucide-react";

import { useTRPC } from "@/utils/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Loader from "@/components/loader";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/invite/$invitationId")({
  component: InvitePage,
});

function InvitePage() {
  const { invitationId } = Route.useParams();
  const trpc = useTRPC();

  const invitation = useQuery(
    trpc.organization.getInvitation.queryOptions({ id: invitationId })
  );

  if (invitation.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  if (invitation.error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">{m.invalid_invitation()}</CardTitle>
            <CardDescription>{invitation.error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              {m.go_to_home()}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = invitation.data!;
  const roleLabel =
    data.role === "admin"
      ? m.role_admin()
      : data.role === "owner"
        ? m.role_owner()
        : m.role_member();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{m.invited_to_join()}</CardTitle>
          <CardDescription className="text-lg font-semibold text-foreground">
            {data.organizationName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {m.invited_as_role_prefix({ inviter: data.inviterName })}{" "}
            <strong>{roleLabel}</strong>.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            {m.invitation_sent_to({ email: data.email })}
          </p>
          <Link
            to="/login"
            search={{ invite: invitationId, email: data.email }}
            className={cn(buttonVariants(), "w-full")}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {m.sign_up_to_join()}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
