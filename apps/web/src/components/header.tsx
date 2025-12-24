import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

import UserMenu from "./user-menu";
import { authClient } from "@/lib/auth-client";

export default function Header() {
  const { data: session } = authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  console.log("🔐 Admin Check:", {
    isAdmin,
    userRole: (session?.user as { role?: string } | undefined)?.role,
    session: session,
  });

  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/webinar", label: "Webinar" },
  ] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex items-center gap-4 text-lg">
          {links.map(({ to, label }) => {
            return (
              <Link key={to} to={to}>
                {label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin/organizations"
              className="flex items-center gap-1.5 text-sm font-medium text-amber-500 hover:text-amber-400"
            >
              <Building2 className="h-4 w-4" />
              Organizations
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
