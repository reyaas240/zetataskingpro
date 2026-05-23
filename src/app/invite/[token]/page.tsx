"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import "../../(auth)/auth.css";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [invitation, setInvitation] = useState<any>(null);
  const [userExists, setUserExists] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const res = await fetch(`/api/auth/invite/verify?token=${token}`);
      const data = await res.json();
      if (res.ok) {
        setInvitation(data.invitation);
        setUserExists(data.userExists);
      } else {
        setError(data.error || "Failed to load invitation.");
      }
    } catch {
      setError("Network error loading invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError("");

    try {
      const res = await fetch("/api/auth/invite/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: userExists ? undefined : name,
          password: userExists ? undefined : password,
        }),
      });

      const data = await res.json();
      if (res.ok && data.otpSent) {
        setOtpSent(true);
        setSuccess("Verification OTP code sent to your email!");
        if (data.devOtp) {
          setDevOtp(data.devOtp);
        }
      } else {
        setError(data.error || "Failed to send verification code.");
      }
    } catch {
      setError("Network error sending code.");
    } finally {
      setVerifying(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (pastedData.length === 6 && !isNaN(Number(pastedData))) {
      setOtp(pastedData.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the 6-digit OTP code");
      return;
    }

    setVerifying(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/invite/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          otp: otpCode,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Successfully verified and joined workspace! Redirecting...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setError(data.error || "Verification failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-wrapper" style={{ justifyContent: "center", alignItems: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Verifying invitation link...</p>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="auth-wrapper" style={{ justifyContent: "center", alignItems: "center", padding: 20 }}>
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="logo-container" style={{ justifyContent: "center", marginBottom: 20 }}>
            <div style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>Ζ</div>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>Zeta TaskingPro</span>
          </div>
          <div className="alert alert-danger" style={{ marginBottom: 24 }}>{error}</div>
          <Link href="/" className="btn btn-outline" style={{ display: "inline-block" }}>
            Go to Landing Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-card">
          <div className="logo-container" style={{ marginBottom: 32 }}>
            <div style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>Ζ</div>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>Zeta TaskingPro</span>
          </div>

          <h1>You&apos;ve been invited!</h1>
          <p className="subtitle" style={{ marginBottom: 20 }}>
            Join <strong>{invitation.organizationName}</strong> as a {invitation.role === "ADMIN" ? "Workspace Admin" : "Team Member"}.
          </p>

          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

          {devOtp && (
            <div className="dev-otp-banner">
              [DEV MODE] OTP Code:
              <strong>{devOtp}</strong>
            </div>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="auth-form">
              {userExists ? (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
                    An account exists for <strong>{invitation.email}</strong>. Click below to receive a verification code and join.
                  </p>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
                  </div>
                </>
              )}
              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px" }} disabled={verifying}>
                {verifying ? "Sending code..." : userExists ? "Request Join Code" : "Create Account & Join"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                Enter the 6-digit OTP code sent to <strong>{invitation.email}</strong>.
              </p>
              <div className="otp-container">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    className="otp-input"
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={idx === 0 ? handlePaste : undefined}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    required
                  />
                ))}
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px", marginTop: 10 }} disabled={verifying}>
                {verifying ? "Verifying..." : "Verify Code"}
              </button>
            </form>
          )}

          <div className="auth-footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-promo">
          <h2>Collaborate with your team instantly.</h2>
          <p>Join {invitation.organizationName} and jump right into work. Keep track of issues, updates, and progress together.</p>
        </div>
      </div>
    </div>
  );
}
