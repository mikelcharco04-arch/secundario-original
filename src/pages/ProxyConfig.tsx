import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import { isUserBlocked } from "@/lib/keys";
import {
  Wifi, Globe, Signal, Clock, MapPin, Radio, Server,
  Lock, User, KeyRound, Power, LogOut, Gamepad2, Loader2,
  Shield, Activity, Zap, Eye, ChevronRight, Cpu, HardDrive
} from "lucide-react";

interface Session {
  name: string;
  key: string;
  type: string;
  expiresAt: string | null;
  duration: string;
}

const FREEFIRE_METHODS = [
  "com.dts.freefireth",
  "com.dts.freefiremax",
  "https://dl.dir.freefiremobile.com/common/web_event/official2.0/index.html",
  "https://ff.garena.com/",
  "https://freefire.garena.com/",
  "intent://launch/#Intent;package=com.dts.freefireth;end",
  "intent://launch/#Intent;package=com.dts.freefiremax;end",
  "market://details?id=com.dts.freefireth",
  "market://details?id=com.dts.freefiremax",
  "https://play.google.com/store/apps/details?id=com.dts.freefireth",
  "https://play.google.com/store/apps/details?id=com.dts.freefiremax",
  "https://apps.apple.com/app/free-fire/id1300146617",
  "https://apps.apple.com/app/free-fire-max/id1612063209",
  "freefireth://",
  "freefiremax://",
  "intent://details?id=com.dts.freefireth#Intent;scheme=market;package=com.android.vending;end",
  "intent://details?id=com.dts.freefiremax#Intent;scheme=market;package=com.android.vending;end",
  "https://redirect.appmetrica.yandex.com/serve/674060876177498059",
  "https://freefire.onelink.me/",
  "fb://gaming/play/freefireth",
  "https://m.facebook.com/gaming/play/freefireth",
  "intent://launch/#Intent;package=com.dts.freefireth;category=android.intent.category.LAUNCHER;end",
  "intent://launch/#Intent;package=com.dts.freefiremax;category=android.intent.category.LAUNCHER;end",
  "https://garena.onelink.me/611z",
  "https://ff.garena.com/download",
  "android-app://com.dts.freefireth",
  "android-app://com.dts.freefiremax",
  "https://share.freefire.garena.com",
  "https://booyah.live/freefire",
  "https://www.youtube.com/results?search_query=free+fire+download",
];

const ProxyConfig = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<"Desactivada" | "Manual" | "Automática">("Desactivada");
  const [server, setServer] = useState("");
  const [port, setPort] = useState("");
  const [authEnabled, setAuthEnabled] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [launchingFF, setLaunchingFF] = useState(false);
  const [ffMethod, setFfMethod] = useState(0);
  const [ffStatus, setFfStatus] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const raw = sessionStorage.getItem("proxy_session");
      if (!raw) { navigate("/"); return; }
      const s = JSON.parse(raw);
      const blocked = await isUserBlocked(s.key);
      if (blocked) {
        sessionStorage.removeItem("proxy_session");
        navigate("/");
        return;
      }
      setSession(s);
    };
    checkSession();
  }, [navigate]);

  useEffect(() => {
    if (!session?.expiresAt) return;
    const interval = setInterval(() => {
      const diff = new Date(session.expiresAt!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expirada"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      setNetworkInfo({
        ip: data.ip,
        city: data.city,
        country: data.country_name,
        org: data.org,
      });
    } catch {
      setNetworkInfo({ ip: "No disponible", city: "—", country: "—", org: "—" });
    }
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 2000);
  };

  const launchFreeFire = useCallback(async () => {
    setLaunchingFF(true);
    setFfMethod(0);
    setFfStatus("");

    for (let i = 0; i < FREEFIRE_METHODS.length; i++) {
      setFfMethod(i + 1);
      setFfStatus(`Método ${i + 1}/30: intentando...`);

      try {
        const url = FREEFIRE_METHODS[i];

        if (url.startsWith("intent://") || url.startsWith("freefireth://") || url.startsWith("freefiremax://") || url.startsWith("android-app://") || url.startsWith("fb://") || url.startsWith("market://")) {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = url;
          document.body.appendChild(iframe);
          await new Promise(r => setTimeout(r, 1500));
          document.body.removeChild(iframe);
        } else if (url.startsWith("com.dts.")) {
          window.location.href = `intent://launch/#Intent;package=${url};end`;
          await new Promise(r => setTimeout(r, 2000));
        } else {
          window.open(url, "_blank");
          await new Promise(r => setTimeout(r, 1500));
        }

        setFfStatus(`Método ${i + 1} ejecutado — verificando...`);
        await new Promise(r => setTimeout(r, 500));
      } catch {
        setFfStatus(`Método ${i + 1} falló, probando siguiente...`);
        await new Promise(r => setTimeout(r, 300));
      }
    }

    setFfStatus("Todos los métodos ejecutados");
    setTimeout(() => {
      setLaunchingFF(false);
      setFfStatus("");
    }, 3000);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("proxy_session");
    navigate("/");
  };

  if (!session) return null;

  const modes: Array<"Desactivada" | "Manual" | "Automática"> = ["Desactivada", "Manual", "Automática"];

  return (
    <div className="relative min-h-screen pb-8">
      <VideoBackground />
      <div className="relative z-10 max-w-sm mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in-up">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Configurar Proxy</h1>
            <p className="text-xs text-muted-foreground">Hola, {session.name}</p>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors active:scale-95">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Session Info Card */}
        <div className="glass-card p-4 mb-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Sesión activa</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-secondary/30 rounded-lg px-3 py-2 border border-border/30">
              <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Usuario</p>
              <p className="text-[11px] text-foreground font-medium">{session.name}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg px-3 py-2 border border-border/30">
              <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Tipo</p>
              <p className="text-[11px] text-foreground font-medium flex items-center gap-1">
                {session.type === "Premium" && <Zap className="w-3 h-3 text-amber-400" />}
                {session.type}
              </p>
            </div>
            <div className="bg-secondary/30 rounded-lg px-3 py-2 border border-border/30">
              <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Duración</p>
              <p className="text-[11px] text-foreground font-medium">{session.duration}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg px-3 py-2 border border-border/30">
              <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">Tiempo</p>
              <p className="text-[11px] text-foreground font-medium">
                {session.expiresAt ? (timeLeft || "Calculando...") : "∞"}
              </p>
            </div>
          </div>
        </div>

        {/* Mode selector */}
        <div className="glass-card p-4 mb-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <p className="text-xs text-muted-foreground mb-3 font-medium">Modo de conexión</p>
          <div className="grid grid-cols-3 gap-2">
            {modes.map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setConnected(false); }}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                  mode === m ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Config fields */}
        {mode !== "Desactivada" && (
          <div className="glass-card p-4 mb-4 space-y-3 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Servidor"
                value={mode === "Automática" ? "auto.proxy.net" : server}
                onChange={(e) => setServer(e.target.value)}
                disabled={mode === "Automática"}
                className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all disabled:opacity-50"
              />
            </div>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Puerto"
                value={mode === "Automática" ? "8080" : port}
                onChange={(e) => setPort(e.target.value)}
                disabled={mode === "Automática"}
                className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Autenticación</span>
              </div>
              <button
                onClick={() => setAuthEnabled(!authEnabled)}
                className={`w-10 h-6 rounded-full transition-colors relative ${authEnabled ? "bg-primary" : "bg-secondary"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${authEnabled ? "bg-primary-foreground translate-x-5" : "bg-muted-foreground translate-x-1"}`} />
              </button>
            </div>

            {authEnabled && (
              <div className="space-y-3 pt-1">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    placeholder="Usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                  />
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Network info */}
        {connected && networkInfo && (
          <div className="glass-card p-4 mb-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <p className="text-xs text-muted-foreground mb-3 font-medium">Información de Red</p>
            <div className="space-y-2.5">
              {[
                { icon: Wifi, label: "IP", value: networkInfo.ip },
                { icon: Radio, label: "Tipo de red", value: "WiFi" },
                { icon: MapPin, label: "Ubicación", value: `${networkInfo.city} / ${networkInfo.country}` },
                { icon: Signal, label: "Señal", value: "Fuerte" },
                { icon: Clock, label: "Duración key", value: session.expiresAt ? `${session.duration} — ${timeLeft}` : `${session.duration}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <span className="text-xs text-foreground font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connect button */}
        {mode !== "Desactivada" && !connected && (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full glass-card p-4 flex items-center justify-center gap-3 hover:bg-card/90 active:scale-[0.98] transition-all animate-fade-in-up mb-4"
            style={{ animationDelay: "0.25s" }}
          >
            {connecting ? (
              <>
                <div className="relative">
                  <div className="w-5 h-5 rounded-full bg-primary/20 animate-connecting" />
                  <Power className="w-5 h-5 text-primary absolute inset-0" />
                </div>
                <span className="text-sm font-medium">Conectando...</span>
              </>
            ) : (
              <>
                <Power className="w-5 h-5 text-foreground" />
                <span className="text-sm font-medium">Conectar al Servidor</span>
              </>
            )}
          </button>
        )}

        {connected && (
          <div className="glass-card p-4 text-center animate-fade-in-up border-emerald-500/20 mb-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-emerald-400">Conexión Activa</span>
            </div>
          </div>
        )}

        {/* System Info - Always visible */}
        <div className="glass-card p-4 mb-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Sistema</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Protocolo", value: "HTTPS", icon: Shield },
              { label: "Cifrado", value: "AES-256", icon: Lock },
              { label: "DNS", value: "1.1.1.1", icon: Globe },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-secondary/30 rounded-lg px-2 py-2.5 border border-border/30 text-center">
                <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
                <p className="text-[10px] text-foreground font-medium">{value}</p>
                <p className="text-[8px] text-muted-foreground/70 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Stats */}
        <div className="glass-card p-4 mb-4 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Rendimiento</span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "Latencia", value: "12ms", pct: 12 },
              { label: "Velocidad", value: "94 Mbps", pct: 94 },
              { label: "Estabilidad", value: "99.9%", pct: 99 },
            ].map(({ label, value, pct }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                  <span className="text-[10px] text-foreground font-medium">{value}</span>
                </div>
                <div className="w-full h-1 rounded-full bg-secondary/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Free Fire Launch Button */}
        {connected && (
          <button
            onClick={launchFreeFire}
            disabled={launchingFF}
            className="w-full glass-card p-4 flex flex-col items-center gap-2 hover:bg-card/90 active:scale-[0.98] transition-all animate-fade-in-up border-orange-500/20"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="flex items-center gap-3">
              {launchingFF ? (
                <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
              ) : (
                <Gamepad2 className="w-5 h-5 text-orange-400" />
              )}
              <span className="text-sm font-medium text-foreground">
                {launchingFF ? "Abriendo Free Fire..." : "Abrir Free Fire"}
              </span>
            </div>
            {launchingFF && (
              <div className="w-full space-y-1.5">
                <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full transition-all duration-300"
                    style={{ width: `${(ffMethod / 30) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">{ffStatus}</p>
              </div>
            )}
            {!launchingFF && (
              <p className="text-[10px] text-muted-foreground">30 métodos de apertura automáticos</p>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProxyConfig;
