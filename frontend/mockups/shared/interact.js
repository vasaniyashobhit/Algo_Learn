// Small interactions for the static mockups: hints, reveals, tabs, drop zone, theme.
const THEME_KEY = 'algolearn-mock-theme';

const readTheme = () => {
  try { return localStorage.getItem(THEME_KEY); } catch { return null; }
};

const saveTheme = (value) => {
  try { localStorage.setItem(THEME_KEY, value); } catch { /* private mode: keep in memory only */ }
};

const savedTheme = readTheme();
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

for (const button of document.querySelectorAll('[data-theme-toggle]')) {
  button.addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme === 'dark'
      || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    saveTheme(next);
  });
}

// Hints revealed one at a time.
for (const button of document.querySelectorAll('[data-next-hint]')) {
  const list = document.getElementById(button.dataset.nextHint);
  const counter = button.querySelector('[data-left]');
  button.addEventListener('click', () => {
    const next = list.querySelector('[data-hint][hidden]');
    next?.removeAttribute('hidden');
    next?.classList.add('is-revealed');
    const left = list.querySelectorAll('[data-hint][hidden]').length;
    if (counter) counter.textContent = left;
    if (!left) {
      button.disabled = true;
      button.textContent = 'All hints shown';
    }
  });
}

// Reveal blocks (full solution, editorial).
for (const button of document.querySelectorAll('[data-reveal]')) {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    panel.hidden = open;
    panel.classList.toggle('is-revealed', !open);
    button.textContent = open ? button.dataset.closed : button.dataset.open;
  });
}

// Tabs with arrow-key support.
for (const list of document.querySelectorAll('[role="tablist"]')) {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const select = (tab) => {
    for (const other of tabs) {
      const active = other === tab;
      other.setAttribute('aria-selected', String(active));
      other.tabIndex = active ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !active;
    }
    tab.focus();
  };
  list.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tab);
  });
  list.addEventListener('keydown', (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    const index = tabs.indexOf(document.activeElement);
    select(tabs.at((index + step) % tabs.length));
  });
}

// Drag-and-drop zones show the dropped file's name.
for (const zone of document.querySelectorAll('[data-dropzone]')) {
  const input = zone.querySelector('input[type="file"]');
  const label = zone.querySelector('[data-file-name]');
  const show = (file) => { if (file && label) label.textContent = `${file.name} · ${Math.ceil(file.size / 1024)} KB`; };
  zone.addEventListener('dragover', (event) => { event.preventDefault(); zone.classList.add('is-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('is-over');
    show(event.dataTransfer.files[0]);
  });
  input?.addEventListener('change', () => show(input.files[0]));
}
