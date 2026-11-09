# CreatorTip AI

**Tip your favourite creator with PayPal — and let AI write the message that makes it land.**

CreatorTip AI is a one-page tipping app for independent creators. A fan opens a
creator's tip page, picks an amount, uses the **AI Tip Message Composer** to
draft a personal message in the tone they want (Supportive / Funny / Hype /
Grateful), and pays with **PayPal Checkout**. After the payment is captured,
the creator gets an **AI Thank-You Reply** draft to acknowledge the tip
publicly — closing the loop that turns one tip into the next one.

Built for the **PayPal AI Hackathon** (Devpost). Zero dependencies, no build
step, no API keys required to run the demo.

---

## Architecture: how PayPal and AI fit together

```
Fan ─▶ Tip page (amount presets 1/5/10/25 + custom, validated)
    ─▶ AI Tip Message Composer ── drafts a personal message (tone + name + detail)
    ─▶ PayPal Checkout (JS SDK, Orders API)
          createOrder  → purchase_units[0].amount = tip amount (USD)
                         purchase_units[0].custom_id = the fan's message
          onApprove    → actions.order.capture()
    ─▶ Success screen ── order ID + "delivered" message
    ─▶ AI Thank-You Reply generator ── public thank-you post draft for the creator
```

**PayPal is central, not decorative.** The entire transaction runs on the
official PayPal JavaScript SDK with the standard Orders v2 flow
(`createOrder` → buyer approval → `capture`). The app never touches card
data; the tip amount and the fan's message (in `custom_id`, truncated to
PayPal's 127-char limit) are part of the PayPal order itself.

**The AI layer is a client-side smart composer.** It is a template +
variation engine: four tones × five openers/middles/closers/sign-offs = 500
combinations per tone, with fan name and a personal detail interpolated, and
a no-repeat guarantee per input set. It needs **zero API keys** and makes
**no external AI API calls** — that is deliberate, so judges can run the
complete product offline with no setup. It is *not* a wrapper around an LLM,
and we don't claim otherwise. To use a real model later, replace the body of
one function — `aiGenerateMessage()` in `public/app.js` — with a `fetch()` to
your LLM endpoint; the UI, validation and PayPal flow are untouched.

### Dual checkout path (read this before judging the PayPal integration)

| Mode | When | What happens |
| --- | --- | --- |
| **PayPal Sandbox** | `window.PAYPAL_CLIENT_ID` in `public/config.js` contains a sandbox client-id | The real PayPal Buttons render and the real sandbox Orders flow runs. |
| **Demo Mode** | `config.js` left empty (the shipped default) | A clearly-labelled demo button simulates the *same* states — order **CREATED → APPROVED → CAPTURED** with demo order/capture IDs and an on-screen log — so the full journey works with no credentials at all. |

The active mode is always shown in the header badge and in a banner above
the checkout panel. Nothing about Demo Mode pretends to be a real payment.

## Setup

Requirements: Node.js 18+ (for the tiny static server + verify script).
No `npm install` — there are no dependencies.

```bash
npm start
# → http://localhost:4174
```

### Turn on real PayPal Checkout (sandbox)

1. Go to <https://developer.paypal.com> → Log in → **Apps & Credentials** →
   **Sandbox** → **Create App**.
2. Copy the app's **Client ID**.
3. Paste it into `public/config.js`:

   ```js
   window.PAYPAL_CLIENT_ID = "YOUR_SANDBOX_CLIENT_ID";
   ```

4. Reload the page. The header badge switches to **PayPal Sandbox** and the
   official PayPal Buttons appear. Log in with a PayPal sandbox *personal*
   (buyer) account to complete a test tip.

### Verify everything works

```bash
npm run verify
```

Starts the server, fetches `/`, `/app.js`, `/style.css`, `/config.js`
(expects HTTP 200), syntax-checks every JS file with `node --check`, then
exercises the pure logic in Node: the composer must produce distinct
messages across all four tones and 20 unique messages in 20 runs of one
tone, and amount validation must reject 0 / negative / NaN / empty inputs.
Exits non-zero on any failure.

## Project layout

```
public/
  index.html   one-page app: tip page, composer, checkout, success, judges' notes
  app.js       core logic (validation, AI composer, thank-you generator)
               + browser wiring (PayPal Buttons / Demo Mode)
  style.css    all styling, no frameworks
  config.js    window.PAYPAL_CLIENT_ID — the only configuration
server.mjs     zero-dependency Node static server (port 4174)
verify.mjs     automated checks (npm run verify)
screenshots/   tip page, composer, demo checkout, success state
SUBMISSION.md  the Devpost submission text
LICENSE        MIT
```

## How this addresses the judging criteria

1. **Technological Implementation** — A real, working integration of the
   PayPal JS SDK + Orders API (create/capture, amount + `custom_id` payload,
   error handling), plus an honest dual-path design (sandbox vs simulated)
   driven by one config value. The AI composer is a deterministic-quality
   variation engine with programmatic verification (`verify.mjs`), not a
   static text box.
2. **Design** — A single focused page that mirrors the real tipping journey
   in numbered steps (amount → message → pay), with a persistent mode badge
   so the user always knows whether money is real (sandbox) or simulated,
   inline validation errors, a visible checkout state log, and a success
   screen that shows exactly what was delivered.
3. **Potential Impact** — Tipping is how small creators actually get paid,
   and the two friction points are real: fans don't know what to write
   (composer fixes it) and tips go unacknowledged (thank-you generator fixes
   it, publicly — social proof that drives the next tip). The pattern
   generalises to any PayPal-powered support page: musicians, streamers,
   open-source maintainers, local newsletters.
4. **Innovation / Idea** — Most tip jars are a bare payment button. Here the
   AI writes *both sides* of the interaction — the fan's message and the
   creator's public reply — and the message travels inside the PayPal order
   itself via `custom_id`, so the payment and the words stay attached in the
   creator's PayPal records.
5. **Presentation** — The demo is self-explanatory: labelled modes, an
   on-page "notes for judges" section, a one-command run (`npm start`), a
   one-command proof (`npm run verify`), screenshots in `screenshots/`, and
   the shot list below for the <3-minute video.

## Demo video shot list (< 3 minutes)

1. **0:00–0:15 — Problem.** Creator tip pages are bare buttons; fans freeze
   on the message box; tips go unthanked. Show the CreatorTip AI tip page.
2. **0:15–0:50 — AI composer.** Enter a fan name + detail, switch tones
   (Supportive → Funny → Hype), generate twice in one tone to show the
   messages differ. Mention the no-API-key design and the `aiGenerateMessage()`
   LLM drop-in point.
3. **0:50–1:40 — PayPal, demo path.** Show the Demo Mode banner, click
   *Pay with PayPal (Demo)*, narrate the CREATED → APPROVED → CAPTURED log
   and the success screen with order ID + delivered message.
4. **1:40–2:20 — PayPal, real sandbox path.** Show `config.js`, paste a
   sandbox client-id, reload, real PayPal Buttons, log in with a sandbox
   buyer, approve, capture; cut to the success screen with the real sandbox
   order ID.
5. **2:20–2:45 — Creator loop.** Click *Generate thank-you post*, show the
   draft, copy it.
6. **2:45–3:00 — Proof & close.** Terminal: `npm run verify` → ALL CHECKS
   PASSED. One-line recap of the idea.

## Notes & limitations

- Demo Mode moves no money and creates no PayPal objects — it exists purely
  so the UX can be evaluated without credentials.
- Sandbox mode is for testing; a production deployment would add a server
  component to create/capture orders server-side and verify webhooks before
  marking a tip "delivered".
- The creator profile ("madz") is placeholder demo data.
- All materials are in English.

## License

MIT — see `LICENSE`.
