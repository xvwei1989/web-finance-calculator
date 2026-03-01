const $ = (id) => document.getElementById(id);

function toNumber(v) {
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : NaN;
}

function money(n) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function pct(n) {
  if (!Number.isFinite(n)) return '—';
  return (n * 100).toFixed(2) + '%';
}

function setTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = {
    compound: $('panel-compound'),
    loan: $('panel-loan'),
    cagr: $('panel-cagr'),
    npv: $('panel-npv'),
    xirr: $('panel-xirr'),
    inflation: $('panel-inflation'),
    tax: $('panel-tax'),
  };

  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.remove('active'));
      tabs.forEach((x) => x.setAttribute('aria-selected', 'false'));
      t.classList.add('active');
      t.setAttribute('aria-selected', 'true');
      Object.values(panels).forEach((p) => p.classList.remove('active'));
      panels[t.dataset.tab].classList.add('active');
    });
  });
}

function calcCompound() {
  const P = toNumber($('ci-principal').value);
  const PMT = toNumber($('ci-monthly').value);
  const r = toNumber($('ci-rate').value) / 100;
  const years = toNumber($('ci-years').value);
  const n = toNumber($('ci-compounds').value);

  const out = $('ci-result');
  out.innerHTML = '';

  if (![P, PMT, r, years, n].every(Number.isFinite) || n <= 0 || years < 0) {
    out.textContent = 'Please enter valid inputs.';
    return;
  }

  const t = years;
  const rn = r / n;
  const nt = n * t;

  const growth = Math.pow(1 + rn, nt);
  const fvPrincipal = P * growth;

  let fvContrib = 0;
  if (r === 0) {
    fvContrib = PMT * (12 * t);
  } else {
    // monthly contribution assumed to align with compounding frequency when n=12.
    // We approximate by converting monthly to per-compound contributions.
    const contribPerPeriod = PMT * (12 / n);
    fvContrib = contribPerPeriod * ((growth - 1) / rn);
  }

  const fv = fvPrincipal + fvContrib;
  const invested = P + PMT * (12 * t);
  const gain = fv - invested;

  out.innerHTML = `
    <div class="big">${money(fv)}</div>
    <div class="row"><span>Total Invested</span><span>${money(invested)}</span></div>
    <div class="row"><span>Total Gain</span><span style="color:${gain>=0?'var(--good)':'var(--bad)'}">${money(gain)}</span></div>
  `;
}

function calcLoan() {
  const P = toNumber($('loan-amount').value);
  const r = toNumber($('loan-rate').value) / 100;
  const years = toNumber($('loan-years').value);
  const m = toNumber($('loan-payments').value);

  const out = $('loan-result');
  out.innerHTML = '';

  if (![P, r, years, m].every(Number.isFinite) || P <= 0 || years <= 0 || m <= 0) {
    out.textContent = 'Please enter valid inputs.';
    return;
  }

  const n = Math.round(years * m);
  const i = r / m;

  let pmt;
  if (i === 0) {
    pmt = P / n;
  } else {
    const pow = Math.pow(1 + i, n);
    pmt = P * (i * pow) / (pow - 1);
  }

  const totalPaid = pmt * n;
  const interestPaid = totalPaid - P;

  out.innerHTML = `
    <div class="big">${money(pmt)} <span style="font-size:12px;color:var(--muted)">per payment</span></div>
    <div class="row"><span>Total Payments</span><span>${n.toLocaleString()}</span></div>
    <div class="row"><span>Total Interest</span><span>${money(interestPaid)}</span></div>
    <div class="row"><span>Total Paid</span><span>${money(totalPaid)}</span></div>
  `;

  // amortization first 12
  const tbody = document.querySelector('#loan-table tbody');
  tbody.innerHTML = '';
  let bal = P;
  for (let k = 1; k <= Math.min(12, n); k++) {
    const interest = bal * i;
    const principal = pmt - interest;
    bal = Math.max(0, bal - principal);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${k}</td>
      <td>${money(pmt)}</td>
      <td>${money(interest)}</td>
      <td>${money(principal)}</td>
      <td>${money(bal)}</td>
    `;
    tbody.appendChild(tr);
  }
  $('loan-details').open = true;
}

function calcCagr() {
  const begin = toNumber($('cagr-begin').value);
  const end = toNumber($('cagr-end').value);
  const years = toNumber($('cagr-years').value);
  const out = $('cagr-result');
  out.innerHTML = '';

  if (![begin, end, years].every(Number.isFinite) || begin <= 0 || end <= 0 || years <= 0) {
    out.textContent = 'Please enter valid inputs.';
    return;
  }

  const c = Math.pow(end / begin, 1 / years) - 1;
  out.innerHTML = `
    <div class="big">${pct(c)}</div>
    <div class="row"><span>Multiple</span><span>${(end / begin).toFixed(3)}x</span></div>
    <div class="row"><span>Begin</span><span>${money(begin)}</span></div>
    <div class="row"><span>End</span><span>${money(end)}</span></div>
  `;
}

function resetCompound(){
  $('ci-principal').value = 10000;
  $('ci-monthly').value = 200;
  $('ci-rate').value = 7;
  $('ci-years').value = 20;
  $('ci-compounds').value = 12;
  $('ci-result').innerHTML='';
}
function resetLoan(){
  $('loan-amount').value = 300000;
  $('loan-rate').value = 6;
  $('loan-years').value = 30;
  $('loan-payments').value = 12;
  $('loan-result').innerHTML='';
  document.querySelector('#loan-table tbody').innerHTML='';
}
function resetCagr(){
  $('cagr-begin').value = 10000;
  $('cagr-end').value = 25000;
  $('cagr-years').value = 5;
  $('cagr-result').innerHTML='';
}

function setupShareLink(){
  const link = $('copy-link');
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'compound';
    url.searchParams.set('tab', activeTab);
    const text = url.toString();
    try{
      await navigator.clipboard.writeText(text);
      link.textContent = 'Copied!';
      setTimeout(()=> link.textContent='Copy share link', 1200);
    }catch{
      prompt('Copy this link:', text);
    }
  });

  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab) {
    const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
    if (btn) btn.click();
  }
}

function parseCashflows(text){
  return String(text)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => toNumber(s));
}

function npv(rate, cashflows){
  // rate as decimal per period
  let v = 0;
  for (let t=0; t<cashflows.length; t++) {
    v += cashflows[t] / Math.pow(1+rate, t);
  }
  return v;
}

function irr(cashflows){
  // Newton-Raphson on NPV=0, return rate per period
  // requires at least one negative and one positive cashflow
  const hasPos = cashflows.some(x => x > 0);
  const hasNeg = cashflows.some(x => x < 0);
  if (!hasPos || !hasNeg) return NaN;

  let r = 0.1; // initial guess
  for (let iter=0; iter<50; iter++) {
    let f = 0;
    let df = 0;
    for (let t=0; t<cashflows.length; t++) {
      const c = cashflows[t];
      const denom = Math.pow(1+r, t);
      f += c / denom;
      if (t > 0) df += -t * c / (denom * (1+r));
    }
    if (!Number.isFinite(df) || Math.abs(df) < 1e-12) break;
    const next = r - f/df;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - r) < 1e-10) { r = next; break; }
    r = next;
  }
  return r;
}

function calcNpvIrr(){
  const ratePct = toNumber($('npv-rate').value);
  const periods = toNumber($('npv-periods').value);
  const flows = parseCashflows($('npv-cashflows').value);
  const out = $('npv-result');
  out.innerHTML = '';

  if (!Number.isFinite(ratePct) || !Number.isFinite(periods) || periods <= 0 || flows.some(x => !Number.isFinite(x)) || flows.length < 2) {
    out.textContent = 'Please enter a valid rate, periods/year, and at least 2 cashflows.';
    return;
  }

  const r = ratePct/100;
  const v = npv(r, flows);
  const rIrr = irr(flows);
  const irrAnnual = Number.isFinite(rIrr) ? (Math.pow(1+rIrr, periods) - 1) : NaN;

  out.innerHTML = `
    <div class="big">NPV: ${money(v)}</div>
    <div class="row"><span>IRR (per period)</span><span>${Number.isFinite(rIrr)?pct(rIrr):'—'}</span></div>
    <div class="row"><span>IRR (annualized)</span><span>${Number.isFinite(irrAnnual)?pct(irrAnnual):'—'}</span></div>
    <div class="row"><span>Cashflows</span><span>${flows.length} periods</span></div>
  `;
}

function parseXirrRows(raw){
  // Accept separators: newlines or semicolons
  const parts = String(raw)
    .split(/\n|;/)
    .map(s => s.trim())
    .filter(Boolean);

  const rows = [];
  for (const p of parts) {
    const [d, a] = p.split(':').map(x => x.trim());
    if (!d || !a) return null;
    const dt = new Date(d);
    const amt = toNumber(a);
    if (!(dt instanceof Date) || isNaN(dt.getTime()) || !Number.isFinite(amt)) return null;
    rows.push({ date: dt, amount: amt });
  }
  // sort by date
  rows.sort((x,y)=> x.date - y.date);
  return rows;
}

function xnpv(rate, rows, dayCount){
  const t0 = rows[0].date;
  let v = 0;
  for (const r of rows) {
    const days = (r.date - t0) / (1000*60*60*24);
    const years = days / dayCount;
    v += r.amount / Math.pow(1 + rate, years);
  }
  return v;
}

function dxnpv(rate, rows, dayCount){
  const t0 = rows[0].date;
  let dv = 0;
  for (const r of rows) {
    const days = (r.date - t0) / (1000*60*60*24);
    const years = days / dayCount;
    if (years === 0) continue;
    dv += -years * r.amount / Math.pow(1 + rate, years + 1);
  }
  return dv;
}

function xirr(rows, guessRate, dayCount){
  const hasPos = rows.some(r => r.amount > 0);
  const hasNeg = rows.some(r => r.amount < 0);
  if (!hasPos || !hasNeg) return NaN;

  let r = guessRate;
  for (let iter = 0; iter < 80; iter++) {
    const f = xnpv(r, rows, dayCount);
    const df = dxnpv(r, rows, dayCount);
    if (!Number.isFinite(df) || Math.abs(df) < 1e-12) break;
    const next = r - f/df;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - r) < 1e-12) { r = next; break; }
    r = next;
  }
  return r;
}

function calcXirr(){
  const guessPct = toNumber($('xirr-guess').value);
  const dayCount = toNumber($('xirr-daycount').value);
  const rows = parseXirrRows($('xirr-rows').value);

  const out = $('xirr-result');
  out.innerHTML = '';

  if (!Number.isFinite(guessPct) || !Number.isFinite(dayCount) || dayCount <= 0 || !rows || rows.length < 2) {
    out.textContent = 'Please enter a valid guess, day count, and cashflow rows.';
    return;
  }

  const r0 = guessPct/100;
  const r = xirr(rows, r0, dayCount);
  if (!Number.isFinite(r)) {
    out.textContent = 'IRR could not be computed (need both negative and positive cashflows).';
    return;
  }

  const v0 = xnpv(r, rows, dayCount);
  const first = rows[0].date.toISOString().slice(0,10);
  const last = rows[rows.length-1].date.toISOString().slice(0,10);

  out.innerHTML = `
    <div class="big">${pct(r)}</div>
    <div class="row"><span>XNPV @ IRR</span><span>${money(v0)}</span></div>
    <div class="row"><span>Range</span><span>${first} → ${last}</span></div>
    <div class="row"><span>Rows</span><span>${rows.length}</span></div>
  `;
}

function resetXirr(){
  $('xirr-guess').value = 10;
  $('xirr-daycount').value = 365;
  $('xirr-rows').value = '2024-01-01:-10000; 2024-06-01:2000; 2025-01-01:3000; 2026-01-01:8000';
  $('xirr-result').innerHTML='';
}

function calcInflation(){
  const nominalPct = toNumber($('inf-nominal').value);
  const inflationPct = toNumber($('inf-rate').value);
  const years = toNumber($('inf-years').value);
  const initial = toNumber($('inf-initial').value);

  const out = $('inf-result');
  out.innerHTML = '';

  if (![nominalPct, inflationPct, years, initial].every(Number.isFinite) || years <= 0 || initial <= 0) {
    out.textContent = 'Please enter valid inputs.';
    return;
  }

  const nominal = nominalPct / 100;
  const inflation = inflationPct / 100;

  // Real return formula: (1 + nominal) / (1 + inflation) - 1
  const realReturn = (1 + nominal) / (1 + inflation) - 1;

  // Future value at nominal rate
  const fvNominal = initial * Math.pow(1 + nominal, years);

  // Purchasing power (real value) in today's dollars
  const purchasingPower = fvNominal / Math.pow(1 + inflation, years);

  // Alternative: calculate using real return directly
  const fvReal = initial * Math.pow(1 + realReturn, years);

  // Total nominal gain
  const nominalGain = fvNominal - initial;

  // Total real gain (in today's purchasing power)
  const realGain = purchasingPower - initial;

  // Inflation erosion
  const erosion = fvNominal - purchasingPower;

  out.innerHTML = `
    <div class="big">Real Return: ${pct(realReturn)}</div>
    <div class="row"><span>Nominal Return</span><span>${pct(nominal)}</span></div>
    <div class="row"><span>Inflation Rate</span><span>${pct(inflation)}</span></div>
    <hr style="border:0;border-top:1px solid var(--border);margin:12px 0">
    <div class="row"><span>Future Value (Nominal)</span><span>${money(fvNominal)}</span></div>
    <div class="row"><span>Purchasing Power (Real)</span><span>${money(purchasingPower)}</span></div>
    <div class="row"><span>Inflation Erosion</span><span style="color:var(--bad)">-${money(erosion)}</span></div>
    <hr style="border:0;border-top:1px solid var(--border);margin:12px 0">
    <div class="row"><span>Nominal Gain</span><span>${money(nominalGain)}</span></div>
    <div class="row"><span>Real Gain (Today's $)</span><span style="color:${realGain>=0?'var(--good)':'var(--bad)'}">${money(realGain)}</span></div>
    <div class="row"><span>Period</span><span>${years} years</span></div>
  `;
}

function resetInflation(){
  $('inf-nominal').value = 8;
  $('inf-rate').value = 3;
  $('inf-years').value = 10;
  $('inf-initial').value = 10000;
  $('inf-result').innerHTML='';
}

function calcTax(){
  const preTaxReturnPct = toNumber($('tax-prereturn').value);
  const amount = toNumber($('tax-amount').value);
  const period = $('tax-period').value;
  const shortTermRate = toNumber($('tax-short-rate').value) / 100;
  const longTermRate = toNumber($('tax-long-rate').value) / 100;

  const out = $('tax-result');
  out.innerHTML = '';

  if (![preTaxReturnPct, amount, shortTermRate, longTermRate].every(Number.isFinite) || amount <= 0) {
    out.textContent = 'Please enter valid inputs.';
    return;
  }

  const preTaxReturn = preTaxReturnPct / 100;
  const isShortTerm = period === 'short';
  const taxRate = isShortTerm ? shortTermRate : longTermRate;
  const periodLabel = isShortTerm ? 'Short-Term' : 'Long-Term';

  // Calculate gains
  const preTaxGain = amount * preTaxReturn;
  const preTaxTotal = amount + preTaxGain;

  // Calculate tax on gains only
  const taxOwed = preTaxGain * taxRate;
  const afterTaxGain = preTaxGain - taxOwed;
  const afterTaxTotal = amount + afterTaxGain;

  // Calculate after-tax return percentage
  const afterTaxReturn = afterTaxGain / amount;

  // Effective tax rate on returns
  const effectiveTaxRate = taxOwed / preTaxGain;

  out.innerHTML = `
    <div class="big">After-Tax Return: ${pct(afterTaxReturn)}</div>
    <div class="row"><span>Pre-Tax Return</span><span>${pct(preTaxReturn)}</span></div>
    <div class="row"><span>Tax Period</span><span>${periodLabel}</span></div>
    <div class="row"><span>Applicable Tax Rate</span><span>${pct(taxRate)}</span></div>
    <hr style="border:0;border-top:1px solid var(--border);margin:12px 0">
    <div class="row"><span>Pre-Tax Gain</span><span>${money(preTaxGain)}</span></div>
    <div class="row"><span>Tax Owed</span><span style="color:var(--bad)">-${money(taxOwed)}</span></div>
    <div class="row"><span>After-Tax Gain</span><span style="color:var(--good)">${money(afterTaxGain)}</span></div>
    <hr style="border:0;border-top:1px solid var(--border);margin:12px 0">
    <div class="row"><span>Pre-Tax Total</span><span>${money(preTaxTotal)}</span></div>
    <div class="row"><span>After-Tax Total</span><span>${money(afterTaxTotal)}</span></div>
    <div class="row"><span>Effective Tax Rate</span><span>${pct(effectiveTaxRate)}</span></div>
  `;
}

function resetTax(){
  $('tax-prereturn').value = 10;
  $('tax-amount').value = 10000;
  $('tax-period').value = 'long';
  $('tax-short-rate').value = 35;
  $('tax-long-rate').value = 15;
  $('tax-result').innerHTML='';
}

function resetNpv(){
  $('npv-rate').value = 1;
  $('npv-cashflows').value = '-10000, 3000, 3000, 3000, 3000';
  $('npv-periods').value = 12;
  $('npv-result').innerHTML='';
}

function main(){
  setTabs();
  $('ci-calc').addEventListener('click', calcCompound);
  $('ci-reset').addEventListener('click', resetCompound);
  $('loan-calc').addEventListener('click', calcLoan);
  $('loan-reset').addEventListener('click', resetLoan);
  $('cagr-calc').addEventListener('click', calcCagr);
  $('cagr-reset').addEventListener('click', resetCagr);
  $('npv-calc').addEventListener('click', calcNpvIrr);
  $('npv-reset').addEventListener('click', resetNpv);
  $('xirr-calc').addEventListener('click', calcXirr);
  $('xirr-reset').addEventListener('click', resetXirr);
  $('inf-calc').addEventListener('click', calcInflation);
  $('inf-reset').addEventListener('click', resetInflation);
  $('tax-calc').addEventListener('click', calcTax);
  $('tax-reset').addEventListener('click', resetTax);
  setupShareLink();
}

document.addEventListener('DOMContentLoaded', main);
