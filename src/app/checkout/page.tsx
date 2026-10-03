import { CheckoutForm } from "@/components/CheckoutForm";
import { SignInButton } from "@/components/SignInButton";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-5xl tracking-wide">Checkout</h1>
      {user ? (
        <CheckoutForm email={user.email ?? "your Google account"} />
      ) : (
        <div className="max-w-lg space-y-4 rounded-2xl border border-line bg-panel p-5">
          <p>Sign in with Google to place the order and find it again later.</p>
          <SignInButton next="/checkout" />
        </div>
      )}
    </div>
  );
}
