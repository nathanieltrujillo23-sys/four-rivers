# Free API keys: how to get them and where they go

Every key below is free. The app works without them: each feature shows recent figures with their source and date until its key is added, then switches to live data on its own.

**Where every key goes:** Vercel → the `four-rivers` project → **Settings** → **Environment Variables** → **Add**. Paste the name exactly as written below, paste the key as the value, tick **Production** and **Preview**, and save. Then **Deployments** → the latest deployment → **⋯** → **Redeploy**, so the new key is picked up.

Never paste a key into chat, a commit, or a file in the repo. Vercel is the only place it should live.

---

## 1. FRED (St. Louis Fed): inflation, Treasury rates, savings rates

Used by: the dashboard calculators (Update 41).

1. Go to https://fredaccount.stlouisfed.org and create a free account (email and password), then confirm the email.
2. Signed in, open https://fredaccount.stlouisfed.org/apikeys and choose **Request API Key**.
3. Describe the application in a sentence, for example "4 Rivers, a free stewardship course, shows current inflation and interest rates in its calculators", accept the terms, and submit. The key (32 letters and numbers) appears on the page.
4. In Vercel, add it as **`FRED_API_KEY`**.

Note: FRED's terms ask that each application use its own key, and not share one key between apps. Keep this key for 4 Rivers only. Terms: https://fred.stlouisfed.org/legal/#api

## 2. BLS (Bureau of Labor Statistics): salaries by job

Used by: typical salaries in the Income river (Update 41).

1. Go to https://data.bls.gov/registrationEngine/ and fill in the form (name, organization, email). "4 Rivers" is fine as the organization.
2. BLS emails the key. Open the email and click the link in it to activate the key. It won't work until you do.
3. In Vercel, add it as **`BLS_API_KEY`**.

Without it, pay still loads through BLS's keyless tier (about 25 requests a day), and falls back to the built-in May 2025 figures if that runs out.

## 3. College Scorecard (U.S. Department of Education): earnings and debt by school and major

Used by: the student-loan lesson tools (Update 41). The key comes from api.data.gov, which serves many federal data sources.

1. Go to https://api.data.gov/signup/ (or the form on https://collegescorecard.ed.gov/data/api-documentation/).
2. Enter your name and email and submit. The key is emailed to you within a minute.
3. In Vercel, add it as **`SCORECARD_API_KEY`**.

The free limit is 1,000 requests an hour, far more than we need because results are cached. **Add this one first:** until it's added, the school check uses api.data.gov's shared demo key, which allows only about 30 lookups an hour for everyone together.

## 4. ESV (Crossway): the ESV text

Used by: verses in the ESV. Until it's added, ESV verses fall back to the KJV with a note.

1. Go to https://api.esv.org and create an account.
2. Choose **Create an API Application**, describe 4 Rivers as a free, non-commercial course, and submit. Approval is usually quick.
3. Copy the key and add it in Vercel as **`ESV_API_KEY`**.

## 5. NLT (Tyndale): the NLT text

Used by: verses in the NLT. Until it's added, NLT verses fall back to the KJV with a note.

1. Go to https://api.nlt.to and request a key (name, email, and a short description of the app).
2. Add it in Vercel as **`NLT_API_KEY`**.

---

## Sources that need no key

- **ProPublica Nonprofit Explorer**: charity filings for the "Check a charity" lookup in the Giving tracker. https://projects.propublica.org/nonprofits/api
- **The browser's speech feature**: read-aloud lessons. Built into every modern browser.

## Not used for now

- **SEC EDGAR** (company filings). It asks every app to identify itself with a contact email. We'll add it once there's an organization email to use.

## Checklist

| Name in Vercel | Where to get it | Added? |
| --- | --- | --- |
| `FRED_API_KEY` | fredaccount.stlouisfed.org/apikeys | |
| `BLS_API_KEY` | data.bls.gov/registrationEngine | |
| `SCORECARD_API_KEY` | api.data.gov/signup | |
| `ESV_API_KEY` | api.esv.org | |
| `NLT_API_KEY` | api.nlt.to | |
