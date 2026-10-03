import type { Metadata } from "next";
import { Barlow_Condensed, Outfit } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow",
});

const sans = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Loadout — Gaming tools",
  description: "Consoles, displays, and gaming gear for players 18 and older. Preview an item, then check out.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <CartProvider>
          <Header email={user?.email ?? null} />
          <main className="mx-auto min-h-[70vh] max-w-6xl px-5 py-8">{children}</main>
          <footer className="mx-auto max-w-6xl px-5 pb-10 text-sm text-mist">
            Loadout sells gaming tools for adults 18 and older. Orders are saved to your account.
            Email confirmation is off until Mailgun is connected.
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
