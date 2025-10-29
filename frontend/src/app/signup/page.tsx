"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FaGraduationCap, FaBook, FaLightbulb, FaPlus, FaMinus } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";

// Helper: load options from txt files
async function fetchOptions(file: string): Promise<string[]> {
  try {
    const resp = await fetch(`/data/${file}`);
    const text = await resp.text();
    return text.split("\n").map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export default function SignUp() {
  const router = useRouter();
  const [degrees, setDegrees] = useState<string[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [selectedDegree, setSelectedDegree] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [interest, setInterest] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReturningFromOAuth, setIsReturningFromOAuth] = useState(false);

  const siteUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

  // Load dropdown data
  useEffect(() => {
    fetchOptions("degrees.txt").then(setDegrees);
    fetchOptions("modules.txt").then(setModules);
  }, []);

  // Check if user is returning from OAuth and has form data saved
  useEffect(() => {
    const savedFormData = localStorage.getItem('signupFormData');
    if (savedFormData) {
      setIsReturningFromOAuth(true);
    }
  }, []);

  // Check if user is returning from OAuth and redirect to dashboard if they have a profile
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const access_token = data?.session?.access_token;
      
      if (!access_token || !API_URL) {
        console.log("No access token or API_URL");
        return;
      }

      console.log("User is authenticated, checking if profile exists...");

      try {
        // Use the new check-profile endpoint
        const checkResp = await fetch(`${API_URL}/api/auth/check-profile`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });

        if (checkResp.ok) {
          // User has a profile - redirect to dashboard immediately
          console.log("User already has profile, redirecting to dashboard");
          localStorage.removeItem('signupFormData'); // Clean up
          router.push("/dashboard");
        } else if (checkResp.status === 404) {
          // User doesn't have a profile yet
          console.log("User needs to complete signup form");
          
          // Check if we have saved form data from before OAuth
          const savedFormData = localStorage.getItem('signupFormData');
          if (savedFormData) {
            console.log("Found saved form data, auto-submitting...");
            const formData = JSON.parse(savedFormData);
            await autoCompleteSignup(access_token, formData);
          }
        } else {
          console.error("Unexpected error checking profile:", checkResp.status);
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      }
    })();
  }, [API_URL, router]);

  // Auto-complete signup after OAuth return
  const autoCompleteSignup = async (access_token: string, formData: unknown) => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (resp.ok) {
        console.log("Profile created successfully, redirecting to dashboard");
        localStorage.removeItem('signupFormData');
        router.push("/dashboard");
      } else {
        const j = await resp.json().catch(() => ({}));
        console.error("Auto-signup failed:", j?.error);
        // Don't alert here - let user manually retry
        localStorage.removeItem('signupFormData');
        setIsReturningFromOAuth(false);
      }
    } catch (e) {
      console.error("Auto-signup failed:", e);
      localStorage.removeItem('signupFormData');
      setIsReturningFromOAuth(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle "Complete Signup" → validate fields then start Google OAuth
  const handleCompleteSignup = async () => {
    if (!selectedDegree) {
      alert("Please select a degree.");
      return;
    }
    const filteredModules = selectedModules.filter(m => m.trim() !== "");
    if (filteredModules.length === 0) {
      alert("Please select at least one module.");
      return;
    }
    if (!interest.trim()) {
      alert("Please enter your study interest.");
      return;
    }

    // Save form data to localStorage before OAuth
    const formData = {
      degree: selectedDegree,
      modules: filteredModules,
      interest: interest.trim()
    };
    localStorage.setItem('signupFormData', JSON.stringify(formData));

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/signup`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Google sign-in failed");
      localStorage.removeItem('signupFormData');
      setIsLoading(false);
    }
  };

  // Module management
  const addModule = () => setSelectedModules(prev => [...prev, ""]);
  const removeModule = (index: number) => setSelectedModules(prev => prev.filter((_, i) => i !== index));
  const updateModule = (index: number, value: string) =>
    setSelectedModules(prev => prev.map((m, i) => i === index ? value : m));
  const getAvailableModules = (currentIndex: number) => {
    const selectedValues = selectedModules.filter((m, i) => i !== currentIndex && m.trim() !== "");
    return modules.filter(m => !selectedValues.includes(m));
  };

  return (
    <main>
      <form onSubmit={(e) => e.preventDefault()} aria-label="Sign up form">
        <h1>Create Your LockedIn Account</h1>

        {isReturningFromOAuth && (
          <div style={{
            padding: "1rem",
            backgroundColor: "#e7f3ff",
            border: "1px solid #b3d9ff",
            borderRadius: "4px",
            marginBottom: "1rem"
          }}>
            <p style={{ margin: 0, color: "#0066cc" }}>
              <strong>Completing your signup...</strong>
            </p>
          </div>
        )}

        {/* Degree dropdown */}
        <div>
          <label htmlFor="degree">
            Degree
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FaGraduationCap />
              <select
                id="degree"
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(e.target.value)}
                disabled={isLoading}
              >
                <option value="">-- Select your degree --</option>
                {degrees.map((deg) => (
                  <option key={deg} value={deg}>{deg}</option>
                ))}
              </select>
            </div>
          </label>
        </div>

        {/* Modules dropdowns */}
        <div>
          <label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <FaBook />
              <span>Modules</span>
              <button
                type="button"
                onClick={addModule}
                disabled={isLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--primary)",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                <FaPlus size={12} /> Add Module
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {selectedModules.map((selectedModule, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <select
                    value={selectedModule}
                    onChange={(e) => updateModule(index, e.target.value)}
                    style={{ flex: 1 }}
                    disabled={isLoading}
                  >
                    <option value="">-- Select a module --</option>
                    {getAvailableModules(index).map(mod => (
                      <option key={mod} value={mod}>{mod}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeModule(index)}
                    disabled={isLoading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      opacity: isLoading ? 0.6 : 1,
                    }}
                    title="Remove module"
                  >
                    <FaMinus size={12} />
                  </button>
                </div>
              ))}
            </div>
          </label>
        </div>

        {/* Interest */}
        <div>
          <label htmlFor="interest">
            Study Interest
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FaLightbulb />
              <input
                type="text"
                id="interest"
                placeholder="e.g. AI, data science"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </label>
        </div>

        {/* Complete Signup Button */}
        <button
          type="button"
          onClick={handleCompleteSignup}
          disabled={isLoading}
          style={{
            marginTop: "1.5rem",
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 600,
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? "Processing..." : "Complete Signup"}
        </button>

        <p style={{ marginTop: "1rem", textAlign: "center", fontStyle: "italic", color: "var(--muted)" }}>
          &ldquo;The future belongs to those who learn more skills and combine them creatively.&rdquo; — Robert Greene
        </p>

        <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
            Sign in here
          </Link>
        </p>
      </form>
    </main>
  );
}
