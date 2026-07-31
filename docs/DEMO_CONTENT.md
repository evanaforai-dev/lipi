# Demo content sheet

For the **Demo** translation provider to show *real* Hindi/Tamil (not pseudo-text), the demo
screens must use strings that are in the curated dictionary (`src/ui/translate/provider.ts` →
`DEMO_DICT`). Any string not listed here still works — it just falls back to script-correct
pseudo-text. Build the demo screens from this vocabulary and every label localizes for real.

Matching is **case-insensitive and trimmed**, but otherwise exact — `Add to Cart` ✓,
`Add to cart!` ✗ (trailing punctuation), `Arriving in 4 min` ✗ (dynamic number). Keep demo
copy static and drawn from the list below.

## Covered strings (English)

**Navigation:** Home · Search · Profile · Settings · Notifications · Account · Menu ·
Favorites · Help · About · Contact us

**Auth:** Log in · Log out · Sign in · Sign up · Create account · Forgot password? ·
Email · Password · Username · Remember me

**Actions / CTAs:** Continue · Get started · Next · Back · Done · Cancel · Save · Delete ·
Edit · Submit · Confirm · Apply · Share · OK · Yes · No · Learn more · View all · See more · Skip

**Content / status:** Welcome · Good morning · Recommended · Popular · Loading ·
No results · Try again · Coming soon

**Commerce:** Checkout · Add to cart · Buy now · Price · Total · Free

**Transit / journey:** Start journey · Plan your trip · Book ticket · Buy ticket ·
Nearest station · Departure · Arrival · Platform · Route · Fare · Your journey ·
Scan to pay · Track your ride · View timetable · Select destination · Exit

## Where the layout pressure comes from (keep it authentic)

Don't inflate translations to force overflow — the demo should break the way real apps break:

- Put the naturally-longer strings in **tight or fixed-width** containers: e.g. a compact
  primary button reading **"Get started"** / **"Book ticket"**, a small pill for
  **"Recommended"**, a fixed-width label for **"Nearest station"** or **"Forgot password?"**.
- Use small type for a **"Free"** / **"Total"** badge so Tamil/Hindi triggers the min-size check.
- A single-line **"Your journey"** header that's set to a fixed width will wrap under Hindi.

That way the findings are real (accurate copy in real containers), which is the whole point.

## Translation quality — please native-check Tamil

Hindi translations are standard and high-confidence. **Tamil should get a native-speaker
spot-check** before this is the public demo — the imperative verb forms in particular
(`Save → சேமி`, `Continue → தொடர்க`, `Search → தேடு`) have polite/formal variants a native
speaker may prefer. A wrong word in the "real translations" showcase costs more credibility
than pseudo-text would. Flag anything and I'll adjust the dictionary.
