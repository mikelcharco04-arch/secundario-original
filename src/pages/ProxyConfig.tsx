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

// Server modules replaced with advanced exploit modules

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

  // Game toggles - persisted in localStorage
  const loadToggle = (key: string, def: boolean) => {
    const v = localStorage.getItem(`proxy_toggle_${key}`);
    return v !== null ? v === "true" : def;
  };
  const loadSlider = (key: string, def: number) => {
    const v = localStorage.getItem(`proxy_slider_${key}`);
    return v !== null ? Number(v) : def;
  };

  const [noRecoil, setNoRecoilRaw] = useState(() => loadToggle("noRecoil", false));
  const [autoAim, setAutoAimRaw] = useState(() => loadToggle("autoAim", false));
  const [fovEnabled, setFovEnabledRaw] = useState(() => loadToggle("fov", false));
  const [fovSize, setFovSizeRaw] = useState(() => loadSlider("fovSize", 120));
  const [speedHack, setSpeedHackRaw] = useState(() => loadToggle("speedHack", false));
  const [wallHack, setWallHackRaw] = useState(() => loadToggle("wallHack", false));
  // Performance sliders
  const [aimSmooth, setAimSmoothRaw] = useState(() => loadSlider("aimSmooth", 50));
  const [fireRate, setFireRateRaw] = useState(() => loadSlider("fireRate", 30));
  const [sensitivity, setSensitivityRaw] = useState(() => loadSlider("sensitivity", 60));

  // Server tab modules - persisted
  const [memoryPatcher, setMemoryPatcherRaw] = useState(() => loadToggle("memoryPatcher", false));
  const [antiBan, setAntiBanRaw] = useState(() => loadToggle("antiBan", false));
  const [kernelBypass, setKernelBypassRaw] = useState(() => loadToggle("kernelBypass", false));
  const [rootCloak, setRootCloakRaw] = useState(() => loadToggle("rootCloak", false));
  const [packetSpoof, setPacketSpoofRaw] = useState(() => loadToggle("packetSpoof", false));
  const [dexInjector, setDexInjectorRaw] = useState(() => loadToggle("dexInjector", false));
  const [sslPinning, setSslPinningRaw] = useState(() => loadToggle("sslPinning", false));
  const [hwIdSpoof, setHwIdSpoofRaw] = useState(() => loadToggle("hwIdSpoof", false));
  const [procHider, setProcHiderRaw] = useState(() => loadToggle("procHider", false));
  // Server sliders - persisted
  const [heapAlloc, setHeapAllocRaw] = useState(() => loadSlider("heapAlloc", 40));
  const [threadPriority, setThreadPriorityRaw] = useState(() => loadSlider("threadPriority", 50));
  const [injectionDelay, setInjectionDelayRaw] = useState(() => loadSlider("injectionDelay", 20));

  // Wrapper setters that persist
  const persistToggle = (key: string, setter: (v: boolean) => void) => (v: boolean) => { localStorage.setItem(`proxy_toggle_${key}`, String(v)); setter(v); };
  const persistSlider = (key: string, setter: (v: number) => void) => (v: number) => { localStorage.setItem(`proxy_slider_${key}`, String(v)); setter(v); };

  const setNoRecoil = persistToggle("noRecoil", setNoRecoilRaw);
  const setAutoAim = persistToggle("autoAim", setAutoAimRaw);
  const setFovEnabled = persistToggle("fov", setFovEnabledRaw);
  const setFovSize = persistSlider("fovSize", setFovSizeRaw);
  const setSpeedHack = persistToggle("speedHack", setSpeedHackRaw);
  const setWallHack = persistToggle("wallHack", setWallHackRaw);
  const setAimSmooth = persistSlider("aimSmooth", setAimSmoothRaw);
  const setFireRate = persistSlider("fireRate", setFireRateRaw);
  const setSensitivity = persistSlider("sensitivity", setSensitivityRaw);
  const setMemoryPatcher = persistToggle("memoryPatcher", setMemoryPatcherRaw);
  const setAntiBan = persistToggle("antiBan", setAntiBanRaw);
  const setKernelBypass = persistToggle("kernelBypass", setKernelBypassRaw);
  const setRootCloak = persistToggle("rootCloak", setRootCloakRaw);
  const setPacketSpoof = persistToggle("packetSpoof", setPacketSpoofRaw);
  const setDexInjector = persistToggle("dexInjector", setDexInjectorRaw);
  const setSslPinning = persistToggle("sslPinning", setSslPinningRaw);
  const setHwIdSpoof = persistToggle("hwIdSpoof", setHwIdSpoofRaw);
  const setProcHider = persistToggle("procHider", setProcHiderRaw);
  const setHeapAlloc = persistSlider("heapAlloc", setHeapAllocRaw);
  const setThreadPriority = persistSlider("threadPriority", setThreadPriorityRaw);
  const setInjectionDelay = persistSlider("injectionDelay", setInjectionDelayRaw);

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
          touchAction: "none",
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
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${value}%, hsl(var(--secondary)) ${value}%)`, touchAction: "none" }}
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
        <h1 className="text-lg font-semibold text-foreground">Módulos Avanzados</h1>
        <p className="text-xs text-muted-foreground">Exploit Engine v3.8 — Runtime Patches</p>
      </div>

      {/* Memory & Protection */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-1">
          <Cpu className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Memory & Protection</span>
        </div>
        <AnimatedToggle label="Memory Patcher" icon={<HardDrive className="w-4 h-4" />} value={memoryPatcher} onChange={setMemoryPatcher} />
        <AnimatedToggle label="Anti-Ban Shield" icon={<Shield className="w-4 h-4" />} value={antiBan} onChange={setAntiBan} />
        <AnimatedToggle label="Kernel Bypass" icon={<Cpu className="w-4 h-4" />} value={kernelBypass} onChange={setKernelBypass} />
      </div>

      {/* Stealth & Evasion */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-1">
          <Ghost className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Stealth & Evasion</span>
        </div>
        <AnimatedToggle label="Root Cloak" icon={<Lock className="w-4 h-4" />} value={rootCloak} onChange={setRootCloak} />
        <AnimatedToggle label="Packet Spoofer" icon={<Radio className="w-4 h-4" />} value={packetSpoof} onChange={setPacketSpoof} />
        <AnimatedToggle label="Process Hider" icon={<Eye className="w-4 h-4" />} value={procHider} onChange={setProcHider} />
      </div>

      {/* Injection Engine */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-1">
          <Code className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Injection Engine</span>
        </div>
        <AnimatedToggle label="DEX Injector" icon={<Layers className="w-4 h-4" />} value={dexInjector} onChange={setDexInjector} />
        <AnimatedToggle label="SSL Pinning Bypass" icon={<KeyRound className="w-4 h-4" />} value={sslPinning} onChange={setSslPinning} />
        <AnimatedToggle label="HWID Spoofer" icon={<Server className="w-4 h-4" />} value={hwIdSpoof} onChange={setHwIdSpoof} />
      </div>

      {/* Runtime Tuning */}
      <div className="glass-card p-4 animate-fade-in-up space-y-3" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-1">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Runtime Tuning</span>
        </div>
        <PerfSlider label="Heap Allocation" icon={<BarChart3 className="w-3.5 h-3.5" />} value={heapAlloc} onChange={setHeapAlloc} unit="MB" />
        <PerfSlider label="Thread Priority" icon={<Zap className="w-3.5 h-3.5" />} value={threadPriority} onChange={setThreadPriority} />
        <PerfSlider label="Injection Delay" icon={<Clock className="w-3.5 h-3.5" />} value={injectionDelay} onChange={setInjectionDelay} unit="ms" />
      </div>

      {/* Live Exploit Console */}
      <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
        <div className="flex items-center gap-2 pb-1 border-b border-border/20 mb-3">
          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Exploit Console</span>
        </div>
        <div className="bg-background/60 rounded-lg p-3 border border-border/30 font-mono text-[9px] space-y-1 max-h-36 overflow-y-auto">
          <p><span className="text-primary">exploit@kernel:~$</span> <span className="text-foreground/70">load --module anti_ban.ko</span></p>
          <p className="text-muted-foreground/60">[OK] Kernel module loaded @ ring0</p>
          <p><span className="text-primary">exploit@kernel:~$</span> <span className="text-foreground/70">patch mem 0x7FFA3B20 --nop</span></p>
          <p className="text-muted-foreground/60">[OK] 48 bytes patched — signature bypassed</p>
          <p><span className="text-primary">exploit@kernel:~$</span> <span className="text-foreground/70">spoof hwid --random</span></p>
          <p className="text-muted-foreground/60">[OK] HWID: A3F8-9C2D-7E1B-4F6A</p>
          <p><span className="text-primary">exploit@kernel:~$</span> <span className="text-foreground/70">cloak --pid self --depth 3</span></p>
          <p className="text-muted-foreground/60">[OK] Process hidden from 3 scanners</p>
          <p><span className="text-primary">exploit@kernel:~$</span> <span className="text-foreground/70 animate-pulse">_</span></p>
        </div>
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
              <span className={`text-[9px] font-medium ${activeTab === "servers" ? "text-foreground" : "text-muted-foreground"}`}>Módulos</span>
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
