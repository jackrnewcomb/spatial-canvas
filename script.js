// Set after deploying apps-script/Code.gs (see README.md). Leave empty to store responses in this browser only.
const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbwZlBxM_Vf4g7-JB8jy9XWBHhCbO_DHzLQJnhSuQJ-ox68O8ZxGli_Kq__poFFU06qN/exec";

document.getElementById("yr").textContent = new Date().getFullYear();

const form = document.getElementById("survey-form");
const msg = document.getElementById("form-msg");
const params = new URLSearchParams(location.search);

function fail(text, el) {
  msg.className = "err";
  msg.textContent = text;
  if (el) el.focus();
}

// Ordering check: too cheap <= bargain <= expensive <= too expensive, per pricing unit.
function checkGroup(grp, label) {
  const v = ["too_cheap", "cheap", "expensive", "too_expensive"].map((k) => form.elements[grp + "_" + k]);
  const n = v.map((el) => Number(el.value));
  for (let i = 0; i < 3; i++) {
    if (n[i] > n[i + 1]) {
      fail(`${label}: prices should rise from "so cheap I'd doubt it" to "too expensive". Please check your answers.`, v[i + 1]);
      return false;
    }
  }
  return true;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "";
  msg.textContent = "";
  if (form.elements.website.value) return; // honeypot
  if (!form.checkValidity()) {
    fail("Please complete the required fields.", form.querySelector(":invalid"));
    return;
  }
  if (!checkGroup("dept", "Department license") || !checkGroup("seat", "Per seat")) return;

  const data = Object.fromEntries(new FormData(form));
  delete data.website;
  data.submitted_at = new Date().toISOString();
  data.src = params.get("src") || ""; // e.g. ?src=linkedin or ?src=prof-smith to track channels
  data.variant = params.get("v") || ""; // optional label for test variants
  data.response_id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random());

  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    if (SHEET_ENDPOINT) {
      // text/plain avoids a CORS preflight, which Apps Script web apps don't answer.
      await fetch(SHEET_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data),
      });
    } else {
      const all = JSON.parse(localStorage.getItem("sc-responses") || "[]");
      all.push(data);
      localStorage.setItem("sc-responses", JSON.stringify(all));
    }
    form.reset();
    msg.textContent = "Thank you! Your answers have been recorded.";
  } catch {
    fail("Something went wrong. Please try again.");
  } finally {
    btn.disabled = false;
  }
});
