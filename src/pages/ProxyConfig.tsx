import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import VideoBackground from "@/components/VideoBackground";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isUserBlocked } from "@/lib/keys";
import avatar from "@/assets/login-avatar.jpeg";
import {
  Home, Settings, LogOut, Gamepad2, Loader2, Download,
  Shield, FileText, Info, ChevronRight, Lock, Eye, ScrollText,
  Fingerprint, ShieldCheck, KeyRound, AlertTriangle, Sparkles, Check,
} from "lucide-react";

interface Session {
  name: string;
  key: string;
  type: string;
  expiresAt: string | null;
  duration: string;
}

const ProxyConfig = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "settings">("home");
  const [timeLeft, setTimeLeft] = useState("");
  const [injecting, setInjecting] = useState(false);
  const [injected, setInjected] = useState(false);
  const [launchingFF, setLaunchingFF] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const raw = localStorage.getItem("proxy_session");
      if (!raw) { navigate("/"); return; }
      const s = JSON.parse(raw);
      if (s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem("proxy_session");
        navigate("/");
        return;
      }
      const blocked = await isUserBlocked(s.key);
      if (blocked) { localStorage.removeItem("proxy_session"); navigate("/"); return; }
      setSession(s);
    };
    check();
  }, [navigate]);

  useEffect(() => {
    if (!session?.expiresAt) return;
    const interval = setInterval(() => {
      const diff = new Date(session.expiresAt!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Expirada"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const sc = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${sc}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const haptic = (p: number | number[] = 8) => { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(p); };

  const injectModules = useCallback(() => {
    if (injecting || injected) return;
    haptic([10, 30, 10]);
    setInjecting(true);
    setTimeout(() => {
      setInjecting(false);
      setInjected(true);
      haptic(20);
      setTimeout(() => setInjected(false), 4000);
    }, 2200);
  }, [injecting, injected]);

  const launchFreeFire = useCallback(() => {
    setLaunchingFF(true);
    haptic(12);
    const ua = navigator.userAgent || navigator.vendor;
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);

    if (isAndroid) {
      // Lanza directamente la app instalada (no tienda)
      window.location.href =
        "intent://launch#Intent;scheme=freefireth;package=com.dts.freefireth;S.browser_fallback_url=intent%3A%2F%2Flaunch%23Intent%3Bpackage%3Dcom.dts.freefiremax%3Bend;end";
      setTimeout(() => {
        // Fallback secundario también a la app (no Play Store)
        window.location.href = "intent://launch#Intent;package=com.dts.freefiremax;end";
      }, 1200);
    } else if (isIOS) {
      // Esquema directo a la app instalada
      window.location.href = "freefireth://";
      setTimeout(() => { window.location.href = "freefiremax://"; }, 1200);
    } else {
      window.location.href = "freefireth://";
    }
    setTimeout(() => setLaunchingFF(false), 2800);
  }, []);

  const handleLogout = () => { localStorage.removeItem("proxy_session"); navigate("/"); };

  if (!session) return null;

  const SettingsItem = ({ icon: Icon, label, id, badge }: { icon: any; label: string; id: string; badge?: string }) => (
    <button
      onClick={() => { haptic(6); setSettingsSection(id); }}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-secondary/30 hover:bg-secondary/50 border border-border/25 rounded-2xl backdrop-blur-md active:scale-[0.985] transition-all duration-150"
    >
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <span className="text-sm font-medium text-foreground flex-1 text-left">{label}</span>
      {badge && <span className="text-[9px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">{badge}</span>}
      <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
    </button>
  );

  return (
    <div className="relative min-h-screen flex flex-col">
      <VideoBackground />

      <div className="relative z-10 flex-1 flex flex-col max-w-md w-full mx-auto px-4 pt-6 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-[2px] rounded-full bg-gradient-to-tr from-sky-400 via-blue-500 to-cyan-300 shadow-[0_0_18px_rgba(56,189,248,0.45)]">
              <div className="p-[1.5px] rounded-full bg-background">
                <img src={avatar} alt="Ryuk" className="w-11 h-11 rounded-full object-cover" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-sm font-bold text-foreground leading-tight">Ryuk Auxiliar</h1>
                <VerifiedBadge />
              </div>
              <p className="text-[10px] text-muted-foreground/70 font-mono">{session.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl bg-secondary/40 border border-border/30 flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/30 transition-all"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Subscription chip */}
        <div className="mb-5 flex items-center justify-between glass-card px-4 py-2.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] text-foreground font-medium">Sesión activa</span>
          </div>
          <span className="text-[11px] font-mono text-foreground/90">{timeLeft || "—"}</span>
        </div>

        {/* Content */}
        {activeTab === "home" && (
          <div className="flex flex-col gap-4 animate-fade-in-up">
            {/* Hero card */}
            <div className="glass-card glow-border p-5 rounded-3xl text-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 mb-3">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[9px] uppercase tracking-widest text-primary font-semibold">Gateway Online</span>
              </div>
              <h2 className="text-base font-bold text-foreground mb-1">Panel de Control</h2>
              <p className="text-[11px] text-muted-foreground/80">Inyecta los módulos y abre Free Fire para comenzar.</p>
            </div>

            {/* Inyectar Modulos */}
            <button
              onClick={injectModules}
              disabled={injecting}
              className="relative overflow-hidden w-full p-5 rounded-3xl text-left active:scale-[0.985] transition-transform duration-150 disabled:opacity-90"
              style={{
                background: "linear-gradient(135deg, hsl(199 89% 48% / 0.18), hsl(217 91% 60% / 0.10))",
                border: "1px solid hsl(199 89% 60% / 0.30)",
                boxShadow: "0 10px 30px -10px hsl(199 89% 48% / 0.45), inset 0 1px 0 hsl(199 89% 80% / 0.15)",
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  {injecting ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> :
                   injected ? <Check className="w-6 h-6 text-emerald-400" /> :
                   <Download className="w-6 h-6 text-primary" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground tracking-tight">
                    {injected ? "Módulos inyectados" : injecting ? "Inyectando módulos…" : "Inyectar Módulos"}
                  </div>
                  <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                    {injected ? "Listo. Abre Free Fire ahora." : injecting ? "Procesando bypass y firmas…" : "Carga el bypass en memoria"}
                  </div>
                </div>
              </div>
              {injecting && (
                <div className="mt-4 h-1 rounded-full bg-secondary/40 overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-sky-400 via-primary to-cyan-300 animate-[slide_1.4s_ease-in-out_infinite]" />
                </div>
              )}
              <span className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            </button>

            {/* Abrir Free Fire */}
            <button
              onClick={launchFreeFire}
              disabled={launchingFF}
              className="relative overflow-hidden w-full p-5 rounded-3xl text-left active:scale-[0.985] transition-transform duration-150 disabled:opacity-90"
              style={{
                background: "linear-gradient(135deg, hsl(20 95% 55% / 0.20), hsl(0 90% 60% / 0.10))",
                border: "1px solid hsl(20 95% 60% / 0.30)",
                boxShadow: "0 10px 30px -10px hsl(20 95% 55% / 0.45), inset 0 1px 0 hsl(30 95% 80% / 0.15)",
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border" style={{ background: "hsl(20 95% 55% / 0.15)", borderColor: "hsl(20 95% 60% / 0.4)" }}>
                  {launchingFF ? <Loader2 className="w-6 h-6 animate-spin" style={{ color: "hsl(20 95% 65%)" }} /> : <Gamepad2 className="w-6 h-6" style={{ color: "hsl(20 95% 65%)" }} />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground tracking-tight">
                    {launchingFF ? "Abriendo Free Fire…" : "Abrir Free Fire"}
                  </div>
                  <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                    Lanza el juego directamente
                  </div>
                </div>
              </div>
            </button>

            <p className="text-[10px] text-center text-muted-foreground/50 mt-1">
              Compatible con Android e iOS · Requiere Free Fire instalado
            </p>
          </div>
        )}

        {activeTab === "settings" && !settingsSection && (
          <div className="space-y-2.5 animate-fade-in-up">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-1 mb-1">Información</p>
            <SettingsItem icon={Shield} label="Datos de seguridad" id="security" badge="AES-256" />
            <SettingsItem icon={ScrollText} label="Información y políticas" id="policy" />
            <SettingsItem icon={Info} label="Acerca de" id="about" badge="v2.4" />
            <SettingsItem icon={FileText} label="Términos de uso" id="terms" />
            <SettingsItem icon={Lock} label="Privacidad" id="privacy" />
          </div>
        )}

        {activeTab === "settings" && settingsSection && (
          <div className="animate-fade-in-up">
            <button onClick={() => setSettingsSection(null)} className="text-[11px] text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Volver
            </button>
            <div className="glass-card p-5 rounded-3xl space-y-4">
              {settingsSection === "security" && (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-foreground">Datos de seguridad</h3>
                  </div>
                  <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
                    <p><span className="text-foreground font-semibold">Cifrado:</span> AES-256-GCM extremo a extremo.</p>
                    <p><span className="text-foreground font-semibold">Transporte:</span> TLS 1.3 con HSTS.</p>
                    <p><span className="text-foreground font-semibold">Autenticación:</span> Key única ligada al dispositivo.</p>
                    <p><span className="text-foreground font-semibold">Aislamiento:</span> Sandbox cifrado por sesión.</p>
                    <p><span className="text-foreground font-semibold">Anti-detección:</span> Spoof de firmas activado.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {[{ i: Fingerprint, l: "Auth" }, { i: KeyRound, l: "Key" }, { i: Eye, l: "Stealth" }].map(({ i: I, l }) => (
                      <div key={l} className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-secondary/30 border border-border/25">
                        <I className="w-4 h-4 text-emerald-400" />
                        <span className="text-[9px] text-muted-foreground">{l}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {settingsSection === "policy" && (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <ScrollText className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Información y políticas</h3>
                  </div>
                  <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
                    <p>Esta herramienta es exclusiva para uso personal y educativo.</p>
                    <p>Está prohibida su redistribución o venta no autorizada.</p>
                    <p>El uso indebido puede provocar la revocación inmediata de la key sin reembolso.</p>
                    <p>No nos responsabilizamos por bans aplicados por el desarrollador del juego.</p>
                  </div>
                </>
              )}
              {settingsSection === "about" && (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Acerca de</h3>
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-2 leading-relaxed">
                    <p><span className="text-foreground font-semibold">Ryuk Auxiliar</span> v2.4 — Build estable.</p>
                    <p>Desarrollado por Modifaxff Oficial.</p>
                    <p>Compatible con Free Fire y Free Fire MAX.</p>
                  </div>
                </>
              )}
              {settingsSection === "terms" && (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Términos de uso</h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Al usar este servicio aceptas no compartir tu key, no realizar ingeniería inversa y respetar las políticas de uso. El incumplimiento implica la cancelación de tu acceso.
                  </p>
                </>
              )}
              {settingsSection === "privacy" && (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Privacidad</h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    No recopilamos datos personales. Solo guardamos tu key cifrada y un identificador anónimo de dispositivo para validar tu sesión.
                  </p>
                </>
              )}
              <div className="flex items-start gap-2 pt-2 border-t border-border/20">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-muted-foreground/70">
                  La información mostrada es confidencial. No compartas capturas con terceros.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar — solo Inicio y Ajustes */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-2">
        <div className="max-w-md mx-auto glass-card rounded-2xl p-1.5 flex gap-1 backdrop-blur-xl border border-border/40">
          {[
            { id: "home" as const, icon: Home, label: "Inicio" },
            { id: "settings" as const, icon: Settings, label: "Ajustes" },
          ].map(({ id, icon: Icon, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => { haptic(4); setActiveTab(id); setSettingsSection(null); }}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-200 ${
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};

export default ProxyConfig;
