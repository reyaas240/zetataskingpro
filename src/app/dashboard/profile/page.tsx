"use client";

import React, { useState, useEffect, useRef } from "react";
import { useWorkspace } from "../WorkspaceContext";
import { COMMON_TIMEZONES } from "@/lib/timezone";

export default function UserProfilePage() {
  const { user, refreshOrgs } = useWorkspace();

  // Profile forms
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password forms
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdError, setPwdError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setTimezone(user.timezone);
      setAvatarPreview(user.avatarUrl);
    }
  }, [user]);

  // Client-side image resizing via HTML5 Canvas
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfileError("File size must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Define dimensions (128x128 pixels for optimized avatar)
        const size = 128;
        canvas.width = size;
        canvas.height = size;

        if (ctx) {
          // Crop and draw image as centered square
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          // Get optimized base64 string
          const optimizedBase64 = canvas.toDataURL("image/jpeg", 0.8);
          setAvatarPreview(optimizedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess("");
    setProfileError("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timezone,
          avatarUrl: avatarPreview,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfileSuccess("Profile updated successfully!");
        // Re-sync session data
        window.location.reload();
      } else {
        setProfileError(data.error || "Failed to update profile");
      }
    } catch {
      setProfileError("Network error. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match");
      return;
    }

    setPwdLoading(true);
    setPwdSuccess("");
    setPwdError("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPwdSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwdError(data.error || "Failed to change password");
      }
    } catch {
      setPwdError("Network error. Please try again.");
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>My Profile Settings</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Manage your personal details, timezone preferences, avatar icon, and account credentials.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 32, alignItems: "start" }}>
        
        {/* Profile Info Form */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 20 }}>Personal Information</h3>
          {profileSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>{profileSuccess}</div>}
          {profileError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{profileError}</div>}

          <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Avatar Selector Wrapper */}
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  backgroundColor: "var(--primary-light)",
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 800,
                  overflow: "hidden",
                  border: "2px solid var(--border-color)",
                }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  user?.name?.[0].toUpperCase() || "U"
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload New Photo
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  Images will be optimized to 128x128 pixels on client.
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Email (Static)</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                style={{ backgroundColor: "var(--bg-tertiary)", cursor: "not-allowed" }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">My Timezone Preference</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} required>
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <span className="form-helper">This timezone will format date-times for your personal profile feed.</span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", padding: "10px 24px" }} disabled={profileLoading}>
              {profileLoading ? "Updating Profile..." : "Update Profile"}
            </button>
          </form>
        </div>

        {/* Password Reset Form */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: 20 }}>Change Account Password</h3>
          {pwdSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>{pwdSuccess}</div>}
          {pwdError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{pwdError}</div>}

          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start", padding: "10px 24px" }} disabled={pwdLoading}>
              {pwdLoading ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
