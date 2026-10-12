"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function readableAuthError(message: string) {
  const value = message.toLowerCase();
  if (value.includes("invalid login credentials")) return "That email and password don't match. Try again or reset your password.";
  if (value.includes("email not confirmed")) return "Please verify your email using the link we sent before signing in.";
  if (value.includes("user already registered")) return "An account with this email already exists. Sign in instead.";
  if (value.includes("password should be at least")) return "Choose a password with at least 6 characters.";
  if (value.includes("rate limit") || value.includes("too many requests")) return "Too many attempts. Please wait a little and try again.";
  if (value.includes("failed to fetch") || value.includes("network")) return "We couldn't reach the sign-in service. Check your internet connection and try again.";
  return message || "Something went wrong. Please try again.";
}

export function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signup, setSignup] = useState(false);
  const [reset, setReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function switchMode(mode: "login" | "signup" | "reset") {
    setSignup(mode === "signup");
    setReset(mode === "reset");
    setError("");
    setMessage("");
    setPassword("");
    setShowPassword(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (reset) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setMessage("If an account exists for this email, a password reset link is on its way. Check your inbox.");
        return;
      }

      if (signup) {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (signupError) throw signupError;

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage("Your account request was received. Check your email for a verification link, then sign in.");
          setSignup(false);
          setPassword("");
        }
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (loginError) throw loginError;

      router.replace("/");
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Please try again in a moment.";
      setError(readableAuthError(message));
    } finally {
      setBusy(false);
    }
  }

  const title = reset ? "Reset your password" : signup ? "Start your journey" : "Welcome back";
  const subtitle = reset
    ? "We'll email you a secure link to get back in."
    : signup
      ? "Create your account and start earning XP."
      : "Your next level is waiting. Let's keep going.";

  return (
    <main className="auth-screen">
      <div className="auth-layout">
        <aside className="auth-story" aria-label="About Piko">
          <a className="auth-brand" href="/" aria-label="Piko home">
            <span className="auth-brand-mark">P</span>
            <span>piko<span className="auth-brand-dot">.</span></span>
          </a>
          <div className="auth-story-copy">
            <span className="auth-kicker"><span className="auth-live-dot" /> YOUR LEARNING ADVENTURE</span>
            <h2>Small steps.<br />Big <span>brainpower.</span></h2>
            <p>Turn curious moments into real skills. Learn at your pace, solve challenges, and level up as you go.</p>
            <div className="auth-feature-list">
              <div><span className="auth-feature-icon">✳</span><span><strong>Learn by doing</strong><small>Interactive lessons, not endless lectures.</small></span></div>
              <div><span className="auth-feature-icon auth-feature-yellow">↗</span><span><strong>Make progress</strong><small>Build momentum one lesson at a time.</small></span></div>
            </div>
          </div>
          <div className="auth-story-footer"><span>MADE FOR CURIOUS MINDS</span><span>01 — KEEP GROWING</span></div>
          <span className="auth-decoration auth-decoration-one" aria-hidden="true">✳</span>
          <span className="auth-decoration auth-decoration-two" aria-hidden="true">＋</span>
        </aside>

        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-mobile-brand"><span className="auth-brand-mark">P</span><span>piko<span className="auth-brand-dot">.</span></span></div>
          <div className="auth-form-heading">
            <p className="eyebrow">{reset ? "ACCOUNT RECOVERY" : signup ? "JOIN THE ADVENTURE" : "YOUR SPACE IS READY"}</p>
            <h1 id="auth-title">{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>

          <form onSubmit={submit}>
            {signup && !reset && (
              <label className="auth-field">
                <span>Your name</span>
                <input autoComplete="name" name="name" placeholder="What should we call you?" value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
            )}
            <label className="auth-field">
              <span>Email address</span>
              <input autoComplete="email" name="email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            {!reset && (
              <label className="auth-field">
                <span>Password</span>
                <span className="auth-password-wrap">
                  <input autoComplete={signup ? "new-password" : "current-password"} name="password" type={showPassword ? "text" : "password"} placeholder="At least 6 characters" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required />
                  <button className="auth-show-password" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
                </span>
              </label>
            )}

            {error && <p className="auth-alert auth-alert-error" role="alert">{error}</p>}
            {message && <p className="auth-alert auth-alert-success" role="status">{message}</p>}

            <button className="primary-btn auth-submit" type="submit" disabled={busy}>
              {busy ? <><span className="auth-button-spinner" /> Please wait…</> : reset ? "Send reset link" : signup ? "Create my account" : "Sign in"}
              {!busy && <span aria-hidden="true">↗</span>}
            </button>
          </form>

          {!signup && !reset && <button className="auth-forgot" type="button" onClick={() => switchMode("reset")}>Forgot password?</button>}
          <div className="auth-switch">
            {reset ? (
              <><span>Remember your password?</span> <button type="button" onClick={() => switchMode("login")}>Sign in</button></>
            ) : signup ? (
              <><span>Already learning with us?</span> <button type="button" onClick={() => switchMode("login")}>Sign in</button></>
            ) : (
              <><span>New to Piko?</span> <button type="button" onClick={() => switchMode("signup")}>Create an account</button></>
            )}
          </div>
          <p className="auth-privacy">Your progress is yours. Always.</p>
        </section>
      </div>
    </main>
  );
}
