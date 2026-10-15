# Spatial Canvas: product site and pricing-test toolkit

Product website for **Spatial Canvas**, an Apple Vision Pro platform that lets university STEM departments run interactive 3D simulations (Maxwell's equations, fluid dynamics, stress tensors) in place of expensive physical lab equipment. The site doubles as the MVP for our Van Westendorp pricing test.

- **Live site:** https://jackrnewcomb.github.io/spatial-canvas/
- **Team dashboard:** https://jackrnewcomb.github.io/spatial-canvas/admin.html (needs the Apps Script URL and admin token, shared privately)
- **Responses:** the `Spacial_Canvas_Responses` Google Sheet, `responses` tab

Static HTML/CSS/JS with no build step. To work on it locally, open `index.html` in a browser.

## How it works

```
Respondent ──> index.html survey ──POST──> Google Apps Script ──> Google Sheet (responses tab)
                                                                      │
Team ──> admin.html ──GET ?token=…──> Apps Script ──────────────────┘
          (curves, PMC/PME, filters, CSV)
```

No prices appear anywhere on the public site, so respondents aren't anchored. They see the product first and then answer the Van Westendorp questions.

| File | Purpose |
|---|---|
| `index.html`, `styles.css`, `script.js` | Public product site and survey. `SHEET_ENDPOINT` in `script.js` is the Apps Script URL |
| `admin.html`, `admin.js`, `admin.css` | Team dashboard |
| `vw.js` | Van Westendorp math (pure functions) |
| `apps-script/Code.gs` | Template of the Google Apps Script backend. The deployed copy lives in the Sheet's Apps Script project |
| `assets/hero.jpg` | Hero image (AI-generated, from the original slides) |
| `individual.pdf`, `individual.pptx`, `instructions.png` | Original product slides and the assignment brief |

## The survey

1. **About you:** role, institution type, discipline, students per year, buying authority, current spend (optional).
2. **Interest:** adoption intent (1–5), seats needed, whether they own headsets.
3. **Department license price:** four Van Westendorp questions, in $/year.
4. **Per-seat price:** the same four questions, in $/seat/year.
5. **Optional:** notes and email.

Both pricing units are asked of every respondent, so we can compare which unit gets cleaner results. Answers must satisfy too cheap ≤ bargain ≤ expensive ≤ too expensive. The form blocks out-of-order answers and the dashboard excludes any that slip through.

### Tagged links

Add parameters to the URL so the dashboard can break results down by channel or variant:

- `?src=<tag>` fills the `src` column, e.g. `?src=jack`, `?src=linkedin`, `?src=class-ece3000`.
- `?v=<label>` fills the `variant` column, for comparing survey framings if wanted.

Example: `https://jackrnewcomb.github.io/spatial-canvas/?src=jack`. Give each teammate and each outreach channel its own tag.

## The dashboard (`admin.html`)

1. Open it, paste the Apps Script `/exec` URL and the admin token, and click **Load from sheet**. You can also **Upload CSV** (an export of the sheet), **Load local responses** (this browser only) or **Load demo data** (fake, for previewing).
2. **Filter** by any segment field (role, institution type, discipline, students per year, buying role, headsets, `src`, `variant`) and by minimum adoption intent.
3. Read the output:
   - **Summary:** response count against the 30+ goal, share of likely adopters (intent 4–5), median and total seats.
   - **Van Westendorp charts and points:** PMC (point of marginal cheapness), PME (point of marginal expensiveness), OPP (optimal price point) and IPP (indifference price point), for the department license and per seat.
   - **Demand lookup:** type a price and see the share of respondents who would not call it too expensive. Useful as a demand input for NPV.
4. **Download CSV** exports the loaded data.

Definitions (Van Westendorp 1976): PMC is where "too cheap" crosses "not cheap". PME is where "too expensive" crosses "not expensive". OPP is where "too cheap" crosses "too expensive". IPP is where "not cheap" crosses "not expensive". The acceptable range is PMC to PME. The math lives in `vw.js`.

## What each assignment page can use

| Page | Where the data comes from |
|---|---|
| 1–2: Thesis and idea | `individual.pptx`, and the site itself |
| 3: MVP and who was tested | The site is the MVP. Dashboard summary and breakdowns give n, roles, institutions, disciplines. Report `src` tags for channels |
| 4: Price curve, PMC and PME | Dashboard charts and numbers (screenshot, or recompute from the CSV) |
| 5: NPV | Price from the curve, `seats_needed`, `intent` (adoption proxy), the demand lookup, `current_spend`. Keep only relevant numbers and state assumptions |
| 6: Sensitivity table (7x7) | Pick the two inputs we're least sure of (e.g. adoption rate and price). Ranges can come from segment filters |
| 7: TAM / SAM / SOM | `institution_type`, `students_per_year` and `discipline` suggest segments. Market counts need external sources with citations |

## Setup from scratch (already done; for reference or a rebuild)

1. Create a Google Sheet. Go to **Extensions → Apps Script** and paste in `apps-script/Code.gs`.
2. Set `ADMIN_TOKEN` to a long random string. Don't commit the real token.
3. **Deploy → New deployment → Web app**. Set *Execute as* to **Me** and *Who has access* to **Anyone** (this must be anonymous access).
4. Copy the **Web app URL** (ends in `/exec`, not the "library" URL) into `SHEET_ENDPOINT` in `script.js`.
5. Enable GitHub Pages: repo **Settings → Pages**, deploy from branch `main`, folder `/ (root)`.

## Operating notes

- **Don't redeploy casually.** Editing `Code.gs` in the editor doesn't change the live app. Use **Deploy → Manage deployments → edit → New version**, which keeps the same `/exec` URL. A brand-new deployment creates a new URL, which then has to be updated in `script.js`.
- **The survey says "recorded" even if the write fails.** Browsers can't read Apps Script's reply to this kind of request. Spot-check the sheet against how many people say they submitted.
- **Test rows:** delete them from the sheet (keep the header row) before analysis. The submission test rows were tagged `claude-test` and `claude-live-test`.
- **Sheet columns** are created from the field names. Adding a survey field adds a column automatically. Renaming a price field means updating `admin.js` and `vw.js` too.
- **Token security:** the token protects reads only. Anyone with the `/exec` URL can submit rows, so look out for junk and a hidden honeypot field catches only simple bots. Sheet cells starting with `=`, `+`, `-` or `@` are escaped against formula injection.
- **The repo is public.** It contains the slides and the assignment brief in its history.

## Known limits and caveats

- Stated intent and stated prices are not observed behavior. Treat adoption numbers as an upper bound and say so in the NPV assumptions.
- The hero image is AI-generated and shows Berkeley branding. Replace it if that's a concern.
- With n under about 30, Van Westendorp points are noisy. Check the response count before quoting PMC and PME.
- The footer notes that this is a concept product for market validation. Change it in `index.html` if the wording should differ.
- Apple Vision Pro is a trademark of Apple Inc. The site states that it is not affiliated with Apple.
