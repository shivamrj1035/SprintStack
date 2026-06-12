import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWorkspaceContext } from "@/server-fns/functions";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  kind: "organization" | "personal";
  logo_url: string | null;
  theme_color: string;
  modules: string[] | null;
  permission_config: Record<string, string[]> | null;
  created_by: string;
  created_at: string | Date;
  updated_at: string | Date;
  current_user_role: "super_admin" | "admin" | "member";
  can_manage: boolean;
}

interface WorkspaceContextValue {
  activeOrgId: string | null;
  activeOrg: Organization | null;
  setActiveOrgId: (id: string) => void;
  organizations: Organization[];
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspaceQ = useQuery({
    queryKey: ["workspace-context"],
    queryFn: () => getWorkspaceContext(),
  });

  const organizations = (workspaceQ.data?.organizations ?? []) as Organization[];
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);

  // Load from localStorage or default to personal workspace
  useEffect(() => {
    if (workspaceQ.isSuccess && organizations.length > 0) {
      const savedId = localStorage.getItem("active_org_id");
      const exists = savedId && organizations.some((org) => org.id === savedId);

      if (exists) {
        setActiveOrgIdState(savedId);
      } else {
        // Default: Find Personal Workspace
        const personal = organizations.find((org) => org.kind === "personal") ?? organizations[0];
        if (personal) {
          setActiveOrgIdState(personal.id);
          localStorage.setItem("active_org_id", personal.id);
        }
      }
    }
  }, [workspaceQ.isSuccess, organizations]);

  const activeOrg = organizations.find((org) => org.id === activeOrgId) ?? null;

  const setActiveOrgId = (id: string) => {
    setActiveOrgIdState(id);
    localStorage.setItem("active_org_id", id);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeOrgId,
        activeOrg,
        setActiveOrgId,
        organizations,
        isLoading: workspaceQ.isLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
