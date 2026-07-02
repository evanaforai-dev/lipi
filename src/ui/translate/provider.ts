import type { Language } from "../../shared/translate";

// Provider-based translation. Demo (no key, deterministic) is the default so the plugin
// runs immediately after cloning; Google stays available as an optional production
// provider behind the selector. The network lives ONLY in the Google provider.

export type ProviderId = "demo" | "google";

export interface TranslateOutcome {
  map: Record<string, string>; // source → target (English kept on any failure)
  failed: number;
}

export interface TranslationProvider {
  id: ProviderId;
  label: string;
  requiresKey: boolean;
  translate: (strings: string[], language: Language, key: string) => Promise<TranslateOutcome>;
}

// ── Demo provider — deterministic, offline, no key ──────────────────────────
// Known UI strings get real Hindi; unknown strings get a deterministic Devanagari
// expansion (longer than the source) so the Delta Engine sees real localization pressure.
const DEMO_DICT: Record<string, string> = {
  login: "लॉग इन करें",
  "log in": "लॉग इन करें",
  logout: "लॉग आउट करें",
  "log out": "लॉग आउट करें",
  "sign in": "साइन इन करें",
  "sign up": "साइन अप करें",
  submit: "सबमिट करें",
  cancel: "रद्द करें",
  save: "सहेजें",
  delete: "हटाएं",
  edit: "संपादित करें",
  continue: "जारी रखें",
  next: "अगला",
  back: "वापस",
  done: "पूर्ण",
  ok: "ठीक है",
  yes: "हाँ",
  no: "नहीं",
  confirm: "पुष्टि करें",
  apply: "लागू करें",
  search: "खोजें",
  home: "होम",
  settings: "सेटिंग्स",
  profile: "प्रोफ़ाइल",
  account: "खाता",
  notifications: "सूचनाएं",
  help: "सहायता",
  about: "के बारे में",
  "contact us": "हमसे संपर्क करें",
  share: "साझा करें",
  password: "पासवर्ड",
  email: "ईमेल",
  username: "उपयोगकर्ता नाम",
  "forgot password?": "पासवर्ड भूल गए?",
  welcome: "स्वागत है",
  "get started": "शुरू करें",
  "learn more": "और जानें",
  "view all": "सभी देखें",
  "see more": "और देखें",
  checkout: "चेक आउट करें",
  "add to cart": "कार्ट में जोड़ें",
  "buy now": "अभी खरीदें",
};

// Per-language syllable sets so demo output renders in the RIGHT script (Devanagari for
// Hindi, Tamil for Tamil) — otherwise the delta engine would measure the wrong glyphs.
const SCRIPTS: Record<Language, { cons: string[]; matra: string[] }> = {
  hi: {
    cons: "कखगघचजटडतथदनपफबभमयरलवशसह".split(""),
    matra: ["", "ा", "ि", "ी", "ु", "ू", "े", "ो", "ं"],
  },
  ta: {
    cons: "கஙசஞடணதநபமயரலவழளறன".split(""),
    matra: ["", "ா", "ி", "ீ", "ு", "ூ", "ெ", "ே", "ொ", "ோ"],
  },
};

function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

function fakeWord(length: number, seed: number, lang: Language): string {
  const { cons, matra } = SCRIPTS[lang];
  let s = seed;
  const next = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0);
  let out = "";
  const syllables = Math.max(1, Math.ceil(length / 2));
  for (let i = 0; i < syllables; i++) {
    out += cons[next() % cons.length] + matra[next() % matra.length];
  }
  return out;
}

// Deterministic expansion: same source → same output, ~1.5× longer per word, in `lang`'s script.
function expand(source: string, lang: Language): string {
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 0) return source;
  const base = seedOf(source);
  return words.map((w, i) => fakeWord(Math.ceil(w.length * 1.5) + 2, base + i * 7919, lang)).join(" ");
}

export const DEMO_PROVIDER: TranslationProvider = {
  id: "demo",
  label: "Demo",
  requiresKey: false,
  async translate(strings, language) {
    const map: Record<string, string> = {};
    for (const s of strings) {
      // The curated dictionary is Hindi-only; every other language uses script-correct pseudo.
      const known = language === "hi" ? DEMO_DICT[s.trim().toLowerCase()] : undefined;
      map[s] = known ?? expand(s, language);
    }
    return { map, failed: 0 };
  },
};

// ── Google provider — production, requires an API key, uses the network ─────
const ENDPOINT = "https://translation.googleapis.com/language/translate/v2";
const BATCH_SIZE = 100;
const sessionCache = new Map<string, string>();

async function translateChunk(chunk: string[], language: Language, key: string): Promise<string[]> {
  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: chunk, source: "en", target: language, format: "text" }),
  });
  if (!res.ok) throw new Error(`Translation request failed (${res.status})`);
  const data = await res.json();
  const translations = data?.data?.translations;
  if (!Array.isArray(translations)) throw new Error("Unexpected translation response");
  return translations.map((t: { translatedText?: string }) => t?.translatedText ?? "");
}

export const GOOGLE_PROVIDER: TranslationProvider = {
  id: "google",
  label: "Google",
  requiresKey: true,
  async translate(strings, language, key) {
    const map: Record<string, string> = {};
    const misses: string[] = [];
    for (const s of strings) {
      const cached = sessionCache.get(`${language}::${s}`);
      if (cached !== undefined) map[s] = cached;
      else misses.push(s);
    }
    let failed = 0;
    for (let i = 0; i < misses.length; i += BATCH_SIZE) {
      const chunk = misses.slice(i, i + BATCH_SIZE);
      try {
        const out = await translateChunk(chunk, language, key);
        chunk.forEach((src, idx) => {
          const t = out[idx];
          if (t && t.length > 0) {
            map[src] = t;
            sessionCache.set(`${language}::${src}`, t);
          } else {
            map[src] = src;
            failed++;
          }
        });
      } catch {
        for (const src of chunk) {
          map[src] = src; // keep English on failure
          failed++;
        }
      }
    }
    return { map, failed };
  },
};

export const PROVIDERS: TranslationProvider[] = [DEMO_PROVIDER, GOOGLE_PROVIDER];

export function getProvider(id: ProviderId): TranslationProvider {
  return PROVIDERS.find((p) => p.id === id) ?? DEMO_PROVIDER;
}
