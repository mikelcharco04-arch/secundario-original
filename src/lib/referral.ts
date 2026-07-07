import { getFingerprint } from "./fingerprint";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/referral`;

async function call(action: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({ action, origin: window.location.origin, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error de red");
  return data;
}

export const referralApi = {
  generateName: () => call("generate-name") as Promise<{ name: string }>,
  register: (name: string) => call("register", { name, fingerprint: getFingerprint() }),
  status: (code: string) => call("status", { code }),
  visitUrl: (code: string) => `${BASE}?code=${encodeURIComponent(code)}&fp=${encodeURIComponent(getFingerprint())}`,
};

const SESSION_KEY = "uf_ref_code";
export const saveReferralCode = (code: string) => localStorage.setItem(SESSION_KEY, code);
export const loadReferralCode = () => localStorage.getItem(SESSION_KEY);
export const clearReferralCode = () => localStorage.removeItem(SESSION_KEY);
