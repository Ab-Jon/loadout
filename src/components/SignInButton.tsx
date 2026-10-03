"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInButton({
  next = "/orders",
  label = "Sign in with Google",
}: {
  next?: string;
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (signInError) {
      setError(signInError.message);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="shrink-0 whitespace-nowrap rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {pending ? "Opening Google…" : label}
      </button>
      {error ? <p className="text-sm text-signal">{error}</p> : null}
    </div>
  );
}
