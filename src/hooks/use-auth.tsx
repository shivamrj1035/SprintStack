import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentSession, logoutUser } from "@/lib/auth-server";

export type AppRole = "super_admin" | "admin" | "member";

interface AuthContextValue {
  session: { id: string | null | undefined } | null;
  user: {
    id: string;
    fullName: string | null;
    imageUrl: string | null;
    primaryEmailAddress?: {
      emailAddress: string;
    };
  } | null;
  profile: { name: string | null; email: string | null; avatar_url: string | null } | null;
  roles: AppRole[];
  isSuperAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refetchSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionData, setSessionData] = useState<{
    userId: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
    isSuperAdmin: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  const fetchSession = async () => {
    try {
      const data = await getCurrentSession();
      setSessionData(data);
    } catch (err) {
      console.error("Failed to load session:", err);
      setSessionData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (sessionData) {
      setRoles(sessionData.isSuperAdmin ? ["super_admin"] : []);
    } else {
      setRoles([]);
    }
  }, [sessionData]);

  const profile = sessionData
    ? {
        name: sessionData.name || null,
        email: sessionData.email || null,
        avatar_url: sessionData.avatarUrl || null,
      }
    : null;

  const isSuperAdmin = sessionData?.isSuperAdmin ?? roles.includes("super_admin");

  const user = sessionData
    ? {
        id: sessionData.userId,
        fullName: sessionData.name,
        imageUrl: sessionData.avatarUrl,
        primaryEmailAddress: sessionData.email ? { emailAddress: sessionData.email } : undefined,
      }
    : null;

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setSessionData(null);
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session: sessionData ? { id: sessionData.userId } : null,
        user,
        profile,
        roles: isSuperAdmin ? Array.from(new Set(["super_admin", ...roles])) : roles,
        isSuperAdmin,
        loading,
        signOut: handleSignOut,
        refetchSession: fetchSession,
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
