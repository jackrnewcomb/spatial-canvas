// Set to a Formspree (or similar) endpoint to collect leads, e.g. "https://formspree.io/f/xxxxxxx".
// Left empty, submissions are only stored in this browser's localStorage (useful for local testing).
const FORM_ENDPOINT = "";

const PLAN_PRICES = { Classroom: 2500, Department: 12000, Campus: 12000 };
const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");

document.getElementById("yr").textContent = new Date().getFullYear();

// Savings calculator (illustrative, uses Department plan price)
const equip = document.getElementById("calc-equip");
const students = document.getElementById("calc-students");
function updateCalc() {
  const cost = PLAN_PRICES.Department;
  const s = Math.max(1, Number(students.value) || 1);
  document.getElementById("calc-cost").textContent = fmt(cost);
  document.getElementById("calc-per").textContent = fmt(cost / s);
  document.getElementById("calc-equip-out").textContent = fmt(Number(equip.value) || 0);
}
equip.addEventListener("input", updateCalc);
students.addEventListener("input", updateCalc);
updateCalc();

// Pre-select plan when a pricing button is clicked
document.querySelectorAll("[data-plan]").forEach((el) =>
  el.addEventListener("click", () => {
    document.getElementById("plan-select").value = el.dataset.plan;
  })
);

// Lead form
const form = document.getElementById("lead-form");
const msg = document.getElementById("form-msg");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "";
  if (!form.checkValidity()) {
    msg.className = "err";
    msg.textContent = "Please fill in your name, a valid email, and your university.";
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  data.submittedAt = new Date().toISOString();
  try {
    if (FORM_ENDPOINT) {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Request failed");
    } else {
      const all = JSON.parse(localStorage.getItem("sc-leads") || "[]");
      all.push(data);
      localStorage.setItem("sc-leads", JSON.stringify(all));
    }
    form.reset();
    msg.textContent = "Thanks! We'll be in touch shortly.";
  } catch {
    msg.className = "err";
    msg.textContent = "Something went wrong. Please try again.";
  }
});
