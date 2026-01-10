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
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>{invitation.error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Go to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = invitation.data!;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>You're invited to join</CardTitle>
          <CardDescription className="text-lg font-semibold text-foreground">
            {data.organizationName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {data.inviterName} has invited you to join as a{" "}
            <strong>{data.role || "member"}</strong>.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            This invitation was sent to <strong>{data.email}</strong>
          </p>
          <Link
            to="/login"
            search={{ invite: invitationId, email: data.email }}
            className={cn(buttonVariants(), "w-full")}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Sign Up to Join
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
