"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import "./admin.css";

export default function PlatformAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("organizations"); // organizations, licenses, smtp

  // Login credentials (for system administrator unlock if not signed in)
  const [email, setEmail] = useState("admin@zetatasking.pro");
  const [password, setPassword] = useState("admin123");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // SMTP form states
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [platformName, setPlatformName] = useState("");
  const [smtpSuccess, setSmtpSuccess] = useState("");
  const [smtpError, setSmtpError] = useState("");

  // Licenses states
  const [licenses, setLicenses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [customDays, setCustomDays] = useState("");
  const [licenseSuccess, setLicenseSuccess] = useState("");
  const [licenseError, setLicenseError] = useState("");

  // Organizations states
  const [organizations, setOrganizations] = useState<any[]>([]);

  // System stats
  const [stats, setStats] = useState({
    totalOrgs: 0,
    totalUsers: 0,
    activeLicenses: 0,
  });

  // Verify auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (res.status === 200) {
        setIsAuthenticated(true);
        const data = await res.json();
        setSmtpHost(data.smtpHost);
        setSmtpPort(data.smtpPort);
        setSmtpUser(data.smtpUser);
        setSmtpFrom(data.smtpFrom);
        setPlatformName(data.platformName);
        
        // Fetch remaining admin data
        fetchLicenses();
        fetchOrganizations();
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.user.role === "PLATFORM_ADMIN") {
          setIsAuthenticated(true);
          checkAuth();
        } else {
          setLoginError("Access denied: You are not a Platform Administrator.");
        }
      } else {
        setLoginError(data.error || "Invalid credentials.");
      }
    } catch (e) {
      setLoginError("Failed to connect to authentication server.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLicenses = async () => {
    try {
      const res = await fetch("/api/admin/license");
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses);
        setPlans(data.plans);
        if (data.plans.length > 0 && !selectedPlanId) {
          setSelectedPlanId(data.plans[0].id);
        }
        
        // Calculate stats
        const active = data.licenses.filter((l: any) => l.isActive).length;
        setStats((prev) => ({ ...prev, activeLicenses: active }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/admin/organizations");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations);

        // Sum up total users
        let usersSum = 0;
        data.organizations.forEach((org: any) => {
          usersSum += org.members.length;
        });

        setStats((prev) => ({
          ...prev,
          totalOrgs: data.organizations.length,
          totalUsers: usersSum,
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpSuccess("");
    setSmtpError("");

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpFrom,
          platformName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSmtpSuccess("System configuration updated successfully!");
        setSmtpPass(""); // Clear password field
      } else {
        setSmtpError(data.error || "Failed to update configuration.");
      }
    } catch (e) {
      setSmtpError("Network error.");
    }
  };

  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLicenseSuccess("");
    setLicenseError("");

    try {
      const res = await fetch("/api/admin/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          durationDaysCustom: customDays || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setLicenseSuccess(`Generated key successfully: ${data.license.licenseKey}`);
        setCustomDays("");
        fetchLicenses();
      } else {
        setLicenseError(data.error || "Failed to generate key.");
      }
    } catch (e) {
      setLicenseError("Network error.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--bg-primary)" }}>
        <p style={{ fontSize: 16, color: "var(--text-secondary)" }}>Verifying platform administrator session...</p>
      </div>
    );
  }

  // Not Logged In - Render Platform Admin Login Screen
  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "var(--bg-primary)", padding: 24 }}>
        <div className="admin-form-box" style={{ width: "100%", maxWidth: 440 }}>
          <div className="logo-container" style={{ justifyContent: "center", marginBottom: 20 }}>
            <div className="logo-icon">Ζ</div>
            <span className="logo-text">Zeta TaskingPro</span>
          </div>
          <h2 className="admin-form-title" style={{ textAlign: "center", border: "none", marginBottom: 12, paddingBottom: 0 }}>
            Platform Admin Console
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, textAlign: "center", marginBottom: 20 }}>
            Enter your root administrator credentials to manage organizations and licenses.
          </p>

          {loginError && <div className="alert alert-danger">{loginError}</div>}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@zetatasking.pro"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
              <span className="form-helper">Seed credentials: admin@zetatasking.pro / admin123</span>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={loginLoading}>
              {loginLoading ? "Unlocking Console..." : "Unlock Console"}
            </button>
          </form>
          
          <div style={{ textAlign: "center", marginTop: 20, fontSize: 13 }}>
            <Link href="/" style={{ color: "var(--text-tertiary)" }}>← Back to Public Landing</Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged In - Render Main Console
  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="logo-container">
          <div className="logo-icon">Ζ</div>
          <span className="logo-text" style={{ fontSize: 18 }}>Zeta Admin</span>
        </div>
        <nav className="admin-nav">
          <button
            onClick={() => setActiveTab("organizations")}
            className={`admin-nav-item ${activeTab === "organizations" ? "active" : ""}`}
          >
            🏢 Organizations
          </button>
          <button
            onClick={() => setActiveTab("licenses")}
            className={`admin-nav-item ${activeTab === "licenses" ? "active" : ""}`}
          >
            🔑 License Planning
          </button>
          <button
            onClick={() => setActiveTab("smtp")}
            className={`admin-nav-item ${activeTab === "smtp" ? "active" : ""}`}
          >
            ⚙️ SMTP Settings
          </button>
        </nav>
        <div>
          <button onClick={handleLogout} className="btn btn-outline" style={{ width: "100%" }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="admin-main">
        <header className="admin-header">
          <h2 className="admin-header-title">
            {activeTab === "organizations" && "Manage Organizations"}
            {activeTab === "licenses" && "Platform License Keys Manager"}
            {activeTab === "smtp" && "System Configurations"}
          </h2>
          <div className="flex align-center gap-2">
            <span className="badge badge-success">Root Active</span>
            <Link href="/" className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }}>
              View Landing
            </Link>
          </div>
        </header>

        <section className="admin-content">
          {/* Stats Bar */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-label">Total Organizations</span>
              <span className="admin-stat-value">{stats.totalOrgs}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Total Platform Users</span>
              <span className="admin-stat-value">{stats.totalUsers}</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Active Licenses</span>
              <span className="admin-stat-value">{stats.activeLicenses}</span>
            </div>
          </div>

          {/* TAB 1: Organizations list */}
          {activeTab === "organizations" && (
            <div>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Organization Name</th>
                      <th>Timezone</th>
                      <th>Projects</th>
                      <th>Registered Users</th>
                      <th>Current License Plan</th>
                      <th>License Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
                          No organizations created yet. Organizations are registered when users redeem a license key.
                        </td>
                      </tr>
                    ) : (
                      organizations.map((org) => {
                        const adminMember = org.members.find((m: any) => m.role === "ADMIN");
                        const activeLicense = org.license;
                        
                        return (
                          <tr key={org.id}>
                            <td>
                              <strong style={{ display: "block" }}>{org.name}</strong>
                              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                                Admin: {adminMember?.user.name} ({adminMember?.user.email})
                              </span>
                            </td>
                            <td>{org.timezone}</td>
                            <td>{org.projects?.length || 0} Projects</td>
                            <td>{org.members.length} Users</td>
                            <td>
                              {activeLicense ? (
                                <span className="badge badge-primary">{activeLicense.plan.name}</span>
                              ) : (
                                <span className="badge badge-danger">Unlicensed</span>
                              )}
                            </td>
                            <td>
                              {activeLicense ? (
                                activeLicense.isActive && new Date(activeLicense.expiresAt) > new Date() ? (
                                  <span style={{ color: "var(--success)", fontWeight: 500 }}>
                                    Expires {new Date(activeLicense.expiresAt).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--danger)", fontWeight: 500 }}>Expired</span>
                                )
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Licenses planner */}
          {activeTab === "licenses" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>
              {/* Left: Licenses list */}
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>License Key</th>
                      <th>Plan Tier</th>
                      <th>Linked Org</th>
                      <th>Expiration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
                          No license keys generated yet. Use the panel on the right to generate keys.
                        </td>
                      </tr>
                    ) : (
                      licenses.map((lic) => (
                        <tr key={lic.id}>
                          <td>
                            <span className="key-badge">{lic.licenseKey}</span>
                          </td>
                          <td>{lic.plan.name}</td>
                          <td>
                            {lic.organization ? (
                              <strong>{lic.organization.name}</strong>
                            ) : (
                              <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Unused</span>
                            )}
                          </td>
                          <td>{new Date(lic.expiresAt).toLocaleDateString()}</td>
                          <td>
                            {lic.isActive && new Date(lic.expiresAt) > new Date() ? (
                              <span className="badge badge-success">Valid</span>
                            ) : (
                              <span className="badge badge-danger">Expired/Inactive</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Right: Generation Box */}
              <div className="admin-form-box">
                <h3 className="admin-form-title">Generate License Key</h3>
                {licenseSuccess && <div className="alert alert-success">{licenseSuccess}</div>}
                {licenseError && <div className="alert alert-danger">{licenseError}</div>}

                <form onSubmit={handleGenerateLicense} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Select License Plan</label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      required
                    >
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} (Max {plan.maxUsers} users, {plan.durationDays} days)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Custom Duration (Optional Days)</label>
                    <input
                      type="number"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      placeholder="Leave blank for plan default"
                      min="1"
                    />
                    <span className="form-helper">Specifies custom validity period in days.</span>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                    Generate Key
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: SMTP configurations */}
          {activeTab === "smtp" && (
            <div className="admin-form-box">
              <h3 className="admin-form-title">SMTP Mailer Settings</h3>
              
              {smtpSuccess && <div className="alert alert-success">{smtpSuccess}</div>}
              {smtpError && <div className="alert alert-danger">{smtpError}</div>}

              <form onSubmit={handleSaveSmtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Platform Name</label>
                  <input
                    type="text"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    required
                    placeholder="Zeta TaskingPro"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SMTP Server Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="mail.example.com"
                  />
                  <span className="form-helper">Host address of your outgoing mail server.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">SMTP Server Port</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                    placeholder="587"
                  />
                  <span className="form-helper">Common ports: 587 (TLS), 465 (SSL), 25 (unencrypted)</span>
                </div>

                <div className="form-group">
                  <label className="form-label">SMTP Username</label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="smtp-user@example.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SMTP Password</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder="••••••••"
                  />
                  <span className="form-helper">Leave empty if password is unchanged or not required.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Sender Address (From)</label>
                  <input
                    type="email"
                    value={smtpFrom}
                    onChange={(e) => setSmtpFrom(e.target.value)}
                    placeholder="no-reply@zetatasking.pro"
                  />
                  <span className="form-helper">The email address users will see in their inbox.</span>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }}>
                  Save Configuration
                </button>
              </form>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
