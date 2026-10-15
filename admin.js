const UNITS = [
  { grp: "dept", label: "Whole-department annual license ($/yr)" },
  { grp: "seat", label: "Per-seat annual price ($/seat/yr)" },
];
const PROFILE_FIELDS = [
  ["role", "Role"], ["institution_type", "Institution type"], ["discipline", "Discipline"],
  ["students_per_year", "Students per year"], ["buying_role", "Buying role"],
  ["owns_headsets", "Owns headsets"], ["intent", "Adoption intent (1–5)"],
];
const $ = (id) => document.getElementById(id);
const money = (v) => (v == null || !isFinite(v) ? "n/a" : "$" + Math.round(v).toLocaleString("en-US"));

let all = [];

function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  Object.assign(n, props || {});
  kids.forEach((k) => n.append(k));
  return n;
}

function setStatus(t, err) {
  $("status").textContent = t;
  $("status").style.color = err ? "#ff8a8a" : "";
}

// ---- Data loading ----
function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x !== "")) rows.push(row);
  const head = rows.shift() || [];
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ""])));
}

function toCSV(rows) {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@]/.test(s) && isNaN(Number(s))) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function setData(rows, where) {
  all = rows;
  setStatus(`Loaded ${rows.length} responses from ${where}.`);
  refreshSegmentValues();
  render();
}

$("load-remote").onclick = async () => {
  const url = $("url").value.trim(), token = $("token").value.trim();
  if (!url) return setStatus("Enter the Apps Script URL.", true);
  try {
    setStatus("Loading…");
    const res = await fetch(`${url}?token=${encodeURIComponent(token)}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    sessionStorage.setItem("sc-admin-url", url);
    setData(json, "Google Sheet");
  } catch (e) {
    setStatus("Could not load: " + e.message, true);
  }
};
$("load-local").onclick = () => setData(JSON.parse(localStorage.getItem("sc-responses") || "[]"), "this browser");
$("csv").onchange = async (e) => {
  const f = e.target.files[0];
  if (f) setData(parseCSV(await f.text()), f.name);
};
$("download").onclick = () => {
  if (!all.length) return setStatus("Nothing to download.", true);
  const a = el("a", { href: URL.createObjectURL(new Blob([toCSV(all)], { type: "text/csv" })), download: "spatial-canvas-responses.csv" });
  a.click();
};
$("demo").onclick = () => {
  const rnd = (m, s) => Math.max(1, m * Math.exp((Math.random() + Math.random() + Math.random() - 1.5) * s));
  const rows = Array.from({ length: 40 }, (_, i) => {
    const dc = rnd(8000, 0.6);
    const d = [dc * 0.5, dc, dc * 1.7, dc * 2.8].map(Math.round);
    const sc = rnd(120, 0.6);
    const s = [sc * 0.4, sc, sc * 1.8, sc * 3].map(Math.round);
    return {
      response_id: "demo" + i, role: "Faculty / instructor", institution_type: "Research university (R1/R2)",
      discipline: ["Physics", "Mechanical / aerospace engineering"][i % 2], students_per_year: "200–499",
      buying_role: "I influence the decision", owns_headsets: "No", intent: String(1 + (i % 5)), seats_needed: String(10 + (i % 7) * 10),
      dept_too_cheap: d[0], dept_cheap: d[1], dept_expensive: d[2], dept_too_expensive: d[3],
      seat_too_cheap: s[0], seat_cheap: s[1], seat_expensive: s[2], seat_too_expensive: s[3],
      src: i % 2 ? "demo-a" : "demo-b", variant: "",
    };
  });
  setData(rows, "generated demo data (not real)");
};

// ---- Filtering ----
function refreshSegmentValues() {
  const f = $("seg-field").value;
  const sel = $("seg-value");
  sel.replaceChildren(el("option", { value: "", textContent: "(all)" }));
  if (f) [...new Set(all.map((r) => r[f]).filter((v) => v !== "" && v != null))].sort().forEach((v) => sel.append(el("option", { value: v, textContent: v })));
}
function filtered() {
  const f = $("seg-field").value, v = $("seg-value").value, mi = Number($("min-intent").value) || 1;
  return all.filter((r) => (!f || !v || String(r[f]) === v) && (Number(r.intent) || 0) >= mi);
}
$("seg-field").onchange = () => { refreshSegmentValues(); render(); };
$("seg-value").onchange = render;
$("min-intent").oninput = render;

// ---- Charts ----
const COLORS = { tooCheap: "#ffb86b", notCheap: "#5ee3b0", notExpensive: "#6ea8ff", tooExpensive: "#ff6b8a" };
const NAMES = { tooCheap: "Too cheap", notCheap: "Not cheap", notExpensive: "Not expensive", tooExpensive: "Too expensive" };

function chart(a, unitLabel) {
  const W = 760, H = 380, m = { l: 52, r: 16, t: 16, b: 44 };
  const c = el("canvas", { width: W * 2, height: H * 2 });
  c.style.width = "100%"; c.style.maxWidth = W + "px";
  const g = c.getContext("2d");
  g.scale(2, 2);
  const P = a.curves.prices, xMax = P[P.length - 1];
  const X = (p) => m.l + (p / xMax) * (W - m.l - m.r);
  const Y = (v) => H - m.b - v * (H - m.t - m.b);
  g.fillStyle = "#0f1424"; g.fillRect(0, 0, W, H);
  g.font = "11px system-ui"; g.fillStyle = "#9aa3c4"; g.strokeStyle = "#242c4a";
  for (let v = 0; v <= 1.001; v += 0.2) {
    g.beginPath(); g.moveTo(m.l, Y(v)); g.lineTo(W - m.r, Y(v)); g.stroke();
    g.textAlign = "right"; g.fillText(Math.round(v * 100) + "%", m.l - 6, Y(v) + 4);
  }
  g.textAlign = "center";
  for (let i = 0; i <= 5; i++) g.fillText(money((xMax * i) / 5), X((xMax * i) / 5), H - m.b + 16);
  g.fillText(unitLabel, (W + m.l) / 2, H - 6);
  Object.keys(COLORS).forEach((k) => {
    g.strokeStyle = COLORS[k]; g.lineWidth = 2; g.beginPath();
    a.curves[k].forEach((v, i) => (i ? g.lineTo(X(P[i]), Y(v)) : g.moveTo(X(P[i]), Y(v))));
    g.stroke();
  });
  const mark = (p, txt, color, dy) => {
    if (p == null) return;
    g.setLineDash([4, 4]); g.strokeStyle = color; g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(p), m.t); g.lineTo(X(p), H - m.b); g.stroke(); g.setLineDash([]);
    g.fillStyle = color; g.textAlign = "center"; g.fillText(`${txt} ${money(p)}`, X(p), m.t + dy);
  };
  mark(a.PMC, "PMC", "#ffb86b", 12);
  mark(a.PME, "PME", "#ff6b8a", 12);
  mark(a.OPP, "OPP", "#e9ecf8", 28);
  mark(a.IPP, "IPP", "#b57bff", 44);
  return c;
}

const median = (xs) => {
  const s = xs.filter((x) => isFinite(x)).sort((a, b) => a - b);
  return s.length ? (s[s.length >> 1] + s[(s.length - 1) >> 1]) / 2 : null;
};

function unitSection(u, rows) {
  const sec = el("section", { className: "card" });
  sec.append(el("h2", { textContent: u.label }));
  const a = VW.analyze(rows.map((r) => VW.pick(r, u.grp)));
  if (!a) { sec.append(el("p", { className: "fine left", textContent: "No coherent responses yet." })); return sec; }
  const k = el("div", { className: "kpis" });
  [["Responses used", a.n + (a.excluded ? ` (${a.excluded} excluded: incomplete/out of order)` : "")],
   ["PMC (marginal cheapness)", money(a.PMC)], ["PME (marginal expensiveness)", money(a.PME)],
   ["Optimal price point (OPP)", money(a.OPP)], ["Indifference price (IPP)", money(a.IPP)]]
    .forEach(([l, v]) => k.append(el("div", {}, el("strong", { textContent: v }), el("span", { textContent: l }))));
  sec.append(k, chart(a, u.label));

  const legend = el("div", { className: "legend" });
  Object.keys(COLORS).forEach((key) => legend.append(el("span", { textContent: NAMES[key], style: `--c:${COLORS[key]}` })));
  sec.append(legend);

  // Demand lookup for NPV: share of respondents who do not consider a price too expensive.
  const rowsOk = rows.map((r) => VW.pick(r, u.grp)).filter(VW.isCoherent);
  const inp = el("input", { type: "number", min: 0, step: "any", value: Math.round(a.PME || 0) });
  const out = el("strong");
  const upd = () => {
    const p = Number(inp.value);
    const ok = rowsOk.filter((r) => +r.too_expensive > p).length / rowsOk.length;
    out.textContent = `${Math.round(ok * 100)}% of respondents`;
  };
  inp.oninput = upd; upd();
  sec.append(el("p", { className: "lookup" }, "Demand lookup (for the NPV model): at a price of $", inp, " /", u.grp === "seat" ? "seat/yr" : "yr", ", ", out, " would not call it too expensive."));
  return sec;
}

function render() {
  const rows = filtered();
  const sum = $("summary");
  sum.replaceChildren();
  const seats = rows.map((r) => Number(r.seats_needed)).filter((x) => x > 0);
  const hi = rows.filter((r) => Number(r.intent) >= 4).length;
  [["Responses (after filter)", rows.length + (rows.length < 30 ? "  (goal: 30+)" : "")],
   ["Likely adopters (intent 4–5)", rows.length ? Math.round((hi / rows.length) * 100) + "%" : "n/a"],
   ["Median seats needed", seats.length ? Math.round(median(seats)) : "n/a"],
   ["Total seats stated", seats.reduce((a, b) => a + b, 0)]]
    .forEach(([l, v]) => sum.append(el("div", {}, el("strong", { textContent: v }), el("span", { textContent: l }))));

  const prof = $("profile");
  prof.replaceChildren();
  PROFILE_FIELDS.forEach(([f, label]) => {
    const counts = {};
    rows.forEach((r) => { const v = r[f]; if (v !== "" && v != null) counts[v] = (counts[v] || 0) + 1; });
    const ul = el("ul");
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([v, n]) => ul.append(el("li", { textContent: `${v}: ${n}` })));
    prof.append(el("div", {}, el("h4", { textContent: label }), ul));
  });

  const wrap = $("vw-wrap");
  wrap.replaceChildren(...UNITS.map((u) => unitSection(u, rows)));
}

$("url").value = sessionStorage.getItem("sc-admin-url") || "";
render();
