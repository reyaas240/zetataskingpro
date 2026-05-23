"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface WorkspaceContextProps {
  user: any;
  organizations: any[];
  selectedOrg: any | null;
  setSelectedOrg: (org: any) => void;
  refreshOrgs: () => Promise<void>;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrgId] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSessionAndOrgs = async () => {
    try {
      // 1. Fetch Session
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) {
        router.push("/login");
        return;
      }
      const sessionData = await sessionRes.json();
      setUser(sessionData.user);

      // 2. Fetch Organizations
      const orgRes = await fetch("/api/organizations");
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrganizations(orgData.organizations);

        // Pre-select first organization or keep current selection if it still exists
        if (orgData.organizations.length > 0) {
          setSelectedOrgId((prev: any) => {
            if (prev) {
              const stillExists = orgData.organizations.find((o: any) => o.id === prev.id);
              if (stillExists) return stillExists;
            }
            return orgData.organizations[0];
          });
        } else {
          setSelectedOrgId(null);
        }
      }
    } catch (e) {
      console.error("Failed to load workspace context", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAndOrgs();
  }, []);

  const refreshOrgs = async () => {
    try {
      const orgRes = await fetch("/api/organizations");
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrganizations(orgData.organizations);
        
        // Update selectedOrg reference
        if (orgData.organizations.length > 0) {
          setSelectedOrgId((prev: any) => {
            if (prev) {
              const matched = orgData.organizations.find((o: any) => o.id === prev.id);
              if (matched) return matched;
            }
            return orgData.organizations[0];
          });
        } else {
          setSelectedOrgId(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectOrg = (org: any) => {
    setSelectedOrgId(org);
    router.push("/dashboard"); // Reset route to root dashboard when swapping orgs
  };

  return (
    <WorkspaceContext.Provider
      value={{
        user,
        organizations,
        selectedOrg,
        setSelectedOrg: handleSelectOrg,
        refreshOrgs,
        loading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
