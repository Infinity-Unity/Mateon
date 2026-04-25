import * as Core from "./core.js";

const STORAGE_KEY = "mateon-theory-filters-v2";

const state = {
  filters: loadFilters(),
};

let viewMode = "list";
let eventsBound = false;

const refs = {
  root: () => document.getElementById("view-root"),
};

const scheduleRenderList = Core.rafThrottle(() => {
  renderList();
});

function loadFilters() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return { ...Core.defaultFilters(), ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return Core.defaultFilters();
  }
}

function saveFilters() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.filters));
  } catch {
    /* ignore */
  }
}

function topicCard(topic, progress) {
  const stat = Core.getTopicStat(topic.id, progress);

  return `
    <article class="card content-card">
      <div class="title-row">
        <h3>${topic.title}</h3>
        <span class="badge">${topic.section}</span>
      </div>
      <p>${Core.excerpt(topic.description)}</p>
      <div class="meta-line">
        <span>${topic.properties.length} свойств</span>
        <span>${topic.formulas.length} формул</span>
        <span>XP: ${stat.xp || 0}</span>
      </div>
      <div class="card-actions card-actions-split">
        <a class="button" href="${Core.theoryLink(topic.id)}">Теория</a>
        <a class="button secondary" href="${Core.sceneLink(topic.id)}">${Core.isStereo(topic) ? "Открыть 3D" : "Открыть сцену"}</a>
        <a class="button secondary" href="${Core.testsLink(topic.id)}">К тесту</a>
      </div>
    </article>
  `;
}

function topicSection(section, topics, progress) {
  const meta = Core.sectionMeta(section);

  return `
    <section class="section-panel ${meta.accentClass}">
      <div class="section-panel-header">
        <div>
          <p class="eyebrow">${meta.shortLabel}</p>
          <h3>${meta.title}</h3>
          <p class="subtle">${meta.description}</p>
        </div>
        <span class="badge">${topics.length}</span>
      </div>
      <div class="cards">
        ${topics.map((topic) => topicCard(topic, progress)).join("")}
      </div>
    </section>
  `;
}

function renderList() {
  viewMode = "list";

  const root = refs.root();
  if (!root) return;

  const topics = Core.filterTopics(Core.getCourseData(), state.filters);
  const progress = Core.readProgress();
  const grouped = Core.groupTopicsBySection(topics);
  const sections = state.filters.section === "all" ? Core.orderedSections() : [state.filters.section];

  Core.initShell({
    page: "theory",
    title: "Теория",
    badge: Core.routeLabel("theory"),
    shortcutPage: "theory",
  });

  root.innerHTML = `
    ${Core.filterBarHtml(state.filters)}
    ${topics.length
      ? `
        <div class="section-shell">
          ${sections
            .map((section) => {
              const sectionTopics = grouped[section] || [];
              if (!sectionTopics.length) return "";
              return topicSection(section, sectionTopics, progress);
            })
            .join("")}
        </div>
      `
      : Core.emptyView(
        "Темы не найдены",
        "Попробуй изменить фильтр или очистить поисковый запрос.",
        `<button class="button" data-clear-theory-filters type="button">Показать все темы</button>`,
      )}
  `;
}

function renderTopic(topicId) {
  const root = refs.root();
  if (!root) return;

  const topic = Core.getTopic(topicId);
  if (!topic) {
    Core.initShell({
      page: "theory",
      title: "Теория",
      badge: Core.routeLabel("theory"),
      shortcutPage: "theory",
    });

    root.innerHTML = Core.emptyView(
      "Тема не найдена",
      "Проверь ссылку или открой список всех тем.",
      `<a class="button" href="${Core.theoryLink()}">К списку тем</a>`,
    );
    return;
  }

  viewMode = "topic";

  Core.initShell({
    page: "theory",
    title: `Теория: ${topic.title}`,
    badge: Core.routeLabel("theory", topic.id),
    currentTopicId: topic.id,
    shortcutPage: "theory",
  });

  root.innerHTML = `
    <div class="cards">
      <article class="card content-card">
        <span class="badge">${topic.section}</span>
        <h3>Определение</h3>
        <p>${topic.definition}</p>
        <h3>Краткое объяснение</h3>
        <p>${topic.description}</p>
      </article>

      <article class="card content-card">
        <span class="badge">Свойства</span>
        <h3>Основные свойства</h3>
        <ul class="property-list">
          ${topic.properties.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </article>
    </div>

    <div class="formula-grid">
      ${topic.formulas.map(Core.formulaCard).join("")}
    </div>

    <div class="cards">
      <article class="card content-card">
        <span class="badge">Пример</span>
        <h3>Разбор</h3>
        ${topic.example.map((line) => `<p>${line}</p>`).join("")}
      </article>

      <article class="card content-card">
        <span class="badge">Применение</span>
        <h3>Где используется</h3>
        <p>${topic.usage}</p>
        <div class="card-actions">
          <a class="button" href="${Core.sceneLink(topic.id)}">${Core.isStereo(topic) ? "Сцена 3D" : "Открыть сцену"}</a>
          <a class="button secondary" href="${Core.testsLink(topic.id)}">Перейти к тесту</a>
          <a class="button secondary" href="${Core.theoryLink()}">Все темы</a>
        </div>
      </article>
    </div>
  `;
}

function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  const onQuery = Core.debounce((value) => {
    state.filters.query = value;
    saveFilters();
    scheduleRenderList();
  }, 180);

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const clearFilters = target.closest("[data-clear-theory-filters]");
    if (clearFilters) {
      state.filters = Core.defaultFilters();
      saveFilters();
      renderList();
      return;
    }

    const filterBtn = target.closest("[data-section-filter]");
    if (viewMode !== "list" || !filterBtn) return;

    state.filters.section = filterBtn.dataset.sectionFilter || "all";
    saveFilters();
    scheduleRenderList();
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (viewMode !== "list") return;
    if (!target.matches("[data-topic-query]")) return;

    onQuery(target.value);
  });
}

function init() {
  bindEvents();

  const topicId = Core.queryTopic();
  if (topicId) renderTopic(topicId);
  else renderList();
}

window.addEventListener("DOMContentLoaded", init);
