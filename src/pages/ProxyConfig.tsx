import { useState, useEffect, useCallback, useRef } from "react";
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
  Bolt, Flame, Radar, ScanLine, Layers, BarChart3,
  Rocket, Timer, RefreshCw, Sparkles, Fingerprint, ShieldCheck,
  Database, Network, Bug, Unplug, Ratio, MonitorSmartphone,
  CircuitBoard, Binary, Webhook, Milestone, Scan, ShieldAlert,
  Orbit, Waypoints
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

const SECURITY_ITEMS = [
  "Anti-Cheat Nullifier", "Signature Randomizer", "Runtime Decryptor",
  "Stack Canary Spoof", "ASLR Bypass Engine", "Integrity Check Hook",
  "Heartbeat Emulator", "Binary Obfuscator", "Sandbox Escape",
  "Token Forge Engine", "Certificate Pinning", "Syscall Filter",
  "Entropy Randomizer", "Hook Detection Shield", "Debugger Trap Evasion",
  "Code Signing Spoof", "Rootkit Cloak", "Telemetry Blocker",
  "Memory Guard", "Zero-Day Vault",
];

const SecurityToggles = () => {
  const [states, setStates] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("proxy_security_toggles");
    return saved ? JSON.parse(saved) : {};
  });
  const [pressing, setPressing] = useState<string | null>(null);
  const haptic = () => { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([5, 2, 5]); };
  const toggle = (label: string) => {
    const next = { ...states, [label]: !states[label] };
    setStates(next);
    localStorage.setItem("proxy_security_toggles", JSON.stringify(next));
    haptic();
  };
  return (
    <div className="space-y-2">
      {SECURITY_ITEMS.map((label) => (
         <div key={label} className={`flex items-center justify-between rounded-2xl px-3.5 py-3 border backdrop-blur-md ${states[label] ? "bg-primary/10 border-primary/25" : "bg-secondary/20 border-border/25"}`} style={{ transition: "background 260ms cubic-bezier(0.32, 0.72, 0, 1), border-color 260ms cubic-bezier(0.32, 0.72, 0, 1), transform 120ms ease-out", transform: pressing === label ? "scale(0.985)" : "scale(1)" }}>
           <span className={`text-[11px] font-medium ${states[label] ? "text-foreground" : "text-muted-foreground"}`} style={{ transition: "color 260ms cubic-bezier(0.32, 0.72, 0, 1)" }}>{label}</span>
           <button
             onClick={() => toggle(label)}
             onPointerDown={() => setPressing(label)}
             onPointerUp={() => setPressing(null)}
             onPointerLeave={() => setPressing(null)}
             role="switch"
             aria-checked={states[label]}
             className={`relative w-[46px] h-[27px] rounded-full flex-shrink-0 ${states[label] ? "bg-emerald-500" : "bg-secondary border border-border/40"}`}
             style={{ transition: "background-color 260ms cubic-bezier(0.32, 0.72, 0, 1)" }}
           >
             <span
               className="absolute top-[2px] left-[2px] w-[23px] h-[23px] rounded-full bg-white"
               style={{
                 transform: states[label] ? "translateX(19px)" : "translateX(0)",
                 transition: "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                 boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                 willChange: "transform",
               }}
             />
           </button>
        </div>
      ))}
    </div>
  );
};

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
  const [spinEnabled, setSpinEnabledRaw] = useState(() => loadToggle("360spin", false));
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
  const setSpinEnabled = persistToggle("360spin", setSpinEnabledRaw);
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

  const launchFreeFire = useCallback(() => {
    setLaunchingFF(true); setFfStatus("Abriendo...");
    const ua = navigator.userAgent || navigator.vendor;
    if (/android/i.test(ua)) {
      window.location.href = "intent://#Intent;package=com.dts.freefireth;end";
      setTimeout(() => {
        window.location.href = "https://play.google.com/store/apps/details?id=com.dts.freefireth";
      }, 2000);
    } else {
      window.location.href = "https://apps.apple.com/app/id1300146617";
    }
    setTimeout(() => { setLaunchingFF(false); setFfStatus(""); }, 3000);
  }, []);

  const handleLogout = () => { localStorage.removeItem("proxy_session"); navigate("/"); };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 1500);
  };

  if (!session) return null;

  // Animated Toggle — iOS-style smooth spring
  const AnimatedToggle = ({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: boolean; onChange: (v: boolean) => void }) => {
    const [pressing, setPressing] = useState(false);
    const haptic = () => { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([6, 2, 6]); };
    return (
      <div
        className={`flex items-center justify-between rounded-2xl px-4 py-3.5 border backdrop-blur-md ${
          value ? "bg-primary/10 border-primary/30" : "bg-secondary/30 border-border/20"
        }`}
        style={{ transition: "background 260ms cubic-bezier(0.32, 0.72, 0, 1), border-color 260ms cubic-bezier(0.32, 0.72, 0, 1), transform 120ms ease-out", transform: pressing ? "scale(0.985)" : "scale(1)" }}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-xl ${value ? "bg-primary/15 text-primary" : "bg-secondary/50 text-muted-foreground"}`} style={{ transition: "all 260ms cubic-bezier(0.32, 0.72, 0, 1)" }}>
            {icon}
          </div>
          <span className={`text-sm font-medium ${value ? "text-foreground" : "text-muted-foreground"}`} style={{ transition: "color 260ms cubic-bezier(0.32, 0.72, 0, 1)" }}>{label}</span>
        </div>
        <button
          onClick={() => { haptic(); onChange(!value); }}
          onPointerDown={() => setPressing(true)}
          onPointerUp={() => setPressing(false)}
          onPointerLeave={() => setPressing(false)}
          role="switch"
          aria-checked={value}
          className={`relative w-[52px] h-[31px] rounded-full flex-shrink-0 ${
            value ? "bg-emerald-500" : "bg-secondary border border-border/40"
          }`}
          style={{ transition: "background-color 260ms cubic-bezier(0.32, 0.72, 0, 1)" }}
        >
          <span
            className="absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white"
            style={{
              transform: value ? "translateX(21px)" : "translateX(0)",
              transition: "transform 340ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              boxShadow: "0 3px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.2)",
              willChange: "transform",
            }}
          />
        </button>
      </div>
    );
  };

  // FOV Slider — ULTRA fluido: uncontrolled + ref + CSS var, sin re-render durante arrastre
  const FovSlider = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLSpanElement>(null);
    const rafRef = useRef<number | null>(null);
    const lastHapticRef = useRef<number>(-1);

    const haptic = (pattern: number | number[] = 5) => { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern); };

    const apply = (v: number) => {
      const pct = ((v - 40) / 260) * 100;
      if (trackRef.current) trackRef.current.style.setProperty("--fill", `${pct}%`);
      if (labelRef.current) labelRef.current.textContent = `${v}px`;
      // Light haptic at milestones
      const milestones = [40, 80, 120, 160, 200, 240, 300];
      const closest = milestones.reduce((p, c) => Math.abs(c - v) < Math.abs(p - v) ? c : p);
      if (Math.abs(v - closest) < 4 && lastHapticRef.current !== closest) {
        lastHapticRef.current = closest;
        haptic(3);
      }
    };

    const release = (v: number) => { haptic(6); onChange(v); };

    return (
      <div ref={trackRef} className="rounded-2xl px-4 py-3 bg-secondary/20 border border-border/20 backdrop-blur-md" style={{ ["--fill" as any]: `${((value - 40) / 260) * 100}%` }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground font-medium">Tamaño de FOV</span>
          <span ref={labelRef} className="text-xs text-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded-md">{value}px</span>
        </div>
        <input
          ref={inputRef}
          type="range"
          min={40}
          max={300}
          defaultValue={value}
          onInput={(e) => {
            const v = Number((e.target as HTMLInputElement).value);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => apply(v));
          }}
          onPointerUp={(e) => release(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => release(Number((e.target as HTMLInputElement).value))}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider-fluid"
          style={{
            background: "linear-gradient(to right, hsl(var(--primary)) var(--fill), hsl(var(--secondary)) var(--fill))",
            touchAction: "none",
          }}
        />
      </div>
    );
  };

  // Performance Slider — ultra fluido (uncontrolled + rAF + CSS var)
  const PerfSlider = ({ label, icon, value, onChange, unit = "%" }: { label: string; icon: React.ReactNode; value: number; onChange: (v: number) => void; unit?: string }) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLSpanElement>(null);
    const rafRef = useRef<number | null>(null);
    const lastHapticRef = useRef<number>(-1);
    const haptic = (pattern: number | number[] = 5) => { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern); };
    const apply = (v: number) => {
      if (wrapRef.current) wrapRef.current.style.setProperty("--fill", `${v}%`);
      if (labelRef.current) labelRef.current.textContent = `${v}${unit}`;
      // Light haptic at milestones
      const milestones = [0, 25, 50, 75, 100];
      const closest = milestones.reduce((p, c) => Math.abs(c - v) < Math.abs(p - v) ? c : p);
      if (Math.abs(v - closest) < 3 && lastHapticRef.current !== closest) {
        lastHapticRef.current = closest;
        haptic(3);
      }
    };
    const release = (v: number) => { haptic(6); onChange(v); };
    return (
      <div ref={wrapRef} className="rounded-2xl px-4 py-3 bg-secondary/20 border border-border/20 backdrop-blur-md" style={{ ["--fill" as any]: `${value}%` }}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
          </div>
          <span ref={labelRef} className="text-xs text-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded-md">{value}{unit}</span>
        </div>
        <input
          type="range" min={0} max={100} defaultValue={value}
          onInput={(e) => {
            const v = Number((e.target as HTMLInputElement).value);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => apply(v));
          }}
          onPointerUp={(e) => release(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => release(Number((e.target as HTMLInputElement).value))}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer slider-fluid"
          style={{ background: "linear-gradient(to right, hsl(var(--primary)) var(--fill), hsl(var(--secondary)) var(--fill))", touchAction: "none" }}
        />
      </div>
    );
  };

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
        <AnimatedToggle label="360 Spin" icon={<Orbit className="w-4 h-4" />} value={spinEnabled} onChange={setSpinEnabled} />
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
      id: "security-integrations",
      icon: ShieldCheck,
      title: "Datos de seguridad",
      content: <SecurityToggles />,
    },
    {
      id: "terms",
      icon: FileText,
      title: "Políticas",
      content: (
        <div className="space-y-3">
          {[
            { t: "1. Uso Aceptable", p: "El servicio está destinado para uso personal y legítimo. Queda prohibido cualquier uso ilegal o que infrinja términos de terceros." },
            { t: "2. Keys", p: "Las keys son personales e intransferibles. Compartirlas resulta en suspensión inmediata sin reembolso." },
            { t: "3. Disponibilidad", p: "Servicio proporcionado 'tal cual'. No garantizamos 100% de disponibilidad ni resultados específicos." },
            { t: "4. Privacidad", p: "No almacenamos registros de navegación. Solo datos mínimos de sesión para gestionar el acceso." },
          ].map(({ t, p }) => (
            <div key={t} className="bg-secondary/20 rounded-2xl p-3.5 border border-border/25 backdrop-blur-md">
              <h3 className="text-xs font-semibold text-foreground mb-1">{t}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "developer",
      icon: Code,
      title: "Creador",
      content: (
        <div className="space-y-3">
          <div className="flex flex-col items-center text-center py-3">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border/50 mb-3">
              <img src={defaultAvatar} alt="Creador" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-semibold text-foreground">Modifaxff Oficial</h3>
              <VerifiedBadge className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Desarrollador y Creador</p>
          </div>
          <a
            href="https://whatsapp.com/channel/0029VbC678PIyPtc7iERCH2R"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-emerald-500/10 border border-emerald-500/25 rounded-2xl px-4 py-3 text-center backdrop-blur-md active:scale-[0.98] transition-transform"
          >
            <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider mb-0.5">Canal Oficial</p>
            <p className="text-xs text-emerald-300 font-medium">WhatsApp · Modifaxff</p>
          </a>
        </div>
      ),
    },
    {
      id: "how-modules-work",
      icon: Cpu,
      title: "Cómo funcionan los módulos",
      content: (
        <div className="space-y-3">
          {[
            { t: "Combat Modules", p: "Optimizan apuntado, retroceso y movimiento. Activa solo los que necesites para mejorar precisión y respuesta en partida." },
            { t: "Field of View", p: "El overlay de FOV te ayuda a calibrar tu zona central de visión. Ajusta el tamaño con el deslizador para que se sienta natural." },
            { t: "Performance Tuning", p: "Controla suavidad de apuntado, ritmo de disparo y sensibilidad. Valores bajos = más estables, valores altos = más reactivos." },
            { t: "Memory & Protection", p: "Memory Patcher y Anti-Ban Shield protegen la sesión y evitan detecciones durante el uso." },
            { t: "Stealth & Evasion", p: "Root Cloak, Packet Spoofer y Process Hider ocultan trazas del sistema para mantener la conexión limpia." },
            { t: "Injection Engine", p: "DEX Injector, SSL Bypass y HWID Spoofer permiten cargar parches y evitar bloqueos por dispositivo." },
            { t: "Runtime Tuning", p: "Ajusta memoria, prioridad de hilos y delay de inyección. Valores moderados ofrecen el mejor balance." },
            { t: "Recomendación", p: "Activa los módulos uno a uno y prueba en partida. No es necesario activar todo al mismo tiempo." },
          ].map(({ t, p }) => (
            <div key={t} className="bg-secondary/20 rounded-2xl p-3.5 border border-border/25 backdrop-blur-md">
              <h3 className="text-xs font-semibold text-foreground mb-1">{t}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{p}</p>
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
        <div className="rounded-2xl bg-card/70 border border-border/40 backdrop-blur-xl overflow-hidden animate-fade-in-up shadow-xl" style={{ animationDelay: "0.05s" }}>
          {settingsSections.map(({ id, icon: Icon, title }, idx) => (
            <button
              key={id}
              onClick={() => setSettingsSection(id)}
              className={`w-full px-4 py-3.5 flex items-center justify-between active:bg-secondary/40 transition-colors ${idx !== settingsSections.length - 1 ? "border-b border-border/30" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-secondary/60 border border-border/30 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-foreground/80" />
                </div>
                <span className="text-sm text-foreground font-medium">{title}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/70" />
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
          <div className="rounded-2xl bg-card/70 border border-border/40 backdrop-blur-xl p-4 shadow-xl">
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
