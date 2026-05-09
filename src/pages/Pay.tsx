import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import VideoBackground from "@/components/VideoBackground";
import { ArrowLeft, Check, Copy, ExternalLink, Loader2, Upload, AlertTriangle, X, CreditCard, Gem } from "lucide-react";

type Method = "paypal" | "diamonds";

const PLANS_PAYPAL = [
  { id: "day1", label: "1 Día", amount: 4, desc: "Acceso 24 horas" },
  { id: "day7", label: "7 Días", amount: 7, desc: "Acceso semanal" },
  { id: "day30", label: "30 Días", amount: 15, desc: "Acceso mensual" },
];

const PLANS_DIAMONDS = [
  { id: "day1", label: "1 Día", amount: 500, desc: "Acceso 24 horas" },
  { id: "day7", label: "7 Días", amount: 800, desc: "Acceso semanal" },
  { id: "day30", label: "30 Días", amount: 1500, desc: "Acceso mensual" },
];

const PAYPAL_URL = "https://www.paypal.me/ModifaxffLopez";
const GARENA_URL = "https://shop.garena.com/";
const FF_ID = "6929427211";
const FF_USER = "suessa 7p";
const FF_REGION = "EE.UU.";
const MAX_VIDEO_SECONDS = 40;

type Step = "method" | "select" | "warning" | "upload" | "waiting" | "approved" | "rejected";

function getDeviceFingerprint(): string {
  let fp = localStorage.getItem("device_fp");
  if (!fp) {
    fp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${navigator.userAgent.length}-${screen.width}x${screen.height}`;
    localStorage.setItem("device_fp", fp);
  }
  return fp;
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer el video")); };
    v.src = url;
  });
}

const Pay = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<Method>("paypal");
  const [planId, setPlanId] = useState<string>("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState<string>("");
  const [resultKey, setResultKey] = useState("");
  const [copied, setCopied] = useState(false);

  const PLANS = method === "paypal" ? PLANS_PAYPAL : PLANS_DIAMONDS;
  const plan = PLANS.find(p => p.id === planId);
  const isVideo = !!file && file.type.startsWith("video/");
  const unit = method === "paypal" ? "USD" : "Diamantes";
  const stepIdx =
    step === "method" ? 0 :
    step === "select" ? 1 :
    step === "warning" ? 2 :
    step === "upload" ? 3 : 4;

  useEffect(() => {
    const raw = localStorage.getItem("proxy_pending_name");
    if (raw) setUserName(raw);
    const em = localStorage.getItem("proxy_pending_email");
    if (em) setEmail(em);

    const pending = localStorage.getItem("pending_payment_id");
    if (pending) {
      setRequestId(pending);
      supabase.from("payment_requests").select("*").eq("id", pending).maybeSingle().then(({ data }) => {
        if (!data) { localStorage.removeItem("pending_payment_id"); return; }
        if (data.status === "approved" && data.delivered_key) {
          setResultKey(data.delivered_key);
          setStep("approved");
        } else if (data.status === "rejected") {
          setStep("rejected");
        } else {
          setStep("waiting");
        }
      });
    }
  }, []);

  useEffect(() => {
    if (step !== "waiting" || !requestId) return;
    const channel = supabase
      .channel(`pay-${requestId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "payment_requests", filter: `id=eq.${requestId}` }, (payload) => {
        const row: any = payload.new;
        if (row.status === "approved" && row.delivered_key) {
          setResultKey(row.delivered_key);
          setStep("approved");
          localStorage.removeItem("pending_payment_id");
        } else if (row.status === "rejected") {
          setStep("rejected");
          localStorage.removeItem("pending_payment_id");
        }
      })
      .subscribe();
    // Fallback polling cada 5s por si Realtime falla
    const interval = setInterval(async () => {
      const { data } = await supabase.from("payment_requests").select("status,delivered_key").eq("id", requestId).maybeSingle();
      if (!data) return;
      if (data.status === "approved" && data.delivered_key) {
        setResultKey(data.delivered_key);
        setStep("approved");
        localStorage.removeItem("pending_payment_id");
      } else if (data.status === "rejected") {
        setStep("rejected");
        localStorage.removeItem("pending_payment_id");
      }
    }, 5000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [step, requestId]);

  const onPickMethod = (m: Method) => { setMethod(m); setStep("select"); };
  const onPickPlan = (id: string) => { setPlanId(id); setStep("warning"); };

  const onFile = async (f: File | null) => {
    setError("");
    if (!f) { setFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(""); return; }
    if (f.type.startsWith("video/")) {
      try {
        const dur = await readVideoDuration(f);
        if (dur > MAX_VIDEO_SECONDS) {
          setError(`El video dura ${dur.toFixed(1)}s. Máximo permitido: ${MAX_VIDEO_SECONDS}s.`);
          return;
        }
      } catch {
        setError("No se pudo verificar el video. Prueba con otro archivo.");
        return;
      }
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!userName.trim()) { setError("Ingresa tu nombre"); return; }
    if (!file) { setError("Sube tu comprobante"); return; }
    setError("");
    setSubmitting(true);
    try {
      // Bloqueo por email
      if (email.trim()) {
        const { data: blk } = await supabase.from("blocked_users").select("email").eq("email", email.trim().toLowerCase()).maybeSingle();
        if (blk) { setError("Este correo está bloqueado. Contacta al admin."); setSubmitting(false); return; }
      }

      const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "png");
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("payment-proofs").getPublicUrl(path);

      const { data, error: fnErr } = await supabase.functions.invoke("payment-submit", {
        body: {
          userName: userName.trim(),
          planId,
          paymentMethod: method,
          receiptType: isVideo ? "video" : "image",
          proofUrl: pub.publicUrl,
          email: email.trim().toLowerCase() || null,
          deviceFingerprint: getDeviceFingerprint(),
          isVideo,
        },
      });
      if (fnErr || data?.error) {
        setError(data?.error === "Comprobante inválido"
          ? "El archivo no parece ser un comprobante. Sube una captura clara."
          : (data?.error || fnErr?.message || "Error al enviar"));
        setSubmitting(false);
        return;
      }
      setRequestId(data.id);
      localStorage.setItem("pending_payment_id", data.id);
      localStorage.setItem("proxy_pending_name", userName.trim());
      if (email.trim()) localStorage.setItem("proxy_pending_email", email.trim().toLowerCase());
      setStep("waiting");
    } catch (e: any) {
      setError(e?.message || "Error inesperado");
    }
    setSubmitting(false);
  };

  const copyKey = async () => {
    await navigator.clipboard.writeText(resultKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setStep("method"); setPlanId(""); setFile(null); setError(""); setRequestId("");
    setPreviewUrl("");
    localStorage.removeItem("pending_payment_id");
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <VideoBackground />
      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-xs text-muted-foreground mb-4 hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al login
        </button>

        <div className="glass-card p-5 glow-border">
          <h1 className="text-base font-bold text-foreground mb-1">Comprar Key</h1>
          <p className="text-[10px] text-muted-foreground/70 tracking-wider uppercase mb-4">
            {method === "paypal" ? "PayPal" : "Diamantes Free Fire"} • Verificación automática
          </p>

          <div className="flex items-center justify-between mb-5">
            {["Método", "Plan", "Pago", "Comprobante"].map((s, i) => {
              const active = i <= Math.min(stepIdx, 3);
              return (
                <div key={s} className="flex-1 flex items-center">
                  <div className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold transition-colors ${active ? "bg-foreground text-background" : "bg-secondary/40 text-muted-foreground"}`}>{i + 1}</div>
                  {i < 3 && <div className="flex-1 h-px bg-border/40 mx-1" />}
                </div>
              );
            })}
          </div>

          {step === "method" && (
            <div className="space-y-2.5">
              <button onClick={() => onPickMethod("paypal")}
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-secondary/40 border border-border/40 hover:bg-secondary/60 active:scale-[0.99] transition-all duration-150">
                <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-foreground" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold text-foreground">PayPal</div>
                  <div className="text-[10px] text-muted-foreground/70">Pago en USD</div>
                </div>
              </button>
              <button onClick={() => onPickMethod("diamonds")}
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-secondary/40 border border-border/40 hover:bg-secondary/60 active:scale-[0.99] transition-all duration-150">
                <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center">
                  <Gem className="w-5 h-5 text-foreground" />
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-semibold text-foreground">Diamantes Free Fire</div>
                  <div className="text-[10px] text-muted-foreground/70">Recarga directa a la cuenta</div>
                </div>
              </button>
            </div>
          )}

          {step === "select" && (
            <div className="space-y-2">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPickPlan(p.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border/40 hover:bg-secondary/60 active:scale-[0.99] transition-all duration-150"
                >
                  <div className="text-left">
                    <div className="text-sm font-semibold text-foreground">{p.label}</div>
                    <div className="text-[10px] text-muted-foreground/70">{p.desc}</div>
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {method === "paypal" ? `$${p.amount} USD` : `${p.amount} 💎`}
                  </div>
                </button>
              ))}
              <button onClick={() => setStep("method")} className="w-full text-[11px] text-muted-foreground hover:text-foreground py-1">Cambiar método</button>
            </div>
          )}

          {step === "warning" && plan && method === "paypal" && (
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-100 leading-relaxed">
                    <span className="font-bold">IMPORTANTE:</span> Realiza el pago a PayPal y toma captura del envío.
                  </p>
                </div>
              </div>
              <div className="bg-secondary/40 border border-border/40 rounded-lg p-3 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Monto</div>
                <div className="text-2xl font-bold text-foreground">${plan.amount} USD</div>
                <div className="text-[10px] text-muted-foreground">{plan.label}</div>
              </div>
              <a href={PAYPAL_URL} target="_blank" rel="noopener noreferrer"
                className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                Ir a PayPal <ExternalLink className="w-4 h-4" />
              </a>
              <button onClick={() => setStep("upload")}
                className="w-full bg-secondary/60 border border-border/40 text-foreground font-semibold py-2.5 rounded-lg text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all">
                Ya pagué, continuar
              </button>
              <button onClick={reset} className="w-full text-[11px] text-muted-foreground hover:text-foreground py-1">Cambiar plan</button>
            </div>
          )}

          {step === "warning" && plan && method === "diamonds" && (
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-100 leading-relaxed">
                    <span className="font-bold">RECARGA A LA CUENTA</span> y sube captura o video (≤{MAX_VIDEO_SECONDS}s) de la transacción.
                  </p>
                </div>
              </div>
              <div className="bg-secondary/40 border border-border/40 rounded-lg p-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between"><span className="text-muted-foreground">ID Free Fire</span><span className="font-mono text-foreground">{FF_ID}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cuenta</span><span className="font-mono text-foreground">{FF_USER}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Región</span><span className="font-mono text-foreground">{FF_REGION}</span></div>
                <div className="flex justify-between pt-1.5 border-t border-border/40"><span className="text-muted-foreground">Monto</span><span className="font-bold text-foreground">{plan.amount} 💎</span></div>
              </div>
              <a href={GARENA_URL} target="_blank" rel="noopener noreferrer"
                className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                Recargar en Garena <ExternalLink className="w-4 h-4" />
              </a>
              <button onClick={() => setStep("upload")}
                className="w-full bg-secondary/60 border border-border/40 text-foreground font-semibold py-2.5 rounded-lg text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all">
                Ya recargué, continuar
              </button>
              <button onClick={reset} className="w-full text-[11px] text-muted-foreground hover:text-foreground py-1">Cambiar plan</button>
            </div>
          )}

          {step === "upload" && plan && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1 block">Tu nombre</label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Nombre"
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring transition-all" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1 block">Correo (opcional)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com"
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring transition-all" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1 block">
                  Comprobante (imagen o video ≤{MAX_VIDEO_SECONDS}s)
                </label>
                <label className="block w-full bg-secondary/40 border border-dashed border-border/60 rounded-lg p-4 cursor-pointer hover:bg-secondary/60 transition-all duration-150">
                  {previewUrl ? (
                    isVideo
                      ? <video src={previewUrl} controls className="w-full h-40 rounded" />
                      : <img src={previewUrl} alt="Comprobante" className="w-full h-40 object-contain rounded" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">Toca para subir imagen o video</span>
                    </div>
                  )}
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              {error && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">{error}</p>}
              <button onClick={submit} disabled={submitting}
                className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : "Enviar comprobante"}
              </button>
              <button onClick={() => setStep("warning")} className="w-full text-[11px] text-muted-foreground hover:text-foreground py-1">Volver</button>
            </div>
          )}

          {step === "waiting" && (
            <div className="space-y-3 text-center py-4">
              <Loader2 className="w-8 h-8 animate-spin text-foreground mx-auto" />
              <h2 className="text-sm font-semibold text-foreground">Esperando aprobación</h2>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                El admin revisará tu comprobante. Tu key aparecerá aquí automáticamente.
                <br />Puedes cerrar y volver, no se pierde.
              </p>
              <div className="text-[9px] text-muted-foreground/50 font-mono">ID: {requestId.slice(0, 8)}</div>
            </div>
          )}

          {step === "approved" && (
            <div className="space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Pago aprobado</h2>
                <p className="text-[11px] text-muted-foreground">Tu key está lista</p>
              </div>
              <div className="bg-secondary/40 border border-border/40 rounded-lg p-3">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Tu key</div>
                <div className="font-mono text-sm text-foreground break-all">{resultKey}</div>
              </div>
              <button onClick={copyKey}
                className="w-full bg-secondary/60 border border-border/40 text-foreground font-semibold py-2.5 rounded-lg text-sm hover:bg-secondary/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                {copied ? <><Check className="w-4 h-4" /> Copiada</> : <><Copy className="w-4 h-4" /> Copiar key</>}
              </button>
              <button onClick={() => navigate("/")} className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all">
                Ir al login
              </button>
            </div>
          )}

          {step === "rejected" && (
            <div className="space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/20 border border-destructive/40 flex items-center justify-center mx-auto">
                <X className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Comprobante rechazado</h2>
                <p className="text-[11px] text-muted-foreground">Puedes reenviar otro comprobante.</p>
              </div>
              <button onClick={() => { setStep("upload"); setFile(null); setPreviewUrl(""); localStorage.removeItem("pending_payment_id"); }}
                className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all">
                Reenviar comprobante
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pay;
