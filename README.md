# Spatial Canvas: product site and pricing-test toolkit

Static site, no build step. Open `index.html` locally or host it on GitHub Pages / Netlify.

| File | Purpose |
|---|---|
| `index.html`, `styles.css`, `script.js` | Public product site with the Van Westendorp survey (no prices are shown anywhere, to avoid anchoring) |
| `admin.html`, `admin.js`, `admin.css` | Team dashboard: response counts, segment filters, Van Westendorp curves, PMC / PME / OPP / IPP, demand lookup, CSV export |
| `vw.js` | Van Westendorp math (shared, pure functions) |
| `apps-script/Code.gs` | Google Sheets backend that stores and serves responses |

## Collecting responses

1. Create a Google Sheet, then **Extensions → Apps Script**, and paste in `apps-script/Code.gs`.
2. Change `ADMIN_TOKEN` to a long random string.
3. **Deploy → New deployment → Web app**. Run as *Me*, access *Anyone*. Copy the `/exec` URL.
4. Put that URL in `SHEET_ENDPOINT` at the top of `script.js` and publish the site.
5. Open `admin.html`, enter the URL and token, and click **Load from sheet**. You can also upload a CSV exported from the sheet.

Without `SHEET_ENDPOINT`, responses go to the browser's localStorage only, which is useful for local testing.
Use **Load demo data** on the dashboard to preview the charts with fake data.

Admin-page protection is just the token. Don't put real data in the repo, and don't commit the token.

## Tracking who was tested

Share links with tags so segments can be compared:
`https://your-site/?src=linkedin`, `?src=prof-smith`, `?src=class-ece3000`. The tag lands in the `src` column.
`?v=a` / `?v=b` fills a `variant` column in case you want to compare survey framings.

## What each assignment page can use

| Page | Where the data comes from |
|---|---|
| 3: MVP and who was tested | The site is the MVP. Dashboard "Summary" and profile breakdowns give n, roles, institutions, disciplines |
| 4: Price curve, PMC and PME | Dashboard charts and numbers, for both a department license and a per-seat price. Screenshot or recompute from the CSV |
| 5: NPV | Price (from the curve), `seats_needed`, `intent` (adoption proxy), the dashboard's "demand lookup" (share who would not call a price too expensive), `current_spend` |
| 6: Sensitivity table | Choose the two least-certain inputs, for example adoption rate and price. The ranges come from the segment filters |
| 7: TAM / SAM / SOM | `institution_type`, `students_per_year`, `discipline` give segment sizes. Market counts come from external sources and need citations |

## Notes and limits

- Responses where the four answers are out of order (too cheap ≤ bargain ≤ expensive ≤ too expensive) are blocked at submit and excluded in analysis.
- Intent is stated, not observed. Treat adoption numbers as an upper bound.
- Edit the survey fields in `index.html`. New columns are created automatically in the sheet. If you rename the price fields, update `admin.js` and `vw.js`.
