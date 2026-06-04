"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "../../../WorkspaceContext";
import { COMMON_TIMEZONES } from "@/lib/timezone";

export default function OrgSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = params?.orgId as string;
  const initialTab = searchParams?.get("tab") || "general";

  const { selectedOrg, refreshOrgs } = useWorkspace();
  const [activeTab, setActiveTab] = useState(initialTab);

  // General settings state
  const [orgName, setOrgName] = useState("");
  const [orgTimezone, setOrgTimezone] = useState("UTC");
  const [generalLoading, setGeneralLoading] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState("");
  const [generalError, setGeneralError] = useState("");

  // Members list states
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // Invite member states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [invitations, setInvitations] = useState<any[]>([]);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Board Access Assignment State
  const [boardToggleLoading, setBoardToggleLoading] = useState<string | null>(null);

  // Direct assign states
  const [assignEmail, setAssignEmail] = useState("");
  const [assignRole, setAssignRole] = useState("MEMBER");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState("");
  const [assignError, setAssignError] = useState("");

  useEffect(() => {
    if (selectedOrg) {
      setOrgName(selectedOrg.name);
      setOrgTimezone(selectedOrg.timezone);
      fetchMembers();
      fetchInvitations();
    }
  }, [selectedOrg]);

  // If redirecting tab query param changes
  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const fetchMembers = async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/organizations/members?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchInvitations = async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/organizations/invite?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralLoading(true);
    setGeneralSuccess("");
    setGeneralError("");

    try {
      const res = await fetch("/api/organizations/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          name: orgName,
          timezone: orgTimezone,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setGeneralSuccess("Organization details updated successfully!");
        await refreshOrgs();
      } else {
        setGeneralError(data.error || "Failed to update configuration");
      }
    } catch {
      setGeneralError("Network error. Please try again.");
    } finally {
      setGeneralLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteSuccess("");
    setInviteError("");
    setDevOtp(null);

    try {
      const res = await fetch("/api/organizations/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          organizationId: orgId,
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInviteSuccess(`Invitation sent successfully to ${inviteEmail}!`);
        setInviteEmail("");
        fetchInvitations();
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
      } else {
        setInviteError(data.error || "Failed to send invitation");
      }
    } catch {
      setInviteError("Network error. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDirectAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignLoading(true);
    setAssignSuccess("");
    setAssignError("");

    try {
      const res = await fetch("/api/organizations/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: assignEmail,
          organizationId: orgId,
          role: assignRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAssignSuccess(`User ${assignEmail} assigned to organization directly!`);
        setAssignEmail("");
        fetchMembers();
      } else {
        setAssignError(data.error || "Failed to assign user directly");
      }
    } catch {
      setAssignError("Network error. Please try again.");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      const res = await fetch(`/api/organizations/members?organizationId=${orgId}&userId=${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        fetchMembers();
      } else {
        alert(data.error || "Failed to remove member");
      }
    } catch {
      alert("Network error.");
    }
  };

  const handleToggleBoardAccess = async (userId: string, boardId: string, isCurrentlyAssigned: boolean) => {
    setBoardToggleLoading(`${userId}-${boardId}`);
    try {
      const method = isCurrentlyAssigned ? "DELETE" : "POST";
      const url = isCurrentlyAssigned 
        ? `/api/boards/members?boardId=${boardId}&userId=${userId}` 
        : `/api/boards/members`;
      
      const options: RequestInit = { method };
      if (!isCurrentlyAssigned) {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify({ boardId, userId });
      }

      const res = await fetch(url, options);
      if (res.ok) {
        // Optimistically update the members state
        setMembers(prevMembers => prevMembers.map(m => {
          if (m.user.id === userId) {
            let updatedBoardMembers = [...(m.user.boardMembers || [])];
            if (isCurrentlyAssigned) {
              updatedBoardMembers = updatedBoardMembers.filter(bm => bm.boardId !== boardId);
            } else {
              updatedBoardMembers.push({ boardId, userId });
            }
            return {
              ...m,
              user: { ...m.user, boardMembers: updatedBoardMembers }
            };
          }
          return m;
        }));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update board access");
      }
    } catch {
      alert("Network error.");
    } finally {
      setBoardToggleLoading(null);
    }
  };

  if (!selectedOrg) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Organization Settings</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Manage your organization name, timezone defaults, team access, and invitations.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", gap: 16 }}>
        <button
          onClick={() => setActiveTab("general")}
          className={`nav-item ${activeTab === "general" ? "active" : ""}`}
          style={{ width: "auto", borderBottom: activeTab === "general" ? "2px solid var(--primary)" : "none", borderRadius: 0, padding: "8px 16px" }}
        >
          🏢 General Configuration
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`nav-item ${activeTab === "members" ? "active" : ""}`}
          style={{ width: "auto", borderBottom: activeTab === "members" ? "2px solid var(--primary)" : "none", borderRadius: 0, padding: "8px 16px" }}
        >
          👥 Team Members & Invitations
        </button>
      </div>

      {/* General Settings Content */}
      {activeTab === "general" && (
        <div className="card" style={{ maxWidth: 600 }}>
          <h3 className="card-title">General Settings</h3>
          {generalSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>{generalSuccess}</div>}
          {generalError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{generalError}</div>}

          <form onSubmit={handleUpdateGeneral} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                placeholder="E.g. Acme Corp"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Default Workspace Timezone</label>
              <select value={orgTimezone} onChange={(e) => setOrgTimezone(e.target.value)} required>
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <span className="form-helper">This timezone will be used as default for rendering task created time.</span>
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", padding: "10px 24px" }} disabled={generalLoading}>
              {generalLoading ? "Saving Changes..." : "Save Config"}
            </button>
          </form>
        </div>
      )}

      {/* Team Members Content */}
      {activeTab === "members" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32, alignItems: "start" }}>
          
          {/* Left Panel: Members directory */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card">
              <h3 className="card-title">Active Team Members</h3>
              {membersLoading ? (
                <p style={{ color: "var(--text-secondary)" }}>Loading team directory...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                  {members.map((m) => (
                  <React.Fragment key={m.id}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            backgroundColor: "var(--primary-light)",
                            color: "var(--primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                          }}
                        >
                          {m.user.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{m.user.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{m.user.email} (TZ: {m.user.timezone})</div>
                          
                          {/* Board Assignment Chips */}
                          {m.role !== "ADMIN" && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
                              {m.user.boardMembers?.map((bm: any) => {
                                // Find the board name
                                let boardName = "Unknown Board";
                                selectedOrg.projects?.forEach((p: any) => {
                                  const b = p.boards?.find((b: any) => b.id === bm.boardId);
                                  if (b) boardName = b.name;
                                });
                                
                                const isLoading = boardToggleLoading === `${m.user.id}-${bm.boardId}`;

                                return (
                                  <div key={bm.boardId} style={{
                                    display: "flex", alignItems: "center", gap: 4, 
                                    backgroundColor: "var(--background-secondary)", 
                                    border: "1px solid var(--border-color)",
                                    padding: "2px 8px", borderRadius: 12, fontSize: 11,
                                    opacity: isLoading ? 0.5 : 1
                                  }}>
                                    <span>{boardName}</span>
                                    <button 
                                      onClick={() => handleToggleBoardAccess(m.user.id, bm.boardId, true)}
                                      disabled={isLoading}
                                      style={{ background: "none", color: "var(--text-tertiary)", cursor: isLoading ? "not-allowed" : "pointer", fontSize: 12, marginLeft: 2 }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              })}
                              
                              {/* Assign Dropdown */}
                              <select 
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleToggleBoardAccess(m.user.id, e.target.value, false);
                                  }
                                }}
                                style={{
                                  backgroundColor: "transparent",
                                  border: "1px dashed var(--border-color)",
                                  borderRadius: 12,
                                  fontSize: 11,
                                  padding: "2px 6px",
                                  color: "var(--text-secondary)",
                                  cursor: "pointer",
                                  outline: "none"
                                }}
                              >
                                <option value="" disabled>+ Assign Board</option>
                                {selectedOrg.projects?.map((proj: any) => {
                                  const unassignedBoards = proj.boards?.filter((b: any) => 
                                    !m.user.boardMembers?.some((bm: any) => bm.boardId === b.id)
                                  ) || [];
                                  
                                  if (unassignedBoards.length === 0) return null;
                                  
                                  return (
                                    <optgroup key={proj.id} label={proj.name}>
                                      {unassignedBoards.map((b: any) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                      ))}
                                    </optgroup>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                          {m.role === "ADMIN" && (
                            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
                              Has access to all boards
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className={m.role === "ADMIN" ? "badge badge-primary" : "badge badge-success"} style={{ fontSize: 10 }}>
                          {m.role}
                        </span>
                        <button
                          onClick={() => handleRemoveMember(m.user.id)}
                          style={{ background: "none", color: "var(--danger)", fontSize: 12 }}
                          title="Remove Member"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="card-title">Pending Invitations</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                {invitations.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No pending invitations found.</p>
                ) : (
                  invitations.map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{inv.email}</div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          Invited: {new Date(inv.createdAt).toLocaleDateString()} | Role: {inv.role}
                        </div>
                      </div>
                      <span className="badge badge-warning" style={{ fontSize: 10 }}>
                        Pending
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Add / Invite Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Form 1: Email Invite */}
            <div className="card">
              <h3 className="card-title">Invite via Email</h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>
                Sends an automated link and verification code. Recommended for new platform users.
              </p>

              {inviteSuccess && <div className="alert alert-success" style={{ marginBottom: 12 }}>{inviteSuccess}</div>}
              {inviteError && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{inviteError}</div>}
              {devOtp && (
                <div className="dev-otp-banner" style={{ marginBottom: 12 }}>
                  [DEV] Invitation Verification Code:
                  <strong>{devOtp}</strong>
                </div>
              )}

              <form onSubmit={handleInviteUser} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="teammate@domain.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} required>
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={inviteLoading}>
                  {inviteLoading ? "Sending invite..." : "Send Invitation"}
                </button>
              </form>
            </div>

            {/* Form 2: Direct Assignment */}
            <div className="card">
              <h3 className="card-title">Assign Directly</h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>
                Instantly assign a user to the organization. Only works if they already have an account.
              </p>

              {assignSuccess && <div className="alert alert-success" style={{ marginBottom: 12 }}>{assignSuccess}</div>}
              {assignError && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{assignError}</div>}

              <form onSubmit={handleDirectAssign} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">User Email</label>
                  <input
                    type="email"
                    value={assignEmail}
                    onChange={(e) => setAssignEmail(e.target.value)}
                    required
                    placeholder="existinguser@domain.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select value={assignRole} onChange={(e) => setAssignRole(e.target.value)} required>
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-outline" style={{ width: "100%" }} disabled={assignLoading}>
                  {assignLoading ? "Assigning..." : "Assign User Directly"}
                </button>
              </form>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
