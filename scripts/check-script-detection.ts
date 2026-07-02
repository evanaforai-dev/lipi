// Throwaway sanity check for the pure script-detection logic (no Figma needed).
import { detectScripts, hasIndicScript } from "../src/main/analysis/script";

let failures = 0;
function expect(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} → ${JSON.stringify(actual)}`);
}

expect("English", detectScripts("Login"), ["latin"]);
expect("Hindi (Devanagari)", detectScripts("लॉग इन करें"), ["devanagari"]);
expect("Bengali", detectScripts("লগ ইন"), ["bengali"]);
expect("Tamil", detectScripts("உள்நுழைக"), ["tamil"]);
expect("Mixed Latin+Devanagari", detectScripts("Login करें"), ["latin", "devanagari"]);
expect("Digits/punct only → none", detectScripts("123 — !"), []);
expect("hasIndic(latin) false", hasIndicScript(["latin"]), false);
expect("hasIndic(devanagari) true", hasIndicScript(["latin", "devanagari"]), true);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
