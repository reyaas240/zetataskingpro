"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import "./landing.css";

export default function LandingPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userCount, setUserCount] = useState(10);
  const [selectedPlan, setSelectedPlan] = useState("team"); // 'free', 'team', 'enterprise'

  // Initialize theme from HTML class list on mount
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  // Live price calculation based on slider
  const getCalculatedPrice = () => {
    if (selectedPlan === "free") {
      return 0;
    }
    if (selectedPlan === "enterprise") {
      return userCount * 8; // $8 per user
    }
    // Team plan
    if (userCount <= 5) {
      return 15; // flat $15 for small team
    } else if (userCount <= 25) {
      return 49; // standard $49
    } else {
      return 49 + (userCount - 25) * 3; // $49 + $3/extra user
    }
  };

  return (
    <div className="landing-body">
      {/* Header */}
      <header className="navbar">
        <div className="logo-container">
          <div className="logo-icon">Ζ</div>
          <span className="logo-text">Zeta TaskingPro</span>
        </div>
        <nav className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <a href="#calculator" className="nav-link">License Calculator</a>

        </nav>
        <div className="nav-actions">
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label="Toggle Theme">
            {isDarkMode ? (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
          <Link href="/login" className="btn btn-outline">Sign In</Link>
          <Link href="/register" className="btn btn-primary">Try Free</Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-badge">Zeta TaskingPro v1.0.0 is Live</div>
        <h1 className="hero-title">Agile project management, simplified for scaling teams.</h1>
        <p className="hero-description">
          Create projects, customize boards, schedule sprints, manage epics, and communicate with your team — all with Jira-level power, built locally with speed.
        </p>
        <div className="flex gap-2">
          <Link href="/register" className="btn btn-primary" style={{ padding: "12px 28px", fontSize: "16px" }}>
            Get Started for Free
          </Link>
          <a href="#features" className="btn btn-outline" style={{ padding: "12px 28px", fontSize: "16px" }}>
            Explore Features
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-container">
        <div className="section-header">
          <h2 className="section-title">Agile tools to keep work flowing</h2>
          <p className="section-subtitle">
            Everything your developers and planners need to stay aligned, track progress, and release software.
          </p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <h3 className="feature-title">Dynamic Boards</h3>
            <p className="feature-desc">
              Organize tasks horizontally. Customize columns to match your team's workflow. Drag and drop cards to update status dynamically.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⏱️</div>
            <h3 className="feature-title">Sprint Planning</h3>
            <p className="feature-desc">
              Create sprints, estimate story points, drag issues from the backlog into your active sprint, and complete sprints on time.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3 className="feature-title">Epic Management</h3>
            <p className="feature-desc">
              Track high-level goals with board-level epics. Assign custom color codes and view all related stories at a glance.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✏️</div>
            <h3 className="feature-title">Inline Task Drawer</h3>
            <p className="feature-desc">
              Open details in a sliding panel, edit fields inline instantly. Features rich text description, optimized image/video uploads, and links.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔔</div>
            <h3 className="feature-title">Smart Notifications</h3>
            <p className="feature-desc">
              Get notified immediately in your notifications drawer when a task is assigned to you or when comments are posted.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3 className="feature-title">Timezone Precision</h3>
            <p className="feature-desc">
              Set organization default timezones and user-specific timezones. Timestamps adapt dynamically to whoever is reading.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section-container" style={{ borderTop: "1px solid var(--border-color)" }}>
        <div className="section-header">
          <h2 className="section-title">Flexible licensing plans</h2>
          <p className="section-subtitle">
            Simple, honest pricing. Choose the tier that matches your organization size.
          </p>
        </div>

        <div className="pricing-container">
          {/* Free Plan */}
          <div className="pricing-card">
            <span className="plan-name">Free Plan</span>
            <div className="plan-price">
              $0 <span className="plan-price-period">/ year</span>
            </div>
            <p className="plan-desc">For tiny teams testing the waters.</p>
            <ul className="plan-features">
              <li className="plan-feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Up to 5 registered users
              </li>
              <li className="plan-feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                1 Organization limit
              </li>
              <li className="plan-feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Kanban boards & backlog
              </li>
            </ul>
            <Link href="/register" className="btn btn-outline" style={{ marginTop: "auto" }}>Get Started</Link>
          </div>

          {/* Team Plan */}
          <div className="pricing-card popular">
            <span className="plan-name">Team Plan</span>
            <div className="plan-price">
              $49 <span className="plan-price-period">/ month</span>
            </div>
            <p className="plan-desc">Agile power for growing departments.</p>
            <ul className="plan-features">
              <li className="plan-feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Up to 25 registered users
              </li>
              <li className="plan-feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                2 Organizations limit
              </li>
              <li className="plan-feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Sprint planning & Epics
              </li>
              <li className="plan-feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Support timezone tracking
              </li>
            </ul>
            <Link href="/register" className="btn btn-primary" style={{ marginTop: "auto" }}>Start Free Trial</Link>
          </div>

          {/* Enterprise Plan */}
          <div className="pricing-card">
            <span className="plan-name">Enterprise Plan</span>
            <div className="plan-price">
              $199 <span className="plan-price-period">/ month</span>
            </div>
            <p className="plan-desc">For large scaling businesses.</p>
            <ul className="plan-features">
              <li className="plan-feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Unlimited registered users
              </li>
              <li className="plan-feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Up to 99 Organizations
              </li>
              <li className="plan-feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Dedicated support channels
              </li>
              <li className="plan-feature-item">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                99.9% Server SLA guarantee
              </li>
            </ul>
            <Link href="/register" className="btn btn-outline" style={{ marginTop: "auto" }}>Request Enterprise</Link>
          </div>
        </div>

        {/* License Calculator */}
        <div id="calculator" className="calculator-box">
          <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Interactive License Cost Calculator</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 30 }}>
            Estimate your costs by toggling license plans and dragging the slider to match your team size.
          </p>
          <div className="calc-grid">
            <div className="calc-inputs">
              <div>
                <span className="calc-label">1. Choose a license tier</span>
                <div className="flex gap-1" style={{ marginTop: 8 }}>
                  <button
                    onClick={() => { setSelectedPlan("free"); setUserCount(Math.min(userCount, 5)); }}
                    className={`btn ${selectedPlan === "free" ? "btn-primary" : "btn-outline"}`}
                    style={{ flex: 1 }}
                  >
                    Free Tier
                  </button>
                  <button
                    onClick={() => setSelectedPlan("team")}
                    className={`btn ${selectedPlan === "team" ? "btn-primary" : "btn-outline"}`}
                    style={{ flex: 1 }}
                  >
                    Team Tier
                  </button>
                  <button
                    onClick={() => setSelectedPlan("enterprise")}
                    className={`btn ${selectedPlan === "enterprise" ? "btn-primary" : "btn-outline"}`}
                    style={{ flex: 1 }}
                  >
                    Enterprise Tier
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between calc-label">
                  <span>2. Select number of users</span>
                  <span style={{ color: "var(--primary)", fontWeight: 700 }}>{userCount} Users</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max={selectedPlan === "free" ? "5" : selectedPlan === "team" ? "100" : "500"}
                  value={userCount}
                  onChange={(e) => setUserCount(parseInt(e.target.value))}
                  className="range-slider"
                  style={{ marginTop: 10 }}
                />
                <div className="flex justify-between" style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
                  <span>1 User</span>
                  <span>{selectedPlan === "free" ? "5 Users" : selectedPlan === "team" ? "100 Users" : "500 Users"}</span>
                </div>
              </div>
            </div>

            <div className="calc-outputs">
              <span className="calc-label" style={{ marginBottom: 0 }}>Estimated Cost</span>
              <div className="calc-total-price">${getCalculatedPrice()}</div>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                {selectedPlan === "free" ? "Free Forever" : "billed monthly"}
              </span>
              <div style={{ marginTop: 20 }}>
                <Link href="/register" className="btn btn-primary" style={{ width: "100%" }}>
                  Deploy Workspace
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border-color)", padding: "40px 24px", backgroundColor: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div className="logo-container">
            <div className="logo-icon">Ζ</div>
            <span className="logo-text" style={{ fontSize: 16 }}>Zeta TaskingPro</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            &copy; {new Date().getFullYear()} Zeta TaskingPro. Built locally with premium Vanilla CSS.
          </p>
        </div>
      </footer>
    </div>
  );
}
