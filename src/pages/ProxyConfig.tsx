import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isUserBlocked } from "@/lib/keys";
import defaultAvatar from "@/assets/default-avatar.gif";
import {
  Wifi, Globe, Signal, Clock, MapPin, Radio, Server,
  Lock, User, KeyRound, Power, LogOut, Gamepad2, Loader2,
  Shield, Activity, Zap, Eye, ChevronRight, Cpu, HardDrive,
  Home, Settings, FileText, UserCircle, Code, AlertTriangle,
  Copy, Check, ChevronDown, Crosshair, Target, Gauge, Ghost,
  Bolt, Flame, Radar, ScanLine, Layers, BarChart3
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

const SERVERS = [
  { id: 1, name: "US East 1", host: "us-east1.proxy.net", port: "8080", user: "proxy_us1", pass: "Xk9mP2nQ" },
  { id: 2, name: "US East 2", host: "us-east2.proxy.net", port: "8081", user: "proxy_us2", pass: "Bv3rT7wZ" },
  { id: 3, name: "US West 1", host: "us-west1.proxy.net", port: "8080", user: "proxy_usw1", pass: "Lm4sD8fG" },
  { id: 4, name: "US West 2", host: "us-west2.proxy.net", port: "3128", user: "proxy_usw2", pass: "Hn6jK1pY" },
  { id: 5, name: "Brasil 1", host: "br-sao1.proxy.net", port: "8080", user: "proxy_br1", pass: "Qw5eR9tU" },
  { id: 6, name: "Brasil 2", host: "br-rio1.proxy.net", port: "8081", user: "proxy_br2", pass: "Jc2xV6bN" },
  { id: 7, name: "México 1", host: "mx-cdmx1.proxy.net", port: "8080", user: "proxy_mx1", pass: "Fg7hY3kL" },
  { id: 8, name: "México 2", host: "mx-gdl1.proxy.net", port: "3128", user: "proxy_mx2", pass: "Zp8qA4sD" },
  { id: 9, name: "Colombia", host: "co-bog1.proxy.net", port: "8080", user: "proxy_co1", pass: "Wt1rE5uI" },
  { id: 10, name: "Argentina", host: "ar-bue1.proxy.net", port: "8081", user: "proxy_ar1", pass: "Oy6pA2sD" },
  { id: 11, name: "Chile", host: "cl-scl1.proxy.net", port: "8080", user: "proxy_cl1", pass: "Mf3gH7jK" },
  { id: 12, name: "Perú", host: "pe-lim1.proxy.net", port: "3128", user: "proxy_pe1", pass: "Nb4vC8xZ" },
  { id: 13, name: "España", host: "es-mad1.proxy.net", port: "8080", user: "proxy_es1", pass: "Lk9mD1fG" },
  { id: 14, name: "Alemania 1", host: "de-fra1.proxy.net", port: "8080", user: "proxy_de1", pass: "Rh5jW3nQ" },
  { id: 15, name: "Alemania 2", host: "de-ber1.proxy.net", port: "8081", user: "proxy_de2", pass: "Tu7eY4pI" },
  { id: 16, name: "Francia", host: "fr-par1.proxy.net", port: "8080", user: "proxy_fr1", pass: "Sa2dF6gH" },
  { id: 17, name: "UK London", host: "uk-lon1.proxy.net", port: "3128", user: "proxy_uk1", pass: "Qj8kL1zX" },
  { id: 18, name: "Países Bajos", host: "nl-ams1.proxy.net", port: "8080", user: "proxy_nl1", pass: "Cv3bN7mQ" },
  { id: 19, name: "Japón", host: "jp-tky1.proxy.net", port: "8080", user: "proxy_jp1", pass: "Wp4eR8tY" },
  { id: 20, name: "Corea del Sur", host: "kr-sel1.proxy.net", port: "8081", user: "proxy_kr1", pass: "Ux6iO2pA" },
  { id: 21, name: "Singapur", host: "sg-sin1.proxy.net", port: "8080", user: "proxy_sg1", pass: "Hd5fG9jK" },
  { id: 22, name: "India", host: "in-mum1.proxy.net", port: "3128", user: "proxy_in1", pass: "Bl7mN3vC" },
  { id: 23, name: "Australia", host: "au-syd1.proxy.net", port: "8080", user: "proxy_au1", pass: "Zx1cV5bN" },
  { id: 24, name: "Canadá", host: "ca-tor1.proxy.net", port: "8081", user: "proxy_ca1", pass: "Km8jH2gF" },
  { id: 25, name: "Sudáfrica", host: "za-jnb1.proxy.net", port: "8080", user: "proxy_za1", pass: "Py4tR6eW" },
  { id: 26, name: "Rusia", host: "ru-mow1.proxy.net", port: "3128", user: "proxy_ru1", pass: "Qi9oP1aS" },
  { id: 27, name: "Turquía", host: "tr-ist1.proxy.net", port: "8080", user: "proxy_tr1", pass: "Dj3fG7hK" },
];

const ProxyConfig = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "servers" | "settings">("home");
  const [timeLeft, setTimeLeft] = useState("");
  const [launchingFF, setLaunchingFF] = useState(false);
  const [ffMethod, setFfMethod] = useState(0);
  const [ffStatus, setFfStatus] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedServer, setExpandedServer] = useState<number | null>(null);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);

  // Game toggles
  const [noRecoil, setNoRecoil] = useState(false);
  const [autoAim, setAutoAim] = useState(false);
  const [fovEnabled, setFovEnabled] = useState(false);
  const [fovSize, setFovSize] = useState(120);
  const [speedHack, setSpeedHack] = useState(false);
  const [wallHack, setWallHack] = useState(false);
  // Performance sliders
  const [aimSmooth, setAimSmooth] = useState(50);
  const [fireRate, setFireRate] = useState(30);
  const [sensitivity, setSensitivity] = useState(60);

  useEffect(() => {
    const checkSession = async () => {
      const raw = localStorage.getItem("proxy_session");
      if (!raw) { navigate("/"); return; }
      const s = JSON.parse(raw);
      if (s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem("proxy_session");
        navigate("/");
        return;
      }
      const blocked = await isUserBlocked(s.key);
      if (blocked) {
        localStorage.removeItem("proxy_session");
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

  const launchFreeFire = useCallback(async () => {
    setLaunchingFF(true); setFfMethod(0); setFfStatus("");
    for (let i = 0; i < FREEFIRE_METHODS.length; i++) {
      setFfMethod(i + 1);
      setFfStatus(`Method ${i + 1}/${FREEFIRE_METHODS.length}`);
      try {
        const url = FREEFIRE_METHODS[i];
        if (url.startsWith("intent://") || url.startsWith("freefireth://") || url.startsWith("freefiremax://") || url.startsWith("android-app://") || url.startsWith("fb://") || url.startsWith("market://")) {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none"; iframe.src = url;
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
        await new Promise(r => setTimeout(r, 500));
      } catch {
        await new Promise(r => setTimeout(r, 300));
      }
    }
    setFfStatus("Done");
    setTimeout(() => { setLaunchingFF(false); setFfStatus(""); }, 3000);
  }, []);

  const handleLogout = () => { localStorage.removeItem("proxy_session"); navigate("/"); };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 1500);
  };

  if (!session) return null;

  // Animated Toggle component
  const AnimatedToggle = ({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: boolean; onChange: (v: boolean) => void }) => (
    <div
      className={`flex items-center justify-between rounded-xl px-4 py-3.5 border transition-all duration-500 ${
        value
          ? "bg-primary/5 border-primary/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          : "bg-secondary/30 border-border/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg transition-all duration-500 ${value ? "bg-primary/10 text-primary" : "bg-secondary/50 text-muted-foreground"}`}>
          {icon}
        </div>
        <span className={`text-sm font-medium transition-colors duration-300 ${value ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-7 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          value ? "bg-primary shadow-[0_0_12px_rgba(255,255,255,0.15)]" : "bg-secondary border border-border/40"
        }`}
      >
        <span
          className={`absolute top-[3px] w-[22px] h-[22px] rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            value
              ? "translate-x-[23px] bg-primary-foreground shadow-[0_0_8px_rgba(255,255,255,0.3)]"
              : "translate-x-[3px] bg-muted-foreground/50"
          }`}
        />
      </button>
    </div>
  );

  // FOV Slider
  const FovSlider = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="rounded-xl px-4 py-3 bg-secondary/20 border border-border/20 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground font-medium">Tamaño de FOV</span>
        <span className="text-xs text-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded-md">{value}px</span>
      </div>
      <input
        type="range"
        min={40}
        max={300}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) ${((value - 40) / 260) * 100}%, hsl(var(--secondary)) ${((value - 40) / 260) * 100}%)`,
        }}
      />
    </div>
  );

  // Performance Slider component
  const PerfSlider = ({ label, icon, value, onChange, unit = "%" }: { label: string; icon: React.ReactNode; value: number; onChange: (v: number) => void; unit?: string }) => (
    <div className="rounded-xl px-4 py-3 bg-secondary/20 border border-border/20 transition-all duration-300">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <span className="text-xs text-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded-md">{value}{unit}</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer transition-all"
        style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${value}%, hsl(var(--secondary)) ${value}%)` }}
      />
    </div>
  );

  const renderHome = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <img src={defaultAvatar} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-border object-cover" />
          <div>
            <p className="text-sm font-semibold text-foreground">{session.name}</p>
            <p className="text-[10px] text-muted-foreground">{session.duration} — {session.expiresAt ? (timeLeft || "...") : "∞"}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors active:scale-95">
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Free Fire button */}
      <button
        onClick={launchFreeFire}
        disabled={launchingFF}
        className="w-full glass-card p-3.5 flex items-center gap-3 hover:bg-card/90 active:scale-[0.98] transition-all animate-fade-in-up"
      >
        {launchingFF ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Gamepad2 className="w-5 h-5 text-primary" />}
        <div className="flex-1 text-left">
          <span className="text-sm font-medium text-foreground">Free Fire</span>
          {launchingFF && <p className="text-[9px] text-muted-foreground font-mono">{ffStatus}</p>}
        </div>
        {launchingFF && (
          <div className="w-16 h-1 rounded-full bg-secondary/50 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(ffMethod / FREEFIRE_METHODS.length) * 100}%` }} />
          </div>
        )}
      </button>

      {/* Combat Modules */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-1">
          <Crosshair className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Combat Modules</span>
        </div>
        <AnimatedToggle label="No Recoil" icon={<Shield className="w-4 h-4" />} value={noRecoil} onChange={setNoRecoil} />
        <AnimatedToggle label="Auto Apuntado" icon={<Target className="w-4 h-4" />} value={autoAim} onChange={setAutoAim} />
        <AnimatedToggle label="Speed Hack" icon={<Bolt className="w-4 h-4" />} value={speedHack} onChange={setSpeedHack} />
        <AnimatedToggle label="Wall Hack" icon={<Ghost className="w-4 h-4" />} value={wallHack} onChange={setWallHack} />
      </div>

      {/* FOV Section */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-1">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Field of View</span>
        </div>
        <AnimatedToggle label="FOV Overlay" icon={<Eye className="w-4 h-4" />} value={fovEnabled} onChange={setFovEnabled} />
        {fovEnabled && (
          <div className="animate-fade-in-up">
            <FovSlider value={fovSize} onChange={setFovSize} />
          </div>
        )}
      </div>

      {/* Performance Tuning */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-1">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Performance Tuning</span>
        </div>
        <PerfSlider label="Aim Smoothness" icon={<ScanLine className="w-3.5 h-3.5" />} value={aimSmooth} onChange={setAimSmooth} />
        <PerfSlider label="Fire Rate Boost" icon={<Flame className="w-3.5 h-3.5" />} value={fireRate} onChange={setFireRate} />
        <PerfSlider label="Sensitivity" icon={<Radar className="w-3.5 h-3.5" />} value={sensitivity} onChange={setSensitivity} />
      </div>

      {/* Network Status Panel */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-1">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Network Status</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Latency", value: "8ms", icon: <Zap className="w-3 h-3" /> },
            { label: "Uptime", value: "99.9%", icon: <Activity className="w-3 h-3" /> },
            { label: "Tunnel", value: "Active", icon: <Lock className="w-3 h-3" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-secondary/20 rounded-lg p-2.5 border border-border/20 text-center">
              <div className="flex justify-center text-muted-foreground mb-1">{icon}</div>
              <p className="text-[10px] text-foreground font-mono font-semibold">{value}</p>
              <p className="text-[8px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Packet Injector Console */}
      <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-3">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Packet Injector</span>
        </div>
        <div className="bg-background/60 rounded-lg p-3 border border-border/30 font-mono text-[9px] space-y-1 max-h-32 overflow-y-auto">
          <p><span className="text-primary">root@proxy:~$</span> <span className="text-foreground/70">inject --module combat.so --pid 1247</span></p>
          <p className="text-muted-foreground/60">[OK] Module loaded: combat.so (v3.2.1)</p>
          <p><span className="text-primary">root@proxy:~$</span> <span className="text-foreground/70">set recoil_offset 0x00</span></p>
          <p className="text-muted-foreground/60">[OK] Memory patched @ 0x7FFA3B20</p>
          <p><span className="text-primary">root@proxy:~$</span> <span className="text-foreground/70">hook render_pipeline --wall true</span></p>
          <p className="text-muted-foreground/60">[OK] Render hook active — entities visible</p>
          <p><span className="text-primary">root@proxy:~$</span> <span className="text-foreground/70 animate-pulse">_</span></p>
        </div>
      </div>

      {/* FOV Circle Overlay */}
      {fovEnabled && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div
            className="rounded-full border-2 border-primary/50"
            style={{
              width: fovSize,
              height: fovSize,
              boxShadow: "0 0 20px hsl(var(--primary) / 0.1)",
              transition: "width 0.3s ease-out, height 0.3s ease-out",
            }}
          />
        </div>
      )}
    </div>
  );

  const renderServers = () => (
    <div className="space-y-4">
      <div className="animate-fade-in-up">
        <h1 className="text-lg font-semibold text-foreground">Servidores</h1>
        <p className="text-xs text-muted-foreground">{SERVERS.length} servidores disponibles</p>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto pr-0.5 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        {SERVERS.map((srv) => (
          <div key={srv.id} className="glass-card overflow-hidden">
            <button
              onClick={() => setExpandedServer(expandedServer === srv.id ? null : srv.id)}
              className="w-full p-3 flex items-center justify-between active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/50 border border-border/30 flex items-center justify-center">
                  <Server className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-foreground font-medium">{srv.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{srv.host}:{srv.port}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedServer === srv.id ? "rotate-180" : ""}`} />
              </div>
            </button>
            {expandedServer === srv.id && (
              <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-3">
                {[
                  { label: "Servidor", value: srv.host, id: `host-${srv.id}` },
                  { label: "Puerto", value: srv.port, id: `port-${srv.id}` },
                  { label: "Usuario", value: srv.user, id: `user-${srv.id}` },
                  { label: "Contraseña", value: srv.pass, id: `pass-${srv.id}` },
                ].map(({ label, value, id }) => (
                  <div key={id} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2 border border-border/30">
                    <div>
                      <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">{label}</p>
                      <p className="text-[11px] text-foreground font-mono font-medium">{value}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(value, id)}
                      className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors active:scale-95"
                    >
                      {copiedField === id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const settingsSections = [
    {
      id: "profile",
      icon: UserCircle,
      title: "Perfil",
      content: (
        <div className="space-y-3">
          <div className="flex justify-center">
            <img src={defaultAvatar} alt="Avatar" className="w-20 h-20 rounded-full border-2 border-border object-cover" />
          </div>
          {[
            { label: "Nombre", value: session.name },
            { label: "Key activa", value: session.key },
            { label: "Tipo", value: session.type },
            { label: "Duración", value: session.duration },
            { label: "Tiempo restante", value: session.expiresAt ? (timeLeft || "Calculando...") : "Ilimitado" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
              <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">{label}</p>
              <p className="text-sm text-foreground font-medium">{value}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "proxy-config",
      icon: Settings,
      title: "Configuración del Proxy",
      content: (
        <div className="space-y-3">
          {[
            { label: "Protocolo", value: "HTTP / HTTPS / SOCKS5" },
            { label: "Cifrado", value: "AES-256-GCM" },
            { label: "DNS primario", value: "1.1.1.1 (Cloudflare)" },
            { label: "DNS secundario", value: "8.8.8.8 (Google)" },
            { label: "Modo de túnel", value: "Split Tunneling" },
            { label: "Compresión", value: "Brotli" },
            { label: "Keep-Alive", value: "60s" },
            { label: "Reintentos", value: "3" },
            { label: "Timeout", value: "30s" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <span className="text-[10px] text-foreground font-medium">{value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "terms",
      icon: FileText,
      title: "Términos y Condiciones",
      content: (
        <div className="space-y-3">
          {[
            { t: "1. Uso Aceptable", p: "El servicio está destinado para uso personal y legítimo. Queda prohibido cualquier uso ilegal." },
            { t: "2. Keys", p: "Las keys son personales e intransferibles. Compartirlas resulta en suspensión inmediata." },
            { t: "3. Disponibilidad", p: "Servicio proporcionado 'tal cual'. No garantizamos 100% de disponibilidad." },
            { t: "4. Privacidad", p: "No almacenamos registros de navegación. Solo datos de sesión para gestionar acceso." },
          ].map(({ t, p }) => (
            <div key={t} className="bg-secondary/20 rounded-lg p-3 border border-border/30">
              <h3 className="text-xs font-semibold text-foreground mb-1">{t}</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "developer",
      icon: Code,
      title: "Desarrollador",
      content: (
        <div className="space-y-3">
          <div className="flex flex-col items-center text-center py-3">
            <div className="w-16 h-16 rounded-full bg-secondary/50 border-2 border-border/50 flex items-center justify-center mb-2">
              <Code className="w-7 h-7 text-foreground" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground">Modifaxff Oficial</h3>
              <VerifiedBadge className="w-4 h-4" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Desarrollador y Creador</p>
          </div>
          {[
            { label: "Plataforma", value: "Conexión Proxy v2.4" },
            { label: "Stack", value: "React + TypeScript" },
            { label: "Cifrado", value: "AES-256-GCM" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <span className="text-[10px] text-foreground font-medium">{value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "advanced",
      icon: Cpu,
      title: "Configuración Avanzada",
      content: (
        <div className="space-y-3">
          {[
            { label: "TCP Fast Open", value: "Habilitado" },
            { label: "BBR Congestion", value: "Habilitado" },
            { label: "IPv6 Dual Stack", value: "Desactivado" },
            { label: "Socket Buffer", value: "256KB / 512KB" },
            { label: "Nagle Algorithm", value: "Off (Low Latency)" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
              <span className="text-[10px] text-muted-foreground">{label}</span>
              <span className="text-[10px] text-foreground font-medium font-mono">{value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "logs",
      icon: FileText,
      title: "Registro de Actividad",
      content: (
        <div className="bg-secondary/20 rounded-lg p-3 border border-border/30 font-mono text-[9px] space-y-1.5 max-h-60 overflow-y-auto">
          <p><span className="text-emerald-400">[{new Date().toLocaleTimeString()}]</span> <span className="text-foreground/60">Sesión iniciada — {session.name}</span></p>
          <p><span className="text-emerald-400">[{new Date(Date.now() - 120000).toLocaleTimeString()}]</span> <span className="text-foreground/60">TLS handshake OK</span></p>
          <p><span className="text-blue-400">[{new Date(Date.now() - 300000).toLocaleTimeString()}]</span> <span className="text-foreground/60">DNS → 1.1.1.1 (3ms)</span></p>
          <p><span className="text-amber-400">[{new Date(Date.now() - 900000).toLocaleTimeString()}]</span> <span className="text-foreground/60">Auto-reconnect</span></p>
        </div>
      ),
    },
    {
      id: "network-diag",
      icon: Wifi,
      title: "Diagnóstico de Red",
      content: (
        <div className="space-y-3">
          {[
            { test: "Ping proxy", result: "8ms", ok: true },
            { test: "DNS resolution", result: "3ms", ok: true },
            { test: "TLS cert", result: "Valid", ok: true },
            { test: "Port 443", result: "Open", ok: true },
            { test: "Port 8080", result: "Open", ok: true },
            { test: "IPv6", result: "N/A", ok: false },
          ].map(({ test, result, ok }) => (
            <div key={test} className="flex items-center justify-between bg-secondary/20 rounded-lg px-3 py-2.5 border border-border/30">
              <span className="text-[10px] text-muted-foreground">{test}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-foreground font-mono">{result}</span>
                <div className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const renderSettings = () => (
    <div className="space-y-4">
      <div className="animate-fade-in-up">
        <h1 className="text-lg font-semibold text-foreground">Configuración</h1>
        <p className="text-xs text-muted-foreground">Ajustes y más</p>
      </div>

      {settingsSection === null ? (
        <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          {settingsSections.map(({ id, icon: Icon, title }) => (
            <button
              key={id}
              onClick={() => setSettingsSection(id)}
              className="w-full glass-card p-3.5 flex items-center justify-between hover:bg-card/90 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/50 border border-border/30 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-foreground font-medium">{title}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : (
        <div className="animate-fade-in-up">
          <button
            onClick={() => setSettingsSection(null)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 hover:text-foreground transition-colors active:scale-95"
          >
            <ChevronRight className="w-3 h-3 rotate-180" />
            Volver
          </button>
          <div className="glass-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              {settingsSections.find(s => s.id === settingsSection)?.title}
            </h2>
            {settingsSections.find(s => s.id === settingsSection)?.content}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen pb-20">
      <VideoBackground />
      <div className="relative z-10 max-w-sm mx-auto px-4 pt-6">
        {activeTab === "home" && renderHome()}
        {activeTab === "servers" && renderServers()}
        {activeTab === "settings" && renderSettings()}
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-sm mx-auto">
          <div className="bg-card/95 backdrop-blur-xl border-t border-border/50 flex items-center justify-around py-2 px-4">
            <button onClick={() => { setActiveTab("home"); setSettingsSection(null); }} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 active:scale-95 transition-all">
              <Home className={`w-5 h-5 ${activeTab === "home" ? "text-foreground" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-medium ${activeTab === "home" ? "text-foreground" : "text-muted-foreground"}`}>Inicio</span>
              {activeTab === "home" && <div className="w-4 h-0.5 rounded-full bg-foreground mt-0.5" />}
            </button>
            <button onClick={() => { setActiveTab("servers"); setSettingsSection(null); }} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 active:scale-95 transition-all">
              <Globe className={`w-5 h-5 ${activeTab === "servers" ? "text-foreground" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-medium ${activeTab === "servers" ? "text-foreground" : "text-muted-foreground"}`}>Servidores</span>
              {activeTab === "servers" && <div className="w-4 h-0.5 rounded-full bg-foreground mt-0.5" />}
            </button>
            <button onClick={() => { setActiveTab("settings"); setSettingsSection(null); }} className="flex-1 flex flex-col items-center gap-0.5 py-1.5 active:scale-95 transition-all">
              <Settings className={`w-5 h-5 ${activeTab === "settings" ? "text-foreground" : "text-muted-foreground"}`} />
              <span className={`text-[9px] font-medium ${activeTab === "settings" ? "text-foreground" : "text-muted-foreground"}`}>Ajustes</span>
              {activeTab === "settings" && <div className="w-4 h-0.5 rounded-full bg-foreground mt-0.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProxyConfig;
