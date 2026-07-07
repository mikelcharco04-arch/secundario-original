import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Shield, KeyRound, User, Lock, Fingerprint, ArrowRight, Gift } from "lucide-react";
import { validateKey, activateKey, registerActiveUser } from "@/lib/keys";
import reLogoAsset from "@/assets/re-logo.jpeg.asset.json";

// Prefer the static /public file (works on Vercel + any host); fall back to the CDN pointer on Lovable.
const reLogoUrl = "/re-logo.jpeg";
const reLogoFallback = reLogoAsset.url;

const Login = () => {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem("proxy_session");
    if (raw) {
      const s = JSON.parse(raw);
      if (!s.expiresAt || new Date(s.expiresAt).getTime() > Date.now()) {
        navigate("/proxy");
      } else {
        localStorage.removeItem("proxy_session");
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !key.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    const trimmedKey = key.trim();
    const trimmedName = name.trim();

    const foundKey = await validateKey(trimmedKey);
    if (foundKey) {
      const activated = await activateKey(trimmedKey, trimmedName);
      if (activated) {
        await registerActiveUser(trimmedName, activated.key, activated.type, activated.expiresAt || "");
        localStorage.setItem("proxy_session", JSON.stringify({
          name: trimmedName,
          key: activated.key,
          type: activated.type,
          expiresAt: activated.expiresAt,
          duration: activated.duration,
        }));
        navigate("/proxy");
      } else {
        setError("Error al activar la key. Intenta de nuevo.");
      }
    } else {
      setError("Key no encontrada, ya usada o expirada.");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-5 py-8 overflow-hidden">
      <VideoBackground />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/60 to-black/85 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        {/* Cabecera: avatar */}
        <div className="relative flex flex-col items-center mb-7 pt-6">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500/40 via-red-500/30 to-orange-300/40 blur-2xl scale-110 animate-pulse" />
            <div className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-rose-400 via-red-500 to-orange-300 shadow-[0_0_40px_rgba(244,63,94,0.45)]">
              <div className="p-[3px] rounded-full bg-background">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={reLogoUrl}
                    onError={(e) => { const img = e.currentTarget; if (img.src !== reLogoFallback) img.src = reLogoFallback; }}
                    alt="Ump & Famosos"
                    className="w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Ump & Famosos</h1>
            <VerifiedBadge />
          </div>
          <p className="text-[10px] text-muted-foreground/70 tracking-[0.25em] uppercase">Secure Gateway · v2.4</p>
        </div>

        {/* Chips de estado */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {[
            { icon: Shield, label: "AES-256" },
            { icon: Lock, label: "TLS 1.3" },
            { icon: Fingerprint, label: "Auth" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-full px-2.5 py-1">
              <Icon className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] text-muted-foreground/90 font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Card principal */}
        <div className="relative">
          <div className="absolute -inset-px rounded-[26px] bg-gradient-to-br from-white/15 via-white/5 to-transparent pointer-events-none" />
          <div className="relative rounded-[24px] bg-black/45 backdrop-blur-2xl border border-white/10 p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-rose-300" />
              </div>
              <div>
                <span className="text-sm text-foreground font-semibold block leading-tight">Acceso Seguro</span>
                <span className="text-[10px] text-muted-foreground/70">Ingresa tus credenciales</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold mb-1.5 block">Usuario</label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-rose-400" />
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-rose-400/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold mb-1.5 block">Key de acceso</label>
                <div className="relative group">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-rose-400" />
                  <input
                    type="text"
                    placeholder="PROXY-XXXX-XXXX"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-rose-400/50 focus:bg-white/[0.06] transition-all font-mono tracking-wide"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-2.5 animate-fade-in-up">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group w-full relative overflow-hidden bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold py-3.5 rounded-xl text-sm active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_30px_-8px_rgba(244,63,94,0.55)] hover:shadow-[0_15px_40px_-8px_rgba(244,63,94,0.7)]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      Conectar
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => navigate("/free-key")}
              className="mt-3 group w-full flex items-center justify-center gap-2 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-foreground/90 font-medium py-3 rounded-xl text-sm transition-all"
            >
              <Gift className="w-4 h-4 text-rose-300" />
              Obtener Key Gratis
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-[9px] text-muted-foreground/40 leading-relaxed">
          Secure Proxy Configuration System — Encrypted Connection
          <br />All sessions are monitored and protected.
        </p>
      </div>
    </div>
  );
};

export default Login;
