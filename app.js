const storageKey = 'money_app_v1';
const state = {
  scenarios: [],
  transactions: [],
  recurring: [],
  cards: []
};

let charts = {};
const expandedCategories = new Set();

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    Object.assign(state, JSON.parse(raw));
  } else {
    seedData();
    persist();
  }
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function seedData() {
  state.scenarios = [
    { id: 'baseline', name: 'Baseline', startBalance: 4200, budget: { income: 5200, expense: 3800 } },
    { id: 'stretch', name: 'Stretch Goals', startBalance: 4200, budget: { income: 5400, expense: 3600 } }
  ];

  state.transactions = [
    { id: crypto.randomUUID(), date: '2024-05-28', vendor: 'Acme Salary', amount: 2600, type: 'income', category: 'Salary', subcategory: 'Primary', scenario: 'baseline', payment: 'checking' },
    { id: crypto.randomUUID(), date: '2024-05-15', vendor: 'Rentals Co', amount: -1500, type: 'expense', category: 'Housing', subcategory: 'Rent', scenario: 'baseline', payment: 'checking' },
    { id: crypto.randomUUID(), date: '2024-05-21', vendor: 'Grocer Mart', amount: -220, type: 'expense', category: 'Groceries', subcategory: 'Food', scenario: 'baseline', payment: 'Card A' },
    { id: crypto.randomUUID(), date: '2024-05-10', vendor: 'Utilities Inc', amount: -190, type: 'expense', category: 'Utilities', subcategory: 'Electric', scenario: 'baseline', payment: 'checking' },
    { id: crypto.randomUUID(), date: '2024-05-07', vendor: 'Streaming Box', amount: -22, type: 'expense', category: 'Entertainment', subcategory: 'Streaming', scenario: 'baseline', payment: 'Card A' },
    { id: crypto.randomUUID(), date: '2024-05-01', vendor: 'Acme Salary', amount: 2600, type: 'income', category: 'Salary', subcategory: 'Primary', scenario: 'stretch', payment: 'checking' },
    { id: crypto.randomUUID(), date: '2024-05-14', vendor: 'Grocer Mart', amount: -240, type: 'expense', category: 'Groceries', subcategory: 'Food', scenario: 'stretch', payment: 'Card A' },
    { id: crypto.randomUUID(), date: '2024-05-18', vendor: 'Gym Center', amount: -60, type: 'expense', category: 'Health', subcategory: 'Fitness', scenario: 'stretch', payment: 'Card B' }
  ];

  state.recurring = [
    { id: crypto.randomUUID(), label: 'Rent', category: 'Housing', subcategory: 'Rent', amount: -1500, type: 'expense', cadence: 'monthly', start: '2024-05-01', end: null, scenario: 'baseline', need: 'required' },
    { id: crypto.randomUUID(), label: 'Internet', category: 'Utilities', subcategory: 'Internet', amount: -75, type: 'expense', cadence: 'monthly', start: '2024-05-05', end: null, scenario: 'baseline', need: 'required' },
    { id: crypto.randomUUID(), label: 'Freelance', category: 'Side Income', subcategory: 'Projects', amount: 600, type: 'income', cadence: 'monthly', start: '2024-05-12', end: null, scenario: 'stretch', need: 'discretionary' }
  ];

  state.cards = [
    { id: crypto.randomUUID(), name: 'Card A', statementDay: 20, dueDay: 27, avgDailySpend: 25, scenario: 'baseline', categoryTargets: { Groceries: 400, Entertainment: 80 } },
    { id: crypto.randomUUID(), name: 'Card B', statementDay: 12, dueDay: 19, avgDailySpend: 18, scenario: 'stretch', categoryTargets: { Health: 80, Travel: 200 } }
  ];
}

function formatCurrency(num) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function parseDate(str) {
  return new Date(str + 'T00:00:00');
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function diffInDays(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function init() {
  loadState();
  bindTabs();
  bindActions();
  renderScenarioOptions();
  renderAll();
}

function bindTabs() {
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-button').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === target));
    });
  });
}

function bindActions() {
  document.getElementById('scenarioSelect').addEventListener('change', renderAll);
  document.getElementById('addScenarioBtn').addEventListener('click', promptScenario);
  document.getElementById('overviewRange').addEventListener('change', renderOverview);
  document.getElementById('budgetPeriod').addEventListener('change', renderBudget);
  document.getElementById('cashRange').addEventListener('change', renderCashGraph);
  document.getElementById('includeTrend').addEventListener('change', renderCashGraph);
  document.getElementById('tableRange').addEventListener('change', renderCashTable);
  document.getElementById('tableGrouping').addEventListener('change', renderCashTable);
  document.getElementById('addTransaction').addEventListener('click', promptTransaction);
  document.getElementById('parseCsv').addEventListener('click', parseCsvUpload);
  document.getElementById('openImport').addEventListener('click', openImportModal);
  document.getElementById('closeImport').addEventListener('click', closeImportModal);
  document.getElementById('recurringForm').addEventListener('submit', saveRecurring);
  document.getElementById('refreshState').addEventListener('click', renderState);
  document.getElementById('addCard').addEventListener('click', promptCard);
}

function currentScenario() {
  return document.getElementById('scenarioSelect').value || state.scenarios[0]?.id;
}

function renderScenarioOptions() {
  const select = document.getElementById('scenarioSelect');
  select.innerHTML = state.scenarios.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  document.querySelector('#recurringForm select[name="scenario"]').innerHTML = select.innerHTML;
  renderScenarioPills();
}

function promptScenario() {
  const name = prompt('Scenario name');
  if (!name) return;
  const startBalance = Number(prompt('Starting balance', '4000')) || 0;
  const id = name.toLowerCase().replace(/\s+/g, '-') + Date.now();
  state.scenarios.push({ id, name, startBalance, budget: { income: 0, expense: 0 } });
  persist();
  renderScenarioOptions();
  document.getElementById('scenarioSelect').value = id;
  renderAll();
}

function renderAll() {
  renderStats();
  renderOverview();
  renderBudget();
  renderCashGraph();
  renderCashTable();
  renderState();
  renderCards();
  renderTransactions();
  renderRecurring();
}

function scenarioTransactions(scenarioId) {
  return state.transactions.filter(t => t.scenario === scenarioId);
}

function scenarioRecurring(scenarioId) {
  return state.recurring.filter(r => r.scenario === scenarioId);
}

function generateOccurrences(recurring, startDate, endDate) {
  const items = [];
  const start = parseDate(recurring.start);
  const end = recurring.end ? parseDate(recurring.end) : endDate;
  let cursor = new Date(Math.max(start, startDate));
  while (cursor <= end) {
    items.push({
      id: `${recurring.id}-${dateKey(cursor)}`,
      date: dateKey(cursor),
      vendor: recurring.label,
      category: recurring.category,
      subcategory: recurring.subcategory,
      type: recurring.type,
      amount: recurring.amount,
      scenario: recurring.scenario,
      payment: 'checking'
    });
    if (recurring.cadence === 'monthly') cursor.setMonth(cursor.getMonth() + 1);
    if (recurring.cadence === 'weekly') cursor.setDate(cursor.getDate() + 7);
    if (recurring.cadence === 'yearly') cursor.setFullYear(cursor.getFullYear() + 1);
  }
  return items;
}

function buildCashSeries(scenarioId, rangeDays) {
  const today = new Date();
  const end = new Date();
  end.setDate(end.getDate() + Number(rangeDays));
  const scenario = state.scenarios.find(s => s.id === scenarioId);
  let balance = scenario?.startBalance || 0;
  const entries = [...scenarioTransactions(scenarioId)];
  scenarioRecurring(scenarioId).forEach(rec => entries.push(...generateOccurrences(rec, today, end)));
  entries.sort((a, b) => parseDate(a.date) - parseDate(b.date));

  const daily = [];
  for (let d = new Date(today); d <= end; d.setDate(d.getDate() + 1)) {
    const dayKey = dateKey(d);
    const dayTx = entries.filter(e => e.date === dayKey);
    dayTx.forEach(tx => balance += tx.amount);
    daily.push({ date: dayKey, balance: Number(balance.toFixed(2)) });
  }
  return daily;
}

function calcTrendline(data) {
  if (data.length < 3) return null;
  const xs = data.map((_, i) => i);
  const ys = data.map(d => d.balance);
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - meanX) * (ys[i] - meanY); den += (x - meanX) ** 2; });
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  return xs.map(x => ({ x, y: slope * x + intercept }));
}

function renderStats() {
  const scenarioId = currentScenario();
  const txs = scenarioTransactions(scenarioId);
  const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const balanceNow = state.scenarios.find(s => s.id === scenarioId)?.startBalance + income - expenses;
  const statBar = document.getElementById('statBar');
  const negatives = findNegativeEvents(buildCashSeries(scenarioId, 60));
  statBar.innerHTML = [
    { label: 'Income (period)', value: formatCurrency(income), note: 'Recorded inflows' },
    { label: 'Expenses (period)', value: formatCurrency(expenses), note: 'Recorded outflows' },
    { label: 'Current cash', value: formatCurrency(balanceNow || 0), note: 'Start + activity' },
    negatives.length ? { label: 'Alerts', value: `${negatives.length} risk`, note: `Next: ${negatives[0].date}` } : { label: 'Alerts', value: 'None', note: 'No negative cash' }
  ].map(stat => `<div class="stat"><div class="label">${stat.label}</div><div class="value">${stat.value}</div><div class="note">${stat.note}</div></div>`).join('');
}

function findNegativeEvents(series) {
  return series.filter(p => p.balance < 0);
}

function renderOverview() {
  const scenarioId = currentScenario();
  const range = Number(document.getElementById('overviewRange').value);
  const series = buildCashSeries(scenarioId, range);
  const ctx = document.getElementById('overviewChart');
  charts.overview?.destroy();
  charts.overview = new Chart(ctx, {
    type: 'line',
    data: {
      labels: series.map(p => p.date),
      datasets: [{
        label: 'Cash balance',
        data: series.map(p => p.balance),
        borderColor: 'rgba(34,211,238,0.9)',
        backgroundColor: 'rgba(34,211,238,0.15)',
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

function renderBudget() {
  const scenarioId = currentScenario();
  const period = document.getElementById('budgetPeriod').value;
  const txs = scenarioTransactions(scenarioId);
  const rows = aggregateByCategory(txs, period);
  const tbody = document.querySelector('#budgetTable tbody');
  tbody.innerHTML = rows.map(row => {
    const variance = row.budget - row.actual;
    let html = `<tr class="budget-parent" data-cat="${row.category}"><td>${row.category}</td><td>${row.type}</td><td>${formatCurrency(row.budget)}</td><td>${formatCurrency(row.actual)}</td><td>${formatCurrency(variance)}</td></tr>`;
    if (expandedCategories.has(row.category)) {
      const subs = subcategoryBreakdown(txs, row.category);
      html += subs.map(sub => `<tr class="budget-child" data-parent="${row.category}"><td>${row.category} / ${sub.name}</td><td>${sub.type}</td><td>-</td><td>${formatCurrency(sub.total)}</td><td>-</td></tr>`).join('');
    }
    return html;
  }).join('');
  tbody.querySelectorAll('.budget-parent').forEach(tr => tr.addEventListener('click', () => toggleCategoryRow(tr.dataset.cat)));
}

function toggleCategoryRow(category) {
  if (expandedCategories.has(category)) {
    expandedCategories.delete(category);
  } else {
    expandedCategories.add(category);
  }
  renderBudget();
}

function aggregateByCategory(txs, period) {
  const budgetDefaults = state.scenarios.find(s => s.id === currentScenario())?.budget || {};
  const periodFactor = period === 'month' ? 1 : period === 'quarter' ? 3 : 12;
  const result = {};
  txs.forEach(t => {
    const key = t.category;
    if (!result[key]) result[key] = { category: key, type: t.type, actual: 0, budget: 0 };
    result[key].actual += t.type === 'income' ? t.amount : Math.abs(t.amount);
  });
  Object.values(result).forEach(r => {
    r.budget = (r.type === 'income' ? budgetDefaults.income || 0 : budgetDefaults.expense || 0) / periodFactor;
  });
  return Object.values(result);
}

function subcategoryBreakdown(txs, category) {
  const totals = {};
  txs.filter(t => t.category === category).forEach(t => {
    const key = t.subcategory || 'General';
    totals[key] = (totals[key] || { name: key, total: 0, type: t.type });
    totals[key].total += t.type === 'income' ? t.amount : Math.abs(t.amount);
  });
  return Object.values(totals);
}

function renderScenarioPills() {
  const wrapper = document.getElementById('scenarioPills');
  wrapper.innerHTML = state.scenarios.map(s => `<span class="pill active" data-id="${s.id}">${s.name}</span>`).join('');
  wrapper.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => pill.classList.toggle('active'));
  });
}

function renderCashGraph() {
  const range = Number(document.getElementById('cashRange').value);
  const includeTrend = document.getElementById('includeTrend').checked;
  const activeScenarios = Array.from(document.querySelectorAll('#scenarioPills .pill.active')).map(p => p.dataset.id).slice(0, 4);
  const ctx = document.getElementById('cashChart');
  charts.cash?.destroy();
  const datasets = [];
  activeScenarios.forEach((id, idx) => {
    const series = buildCashSeries(id, range);
    const color = ['#22d3ee', '#4ade80', '#fbbf24', '#c084fc'][idx % 4];
    datasets.push({ label: state.scenarios.find(s => s.id === id)?.name || id, data: series.map(p => p.balance), borderColor: color, fill: false, tension: 0.2 });
    if (includeTrend) {
      const trend = calcTrendline(series);
      if (trend) {
        datasets.push({
          label: `${state.scenarios.find(s => s.id === id)?.name} trend`,
          data: trend.map(p => p.y),
          borderColor: color,
          borderDash: [6, 6],
          fill: false,
          tension: 0.1
        });
      }
    }
  });
  const labels = buildCashSeries(activeScenarios[0] || currentScenario(), range).map(p => p.date);
  charts.cash = new Chart(ctx, { type: 'line', data: { labels, datasets }, options: { plugins: { legend: { position: 'bottom' } } } });
}

function renderCashTable() {
  const range = Number(document.getElementById('tableRange').value);
  const grouping = document.getElementById('tableGrouping').value;
  const scenarioId = currentScenario();
  const series = buildCashSeries(scenarioId, range);
  const grouped = groupSeries(series, grouping);
  const thead = document.querySelector('#cashTable thead');
  const tbody = document.querySelector('#cashTable tbody');
  thead.innerHTML = '<tr><th>Period</th><th>Ending balance</th></tr>';
  tbody.innerHTML = grouped.map(row => `<tr><td>${row.label}</td><td>${formatCurrency(row.balance)}</td></tr>`).join('');
}

function groupSeries(series, grouping) {
  const map = new Map();
  series.forEach(point => {
    const d = parseDate(point.date);
    let key = point.date;
    if (grouping === 'weekly') key = `${d.getFullYear()}-W${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)}`;
    if (grouping === 'biweekly') key = `${d.getFullYear()}-B${Math.ceil((d.getDate() + 6 - d.getDay()) / 14)}`;
    if (grouping === 'monthly') key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, point.balance);
  });
  return Array.from(map.entries()).map(([label, balance]) => ({ label, balance }));
}

function renderState() {
  const scenarioId = currentScenario();
  const series = buildCashSeries(scenarioId, 30);
  const negatives = findNegativeEvents(series);
  const stateList = document.getElementById('stateList');
  const next = negatives[0];
  stateList.innerHTML = [
    `<div class="simple-item"><div class="label">Next 30-day low</div><div class="value">${formatCurrency(series.reduce((min, p) => Math.min(min, p.balance), Infinity))}</div><div class="note">${next ? `Risk on ${next.date}` : 'No negative cash detected'}</div></div>`,
    `<div class="simple-item"><div class="label">Recurring items</div><div class="value">${scenarioRecurring(scenarioId).length}</div><div class="note">Auto-applied in projections</div></div>`,
    `<div class="simple-item"><div class="label">Transactions on cards</div><div class="value">${scenarioTransactions(scenarioId).filter(t => t.payment.toLowerCase().includes('card')).length}</div><div class="note">Synced to statement timelines</div></div>`
  ].join('');
}

function renderCards() {
  const tbody = document.querySelector('#cardTable tbody');
  const scenarioId = currentScenario();
  const now = new Date();
  tbody.innerHTML = state.cards.filter(c => c.scenario === scenarioId).map(card => {
    const closeDate = nextStatementDate(card.statementDay, now);
    const dueDate = nextDueDate(card.dueDay, closeDate);
    const predicted = predictCardClose(card, closeDate);
    return `<tr><td>${card.name}</td><td>${closeDate.toDateString()}</td><td>${dueDate.toDateString()}</td><td>${formatCurrency(predicted.total)}</td><td>${predicted.confidence}%</td></tr>`;
  }).join('') || '<tr><td colspan="5">No cards yet.</td></tr>';
}

function nextStatementDate(day, ref) {
  const date = new Date(ref);
  if (ref.getDate() >= day) date.setMonth(date.getMonth() + 1);
  date.setDate(day);
  return date;
}

function nextDueDate(day, statementDate) {
  const date = new Date(statementDate);
  date.setDate(day);
  return date;
}

function predictCardClose(card, closeDate) {
  const txs = state.transactions.filter(t => t.payment === card.name);
  const now = new Date();
  const days = diffInDays(now, closeDate);
  const base = txs.filter(t => parseDate(t.date) <= closeDate).reduce((s, t) => s + Math.abs(t.amount), 0);
  const daily = card.avgDailySpend * Math.max(days, 0);
  const total = base + daily;
  const byCategory = {};
  txs.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + Math.abs(t.amount); });
  const confidence = Math.min(100, Math.round((txs.length / 10) * 100));
  return { total, confidence, byCategory };
}

function renderTransactions() {
  const tbody = document.querySelector('#transactionTable tbody');
  tbody.innerHTML = state.transactions.map(t => `<tr><td>${t.date}</td><td>${t.vendor}</td><td>${t.category}</td><td>${t.subcategory || '-'}</td><td>${t.type}</td><td>${formatCurrency(t.amount)}</td><td>${state.scenarios.find(s => s.id === t.scenario)?.name || t.scenario}</td><td>${t.payment}</td></tr>`).join('');
}

function renderRecurring() {
  const tbody = document.querySelector('#recurringTable tbody');
  if (!tbody) return;
  tbody.innerHTML = state.recurring.map(rec => {
    const scenarioName = state.scenarios.find(s => s.id === rec.scenario)?.name || rec.scenario;
    const range = `${rec.start || '-'} → ${rec.end || 'open'}`;
    return `<tr><td>${rec.label}</td><td>${rec.category}${rec.subcategory ? ` / ${rec.subcategory}` : ''}</td><td>${rec.type}</td><td>${rec.cadence}</td><td>${(rec.need || 'required')}</td><td>${formatCurrency(rec.amount)}</td><td>${range}</td><td>${scenarioName}</td><td class="table-actions"><button class="ghost edit" data-id="${rec.id}">Edit</button><button class="ghost danger delete" data-id="${rec.id}">Delete</button></td></tr>`;
  }).join('') || '<tr><td colspan="9">No recurring patterns yet.</td></tr>';

  tbody.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', () => populateRecurringForm(btn.dataset.id)));
  tbody.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', () => deleteRecurring(btn.dataset.id)));
}

function promptTransaction() {
  const scenarioId = currentScenario();
  const vendor = prompt('Vendor');
  if (!vendor) return;
  const amount = Number(prompt('Amount (use negative for expense)', '-50'));
  const date = prompt('Date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
  const category = detectCategoryFromVendor(vendor) || prompt('Category', 'Misc');
  const subcategory = prompt('Sub-category', 'General');
  const type = amount >= 0 ? 'income' : 'expense';
  const payment = prompt('Payment method', 'checking');
  state.transactions.push({ id: crypto.randomUUID(), date, vendor, amount, type, category, subcategory, scenario: scenarioId, payment });
  persist();
  renderAll();
}

function detectCategoryFromVendor(vendor) {
  const normalized = vendor.replace(/\s+\d+.*/, '').toLowerCase();
  const matches = state.transactions.filter(t => t.vendor.toLowerCase().startsWith(normalized));
  if (!matches.length) return null;
  const categoryCounts = matches.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});
  const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (top && top[1] / matches.length >= 0.8) return top[0];
  return null;
}

function parseCsvUpload() {
  const rows = document.getElementById('csvInput').value.trim().split(/\n+/);
  rows.forEach(line => {
    const [date, vendor, amount, type, category, subcategory, scenario, payment] = line.split(',');
    if (!date || !vendor || !amount) return;
    state.transactions.push({ id: crypto.randomUUID(), date, vendor, amount: Number(amount), type: type || (Number(amount) >= 0 ? 'income' : 'expense'), category: category || detectCategoryFromVendor(vendor) || 'Uncategorised', subcategory, scenario: scenario || currentScenario(), payment: payment || 'checking' });
  });
  persist();
  renderAll();
  document.getElementById('csvInput').value = '';
  closeImportModal();
}

function saveRecurring(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  const payload = { id: data.id || crypto.randomUUID(), label: data.label, category: data.category, subcategory: data.subcategory, amount: Number(data.amount) * (data.type === 'expense' ? -1 : 1), type: data.type, cadence: data.cadence, start: data.start, end: data.end || null, scenario: data.scenario, need: data.need || 'required' };
  const existingIndex = state.recurring.findIndex(r => r.id === payload.id);
  if (existingIndex >= 0) {
    state.recurring[existingIndex] = payload;
  } else {
    state.recurring.push(payload);
  }
  persist();
  form.reset();
  form.querySelector('input[name="id"]').value = '';
  renderAll();
}

function populateRecurringForm(id) {
  const rec = state.recurring.find(r => r.id === id);
  if (!rec) return;
  const form = document.getElementById('recurringForm');
  form.label.value = rec.label;
  form.category.value = rec.category;
  form.subcategory.value = rec.subcategory || '';
  form.amount.value = Math.abs(rec.amount);
  form.type.value = rec.type;
  form.cadence.value = rec.cadence;
  form.need.value = rec.need || 'required';
  form.start.value = rec.start || '';
  form.end.value = rec.end || '';
  form.scenario.value = rec.scenario;
  form.id.value = rec.id;
}

function deleteRecurring(id) {
  state.recurring = state.recurring.filter(r => r.id !== id);
  persist();
  renderAll();
}

function openImportModal() {
  const modal = document.getElementById('importModal');
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function closeImportModal() {
  const modal = document.getElementById('importModal');
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
}

function promptCard() {
  const name = prompt('Card name');
  if (!name) return;
  const statementDay = Number(prompt('Statement close day (1-28)', '20'));
  const dueDay = Number(prompt('Due day (1-28)', '27'));
  const avgDailySpend = Number(prompt('Average daily spend', '20'));
  state.cards.push({ id: crypto.randomUUID(), name, statementDay, dueDay, avgDailySpend, scenario: currentScenario(), categoryTargets: {} });
  persist();
  renderCards();
}

window.addEventListener('DOMContentLoaded', init);
