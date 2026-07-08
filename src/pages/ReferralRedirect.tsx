import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { referralApi } from "@/lib/referral";

const WHATSAPP = "https://whatsapp.com/channel/0029VbC678PIyPtc7iERCH2R";

const ReferralRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) {
      setError(true);
      return;
    }
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.location.replace(WHATSAPP);
    };
    // Safety fallback: always redirect after 2s even if the request stalls.
    const timer = window.setTimeout(go, 2000);
    // Fire the server-side visit registration (records visit + increments counter),
    // then redirect to WhatsApp. Using fetch (no-cors safe) rather than a top-level
    // navigation to avoid Vercel treating the supabase URL as a hosted asset.
    fetch(referralApi.visitUrl(code), { method: "GET", redirect: "manual", mode: "no-cors", keepalive: true })
      .catch(() => void 0)
      .finally(() => {
        window.clearTimeout(timer);
        go();
      });
    return () => window.clearTimeout(timer);
  }, [code]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-10 h-10 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin mb-4" />
      <p className="text-sm text-foreground font-semibold mb-1">
        {error ? "Enlace inválido" : "Redirigiendo al canal oficial…"}
      </p>
      <p className="text-xs text-muted-foreground/70">
        Si no ocurre nada,{" "}
        <a href={WHATSAPP} className="underline text-rose-400">
          abre el canal manualmente
        </a>
        .
      </p>
    </div>
  );
};

export default ReferralRedirect;
