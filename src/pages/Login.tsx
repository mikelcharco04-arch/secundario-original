import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Shield, KeyRound, User, Lock, Fingerprint, ArrowRight } from "lucide-react";
import { validateKey, activateKey, registerActiveUser } from "@/lib/keys";

const raveLogo = "/rave-logo.png";

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

      {/* Soft gradient veil */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/80 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        {/* Logo con anillo animado */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-sky-500/50 via-blue-500/40 to-cyan-300/50 blur-2xl scale-110 animate-pulse" />
            <div className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-sky-400 via-blue-500 to-cyan-300 shadow-[0_0_40px_rgba(56,189,248,0.5)]">
              <div className="p-[3px] rounded-full bg-background">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-black flex items-center justify-center">
                  <img
                    src={raveLogo}
                    alt="Rave"
                    className="w-full h-full object-contain scale-105"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Rave</h1>
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
                <Shield className="w-4 h-4 text-sky-300" />
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
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-sky-400" />
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-sky-400/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold mb-1.5 block">Key de acceso</label>
                <div className="relative group">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-sky-400" />
                  <input
                    type="text"
                    placeholder="PROXY-XXXX-XXXX"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-sky-400/50 focus:bg-white/[0.06] transition-all font-mono tracking-wide"
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
                className="group w-full relative overflow-hidden bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold py-3 rounded-xl text-sm active:scale-[0.98] transition-all disabled:opacity-50 shadow-[0_10px_30px_-8px_rgba(56,189,248,0.55)] hover:shadow-[0_15px_40px_-8px_rgba(56,189,248,0.7)]"
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
          </div>
        </div>

        {/* WhatsApp CTA rediseñado */}
        <a
          href="https://whatsapp.com/channel/0029VbC678PIyPtc7iERCH2R"
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-4 flex items-center justify-between gap-3 w-full p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/8 to-transparent backdrop-blur-xl border border-emerald-400/25 hover:border-emerald-400/50 active:scale-[0.98] transition-all shadow-[0_10px_30px_-15px_rgba(16,185,129,0.5)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_6px_20px_-6px_rgba(16,185,129,0.7)]">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground leading-tight">Canal Oficial</p>
              <p className="text-[10px] text-emerald-300/80 tracking-wide">WhatsApp · Actualizaciones</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-emerald-300/70 transition-transform group-hover:translate-x-0.5" />
        </a>

        <p className="mt-5 text-center text-[9px] text-muted-foreground/40 leading-relaxed">
          Secure Proxy Configuration System — Encrypted Connection
          <br />All sessions are monitored and protected.
        </p>
      </div>
    </div>
  );
};

export default Login;
