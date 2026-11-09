# Devpost Submission Draft — PayPal AI Hackathon

> Copy the fields below into the Devpost submission form.
> Items marked **[TO FILL]** must be replaced with real links before submitting.

---

## Project name

CreatorTip AI

## Tagline

Tip creators with PayPal — and let AI write the message that makes it land (and the thank-you that brings the next tip).

## Description

**The problem.** Creator tip pages are usually a bare payment button. Fans
hesitate twice: once at the amount, and again at the empty message box —
so many never tip at all. And when a tip does arrive, acknowledging it
publicly takes effort, so most tips quietly disappear instead of becoming
social proof that inspires the next supporter.

**What CreatorTip AI does.** It turns tipping into a guided, three-step
journey on a single page:

1. **Pick an amount** — $1 / $5 / $10 / $25 presets or a custom amount, with
   strict validation (zero, negative, non-numeric and over-cap amounts are
   rejected before any payment starts).
2. **Compose the message with AI** — the fan enters their name and one
   detail they love about the creator, picks a tone (Supportive, Funny,
   Hype or Grateful), and the AI Tip Message Composer drafts a warm,
   personal message. It is a client-side smart composer (template +
   variation engine — 500 combinations per tone with a no-repeat
   guarantee), so the product runs end-to-end with **zero API keys and no
   external AI service**. A real LLM can later be dropped into the single
   function `aiGenerateMessage()` without touching the rest of the app.
3. **Pay with PayPal** — checkout runs on the official PayPal JavaScript
   SDK with the standard Orders flow: `createOrder` creates an order for
   the exact tip amount (the fan's message travels with it in the order's
   `custom_id`), and `onApprove` captures it. PayPal is the payment rail
   end-to-end.

**After payment**, the success screen shows the order ID, the amount, and
the message marked as *delivered* to the creator. The creator then clicks
one button to get an **AI Thank-You Reply** — a ready-to-post public
thank-you draft built from the tip — closing the loop that turns one tip
into the next.

**Two honest ways to run it.** Paste a PayPal **sandbox** client-id into
`public/config.js` and the real PayPal Checkout (sandbox) renders. Leave it
empty and the app runs a clearly-labelled **Demo Mode** that simulates the
same CREATED → APPROVED → CAPTURED states with demo order IDs, so judges
can evaluate the complete flow with no credentials at all. The current mode
is always visible in the page header and in a banner above the buttons.

**Why it matters.** Tipping is real income for small creators — streamers,
musicians, writers, open-source maintainers. Removing the "what do I even
write?" friction and automating the public thank-you directly increases
both conversion and repeat support, using PayPal infrastructure creators
already trust.

## Built with

- PayPal JavaScript SDK (Checkout / Orders v2 API — createOrder + capture)
- Vanilla JavaScript (no frameworks, no build step, zero npm dependencies)
- HTML5 + CSS3 (custom design system, responsive)
- Node.js (zero-dependency static server + automated verification script)
- Client-side AI composer (template + variation engine; LLM-ready single-function integration point)

## Try it out / demo instructions for judges

- **Live demo URL:** https://madztipjar.github.io/creatortip-ai/
- **Code repository:** https://github.com/madztipjar/creatortip-ai
- **Demo video (YouTube, < 3 min):** [TO FILL after YouTube upload — upload `demo-video.mp4` from the repo root; official rules require the video to be PUBLICLY visible on YouTube]

Run locally (no install step, no API keys):

```bash
npm start          # serves http://localhost:4174
npm run verify     # automated checks: server, syntax, composer variety, validation
```

To test the **real PayPal sandbox flow**: create a free sandbox app at
developer.paypal.com (Apps & Credentials → Sandbox), paste its client-id
into `public/config.js` as `window.PAYPAL_CLIENT_ID`, reload, and pay with
any sandbox buyer account. To test with **no credentials**: just open the
page — Demo Mode is active by default and the full flow (create → approve
→ capture → success → thank-you draft) works immediately.

## Screenshots

- `screenshots/tip-page.png` — creator tip page with amount presets
- `screenshots/composer-generated-message.png` — AI composer with a generated message
- `screenshots/checkout-demo-mode.png` — PayPal checkout panel in Demo Mode
- `screenshots/success-state.png` — captured tip, delivered message, thank-you generator

## Team

Solo project by madz.

## License

MIT
