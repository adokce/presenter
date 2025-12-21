import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

const loginSearchSchema = z.object({
  invite: z.string().optional(),
  email: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { invite, email } = Route.useSearch();
  const [showSignIn, setShowSignIn] = useState(false);

  return showSignIn ? (
    <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
  ) : (
    <SignUpForm
      onSwitchToSignIn={() => setShowSignIn(true)}
      inviteEmail={email}
      inviteId={invite}
    />
  );
}
