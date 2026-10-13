import type { Language } from "../../shared/translate";

// Provider-based translation. Free (no key, real machine translation via MyMemory) is the
// default, so a designer gets real Hindi or Tamil without setting anything up. Demo stays
// fully offline and deterministic; Google stays available for teams with their own key.

export type ProviderId = "free" | "demo" | "google";

export interface TranslateOutcome {
  map: Record<string, string>; // source → target (English kept on any failure)
  failed: number;
  /** Strings that got script-correct placeholder text instead of a real translation. */
  approximated?: number;
}

export interface TranslationProvider {
  id: ProviderId;
  label: string;
  requiresKey: boolean;
  translate: (strings: string[], language: Language, key: string) => Promise<TranslateOutcome>;
}

// ── Demo provider — deterministic, offline, no key ──────────────────────────
// Curated REAL translations so the demo shows genuine localization (never pseudo-glyphs).
// Strings not in the dictionary fall back to script-correct pseudo-text. Keys are lowercased.
// Coverage: navigation, auth, actions/CTAs, content/status, commerce, and a transit slice.
const DEMO_DICT: Record<Language, Record<string, string>> = {
  hi: {
    // Navigation
    home: "होम",
    search: "खोजें",
    profile: "प्रोफ़ाइल",
    settings: "सेटिंग्स",
    notifications: "सूचनाएँ",
    account: "खाता",
    menu: "मेन्यू",
    favorites: "पसंदीदा",
    help: "सहायता",
    about: "के बारे में",
    "contact us": "हमसे संपर्क करें",
    // Auth
    login: "लॉग इन करें",
    "log in": "लॉग इन करें",
    logout: "लॉग आउट करें",
    "log out": "लॉग आउट करें",
    "sign in": "साइन इन करें",
    "sign up": "साइन अप करें",
    "create account": "खाता बनाएँ",
    "forgot password?": "पासवर्ड भूल गए?",
    email: "ईमेल",
    password: "पासवर्ड",
    username: "उपयोगकर्ता नाम",
    "remember me": "मुझे याद रखें",
    // Actions / CTAs
    continue: "जारी रखें",
    "get started": "शुरू करें",
    next: "अगला",
    back: "वापस",
    done: "पूर्ण",
    cancel: "रद्द करें",
    save: "सहेजें",
    delete: "हटाएँ",
    edit: "संपादित करें",
    submit: "सबमिट करें",
    confirm: "पुष्टि करें",
    apply: "लागू करें",
    share: "साझा करें",
    ok: "ठीक है",
    yes: "हाँ",
    no: "नहीं",
    "learn more": "और जानें",
    "view all": "सभी देखें",
    "see more": "और देखें",
    skip: "छोड़ें",
    // Content / status
    welcome: "स्वागत है",
    "good morning": "सुप्रभात",
    recommended: "अनुशंसित",
    popular: "लोकप्रिय",
    loading: "लोड हो रहा है",
    "no results": "कोई परिणाम नहीं",
    "try again": "फिर से प्रयास करें",
    "coming soon": "जल्द आ रहा है",
    // Commerce
    checkout: "चेक आउट करें",
    "add to cart": "कार्ट में जोड़ें",
    "buy now": "अभी खरीदें",
    price: "कीमत",
    total: "कुल",
    free: "निःशुल्क",
    // Transit / journey
    "start journey": "यात्रा शुरू करें",
    "plan your trip": "अपनी यात्रा की योजना बनाएँ",
    "book ticket": "टिकट बुक करें",
    "buy ticket": "टिकट खरीदें",
    "nearest station": "निकटतम स्टेशन",
    departure: "प्रस्थान",
    arrival: "आगमन",
    platform: "प्लेटफ़ॉर्म",
    route: "मार्ग",
    fare: "किराया",
    "your journey": "आपकी यात्रा",
    "scan to pay": "भुगतान के लिए स्कैन करें",
    "track your ride": "अपनी सवारी ट्रैक करें",
    "view timetable": "समय-सारणी देखें",
    "select destination": "गंतव्य चुनें",
    exit: "निकास",
  },
  ta: {
    // Navigation
    home: "முகப்பு",
    search: "தேடு",
    profile: "சுயவிவரம்",
    settings: "அமைப்புகள்",
    notifications: "அறிவிப்புகள்",
    account: "கணக்கு",
    menu: "பட்டி",
    favorites: "பிடித்தவை",
    help: "உதவி",
    about: "பற்றி",
    "contact us": "எங்களைத் தொடர்பு கொள்ளுங்கள்",
    // Auth
    login: "உள்நுழைக",
    "log in": "உள்நுழைக",
    logout: "வெளியேறு",
    "log out": "வெளியேறு",
    "sign in": "உள்நுழைக",
    "sign up": "பதிவு செய்க",
    "create account": "கணக்கை உருவாக்கு",
    "forgot password?": "கடவுச்சொல்லை மறந்துவிட்டீர்களா?",
    email: "மின்னஞ்சல்",
    password: "கடவுச்சொல்",
    username: "பயனர்பெயர்",
    "remember me": "என்னை நினைவில் கொள்",
    // Actions / CTAs
    continue: "தொடர்க",
    "get started": "தொடங்குக",
    next: "அடுத்து",
    back: "பின்",
    done: "முடிந்தது",
    cancel: "ரத்து செய்",
    save: "சேமி",
    delete: "நீக்கு",
    edit: "திருத்து",
    submit: "சமர்ப்பி",
    confirm: "உறுதிப்படுத்து",
    apply: "பயன்படுத்து",
    share: "பகிர்",
    ok: "சரி",
    yes: "ஆம்",
    no: "இல்லை",
    "learn more": "மேலும் அறிக",
    "view all": "அனைத்தையும் காண்க",
    "see more": "மேலும் காண்க",
    skip: "தவிர்",
    // Content / status
    welcome: "வரவேற்பு",
    "good morning": "காலை வணக்கம்",
    recommended: "பரிந்துரைக்கப்பட்டது",
    popular: "பிரபலமானது",
    loading: "ஏற்றுகிறது",
    "no results": "முடிவுகள் இல்லை",
    "try again": "மீண்டும் முயற்சிக்கவும்",
    "coming soon": "விரைவில் வருகிறது",
    // Commerce
    checkout: "பணம் செலுத்து",
    "add to cart": "கார்ட்டில் சேர்",
    "buy now": "இப்போது வாங்கு",
    price: "விலை",
    total: "மொத்தம்",
    free: "இலவசம்",
    // Transit / journey
    "start journey": "பயணத்தைத் தொடங்கு",
    "plan your trip": "உங்கள் பயணத்தைத் திட்டமிடுங்கள்",
    "book ticket": "டிக்கெட் பதிவு செய்",
    "buy ticket": "டிக்கெட் வாங்கு",
    "nearest station": "அருகிலுள்ள நிலையம்",
    departure: "புறப்பாடு",
    arrival: "வருகை",
    platform: "மேடை",
    route: "பாதை",
    fare: "கட்டணம்",
    "your journey": "உங்கள் பயணம்",
    "scan to pay": "பணம் செலுத்த ஸ்கேன் செய்யுங்கள்",
    "track your ride": "உங்கள் பயணத்தைக் கண்காணி",
    "view timetable": "கால அட்டவணையைக் காண்க",
    "select destination": "சேருமிடத்தைத் தேர்ந்தெடு",
    exit: "வெளியேறு",
  },
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
  label: "Offline",
  requiresKey: false,
  async translate(strings, language) {
    const dict = DEMO_DICT[language] ?? {};
    const map: Record<string, string> = {};
    for (const s of strings) {
      // Curated real translation when we have one; otherwise script-correct pseudo (safe default).
      map[s] = dict[s.trim().toLowerCase()] ?? expand(s, language);
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

// ── Free provider — real translation, no key, no setup ──────────────────────
// MyMemory's public API: anonymous, CORS-open, about 5,000 characters a day per user.
// Order per string: curated dictionary, then session cache, then MyMemory. A string the
// network cannot translate (quota spent, offline, too long, wrong script back) falls back
// to script-correct placeholder text, so the layout test always runs to the end.
const MYMEMORY = "https://api.mymemory.translated.net/get";
const MYMEMORY_MAX_BYTES = 450; // the API rejects queries over 500 bytes
const CONCURRENCY = 4;
const SCRIPT_RANGE: Record<Language, RegExp> = {
  hi: /[\u0900-\u097F]/,
  ta: /[\u0B80-\u0BFF]/,
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

class QuotaSpent extends Error {}

async function myMemory(source: string, language: Language): Promise<string | null> {
  const url = `${MYMEMORY}?q=${encodeURIComponent(source)}&langpair=en|${language}`;
  const res = await fetch(url);
  if (res.status === 429) throw new QuotaSpent();
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.quotaFinished) throw new QuotaSpent();
  if (Number(data?.responseStatus) !== 200) return null;
  const text = decodeEntities(String(data?.responseData?.translatedText ?? "")).trim();
  // Translation memories sometimes answer in the wrong script, or echo the English back.
  // Either one would hide exactly the pressure this plugin exists to find.
  if (!text || !SCRIPT_RANGE[language].test(text)) return null;
  return text;
}

export const FREE_PROVIDER: TranslationProvider = {
  id: "free",
  label: "Free",
  requiresKey: false,
  async translate(strings, language) {
    const dict = DEMO_DICT[language] ?? {};
    const map: Record<string, string> = {};
    const misses: string[] = [];
    for (const s of strings) {
      const curated = dict[s.trim().toLowerCase()];
      const cached = sessionCache.get(`${language}::${s}`);
      if (curated !== undefined) map[s] = curated;
      else if (cached !== undefined) map[s] = cached;
      else if (!/[A-Za-z]/.test(s)) map[s] = s; // numbers, prices, symbols: nothing to translate
      else misses.push(s);
    }

    let approximated = 0;
    let quotaSpent = false;
    const approximate = (s: string) => {
      map[s] = expand(s, language);
      approximated++;
    };
    let cursor = 0;
    const worker = async () => {
      while (cursor < misses.length) {
        const s = misses[cursor++];
        if (quotaSpent || new TextEncoder().encode(s).length > MYMEMORY_MAX_BYTES) {
          approximate(s);
          continue;
        }
        try {
          const t = await myMemory(s, language);
          if (t) {
            map[s] = t;
            sessionCache.set(`${language}::${s}`, t);
          } else approximate(s);
        } catch (e) {
          if (e instanceof QuotaSpent) quotaSpent = true;
          approximate(s);
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    return { map, failed: 0, approximated };
  },
};

export const PROVIDERS: TranslationProvider[] = [FREE_PROVIDER, DEMO_PROVIDER, GOOGLE_PROVIDER];

export function getProvider(id: ProviderId): TranslationProvider {
  return PROVIDERS.find((p) => p.id === id) ?? FREE_PROVIDER;
}
