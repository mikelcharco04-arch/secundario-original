import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Shield, KeyRound, User } from "lucide-react";
import { validateKey, activateKey, registerActiveUser } from "@/lib/keys";

const Login = () => {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Auto-redirect if session exists in localStorage
  useEffect(() => {
    const raw = localStorage.getItem("proxy_session");
    if (raw) {
      const s = JSON.parse(raw);
      // Check if not expired
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

    // Accept master key "117" for quick access
    if (trimmedKey === "117") {
      const sessionData = {
        name: trimmedName,
        key: "117",
        type: "Normal",
        expiresAt: null,
        duration: "Ilimitada",
      };
      localStorage.setItem("proxy_session", JSON.stringify(sessionData));
      navigate("/proxy");
      setLoading(false);
      return;
    }

    // Validate admin-generated keys
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
        {/* Profile */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-28 h-28 rounded-full overflow-hidden ring-2 ring-border ring-offset-2 ring-offset-background shadow-[0_0_30px_rgba(255,255,255,0.08)]">
              <img
                src="/profile.gif"
                alt="Profile"
                className="w-full h-full object-cover scale-110"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Conexión Proxy</h1>
            <VerifiedBadge />
          </div>
        </div>

        {/* Login Card */}
        <div className="glass-card p-6 glow-border">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Acceso Seguro</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Key de acceso"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all font-mono"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : "Ingresar"}
            </button>
          </form>
        </div>

        {/* Footer text */}
        <div className="mt-8 text-center px-4">
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
            <span className="font-medium text-muted-foreground/80">Secure Proxy Configuration System</span>
            <br /><br />
            This platform allows authorized users to configure network proxy connections using secure access keys.
            All connections are monitored and optimized for stability and performance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
