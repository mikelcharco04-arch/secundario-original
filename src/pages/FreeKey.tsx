import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import { ArrowLeft, Copy, Check, Share2, Sparkles, Wand2, Users, Gift, KeyRound, Clock, LogIn } from "lucide-react";
import { referralApi, saveReferralCode, loadReferralCode, clearReferralCode } from "@/lib/referral";

const GOAL = 20;
const WA_TEMPLATE = (link: string) =>
  `Hola, ayúdame a conseguir una Key gratuita. Solo entra a este enlace y automáticamente accederás al canal oficial.\n\n${link}`;

const FreeKey = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"register" | "dashboard" | "reward">("register");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Hydrate existing session
  useEffect(() => {
    const code = loadReferralCode();
    if (!code) return;
    (async () => {
      try {
        const { user } = await referralApi.status(code);
        setUser(user);
        setStep(user.key_generated ? "reward" : "dashboard");
      } catch {
        clearReferralCode();
      }
    })();
  }, []);

  // Poll progress
  useEffect(() => {
    if (step !== "dashboard" || !user?.code) return;
    const t = setInterval(async () => {
      try {
        const { user: u } = await referralApi.status(user.code);
        setUser(u);
        if (u.key_generated) setStep("reward");
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [step, user?.code]);

  const validateName = (v: string) => /^[A-Za-z0-9_]{4,20}$/.test(v);

  const handleGenerate = async () => {
    setError("");
    setLoading(true);
    try {
      const { name } = await referralApi.generateName();
      setName(name);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validateName(name)) {
      setError("Solo letras, números y _, entre 4 y 20 caracteres. Sin espacios.");
      return;
    }
    setLoading(true);
    try {
      const { user } = await referralApi.register(name);
      saveReferralCode(user.code);
      setUser(user);
      setStep("dashboard");
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleCopy = async (text: string, which: "link" | "key") => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "link") { setCopied(true); setTimeout(() => setCopied(false), 1500); }
      else { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 1500); }
    } catch {}
  };

  const handleShare = () => {
    if (!user) return;
    const msg = WA_TEMPLATE(user.link);
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const handleReset = () => {
    clearReferralCode();
    setUser(null);
    setName("");
    setStep("register");
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start px-5 py-8 overflow-hidden">
      <VideoBackground />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/65 to-black/90 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-xs text-muted-foreground/80 hover:text-foreground transition mb-5">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al login
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(244,63,94,0.6)]">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Obtener Key Gratis</h1>
            <p className="text-[10px] text-muted-foreground/70 tracking-[0.2em] uppercase">Sistema de Referidos</p>
          </div>
        </div>

        {step === "register" && (
          <div className="relative">
            <div className="absolute -inset-px rounded-[26px] bg-gradient-to-br from-white/15 via-white/5 to-transparent pointer-events-none" />
            <div className="relative rounded-[24px] bg-black/50 backdrop-blur-2xl border border-white/10 p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
              <div className="flex items-start gap-2.5 mb-4">
                <Sparkles className="w-4 h-4 text-rose-300 mt-0.5" />
                <p className="text-xs text-muted-foreground/85 leading-relaxed">
                  Consigue <span className="text-foreground font-semibold">20 referidos válidos</span> y recibe automáticamente una Key gratuita de 1 día.
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold mb-1.5 block">Elige un nombre único</label>
                  <input
                    type="text"
                    inputMode="text"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="mi_nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={20}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-rose-400/50 focus:bg-white/[0.06] transition-all font-mono"
                    style={{ fontSize: 16 }}
                  />
                  <p className="text-[10px] text-muted-foreground/50 mt-1.5">Solo letras, números y “_”. Entre 4 y 20 caracteres. Sin espacios.</p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] rounded-xl py-2.5 text-xs text-muted-foreground/90 transition"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Generar nombre disponible
                </button>

                {error && (
                  <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-2.5 animate-fade-in-up">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_30px_-8px_rgba(244,63,94,0.55)]"
                >
                  {loading ? "Procesando..." : "Registrarme"}
                </button>
              </form>
            </div>
          </div>
        )}

        {step === "dashboard" && user && (
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute -inset-px rounded-[26px] bg-gradient-to-br from-white/15 via-white/5 to-transparent pointer-events-none" />
              <div className="relative rounded-[24px] bg-black/50 backdrop-blur-2xl border border-white/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Nombre</p>
                    <p className="text-sm text-foreground font-semibold">{user.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Código</p>
                    <p className="text-sm text-rose-300 font-mono font-semibold">{user.code}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1.5">Tu enlace</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-foreground/90 truncate font-mono">
                      {user.link}
                    </div>
                    <button
                      onClick={() => handleCopy(user.link, "link")}
                      className="px-3 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] transition"
                      aria-label="Copiar"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold py-3 rounded-xl text-sm active:scale-[0.98] transition-all shadow-[0_10px_30px_-8px_rgba(16,185,129,0.55)]"
                >
                  <Share2 className="w-4 h-4" /> Compartir por WhatsApp
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-px rounded-[26px] bg-gradient-to-br from-white/15 via-white/5 to-transparent pointer-events-none" />
              <div className="relative rounded-[24px] bg-black/50 backdrop-blur-2xl border border-white/10 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-rose-300" />
                    <span className="text-sm text-foreground font-semibold">Progreso</span>
                  </div>
                  <span className="text-sm font-mono text-foreground">
                    <span className="text-rose-300">{user.valid_count}</span> / {GOAL}
                  </span>
                </div>
                <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-red-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, (user.valid_count / GOAL) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                  <span>Esperando nuevos referidos…</span>
                  {user.rejected_count > 0 && <span>{user.rejected_count} rechazados</span>}
                </div>
              </div>
            </div>

            <button onClick={handleReset} className="w-full text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition py-2">
              Cerrar sesión de referidos
            </button>
          </div>
        )}

        {step === "reward" && user && (
          <div className="relative animate-fade-in-up">
            <div className="absolute -inset-px rounded-[26px] bg-gradient-to-br from-emerald-400/30 via-white/5 to-transparent pointer-events-none" />
            <div className="relative rounded-[24px] bg-black/50 backdrop-blur-2xl border border-emerald-400/20 p-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center mb-3 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.6)]">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">¡Felicidades!</h2>
              <p className="text-xs text-muted-foreground/80 mb-4">Has obtenido una Key gratuita.</p>

              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 mb-3">
                <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1">Tu key</p>
                <p className="text-base text-emerald-300 font-mono font-semibold break-all">{user.key_generated}</p>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/80 mb-4">
                <Clock className="w-3.5 h-3.5" />
                Expira: {new Date(user.key_expires_at).toLocaleString()}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCopy(user.key_generated, "key")}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] py-3 rounded-xl text-xs text-foreground transition"
                >
                  {copiedKey ? <><Check className="w-4 h-4 text-emerald-400" /> Copiada</> : <><Copy className="w-4 h-4" /> Copiar Key</>}
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold py-3 rounded-xl text-xs active:scale-[0.98] transition shadow-[0_10px_30px_-8px_rgba(244,63,94,0.55)]"
                >
                  <LogIn className="w-4 h-4" /> Ir al Login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FreeKey;
