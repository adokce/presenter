import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { z } from "zod";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSignupStatus } from "@/functions/get-signup-status";
import { getInvitationStatus } from "@/functions/get-invitation-status";
import { getUser } from "@/functions/get-user";
import { m } from "@/paraglide/messages";

const loginSearchSchema = z.object({
  invite: z.string().optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: async ({ search }) => {
    const signupStatus = await getSignupStatus();
    const session = await getUser();
    const hasUsers = signupStatus?.hasUsers ?? false;
    const inviteId = search.invite;
    const inviteStatus =
      hasUsers && inviteId
        ? await getInvitationStatus({ data: { id: inviteId } })
        : null;

    return { signupStatus, session, inviteStatus };
  },
  loader: async ({ context }) => {
    if (context.session) {
      const role = (context.session.user as { role?: string } | undefined)?.role;
      if (role === "admin") {
        throw redirect({ to: "/admin/organizations" });
      }
      throw redirect({ to: "/webinar" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { invite, email } = Route.useSearch();
  const { signupStatus, inviteStatus } = Route.useRouteContext();
  const navigate = useNavigate({ from: "/login" });
  const hasUsers = signupStatus?.hasUsers ?? false;
  const hasInvite = Boolean(invite);
  const inviteValid = inviteStatus?.valid ?? false;
  const showSignup = !hasUsers || (hasInvite && inviteValid);
  const goToSignIn = () => {
    navigate({ to: "/login" });
  };

  if (hasUsers && hasInvite && !inviteValid) {
    const invalidMessage =
      inviteStatus?.reason === "expired"
        ? "This invitation has expired."
        : inviteStatus?.reason === "not_pending"
          ? "This invitation is no longer valid."
          : "Invitation not found.";

    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">{m.invalid_invitation()}</CardTitle>
            <CardDescription>{invalidMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={goToSignIn} variant="outline" className="w-full">
              {m.go_to_login()}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSignup) {
    const inviteEmail = hasInvite && inviteValid ? inviteStatus?.email : email;
    return (
      <SignUpForm
        onSwitchToSignIn={goToSignIn}
        inviteEmail={inviteEmail}
        inviteId={hasInvite && inviteValid ? invite : undefined}
        showSignInLink={hasUsers}
      />
    );
  }

  return <SignInForm showSignUpLink={false} />;
}
