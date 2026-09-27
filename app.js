const workbookCandidates = [
  'data/%D0%9A%D0%B0%D1%81%D0%B0-%D0%95%D0%B2%D0%BB%D0%BE%D0%B3%D0%B8%20%D0%B8%20%D0%A5%D1%80%D0%B8%D1%81%D1%82%D0%BE%20%D0%93%D0%B5%D0%BE%D1%80%D0%B3%D0%B8%D0%B5%D0%B2%D0%B8%2059.xlsx',
  'data/kasa.xlsx'
];

let workbookUrl = workbookCandidates[0];
const sheetButtons = document.getElementById('sheetButtons');
const currentSheetTitle = document.getElementById('currentSheetTitle');
const sheetMeta = document.getElementById('sheetMeta');
const statusBanner = document.getElementById('statusBanner');
const table = document.querySelector('#dataTable');
const tableHead = table.querySelector('thead');
const tableBody = table.querySelector('tbody');
const personSelect = document.getElementById('personSelect');
const resetFiltersButton = document.getElementById('resetFilters');
const summarySheets = document.getElementById('summarySheets');
const summaryPeople = document.getElementById('summaryPeople');
const summaryApartments = document.getElementById('summaryApartments');

let workbookData = null;
let activeSheet = null;
let filteredRows = [];
// Application version
const VERSION = '1.0';
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

if (menuToggle) menuToggle.addEventListener('click', (e) => {
  if (layoutEl && layoutEl.classList.contains('sidebar-open')) closeSidebar(); else openSidebar();
});
if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

function showStatus(message, type = 'info') {
  statusBanner.textContent = message;
  statusBanner.className = `status-banner ${type}`;
}

function prettySheetName(sheetName) {
  const raw = String(sheetName ?? '').trim();
  if (!raw) return 'Непознат лист';

  let value = raw
    .replace(/20216/gi, '2026')
    .replace(/20215/gi, '2025')
    .replace(/2021\s*[-/ ]\s*6/gi, '2026')
    .replace(/2021\s*[-/ ]\s*5/gi, '2025')
    .replace(/2021\s*6\b/gi, '2026')
    .replace(/2021\s*5\b/gi, '2025')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  value = value.replace(/\b(разходи|приходи|вход)\b/gi, (match) => {
    const normalized = {
      разходи: 'Разходи',
      Разходи: 'Разходи',
      приходи: 'Приходи',
      Приходи: 'Приходи',
      вход: 'Вход',
      Вход: 'Вход'
    };
    return normalized[match] || match;
  });

  const yearMatch = value.match(/20\d{2}/);
  if (yearMatch) {
    const year = yearMatch[0];
    value = value.replace(new RegExp(`(Разходи|Приходи|Вход)\\s*(?:-|\\s+)?${year}`, 'i'), `$1 ${year}`);
  }

  value = value.replace(/\s{2,}/g, ' ').trim();
  return value || 'Непознат лист';
}

function createSheetButtons(sheetNames) {
  sheetButtons.innerHTML = '';

  // Group sheets: put 2025 sheets in their own folder, others remain in main list
  const groups = { '2025': [], 'other': [] };
  sheetNames.forEach((sheetName) => {
    const pretty = prettySheetName(sheetName);
    if (/2025/.test(pretty) || /2025/.test(sheetName)) groups['2025'].push({ sheetName, pretty }); else groups['other'].push({ sheetName, pretty });
  });

  // Render main group (other)
  if (groups.other.length > 0) {
    const mainFolder = document.createElement('div');
    mainFolder.className = 'folder';
    const header = document.createElement('div');
    header.className = 'folder-header';
    const title = document.createElement('div');
    title.className = 'folder-title';
    title.textContent = 'Страници';
    const count = document.createElement('div');
    count.className = 'folder-count';
    count.textContent = String(groups.other.length);
    header.appendChild(title);
    header.appendChild(count);
    const content = document.createElement('div');
    content.className = 'folder-content';

    groups.other.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sheet-button';
      button.dataset.sheetName = item.sheetName;
      button.textContent = item.pretty;
      button.setAttribute('aria-label', `Покажи данни от лист ${item.sheetName}`);
      button.addEventListener('click', () => selectSheet(item.sheetName));
      content.appendChild(button);
    });

    mainFolder.appendChild(header);
    mainFolder.appendChild(content);
    sheetButtons.appendChild(mainFolder);
  }

  // Render 2025 group as a separate folder with same buttons
  if (groups['2025'].length > 0) {
    const folder = document.createElement('div');
    folder.className = 'folder collapsed';
    const header = document.createElement('div');
    header.className = 'folder-header';
    const title = document.createElement('div');
    title.className = 'folder-title';
    title.textContent = 'Архив 2025';
    const count = document.createElement('div');
    count.className = 'folder-count';
    count.textContent = String(groups['2025'].length);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'folder-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '▸';

    header.appendChild(title);
    header.appendChild(count);
    header.appendChild(toggle);

    const content = document.createElement('div');
    content.className = 'folder-content';

    groups['2025'].forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sheet-button';
      button.dataset.sheetName = item.sheetName;
      button.textContent = item.pretty;
      button.setAttribute('aria-label', `Покажи данни от лист ${item.sheetName}`);
      button.addEventListener('click', () => selectSheet(item.sheetName));
      content.appendChild(button);
    });

    // Toggle behavior
    header.addEventListener('click', () => {
      const collapsed = folder.classList.toggle('collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
    });

    folder.appendChild(header);
    folder.appendChild(content);
    sheetButtons.appendChild(folder);
  }
}

function setActiveButton(sheetName) {
  const buttons = sheetButtons.querySelectorAll('.sheet-button');
  buttons.forEach((button) => {
    const isActive = button.dataset.sheetName === sheetName;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isMonthHeader(header) {
  if (!header) return false;
  const s = normalizeText(String(header));
  const months = [
    'януари','февруари','март','април','май','юни','юли','август','септември','октомври','ноември','декември',
    'jan','feb','mar','apr','may','jun','jul','aug','sep','sept','oct','nov','dec',
    'ян','фев','мар','апр','юни','юли','авг','сеп','окт','ное','дек'
  ];
  return months.some((m) => s === m || s.startsWith(m + ' ') || s === m + '.');
}

function hasMeaningfulData(rows) {
  return !!(rows && rows.some((row) => Object.values(row).some((value) => {
    const text = String(value ?? '').trim();
    return text !== '';
  })));
}

function getFirstMeaningfulCell(row) {
  for (const value of Object.values(row || {})) {
    const text = String(value ?? '').trim();
    if (text !== '') return text;
  }
  return '';
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

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
      return String(candidate).trim();
    }
  }

  const fallback = getFirstMeaningfulCell(row);
  return fallback || '';
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

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
      return String(candidate).trim();
    }
  }

  const fallback = getFirstMeaningfulCell(row);
  return fallback || '';
}

function compareStrings(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), 'bg', { numeric: true, sensitivity: 'base' });
}

function isValidPersonName(name) {
  if (!name) return false;
  const s = normalizeText(String(name));
  if (!/[a-zа-яёіїґє]+/i.test(s)) return false; // must contain letters
  // exclude numeric-only or pure apartment-like values
  if (/^\d+[\s\-\/]*\d*$/.test(s)) return false;
  // exclude phrases like 'идеални части', 'идеални', 'части', common abbreviations
  if (/\b(идеал|идеални|части|ип|ид\.част|ид\.части|ид\. части)\b/i.test(name)) return false;
  // too short to be a real person name
  if (s.length < 3) return false;
  return true;
}

function isSummaryRow(row) {
  if (!row || typeof row !== 'object') return false;

  const summaryWords = [
    'общо', 'събрани', 'събрана', 'събрано', 'сумa', 'сума',
    'такса', 'гласувана', 'голямо', 'дълж', 'налични', 'вноски',
    'приходи', 'разходи', 'плащане', 'платено', 'общо към', 'общо за'
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
    if (isSummaryRow(row)) {
      summary.push(row);
    } else {
      regular.push(row);
    }
  });

  return { regular, summary };
}

function apartmentSortValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return Number.MAX_SAFE_INTEGER;

  const cleaned = text.replace(/[^0-9]/g, '');
  const match = cleaned.match(/\d+/);
  const numeric = match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
  return numeric;
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

  if (typeof summarySheets !== 'undefined' && summarySheets) {
    summarySheets.textContent = workbookData ? String(workbookData.SheetNames.length) : '0';
  }

  if (typeof summaryPeople !== 'undefined' && summaryPeople) {
    summaryPeople.textContent = String(uniquePeople.size);
  }

  if (typeof summaryApartments !== 'undefined' && summaryApartments) {
    summaryApartments.textContent = String(uniqueApartments.size);
  }
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

function renderTable(rows) {
  const preparedRows = sortRows(rows || []);
  tableHead.innerHTML = '';
  tableBody.innerHTML = '';

  if (!hasMeaningfulData(preparedRows)) {
    tableHead.innerHTML = '<tr><th>Празно</th></tr>';
    tableBody.innerHTML = '<tr><td class="empty-state">Този лист е празен.</td></tr>';
    return;
  }
  const headers = Object.keys(preparedRows[0]);

  // decide whether to render with mobile-expand feature (disabled)
  // Play/expand button is turned off to keep table simple for all sheets
  const isDetailMode = false;

  if (isDetailMode) {
    // create action column + headers
    const headRow = document.createElement('tr');
    const thAction = document.createElement('th');
    thAction.className = 'col-action';
    thAction.setAttribute('aria-hidden', 'true');
    headRow.appendChild(thAction);

    headers.forEach((header) => {
      const th = document.createElement('th');
      th.textContent = header;
      headRow.appendChild(th);
    });

    tableHead.appendChild(headRow);

    preparedRows.forEach((row) => {
      const tr = document.createElement('tr');
      if (isSummaryRow(row)) tr.classList.add('summary-row');

      // action cell with expand button (visible on mobile via CSS)
      const actionTd = document.createElement('td');
      actionTd.className = 'col-action-cell';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'expand-row-button';
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '&#9656;';
      actionTd.appendChild(btn);
      tr.appendChild(actionTd);

      // build normal cells
      headers.forEach((header) => {
        const td = document.createElement('td');
        const value = row[header];
        td.textContent = value !== undefined && value !== null ? String(value) : '';
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);

      // mobile detail row (hidden by default), will contain hidden columns
      const detailTr = document.createElement('tr');
      detailTr.className = 'mobile-detail-row';
      const detailTd = document.createElement('td');
      detailTd.colSpan = headers.length + 1;

      const detailWrapper = document.createElement('div');
      detailWrapper.className = 'mobile-detail-wrapper';
      // add key/value pairs for columns that are likely hidden on mobile (index >=5)
      headers.forEach((header, idx) => {
        if (idx >= 5) {
          const val = row[header];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            const item = document.createElement('div');
            item.className = 'detail-item';
            const k = document.createElement('strong');
            k.textContent = header + ': ';
            const v = document.createElement('span');
            v.textContent = String(val);
            item.appendChild(k);
            item.appendChild(v);
            detailWrapper.appendChild(item);
          }
        }
      });

      detailTd.appendChild(detailWrapper);
      detailTr.appendChild(detailTd);
      tableBody.appendChild(detailTr);

      // toggle detail on button click
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        if (!expanded) {
          btn.classList.add('expanded');
          detailTr.classList.add('open');
        } else {
          btn.classList.remove('expanded');
          detailTr.classList.remove('open');
        }
      });
    });
  } else {
    // build header row (no action column)
    const headRow = document.createElement('tr');
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.textContent = header;
      headRow.appendChild(th);
    });
    tableHead.appendChild(headRow);

    // build body rows (simple)
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
}

function applyFilters() {
  const selectedPerson = personSelect.value;

  const rows = workbookData ? XLSX.utils.sheet_to_json(workbookData.Sheets[activeSheet], { defval: '', raw: false }) : [];
  const filteredRows = rows.filter((row) => {
    const personName = extractPersonValue(row);
    // If a specific person is selected, do NOT include summary rows
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
  sheetMeta.textContent = `${workbookData.SheetNames.length} листа`;
  setActiveButton(sheetName);

  const worksheet = workbookData.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

  populateFilters(rows);
  // Use the centralized filter logic so summary rows are shown only when no person is selected
  applyFilters();
  // On mobile, close sidebar after selecting a sheet
  try { closeSidebar(); } catch (e) { /* ignore */ }
  showStatus(`Показват се данните от лист ${prettySheetName(sheetName)}.`, 'info');
}

// Keyboard shortcuts removed per user request.

async function loadWorkbook() {
  try {
    for (const candidate of workbookCandidates) {
      const response = await fetch(candidate, { cache: 'no-store' });
      if (response.ok) {
        workbookUrl = candidate;
        const arrayBuffer = await response.arrayBuffer();
        workbookData = XLSX.read(arrayBuffer, { type: 'array' });

        if (!workbookData.SheetNames || workbookData.SheetNames.length === 0) {
          throw new Error('Таблицата няма листове.');
        }

        createSheetButtons(workbookData.SheetNames);
        selectSheet(workbookData.SheetNames[0]);
        // Keyboard shortcuts removed by user request
        // Export/print handlers removed
        showStatus(`Зареден файл: ${candidate}`, 'info');
        return;
      }
    }

    throw new Error('Файлът с Excel таблицата не е открит.');
  } catch (error) {
    console.error(error);
    currentSheetTitle.textContent = 'Няма данни';
    sheetMeta.textContent = 'Excel файл не е наличен';
    tableHead.innerHTML = '<tr><th>Грешка</th></tr>';
    tableBody.innerHTML = '<tr><td class="empty-state">Няма открит Excel файл в папка <strong>data</strong>.<br>Поставете файла <strong>Каса-Евлоги и Христо Георгиеви 59.xlsx</strong> или <strong>kasa.xlsx</strong> там и натиснете Refresh.</td></tr>';
    showStatus(error.message, 'error');
  }
}

loadWorkbook();
