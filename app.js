const sheetButtons = document.getElementById('sheetButtons');
const currentSheetTitle = document.getElementById('currentSheetTitle');
const sheetMeta = document.getElementById('sheetMeta');
const statusBanner = document.getElementById('statusBanner');
const table = document.querySelector('#dataTable');
const tableHead = table.querySelector('thead');
const tableBody = table.querySelector('tbody');
const personSelect = document.getElementById('personSelect');
const resetFiltersButton = document.getElementById('resetFilters');

let workbookData = null;
let activeSheet = null;
// If you want to use the Google Sheets API, set an API key here.
// Example: const GOOGLE_API_KEY = 'AIza...';
// You can either set it directly here, or create a file named `key` in the
// project root containing only the key (useful for local testing; do NOT commit
// your real API key to a public repo).
let GOOGLE_API_KEY = 'AIzaSyCKtPquZuFkEczG8HfF71siIHJ0qj88Zsg';
const SPREADSHEET_ID = '1FANWjbIgTaB1sbLKsKCFIeBLnhgeOFDBwyjEYJv9V_s';

const KNOWN_SHEETS = [
  { title: 'За текущи разходи 2026', gid: '1188057095' },
  { title: 'Фонд Ремонт 2026', gid: '1017103576' },
  { title: 'Разходи 2026', gid: '1437820316' },
  { title: 'Разпределение на междуетажни помещения', gid: '1987582172' },
  { title: 'Текущи разходи 2025', gid: '0' },
  { title: 'Фонд Ремонт 2025', gid: '2119164190' },
  { title: 'Разходи 2025', gid: '599724955' }
];

const layoutEl = document.querySelector('.layout');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const menuToggle = document.getElementById('menuToggle');

function closeSidebar() {
  if (layoutEl) layoutEl.classList.remove('sidebar-open');
  if (sidebarBackdrop) sidebarBackdrop.hidden = true;
}

function openSidebar() {
  if (layoutEl) layoutEl.classList.add('sidebar-open');
  if (sidebarBackdrop) sidebarBackdrop.hidden = false;
}

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    if (layoutEl && layoutEl.classList.contains('sidebar-open')) closeSidebar();
    else openSidebar();
  });
}

if (sidebarBackdrop) {
  sidebarBackdrop.addEventListener('click', closeSidebar);
}

function showStatus(message, type = 'info') {
  statusBanner.textContent = message;
  statusBanner.className = `status-banner ${type}`;
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function prettySheetName(sheetName) {
  const raw = String(sheetName || '').trim();
  if (!raw) return 'Непознат лист';

  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createSheetButtons(sheetNames) {
  sheetButtons.innerHTML = '';

  const groups = { other: [], archive: [] };
  sheetNames.forEach((sheetName) => {
    const pretty = prettySheetName(sheetName);
    const item = { sheetName, pretty };
    if (/2025/.test(sheetName) || /2025/.test(pretty)) groups.archive.push(item);
    else groups.other.push(item);
  });

  const renderGroup = (label, items, collapsed = false) => {
    if (!items.length) return;

    const folder = document.createElement('div');
    folder.className = 'folder' + (collapsed ? ' collapsed' : '');
    folder.setAttribute('role', 'region');
    folder.setAttribute('aria-expanded', String(!collapsed));

    const header = document.createElement('div');
    header.className = 'folder-header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');

    const title = document.createElement('div');
    title.className = 'folder-title';
    title.textContent = label;

    const count = document.createElement('div');
    count.className = 'folder-count';
    count.textContent = String(items.length);

    const toggle = document.createElement('div');
    toggle.className = 'folder-toggle';
    toggle.textContent = '▸';
    toggle.setAttribute('aria-hidden', 'true');

    header.appendChild(title);
    header.appendChild(count);
    header.appendChild(toggle);

    const content = document.createElement('div');
    content.className = 'folder-content';

    items.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sheet-button';
      button.dataset.sheetName = item.sheetName;
      button.textContent = item.pretty;
      button.setAttribute('aria-label', `Покажи данни от лист ${item.sheetName}`);
      button.addEventListener('click', () => selectSheet(item.sheetName));
      content.appendChild(button);
    });

    const toggleFolder = () => {
      const isCollapsed = folder.classList.toggle('collapsed');
      folder.setAttribute('aria-expanded', String(!isCollapsed));
    };

    if (label === 'Архив 2025') {
      header.addEventListener('click', toggleFolder);
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFolder();
        }
      });
    }

    folder.appendChild(header);
    folder.appendChild(content);
    sheetButtons.appendChild(folder);
  };

  renderGroup('Страници', groups.other, false);
  renderGroup('Архив 2025', groups.archive, true);
}

function setActiveButton(sheetName) {
  const buttons = sheetButtons.querySelectorAll('.sheet-button');
  buttons.forEach((button) => {
    const isActive = button.dataset.sheetName === sheetName;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function hasMeaningfulData(rows) {
  return !!(rows && rows.some((row) => Object.values(row).some((value) => String(value ?? '').trim() !== '')));
}

function getFirstMeaningfulCell(row) {
  for (const value of Object.values(row || {})) {
    const text = String(value ?? '').trim();
    if (text !== '') return text;
  }
  return '';
}

function extractPersonValue(row) {
  const candidates = [
    row['Име'],
    row['Имена'],
    row['Собственик'],
    row['Наемател'],
    row['Име и фамилия'],
    row['Name'],
    row['Owner'],
    row['Tenant'],
    row['Име/Фамилия'],
    row['Име и фамилия '],
    row['Име наемател'],
    row['Име на собственика']
  ];

  for (const value of candidates) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }

  return getFirstMeaningfulCell(row) || '';
}

function extractApartmentValue(row) {
  const candidates = [
    row['Апартамент'],
    row['Апартамент №'],
    row['№ апартамент'],
    row['№'],
    row['Apartment'],
    row['Apartment No'],
    row['Къща'],
    row['Стая'],
    row['Ап.'],
    row['Апартамент_№'],
    row['ApartmentNumber']
  ];

  for (const value of candidates) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }

  return getFirstMeaningfulCell(row) || '';
}

function compareStrings(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), 'bg', { numeric: true, sensitivity: 'base' });
}

function isValidPersonName(name) {
  if (!name) return false;
  const s = normalizeText(String(name));
  if (!/[a-zа-яёіїґє]+/i.test(s)) return false;
  if (/^\d+[\s\-\/]*\d*$/.test(s)) return false;
  if (/\b(идеал|идеални|части|ип|ид\.част|ид\.части|ид\. части)\b/i.test(name)) return false;
  if (s.length < 3) return false;
  return true;
}

function isSummaryRow(row) {
  if (!row || typeof row !== 'object') return false;

  const summaryWords = [
    'общо', 'събрани', 'събрана', 'събрано', 'сума', 'сумa', 'такса',
    'приходи', 'разходи', 'гласувана', 'платено', 'налични', 'вноски'
  ];

  const values = Object.values(row).map((value) => String(value ?? '').trim().toLowerCase());
  const hasSummaryText = values.some((value) => summaryWords.some((word) => value.includes(word)));
  const isEmpty = !extractPersonValue(row) && !extractApartmentValue(row);
  return hasSummaryText || isEmpty;
}

function splitRows(rows) {
  const regular = [];
  const summary = [];

  (rows || []).forEach((row) => {
    if (isSummaryRow(row)) summary.push(row);
    else regular.push(row);
  });

  return { regular, summary };
}

function apartmentSortValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return Number.MAX_SAFE_INTEGER;

  const cleaned = text.replace(/[^0-9]/g, '');
  const match = cleaned.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function sortRows(rows) {
  const { regular, summary } = splitRows(rows);

  regular.sort((a, b) => {
    const apartmentDiff = apartmentSortValue(extractApartmentValue(a)) - apartmentSortValue(extractApartmentValue(b));
    if (apartmentDiff !== 0) return apartmentDiff;

    const personDiff = compareStrings(extractPersonValue(a), extractPersonValue(b));
    if (personDiff !== 0) return personDiff;

    return compareStrings(JSON.stringify(a), JSON.stringify(b));
  });

  return [...regular, ...summary];
}

function updateSummary(rows) {
  const uniquePeople = new Set();
  const uniqueApartments = new Set();

  rows.forEach((row) => {
    const person = extractPersonValue(row);
    const apartment = extractApartmentValue(row);
    if (person && isValidPersonName(person)) uniquePeople.add(person);
    if (apartment) uniqueApartments.add(apartment);
  });

  if (document.getElementById('summarySheets')) document.getElementById('summarySheets').textContent = workbookData ? String(workbookData.SheetNames.length) : '0';
  if (document.getElementById('summaryPeople')) document.getElementById('summaryPeople').textContent = String(uniquePeople.size);
  if (document.getElementById('summaryApartments')) document.getElementById('summaryApartments').textContent = String(uniqueApartments.size);
}

function populateFilters(rows) {
  const dataRows = splitRows(rows).regular;
  const people = new Set();

  dataRows.forEach((row) => {
    const person = extractPersonValue(row);
    if (person && person !== 'Непознато' && isValidPersonName(person)) people.add(person);
  });

  personSelect.innerHTML = '<option value="all">Всички</option>';
  [...people].sort((a, b) => compareStrings(a, b)).forEach((person) => {
    const option = document.createElement('option');
    option.value = person;
    option.textContent = person;
    personSelect.appendChild(option);
  });

  updateSummary(dataRows);
}

function renderEmptySheetState() {
  tableHead.innerHTML = '<tr><th></th></tr>';
  tableBody.innerHTML = '<tr><td class="empty-state">&nbsp;</td></tr>';
}

function renderTable(rows) {
  const preparedRows = sortRows(rows || []);
  // Remove rows that only contain a single month value (often from merged
  // cells or stray CSV lines) to avoid showing orphan numeric cells as separate
  // empty rows. This is a heuristic: if a row has exactly one non-empty cell
  // and that cell's header looks like a month name, drop the row.
  const monthRe = /януар|февр|март|април|май|юни|юли|авг|септ|окт|ноем|дек/i;
  const filteredRows = preparedRows.filter((row) => {
    const keys = Object.keys(row || {});
    let nonEmpty = 0;
    let lastKey = null;
    for (const k of keys) {
      const v = String(row[k] ?? '').trim();
      if (v !== '') { nonEmpty++; lastKey = k; }
    }
    if (nonEmpty === 1 && lastKey && monthRe.test(lastKey)) return false;
    return true;
  });
  const rowsToRender = filteredRows;
  tableHead.innerHTML = '';
  tableBody.innerHTML = '';

  if (!Array.isArray(rowsToRender) || rowsToRender.length === 0 || !hasMeaningfulData(rowsToRender)) {
    renderEmptySheetState();
    return;
  }
  const headers = Object.keys(rowsToRender[0]);
  const headRow = document.createElement('tr');
  headers.forEach((header) => {
    const th = document.createElement('th');
    th.textContent = header;
    th.setAttribute('scope', 'col');
    headRow.appendChild(th);
  });
  tableHead.appendChild(headRow);

  preparedRows.forEach((row) => {
    const tr = document.createElement('tr');
    if (isSummaryRow(row)) tr.classList.add('summary-row');

    headers.forEach((header) => {
      const td = document.createElement('td');
      const value = row[header];
      td.textContent = value !== undefined && value !== null ? String(value) : '';
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });
}

function applyFilters() {
  const selectedPerson = personSelect.value;
  let rows = [];
  if (workbookData) {
    const sheet = workbookData.Sheets[activeSheet];
    if (Array.isArray(sheet)) rows = sheet;
    else rows = XLSX.utils.sheet_to_json(sheet || {}, { defval: '', raw: false });
  }
  const filteredRows = rows.filter((row) => {
    const personName = extractPersonValue(row);
    if (isSummaryRow(row)) return selectedPerson === 'all';
    if (!personName || personName === 'Непознато' || personName === 'Unknown') return false;
    return selectedPerson === 'all' || normalizeText(personName) === normalizeText(selectedPerson);
  });

  renderTable(filteredRows);
  updateSummary(filteredRows);
  showStatus(
    selectedPerson === 'all'
      ? 'Показват се всички записи.'
      : `Показват се всички апартаменти за: ${selectedPerson}`,
    'info'
  );
}

personSelect.addEventListener('change', applyFilters);
resetFiltersButton.addEventListener('click', () => {
  personSelect.value = 'all';
  applyFilters();
});

function selectSheet(sheetName) {
  activeSheet = sheetName;
  currentSheetTitle.textContent = prettySheetName(sheetName);
  let rows = [];
  if (workbookData) {
    const sheet = workbookData.Sheets[sheetName];
    if (Array.isArray(sheet)) rows = sheet;
    else rows = XLSX.utils.sheet_to_json(sheet || {}, { defval: '', raw: false });
  }
  const hasRows = Array.isArray(rows) && rows.length > 0 && hasMeaningfulData(rows);
  sheetMeta.textContent = hasRows ? `${workbookData.SheetNames.length} листа` : '';
  setActiveButton(sheetName);

  populateFilters(rows);
  applyFilters();
  closeSidebar();
  showStatus(
    hasRows ? `Показват се данните от лист ${prettySheetName(sheetName)}.` : 'Статус: няма данни за този лист.',
    'info'
  );
}

async function loadSheetCsv(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  console.debug('[loadSheetCsv] fetching CSV url:', url);
  const response = await fetch(url, { cache: 'no-store' });
  console.debug('[loadSheetCsv] response status:', response.status);
  if (!response.ok) throw new Error(`Неуспешен достъп до лист ${gid} (status ${response.status})`);

  const csvText = await response.text();
  console.debug('[loadSheetCsv] csv length:', csvText.length, 'preview:', csvText.slice(0, 300).replace(/\n/g, '\\n'));
  const workbook = XLSX.read(csvText, { type: 'string', raw: false });
  const firstSheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: '', raw: false });
}

async function loadSheetApi(sheetTitle, fallbackGid) {
  // Try using the `values:batchGet` endpoint with `ranges` query param.
  // First attempt with the plain sheet title; if Google returns 400, retry
  // with the sheet name quoted and a broad A1 range.
  const rawTitle = String(sheetTitle || '');

  const buildBatchUrl = (range) => `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?ranges=${encodeURIComponent(range)}&key=${GOOGLE_API_KEY}`;

  const tryPlain = async () => fetch(buildBatchUrl(rawTitle), { cache: 'no-store' });

  let response = await tryPlain();
  if (!response.ok && response.status === 400) {
    // Retry with quoted sheet name and explicit A1 range
    const quoted = `'${rawTitle.replace(/'/g, "''")}'`;
    const ranged = `${quoted}!A1:ZZ9999`;
    try {
      response = await fetch(buildBatchUrl(ranged), { cache: 'no-store' });
    } catch (e) {
      // continue to error handling
    }
  }

  if (!response.ok) {
    let body = '';
    try { body = await response.text(); } catch (e) { /* ignore */ }
    // If a fallback gid was provided, throw an Error that includes the gid so
    // the caller can decide to fallback to CSV reading.
    const err = new Error(`Google Sheets API error for sheet ${sheetTitle}: ${response.status} ${body}`);
    err.fallbackGid = fallbackGid;
    throw err;
  }

  const json = await response.json();
  const ranges = Array.isArray(json.valueRanges) ? json.valueRanges : [];
  const values = ranges[0] && Array.isArray(ranges[0].values) ? ranges[0].values : [];
  console.debug('[loadSheetApi] fetched values length for', sheetTitle, values.length);
  if (values.length === 0) return [];

  const headers = values[0].map((h) => String(h || '').trim());
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const rowArr = values[i] || [];
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = rowArr[j] !== undefined ? rowArr[j] : '';
    }
    rows.push(row);
  }

  return rows;
}

async function loadWorkbook() {
  if (isLoading) return;
  isLoading = true;
  try {
    const workbook = { SheetNames: [], Sheets: {} };

    // If no API key is configured, try to read a local `/key` file (served by
    // your local static server) to make local testing easier.
    if ((!GOOGLE_API_KEY || String(GOOGLE_API_KEY).trim() === '')) {
      try {
        const kresp = await fetch('/key', { cache: 'no-store' });
        if (kresp.ok) {
          const text = String(await kresp.text()).trim();
          if (text) GOOGLE_API_KEY = text;
        }
      } catch (e) {
        // ignore local key fetch errors
      }
    }

    for (const sheet of KNOWN_SHEETS) {
      let rows = [];
      if (GOOGLE_API_KEY && String(GOOGLE_API_KEY).trim() !== '') {
        try {
          rows = await loadSheetApi(sheet.title, sheet.gid);
          console.debug('[loadWorkbook] sheet', sheet.title, 'rows:', Array.isArray(rows) ? rows.length : '??');
        } catch (e) {
          console.warn(`API failed for sheet ${sheet.title}, falling back to CSV (gid=${sheet.gid}):`, e.message || e);
          // Fallback to CSV export by gid
          rows = await loadSheetCsv(sheet.gid);
        }
      } else {
        rows = await loadSheetCsv(sheet.gid);
      }
      workbook.SheetNames.push(sheet.title);
      workbook.Sheets[sheet.title] = rows;
    }

    workbookData = workbook;
    createSheetButtons(workbookData.SheetNames);
    if (workbookData.SheetNames.length > 0) {
      // Preserve currently selected sheet if present; otherwise select first
      const toSelect = activeSheet && workbookData.SheetNames.includes(activeSheet)
        ? activeSheet
        : workbookData.SheetNames[0];
      selectSheet(toSelect);
    }
    showStatus(`Зареден Google Sheet: ${SPREADSHEET_ID}`, 'info');
  } catch (error) {
    console.error(error);
    currentSheetTitle.textContent = 'Няма данни';
    sheetMeta.textContent = 'Онлайн таблицата не е достъпна';
    tableHead.innerHTML = '<tr><th>Грешка</th></tr>';
    tableBody.innerHTML = '<tr><td class="empty-state">Онлайн таблицата не е достъпна. Проверете споделянето на Google Sheet: „Anyone with the link“ → Viewer.</td></tr>';
    showStatus(error.message, 'error');
  }
}

// Loading control to avoid overlapping refreshes
let isLoading = false;

// Initial load
loadWorkbook();

// Auto-refresh every 30 seconds. Set to 0 to disable.
const AUTO_REFRESH_MS = 30000;
if (AUTO_REFRESH_MS > 0) {
  setInterval(() => {
    loadWorkbook();
  }, AUTO_REFRESH_MS);
}
