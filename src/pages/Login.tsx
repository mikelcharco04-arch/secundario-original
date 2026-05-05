import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Shield, KeyRound, User, Lock, Fingerprint, Wifi } from "lucide-react";
import { validateKey, activateKey, registerActiveUser } from "@/lib/keys";
import defaultAvatar from "@/assets/default-avatar.gif";

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
        const sessionData = {
          name: trimmedName,
          key: activated.key,
          type: activated.type,
          expiresAt: activated.expiresAt,
          duration: activated.duration,
        };
        localStorage.setItem("proxy_session", JSON.stringify(sessionData));
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
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <VideoBackground />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        {/* Avatar + Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border shadow-[0_0_40px_rgba(255,255,255,0.06)]">
              <img src={defaultAvatar} alt="Profile" className="w-full h-full object-cover scale-110" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
              <Wifi className="w-3.5 h-3.5 text-background" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mb-1">
            <h1 className="text-lg font-bold text-foreground tracking-tight">Conexión Proxy</h1>
            <VerifiedBadge />
          </div>
          <p className="text-[10px] text-muted-foreground/70 tracking-widest uppercase">Secure Gateway v2.4</p>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-center gap-4 mb-5">
          {[
            { icon: Shield, label: "AES-256" },
            { icon: Lock, label: "TLS 1.3" },
            { icon: Fingerprint, label: "Auth" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 bg-secondary/40 border border-border/40 rounded-full px-3 py-1">
              <Icon className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Login Card */}
        <div className="glass-card p-5 glow-border">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-border/30">
            <div className="w-8 h-8 rounded-lg bg-secondary/60 border border-border/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <span className="text-xs text-foreground font-semibold block">Acceso Seguro</span>
              <span className="text-[9px] text-muted-foreground/60">Ingresa tus credenciales</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1 block">Nombre de usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg pl-10 pr-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-1 block">Key de acceso</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Ingresa tu key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/50 rounded-lg pl-10 pr-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-all font-mono"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-foreground text-background font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : "Conectar"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/pay")}
              className="w-full bg-card/60 backdrop-blur-xl text-foreground font-semibold py-2.5 rounded-lg text-sm border border-border/40 hover:bg-card/80 active:scale-[0.98] transition-all flex items-center justify-center"
              style={{ boxShadow: "0 0 20px rgba(255,255,255,0.04), inset 0 0 20px rgba(255,255,255,0.02)" }}
            >
              Comprar key con Binance Pay
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[9px] text-muted-foreground/40 leading-relaxed">
            Secure Proxy Configuration System — Encrypted Connection
            <br />All sessions are monitored and protected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
