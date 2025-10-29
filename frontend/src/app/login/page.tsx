// frontend\src\app\login\page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";


export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Frontend envs
  const siteUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

  // After Google redirects back to /login, verify with backend
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const access_token = data?.session?.access_token;
      
      console.log("Login useEffect - Has session:", !!data?.session);
      console.log("Login useEffect - API_URL:", API_URL);
      
      if (!access_token || !API_URL) return;

      try {
        console.log("Making login request to:", `${API_URL}/api/auth/login`);
        
        const resp = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
          },
        });

        console.log("Login response status:", resp.status);
        
        if (resp.ok) {
          // User exists - redirect to menu
          router.push("/dashboard");
        } else {
          const j = await resp.json().catch((e) => {
            console.error("Failed to parse JSON:", e);
            return {};
          });
          
          console.log("Login error response:", j);
          console.log("Full response text:", await resp.text().catch(() => "Could not read response"));
          
          // Check if the error is about user not found
          if (j?.error?.includes("User not found") || j?.error?.includes("Please sign up")) {
            alert(j.error); // Show the actual backend error message
            await supabase.auth.signOut();
            router.push("/signup");
          } else {
            alert(j?.error || `Login failed (Status: ${resp.status})`);
            await supabase.auth.signOut();
          }
        }
      } catch (e) {
        console.error("Backend verify failed:", e);
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        alert(`Login verification failed: ${errorMessage}`);
        await supabase.auth.signOut();
      }
    })();
  }, [API_URL, router]);

  // Keep UI the same, but disable manual login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    alert("Email/password login is disabled. Please use Google.");
    await handleGoogleLogin();
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/login`,
          queryParams: {
            prompt: "select_account",   //  force chooser every time
          },
        },
      });
      
      if (error) throw error; // browser will redirect
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Google sign-in failed");
      setIsLoading(false);
    }
  };

  return (
    <main>
      <form onSubmit={handleLogin} aria-label="Login form">
        <h1>Welcome back</h1>

        <button type="button" onClick={handleGoogleLogin} disabled={isLoading}>
          <FcGoogle size={24} />
          Continue with Google
        </button>

        <div style={{ marginTop: "1rem" }}>
          <label htmlFor="email">
            Email
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FaEnvelope />
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
              />
            </div>
          </label>
        </div>

        <div>
          <label htmlFor="password">
            Password
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FaLock />
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-required="true"
              />
            </div>
          </label>
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign In"}
        </button>

        <p style={{ marginTop: "1rem", textAlign: "center", fontStyle: "italic", color: "var(--muted)" }}>
          &ldquo;Success is the sum of small efforts, repeated day in and day out.&rdquo; — Robert Collier
        </p>

        <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" style={{ color: "var(--primary)", fontWeight: 600 }}>
            Sign up here
          </Link>
        </p>
      </form>
    </main>
  );
}