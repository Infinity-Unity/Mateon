const STORAGE_KEYS = {
  progress: "mateon-progress-v4",
  scene: "mateon-scene-v2",
};

const STEREO_TOPIC_IDS = new Set(["cube", "rectangular-prism", "pyramid", "cylinder", "cone", "sphere"]);

const sectionNames = {
  planimetry: "Планиметрия",
  stereometry: "Стереометрия",
};

const sectionOrder = [sectionNames.planimetry, sectionNames.stereometry];

const pageIdToLabel = {
  home: "index",
  theory: "theory",
  tests: "tests",
  scene: "scene",
  profile: "profile",
};

const refs = {
  viewRoot: () => document.getElementById("view-root"),
  viewTitle: () => document.getElementById("view-title"),
  routeBadge: () => document.getElementById("route-badge"),
  xpTotal: () => document.getElementById("xp-total"),
  topicCount: () => document.getElementById("topic-count"),
  topicShortcuts: () => document.getElementById("topic-shortcuts"),
  topbar: () => document.querySelector(".topbar"),
};

let resetBound = false;
let stickyOffsetBound = false;

export function getCourseData() {
  return Array.isArray(window.COURSE_DATA) ? window.COURSE_DATA : [];
}

export function defaultProgress() {
  return { totalXp: 0, completed: [], topicStats: {} };
}

export function defaultFilters() {
  return { section: "all", query: "" };
}

export function defaultSceneState() {
  return {
    topicId: "cube",
    mode: "3d",
    base: 4,
    height: 5,
    depth: 3,
    angle: 60,
    sides: 6,
    highlight: "sides",
    autoRotate: false,
    showEdges: true,
    showVertices: false,
    showFaces: true,
  };
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota and privacy mode errors */
  }
}

function loadJSON(key, fallbackValue) {
  const raw = readStorage(key);
  if (!raw) return fallbackValue;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ...fallbackValue, ...parsed };
    }
    return fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function saveJSON(key, value) {
  writeStorage(key, JSON.stringify(value));
}

export function readProgress() {
  const progress = loadJSON(STORAGE_KEYS.progress, defaultProgress());
  progress.completed = Array.isArray(progress.completed) ? progress.completed : [];
  progress.topicStats = progress.topicStats && typeof progress.topicStats === "object" ? progress.topicStats : {};
  progress.totalXp = Number(progress.totalXp) || 0;
  return progress;
}

export function writeProgress(progress) {
  saveJSON(STORAGE_KEYS.progress, progress);
}

export function mutateProgress(mutator) {
  const progress = readProgress();
  mutator(progress);
  writeProgress(progress);
  return progress;
}

export function resetProgress() {
  const progress = defaultProgress();
  writeProgress(progress);
  return progress;
}

export function getTopicStat(topicId, progress = readProgress()) {
  return progress.topicStats[topicId] || { xp: 0, bestScore: 0, completed: false };
}

export function overallPercent(progress = readProgress()) {
  const done = Object.values(progress.topicStats).filter((item) => item.completed).length;
  return Math.round((done / Math.max(getCourseData().length, 1)) * 100) || 0;
}

export function loadSceneState() {
  return loadJSON(STORAGE_KEYS.scene, defaultSceneState());
}

export function saveSceneState(state) {
  saveJSON(STORAGE_KEYS.scene, state);
}

export function pageLink(page, topicId = "") {
  const base = `./${page}.html`;
  return topicId ? `${base}?topic=${encodeURIComponent(topicId)}` : base;
}

export function homeLink() {
  return pageLink("index");
}

export function theoryLink(topicId = "") {
  return pageLink("theory", topicId);
}

export function testsLink(topicId = "") {
  return pageLink("tests", topicId);
}

export function sceneLink(topicId = "") {
  return pageLink("scene", topicId);
}

export function profileLink(topicId = "") {
  return pageLink("profile", topicId);
}

export function queryTopic() {
  return new URLSearchParams(window.location.search).get("topic") || "";
}

export function getTopic(topicId) {
  return getCourseData().find((topic) => topic.id === topicId) || null;
}

export function isStereo(topicOrId) {
  const topic = typeof topicOrId === "string" ? getTopic(topicOrId) : topicOrId;
  if (!topic) return false;
  return topic.section === sectionNames.stereometry || STEREO_TOPIC_IDS.has(topic.id);
}

export function sectionCounts(topics = getCourseData()) {
  return topics.reduce((acc, topic) => {
    acc[topic.section] = (acc[topic.section] || 0) + 1;
    return acc;
  }, {});
}

export function orderedSections() {
  return [...sectionOrder];
}

export function sectionKey(section) {
  return section === sectionNames.stereometry ? "stereometry" : "planimetry";
}

export function sectionMeta(section) {
  if (section === sectionNames.stereometry) {
    return {
      key: "stereometry",
      shortLabel: "3D",
      title: "3D / Стереометрия",
      description: "Пространственные тела, объёмы, поверхности и вращаемые модели.",
      accentClass: "section-3d",
    };
  }

  return {
    key: "planimetry",
    shortLabel: "2D",
    title: "2D / Планиметрия",
    description: "Плоские фигуры, формулы, углы и вычисления на плоскости.",
    accentClass: "section-2d",
  };
}

export function groupTopicsBySection(topics = getCourseData()) {
  const grouped = {
    [sectionNames.planimetry]: [],
    [sectionNames.stereometry]: [],
  };

  topics.forEach((topic) => {
    if (!grouped[topic.section]) grouped[topic.section] = [];
    grouped[topic.section].push(topic);
  });

  return grouped;
}

export function filterTopics(topics, filters) {
  const query = (filters.query || "").trim().toLowerCase();

  return topics.filter((topic) => {
    const matchesSection = filters.section === "all" || topic.section === filters.section;
    if (!matchesSection) return false;

    if (!query) return true;
    const haystack = `${topic.title} ${topic.section} ${topic.description}`.toLowerCase();
    return haystack.includes(query);
  });
}

export function routeLabel(page, topicId = "") {
  const base = pageIdToLabel[page] || page;
  return topicId ? `#${base}/${topicId}` : `#${base}`;
}

export function excerpt(text = "", max = 155) {
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

export function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

export function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function emptyView(title, body, actions = "") {
  return `
    <section class="empty">
      <h3>${title}</h3>
      ${body.startsWith("<") ? body : `<p class="subtle">${body}</p>`}
      ${actions ? `<div class="empty-actions">${actions}</div>` : ""}
    </section>
  `;
}

export function formulaCard(formula) {
  return `
    <article class="formula-card">
      <span class="badge">Формула</span>
      <h3>${formula.title}</h3>
      <p class="formula-expression">${formula.expression}</p>
      <p class="formula-note">${formula.description}</p>
    </article>
  `;
}

export function metricCard(item) {
  return `
    <article class="metric">
      <span class="badge">${item.label}</span>
      <h3>${item.value}</h3>
      <p>${item.note}</p>
    </article>
  `;
}

export function filterBarHtml(filters) {
  const data = getCourseData();
  const counts = sectionCounts(data);
  return `
    <section class="filter-bar">
      <div class="toggle-row">
        <button class="toggle ${filters.section === "all" ? "active" : ""}" data-section-filter="all" type="button">Все темы (${data.length})</button>
        <button class="toggle ${filters.section === sectionNames.planimetry ? "active" : ""}" data-section-filter="${sectionNames.planimetry}" type="button">${sectionMeta(sectionNames.planimetry).shortLabel} · ${sectionNames.planimetry} (${counts[sectionNames.planimetry] || 0})</button>
        <button class="toggle ${filters.section === sectionNames.stereometry ? "active" : ""}" data-section-filter="${sectionNames.stereometry}" type="button">${sectionMeta(sectionNames.stereometry).shortLabel} · ${sectionNames.stereometry} (${counts[sectionNames.stereometry] || 0})</button>
      </div>
      <label class="search-field">
        <span>Фильтр тем</span>
        <input data-topic-query type="search" placeholder="Например: куб, площадь или цилиндр" value="${escapeAttribute(filters.query || "")}">
      </label>
    </section>
  `;
}

export function debounce(fn, delay = 180) {
  let timer = 0;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

export function rafThrottle(fn) {
  let frame = 0;
  let lastArgs = null;

  return (...args) => {
    lastArgs = args;
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      fn(...(lastArgs || []));
    });
  };
}

export function sceneFieldDefs(topic) {
  const map = {
    triangle: [["base", "Основание", 2, 12], ["height", "Высота", 2, 12]],
    square: [["base", "Сторона", 2, 12]],
    rectangle: [["base", "Длина", 2, 14], ["height", "Ширина", 2, 12]],
    circle: [["base", "Радиус", 2, 10]],
    parallelogram: [["base", "Основание", 2, 14], ["depth", "Сторона", 2, 12], ["height", "Высота", 2, 12], ["angle", "Угол", 20, 140, "°"]],
    rhombus: [["base", "Сторона", 2, 12], ["height", "Высота", 2, 12], ["angle", "Угол", 20, 140, "°"]],
    trapezoid: [["base", "Меньшее основание", 2, 12], ["depth", "Разница оснований", 2, 10], ["height", "Высота", 2, 12]],
    polygon: [["sides", "Число сторон", 3, 10], ["base", "Сторона", 2, 10]],
    ellipse: [["base", "Большая полуось", 2, 12], ["height", "Малая полуось", 2, 10]],
    sector: [["base", "Радиус", 2, 10], ["angle", "Угол", 20, 320, "°"]],
    cube: [["base", "Сторона", 1, 10]],
    "rectangular-prism": [["base", "Длина", 1, 12], ["depth", "Ширина", 1, 12], ["height", "Высота", 1, 12]],
    pyramid: [["base", "Основание", 1, 10], ["height", "Высота", 1, 12]],
    cylinder: [["base", "Радиус", 1, 8], ["height", "Высота", 1, 12]],
    cone: [["base", "Радиус", 1, 8], ["height", "Высота", 1, 12]],
    sphere: [["base", "Радиус", 1, 8]],
  }[topic.id] || [["base", "Размер", 1, 10]];

  return map.map(([key, label, min, max, suffix = ""]) => ({ key, label, min, max, suffix }));
}

export function computeMetrics(topic, sceneState) {
  const a = sceneState.base;
  const b = sceneState.depth;
  const h = sceneState.height;
  const angleRad = (sceneState.angle * Math.PI) / 180;

  const values = {
    triangle: [
      { label: "Площадь", value: `${round(0.5 * a * h)} см²`, note: "S = 1/2 ah" },
      { label: "Периметр", value: `${round(a + 2 * Math.sqrt((a / 2) ** 2 + h ** 2))} см`, note: "P = a + b + c" },
    ],
    square: [
      { label: "Площадь", value: `${round(a ** 2)} см²`, note: "S = a²" },
      { label: "Периметр", value: `${round(4 * a)} см`, note: "P = 4a" },
      { label: "Диагональ", value: `${round(a * Math.sqrt(2))} см`, note: "d = a√2" },
    ],
    rectangle: [
      { label: "Площадь", value: `${round(a * h)} см²`, note: "S = ab" },
      { label: "Периметр", value: `${round(2 * (a + h))} см`, note: "P = 2(a + b)" },
      { label: "Диагональ", value: `${round(Math.sqrt(a ** 2 + h ** 2))} см`, note: "d = √(a² + b²)" },
    ],
    circle: [
      { label: "Диаметр", value: `${round(2 * a)} см`, note: "d = 2r" },
      { label: "Длина окружности", value: `${round(2 * Math.PI * a)} см`, note: "C = 2πr" },
      { label: "Площадь", value: `${round(Math.PI * a ** 2)} см²`, note: "S = πr²" },
    ],
    parallelogram: [
      { label: "Периметр", value: `${round(2 * (a + b))} см`, note: "P = 2(a + b)" },
      { label: "Площадь", value: `${round(a * h)} см²`, note: "S = ah" },
      { label: "Через угол", value: `${round(a * b * Math.sin(angleRad))} см²`, note: "S = ab sin α" },
    ],
    rhombus: [
      { label: "Периметр", value: `${round(4 * a)} см`, note: "P = 4a" },
      { label: "Площадь", value: `${round(a * h)} см²`, note: "S = ah" },
      { label: "Через угол", value: `${round(a * a * Math.sin(angleRad))} см²`, note: "S = a² sin α" },
    ],
    trapezoid: [
      { label: "Средняя линия", value: `${round((a + a + b) / 2)} см`, note: "m = (a + b) / 2" },
      { label: "Площадь", value: `${round(((a + a + b) / 2) * h)} см²`, note: "S = ((a + b)/2)h" },
      { label: "Периметр", value: `${round(a + a + b + 2 * Math.sqrt((b / 2) ** 2 + h ** 2))} см`, note: "P = a + b + c + d" },
    ],
    polygon: [
      { label: "Периметр", value: `${round(sceneState.sides * a)} см`, note: "P = na" },
      { label: "Сумма углов", value: `${round(180 * (sceneState.sides - 2))}°`, note: "180°(n - 2)" },
      { label: "Один угол", value: `${round((180 * (sceneState.sides - 2)) / sceneState.sides)}°`, note: "180°(n - 2) / n" },
    ],
    ellipse: [
      { label: "Площадь", value: `${round(Math.PI * Math.max(a, h) * Math.min(a, h))} см²`, note: "S = πab" },
      { label: "Фокус", value: `${round(Math.sqrt(Math.max(Math.max(a, h) ** 2 - Math.min(a, h) ** 2, 0)))} см`, note: "c² = a² - b²" },
      { label: "Полуоси", value: `${Math.max(a, h)} / ${Math.min(a, h)}`, note: "Большая и малая полуоси." },
    ],
    sector: [
      { label: "Площадь", value: `${round((sceneState.angle / 360) * Math.PI * a ** 2)} см²`, note: "S = (α / 360°)πr²" },
      { label: "Длина дуги", value: `${round((sceneState.angle / 360) * 2 * Math.PI * a)} см`, note: "l = (α / 360°) · 2πr" },
      { label: "В радианах", value: `${round(0.5 * a ** 2 * angleRad)} см²`, note: "S = 1/2 r²α" },
    ],
    cube: [
      { label: "Объём", value: `${round(a ** 3)} см³`, note: "V = a³" },
      { label: "Площадь поверхности", value: `${round(6 * a ** 2)} см²`, note: "S = 6a²" },
      { label: "Диагональ", value: `${round(a * Math.sqrt(3))} см`, note: "d = a√3" },
    ],
    "rectangular-prism": [
      { label: "Объём", value: `${round(a * b * h)} см³`, note: "V = abc" },
      { label: "Площадь поверхности", value: `${round(2 * (a * b + b * h + a * h))} см²`, note: "S = 2(ab + bc + ac)" },
      { label: "Диагональ", value: `${round(Math.sqrt(a ** 2 + b ** 2 + h ** 2))} см`, note: "d = √(a² + b² + c²)" },
    ],
    pyramid: [
      { label: "Объём", value: `${round((a ** 2 * h) / 3)} см³`, note: "V = (1/3)Sh" },
      { label: "Апофема", value: `${round(Math.sqrt((a / 2) ** 2 + h ** 2))} см`, note: "l = √((a/2)² + h²)" },
      { label: "Боковая площадь", value: `${round(2 * a * Math.sqrt((a / 2) ** 2 + h ** 2))} см²`, note: "Sбок = 2al" },
    ],
    cylinder: [
      { label: "Объём", value: `${round(Math.PI * a ** 2 * h)} см³`, note: "V = πr²h" },
      { label: "Площадь поверхности", value: `${round(2 * Math.PI * a * (h + a))} см²`, note: "S = 2πr(h + r)" },
    ],
    cone: [
      { label: "Объём", value: `${round((Math.PI * a ** 2 * h) / 3)} см³`, note: "V = (1/3)πr²h" },
      { label: "Площадь поверхности", value: `${round(Math.PI * a * (Math.sqrt(a ** 2 + h ** 2) + a))} см²`, note: "S = πr(l + r)" },
      { label: "Образующая", value: `${round(Math.sqrt(a ** 2 + h ** 2))} см`, note: "l = √(r² + h²)" },
    ],
    sphere: [
      { label: "Объём", value: `${round((4 / 3) * Math.PI * a ** 3)} см³`, note: "V = (4/3)πr³" },
      { label: "Площадь поверхности", value: `${round(4 * Math.PI * a ** 2)} см²`, note: "S = 4πr²" },
    ],
  };

  return values[topic.id] || [{ label: "Размер", value: `${a}`, note: "Текущий параметр фигуры." }];
}

export function syncProgressUi(progress = readProgress()) {
  const xp = refs.xpTotal();
  const count = refs.topicCount();
  if (xp) xp.textContent = String(progress.totalXp || 0);
  if (count) count.textContent = String(getCourseData().length);
}

function syncStickyOffsets() {
  const topbar = refs.topbar();
  if (!(topbar instanceof HTMLElement)) return;

  const computed = window.getComputedStyle(topbar);
  const topOffset = Number.parseFloat(computed.top) || 0;
  const safeHeight = Math.ceil(topbar.getBoundingClientRect().height || 0);

  document.documentElement.style.setProperty("--topbar-offset", `${Math.max(0, Math.round(topOffset))}px`);
  if (safeHeight > 0) {
    document.documentElement.style.setProperty("--topbar-safe-height", `${safeHeight}px`);
  }
}

const scheduleStickyOffsetSync = rafThrottle(() => {
  syncStickyOffsets();
});

function bindStickyOffsetSync() {
  if (stickyOffsetBound) return;
  stickyOffsetBound = true;

  window.addEventListener("resize", scheduleStickyOffsetSync);
  window.addEventListener("orientationchange", scheduleStickyOffsetSync);
}

function setViewMeta({ title, badge }) {
  const titleNode = refs.viewTitle();
  const badgeNode = refs.routeBadge();
  if (titleNode && title) titleNode.textContent = title;
  if (badgeNode && badge) badgeNode.textContent = badge;
}

function setActiveTopnav(page) {
  document.querySelectorAll("[data-page-link]").forEach((link) => {
    const target = link.getAttribute("data-page-link");
    link.classList.toggle("active", target === page);
  });
}

function sidebarShortcutLink(shortcutPage, topicId) {
  if (shortcutPage === "tests") return testsLink(topicId);
  if (shortcutPage === "scene") return sceneLink(topicId);
  if (shortcutPage === "profile") return profileLink(topicId);
  return theoryLink(topicId);
}

function syncShortcuts(shortcutPage = "theory", currentTopicId = "") {
  const host = refs.topicShortcuts();
  if (!host) return;

  const grouped = groupTopicsBySection(getCourseData());

  host.innerHTML = orderedSections().map((section) => {
    const meta = sectionMeta(section);
    const topics = grouped[section] || [];

    return `
      <section class="shortcut-group ${meta.accentClass}">
        <div class="title-row">
          <div>
            <p class="eyebrow">${meta.shortLabel}</p>
            <h3>${meta.title}</h3>
          </div>
          <span class="badge">${topics.length}</span>
        </div>
        <p class="subtle shortcut-group-copy">${meta.description}</p>
        <div class="shortcut-stack">
          ${topics.map((topic) => `
            <a class="shortcut ${currentTopicId === topic.id ? "active" : ""}" href="${sidebarShortcutLink(shortcutPage, topic.id)}">
              <strong>${topic.title}</strong>
              <span>${topic.section}</span>
            </a>
          `).join("")}
        </div>
      </section>
    `;
  }).join("");
}

function bindResetProgress() {
  if (resetBound) return;
  resetBound = true;

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target.id !== "reset-progress") return;

    resetProgress();
    syncProgressUi();
    window.location.reload();
  });
}

export function initShell({ page, title, badge, currentTopicId = "", shortcutPage = "theory" }) {
  bindResetProgress();
  bindStickyOffsetSync();
  syncStickyOffsets();
  setActiveTopnav(page);
  syncProgressUi(readProgress());
  syncShortcuts(shortcutPage, currentTopicId);
  setViewMeta({ title, badge });
}

function homeViewHtml() {
  const data = getCourseData();
  const counts = sectionCounts(data);
  const progress = readProgress();
  const progressPercent = overallPercent(progress);

  return `
    <div class="stats">
      <article class="stat-card">
        <span class="badge">Темы</span>
        <h3>${data.length}</h3>
        <p>Курс объединяет планиметрию и стереометрию в единой структуре.</p>
      </article>
      <article class="stat-card">
        <span class="badge">${sectionNames.planimetry}</span>
        <h3>${counts[sectionNames.planimetry] || 0}</h3>
        <p>Плоские фигуры, формулы, свойства и 2D-сцены.</p>
      </article>
      <article class="stat-card">
        <span class="badge">${sectionNames.stereometry}</span>
        <h3>${counts[sectionNames.stereometry] || 0}</h3>
        <p>3D-тела, объёмы, площади поверхностей и ротация моделей.</p>
      </article>
      <article class="stat-card">
        <span class="badge">Прогресс</span>
        <h3>${progressPercent}%</h3>
        <div class="progress"><span style="width:${progressPercent}%"></span></div>
      </article>
    </div>

    <div class="cards">
      <article class="card content-card">
        <span class="badge">Теория</span>
        <h3>Все темы в едином формате</h3>
        <p>Каждая тема включает определение, свойства, формулы, пример и прикладной контекст.</p>
        <div class="card-actions">
          <a class="button" href="${theoryLink()}">Открыть теорию</a>
        </div>
      </article>

      <article class="card content-card">
        <span class="badge">Тесты</span>
        <h3>Проверка понимания</h3>
        <p>Вопросы по формулам и свойствам + автоматический подсчёт XP и лучшего результата.</p>
        <div class="card-actions">
          <a class="button" href="${testsLink()}">Перейти к тестам</a>
        </div>
      </article>

      <article class="card content-card">
        <span class="badge">Сцена</span>
        <h3>2D/3D визуализация</h3>
        <p>Параметры фигур меняются в реальном времени, а для 3D подключается Three.js только по запросу.</p>
        <div class="card-actions">
          <a class="button" href="${sceneLink("cube")}">Открыть сцену</a>
        </div>
      </article>

      <article class="card content-card">
        <span class="badge">Профиль</span>
        <h3>Прогресс по материалам</h3>
        <p>Смотри завершённые темы, лучший результат по тестам и общий прогресс курса в одном месте.</p>
        <div class="card-actions">
          <a class="button" href="${profileLink()}">Открыть профиль</a>
        </div>
      </article>
    </div>
  `;
}

export function renderHomePage() {
  initShell({
    page: "home",
    title: "Главная",
    badge: routeLabel("home"),
    shortcutPage: "theory",
  });

  const root = refs.viewRoot();
  if (root) root.innerHTML = homeViewHtml();
}

export { STORAGE_KEYS, sectionNames };
