"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../auth.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user.role === "PLATFORM_ADMIN") {
          router.push("/platform-admin");
        } else {
          router.push("/dashboard");
        }
      } else if (data.unverified) {
        router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-card">
          <div className="logo-container" style={{ marginBottom: 32 }}>
            <div style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>Ζ</div>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>Zeta TaskingPro</span>
          </div>
          <h1>Welcome back</h1>
          <p className="subtitle">Sign in to your workspace and continue managing your projects.</p>

          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: 13, fontWeight: 500, color: "var(--primary)" }}>Forgot password?</Link>
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px", fontSize: 15 }} disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="auth-footer">
            Don&apos;t have an account? <Link href="/register">Create one for free</Link>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-promo">
          <h2>Manage projects like a pro.</h2>
          <p>Kanban boards, sprint planning, epics, and real-time team collaboration — all in one powerful platform.</p>
        </div>
      </div>
    </div>
  );
}
