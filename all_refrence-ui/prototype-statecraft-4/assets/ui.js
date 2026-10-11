/* Shared UI helpers for the Statecraft prototype: flags, portraits, number formats, count-up, sound, toasts,
   and plain-language text for engine cause labels (the Why chain). Exposes window.SCUI. */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NAMES = { IND: "India", CHN: "China", USA: "United States", RUS: "Russia", SAU: "Saudi Arabia", JPN: "Japan" };
  const SHORT = { IND: "India", CHN: "China", USA: "USA", RUS: "Russia", SAU: "Saudi Arabia", JPN: "Japan" };
  const SEAT = { IND: "#E57A3A", CHN: "#D14D72", USA: "#3F63D8", RUS: "#5E6B70", SAU: "#2FA36B", JPN: "#7A4FD0" };
  const SEAT_HEX = { IND: 0xe57a3a, CHN: 0xd14d72, USA: 0x3f63d8, RUS: 0x5e6b70, SAU: 0x2fa36b, JPN: 0x7a4fd0 };
  const LEADERS = { IND: "Asha Rao", CHN: "Li Wen", USA: "Dana Brooks", RUS: "Pavel Orlov", SAU: "Faisal Al-Amin", JPN: "Hana Mori" };

  const FLAGS = {
    IND: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67" fill="#FF9933"/><rect y="13.33" width="30" height="6.67" fill="#138808"/><circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" stroke-width=".8"/></svg>',
    CHN: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#DE2910"/><polygon points="5,2.5 5.9,5.2 8.7,5.2 6.4,6.9 7.3,9.6 5,7.9 2.7,9.6 3.6,6.9 1.3,5.2 4.1,5.2" fill="#FFDE00"/><circle cx="10" cy="2.5" r=".7" fill="#FFDE00"/><circle cx="12" cy="4.5" r=".7" fill="#FFDE00"/><circle cx="12" cy="7.3" r=".7" fill="#FFDE00"/><circle cx="10" cy="9.3" r=".7" fill="#FFDE00"/></svg>',
    USA: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><g fill="#B22234"><rect width="30" height="1.54"/><rect y="3.08" width="30" height="1.54"/><rect y="6.15" width="30" height="1.54"/><rect y="9.23" width="30" height="1.54"/><rect y="12.3" width="30" height="1.54"/><rect y="15.4" width="30" height="1.54"/><rect y="18.46" width="30" height="1.54"/></g><rect width="12.6" height="10.77" fill="#3C3B6E"/></svg>',
    RUS: '<svg viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0039A6"/><rect y="13.33" width="30" height="6.67" fill="#D52B1E"/></svg>',
    SAU: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#006C35"/><rect x="7" y="7" width="16" height="2.2" rx="1" fill="#fff"/><rect x="8" y="12" width="14" height="1.2" fill="#fff"/></svg>',
    JPN: '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#BC002D"/></svg>',
  };
  const flag = (iso, cls = "") => `<span class="flag ${cls}" role="img" aria-label="${NAMES[iso]} flag">${FLAGS[iso]}</span>`;

  /** Illustrated portrait styles (8). Simple flat busts on paper colours. */
  const PORTRAIT_BG = ["#E9DCC6", "#D9E4EA", "#E7D3D8", "#D8E6D6", "#E6E0F0", "#F0E2C9", "#DCE0E4", "#EAD9CF"];
  const PORTRAIT_SKIN = ["#8D5A3B", "#C68E63", "#E1B48B", "#6B4630", "#F1C9A5", "#A86E4A", "#D59F7A", "#7A5039"];
  const PORTRAIT_HAIR = ["#1B1B1B", "#3B2A20", "#7B7B7B", "#2B1B12", "#C9C3B6", "#4A3326", "#111", "#5A4636"];
  function portrait(i = 0, seat = "#5E6B70", size = 34) {
    const k = ((i % 8) + 8) % 8;
    const svg = `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="${PORTRAIT_BG[k]}"/><path d="M6 40c1-9 7-13 14-13s13 4 14 13z" fill="${seat}"/><circle cx="20" cy="17" r="8" fill="${PORTRAIT_SKIN[k]}"/><path d="${k % 2 ? "M11.5 16c0-6 4-9.5 8.5-9.5s8.5 3.5 8.5 9.5c-2-3-5-4.5-8.5-4.5S13.5 13 11.5 16z" : "M12 15c1-5 4.5-7.5 8-7.5s7 2.5 8 7.5c-3-1.5-5-3.5-8-3.5s-5 2-8 3.5z"}" fill="${PORTRAIT_HAIR[k]}"/></svg>`;
    return `<span class="portrait" style="--seat:${seat};width:${size}px;height:${size}px">${svg}</span>`;
  }

  // ── number formats ──
  const money = (b) => (Math.abs(b) >= 1000 ? `$${(b / 1000).toFixed(b >= 10000 ? 1 : 2)}T` : `$${Math.round(b)}B`);
  const pct = (x, d = 1) => `${x.toFixed(d)}%`;
  const signed = (x, d = 1) => `${x > 0 ? "+" : x < 0 ? "−" : "±"}${Math.abs(x).toFixed(d)}`;
  const deltaHtml = (x, { d = 1, invert = false, unit = "" } = {}) => {
    if (Math.abs(x) < Math.pow(10, -d) / 2) return `<span class="delta flat">±0${unit}</span>`;
    const good = invert ? x < 0 : x > 0;
    return `<span class="delta ${good ? "up" : "down"}">${x > 0 ? "▲" : "▼"} ${Math.abs(x).toFixed(d)}${unit}</span>`;
  };

  function countUp(el, to, { from = 0, duration = 900, format = (v) => Math.round(v).toString() } = {}) {
    if (reduce) {
      el.textContent = format(to);
      return;
    }
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = format(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ── sound: tiny synthesized cues, on by default at low volume (F-5) ──
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem("sc-muted") === "1"; } catch (e) {}
  function tone(freqs, { dur = 0.12, type = "sine", vol = 0.05, gap = 0.06 } = {}) {
    if (muted) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = f;
        const t = ctx.currentTime + i * gap;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + dur + 0.02);
      });
    } catch (e) {}
  }
  const sound = {
    click: () => tone([660], { dur: 0.05, type: "triangle", vol: 0.03 }),
    place: () => tone([520, 780], { dur: 0.09, type: "triangle", vol: 0.035 }),
    lock: () => tone([180, 120], { dur: 0.18, type: "square", vol: 0.025, gap: 0.05 }),
    chime: () => tone([784, 988, 1319], { dur: 0.35, vol: 0.035, gap: 0.08 }),
    knock: () => tone([300, 300], { dur: 0.07, type: "triangle", vol: 0.04, gap: 0.12 }),
    rank: () => tone([523, 659, 784, 1047], { dur: 0.3, vol: 0.04, gap: 0.07 }),
    flip: () => tone([400], { dur: 0.06, type: "triangle", vol: 0.025 }),
    get muted() { return muted; },
    set muted(v) { muted = v; try { localStorage.setItem("sc-muted", v ? "1" : "0"); } catch (e) {} },
  };

  function toast(text) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      wrap.setAttribute("aria-live", "polite");
      document.body.appendChild(wrap);
    }
    while (wrap.children.length >= 2) wrap.firstChild.remove();
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  // ── plain language for cause labels (Why chain) ──
  const MIN = { industry: "Industry & Jobs", infrastructure: "Infrastructure", agriculture: "Agriculture", energy: "Energy", education: "Education", welfare: "Health & Welfare", defence: "Defence" };
  function causeText(c, card) {
    const L = c.label;
    const [iso, ...rest] = c.field.split(".");
    const field = rest.join(".");
    if (L === "treaty.flow") return `Supply pact with ${SHORT[c.actor] || "a partner"}`;
    if (L === "treaty.supply") return `${SHORT[c.actor]} delivered under your pact`;
    if (L === "sanctions.delay") return "Sanctions delayed part of the delivery";
    if (L === "market.buy") return "Bought on the world market";
    if (L === "reserve.draw") return "Drew on strategic reserves";
    if (L.startsWith("goods.") && L.endsWith(".supply")) return `${cap(field.split(".")[0])} supply ${c.delta >= 0 ? "up" : "down"} ${Math.abs(c.delta).toFixed(1)} pts`;
    if (L.startsWith("growth.short.")) return `${cap(L.split(".")[2])} shortage ${c.delta < 0 ? "held back" : "stopped holding back"} growth`;
    if (L === "growth.potential") return "Skills, infrastructure and industry";
    if (L === "growth.fiscal") return "Budget stimulus";
    if (L === "growth.trade") return "World prices for what you buy and sell";
    if (L === "growth.investment") return "Foreign investment";
    if (L === "growth.sanctions") return "Sanctions on your economy";
    if (L === "growth.tension") return "Markets fear the world tension";
    if (L === "growth.unrest") return "Unrest at home";
    if (L === "growth.world") return "The world economy";
    if (L === "macro.growth") return "Economic growth";
    if (L === "macro.okun") return "Growth vs. jobs needed (Okun's law)";
    if (L === "inflation.energy") return "Energy prices";
    if (L === "inflation.food") return "Food prices";
    if (L === "stability.jobs") return "Jobs";
    if (L === "stability.prices") return "Prices";
    if (L === "stability.shortages") return "Shortages";
    if (L === "budget.revenue") return "Tax revenue";
    if (L === "budget.ministries") return "Ministry spending";
    if (L === "budget.interest") return "Interest on debt";
    if (L === "budget.taxUp") return "Tax rise";
    if (L.startsWith("budget.")) return `Budget: ${MIN[L.split(".")[1]] || L.split(".")[1]}`;
    if (L === "goods.exportRent") return "Export earnings to the treasury";
    if (L === "goods.tariffRevenue") return "Tariff revenue";
    if (L === "diplomacy.influence") return "Relations, treaties and regions";
    if (L === "treaty.signed") return "Treaty signed";
    if (L === "treaty.broken") return "Broken promise";
    if (L.startsWith("project.start.")) return "Project instalment";
    if (L.startsWith("project.")) return `Project: ${card ? card(L.slice(8)) : L.slice(8)}`;
    if (L.startsWith("event.")) return "World event";
    if (L.startsWith("crisis.")) return "Your crisis decision";
    if (L.startsWith("card.cost.")) return "Card cost";
    if (L.startsWith("card.") || L.includes(".")) {
      const id = L.startsWith("card.") ? null : L;
      return card ? card(id || L) : L;
    }
    return L;
  }
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

  window.SCUI = { NAMES, SHORT, SEAT, SEAT_HEX, LEADERS, flag, portrait, money, pct, signed, deltaHtml, countUp, sound, toast, causeText, reduce, cap };
})();
