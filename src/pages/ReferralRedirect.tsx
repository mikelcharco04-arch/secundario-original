import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { referralApi } from "@/lib/referral";

const ReferralRedirect = () => {
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    if (!code) return;
    // Fire-and-forget the server visit URL (which itself 302s to WhatsApp).
    // We use window.location.replace so the browser makes the GET request and follows the redirect natively.
    window.location.replace(referralApi.visitUrl(code));
  }, [code]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-10 h-10 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin mb-4" />
      <p className="text-sm text-foreground font-semibold mb-1">Redirigiendo al canal oficial…</p>
      <p className="text-xs text-muted-foreground/70">Si no ocurre nada, abre WhatsApp e intenta de nuevo.</p>
    </div>
  );
};

export default ReferralRedirect;
