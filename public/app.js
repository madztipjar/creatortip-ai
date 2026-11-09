/*
 * CreatorTip AI — application logic
 * ===========================================================================
 * Two halves:
 *   1. Pure core logic (amount validation + AI message composer + thank-you
 *      generator). No DOM access, so verify.mjs can exercise it in Node.
 *   2. Browser wiring (guarded by `typeof document !== 'undefined'`):
 *      tip-page UI, PayPal Buttons (real sandbox Orders flow) and the
 *      clearly-labelled DEMO MODE that simulates the same steps when no
 *      PayPal client-id is configured.
 *
 * AI HONESTY NOTE: the "AI" in this demo is a fully client-side smart
 * composer (template + variation engine). It does NOT call any external AI
 * API. See aiGenerateMessage() below — that single function is the drop-in
 * point for a real LLM endpoint.
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Creator profile (demo placeholder data)
   * ------------------------------------------------------------------ */
  var CREATOR = {
    name: 'madz',
    handle: '@madz',
    bio: 'Indie creator & builder — live-coding sessions, open-source experiments and community hangouts. (Placeholder creator profile used for this demo.)',
  };

  /* ------------------------------------------------------------------ *
   * Amount validation
   * ------------------------------------------------------------------ */
  var MAX_TIP_USD = 10000;

  function validateAmount(raw) {
    if (raw === null || raw === undefined) {
      return { ok: false, value: NaN, error: 'Please enter a tip amount.' };
    }
    var value = typeof raw === 'number' ? raw : Number(String(raw).trim());
    if (typeof value !== 'number' || !isFinite(value) || Number.isNaN(value)) {
      return { ok: false, value: NaN, error: 'That amount is not a number.' };
    }
    if (value <= 0) {
      return { ok: false, value: value, error: 'Tip amount must be more than $0.' };
    }
    if (value > MAX_TIP_USD) {
      return { ok: false, value: value, error: 'Tip amount is capped at $' + MAX_TIP_USD + ' for this demo.' };
    }
    value = Math.round(value * 100) / 100;
    return { ok: true, value: value, error: '' };
  }

  function formatUSD(value) {
    var v = Math.round(Number(value) * 100) / 100;
    return '$' + (v % 1 === 0 ? String(v) : v.toFixed(2));
  }

  /* ------------------------------------------------------------------ *
   * AI Tip Message Composer — template + variation engine
   *
   * Each tone has multiple openers / middles / closers / sign-offs.
   * A message = opener + middle + closer + signoff, with {fan}, {creator}
   * and {detail} interpolated. 5 x 5 x 5 x 4 = 500 combinations per tone,
   * and a per-session "used" set guarantees no exact repeat for the same
   * inputs until the space is exhausted.
   * ------------------------------------------------------------------ */
  var TONES = {
    supportive: {
      label: 'Supportive',
      openers: [
        'Hey {creator}, just a note to say your work truly matters to people like me.',
        '{creator}, you have built something that genuinely helps people — thank you.',
        'Hi {creator} — your consistency inspires me more than you probably know.',
        'Hey {creator}, I do not say this lightly: what you make is worth supporting.',
        '{creator}, consider this a small thank-you for a big impact.',
      ],
      middles: [
        'I keep coming back because of {detail} — it is the highlight of my week.',
        'Whenever I think about {detail}, I am reminded why I follow your work.',
        'The care you put into {detail} shows in every single post.',
        'You have turned {detail} into something I genuinely look forward to.',
        'People underestimate {detail}, but I see the effort behind it.',
      ],
      closers: [
        'Keep going — I am in your corner.',
        'This tip is small, but the appreciation is huge.',
        'Proud to support what you are building.',
        'Here is to many more — you have earned it.',
        'Thank you for showing up for your community.',
      ],
      signoffs: ['— {fan}', 'With gratitude, {fan}', 'Your fan, {fan}', 'Cheering you on, {fan}'],
    },
    funny: {
      label: 'Funny',
      openers: [
        '{creator}, my wallet and I had a meeting. You won.',
        'Hey {creator}, legally I had to tip after laughing that hard.',
        '{creator}, this is cheaper than therapy and honestly more effective.',
        'Dear {creator}: please accept this bribe to keep being hilarious.',
        '{creator}, my bank account says hi and also help.',
      ],
      middles: [
        'Between you and me, {detail} has saved several of my group chats.',
        'I showed {detail} to my friends and now they will not stop quoting you.',
        '{detail} lives rent-free in my head, so really this tip is back-rent.',
        'I have rewatched {detail} an embarrassing number of times. No regrets.',
        'If {detail} were a stock, I would be all in. This tip is my position.',
      ],
      closers: [
        'Spend it on snacks. Or world domination. Your call.',
        'No take-backs — the tip has left the station.',
        'This is me investing in more chaos. The good kind.',
        'Keep the change. (There is no change. It is a tip.)',
        '10/10 would financially encourage again.',
      ],
      signoffs: ['— {fan}, professional menace', '— {fan} (sent from my couch)', '— {fan}, probably your favourite lurker', '— {fan}'],
    },
    hype: {
      label: 'Hype',
      openers: [
        "{creator} LET'S GO — you are on another level right now!",
        'Nobody is doing it like {creator} right now. NOBODY.',
        '{creator}, the streak you are on is actually unreal.',
        'HEY {creator} — the algorithm brought me here and it was RIGHT.',
        '{creator} is in a league of one and this tip proves it.',
      ],
      middles: [
        '{detail} is the kind of thing people will talk about for years.',
        'Every time {detail} drops, the whole timeline stops.',
        'I have sent {detail} to everyone I know. Twice.',
        '{detail} is not just good — it is a moment.',
        'The energy around {detail} is different. You built that.',
      ],
      closers: [
        'To the moon with this one. Keep climbing!',
        'This is just the beginning — I believe that fully.',
        'Certified supporter. Locked in. Let us run it up!',
        'More fuel for the rocket. GO.',
        'Just keep winning — we are all watching.',
      ],
      signoffs: ['— {fan}, day one believer', '— {fan}, front row', '— {fan}', '— {fan}, loud and proud'],
    },
    grateful: {
      label: 'Grateful',
      openers: [
        '{creator}, I just want to say thank you — properly, this time.',
        'Dear {creator}, your work came into my life at exactly the right moment.',
        '{creator}, I have been meaning to thank you for a long time.',
        'Hi {creator} — gratitude is overdue, so here it is with interest.',
        'Thank you, {creator}. Two words that do not cover it, but they are a start.',
      ],
      middles: [
        'Because of {detail}, my days genuinely look different now.',
        '{detail} helped me more than you will ever know.',
        'I return to {detail} whenever I need a reset — it never fails.',
        'What you did with {detail} stayed with me long after I closed the tab.',
        '{detail} is a gift you keep giving. This is mine back.',
      ],
      closers: [
        'Thank you for being exactly who you are.',
        'This comes with real appreciation and zero expectations.',
        'May you receive even a fraction of what you give.',
        'Grateful does not cover it — but it is where I will start.',
        'With a full heart: thank you.',
      ],
      signoffs: ['— Gratefully, {fan}', '— Thank you always, {fan}', '— {fan}', '— With thanks, {fan}'],
    },
  };

  var usedSignatures = {};

  function pickIndex(len, avoid) {
    if (len <= 1) return 0;
    var idx = Math.floor(Math.random() * len);
    var guard = 0;
    while (avoid && avoid.indexOf(idx) !== -1 && guard < 25) {
      idx = Math.floor(Math.random() * len);
      guard++;
    }
    return idx;
  }

  function fillTemplate(text, ctx) {
    return text
      .replace(/\{creator\}/g, ctx.creatorName)
      .replace(/\{fan\}/g, ctx.fanName)
      .replace(/\{detail\}/g, ctx.detail);
  }

  function normalizeComposerInput(input) {
    input = input || {};
    var tone = String(input.tone || 'supportive').toLowerCase();
    if (!TONES[tone]) tone = 'supportive';
    return {
      tone: tone,
      fanName: String(input.fanName || '').trim() || 'A fan',
      creatorName: String(input.creatorName || '').trim() || CREATOR.name,
      detail: String(input.detail || '').trim() || 'everything you put out',
    };
  }

  function templateCompose(ctx) {
    var bank = TONES[ctx.tone];
    var key = ctx.tone + '|' + ctx.fanName + '|' + ctx.creatorName + '|' + ctx.detail;
    if (!usedSignatures[key]) usedSignatures[key] = {};
    var used = usedSignatures[key];
    var signature = '';
    var parts = null;
    for (var attempt = 0; attempt < 60; attempt++) {
      var oi = pickIndex(bank.openers.length);
      var mi = pickIndex(bank.middles.length);
      var ci = pickIndex(bank.closers.length);
      var si = pickIndex(bank.signoffs.length);
      signature = oi + '.' + mi + '.' + ci + '.' + si;
      if (!used[signature]) {
        parts = [bank.openers[oi], bank.middles[mi], bank.closers[ci], bank.signoffs[si]];
        break;
      }
    }
    if (!parts) {
      // Combination space for these exact inputs is exhausted (500 combos);
      // reset so generation never dead-ends.
      usedSignatures[key] = {};
      used = usedSignatures[key];
      parts = [bank.openers[0], bank.middles[0], bank.closers[0], bank.signoffs[0]];
      signature = '0.0.0.0';
    }
    used[signature] = true;
    return parts.map(function (p) { return fillTemplate(p, ctx); }).join(' ');
  }

  /*
   * AI INTEGRATION POINT ---------------------------------------------------
   * aiGenerateMessage() is the ONE function to change when wiring a real
   * LLM: replace its body with a fetch() to your model endpoint (e.g. your
   * own server proxy that calls an LLM API with the tone + fan + detail as
   * the prompt) and return the model's text. Everything else in the app
   * (UI, PayPal flow, thank-you generator) stays identical.
   * The default implementation below is the client-side smart composer —
   * no API key, no network call, no external AI service involved.
   * ------------------------------------------------------------------------
   */
  function aiGenerateMessage(ctx) {
    return templateCompose(ctx);
  }

  function composeMessage(input) {
    return aiGenerateMessage(normalizeComposerInput(input));
  }

  /* ------------------------------------------------------------------ *
   * AI Thank-You Reply generator (creator side)
   * Turns a received tip into a warm public thank-you post draft.
   * ------------------------------------------------------------------ */
  var THANK_YOU_FRAMES = [
    'Wow — thank you, {fan}! Your {amount} tip just made my day. "{excerpt}" Support like this is exactly why I keep creating.',
    'Shoutout to {fan} for tipping {amount}! "{excerpt}" Grateful does not cover it. More of {detail} coming soon.',
    '{fan} just tipped {amount} and left the sweetest note: "{excerpt}" This community is unreal. Thank you!',
    'To {fan}: your {amount} tip + kind words = instant motivation. "{excerpt}" Thank you for believing in {detail}.',
    'Smiling at my phone because {fan} tipped {amount} with this note: "{excerpt}" You are all amazing.',
    'Big love to {fan} for the {amount} tip! "{excerpt}" Every bit of support goes straight back into {detail}.',
  ];
  var lastThankYouIndex = -1;

  function composeThankYou(input) {
    input = input || {};
    var fanName = String(input.fanName || '').trim() || 'A fan';
    var amountNum = validateAmount(input.amount).ok ? validateAmount(input.amount).value : 5;
    var message = String(input.message || '').trim();
    var excerpt = message.length > 90 ? message.slice(0, 87).trim() + '...' : message;
    if (!excerpt) excerpt = 'Your support means the world.';
    var detail = String(input.detail || '').trim() || 'the next project';
    var idx = pickIndex(THANK_YOU_FRAMES.length, [lastThankYouIndex]);
    lastThankYouIndex = idx;
    return THANK_YOU_FRAMES[idx]
      .replace(/\{fan\}/g, fanName)
      .replace(/\{amount\}/g, formatUSD(amountNum))
      .replace(/\{excerpt\}/g, excerpt)
      .replace(/\{detail\}/g, detail);
  }

  /* ------------------------------------------------------------------ *
   * Exports (Node / verify.mjs) — harmless in the browser.
   * ------------------------------------------------------------------ */
  var core = {
    CREATOR: CREATOR,
    TONES: TONES,
    validateAmount: validateAmount,
    formatUSD: formatUSD,
    composeMessage: composeMessage,
    composeThankYou: composeThankYou,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = core;
  }
  global.CreatorTipCore = core;

  /* ================================================================== *
   * BROWSER WIRING — everything below only runs in a real browser.
   * ================================================================== */
  if (typeof document === 'undefined') return;

  var state = {
    amount: 5,
    message: '',
    fanName: '',
    detail: '',
    tone: 'supportive',
    lastTip: null,
    clientId: typeof global.PAYPAL_CLIENT_ID === 'string' ? global.PAYPAL_CLIENT_ID.trim() : '',
  };

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function currentAmount() {
    var custom = $('#custom-amount').value;
    if (custom !== '') return validateAmount(custom);
    return validateAmount(state.amount);
  }

  function refreshAmountUI() {
    var result = currentAmount();
    var err = $('#amount-error');
    if (result.ok) {
      err.textContent = '';
      $('#amount-summary').textContent = 'You are tipping ' + CREATOR.name + ' ' + formatUSD(result.value) + ' USD';
    } else {
      err.textContent = result.error;
      $('#amount-summary').textContent = '';
    }
    return result;
  }

  function logCheckout(text) {
    var li = document.createElement('li');
    li.textContent = text;
    $('#checkout-log').appendChild(li);
  }

  function showSuccess(orderId, payerName, demo) {
    var amountResult = currentAmount();
    var amount = amountResult.ok ? amountResult.value : state.amount;
    state.lastTip = {
      fanName: state.fanName || 'A fan',
      amount: amount,
      message: state.message || $('#tip-message').value.trim(),
      detail: state.detail,
    };
    $('#success-order-id').textContent = orderId;
    $('#success-amount').textContent = formatUSD(amount) + ' USD';
    $('#success-payer').textContent = payerName || state.lastTip.fanName;
    $('#success-message').textContent = state.lastTip.message || '(no message attached)';
    $('#success-demo-note').textContent = demo
      ? 'Demo mode: this capture was simulated locally — no real PayPal order exists.'
      : 'Captured with PayPal Checkout (sandbox).';
    var panel = $('#success-panel');
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- Demo-mode checkout simulation ---------------- */
  function randomId(prefix) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    for (var i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return prefix + out;
  }

  function wireDemoCheckout() {
    $('#demo-area').classList.remove('hidden');
    $('#demo-pay-btn').addEventListener('click', function () {
      var result = refreshAmountUI();
      if (!result.ok) {
        $('#checkout-error').textContent = result.error;
        return;
      }
      $('#checkout-error').textContent = '';
      var btn = $('#demo-pay-btn');
      btn.disabled = true;
      btn.textContent = 'Processing…';
      $('#checkout-log').innerHTML = '';
      var orderId = randomId('DEMO-ORDER-');
      logCheckout('DEMO: order created — ' + orderId + ' for ' + formatUSD(result.value) + ' USD (status: CREATED)');
      setTimeout(function () {
        logCheckout('DEMO: buyer approved the payment (status: APPROVED)');
        setTimeout(function () {
          var captureId = randomId('DEMO-CAPTURE-');
          logCheckout('DEMO: payment captured — ' + captureId + ' (status: COMPLETED)');
          btn.disabled = false;
          btn.textContent = 'Pay with PayPal (Demo)';
          showSuccess(orderId, state.fanName || 'Demo Buyer', true);
        }, 650);
      }, 650);
    });
  }

  /* ---------------- Real PayPal sandbox checkout ---------------- */
  function wireRealCheckout() {
    var script = document.createElement('script');
    script.src =
      'https://www.paypal.com/sdk/js?client-id=' +
      encodeURIComponent(state.clientId) +
      '&currency=USD&intent=capture';
    script.onload = function () {
      if (!global.paypal || !global.paypal.Buttons) {
        $('#checkout-error').textContent = 'PayPal SDK loaded but Buttons are unavailable.';
        return;
      }
      global.paypal
        .Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'paypal' },
          createOrder: function (data, actions) {
            var result = refreshAmountUI();
            if (!result.ok) {
              $('#checkout-error').textContent = result.error;
              return Promise.reject(new Error(result.error));
            }
            $('#checkout-error').textContent = '';
            logCheckout('Creating PayPal order for ' + formatUSD(result.value) + ' USD…');
            return actions.order.create({
              purchase_units: [
                {
                  description: 'Tip for ' + CREATOR.name + ' via CreatorTip AI',
                  amount: { currency_code: 'USD', value: result.value.toFixed(2) },
                  custom_id: (state.message || $('#tip-message').value || '').slice(0, 127),
                },
              ],
            });
          },
          onApprove: function (data, actions) {
            logCheckout('Buyer approved order ' + data.orderID + ' — capturing…');
            return actions.order.capture().then(function (details) {
              logCheckout('Payment captured: ' + details.id + ' (status: ' + details.status + ')');
              var payer = details.payer && details.payer.name ? details.payer.name.given_name : '';
              showSuccess(details.id, payer || state.fanName, false);
            });
          },
          onError: function (err) {
            $('#checkout-error').textContent = 'PayPal error: ' + (err && err.message ? err.message : err);
          },
        })
        .render('#paypal-buttons');
    };
    script.onerror = function () {
      $('#checkout-error').textContent =
        'Could not load the PayPal SDK. Check your connection and that the client-id in config.js is a valid sandbox id.';
    };
    document.head.appendChild(script);
  }

  /* ---------------- Init ---------------- */
  function init() {
    // Creator card
    $('#creator-name').textContent = CREATOR.name;
    $('#creator-handle').textContent = CREATOR.handle;
    $('#creator-bio').textContent = CREATOR.bio;
    $('#creator-avatar').textContent = CREATOR.name.charAt(0).toUpperCase();

    // Amount presets
    $all('.preset-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $all('.preset-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.amount = Number(btn.getAttribute('data-amount'));
        $('#custom-amount').value = '';
        refreshAmountUI();
      });
    });
    $('#custom-amount').addEventListener('input', function () {
      if ($('#custom-amount').value !== '') {
        $all('.preset-btn').forEach(function (b) { b.classList.remove('active'); });
      }
      refreshAmountUI();
    });

    // Composer
    $('#generate-btn').addEventListener('click', function () {
      state.fanName = $('#fan-name').value.trim();
      state.detail = $('#fan-detail').value.trim();
      var toneEl = document.querySelector('input[name="tone"]:checked');
      state.tone = toneEl ? toneEl.value : 'supportive';
      state.message = composeMessage({
        tone: state.tone,
        fanName: state.fanName,
        creatorName: CREATOR.name,
        detail: state.detail,
      });
      $('#tip-message').value = state.message;
      $('#composer-note').textContent = 'Generated with the built-in client-side composer. Edit it freely before paying.';
    });
    $('#tip-message').addEventListener('input', function () {
      state.message = $('#tip-message').value;
    });

    // Mode: real PayPal vs demo
    var badge = $('#mode-badge');
    if (state.clientId) {
      badge.textContent = 'PayPal Sandbox';
      badge.classList.add('mode-live');
      $('#mode-banner').innerHTML =
        '<strong>PayPal Sandbox mode.</strong> A client-id is configured in config.js, so the buttons below are the real PayPal Checkout (sandbox) Orders flow.';
      wireRealCheckout();
    } else {
      badge.textContent = 'Demo Mode';
      $('#mode-banner').innerHTML =
        '<strong>DEMO MODE — no PayPal credentials configured.</strong> The button below simulates the exact same create &rarr; approve &rarr; capture steps locally so you can run the whole flow. Paste a sandbox client-id into <code>public/config.js</code> to switch to real PayPal Checkout (sandbox).';
      wireDemoCheckout();
    }

    // Thank-you generator
    $('#ty-generate-btn').addEventListener('click', function () {
      if (!state.lastTip) return;
      $('#ty-output').value = composeThankYou(state.lastTip);
    });
    $('#ty-copy-btn').addEventListener('click', function () {
      var out = $('#ty-output');
      out.select();
      if (navigator.clipboard) navigator.clipboard.writeText(out.value);
      $('#ty-copy-btn').textContent = 'Copied';
      setTimeout(function () { $('#ty-copy-btn').textContent = 'Copy draft'; }, 1500);
    });

    refreshAmountUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
