import React from "react";
import { WorkspaceProvider } from "./WorkspaceContext";
import DashboardLayoutClient from "./DashboardLayoutClient";

export const metadata = {
  title: "Dashboard - Zeta TaskingPro",
  description: "Manage your organizations, projects, boards, and tasks",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </WorkspaceProvider>
  );
}
