window.LearnMathApp = (() => {
  const COURSE_DATA = Array.isArray(window.COURSE_DATA) ? window.COURSE_DATA : [];
  const Renderers = window.SceneRenderers || {};
  const STORAGE_KEY = "learnmath-progress-v2";
  const STEREO_TOPIC_IDS = new Set(["cube", "rectangular-prism", "pyramid", "cylinder", "cone", "sphere"]);

  const defaultProgress = () => ({ totalXp: 0, completed: [], topicStats: {} });
  const defaultFilters = () => ({ section: "all", query: "" });
  const defaultSceneState = () => ({
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
  });

  const state = {
    filters: defaultFilters(),
    scene: defaultSceneState(),
  };
  const testSessions = {};
  let progress = loadProgress();
  let eventsBound = false;

  const refs = {
    viewRoot: document.getElementById("view-root"),
    viewTitle: document.getElementById("view-title"),
    routeBadge: document.getElementById("route-badge"),
    xpTotal: document.getElementById("xp-total"),
    topicCount: document.getElementById("topic-count"),
    topicShortcuts: document.getElementById("topic-shortcuts"),
  };

  function loadProgress() {
    try {
      return { ...defaultProgress(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
      return defaultProgress();
    }
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  function route() {
    const raw = location.hash.replace(/^#/, "") || "home";
    const [section = "home", topicId = ""] = raw.split("/");
    return { section, topicId };
  }

  function routeText(current) {
    return current.topicId ? `#${current.section}/${current.topicId}` : `#${current.section}`;
  }

  function getTopic(topicId) {
    return COURSE_DATA.find((topic) => topic.id === topicId) || null;
  }

  function isStereo(topic) {
    return topic && (topic.section === "Стереометрия" || STEREO_TOPIC_IDS.has(topic.id));
  }

  function preferredSceneMode(topic) {
    return isStereo(topic) ? state.scene.mode || "3d" : "2d";
  }

  function stat(topicId) {
    return progress.topicStats[topicId] || { xp: 0, bestScore: 0, completed: false };
  }

  function overallPercent() {
    const done = Object.values(progress.topicStats).filter((item) => item.completed).length;
    return Math.round((done / Math.max(COURSE_DATA.length, 1)) * 100) || 0;
  }

  function round(value, digits = 2) {
    return Number(value.toFixed(digits));
  }

  function excerpt(text, max = 150) {
    return text.length > max ? `${text.slice(0, max).trim()}...` : text;
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function emptyView(title, body, actions = "") {
    return `
      <section class="empty">
        <h3>${title}</h3>
        ${body.startsWith("<") ? body : `<p class="subtle">${body}</p>`}
        ${actions ? `<div class="empty-actions">${actions}</div>` : ""}
      </section>
    `;
  }

  function sourceNote() {
    return "";
  }

  function sectionCounts() {
    return COURSE_DATA.reduce((acc, topic) => {
      acc[topic.section] = (acc[topic.section] || 0) + 1;
      return acc;
    }, {});
  }

  function filteredTopics() {
    const query = state.filters.query.trim().toLowerCase();
    return COURSE_DATA.filter((topic) => {
      const matchesSection = state.filters.section === "all" || topic.section === state.filters.section;
      const haystack = `${topic.title} ${topic.section} ${topic.description}`.toLowerCase();
      return matchesSection && (!query || haystack.includes(query));
    });
  }

  function syncFrame() {
    refs.xpTotal.textContent = String(progress.totalXp || 0);
    refs.topicCount.textContent = String(COURSE_DATA.length);
    refs.topicShortcuts.innerHTML = COURSE_DATA.map((topic) => `
      <a class="shortcut" href="#theory/${topic.id}">
        <strong>${topic.title}</strong>
        <span>${topic.section}</span>
      </a>
    `).join("");

    const current = route();
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.toggle("active", (link.getAttribute("href") || "") === `#${current.section}`);
    });
    refs.routeBadge.textContent = routeText(current);
  }

  function setView(title, html) {
    refs.viewTitle.textContent = title;
    refs.viewRoot.innerHTML = html;
  }

  function formulaCard(formula) {
    return `
      <article class="formula-card">
        <span class="badge">Формула</span>
        <h3>${formula.title}</h3>
        <p class="formula-expression">${formula.expression}</p>
        <p class="formula-note">${formula.description}</p>
      </article>
    `;
  }

  function metricCard(item) {
    return `
      <article class="metric">
        <span class="badge">${item.label}</span>
        <h3>${item.value}</h3>
        <p>${item.note}</p>
      </article>
    `;
  }

  function filterBar() {
    const counts = sectionCounts();
    return `
      <section class="filter-bar">
        <div class="toggle-row">
          <button class="toggle ${state.filters.section === "all" ? "active" : ""}" data-section-filter="all" type="button">Все темы (${COURSE_DATA.length})</button>
          <button class="toggle ${state.filters.section === "Планиметрия" ? "active" : ""}" data-section-filter="Планиметрия" type="button">Планиметрия (${counts["Планиметрия"] || 0})</button>
          <button class="toggle ${state.filters.section === "Стереометрия" ? "active" : ""}" data-section-filter="Стереометрия" type="button">Стереометрия (${counts["Стереометрия"] || 0})</button>
        </div>
        <label class="search-field">
          <span>Фильтр тем</span>
          <input data-topic-query type="search" placeholder="Например: куб, площадь или цилиндр" value="${escapeAttribute(state.filters.query)}">
        </label>
      </section>
    `;
  }

  function rotateOptions(options, seed) {
    if (!options.length) return [];
    const shift = seed % options.length;
    return options.slice(shift).concat(options.slice(0, shift));
  }

  function stereoQuestions(topic) {
    const map = {
      cube: [
        ["Найди объём куба со стороной 3.", ["27", "9", "18", "81"], "27", "Для куба V = a³, значит 3³ = 27."],
        ["Чему равна площадь поверхности куба со стороной 2?", ["24", "8", "12", "16"], "24", "Для куба S = 6a², значит 6 · 2² = 24."],
        ["Что больше: объём куба со стороной 4 или со стороной 3?", ["Со стороной 4", "Со стороной 3", "Они равны", "Недостаточно данных"], "Со стороной 4", "Объём куба растёт как a³, поэтому 4³ больше, чем 3³."],
      ],
      "rectangular-prism": [
        ["Найди объём прямоугольного параллелепипеда со сторонами 4, 3 и 2.", ["24", "18", "12", "29"], "24", "Для прямоугольного параллелепипеда V = abc, значит 4 · 3 · 2 = 24."],
        ["Чему равна площадь поверхности параллелепипеда 4 × 3 × 2?", ["52", "24", "48", "29"], "52", "S = 2(ab + bc + ac) = 2(12 + 6 + 8) = 52."],
        ["Что больше: объём параллелепипеда 4 × 3 × 2 или куба 3 × 3 × 3?", ["Куб 3 × 3 × 3", "Параллелепипед 4 × 3 × 2", "Они равны", "Нельзя сравнить"], "Куб 3 × 3 × 3", "24 меньше 27, поэтому больше объём куба 3 × 3 × 3."],
      ],
      pyramid: [
        ["Найди объём пирамиды, если площадь основания 36, а высота 6.", ["72", "216", "108", "42"], "72", "Для пирамиды V = (1/3)Sh, значит (1/3) · 36 · 6 = 72."],
        ["Чему равен объём пирамиды, если площадь основания 27, а высота 3?", ["27", "81", "18", "9"], "27", "V = (1/3)Sh = (1/3) · 27 · 3 = 27."],
        ["Что больше при одинаковом основании: объём пирамиды высоты 9 или высоты 3?", ["Пирамиды высоты 9", "Пирамиды высоты 3", "Они равны", "Зависит от апофемы"], "Пирамиды высоты 9", "При одинаковом основании объём прямо пропорционален высоте."],
      ],
      cylinder: [
        ["Найди объём цилиндра при r = 2 и h = 5.", ["20π", "10π", "40π", "8π"], "20π", "Для цилиндра V = πr²h = π · 2² · 5 = 20π."],
        ["Чему равна площадь поверхности цилиндра при r = 2 и h = 3?", ["20π", "10π", "16π", "14π"], "20π", "S = 2πr(h + r) = 2π · 2 · (3 + 2) = 20π."],
        ["Что больше: объём цилиндра при r = 3, h = 4 или при r = 2, h = 4?", ["При r = 3", "При r = 2", "Они равны", "Зависит от площади поверхности"], "При r = 3", "Объём зависит от r², поэтому при большем радиусе объём больше."],
      ],
      cone: [
        ["Найди объём конуса при r = 3 и h = 4.", ["12π", "36π", "9π", "18π"], "12π", "Для конуса V = (1/3)πr²h = (1/3)π · 9 · 4 = 12π."],
        ["Чему равна образующая конуса при r = 3 и h = 4?", ["5", "7", "12", "4"], "5", "l = √(r² + h²) = √(9 + 16) = 5."],
        ["Что больше при одинаковых r и h: объём цилиндра или объём конуса?", ["Объём цилиндра", "Объём конуса", "Они равны", "Недостаточно данных"], "Объём цилиндра", "Объём конуса равен одной трети объёма цилиндра с теми же r и h."],
      ],
      sphere: [
        ["Чему равна площадь поверхности сферы радиуса 3?", ["36π", "12π", "27π", "18π"], "36π", "Для сферы S = 4πr² = 4π · 9 = 36π."],
        ["Чему равен объём сферы радиуса 3?", ["36π", "27π", "12π", "18π"], "36π", "V = (4/3)πr³ = (4/3)π · 27 = 36π."],
        ["Что больше: объём сферы радиуса 4 или радиуса 3?", ["Радиуса 4", "Радиуса 3", "Они равны", "Зависит от площади"], "Радиуса 4", "Объём сферы растёт как r³, поэтому радиус 4 даёт больший объём."],
      ],
    }[topic.id] || [];

    return map.map((item, index) => ({
      id: `${topic.id}-stereo-${index}`,
      topicId: topic.id,
      question: item[0],
      options: item[1],
      correctAnswer: item[2],
      explanation: item[3],
      theoryLink: `#theory/${topic.id}`,
      xp: 15,
    }));
  }

  function buildQuestionBank() {
    const allProperties = COURSE_DATA.flatMap((topic) => topic.properties.map((property) => ({ topicId: topic.id, value: property })));
    const allFormulas = COURSE_DATA.flatMap((topic) => topic.formulas.map((formula) => ({ topicId: topic.id, value: formula.expression })));

    return COURSE_DATA.reduce((acc, topic, index) => {
      const formula = topic.formulas[index % topic.formulas.length];
      const property = topic.properties[index % topic.properties.length];

      const formulaOptions = [
        formula.expression,
        ...topic.formulas.filter((item) => item.expression !== formula.expression).map((item) => item.expression),
        ...allFormulas.filter((item) => item.topicId !== topic.id).map((item) => item.value),
      ].filter((value, optionIndex, array) => array.indexOf(value) === optionIndex).slice(0, 4);

      const propertyOptions = [
        property,
        ...allProperties.filter((item) => item.topicId !== topic.id).map((item) => item.value),
      ].filter((value, optionIndex, array) => array.indexOf(value) === optionIndex).slice(0, 4);

      acc[topic.id] = [
        {
          id: `${topic.id}-formula`,
          topicId: topic.id,
          question: `Какая формула относится к блоку «${formula.title}» в теме «${topic.title}»?`,
          options: rotateOptions(formulaOptions, index),
          correctAnswer: formula.expression,
          explanation: formula.description,
          theoryLink: `#theory/${topic.id}`,
          xp: 10,
        },
        {
          id: `${topic.id}-property`,
          topicId: topic.id,
          question: `Какое утверждение относится к теме «${topic.title}»?`,
          options: rotateOptions(propertyOptions, index + 1),
          correctAnswer: property,
          explanation: `В теории темы указано: ${property}`,
          theoryLink: `#theory/${topic.id}`,
          xp: 10,
        },
        ...stereoQuestions(topic),
      ];
      return acc;
    }, {});
  }

  const QUESTION_BANK = buildQuestionBank();

  function getSession(topicId) {
    if (!testSessions[topicId]) {
      testSessions[topicId] = {
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
    return testSessions[topicId];
  }

  function restartSession(topicId) {
    delete testSessions[topicId];
    return getSession(topicId);
  }

  function finalizeSession(session) {
    if (session.saved) return;
    const current = stat(session.topicId);
    const percent = Math.round((session.correctCount / Math.max(session.questions.length, 1)) * 100);
    const bestXp = Math.max(current.xp || 0, session.earnedXp);
    const deltaXp = Math.max(0, session.earnedXp - (current.xp || 0));

    progress.totalXp += deltaXp;
    progress.topicStats[session.topicId] = {
      xp: bestXp,
      bestScore: Math.max(current.bestScore || 0, percent),
      completed: true,
    };
    if (!progress.completed.includes(session.topicId)) progress.completed.push(session.topicId);
    saveProgress();
    session.saved = true;
  }

  function sceneFieldDefs(topic) {
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
      pyramid: [["base", "Сторона основания", 1, 10], ["height", "Высота", 1, 12]],
      cylinder: [["base", "Радиус", 1, 8], ["height", "Высота", 1, 12]],
      cone: [["base", "Радиус", 1, 8], ["height", "Высота", 1, 12]],
      sphere: [["base", "Радиус", 1, 8]],
    }[topic.id] || [["base", "Размер", 1, 10]];

    return map.map(([key, label, min, max, suffix = ""]) => ({ key, label, min, max, suffix }));
  }

  function computeMetrics(topic) {
    const a = state.scene.base;
    const b = state.scene.depth;
    const h = state.scene.height;
    const angleRad = (state.scene.angle * Math.PI) / 180;

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
        { label: "Периметр", value: `${round(state.scene.sides * a)} см`, note: "P = na" },
        { label: "Сумма углов", value: `${round(180 * (state.scene.sides - 2))}°`, note: "180°(n - 2)" },
        { label: "Один угол", value: `${round((180 * (state.scene.sides - 2)) / state.scene.sides)}°`, note: "180°(n - 2) / n" },
      ],
      ellipse: [
        { label: "Площадь", value: `${round(Math.PI * Math.max(a, h) * Math.min(a, h))} см²`, note: "S = πab" },
        { label: "Фокус", value: `${round(Math.sqrt(Math.max(Math.max(a, h) ** 2 - Math.min(a, h) ** 2, 0)))} см`, note: "c² = a² - b²" },
        { label: "Полуоси", value: `${Math.max(a, h)} / ${Math.min(a, h)}`, note: "Большая и малая полуоси." },
      ],
      sector: [
        { label: "Площадь", value: `${round((state.scene.angle / 360) * Math.PI * a ** 2)} см²`, note: "S = (α / 360°)πr²" },
        { label: "Длина дуги", value: `${round((state.scene.angle / 360) * 2 * Math.PI * a)} см`, note: "l = (α / 360°) · 2πr" },
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

  function sceneValues(topic) {
    return computeMetrics(topic).map(metricCard).join("");
  }

  function homeView() {
    const counts = sectionCounts();
    return `
      ${sourceNote()}
      <div class="stats">
        <article class="stat-card">
          <span class="badge">Темы</span>
          <h3>${COURSE_DATA.length}</h3>
          <p>В курсе уже есть и планиметрия, и стереометрия.</p>
        </article>
        <article class="stat-card">
          <span class="badge">Планиметрия</span>
          <h3>${counts["Планиметрия"] || 0}</h3>
          <p>Плоские фигуры, формулы, графики и 2D-сцены.</p>
        </article>
        <article class="stat-card">
          <span class="badge">Стереометрия</span>
          <h3>${counts["Стереометрия"] || 0}</h3>
          <p>Куб, параллелепипед, пирамида, цилиндр, конус и сфера.</p>
        </article>
        <article class="stat-card">
          <span class="badge">Прогресс</span>
          <h3>${overallPercent()}%</h3>
          <div class="progress"><span style="width:${overallPercent()}%"></span></div>
        </article>
      </div>

      <div class="cards">
        <article class="card">
          <span class="badge">Теория</span>
          <h3>Связанные темы</h3>
          <p>Каждая тема ведёт к визуализации и к тесту, а формулы рендерятся из единой структуры данных.</p>
          <div class="card-actions">
            <a class="button" href="#theory">Открыть теорию</a>
          </div>
        </article>
        <article class="card">
          <span class="badge">Тесты с XP</span>
          <h3>Проверка знаний</h3>
          <p>Вопросы по формулам, свойствам, объёму, площади и сравнениям между фигурами.</p>
          <div class="card-actions">
            <a class="button" href="#tests">Открыть тесты</a>
          </div>
        </article>
        <article class="card">
          <span class="badge">3D-сцена</span>
          <h3>Настоящий Three.js</h3>
          <p>Для стереометрии используются реальные 3D-объекты с рёбрами, вершинами, гранями и управлением мышью.</p>
          <div class="card-actions">
            <a class="button" href="#scene/cube">Запустить 3D</a>
          </div>
        </article>
      </div>
    `;
  }

  function theoryList() {
    const topics = filteredTopics();
    return `
      ${sourceNote()}
      ${filterBar()}
      <div class="cards">
        ${topics.map((topic) => {
          const current = stat(topic.id);
          return `
            <article class="card content-card">
              <div class="title-row">
                <h3>${topic.title}</h3>
                <span class="badge">${topic.section}</span>
              </div>
              <p>${excerpt(topic.description)}</p>
              <div class="meta-line">
                <span>${topic.properties.length} свойств</span>
                <span>${topic.formulas.length} формул</span>
                <span>XP: ${current.xp}</span>
              </div>
              <div class="card-actions">
                <a class="button" href="#theory/${topic.id}">Теория</a>
                <a class="button secondary" href="#scene/${topic.id}">${isStereo(topic) ? "Посмотреть в 3D" : "Открыть сцену"}</a>
                <a class="button secondary" href="#tests/${topic.id}">Перейти к тесту</a>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function theoryTopic(topic) {
    return `
      ${sourceNote()}
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
        ${topic.formulas.map(formulaCard).join("")}
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
            <a class="button" href="#scene/${topic.id}">${isStereo(topic) ? "Посмотреть в 3D" : "Открыть сцену"}</a>
            <a class="button secondary" href="#tests/${topic.id}">Перейти к тесту</a>
          </div>
        </article>
      </div>
    `;
  }

  function testsList() {
    const topics = filteredTopics();
    const totalQuestions = topics.reduce((sum, topic) => sum + (QUESTION_BANK[topic.id] || []).length, 0);
    return `
      ${filterBar()}
      <div class="stats">
        <article class="stat-card">
          <span class="badge">Темы</span>
          <h3>${topics.length}</h3>
          <p>Доступны тесты по отфильтрованным темам.</p>
        </article>
        <article class="stat-card">
          <span class="badge">Вопросы</span>
          <h3>${totalQuestions}</h3>
          <p>Есть формулы, свойства, вычисления и логические сравнения.</p>
        </article>
        <article class="stat-card">
          <span class="badge">Завершено</span>
          <h3>${progress.completed.length}</h3>
          <p>Зачтённые темы сохраняются локально.</p>
        </article>
      </div>

      <div class="cards">
        ${topics.map((topic) => {
          const current = stat(topic.id);
          const questions = QUESTION_BANK[topic.id] || [];
          return `
            <article class="card content-card">
              <div class="title-row">
                <h3>${topic.title}</h3>
                <span class="badge">${current.bestScore || 0}%</span>
              </div>
              <p>${excerpt(topic.description)}</p>
              <div class="meta-line">
                <span>${questions.length} вопросов</span>
                <span>XP: ${current.xp}</span>
                <span>${topic.section}</span>
              </div>
              <div class="card-actions">
                <a class="button" href="#tests/${topic.id}">Начать тест</a>
                <a class="button secondary" href="#theory/${topic.id}">К теории</a>
                <a class="button secondary" href="#scene/${topic.id}">${isStereo(topic) ? "К 3D" : "К сцене"}</a>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function testsTopic(topic) {
    const session = getSession(topic.id);
    const questions = session.questions;

    if (!questions.length) {
      return emptyView("Для темы пока нет вопросов", "Добавь данные в банк вопросов и обнови страницу.");
    }

    if (session.finished) {
      finalizeSession(session);
      const percent = Math.round((session.correctCount / Math.max(questions.length, 1)) * 100);
      return `
        <div class="stats">
          <article class="stat-card"><span class="badge">Результат</span><h3>${percent}%</h3><p>${session.correctCount} из ${questions.length} верно.</p></article>
          <article class="stat-card"><span class="badge">XP</span><h3>${session.earnedXp}</h3><p>Лучший результат по теме сохранён локально.</p></article>
          <article class="stat-card"><span class="badge">Тема</span><h3>${topic.title}</h3><p>${topic.section}</p></article>
        </div>
        <section class="empty">
          <h3>Тест завершён</h3>
          <p class="subtle">Можно перепройти тему, вернуться к теории или открыть сцену, чтобы ещё раз посмотреть формулы и фигуру.</p>
          <div class="empty-actions">
            <button class="button" data-test-action="restart" data-topic-id="${topic.id}" type="button">Пройти заново</button>
            <a class="button secondary" href="#theory/${topic.id}">К теории</a>
            <a class="button secondary" href="#scene/${topic.id}">${isStereo(topic) ? "Посмотреть в 3D" : "Открыть сцену"}</a>
          </div>
        </section>
      `;
    }

    const question = questions[session.index];
    const currentStat = stat(topic.id);
    return `
      <div class="stats">
        <article class="stat-card"><span class="badge">Вопрос</span><h3>${session.index + 1}/${questions.length}</h3><p>${topic.title}</p></article>
        <article class="stat-card"><span class="badge">Верно</span><h3>${session.correctCount}</h3><p>Текущая серия ответов.</p></article>
        <article class="stat-card"><span class="badge">Лучший результат</span><h3>${currentStat.bestScore || 0}%</h3><p>Сохранённый результат по теме.</p></article>
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
            return `<button class="${classes.join(" ")}" data-test-option="${escapeAttribute(option)}" type="button">${option}</button>`;
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
          <a class="button secondary" href="#scene/${topic.id}">${isStereo(topic) ? "К 3D-сцене" : "К сцене"}</a>
        </div>
      </article>
    `;
  }

  function sceneControlsCard(topic) {
    return `
      <article class="control-card">
        <h3>Параметры фигуры</h3>
        <div class="controls">
          <div class="field">
            <label for="scene-topic">
              <span>Тема</span>
              <strong>${topic.title}</strong>
            </label>
            <select id="scene-topic">
              ${COURSE_DATA.map((item) => `<option value="${item.id}" ${item.id === topic.id ? "selected" : ""}>${item.section} — ${item.title}</option>`).join("")}
            </select>
          </div>
          ${sceneFieldDefs(topic).map((field) => `
            <div class="field">
              <label>
                <span>${field.label}</span>
                <strong>${state.scene[field.key]}${field.suffix}</strong>
              </label>
              <input data-scene-field="${field.key}" type="range" min="${field.min}" max="${field.max}" value="${state.scene[field.key]}">
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }

  function sceneFeatureCard(topic) {
    if (isStereo(topic)) {
      const modeControls = `
        <div class="toggle-row">
          <button class="toggle ${state.scene.mode === "2d" ? "active" : ""}" data-scene-mode="2d" type="button">2D</button>
          <button class="toggle ${state.scene.mode === "3d" ? "active" : ""}" data-scene-mode="3d" type="button">3D</button>
        </div>
      `;

      if (state.scene.mode === "2d") {
        return `
          <article class="control-card">
            <h3>Режим сцены</h3>
            ${modeControls}
            <div class="chip-row">
              ${[
                ["sides", "Стороны"],
                ["points", "Точки"],
                ["angles", "Углы"],
                ["area", "Площадь"],
                ["zones", "Зоны"],
              ].map(([key, label]) => `<button class="chip ${state.scene.highlight === key ? "active" : ""}" data-highlight="${key}" type="button">${label}</button>`).join("")}
            </div>
          </article>
        `;
      }

      return `
        <article class="control-card">
          <h3>Режим сцены</h3>
          ${modeControls}
          <div class="chip-row">
            <button class="chip ${state.scene.autoRotate ? "active" : ""}" data-three-toggle="autoRotate" type="button">Автовращение</button>
            <button class="chip ${state.scene.showEdges ? "active" : ""}" data-three-toggle="showEdges" type="button">Рёбра</button>
            <button class="chip ${state.scene.showVertices ? "active" : ""}" data-three-toggle="showVertices" type="button">Вершины</button>
            <button class="chip ${state.scene.showFaces ? "active" : ""}" data-three-toggle="showFaces" type="button">Грани</button>
          </div>
        </article>
      `;
    }

    return `
      <article class="control-card">
        <h3>Подсветка 2D</h3>
        <div class="chip-row">
          ${[
            ["sides", "Стороны"],
            ["points", "Точки"],
            ["angles", "Углы"],
            ["area", "Площадь"],
            ["zones", "Зоны"],
          ].map(([key, label]) => `<button class="chip ${state.scene.highlight === key ? "active" : ""}" data-highlight="${key}" type="button">${label}</button>`).join("")}
        </div>
      </article>
    `;
  }

  function sceneHubView() {
    const topics = filteredTopics();
    return `
      ${filterBar()}
      <div class="cards">
        ${topics.map((topic) => `
          <article class="card content-card">
            <div class="title-row">
              <h3>${topic.title}</h3>
              <span class="badge">${topic.section}</span>
            </div>
            <p>${excerpt(topic.description)}</p>
            <div class="meta-line">
              <span>${isStereo(topic) ? "Three.js 3D" : "SVG / график"}</span>
              <span>${topic.formulas.length} формул</span>
            </div>
            <div class="card-actions">
              <a class="button" href="#scene/${topic.id}">${isStereo(topic) ? "Открыть 3D" : "Открыть сцену"}</a>
              <a class="button secondary" href="#theory/${topic.id}">К теории</a>
              <a class="button secondary" href="#tests/${topic.id}">К тесту</a>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function sceneView(topicId) {
    const topic = getTopic(topicId) || COURSE_DATA[0];
    state.scene.topicId = topic.id;
    const stereo = isStereo(topic);
    const sceneMode = preferredSceneMode(topic);
    const showThree = stereo && sceneMode === "3d";
    const graphCard = !stereo && ["circle", "ellipse"].includes(topic.id) && Renderers.graphCard ? Renderers.graphCard(topic, state.scene) : "";
    const sceneBody = showThree
      ? (Renderers.THREE_READY
        ? `<div id="three-stage" class="three-stage"></div>`
        : `<div class="three-warning">Three.js не загрузился. Проверь подключение CDN и обнови страницу.</div>`)
      : (Renderers.svgScene ? Renderers.svgScene(topic.id, state.scene) : "<p>SVG renderer недоступен.</p>");

    return `
      <div class="scene-grid">
        <article class="scene-box">
          <div class="title-row">
            <div>
              <p class="eyebrow">${showThree ? "Three.js сцена" : "SVG сцена"}</p>
              <h3>${topic.title}</h3>
            </div>
            <span class="badge">${topic.section}</span>
          </div>
          <div class="scene-canvas">
            ${sceneBody}
          </div>
        </article>

        <div class="controls">
          ${sceneControlsCard(topic)}
          ${sceneFeatureCard(topic)}
          <article class="control-card">
            <h3>Переходы</h3>
            <div class="scene-links">
              <a class="button" href="#theory/${topic.id}">К теории</a>
              <a class="button secondary" href="#tests/${topic.id}">Перейти к тесту</a>
              <button class="button secondary" id="scene-fullscreen" type="button">Fullscreen</button>
              <button class="button secondary" id="scene-reset" type="button">Reset</button>
            </div>
          </article>
        </div>
      </div>

      <div class="metrics">
        ${sceneValues(topic)}
      </div>

      <div class="formula-grid">
        ${topic.formulas.map(formulaCard).join("")}
      </div>

      ${graphCard}
    `;
  }

  function render() {
    Renderers.cleanupThreeScene?.();
    syncFrame();

    if (!COURSE_DATA.length) {
      setView("Нет данных", emptyView("course-data.js не загружен", "Структура курса недоступна, поэтому рендер остановлен."));
      return;
    }

    const current = route();
    if (current.section === "home") {
      setView("Главная", homeView());
      return;
    }
    if (current.section === "theory" && !current.topicId) {
      setView("Теория", theoryList());
      return;
    }
    if (current.section === "tests" && !current.topicId) {
      setView("Тесты", testsList());
      return;
    }
    if (current.section === "scene" && !current.topicId) {
      setView("Сцена", sceneHubView());
      return;
    }

    const topic = getTopic(current.topicId);
    if (!topic) {
      setView("Не найдено", emptyView("Раздел не найден", "Проверь ссылку или вернись к списку тем."));
      return;
    }

    if (current.section === "theory") {
      setView(`Теория: ${topic.title}`, theoryTopic(topic));
      return;
    }
    if (current.section === "tests") {
      setView(`Тесты: ${topic.title}`, testsTopic(topic));
      return;
    }
    if (current.section === "scene") {
      setView(`Сцена: ${topic.title}`, sceneView(topic.id));
      if (isStereo(topic) && preferredSceneMode(topic) === "3d") Renderers.initThreeScene?.(topic, state.scene);
      return;
    }

    setView("Не найдено", emptyView("Маршрут не найден", "Этот локальный hash-маршрут пока не существует."));
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    document.addEventListener("click", (event) => {
      const sectionFilter = event.target.closest("[data-section-filter]");
      if (sectionFilter) {
        state.filters.section = sectionFilter.dataset.sectionFilter;
        render();
        return;
      }

      const highlight = event.target.closest("[data-highlight]");
      if (highlight) {
        state.scene.highlight = highlight.dataset.highlight;
        render();
        return;
      }

      const sceneMode = event.target.closest("[data-scene-mode]");
      if (sceneMode) {
        state.scene.mode = sceneMode.dataset.sceneMode;
        render();
        return;
      }

      const toggle3D = event.target.closest("[data-three-toggle]");
      if (toggle3D) {
        const key = toggle3D.dataset.threeToggle;
        state.scene[key] = !state.scene[key];
        render();
        return;
      }

      const testOption = event.target.closest("[data-test-option]");
      if (testOption) {
        const current = route();
        const session = getSession(current.topicId);
        if (!session.revealed) {
          session.selected = testOption.dataset.testOption;
          render();
        }
        return;
      }

      const testAction = event.target.closest("[data-test-action]");
      if (testAction) {
        const session = getSession(testAction.dataset.topicId);

        if (testAction.dataset.testAction === "restart") {
          restartSession(testAction.dataset.topicId);
          render();
          return;
        }

        if (testAction.dataset.testAction === "check" && session.selected) {
          const question = session.questions[session.index];
          session.revealed = true;
          if (session.selected === question.correctAnswer) {
            session.correctCount += 1;
            session.earnedXp += question.xp;
          }
          render();
          return;
        }

        if (testAction.dataset.testAction === "next") {
          if (session.index === session.questions.length - 1) {
            session.finished = true;
            finalizeSession(session);
          } else {
            session.index += 1;
            session.selected = "";
            session.revealed = false;
          }
          render();
        }
        return;
      }

      if (event.target.id === "reset-progress") {
        progress = defaultProgress();
        Object.keys(testSessions).forEach((key) => delete testSessions[key]);
        saveProgress();
        render();
        return;
      }

      if (event.target.id === "scene-reset") {
        state.scene = { ...defaultSceneState(), topicId: state.scene.topicId, mode: state.scene.mode };
        render();
        return;
      }

      if (event.target.id === "scene-fullscreen") {
        const host = document.querySelector(".scene-canvas");
        if (!host) return;
        if (document.fullscreenElement) document.exitFullscreen?.();
        else host.requestFullscreen?.();
      }
    });

    document.addEventListener("input", (event) => {
      const sceneField = event.target.closest("[data-scene-field]");
      if (sceneField) {
        state.scene[sceneField.dataset.sceneField] = Number(sceneField.value);
        render();
        return;
      }

      if (event.target.matches("[data-topic-query]")) {
        state.filters.query = event.target.value;
        render();
      }
    });

    document.addEventListener("change", (event) => {
      if (event.target.id === "scene-topic") {
        const nextTopic = getTopic(event.target.value);
        state.scene.mode = isStereo(nextTopic) ? "3d" : "2d";
        location.hash = `#scene/${event.target.value}`;
      }
    });

    window.addEventListener("hashchange", render);
  }

  function init() {
    bindEvents();
    if (!location.hash) location.hash = "#home";
    else render();
  }

  return { init };
})();
