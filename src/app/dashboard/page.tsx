"use client";

import React, { useEffect, useState } from "react";
import { useWorkspace } from "./WorkspaceContext";
import Link from "next/link";

export default function DashboardOverview() {
  const { selectedOrg, user } = useWorkspace();
  const [stats, setStats] = useState({
    projectsCount: 0,
    boardsCount: 0,
    membersCount: 0,
    licenseTier: "Free",
  });
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (selectedOrg) {
      // Calculate project/board stats from selectedOrg local state
      const projectsCount = selectedOrg.projects?.length || 0;
      let boardsCount = 0;
      selectedOrg.projects?.forEach((p: any) => {
        boardsCount += p.boards?.length || 0;
      });

      setStats({
        projectsCount,
        boardsCount,
        membersCount: 0, // Will load from members API
        licenseTier: selectedOrg.license?.plan?.name || "Unlicensed",
      });

      // Load organization members
      fetchMembers();
    }
  }, [selectedOrg]);

  const fetchMembers = async () => {
    if (!selectedOrg) return;
    try {
      const res = await fetch(`/api/organizations/members?organizationId=${selectedOrg.id}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
        setStats((prev) => ({
          ...prev,
          membersCount: data.members.length,
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!selectedOrg) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <p style={{ color: "var(--text-secondary)" }}>Selecting organization...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, #1e3a8a 100%)",
          color: "white",
          padding: "32px 40px",
          borderRadius: "var(--border-radius-lg)",
          boxShadow: "var(--shadow-md)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 2 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            Welcome back, {user?.name}!
          </h1>
          <p style={{ opacity: 0.9, fontSize: 15, maxWidth: 600 }}>
            Here is what is happening in <strong>{selectedOrg.name}</strong> today. Use the sidebar to navigate to your projects and sprint boards.
          </p>
        </div>
        <div
          style={{
            position: "absolute",
            right: -20,
            bottom: -20,
            fontSize: 180,
            opacity: 0.05,
            fontWeight: 900,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          Ζ
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="dashboard-grid">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>Projects</span>
            <span style={{ fontSize: 20 }}>📁</span>
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, marginTop: 12 }}>{stats.projectsCount}</div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
            Active workspaces under this organization
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>Boards</span>
            <span style={{ fontSize: 20 }}>📋</span>
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, marginTop: 12 }}>{stats.boardsCount}</div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
            Kanban and sprint planning boards
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>Team Members</span>
            <span style={{ fontSize: 20 }}>👥</span>
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, marginTop: 12 }}>{stats.membersCount}</div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
            Users joined in this workspace
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>License Key Tier</span>
            <span style={{ fontSize: 20 }}>🔑</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 18, color: "var(--primary)" }}>
            {stats.licenseTier}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
            Expires: {selectedOrg.license ? new Date(selectedOrg.license.expiresAt).toLocaleDateString() : "N/A"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>
        {/* Left: Projects list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Projects & Active Boards</h2>
          
          {selectedOrg.projects?.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>No projects found in this organization.</p>
              {selectedOrg.role === "ADMIN" && (
                <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                  Click the <strong>+ New</strong> button next to &quot;Projects & Boards&quot; in the sidebar to get started.
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {selectedOrg.projects.map((proj: any) => (
                <div key={proj.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700 }}>{proj.name}</h3>
                      <span className="badge badge-success" style={{ fontSize: 10, marginTop: 4 }}>Key: {proj.key}</span>
                    </div>
                    {proj.description && (
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 300, textAlign: "right" }}>
                        {proj.description}
                      </p>
                    )}
                  </div>
                  
                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)" }}>ACTIVE BOARDS:</span>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                      {proj.boards?.length === 0 ? (
                        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No boards created.</span>
                      ) : (
                        proj.boards.map((board: any) => (
                          <Link
                            key={board.id}
                            href={`/dashboard/org/${selectedOrg.id}/project/${proj.id}/board/${board.id}`}
                            className="btn btn-outline"
                            style={{ padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
                          >
                            📋 {board.name}
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Team Directory */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Team Directory</h2>
            {selectedOrg.role === "ADMIN" && (
              <Link href={`/dashboard/org/${selectedOrg.id}/settings?tab=members`} style={{ fontSize: 13, fontWeight: 600 }}>
                Manage
              </Link>
            )}
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {members.map((member) => (
              <div
                key={member.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: "var(--primary-light)",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {member.user.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{member.user.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{member.user.email}</div>
                  </div>
                </div>
                <span className={member.role === "ADMIN" ? "badge badge-primary" : "badge badge-success"} style={{ fontSize: 9 }}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
