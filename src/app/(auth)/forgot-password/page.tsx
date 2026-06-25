"use client";

import React, { useState } from "react";
import Link from "next/link";
import "../auth.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setDevResetUrl(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message || "A password reset link has been sent!");
        if (data.devResetUrl) {
          setDevResetUrl(data.devResetUrl);
        }
      } else {
        setError(data.error || "Something went wrong. Please try again.");
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
          <h1>Forgot password?</h1>
          <p className="subtitle">Enter the email address associated with your account, and we will send you a link to reset your password.</p>

          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

          {devResetUrl && (
            <div className="dev-otp-banner" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              [DEV MODE] Password Reset Link:
              <Link href={devResetUrl} style={{ textDecoration: "underline", color: "inherit", fontWeight: 700, marginTop: 4 }}>
                Click here to reset password
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="you@example.com" 
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: "100%", padding: "12px", fontSize: 15 }} 
              disabled={loading}
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>
          </form>

          <div className="auth-footer">
            Remember your password? <Link href="/login">Back to Sign In</Link>
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
