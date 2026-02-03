import { Link, useNavigate } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";
import { getLocale, locales, setLocale } from "@/paraglide/runtime";

import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

const LOCALE_LABELS: Record<string, () => string> = {
  bs: () => m.language_bosnian(),
  en: () => m.language_english(),
};

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const currentLocale = getLocale();

  useEffect(() => {
    // Check if theme is stored in localStorage
    const storedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const initialTheme = storedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    
    // Apply theme to document
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    return (
      <Link to="/login">
        <Button variant="outline">{m.sign_in()}</Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {session.user.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{m.my_account()}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={toggleTheme}>
            <div className="flex items-center gap-2">
              {theme === "light" ? (
                <>
                  <Moon className="h-4 w-4" />
                  <span>{m.dark_mode()}</span>
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4" />
                  <span>{m.light_mode()}</span>
                </>
              )}
            </div>
          </DropdownMenuItem>
          <DropdownMenuLabel className="mt-1">{m.language()}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={currentLocale}
            onValueChange={(value) => {
              if (value !== currentLocale) {
                setLocale(value);
              }
            }}
          >
            {locales.map((locale) => (
              <DropdownMenuRadioItem key={locale} value={locale}>
                {(LOCALE_LABELS[locale] ?? (() => locale.toUpperCase()))()}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    navigate({
                      to: "/",
                    });
                  },
                },
              });
            }}
          >
            {m.sign_out()}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
