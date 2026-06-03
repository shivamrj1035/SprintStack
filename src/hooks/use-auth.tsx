import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/tanstack-start";
import type { UserResource } from "@clerk/types";

export type AppRole = "super_admin" | "admin" | "manager" | "employee";

interface AuthContextValue {
  session: { id: string | null | undefined } | null;
  user: UserResource | null;
  profile: { name: string | null; email: string | null; avatar_url: string | null } | null;
  roles: AppRole[];
  isSuperAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut, sessionId } = useClerkAuth();

  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    if (user) {
      // Extract roles from Clerk public metadata
      const userRoles = (user.publicMetadata?.roles as AppRole[]) || [];
      setRoles(userRoles);
    } else {
      setRoles([]);
    }
  }, [user]);

  const profile = user
    ? {
        name: user.fullName || null,
        email: user.primaryEmailAddress?.emailAddress || null,
        avatar_url: user.imageUrl || null,
      }
    : null;
  const isSuperAdmin =
    profile?.email?.toLowerCase() === "srjtheinfinity1035@gmail.com" ||
    roles.includes("super_admin");

  return (
    <AuthContext.Provider
      value={{
        session: isSignedIn ? { id: sessionId } : null,
        user: user ?? null,
        profile,
        roles: isSuperAdmin ? Array.from(new Set(["super_admin", ...roles])) : roles,
        isSuperAdmin,
        loading: !isLoaded,
        signOut: async () => {
          await signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
