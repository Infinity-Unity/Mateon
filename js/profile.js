import * as Core from "./core.js";

const refs = {
  root: () => document.getElementById("view-root"),
};

function completedTopics(progress) {
  return Core.getCourseData().filter((topic) => {
    const stat = Core.getTopicStat(topic.id, progress);
    return Boolean(stat.completed);
  });
}

function remainingTopics(progress) {
  return Core.getCourseData().filter((topic) => {
    const stat = Core.getTopicStat(topic.id, progress);
    return !stat.completed;
  });
}

function averageBestScore(progress) {
  const scores = Object.values(progress.topicStats)
    .map((stat) => Number(stat.bestScore) || 0)
    .filter((score) => score > 0);

  if (!scores.length) return 0;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function completedSectionCount(section, progress) {
  return completedTopics(progress).filter((topic) => topic.section === section).length;
}

function statusText(stat) {
  return stat.completed ? "Пройдено" : "Не завершено";
}

function materialCard(topic, progress, mode = "completed") {
  const stat = Core.getTopicStat(topic.id, progress);

  return `
    <article class="card content-card profile-topic-card">
      <div class="title-row">
        <h3>${topic.title}</h3>
        <span class="badge">${mode === "completed" ? `${stat.bestScore || 0}%` : topic.section}</span>
      </div>
      <p>${Core.excerpt(topic.description, 135)}</p>
      <div class="meta-line">
        <span>${statusText(stat)}</span>
        <span>XP: ${stat.xp || 0}</span>
        <span>${topic.section}</span>
      </div>
      <div class="card-actions">
        <a class="button" href="${Core.profileLink(topic.id)}">Открыть профиль темы</a>
        <a class="button secondary" href="${Core.theoryLink(topic.id)}">Теория</a>
        <a class="button secondary" href="${Core.testsLink(topic.id)}">${stat.completed ? "Повторить тест" : "Пройти тест"}</a>
      </div>
    </article>
  `;
}

function materialSection(title, section, topics, progress, mode = "completed") {
  const meta = Core.sectionMeta(section);

  return `
    <section class="section-panel ${meta.accentClass}">
      <div class="section-panel-header">
        <div>
          <p class="eyebrow">${meta.shortLabel}</p>
          <h3>${title}</h3>
          <p class="subtle">${meta.description}</p>
        </div>
        <span class="badge">${topics.length}</span>
      </div>
      ${topics.length
        ? `
          <div class="cards">
            ${topics.map((topic) => materialCard(topic, progress, mode)).join("")}
          </div>
        `
        : `
          <section class="empty profile-empty">
            <h3>${mode === "completed" ? "Пока пусто" : "Все темы завершены"}</h3>
            <p class="subtle">${mode === "completed" ? "Заверши тесты по этому разделу, чтобы материалы появились здесь." : "В этом разделе уже нет незавершённых тем."}</p>
          </section>
        `}
    </section>
  `;
}

function profileOverviewHtml() {
  const progress = Core.readProgress();
  const allTopics = Core.getCourseData();
  const completed = completedTopics(progress);
  const pending = remainingTopics(progress);
  const percent = Math.round((completed.length / Math.max(allTopics.length, 1)) * 100);
  const groupedCompleted = Core.groupTopicsBySection(completed);
  const groupedPending = Core.groupTopicsBySection(pending);
  const averageScore = averageBestScore(progress);

  return `
    <section class="profile-hero panel-like">
      <div class="profile-hero-copy">
        <p class="eyebrow">Учебный профиль</p>
        <h3>Твой прогресс по материалам</h3>
        <p class="subtle">Здесь собраны завершённые темы, общий прогресс курса и то, что осталось пройти дальше.</p>
      </div>
      <div class="profile-progress-card">
        <div class="title-row">
          <span class="badge">Прогресс курса</span>
          <strong>${percent}%</strong>
        </div>
        <div class="progress"><span style="width:${percent}%"></span></div>
        <p class="subtle">${completed.length} из ${allTopics.length} тем уже отмечены как завершённые.</p>
      </div>
    </section>

    <div class="stats">
      <article class="stat-card">
        <span class="badge">XP</span>
        <h3>${progress.totalXp || 0}</h3>
        <p>Суммарный опыт за лучшие результаты по темам.</p>
      </article>
      <article class="stat-card">
        <span class="badge">Пройдено</span>
        <h3>${completed.length}/${allTopics.length}</h3>
        <p>Количество завершённых материалов по всему курсу.</p>
      </article>
      <article class="stat-card">
        <span class="badge">Средний результат</span>
        <h3>${averageScore}%</h3>
        <p>Средний лучший балл по уже завершённым темам.</p>
      </article>
      <article class="stat-card">
        <span class="badge">2D / 3D</span>
        <h3>${completedSectionCount(Core.sectionNames.planimetry, progress)} / ${completedSectionCount(Core.sectionNames.stereometry, progress)}</h3>
        <p>Сколько материалов закрыто в планиметрии и стереометрии.</p>
      </article>
    </div>

    <div class="section-shell">
      ${materialSection("Пройденные материалы: 2D", Core.sectionNames.planimetry, groupedCompleted[Core.sectionNames.planimetry] || [], progress, "completed")}
      ${materialSection("Пройденные материалы: 3D", Core.sectionNames.stereometry, groupedCompleted[Core.sectionNames.stereometry] || [], progress, "completed")}
    </div>

    <div class="section-shell">
      ${materialSection("Осталось пройти: 2D", Core.sectionNames.planimetry, groupedPending[Core.sectionNames.planimetry] || [], progress, "pending")}
      ${materialSection("Осталось пройти: 3D", Core.sectionNames.stereometry, groupedPending[Core.sectionNames.stereometry] || [], progress, "pending")}
    </div>
  `;
}

function profileTopicHtml(topic) {
  const progress = Core.readProgress();
  const stat = Core.getTopicStat(topic.id, progress);
  const completed = Boolean(stat.completed);

  return `
    <section class="profile-hero panel-like">
      <div class="profile-hero-copy">
        <p class="eyebrow">Профиль темы</p>
        <h3>${topic.title}</h3>
        <p class="subtle">${topic.description}</p>
      </div>
      <div class="profile-progress-card">
        <div class="title-row">
          <span class="badge">${completed ? "Пройдено" : "В процессе"}</span>
          <strong>${stat.bestScore || 0}%</strong>
        </div>
        <div class="progress"><span style="width:${stat.bestScore || 0}%"></span></div>
        <p class="subtle">${completed ? "Тема уже закрыта тестом и сохранена в профиле." : "Тема ещё не отмечена как завершённая."}</p>
      </div>
    </section>

    <div class="stats">
      <article class="stat-card">
        <span class="badge">Статус</span>
        <h3>${completed ? "Готово" : "Не готово"}</h3>
        <p>${topic.section}</p>
      </article>
      <article class="stat-card">
        <span class="badge">XP</span>
        <h3>${stat.xp || 0}</h3>
        <p>Лучший сохранённый результат по теме.</p>
      </article>
      <article class="stat-card">
        <span class="badge">Формулы</span>
        <h3>${topic.formulas.length}</h3>
        <p>Количество формул и ключевых выражений.</p>
      </article>
      <article class="stat-card">
        <span class="badge">Свойства</span>
        <h3>${topic.properties.length}</h3>
        <p>Основные свойства темы для повторения.</p>
      </article>
    </div>

    <div class="cards">
      <article class="card content-card">
        <span class="badge">Дальше</span>
        <h3>${completed ? "Материал уже завершён" : "Тема ещё ждёт завершения"}</h3>
        <p>${completed ? "Можно повторить тест, открыть теорию для освежения знаний или перейти к сцене." : "Открой теорию, потренируйся на сцене и заверши тест, чтобы тема появилась в пройденных материалах."}</p>
        <div class="card-actions">
          <a class="button" href="${Core.testsLink(topic.id)}">${completed ? "Повторить тест" : "Пройти тест"}</a>
          <a class="button secondary" href="${Core.theoryLink(topic.id)}">К теории</a>
          <a class="button secondary" href="${Core.sceneLink(topic.id)}">${Core.isStereo(topic) ? "Открыть 3D" : "Открыть сцену"}</a>
          <a class="button secondary" href="${Core.profileLink()}">К общему профилю</a>
        </div>
      </article>

      <article class="card content-card">
        <span class="badge">Определение</span>
        <h3>Короткое напоминание</h3>
        <p>${topic.definition}</p>
      </article>
    </div>
  `;
}

function renderProfileOverview() {
  Core.initShell({
    page: "profile",
    title: "Профиль",
    badge: Core.routeLabel("profile"),
    shortcutPage: "profile",
  });

  const root = refs.root();
  if (root) root.innerHTML = profileOverviewHtml();
}

function renderProfileTopic(topicId) {
  const root = refs.root();
  if (!root) return;

  const topic = Core.getTopic(topicId);
  if (!topic) {
    Core.initShell({
      page: "profile",
      title: "Профиль",
      badge: Core.routeLabel("profile"),
      shortcutPage: "profile",
    });

    root.innerHTML = Core.emptyView(
      "Тема не найдена",
      "Проверь ссылку или вернись к общему профилю.",
      `<a class="button" href="${Core.profileLink()}">К профилю</a>`,
    );
    return;
  }

  Core.initShell({
    page: "profile",
    title: `Профиль: ${topic.title}`,
    badge: Core.routeLabel("profile", topic.id),
    currentTopicId: topic.id,
    shortcutPage: "profile",
  });

  root.innerHTML = profileTopicHtml(topic);
}

function init() {
  const topicId = Core.queryTopic();
  if (topicId) renderProfileTopic(topicId);
  else renderProfileOverview();
}

window.addEventListener("DOMContentLoaded", init);

