import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import VideoBackground from "@/components/VideoBackground";
import { ArrowLeft, Check, Copy, ExternalLink, Loader2 } from "lucide-react";

const PLANS = [
  { id: "day1", label: "1 día", type: "Normal", amount: 1, desc: "Acceso 24 horas" },
  { id: "day7", label: "7 días", type: "Normal", amount: 5, desc: "Acceso semanal" },
  { id: "day30", label: "30 días", type: "Normal", amount: 15, desc: "Acceso mensual" },
  { id: "premium30", label: "Premium 30 días", type: "Premium", amount: 25, desc: "Acceso premium mensual" },
];

const Pay = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"select" | "pay" | "done">("select");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [resultKey, setResultKey] = useState("");
  const [polling, setPolling] = useState(false);
  const [copied, setCopied] = useState(false);

  const startOrder = async (planId: string) => {
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase.functions.invoke("binance-create-order", {
      body: { planId },
    });
    setLoading(false);
    if (err || data?.error) {
      setError(data?.error || err?.message || "Error al crear la orden");
      return;
    }
    setOrder({ ...data, planId });
    setStep("pay");
  };

  useEffect(() => {
    if (step !== "pay" || !order?.merchantTradeNo) return;
    setPolling(true);
    const interval = setInterval(async () => {
      const { data } = await supabase.functions.invoke("binance-check-order", {
        body: { merchantTradeNo: order.merchantTradeNo },
      });
      if (data?.status === "paid" && data?.key) {
        clearInterval(interval);
        setResultKey(data.key);
        setStep("done");
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [step, order]);

  const copyKey = async () => {
    await navigator.clipboard.writeText(resultKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goLogin = () => navigate("/");

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <VideoBackground />
      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <button onClick={goLogin} className="flex items-center gap-1 text-xs text-muted-foreground mb-4 hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al login
        </button>

        <div className="glass-card p-5 glow-border">
          <h1 className="text-base font-bold text-foreground mb-1">Comprar Key con Binance Pay</h1>
          <p className="text-[10px] text-muted-foreground/70 tracking-wider uppercase mb-4">Pago con USDT • Confirmación automática</p>

          {step === "select" && (
            <div className="space-y-2">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => startOrder(p.id)}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border/40 hover:bg-secondary/60 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  <div className="text-left">
                    <div className="text-sm font-semibold text-foreground">{p.label}</div>
                    <div className="text-[10px] text-muted-foreground/70">{p.desc}{p.type === "Premium" && " • Premium"}</div>
                  </div>
                  <div className="text-sm font-bold text-foreground">{p.amount} USDT</div>
                </button>
              ))}
              {loading && <p className="text-xs text-muted-foreground text-center pt-2">Creando orden...</p>}
              {error && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">{error}</p>}
            </div>
          )}

          {step === "pay" && order && (
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-lg flex items-center justify-center">
                <img src={order.qrcodeLink} alt="QR Binance Pay" className="w-48 h-48" />
              </div>
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                Escanea el QR con Binance, o abre directamente:
              </p>
              <a
                href={order.checkoutUrl || order.universalUrl || order.deeplink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Abrir Binance Pay <ExternalLink className="w-4 h-4" />
              </a>
              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-1">
                {polling && <Loader2 className="w-3 h-3 animate-spin" />}
                Esperando confirmación de pago...
              </div>
              <div className="text-[9px] text-muted-foreground/50 text-center font-mono">
                ID: {order.merchantTradeNo}
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Pago confirmado</h2>
                <p className="text-[11px] text-muted-foreground">Tu key fue generada correctamente</p>
              </div>
              <div className="bg-secondary/40 border border-border/40 rounded-lg p-3">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Tu key</div>
                <div className="font-mono text-sm text-foreground break-all">{resultKey}</div>
              </div>
              <button
                onClick={copyKey}
                className="w-full bg-secondary/60 border border-border/40 text-foreground font-semibold py-2.5 rounded-lg text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {copied ? <><Check className="w-4 h-4" /> Copiada</> : <><Copy className="w-4 h-4" /> Copiar key</>}
              </button>
              <button
                onClick={goLogin}
                className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Ir al login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pay;
