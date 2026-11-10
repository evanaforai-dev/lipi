# Lipi privacy note

Lipi runs inside Figma on your machine. It has no account, no analytics and no tracking.

## What leaves Figma

Only the plain text of the text layers in the frames you select, and only to translate it.
Where it goes depends on the translation mode you pick on the first screen. Lipi never
asks for an API key.

- **Free (default).** Text is sent to MyMemory's public translation API
  (`api.mymemory.translated.net`), one string per request, with no key and no account.
  MyMemory's own terms and privacy policy apply to that text:
  https://mymemory.translated.net/doc/
- **Offline.** Nothing leaves Figma. Lipi uses its built-in dictionary and placeholder
  text in the right script.

Lipi never sends images, layer names, file names, comments or anything about you.

If your designs contain confidential copy, use **Offline** mode.

## What Lipi stores

- Whether you have seen onboarding, in Figma's `clientStorage` on your machine.
- A temporary marker on the pages where you used Preview, so a crash can be cleaned up
  next time the plugin opens. It is cleared after cleanup.

## Contact

evana.s.pallivathukkal@gmail.com
