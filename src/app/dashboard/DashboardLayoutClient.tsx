"use client";

import React, { useState, useEffect } from "react";
import { useWorkspace } from "./WorkspaceContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COMMON_TIMEZONES } from "@/lib/timezone";
import "./dashboard.css";

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, organizations, selectedOrg, setSelectedOrg, refreshOrgs, loading } = useWorkspace();

  // Dropdown states
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Modal toggle states
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);

  // Form states - Create Org
  const [orgName, setOrgName] = useState("");
  const [orgTimezone, setOrgTimezone] = useState("UTC");
  const [licenseKey, setLicenseKey] = useState("");
  const [orgError, setOrgError] = useState("");
  const [orgLoading, setOrgLoading] = useState(false);

  // Form states - Create Project
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectError, setProjectError] = useState("");
  const [projectLoading, setProjectLoading] = useState(false);

  // Form states - Create Board
  const [boardName, setBoardName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [boardError, setBoardError] = useState("");
  const [boardLoading, setBoardLoading] = useState(false);

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);

  // Active theme
  const [theme, setTheme] = useState("light");

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }
    if (notif.taskId) {
      try {
        const res = await fetch(`/api/tasks/detail?taskId=${notif.taskId}`);
        if (res.ok) {
          const data = await res.json();
          const { task } = data;
          if (task) {
             const orgId = task.project?.organizationId || selectedOrg?.id;
             const projectId = task.projectId;
             const boardId = task.boardId;
             
             // Close drawer
             setShowNotificationsDrawer(false);
             
             // Check if we are already on the same board
             const targetPath = `/dashboard/org/${orgId}/project/${projectId}/board/${boardId}`;
             if (window.location.pathname === targetPath) {
               window.location.href = `${targetPath}?taskId=${notif.taskId}`;
             } else {
               router.push(`${targetPath}?taskId=${notif.taskId}`);
             }
          }
        }
      } catch (e) {
        console.error("Redirection error", e);
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    // Detect current theme
    const activeTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(activeTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("zeta-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("zeta-theme", "light");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (e) {
      console.error(e);
    }
  };

  // Submit org creation
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgLoading(true);
    setOrgError("");

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, timezone: orgTimezone, licenseKey }),
      });

      const data = await res.json();
      if (res.ok) {
        setOrgName("");
        setLicenseKey("");
        setShowCreateOrg(false);
        await refreshOrgs();
      } else {
        setOrgError(data.error || "Failed to create organization");
      }
    } catch {
      setOrgError("Network error. Please try again.");
    } finally {
      setOrgLoading(false);
    }
  };

  // Submit project creation
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    setProjectLoading(true);
    setProjectError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          key: projectKey,
          description: projectDesc,
          organizationId: selectedOrg.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setProjectName("");
        setProjectKey("");
        setProjectDesc("");
        setShowCreateProject(false);
        await refreshOrgs();
      } else {
        setProjectError(data.error || "Failed to create project");
      }
    } catch {
      setProjectError("Network error. Please try again.");
    } finally {
      setProjectLoading(false);
    }
  };

  // Submit board creation
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setBoardLoading(true);
    setBoardError("");

    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: boardName,
          projectId: selectedProjectId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBoardName("");
        setShowCreateBoard(false);
        await refreshOrgs();
        // Redirect to new board page
        router.push(`/dashboard/org/${selectedOrg?.id}/project/${selectedProjectId}/board/${data.board.id}`);
      } else {
        setBoardError(data.error || "Failed to create board");
      }
    } catch {
      setBoardError("Network error. Please try again.");
    } finally {
      setBoardLoading(false);
    }
  };

  // Auto-fill project key suggestion based on name
  const handleProjectNameChange = (val: string) => {
    setProjectName(val);
    if (val.length >= 3) {
      const suggestion = val
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 4);
      setProjectKey(suggestion);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--bg-primary)" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>Loading your workspaces...</p>
      </div>
    );
  }

  // FORCE CREATION OF AN ORG IF USER HAS NONE
  if (organizations.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--bg-primary)", padding: 24 }}>
        <div className="admin-form-box" style={{ width: "100%", maxWidth: 480, animation: "scaleUp 0.4s" }}>
          <div className="logo-container" style={{ justifyContent: "center", marginBottom: 20 }}>
            <div style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>Ζ</div>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>Zeta TaskingPro</span>
          </div>
          <h2 className="admin-form-title" style={{ textAlign: "center", border: "none", paddingBottom: 0, marginBottom: 12 }}>
            Set Up Your Organization
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", marginBottom: 24 }}>
            Redeem a platform license key generated by your administrator to set up your primary workspace.
          </p>

          {orgError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{orgError}</div>}

          <form onSubmit={handleCreateOrg} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Organization Name</label>
              <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder="Acme Corporation" />
            </div>
            <div className="form-group">
              <label className="form-label">Primary Timezone</label>
              <select value={orgTimezone} onChange={(e) => setOrgTimezone(e.target.value)} required>
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <span className="form-helper">Will be used to parse task creation logs and schedules.</span>
            </div>
            <div className="form-group">
              <label className="form-label">Redeem License Key</label>
              <input type="text" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} required placeholder="XXXX-XXXX-XXXX-XXXX" />
              <span className="form-helper">Buy a plan on the landing page or request a key from the administrator.</span>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={orgLoading}>
              {orgLoading ? "Setting up workspace..." : "Activate & Launch Workspace"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24, fontSize: 13 }}>
            <button onClick={handleLogout} className="btn-link" style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}>
              Sign Out Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="db-container">
      {/* SIDEBAR */}
      <aside className="db-sidebar">
        <div className="db-sidebar-header">
          <div style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>Ζ</div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.5 }}>TaskingPro</span>
        </div>

        <div className="db-sidebar-content">
          {/* Org Selector */}
          <div className="org-selector">
            <button className="org-selector-btn" onClick={() => setShowOrgDropdown(!showOrgDropdown)}>
              <span>🏢 {selectedOrg?.name || "Select Org"}</span>
              <span style={{ fontSize: 10 }}>▼</span>
            </button>

            {showOrgDropdown && (
              <div className="org-dropdown-menu">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    className={`org-dropdown-item ${selectedOrg?.id === org.id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedOrg(org);
                      setShowOrgDropdown(false);
                    }}
                  >
                    <strong>{org.name}</strong>
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Role: {org.role}</span>
                  </button>
                ))}
                <div style={{ borderTop: "1px solid var(--border-color)", margin: "4px 0" }}></div>
                <button
                  className="org-dropdown-item"
                  style={{ color: "var(--primary)", fontWeight: 600 }}
                  onClick={() => {
                    setShowCreateOrg(true);
                    setShowOrgDropdown(false);
                  }}
                >
                  ➕ Redeem New License
                </button>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <span className="nav-group-title">Overview</span>
              <nav className="nav-list">
                <Link href="/dashboard" className="nav-item">
                  📊 Dashboard Overview
                </Link>
                {selectedOrg?.role === "ADMIN" && (
                  <Link href={`/dashboard/org/${selectedOrg.id}/settings`} className="nav-item">
                    ⚙️ Org Settings
                  </Link>
                )}
              </nav>
            </div>

            <div>
              <div className="flex justify-between align-center" style={{ paddingRight: 8, marginBottom: 8 }}>
                <span className="nav-group-title" style={{ marginBottom: 0 }}>Projects & Boards</span>
                {selectedOrg?.role === "ADMIN" && (
                  <button
                    onClick={() => setShowCreateProject(true)}
                    style={{ fontSize: 11, background: "none", color: "var(--primary)", fontWeight: 600 }}
                  >
                    + New
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingLeft: 4 }}>
                {selectedOrg?.projects.length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)", paddingLeft: 8 }}>No projects created yet.</span>
                ) : (
                  selectedOrg?.projects.map((proj: any) => (
                    <div key={proj.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div className="flex justify-between align-center" style={{ padding: "4px 8px" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
                          📁 {proj.name} ({proj.key})
                        </span>
                        {selectedOrg?.role === "ADMIN" && (
                          <button
                            onClick={() => {
                              setSelectedProjectId(proj.id);
                              setShowCreateBoard(true);
                            }}
                            style={{ fontSize: 12, background: "none", color: "var(--text-tertiary)" }}
                            title="Add Board"
                          >
                            ＋
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 8 }}>
                        {proj.boards?.length === 0 ? (
                          <span style={{ fontSize: 11, color: "var(--text-tertiary)", paddingLeft: 12 }}>No boards</span>
                        ) : (
                          proj.boards?.map((b: any) => (
                            <Link
                              key={b.id}
                              href={`/dashboard/org/${selectedOrg.id}/project/${proj.id}/board/${b.id}`}
                              className="nav-item"
                              style={{ padding: "4px 8px", fontSize: 12 }}
                            >
                              📋 {b.name}
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="db-sidebar-footer">
          <div className="user-sidebar-card">
            <div className="user-avatar">
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="user-sidebar-info">
              <div className="user-sidebar-name">{user?.name}</div>
              <div className="user-sidebar-email">{user?.email}</div>
            </div>
            <button onClick={toggleTheme} style={{ background: "none", fontSize: 16 }} title="Toggle Theme">
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-outline"
            style={{ width: "100%", marginTop: 12, padding: "6px 0", fontSize: 12 }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="db-main">
        {/* HEADER */}
        <header className="db-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="badge badge-primary">{selectedOrg?.name}</span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Timezone: {selectedOrg?.timezone}</span>
          </div>

          <div className="flex align-center gap-2">
            {/* Notification Bell */}
            <div className="notification-bell-container" style={{ marginRight: 4 }}>
              <button
                onClick={() => {
                  setShowNotificationsDrawer(true);
                  fetchNotifications(); // Refresh on open
                }}
                className="notification-bell-btn"
                title="Notifications"
              >
                🔔
              </button>
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </div>

            {user?.role === "PLATFORM_ADMIN" && (
              <Link href="/platform-admin" className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }}>
                ⚙️ Platform Admin Panel
              </Link>
            )}
            <Link
              href="/dashboard/profile"
              className="btn btn-outline"
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              👤 My Profile
            </Link>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="db-content">{children}</main>
      </div>

      {/* MODAL: CREATE ORG */}
      {showCreateOrg && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Redeem License & Create Org</h3>
              <button className="modal-close" onClick={() => setShowCreateOrg(false)}>×</button>
            </div>
            <form onSubmit={handleCreateOrg}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {orgError && <div className="alert alert-danger">{orgError}</div>}
                <div className="form-group">
                  <label className="form-label">Organization Name</label>
                  <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder="Acme Inc" />
                </div>
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <select value={orgTimezone} onChange={(e) => setOrgTimezone(e.target.value)} required>
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">License Key</label>
                  <input type="text" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} required placeholder="XXXX-XXXX-XXXX-XXXX" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateOrg(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={orgLoading}>
                  {orgLoading ? "Activating..." : "Redeem & Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PROJECT */}
      {showCreateProject && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create New Project</h3>
              <button className="modal-close" onClick={() => setShowCreateProject(false)}>×</button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {projectError && <div className="alert alert-danger">{projectError}</div>}
                <div className="form-group">
                  <label className="form-label">Project Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => handleProjectNameChange(e.target.value)}
                    required
                    placeholder="E.g. Mobile Application"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Project Key (Short Code)</label>
                  <input
                    type="text"
                    value={projectKey}
                    onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                    required
                    maxLength={5}
                    placeholder="E.g. MOB"
                  />
                  <span className="form-helper">Used as prefix for tasks (e.g. MOB-12)</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Description (Optional)</label>
                  <textarea value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} placeholder="Short description of the project" rows={3}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateProject(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={projectLoading}>
                  {projectLoading ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE BOARD */}
      {showCreateBoard && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create New Board</h3>
              <button className="modal-close" onClick={() => setShowCreateBoard(false)}>×</button>
            </div>
            <form onSubmit={handleCreateBoard}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {boardError && <div className="alert alert-danger">{boardError}</div>}
                <div className="form-group">
                  <label className="form-label">Board Name</label>
                  <input type="text" value={boardName} onChange={(e) => setBoardName(e.target.value)} required placeholder="E.g. Sprint Board" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateBoard(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={boardLoading}>
                  {boardLoading ? "Creating..." : "Create Board"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: NOTIFICATIONS */}
      {showNotificationsDrawer && (
        <div className="drawer-overlay" onClick={() => setShowNotificationsDrawer(false)}>
          <div className="drawer-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Notifications</h3>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {unreadCount} unread notification{unreadCount !== 1 && "s"}
                </span>
              </div>
              <div className="notification-header-actions">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={handleMarkAllAsRead}
                      className="btn-link"
                      style={{ fontSize: 12, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Mark all read
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="btn-link"
                      style={{ fontSize: 12, color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Clear all
                    </button>
                  </>
                )}
                <button
                  className="modal-close"
                  onClick={() => setShowNotificationsDrawer(false)}
                  style={{ fontSize: 24, padding: "0 4px", cursor: "pointer" }}
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="drawer-body" style={{ padding: 16 }}>
              {notifications.length === 0 ? (
                <div className="notification-empty">
                  <span className="notification-empty-icon">🔔</span>
                  <p style={{ margin: 0, fontWeight: 600 }}>All caught up!</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>
                    You have no notifications at the moment.
                  </p>
                </div>
              ) : (
                <div className="notification-list">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notification-item ${!notif.isRead ? "unread" : ""}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      {!notif.isRead && <span className="notification-dot"></span>}
                      <div className="notification-item-content">
                        <div className="notification-item-title">
                          <span>{notif.title}</span>
                          {!notif.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notif.id);
                              }}
                              className="btn-link"
                              style={{ fontSize: 11, color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }}
                              title="Mark as read"
                            >
                              ✓
                            </button>
                          )}
                        </div>
                        <div className="notification-item-msg">{notif.message}</div>
                        <span className="notification-item-time">
                          {new Date(notif.createdAt).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
