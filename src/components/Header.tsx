import Link from "next/link";
import { signOut } from "@/lib/actions";
import { CartLink } from "@/components/CartLink";
import { SignInButton } from "@/components/SignInButton";

export function Header({ email }: { email: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="font-display text-3xl leading-none tracking-wide">LOADOUT</span>
          <span className="rounded-full border border-signal/50 px-2 py-0.5 text-[11px] font-semibold tracking-wider text-signal">
            18+
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/orders" className="text-mist hover:text-paper">
            Orders
          </Link>
          <CartLink />
          {email ? (
            <form action={signOut} className="flex items-center gap-3">
              <span className="hidden max-w-40 truncate text-mist sm:inline">{email}</span>
              <button type="submit" className="rounded-full border border-line px-3 py-1.5 text-paper">
                Sign out
              </button>
            </form>
          ) : (
            <SignInButton next="/" label="Sign in" />
          )}
        </nav>
      </div>
    </header>
  );
}
