// v44: a friend's view of a shared tab (index.html). v158: its own file, so the page's Content-Security-Policy runs
// only scripts from this site — a name or note someone wrote can't run as code even if one slipped past `esc`.
(() => {
  const cfg = window.COHABIT || {};
  // v98: no placeholder download link (it led nowhere) — the same check as the invite page
  const getApp = cfg.getAppUrl && cfg.getAppUrl.indexOf("XXXXXXXX") < 0 ? cfg.getAppUrl : null;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const token = (new URLSearchParams(location.hash.replace(/^#/, "")).get("t") || "").trim();
  const app = document.getElementById("app");
  const colors = ["#F06A6A", "#2AB3A6", "#3B82F6", "#F0A43A", "#E25CA4", "#3FB950", "#8B5CF6", "#38BDF8"];
  let state = null, editing = null;

  const money = (c) => (c < 0 ? "-" : "") + "$" + (Math.abs(c) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const whole = (c) => "$" + Math.round(Math.abs(c) / 100).toLocaleString("en-US");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const dateShort = (iso) => { const d = new Date(iso + "T12:00:00"); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };   // never the raw text: it goes into HTML
  const toast = (m) => { const t = document.getElementById("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };

  async function call(body) {
    const res = await fetch(cfg.functionsUrl.replace(/\/$/, "") + "/tab-guest", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...body }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || "Something went wrong.");
    return json;
  }

  function name(id) { const m = state.members.find((m) => m.id === id); return m ? (m.id === state.you ? "You" : m.name) : "someone"; }
  function nameOf(id) { const m = state.members.find((m) => m.id === id); return m ? m.name : "someone"; }
  function av(m, i) { return `<div class="av" style="background:${colors[i % colors.length]}">${esc(m.name.slice(0, 1).toUpperCase())}</div>`; }

  function render() {
    if (!state) return;
    const you = state.you;
    const mine = state.pairs.filter((p) => p.from === you || p.to === you);
    const others = state.pairs.filter((p) => p.from !== you && p.to !== you);
    const owe = mine.filter((p) => p.from === you).reduce((n, p) => n + p.amountCents, 0);
    const owed = mine.filter((p) => p.to === you).reduce((n, p) => n + p.amountCents, 0);
    const net = owed - owe;
    const finished = state.tab.isArchived;
    // v69: where you stand, big — then each person, with a way to settle
    const hero = mine.length
      ? `<div class="hero"><div class="k">${net < 0 ? "You owe" : net > 0 ? "You’re owed" : "Even, overall"}</div><div class="v">${money(Math.abs(net))}</div>
           <div class="l">${owe && owed ? `You owe ${money(owe)} and you’re owed ${money(owed)}. Each is settled with its own person.`
             : mine.length === 1 ? (mine[0].from === you ? "to " + esc(nameOf(mine[0].to)) : "from " + esc(nameOf(mine[0].from))) : "across " + mine.length + " people on the tab"}</div></div>`
      : `<div class="card"><div class="square"><b>You’re square</b><span class="line">Nothing owed either way on ${esc(state.tab.name)}.</span></div></div>`;
    const balanceRows = mine.map((p, i) => {
      const iOwe = p.from === you;
      const who = iOwe ? p.to : p.from;
      // v103: Remind someone who owes you — a push when they have Cohabit, else a message you send
      const remind = iOwe ? "" : `<button class="pill" data-remind="${i}">Remind</button>`;
      const btn = finished ? "" : `<div class="acts">${remind}<button class="pill${iOwe ? " filled" : ""}" data-settle="${i}">${iOwe ? "I paid" : "Got it"}</button></div>`;
      return `<div class="row"><div class="t"><div class="title">${iOwe ? "You owe " + esc(nameOf(who)) : esc(nameOf(who)) + " owes you"}</div>
              <div class="line">${iOwe && state.pay && state.pay[who] ? "Pay in one tap" : iOwe ? "Pay them however you usually do" : "Once they’ve paid you"}</div></div>
              <div class="amt ${iOwe ? "over" : "good"}">${money(p.amountCents)}</div>${btn}</div>`;
    }).join("");
    const lastPaid = (state.settleUps || []).slice(-1)[0];
    const paidRows = (state.settleUps || []).slice().reverse().map((x) =>
      `<div class="row"><div class="t"><div class="title">${esc(name(x.from))} paid ${esc(x.to === you ? "you" : nameOf(x.to))}</div>
         <div class="line">${dateShort(x.date)}${x.mine ? " · you recorded it" : ""}</div></div><div class="amt">${money(x.amountCents)}</div>
         ${x.mine && !finished && lastPaid && x.id === lastPaid.id ? `<button class="pill" data-unsettle="${esc(x.id)}">Take back</button>` : ""}</div>`).join("");
    const otherRows = others.map((p) => `<div class="row"><div class="t"><div class="title">${esc(nameOf(p.from))} owes ${esc(nameOf(p.to))}</div></div><div class="amt">${money(p.amountCents)}</div></div>`).join("");
    // Finished, or someone has already settled up: the expenses are fixed (the app's rule too).
    // v102: an ongoing tab goes on after a settle-up — only what a settle-up covered is fixed.
    const ongoing = state.tab.kind === "ongoing";
    const locked = state.tab.isArchived || (!ongoing && (state.settleUps || []).length > 0);
    const expenseRows = state.expenses.length ? state.expenses.map((x) => {
      const share = x.parts[you] || 0;
      const line = `${esc(name(x.paidBy))} paid · ${dateShort(x.date)}` + (x.card ? " · from their card" : "") + (share ? ` · your share ${money(share)}` : "") + (x.fixed ? " · settled" : "") + (x.note ? ` · ${esc(x.note)}` : "");
      // v86: one added from a card in the app changes there
      const btn = x.mine && !locked && !x.fixed && !x.card ? `<button class="pill" data-edit="${esc(x.id)}">Edit</button>` : "";
      return `<div class="row"><div class="t"><div class="title">${esc(x.title)}${x.mine ? '<span class="you">yours</span>' : ""}</div><div class="line">${line}</div></div><div class="amt">${money(x.amountCents)}</div>${btn}</div>`;
    }).join("") : `<div class="empty">Nothing on the tab yet.</div>`;
    // v102: a friend who is a couple counts as two in an even split
    const members = state.members.map((m, i) => `<div class="row">${av(m, i)}<div class="t"><div class="title">${esc(m.name)}${m.id === you ? '<span class="you">you</span>' : ""}</div><div class="line">${m.inHousehold ? "Cohabit" : "Friend"}${m.people > 1 ? " · " + m.people + " people" : ""}</div></div></div>`).join("");
    app.innerHTML = `
      <div class="eyebrow">${esc(state.household)}’s tab</div>
      <h1>${esc(state.tab.name)}</h1>
      ${ongoing ? `<p class="sub">Ongoing. Settle any time.</p>` : state.tab.dates ? `<p class="sub">${esc(state.tab.dates)}</p>` : ""}
      ${hero}
      ${mine.length ? `<div class="eyebrow">Settle</div><div class="card">${balanceRows}</div>` : ""}
      ${otherRows ? `<div class="eyebrow">Between the others</div><div class="card">${otherRows}</div>` : ""}
      <div class="eyebrow">Expenses</div>
      <div class="card">${expenseRows}</div>
      ${state.tab.isArchived ? `<p class="hint">This tab is finished.</p>` : locked ? `<p class="hint">People have settled up, so the expenses are fixed.</p>` : `<div style="margin-top:12px"><button class="primary" id="add">+ Add what you paid</button></div>`}
      ${paidRows ? `<div class="eyebrow">Payments</div><div class="card">${paidRows}</div>` : ""}
      <div class="eyebrow">Who’s on it</div>
      <div class="card">${members}</div>
      ${ios ? `<div class="cta">
        <h3>Have Cohabit?</h3>
        <p>Open ${esc(state.tab.name)} in the app. It joins your Group tabs, you’ll hear when something changes, and you can add your own card charges to it. Only your part counts in your budget.</p>
        <a class="primary" href="cohabit://tab/${esc(token)}">Open in Cohabit</a>
        ${getApp ? `<div class="steps"><b>New to Cohabit?</b> <a href="${esc(getApp)}" id="getApp" style="color:var(--brand-ink);font-weight:800;text-decoration:none">Get the app</a>, sign up, then come back to this link and tap Open in Cohabit to land on ${esc(state.tab.name)}. We copy the link for you, so you can also paste it in Cohabit under Settle → Group tabs → Join with a link.</div>` : ""}
      </div>` : `<div class="cta">
        <h3>${mine.length ? "Tabs like this, without the chasing" : "You’re all square."}</h3>
        <p>Cohabit splits the bills with the people you live with, and keeps tabs like ${esc(state.tab.name)} with friends. It never moves your money. Free on iPhone.</p>
        ${getApp ? `<a class="ghost-link" href="${esc(getApp)}" id="getApp">Get Cohabit</a>` : ""}
      </div>`}`;
    document.title = state.tab.name + " · Cohabit";
    // v98: the link goes with them to the App Store, so the app can take them straight to the tab
    document.getElementById("getApp")?.addEventListener("click", () => {
      try { navigator.clipboard && navigator.clipboard.writeText(location.href); } catch (e) {}
    });
    document.getElementById("add")?.addEventListener("click", () => openForm(null));
    app.querySelectorAll("[data-settle]").forEach((b) => b.addEventListener("click", () => openPay(mine[Number(b.dataset.settle)])));
    app.querySelectorAll("[data-remind]").forEach((b) => b.addEventListener("click", () => remind(mine[Number(b.dataset.remind)])));
    app.querySelectorAll("[data-unsettle]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Take back this payment?")) return;
      try { state = await call({ action: "unsettle", settleUpId: b.dataset.unsettle }); render(); toast("Taken back"); } catch (e) { toast(e.message); }
    }));
    app.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(state.expenses.find((x) => x.id === b.dataset.edit))));
  }

  // v103: a reminder — the server pushes it when it can (once a day for them on this tab); else your own message
  async function remind(p) {
    if (!p) return;
    try {
      const r = await call({ action: "remind", from: p.from });
      state = r; render();
      if (r.remind === "sent") return toast("Reminded " + nameOf(p.from));
      if (r.remind === "already today") return toast("Already reminded today. Try again tomorrow.");
      const text = `A reminder about ${state.tab.name}: you owe me ${money(p.amountCents)}.`;
      if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
      try { await navigator.clipboard.writeText(text); toast("Copied. Send it to " + nameOf(p.from) + "."); } catch (e) { toast(text); }
    } catch (e) { toast(e.message); }
  }

  const dlg = document.getElementById("dlg"), form = document.getElementById("form");
  const f = (id) => document.getElementById(id);
  function openForm(x) {
    editing = x;
    f("dlgTitle").textContent = x ? "Edit expense" : "New expense";
    f("fTitle").value = x ? x.title : "";
    f("fAmount").value = x ? (x.amountCents / 100).toFixed(2) : "";
    f("fPaid").innerHTML = state.members.map((m) => `<option value="${esc(m.id)}"${(x ? x.paidBy : state.you) === m.id ? " selected" : ""}>${esc(m.id === state.you ? "Me" : m.name)}</option>`).join("");
    // today where they are (toISOString is UTC: an evening in the US read as tomorrow)
    const now = new Date(), pad = (n) => String(n).padStart(2, "0");
    f("fDate").value = x ? x.date : `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    f("fNote").value = x && x.note ? x.note : "";
    f("fDelete").style.display = x ? "" : "none";
    // a changed amount is split again among the same people (all of them, for a new one)
    const n = x ? Object.keys(x.parts || {}).length : state.members.length;
    // v102: by people — a friend who is a couple takes two shares
    const couples = state.members.some((m) => m.people > 1);
    f("fHint").textContent = (n === state.members.length ? "Split evenly between everyone on the tab." : `Split evenly between the ${n} on it.`) + (couples ? " A couple counts as two." : "");
    dlg.showModal();
    setTimeout(() => f("fTitle").focus(), 50);
  }
  f("fCancel").addEventListener("click", () => dlg.close());
  f("fDelete").addEventListener("click", async () => {
    if (!editing || !confirm("Remove this expense from the tab?")) return;
    try { state = await call({ action: "delete", expenseId: editing.id }); dlg.close(); render(); toast("Removed"); } catch (e) { toast(e.message); }
  });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const cents = Math.round(parseFloat(String(f("fAmount").value).replace(/[^0-9.]/g, "")) * 100);
    if (!cents || cents <= 0) { toast("Enter an amount"); return; }
    const body = { title: f("fTitle").value, amountCents: cents, paidBy: f("fPaid").value, date: f("fDate").value, note: f("fNote").value };
    f("fSave").disabled = true;
    try {
      state = await call(editing ? { action: "edit", expenseId: editing.id, ...body } : { action: "add", ...body });
      dlg.close(); render(); toast(editing ? "Saved" : "Added");
    } catch (e) { toast(e.message); } finally { f("fSave").disabled = false; }
  });

  // v69: settling up — your own payment, or one paid to you; pay links when the person has them
  const pay = document.getElementById("pay"), payForm = document.getElementById("payForm");
  let paying = null;
  const payUrl = (app, handle, cents, note) => {
    const amt = (cents / 100).toFixed(2), n = encodeURIComponent(note);
    if (app === "venmo") return `https://venmo.com/${encodeURIComponent(handle)}?txn=pay&amount=${amt}&note=${n}`;
    if (app === "cashtag") return `https://cash.app/$${encodeURIComponent(handle)}/${amt}`;
    return `https://paypal.me/${encodeURIComponent(handle)}/${amt}USD`;
  };
  function openPay(p) {
    paying = p;
    const iOwe = p.from === state.you, other = iOwe ? p.to : p.from;
    f("payTitle").textContent = iOwe ? `Pay ${nameOf(other)}` : `${nameOf(other)} paid you?`;
    f("payLine").textContent = iOwe ? `You owe ${money(p.amountCents)} on ${state.tab.name}.` : `They owe you ${money(p.amountCents)} on ${state.tab.name}. Record what they paid.`;
    const h = iOwe && state.pay ? state.pay[other] : null;
    const names = { venmo: "Venmo", cashtag: "Cash App", paypal: "PayPal" };
    // the links carry the amount in the box, as it's changed
    const links = (cents) => h ? Object.keys(names).filter((k) => h[k]).map((k) =>
      `<a class="pill" target="_blank" rel="noopener" href="${esc(payUrl(k, h[k], cents, state.tab.name))}">${names[k]}</a>`).join("") : "";
    f("payApps").innerHTML = links(p.amountCents);
    f("pAmount").oninput = () => {
      const c = Math.round(parseFloat(String(f("pAmount").value).replace(/[^0-9.]/g, "")) * 100);
      if (c > 0) f("payApps").innerHTML = links(c);
    };
    f("payHint").textContent = iOwe
      ? (h ? "Opens their app with the amount. Then record it here so the tab knows." : "Pay however you usually do, then record it here so the tab knows. Cohabit never moves money.")
      : "Only once the money’s with you. It comes off what they owe.";
    f("pAmount").value = (p.amountCents / 100).toFixed(2);
    f("pSave").textContent = iOwe ? "I’ve paid" : "They’ve paid";
    pay.showModal();
  }
  f("pCancel").addEventListener("click", () => pay.close());
  payForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!paying) return;
    const cents = Math.round(parseFloat(String(f("pAmount").value).replace(/[^0-9.]/g, "")) * 100);
    if (!cents || cents <= 0) { toast("Enter an amount"); return; }
    f("pSave").disabled = true;
    try {
      state = await call({ action: "settle", from: paying.from, to: paying.to, amountCents: cents });
      pay.close(); render();
      const square = !state.pairs.some((p) => p.from === state.you || p.to === state.you);
      toast(square ? "Recorded. You’re square." : "Recorded");
    } catch (e) { toast(e.message); } finally { f("pSave").disabled = false; }
  });

  async function load() {
    if (!token) { app.innerHTML = `<p class="empty">This link is missing its key. Ask for it again.</p>`; return; }
    if (!cfg.functionsUrl || cfg.functionsUrl.includes("YOUR_PROJECT_REF")) { app.innerHTML = `<p class="empty">This page isn’t set up yet (web/tab/config.js).</p>`; return; }
    try { state = await call({ action: "view" }); render(); }
    catch (e) { app.innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
  }
  load();
  document.addEventListener("visibilitychange", () => { if (!document.hidden && state) load(); });
})();
