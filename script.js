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

function main(){
  setTabs();
  $('ci-calc').addEventListener('click', calcCompound);
  $('ci-reset').addEventListener('click', resetCompound);
  $('loan-calc').addEventListener('click', calcLoan);
  $('loan-reset').addEventListener('click', resetLoan);
  $('cagr-calc').addEventListener('click', calcCagr);
  $('cagr-reset').addEventListener('click', resetCagr);
  setupShareLink();
}

document.addEventListener('DOMContentLoaded', main);
