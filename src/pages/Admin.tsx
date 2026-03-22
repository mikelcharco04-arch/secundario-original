import { useState, useEffect, useCallback } from "react";
import VideoBackground from "@/components/VideoBackground";
import {
  getKeys, generateKeys, deleteKey, type ProxyKey,
  getActiveUsers, blockUser, unblockUser, kickUser, deleteUser, reduceKeyTime, type ActiveUser
} from "@/lib/keys";
import {
  KeyRound, Plus, LogOut, Trash2, Copy, Check,
  Users, Ban, UserX, Clock, Terminal, Shield, Activity,
  Database, Minus, Hash, Zap, Eye, EyeOff, Wifi,
  Server, Globe, Signal, Power, ChevronRight, Lock
} from "lucide-react";

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"keys" | "users" | "generate" | "stats">("generate");

  const [keyType, setKeyType] = useState<"Normal" | "Premium">("Normal");
  const [duration, setDuration] = useState("7 días");
  const [quantity, setQuantity] = useState(1);
  const [keys, setKeys] = useState<ProxyKey[]>([]);
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    const [k, u] = await Promise.all([getKeys(), getActiveUsers()]);
    setKeys(k);
    setUsers(u);
  }, []);

  useEffect(() => {
    if (authenticated) {
      refreshData();
      const interval = setInterval(refreshData, 3000);
      return () => clearInterval(interval);
    }
  }, [authenticated, refreshData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "117") {
      setAuthenticated(true);
    } else {
      setError("Acceso denegado");
    }
  };

  const handleGenerate = async () => {
    await generateKeys(quantity, keyType, duration);
    await refreshData();
    setActiveTab("keys");
  };

  const handleDelete = async (key: string) => {
    await deleteKey(key);
    await refreshData();
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleBlock = async (key: string) => { await blockUser(key); await refreshData(); };
  const handleUnblock = async (key: string) => { await unblockUser(key); await refreshData(); };
  const handleKick = async (key: string) => { await kickUser(key); await refreshData(); };
  const handleDeleteUser = async (key: string) => { await deleteUser(key); await refreshData(); };
  const handleReduceTime = async (key: string, hours: number) => {
    await reduceKeyTime(key, hours * 3600000);
    await refreshData();
  };

  const durations = ["1 minuto", "1 día", "7 días", "30 días"];

  const statusColor = (s: string) => {
    if (s === "Activa") return "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20";
    if (s === "Usada") return "text-amber-400 bg-amber-400/10 border border-amber-400/20";
    if (s === "Bloqueada") return "text-red-400 bg-red-400/10 border border-red-400/20";
    return "text-neutral-500 bg-neutral-500/10 border border-neutral-500/20";
  };

  const statusIcon = (s: string) => {
    if (s === "Activa") return "●";
    if (s === "Usada") return "◉";
    if (s === "Bloqueada") return "✕";
    return "○";
  };

  const stats = {
    total: keys.length,
    active: keys.filter(k => k.status === "Activa").length,
    used: keys.filter(k => k.status === "Usada").length,
    expired: keys.filter(k => k.status === "Expirada").length,
    online: users.filter(u => !u.blocked).length,
    blocked: users.filter(u => u.blocked).length,
  };

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expirada";
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (!authenticated) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
        <VideoBackground />
        <div className="relative z-10 w-full max-w-sm space-y-5">
          {/* Header branding */}
          <div className="text-center animate-fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-card/80 border border-border/50 flex items-center justify-center mx-auto mb-4 shadow-2xl">
              <Shield className="w-8 h-8 text-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Panel de Administración</h1>
            <p className="text-xs text-muted-foreground mt-1">Sistema de gestión de proxy y keys</p>
          </div>

          {/* Stats preview */}
          <div className="grid grid-cols-3 gap-2 animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
            {[
              { icon: KeyRound, label: "Keys", desc: "Generar y gestionar" },
              { icon: Users, label: "Usuarios", desc: "Control de acceso" },
              { icon: Activity, label: "Monitor", desc: "Estadísticas en vivo" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass-card p-3 text-center">
                <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-[11px] text-foreground font-medium">{label}</p>
                <p className="text-[8px] text-muted-foreground/60 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>

          {/* Login card */}
          <div className="glass-card p-6 glow-border animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center gap-2 mb-1">
              <Terminal className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-mono text-muted-foreground">admin@proxy:~$</span>
            </div>
            <p className="text-xs text-muted-foreground/60 mb-5 font-mono pl-7">authenticate --level=root</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="Contraseña de administrador"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all font-mono"
                />
              </div>
              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg p-3 font-mono">ERROR: {error}</p>
              )}
              <button type="submit" className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all font-mono">
                sudo access
              </button>
            </form>
          </div>

          {/* System info */}
          <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.22s" }}>
            <div className="space-y-2">
              {[
                { label: "Servidor", value: "Online", dot: true },
                { label: "Protocolo", value: "HTTPS/TLS 1.3" },
                { label: "Cifrado", value: "AES-256-GCM" },
                { label: "Versión", value: "v2.4.1" },
              ].map(({ label, value, dot }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono">{label}</span>
                  <div className="flex items-center gap-1.5">
                    {dot && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    <span className="text-[10px] text-foreground font-mono font-medium">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[9px] text-muted-foreground/40 font-mono animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            Acceso restringido — Solo personal autorizado
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-8">
      <VideoBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground font-mono">Admin Panel</h1>
              <p className="text-[10px] text-muted-foreground font-mono">root@proxy-server</p>
            </div>
          </div>
          <button onClick={() => setAuthenticated(false)} className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors active:scale-95">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          {[
            { label: "Total", value: stats.total, icon: Database },
            { label: "Activas", value: stats.active, icon: Zap },
            { label: "Usadas", value: stats.used, icon: Activity },
            { label: "Online", value: stats.online, icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass-card p-3 text-center">
              <Icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground font-mono">{value}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 mb-4 glass-card p-1 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {([
            { id: "generate", label: "Generar", icon: Plus },
            { id: "keys", label: "Keys", icon: KeyRound },
            { id: "users", label: "Usuarios", icon: Users },
            { id: "stats", label: "Monitor", icon: Signal },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] ${
                activeTab === id
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Generate Tab */}
        {activeTab === "generate" && (
          <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center gap-2 mb-5">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-mono font-medium">generate --keys</span>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block font-mono">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Normal", "Premium"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setKeyType(t)}
                      className={`py-3 rounded-lg text-xs font-medium transition-all active:scale-95 border ${
                        keyType === t
                          ? "bg-primary text-primary-foreground border-primary shadow-lg"
                          : "bg-secondary/30 text-muted-foreground border-border hover:border-ring"
                      }`}
                    >
                      {t === "Premium" && <Zap className="w-3 h-3 inline mr-1" />}
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block font-mono">Duración</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {durations.map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`py-2.5 rounded-lg text-[11px] font-medium transition-all active:scale-95 border ${
                        duration === d
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/30 text-muted-foreground border-border hover:border-ring"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 block font-mono">Cantidad</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 rounded-lg bg-secondary/50 border border-border text-foreground flex items-center justify-center active:scale-95 transition-all hover:border-ring"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 h-12 rounded-lg bg-secondary/30 border border-border flex items-center justify-center">
                    <span className="text-foreground font-bold text-xl font-mono">{quantity}</span>
                  </div>
                  <button
                    onClick={() => setQuantity(Math.min(100, quantity + 1))}
                    className="w-12 h-12 rounded-lg bg-secondary/50 border border-border text-foreground flex items-center justify-center active:scale-95 transition-all hover:border-ring"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                className="w-full bg-primary text-primary-foreground font-mono font-medium py-3.5 rounded-lg text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Hash className="w-4 h-4" />
                generate({quantity})
              </button>
            </div>
          </div>
        )}

        {/* Keys Tab - Grouped by Duration */}
        {activeTab === "keys" && (
          <div className="animate-fade-in-up space-y-3" style={{ animationDelay: "0.15s" }}>
            {/* Keys header */}
            <div className="glass-card p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono font-medium">Keys [{keys.length}]</span>
              </div>
              <div className="flex gap-1">
                {["Activa", "Usada", "Expirada"].map(s => (
                  <span key={s} className={`text-[9px] px-2 py-0.5 rounded-full font-mono ${statusColor(s)}`}>
                    {keys.filter(k => k.status === s).length}
                  </span>
                ))}
              </div>
            </div>

            {keys.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Database className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-mono mb-1">No keys found</p>
                <p className="text-[10px] text-muted-foreground/60">Genera keys desde la pestaña "Generar"</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-0.5 scrollbar-thin">
                {(["1 día", "7 días", "30 días"] as const).map(dur => {
                  const grouped = keys.filter(k => k.duration === dur);
                  if (grouped.length === 0) return null;
                  const unusedKeys = grouped.filter(k => k.status === "Activa");
                  const copyId = `all-${dur}`;
                  const handleCopyAll = () => {
                    if (unusedKeys.length === 0) return;
                    navigator.clipboard.writeText(unusedKeys.map(k => k.key).join("\n"));
                    setCopiedKey(copyId);
                    setTimeout(() => setCopiedKey(null), 2000);
                  };
                  return (
                    <div key={dur} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">{dur}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground font-mono border border-border/40">
                            {grouped.length}
                          </span>
                          {unusedKeys.length > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 font-mono border border-emerald-400/20">
                              {unusedKeys.length} libres
                            </span>
                          )}
                        </div>
                        {unusedKeys.length > 0 && (
                          <button
                            onClick={handleCopyAll}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-medium transition-all active:scale-95 border ${
                              copiedKey === copyId
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-400/30"
                                : "bg-secondary/50 text-muted-foreground border-border hover:border-ring hover:text-foreground"
                            }`}
                          >
                            {copiedKey === copyId ? <><Check className="w-3 h-3" /> Copiadas</> : <><Copy className="w-3 h-3" /> Copiar libres</>}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {grouped.map((k, i) => (
                          <div key={k.key} className="glass-card overflow-hidden animate-fade-in-up" style={{ animationDelay: `${0.03 * i}s` }}>
                            <div className={`h-0.5 w-full ${k.status === "Activa" ? "bg-emerald-500" : k.status === "Usada" ? "bg-amber-500" : k.status === "Bloqueada" ? "bg-red-500" : "bg-neutral-600"}`} />
                            <div className="p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-medium ${statusColor(k.status)}`}>{statusIcon(k.status)} {k.status}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono border ${k.type === "Premium" ? "text-amber-300 bg-amber-400/10 border-amber-400/20" : "text-muted-foreground bg-secondary/50 border-border"}`}>
                                    {k.type === "Premium" && <Zap className="w-2.5 h-2.5 inline mr-0.5" />}{k.type}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <button onClick={() => setRevealedKey(revealedKey === k.key ? null : k.key)} className="p-1 rounded-lg hover:bg-secondary/80 transition-colors active:scale-95">
                                    {revealedKey === k.key ? <EyeOff className="w-3 h-3 text-muted-foreground" /> : <Eye className="w-3 h-3 text-muted-foreground" />}
                                  </button>
                                  <button onClick={() => handleCopy(k.key)} className="p-1 rounded-lg hover:bg-secondary/80 transition-colors active:scale-95">
                                    {copiedKey === k.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                                  </button>
                                  <button onClick={() => handleDelete(k.key)} className="p-1 rounded-lg hover:bg-destructive/20 transition-colors active:scale-95">
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </button>
                                </div>
                              </div>
                              <div className="bg-secondary/30 rounded-lg px-2.5 py-2 border border-border/50">
                                <p className="text-[11px] font-mono text-foreground tracking-wide">{revealedKey === k.key ? k.key : k.key.replace(/[A-Z0-9]/g, "•")}</p>
                              </div>
                              <div className="flex gap-2 text-[9px] font-mono text-muted-foreground/70">
                                <span>Creada: {new Date(k.createdAt).toLocaleDateString()}</span>
                                {k.usedBy && <span>• {k.usedBy}</span>}
                                {k.expiresAt && <span>• {getTimeRemaining(k.expiresAt)}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Other durations (e.g. 1 minuto) */}
                {(() => {
                  const otherKeys = keys.filter(k => !["1 día", "7 días", "30 días"].includes(k.duration));
                  if (otherKeys.length === 0) return null;
                  const unusedOther = otherKeys.filter(k => k.status === "Activa");
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">Otras</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground font-mono border border-border/40">{otherKeys.length}</span>
                        </div>
                        {unusedOther.length > 0 && (
                          <button
                            onClick={() => { navigator.clipboard.writeText(unusedOther.map(k => k.key).join("\n")); setCopiedKey("all-other"); setTimeout(() => setCopiedKey(null), 2000); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-medium transition-all active:scale-95 border ${copiedKey === "all-other" ? "bg-emerald-500/20 text-emerald-400 border-emerald-400/30" : "bg-secondary/50 text-muted-foreground border-border hover:border-ring hover:text-foreground"}`}
                          >
                            {copiedKey === "all-other" ? <><Check className="w-3 h-3" /> Copiadas</> : <><Copy className="w-3 h-3" /> Copiar libres</>}
                          </button>
                        )}
                      </div>
                      {otherKeys.map((k, i) => (
                        <div key={k.key} className="glass-card overflow-hidden animate-fade-in-up" style={{ animationDelay: `${0.03 * i}s` }}>
                          <div className={`h-0.5 w-full ${k.status === "Activa" ? "bg-emerald-500" : k.status === "Usada" ? "bg-amber-500" : k.status === "Bloqueada" ? "bg-red-500" : "bg-neutral-600"}`} />
                          <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-medium ${statusColor(k.status)}`}>{statusIcon(k.status)} {k.status}</span>
                              <div className="flex items-center gap-0.5">
                                <button onClick={() => setRevealedKey(revealedKey === k.key ? null : k.key)} className="p-1 rounded-lg hover:bg-secondary/80 transition-colors active:scale-95">
                                  {revealedKey === k.key ? <EyeOff className="w-3 h-3 text-muted-foreground" /> : <Eye className="w-3 h-3 text-muted-foreground" />}
                                </button>
                                <button onClick={() => handleCopy(k.key)} className="p-1 rounded-lg hover:bg-secondary/80 transition-colors active:scale-95">
                                  {copiedKey === k.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                                </button>
                                <button onClick={() => handleDelete(k.key)} className="p-1 rounded-lg hover:bg-destructive/20 transition-colors active:scale-95">
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </button>
                              </div>
                            </div>
                            <div className="bg-secondary/30 rounded-lg px-2.5 py-2 border border-border/50">
                              <p className="text-[11px] font-mono text-foreground tracking-wide">{revealedKey === k.key ? k.key : k.key.replace(/[A-Z0-9]/g, "•")}</p>
                            </div>
                            <p className="text-[9px] font-mono text-muted-foreground/70">{k.duration}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-mono font-medium">active_users [{users.length}]</span>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-mono">No active sessions</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                {users.map(u => (
                  <div key={u.key} className={`bg-secondary/20 rounded-lg border p-3 space-y-2 ${u.blocked ? "border-red-500/30" : "border-border/50"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${u.blocked ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
                        <span className="text-sm font-medium text-foreground">{u.name}</span>
                        {u.blocked && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400 border border-red-400/20 font-mono">BLOCKED</span>}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono">{u.type}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-0.5">
                      <p className="text-[10px] text-muted-foreground font-mono truncate">key: {u.key}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">login: {new Date(u.loginAt).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">expires: {new Date(u.expiresAt).toLocaleString()}</p>
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      {u.blocked ? (
                        <button
                          onClick={() => handleUnblock(u.key)}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium active:scale-95 transition-all"
                        >
                          <Shield className="w-3 h-3" /> Desbloquear
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBlock(u.key)}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium active:scale-95 transition-all"
                        >
                          <Ban className="w-3 h-3" /> Bloquear
                        </button>
                      )}
                      <button
                        onClick={() => handleKick(u.key)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-secondary/50 border border-border text-muted-foreground text-[10px] font-medium active:scale-95 transition-all hover:text-foreground"
                      >
                        <UserX className="w-3 h-3" /> Sacar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.key)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[10px] font-medium active:scale-95 transition-all"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>

                    <div className="flex items-center gap-1 pt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-mono mr-1">Reducir:</span>
                      {[1, 6, 12, 24].map(h => (
                        <button
                          key={h}
                          onClick={() => handleReduceTime(u.key, h)}
                          className="px-2 py-1 rounded bg-secondary/50 border border-border text-[9px] font-mono text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                        >
                          -{h}h
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Monitor/Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            {/* Server Status */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Server className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono font-medium">server_status</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Estado del servidor", value: "Online", color: "text-emerald-400", dot: true },
                  { label: "Uptime", value: "99.9%", color: "text-foreground" },
                  { label: "Latencia promedio", value: "12ms", color: "text-foreground" },
                  { label: "Protocolo", value: "HTTPS/TLS 1.3", color: "text-foreground" },
                ].map(({ label, value, color, dot }) => (
                  <div key={label} className="flex items-center justify-between py-1">
                    <span className="text-[11px] text-muted-foreground font-mono">{label}</span>
                    <div className="flex items-center gap-1.5">
                      {dot && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      <span className={`text-[11px] font-mono font-medium ${color}`}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Distribution */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono font-medium">key_distribution</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Activas", count: stats.active, total: stats.total, color: "bg-emerald-500" },
                  { label: "Usadas", count: stats.used, total: stats.total, color: "bg-amber-500" },
                  { label: "Expiradas", count: stats.expired, total: stats.total, color: "bg-neutral-600" },
                ].map(({ label, count, total, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground font-mono">{label}</span>
                      <span className="text-[10px] text-foreground font-mono font-medium">{count}/{total}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Network Info */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono font-medium">network_config</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Proxy Type", value: "HTTP/SOCKS5" },
                  { label: "Encryption", value: "AES-256-GCM" },
                  { label: "DNS", value: "Cloudflare (1.1.1.1)" },
                  { label: "Usuarios activos", value: `${stats.online}` },
                  { label: "Usuarios bloqueados", value: `${stats.blocked}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-1">
                    <span className="text-[10px] text-muted-foreground font-mono">{label}</span>
                    <span className="text-[10px] text-foreground font-mono font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Power className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-mono font-medium">quick_actions</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTab("generate")}
                  className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-secondary/30 border border-border/50 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-ring transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Generar keys
                </button>
                <button
                  onClick={() => setActiveTab("keys")}
                  className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-secondary/30 border border-border/50 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-ring transition-all active:scale-95"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Ver keys
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-secondary/30 border border-border/50 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-ring transition-all active:scale-95"
                >
                  <Users className="w-3.5 h-3.5" />
                  Usuarios
                </button>
                <button
                  onClick={refreshData}
                  className="flex items-center gap-2 py-2.5 px-3 rounded-lg bg-secondary/30 border border-border/50 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-ring transition-all active:scale-95"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
