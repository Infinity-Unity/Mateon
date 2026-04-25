import * as Core from "./core.js";

const FILTER_STORAGE_KEY = "mateon-tests-filters-v2";

const sessions = {};
const state = {
  filters: loadFilters(),
};

let viewMode = "list";
let eventsBound = false;

let QUESTION_BANK = {};

const refs = {
  root: () => document.getElementById("view-root"),
};

const scheduleRenderList = Core.rafThrottle(() => {
  renderList();
});

function loadFilters() {
  try {
    const raw = sessionStorage.getItem(FILTER_STORAGE_KEY);
    return { ...Core.defaultFilters(), ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return Core.defaultFilters();
  }
}

function saveFilters() {
  try {
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(state.filters));
  } catch {
    /* ignore */
  }
}

function rotateOptions(options, seed) {
  if (!options.length) return [];
  const shift = seed % options.length;
  return options.slice(shift).concat(options.slice(0, shift));
}

function stereoQuestions(topic) {
  const questionsByTopic = {
    cube: [
      ["Найди объём куба со стороной 3.", ["27", "9", "18", "81"], "27", "V = a³, значит 3³ = 27."],
      ["Чему равна площадь поверхности куба со стороной 2?", ["24", "8", "12", "16"], "24", "S = 6a², значит 6 · 2² = 24."],
      ["Что больше: объём куба 4×4×4 или 3×3×3?", ["4×4×4", "3×3×3", "Они равны", "Недостаточно данных"], "4×4×4", "64 больше 27."],
    ],
    "rectangular-prism": [
      ["Найди объём прямоугольного параллелепипеда 4×3×2.", ["24", "18", "12", "29"], "24", "V = abc = 4 · 3 · 2."],
      ["Чему равна площадь поверхности 4×3×2?", ["52", "24", "48", "29"], "52", "S = 2(ab + bc + ac) = 2(12 + 6 + 8) = 52."],
      ["Что больше: объём 4×3×2 или 3×3×3?", ["3×3×3", "4×3×2", "Они равны", "Нельзя сравнить"], "3×3×3", "24 меньше 27."],
    ],
    pyramid: [
      ["Найди объём пирамиды: S основания = 36, h = 6.", ["72", "216", "108", "42"], "72", "V = (1/3)Sh = (1/3) · 36 · 6."],
      ["Найди объём пирамиды: S основания = 27, h = 3.", ["27", "81", "18", "9"], "27", "V = (1/3) · 27 · 3."],
      ["При одинаковом основании больше объём у пирамиды высоты 9 или 3?", ["Высоты 9", "Высоты 3", "Они равны", "Зависит от апофемы"], "Высоты 9", "При фиксированном основании объём пропорционален высоте."],
    ],
    cylinder: [
      ["Найди объём цилиндра при r = 2, h = 5.", ["20π", "10π", "40π", "8π"], "20π", "V = πr²h = π · 4 · 5."],
      ["Чему равна площадь поверхности цилиндра при r = 2, h = 3?", ["20π", "10π", "16π", "14π"], "20π", "S = 2πr(h + r) = 2π · 2 · (3 + 2)."],
      ["Что больше: объём цилиндра при r = 3 или r = 2 (h одинаковая)?", ["При r = 3", "При r = 2", "Они равны", "Зависит от площади"], "При r = 3", "Объём зависит от r², больший радиус даёт больший объём."],
    ],
    cone: [
      ["Найди объём конуса при r = 3, h = 4.", ["12π", "36π", "9π", "18π"], "12π", "V = (1/3)πr²h = (1/3)π · 9 · 4."],
      ["Чему равна образующая конуса при r = 3, h = 4?", ["5", "7", "12", "4"], "5", "l = √(r² + h²) = √25."],
      ["Что больше при одинаковых r и h: объём цилиндра или конуса?", ["Цилиндра", "Конуса", "Они равны", "Нельзя сравнить"], "Цилиндра", "Объём конуса равен одной трети объёма цилиндра."],
    ],
    sphere: [
      ["Чему равна площадь поверхности сферы радиуса 3?", ["36π", "12π", "27π", "18π"], "36π", "S = 4πr² = 4π · 9."],
      ["Чему равен объём сферы радиуса 3?", ["36π", "27π", "12π", "18π"], "36π", "V = (4/3)πr³ = (4/3)π · 27."],
      ["Что больше: объём сферы радиуса 4 или 3?", ["Радиуса 4", "Радиуса 3", "Они равны", "Зависит от площади"], "Радиуса 4", "Объём растёт как r³."],
    ],
  };

  const rows = questionsByTopic[topic.id] || [];

  return rows.map((row, index) => ({
    id: `${topic.id}-stereo-${index}`,
    topicId: topic.id,
    question: row[0],
    options: row[1],
    correctAnswer: row[2],
    explanation: row[3],
    theoryLink: Core.theoryLink(topic.id),
    xp: 15,
  }));
}

function buildQuestionBank() {
  const courseData = Core.getCourseData();

  const allProperties = courseData.flatMap((topic) => topic.properties.map((value) => ({ topicId: topic.id, value })));
  const allFormulas = courseData.flatMap((topic) => topic.formulas.map((item) => ({ topicId: topic.id, value: item.expression })));

  return courseData.reduce((acc, topic, index) => {
    const formula = topic.formulas[index % topic.formulas.length];
    const property = topic.properties[index % topic.properties.length];

    const formulaOptions = [
      formula.expression,
      ...topic.formulas.filter((item) => item.expression !== formula.expression).map((item) => item.expression),
      ...allFormulas.filter((item) => item.topicId !== topic.id).map((item) => item.value),
    ]
      .filter((value, optionIndex, array) => array.indexOf(value) === optionIndex)
      .slice(0, 4);

    const propertyOptions = [
      property,
      ...allProperties.filter((item) => item.topicId !== topic.id).map((item) => item.value),
    ]
      .filter((value, optionIndex, array) => array.indexOf(value) === optionIndex)
      .slice(0, 4);

    acc[topic.id] = [
      {
        id: `${topic.id}-formula`,
        topicId: topic.id,
        question: `Какая формула относится к блоку «${formula.title}» в теме «${topic.title}»?`,
        options: rotateOptions(formulaOptions, index),
        correctAnswer: formula.expression,
        explanation: formula.description,
        theoryLink: Core.theoryLink(topic.id),
        xp: 10,
      },
      {
        id: `${topic.id}-property`,
        topicId: topic.id,
        question: `Какое утверждение относится к теме «${topic.title}»?`,
        options: rotateOptions(propertyOptions, index + 1),
        correctAnswer: property,
        explanation: `В теории по теме указано: ${property}`,
        theoryLink: Core.theoryLink(topic.id),
        xp: 10,
      },
      ...stereoQuestions(topic),
    ];

    return acc;
  }, {});
}

function getSession(topicId) {
  if (!sessions[topicId]) {
    sessions[topicId] = {
      topicId,
      questions: QUESTION_BANK[topicId] || [],
      index: 0,
      selected: "",
      revealed: false,
      correctCount: 0,
      earnedXp: 0,
      finished: false,
      saved: false,
    };
  }

  return sessions[topicId];
}

function restartSession(topicId) {
  delete sessions[topicId];
  return getSession(topicId);
}

function finalizeSession(session) {
  if (session.saved) return;

  Core.mutateProgress((progress) => {
    const current = progress.topicStats[session.topicId] || { xp: 0, bestScore: 0, completed: false };
    const percent = Math.round((session.correctCount / Math.max(session.questions.length, 1)) * 100);
    const bestXp = Math.max(current.xp || 0, session.earnedXp);
    const deltaXp = Math.max(0, session.earnedXp - (current.xp || 0));

    progress.totalXp += deltaXp;
    progress.topicStats[session.topicId] = {
      xp: bestXp,
      bestScore: Math.max(current.bestScore || 0, percent),
      completed: true,
    };

    if (!progress.completed.includes(session.topicId)) {
      progress.completed.push(session.topicId);
    }
  });

  session.saved = true;
}

function testCard(topic, progress) {
  const stat = Core.getTopicStat(topic.id, progress);
  const questionCount = (QUESTION_BANK[topic.id] || []).length;

  return `
    <article class="card content-card">
      <div class="title-row">
        <h3>${topic.title}</h3>
        <span class="badge">${stat.bestScore || 0}%</span>
      </div>
      <p>${Core.excerpt(topic.description)}</p>
      <div class="meta-line">
        <span>${questionCount} вопросов</span>
        <span>XP: ${stat.xp || 0}</span>
        <span>${topic.section}</span>
      </div>
      <div class="card-actions card-actions-split">
        <a class="button" href="${Core.testsLink(topic.id)}">Начать тест</a>
        <a class="button secondary" href="${Core.theoryLink(topic.id)}">К теории</a>
        <a class="button secondary" href="${Core.sceneLink(topic.id)}">${Core.isStereo(topic) ? "К 3D" : "К сцене"}</a>
      </div>
    </article>
  `;
}

function testSection(section, topics, progress) {
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
        ${topics.map((topic) => testCard(topic, progress)).join("")}
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
  const totalQuestions = topics.reduce((sum, topic) => sum + (QUESTION_BANK[topic.id] || []).length, 0);
  const flatCount = (grouped[Core.sectionNames.planimetry] || []).length;
  const solidCount = (grouped[Core.sectionNames.stereometry] || []).length;

  Core.initShell({
    page: "tests",
    title: "Тесты",
    badge: Core.routeLabel("tests"),
    shortcutPage: "tests",
  });

  root.innerHTML = `
    ${Core.filterBarHtml(state.filters)}

    <div class="stats">
      <article class="stat-card">
        <span class="badge">2D</span>
        <h3>${flatCount}</h3>
        <p>Плоские фигуры и задачи по планиметрии.</p>
      </article>
      <article class="stat-card">
        <span class="badge">3D</span>
        <h3>${solidCount}</h3>
        <p>Объёмные тела и вопросы по стереометрии.</p>
      </article>
      <article class="stat-card">
        <span class="badge">Вопросы</span>
        <h3>${totalQuestions}</h3>
        <p>Формулы, свойства, вычисления и сравнение фигур.</p>
      </article>
      <article class="stat-card">
        <span class="badge">Завершено</span>
        <h3>${progress.completed.length}</h3>
        <p>Результаты сохраняются локально в браузере.</p>
      </article>
    </div>

    ${topics.length
      ? `
        <div class="section-shell">
          ${sections
            .map((section) => {
              const sectionTopics = grouped[section] || [];
              if (!sectionTopics.length) return "";
              return testSection(section, sectionTopics, progress);
            })
            .join("")}
        </div>
      `
      : Core.emptyView(
        "Тесты не найдены",
        "Попробуй изменить фильтр или очистить поисковый запрос.",
        `<button class="button" data-clear-test-filters type="button">Показать все тесты</button>`,
      )}
  `;
}

function renderTopic(topicId) {
  const root = refs.root();
  if (!root) return;

  const topic = Core.getTopic(topicId);
  if (!topic) {
    Core.initShell({
      page: "tests",
      title: "Тесты",
      badge: Core.routeLabel("tests"),
      shortcutPage: "tests",
    });

    root.innerHTML = Core.emptyView(
      "Тема не найдена",
      "Проверь ссылку или вернись к списку тестов.",
      `<a class="button" href="${Core.testsLink()}">К списку тестов</a>`,
    );
    return;
  }

  viewMode = "topic";

  Core.initShell({
    page: "tests",
    title: `Тесты: ${topic.title}`,
    badge: Core.routeLabel("tests", topic.id),
    currentTopicId: topic.id,
    shortcutPage: "tests",
  });

  const session = getSession(topic.id);
  const questions = session.questions;

  if (!questions.length) {
    root.innerHTML = Core.emptyView("Для темы пока нет вопросов", "Добавь вопросы в данные курса и обнови страницу.");
    return;
  }

  if (session.finished) {
    finalizeSession(session);
    const percent = Math.round((session.correctCount / Math.max(questions.length, 1)) * 100);

    root.innerHTML = `
      <div class="stats topic-stats">
        <article class="stat-card">
          <span class="badge">Результат</span>
          <h3>${percent}%</h3>
          <p>${session.correctCount} из ${questions.length} верно.</p>
        </article>
        <article class="stat-card">
          <span class="badge">XP</span>
          <h3>${session.earnedXp}</h3>
          <p>Лучший результат по теме сохранён.</p>
        </article>
        <article class="stat-card">
          <span class="badge">Тема</span>
          <h3>${topic.title}</h3>
          <p>${topic.section}</p>
        </article>
      </div>

      <section class="empty">
        <h3>Тест завершён</h3>
        <p class="subtle">Можно пройти тему заново, вернуться к теории или открыть сцену.</p>
        <div class="empty-actions">
          <button class="button" data-test-action="restart" data-topic-id="${topic.id}" type="button">Пройти заново</button>
          <a class="button secondary" href="${Core.theoryLink(topic.id)}">К теории</a>
          <a class="button secondary" href="${Core.sceneLink(topic.id)}">${Core.isStereo(topic) ? "Открыть 3D" : "Открыть сцену"}</a>
        </div>
      </section>
    `;

    Core.syncProgressUi();
    return;
  }

  const question = questions[session.index];
  const currentStat = Core.getTopicStat(topic.id);

  root.innerHTML = `
    <div class="stats topic-stats">
      <article class="stat-card">
        <span class="badge">Вопрос</span>
        <h3>${session.index + 1}/${questions.length}</h3>
        <p>${topic.title}</p>
      </article>
      <article class="stat-card">
        <span class="badge">Верно</span>
        <h3>${session.correctCount}</h3>
        <p>Текущая серия ответов.</p>
      </article>
      <article class="stat-card">
        <span class="badge">Лучший результат</span>
        <h3>${currentStat.bestScore || 0}%</h3>
        <p>Сохранённый прогресс по теме.</p>
      </article>
    </div>

    <article class="card content-card">
      <span class="badge">${topic.section}</span>
      <h3>${question.question}</h3>

      <div class="options">
        ${question.options.map((option) => {
          const classes = ["option"];
          if (session.selected === option) classes.push("selected");
          if (session.revealed && option === question.correctAnswer) classes.push("correct");
          if (session.revealed && session.selected === option && option !== question.correctAnswer) classes.push("wrong");

          return `<button class="${classes.join(" ")}" data-test-option="${Core.escapeAttribute(option)}" type="button">${option}</button>`;
        }).join("")}
      </div>

      ${session.revealed ? `
        <div class="feedback ${session.selected === question.correctAnswer ? "feedback-correct" : "feedback-wrong"}">
          <strong>${session.selected === question.correctAnswer ? "Ответ верный" : "Ответ неверный"}</strong>
          <p>${question.explanation}</p>
          <a href="${question.theoryLink}">Открыть теорию по теме</a>
        </div>
      ` : ""}

      <div class="card-actions">
        <button class="button" data-test-action="${session.revealed ? "next" : "check"}" data-topic-id="${topic.id}" type="button" ${!session.revealed && !session.selected ? "disabled" : ""}>
          ${session.revealed ? (session.index === questions.length - 1 ? "Завершить тест" : "Следующий вопрос") : "Проверить"}
        </button>
        <button class="button secondary" data-test-action="restart" data-topic-id="${topic.id}" type="button">Начать заново</button>
        <a class="button secondary" href="${Core.sceneLink(topic.id)}">${Core.isStereo(topic) ? "К 3D-сцене" : "К сцене"}</a>
      </div>
    </article>
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

    const clearFilters = target.closest("[data-clear-test-filters]");
    if (clearFilters) {
      state.filters = Core.defaultFilters();
      saveFilters();
      renderList();
      return;
    }

    const sectionFilter = target.closest("[data-section-filter]");
    if (viewMode === "list" && sectionFilter) {
      state.filters.section = sectionFilter.dataset.sectionFilter || "all";
      saveFilters();
      scheduleRenderList();
      return;
    }

    const option = target.closest("[data-test-option]");
    if (viewMode === "topic" && option) {
      const topicId = Core.queryTopic();
      const session = getSession(topicId);
      if (!session.revealed) {
        session.selected = option.dataset.testOption || "";
        renderTopic(topicId);
      }
      return;
    }

    const action = target.closest("[data-test-action]");
    if (viewMode === "topic" && action) {
      const topicId = action.dataset.topicId || "";
      if (!topicId) return;

      const session = getSession(topicId);
      const type = action.dataset.testAction;

      if (type === "restart") {
        restartSession(topicId);
        renderTopic(topicId);
        return;
      }

      if (type === "check" && session.selected) {
        const question = session.questions[session.index];
        session.revealed = true;

        if (session.selected === question.correctAnswer) {
          session.correctCount += 1;
          session.earnedXp += question.xp;
        }

        renderTopic(topicId);
        return;
      }

      if (type === "next") {
        if (session.index === session.questions.length - 1) {
          session.finished = true;
          finalizeSession(session);
        } else {
          session.index += 1;
          session.selected = "";
          session.revealed = false;
        }

        renderTopic(topicId);
      }
    }
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
  QUESTION_BANK = buildQuestionBank();
  bindEvents();

  const topicId = Core.queryTopic();
  if (topicId) renderTopic(topicId);
  else renderList();
}

window.addEventListener("DOMContentLoaded", init);
