// Persistent per-install identifier + best-effort browser signature.
// Not a security boundary — the server applies all uniqueness rules.

const KEY = "uf_fp_v1";

function rand(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getFingerprint(): string {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) {
      const sig = [
        navigator.userAgent,
        navigator.language,
        `${screen.width}x${screen.height}x${screen.colorDepth}`,
        new Date().getTimezoneOffset(),
        (navigator as any).hardwareConcurrency ?? 0,
        (navigator as any).deviceMemory ?? 0,
      ].join("|");
      v = rand() + "-" + btoa(unescape(encodeURIComponent(sig))).slice(0, 24);
      localStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return rand();
  }
}
