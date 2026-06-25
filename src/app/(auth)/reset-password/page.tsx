"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import "../auth.css";

export default function ResetPasswordPage() {
  return (
    <Suspense 
      fallback={
        <div className="auth-wrapper">
          <div className="auth-left">
            <div className="auth-card">
              <p className="subtitle">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError("Reset token is missing. Please request a new password reset link.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message || "Password updated successfully!");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(data.error || "Reset failed. The token may be invalid or expired.");
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
          <h1>Reset password</h1>
          <p className="subtitle">Enter and confirm your new secure account password below.</p>

          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

          {!token && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              No reset token found in URL. Please request a new password reset link.
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••" 
                minLength={6}
                disabled={!token || loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                placeholder="••••••••" 
                minLength={6}
                disabled={!token || loading}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: "100%", padding: "12px", fontSize: 15, marginTop: 10 }} 
              disabled={loading || !token}
            >
              {loading ? "Resetting password..." : "Reset Password"}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-promo">
          <h2>Secure access to your boards.</h2>
          <p>Easily reset your account security configurations to continue planning tasks and tracking team sprints.</p>
        </div>
      </div>
    </div>
  );
}
