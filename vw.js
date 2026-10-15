// Van Westendorp Price Sensitivity Meter math. Pure functions, used by admin.js (and testable in Node).
//
// Curves, as a function of price p (each is the share of respondents, 0..1):
//   tooCheap(p)      = share whose "too cheap" answer >= p       (falling)
//   notCheap(p)      = share whose "bargain" answer   <  p       (rising)   = 1 - cheap
//   notExpensive(p)  = share whose "expensive" answer >= p       (falling)  = 1 - expensive
//   tooExpensive(p)  = share whose "too expensive" answer <= p   (rising)
//
// Definitions used here (Van Westendorp 1976):
//   PMC = intersection of "too cheap"      and "not cheap"      (i.e. "expensive-side" of bargain)
//   PME = intersection of "too expensive"  and "not expensive"
//   OPP = intersection of "too cheap"      and "too expensive"
//   IPP = intersection of "not cheap"      and "not expensive"
// Acceptable range = PMC .. PME.
(function (root) {
  const KEYS = ["too_cheap", "cheap", "expensive", "too_expensive"];

  // A response is coherent if too_cheap <= cheap <= expensive <= too_expensive. Incoherent rows are excluded.
  function isCoherent(r) {
    const v = KEYS.map((k) => Number(r[k]));
    if (v.some((x) => !isFinite(x) || x < 0)) return false;
    return v[0] <= v[1] && v[1] <= v[2] && v[2] <= v[3];
  }

  function curves(rows, steps) {
    const data = rows.filter(isCoherent).map((r) => ({
      tc: +r.too_cheap, c: +r.cheap, e: +r.expensive, te: +r.too_expensive,
    }));
    const n = data.length;
    if (!n) return null;
    const max = Math.max(...data.map((d) => d.te));
    const N = steps || 400;
    const prices = [];
    const out = { prices, tooCheap: [], notCheap: [], notExpensive: [], tooExpensive: [], n };
    for (let i = 0; i <= N; i++) {
      const p = (max * 1.1 * i) / N;
      prices.push(p);
      out.tooCheap.push(data.filter((d) => d.tc >= p).length / n);
      out.notCheap.push(data.filter((d) => d.c < p).length / n);
      out.notExpensive.push(data.filter((d) => d.e >= p).length / n);
      out.tooExpensive.push(data.filter((d) => d.te <= p).length / n);
    }
    return out;
  }

  // First crossing of two sampled curves, linearly interpolated.
  function intersect(prices, a, b) {
    for (let i = 1; i < prices.length; i++) {
      const d0 = a[i - 1] - b[i - 1];
      const d1 = a[i] - b[i];
      if (d0 === 0) return prices[i - 1];
      if (d0 * d1 < 0) {
        const t = d0 / (d0 - d1);
        return prices[i - 1] + t * (prices[i] - prices[i - 1]);
      }
    }
    return null;
  }

  function analyze(rows) {
    const c = curves(rows);
    if (!c) return null;
    return {
      n: c.n,
      excluded: rows.length - c.n,
      curves: c,
      PMC: intersect(c.prices, c.tooCheap, c.notCheap),
      PME: intersect(c.prices, c.tooExpensive, c.notExpensive),
      OPP: intersect(c.prices, c.tooCheap, c.tooExpensive),
      IPP: intersect(c.prices, c.notCheap, c.notExpensive),
    };
  }

  // Map a flat survey row (dept_too_cheap, seat_cheap, ...) to the 4-key shape for a pricing unit.
  function pick(row, grp) {
    const o = {};
    KEYS.forEach((k) => (o[k] = row[grp + "_" + k]));
    return o;
  }

  const api = { KEYS, isCoherent, curves, intersect, analyze, pick };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.VW = api;
})(typeof window !== "undefined" ? window : globalThis);
