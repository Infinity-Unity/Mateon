import * as Core from "./core.js";

const state = {
  scene: { ...Core.defaultSceneState(), ...Core.loadSceneState() },
};

let currentTopic = null;
let eventsBound = false;

const refs = {
  root: () => document.getElementById("view-root"),
};

const selectorPanels = {
  planimetry: false,
  stereometry: true,
};

const threeState = {
  loadPromise: null,
  runtime: null,
};

const debouncedVisualUpdate = Core.debounce(() => {
  if (!currentTopic) return;

  updateMetrics(currentTopic);
  updateGraph(currentTopic);
  renderSceneCanvas(currentTopic, false);
  persistScene();
}, 90);

function persistScene() {
  Core.saveSceneState(state.scene);
}

function topicByUrlOrState() {
  const topicFromUrl = Core.getTopic(Core.queryTopic());
  if (topicFromUrl) return topicFromUrl;

  const topicFromState = Core.getTopic(state.scene.topicId);
  if (topicFromState) return topicFromState;

  return Core.getCourseData()[0] || null;
}

function px(value) {
  return value * 16;
}

function polygonPoints(count, radius, cx = 210, cy = 150, rotation = -Math.PI / 2) {
  return Array.from({ length: count }, (_, index) => {
    const angle = rotation + (index * Math.PI * 2) / count;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  });
}

function boundsFromPoints(points) {
  if (!points.length) return { width: 1, height: 1 };

  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);

  return {
    width: Math.max(width, 1),
    height: Math.max(height, 1),
  };
}

function scaleForBounds(bounds) {
  const width = Math.max(bounds.width || 0, 1);
  const height = Math.max(bounds.height || 0, 1);

  const preferred = Math.min((420 * 0.64) / width, (300 * 0.64) / height);
  const fit = Math.min((420 * 0.9) / width, (300 * 0.9) / height);
  const scale = Math.max(0.72, Math.min(1.65, Math.min(preferred, fit)));

  return Number.isFinite(scale) ? Number(scale.toFixed(3)) : 1;
}

function poly(points) {
  return points.map((point) => point.join(",")).join(" ");
}

function pointMarks(points) {
  if (!["points", "angles"].includes(state.scene.highlight)) return "";

  return points
    .map((point, index) => `
      <circle class="shape-point" cx="${point[0]}" cy="${point[1]}" r="5"></circle>
      <text class="shape-text" x="${point[0] + 8}" y="${point[1] - 8}">${String.fromCharCode(65 + index)}</text>
    `)
    .join("");
}

function polygonShape(points) {
  const fillClass = ["area", "zones"].includes(state.scene.highlight) ? "shape-fill area" : "shape-fill";
  const lineClass = state.scene.highlight === "sides" ? "shape-line focus" : "shape-line";

  return `
    <g class="shape">
      <polygon class="${fillClass}" points="${poly(points)}"></polygon>
      <polygon class="${lineClass}" points="${poly(points)}"></polygon>
      ${pointMarks(points)}
      ${state.scene.highlight === "area" ? `<text class="shape-value" x="202" y="154">S</text>` : ""}
    </g>
  `;
}

function ellipseShape(rx, ry) {
  const fillClass = ["area", "zones"].includes(state.scene.highlight) ? "shape-fill area" : "shape-fill";
  const lineClass = state.scene.highlight === "sides" ? "shape-line focus" : "shape-line";

  const guide = ["points", "angles"].includes(state.scene.highlight)
    ? `
      <line class="shape-guide" x1="210" y1="150" x2="${210 + rx}" y2="150"></line>
      <circle class="shape-point" cx="210" cy="150" r="5"></circle>
      <text class="shape-text" x="${210 + rx / 2}" y="142">r</text>
    `
    : "";

  return `
    <g class="shape">
      <ellipse class="${fillClass}" cx="210" cy="150" rx="${rx}" ry="${ry}"></ellipse>
      <ellipse class="${lineClass}" cx="210" cy="150" rx="${rx}" ry="${ry}"></ellipse>
      ${guide}
      ${state.scene.highlight === "area" ? `<text class="shape-value" x="202" y="154">S</text>` : ""}
    </g>
  `;
}

function sectorShape(radius, degrees) {
  const radians = (degrees * Math.PI) / 180;
  const x = 210 + Math.cos(radians) * radius;
  const y = 150 - Math.sin(radians) * radius;
  const largeArc = degrees > 180 ? 1 : 0;
  const fillClass = ["area", "zones"].includes(state.scene.highlight) ? "shape-fill area" : "shape-fill";
  const lineClass = state.scene.highlight === "sides" ? "shape-line focus" : "shape-line";

  return `
    <g class="shape">
      <path class="${fillClass}" d="M210 150 L ${210 + radius} 150 A ${radius} ${radius} 0 ${largeArc} 0 ${x} ${y} Z"></path>
      <path class="${lineClass}" d="M210 150 L ${210 + radius} 150 A ${radius} ${radius} 0 ${largeArc} 0 ${x} ${y} Z"></path>
      <circle class="shape-point" cx="210" cy="150" r="5"></circle>
      ${state.scene.highlight === "angles" ? `<text class="shape-text" x="220" y="140">α</text>` : ""}
    </g>
  `;
}

function svgScene(topicId) {
  const a = px(state.scene.base);
  const h = px(state.scene.height);
  const b = px(state.scene.depth);
  const angleOffset = state.scene.angle * 0.5;

  let body = "";
  let bounds = { width: 200, height: 150 };

  if (topicId === "triangle") {
    const points = [
      [210, 150 - h],
      [210 - a / 2, 210],
      [210 + a / 2, 210],
    ];
    body = polygonShape(points);
    bounds = boundsFromPoints(points);
  } else if (topicId === "square") {
    const points = [
      [210 - a / 2, 150 - a / 2],
      [210 + a / 2, 150 - a / 2],
      [210 + a / 2, 150 + a / 2],
      [210 - a / 2, 150 + a / 2],
    ];
    body = polygonShape(points);
    bounds = boundsFromPoints(points);
  } else if (topicId === "rectangle") {
    const points = [
      [210 - a / 2, 150 - h / 2],
      [210 + a / 2, 150 - h / 2],
      [210 + a / 2, 150 + h / 2],
      [210 - a / 2, 150 + h / 2],
    ];
    body = polygonShape(points);
    bounds = boundsFromPoints(points);
  } else if (topicId === "circle") {
    const rx = Math.min(a, 96);
    const ry = Math.min(a, 96);
    body = ellipseShape(rx, ry);
    bounds = { width: rx * 2, height: ry * 2 };
  } else if (topicId === "ellipse") {
    const rx = Math.min(a, 112);
    const ry = Math.min(h, 86);
    body = ellipseShape(rx, ry);
    bounds = { width: rx * 2, height: ry * 2 };
  } else if (topicId === "sector") {
    const radius = Math.min(a, 100);
    body = sectorShape(radius, state.scene.angle);
    bounds = { width: radius * 2, height: radius * 2 };
  } else if (topicId === "polygon") {
    const points = polygonPoints(state.scene.sides, Math.min(a, 92));
    body = polygonShape(points);
    bounds = boundsFromPoints(points);
  } else if (topicId === "parallelogram") {
    const points = [
      [140 + angleOffset, 100],
      [280 + angleOffset, 100],
      [280 - angleOffset, 200],
      [140 - angleOffset, 200],
    ];
    body = polygonShape(points);
    bounds = boundsFromPoints(points);
  } else if (topicId === "rhombus") {
    const points = [
      [210, 150 - h],
      [210 + a / 2, 150],
      [210, 150 + h],
      [210 - a / 2, 150],
    ];
    body = polygonShape(points);
    bounds = boundsFromPoints(points);
  } else if (topicId === "trapezoid") {
    const points = [
      [210 - a / 2, 110],
      [210 + a / 2, 110],
      [210 + (a + b) / 2, 210],
      [210 - (a + b) / 2, 210],
    ];
    body = polygonShape(points);
    bounds = boundsFromPoints(points);
  } else if (topicId === "cube") {
    const points = [
      [150, 90],
      [270, 90],
      [270, 210],
      [150, 210],
    ];
    body = polygonShape(points);
    bounds = boundsFromPoints(points);
  } else if (topicId === "rectangular-prism") {
    const points = [
      [130, 104],
      [290, 104],
      [290, 196],
      [130, 196],
    ];
    body = polygonShape(points);
    bounds = boundsFromPoints(points);
  } else if (topicId === "pyramid") {
    const points = [
      [210, 86],
      [135, 214],
      [285, 214],
    ];
    body = polygonShape(points);
    bounds = boundsFromPoints(points);
  } else if (topicId === "cylinder") {
    const rx = Math.min(a, 78);
    const ry = Math.min(a * 0.55, 54);
    body = ellipseShape(rx, ry);
    bounds = { width: rx * 2, height: ry * 2 };
  } else if (topicId === "cone") {
    const points = [
      [210, 80],
      [134, 216],
      [286, 216],
    ];
    body = polygonShape(points);
    bounds = boundsFromPoints(points);
  } else if (topicId === "sphere") {
    const rx = Math.min(a, 92);
    const ry = Math.min(a, 92);
    body = ellipseShape(rx, ry);
    bounds = { width: rx * 2, height: ry * 2 };
  }

  const scale = scaleForBounds(bounds);
  const scaledBody = `<g transform="translate(210 150) scale(${scale}) translate(-210 -150)">${body}</g>`;

  return `<svg viewBox="0 0 420 300" role="img" aria-label="Интерактивная 2D-фигура">${scaledBody}</svg>`;
}

function graphGrid() {
  const lines = [];
  for (let x = 30; x <= 330; x += 30) {
    lines.push(`<line class="graph-grid" x1="${x}" y1="20" x2="${x}" y2="320"></line>`);
  }
  for (let y = 20; y <= 320; y += 30) {
    lines.push(`<line class="graph-grid" x1="30" y1="${y}" x2="330" y2="${y}"></line>`);
  }
  return lines.join("");
}

function graphCard(topic) {
  const circleGraph = `
    <svg class="graph-svg" viewBox="0 0 360 340" role="img" aria-label="График круга">
      ${graphGrid()}
      <line class="graph-axis" x1="180" y1="20" x2="180" y2="320"></line>
      <line class="graph-axis" x1="30" y1="170" x2="330" y2="170"></line>
      <circle class="graph-shape" cx="180" cy="170" r="${Math.min(110, state.scene.base * 12)}"></circle>
      <text class="graph-label" x="188" y="38">y</text>
      <text class="graph-label" x="312" y="162">x</text>
      <text class="graph-formula" x="44" y="34">x² + y² = r²</text>
    </svg>
  `;

  const ellipseGraph = `
    <svg class="graph-svg" viewBox="0 0 360 340" role="img" aria-label="График эллипса">
      ${graphGrid()}
      <line class="graph-axis" x1="180" y1="20" x2="180" y2="320"></line>
      <line class="graph-axis" x1="30" y1="170" x2="330" y2="170"></line>
      <ellipse class="graph-shape" cx="180" cy="170" rx="${Math.min(122, Math.max(state.scene.base, state.scene.height) * 12)}" ry="${Math.min(92, Math.min(state.scene.base, state.scene.height) * 12)}"></ellipse>
      <text class="graph-label" x="188" y="38">y</text>
      <text class="graph-label" x="312" y="162">x</text>
      <text class="graph-formula" x="36" y="34">x²/a² + y²/b² = 1</text>
    </svg>
  `;

  return `
    <section class="graph-card">
      <div class="title-row">
        <div>
          <p class="eyebrow">Координатный график</p>
          <h3>${topic.title}</h3>
        </div>
        <span class="badge">2D-модель</span>
      </div>

      <div class="graph-frame">
        ${topic.id === "circle" ? circleGraph : ellipseGraph}
      </div>
    </section>
  `;
}

function selectorPanel(section, activeTopicId) {
  const meta = Core.sectionMeta(section);
  const grouped = Core.groupTopicsBySection();
  const topics = grouped[section] || [];
  const isOpen = selectorPanels[meta.key];

  return `
    <section class="selector-panel ${meta.accentClass} ${isOpen ? "open" : ""}" data-selector-panel="${meta.key}">
      <button class="selector-toggle" data-selector-toggle="${meta.key}" type="button" aria-expanded="${isOpen ? "true" : "false"}">
        <div class="selector-toggle-copy">
          <p class="eyebrow">${meta.shortLabel}</p>
          <h3>${meta.title}</h3>
          <p class="subtle">${meta.description}</p>
        </div>
        <div class="selector-toggle-meta">
          <span class="badge">${topics.length}</span>
          <span class="selector-chevron" aria-hidden="true">${isOpen ? "−" : "+"}</span>
        </div>
      </button>
      <div class="selector-body" ${isOpen ? "" : "hidden"}>
        <div class="topic-choice-list">
        ${topics.map((item) => `
          <a class="topic-choice ${item.id === activeTopicId ? "active" : ""}" href="${Core.sceneLink(item.id)}">
            <strong>${item.title}</strong>
            <span>${item.section}</span>
          </a>
        `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderControlsCard(topic) {
  const fields = Core.sceneFieldDefs(topic);
  const meta = Core.sectionMeta(topic.section);

  return `
    <div class="title-row">
      <div>
        <h3>Параметры фигуры</h3>
        <p class="subtle">Сейчас выбрана тема «${topic.title}».</p>
      </div>
      <span class="badge">${meta.shortLabel}</span>
    </div>
    <div class="controls">
      ${fields.map((field) => `
        <div class="field">
          <label>
            <span>${field.label}</span>
            <strong data-field-value="${field.key}">${state.scene[field.key]}${field.suffix}</strong>
          </label>
          <input data-scene-field="${field.key}" type="range" min="${field.min}" max="${field.max}" value="${state.scene[field.key]}">
        </div>
      `).join("")}
    </div>
  `;
}

function renderFeatureCard(topic) {
  const stereo = Core.isStereo(topic);

  const modeControls = stereo
    ? `
      <div class="toggle-row">
        <button class="toggle ${state.scene.mode === "2d" ? "active" : ""}" data-scene-mode="2d" type="button">2D</button>
        <button class="toggle ${state.scene.mode === "3d" ? "active" : ""}" data-scene-mode="3d" type="button">3D</button>
      </div>
    `
    : "";

  const twoDHighlights = `
    <div class="chip-row">
      ${[
        ["sides", "Стороны"],
        ["points", "Точки"],
        ["angles", "Углы"],
        ["area", "Площадь"],
        ["zones", "Зоны"],
      ].map(([key, label]) => `<button class="chip ${state.scene.highlight === key ? "active" : ""}" data-highlight="${key}" type="button">${label}</button>`).join("")}
    </div>
  `;

  if (!stereo || state.scene.mode === "2d") {
    return `
      <h3>${stereo ? "Режим сцены" : "Подсветка 2D"}</h3>
      ${modeControls}
      ${twoDHighlights}
      ${!stereo ? `<p class="subtle">Для круга и эллипса дополнительно строится координатный график.</p>` : ""}
    `;
  }

  return `
    <h3>Режим сцены</h3>
    ${modeControls}
    <div class="chip-row">
      <button class="chip ${state.scene.autoRotate ? "active" : ""}" data-three-toggle="autoRotate" type="button">Автовращение</button>
      <button class="chip ${state.scene.showEdges ? "active" : ""}" data-three-toggle="showEdges" type="button">Рёбра</button>
      <button class="chip ${state.scene.showVertices ? "active" : ""}" data-three-toggle="showVertices" type="button">Вершины</button>
      <button class="chip ${state.scene.showFaces ? "active" : ""}" data-three-toggle="showFaces" type="button">Грани</button>
    </div>
    <p class="subtle">Перетаскивай сцену для вращения и используй колесо мыши для приближения.</p>
  `;
}

function ensureTopicMode(topic) {
  if (!Core.isStereo(topic)) {
    state.scene.mode = "2d";
    return;
  }

  if (!["2d", "3d"].includes(state.scene.mode)) {
    state.scene.mode = "3d";
  }
}

function syncSelectorDefaults(topic) {
  const activeKey = Core.sectionKey(topic.section);
  selectorPanels.planimetry = activeKey === "planimetry";
  selectorPanels.stereometry = activeKey === "stereometry";
}

function syncSelectorPanelsUi() {
  document.querySelectorAll("[data-selector-panel]").forEach((panelNode) => {
    if (!(panelNode instanceof HTMLElement)) return;

    const panelKey = panelNode.dataset.selectorPanel || "";
    const isOpen = Boolean(selectorPanels[panelKey]);
    const body = panelNode.querySelector(".selector-body");
    const toggle = panelNode.querySelector("[data-selector-toggle]");
    const chevron = panelNode.querySelector(".selector-chevron");

    panelNode.classList.toggle("open", isOpen);
    if (body instanceof HTMLElement) body.hidden = !isOpen;
    if (toggle instanceof HTMLElement) toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (chevron instanceof HTMLElement) chevron.textContent = isOpen ? "−" : "+";
  });
}

function renderLayout(topic) {
  Core.initShell({
    page: "scene",
    title: `Сцена: ${topic.title}`,
    badge: Core.routeLabel("scene", topic.id),
    currentTopicId: topic.id,
    shortcutPage: "scene",
  });

  const root = refs.root();
  if (!root) return;

  root.innerHTML = `
    <div class="scene-selector-grid">
      ${Core.orderedSections().map((section) => selectorPanel(section, topic.id)).join("")}
    </div>

    <div class="scene-grid">
      <article class="scene-box">
        <div class="title-row">
          <div>
            <p class="eyebrow" id="scene-mode-caption">${Core.isStereo(topic) && state.scene.mode === "3d" ? "Three.js сцена" : "SVG сцена"}</p>
            <h3>${topic.title}</h3>
          </div>
          <span class="badge">${topic.section}</span>
        </div>
        <div class="scene-canvas" id="scene-canvas"></div>
      </article>

      <div class="controls scene-controls">
        <article class="control-card" id="scene-controls-card"></article>
        <article class="control-card" id="scene-feature-card"></article>
        <article class="control-card">
          <h3>Переходы</h3>
          <div class="scene-links">
            <a class="button" href="${Core.theoryLink(topic.id)}">К теории</a>
            <a class="button secondary" href="${Core.testsLink(topic.id)}">К тесту</a>
            <button class="button secondary" id="scene-fullscreen" type="button">Во весь экран</button>
            <button class="button secondary" id="scene-reset" type="button">Сбросить вид</button>
          </div>
        </article>
      </div>
    </div>

    <div class="metrics" id="scene-metrics"></div>
    <div class="formula-grid">${topic.formulas.map(Core.formulaCard).join("")}</div>
    <div id="scene-graph-host"></div>
  `;

  updateControls(topic);
  updateMetrics(topic);
  updateGraph(topic);
  syncSelectorPanelsUi();
  renderSceneCanvas(topic, true);
}

function updateControls(topic) {
  const controlCard = document.getElementById("scene-controls-card");
  const featureCard = document.getElementById("scene-feature-card");
  const modeCaption = document.getElementById("scene-mode-caption");

  if (controlCard) controlCard.innerHTML = renderControlsCard(topic);
  if (featureCard) featureCard.innerHTML = renderFeatureCard(topic);
  if (modeCaption) {
    modeCaption.textContent = Core.isStereo(topic) && state.scene.mode === "3d" ? "Three.js сцена" : "SVG сцена";
  }
}

function updateMetrics(topic) {
  const host = document.getElementById("scene-metrics");
  if (!host) return;

  host.innerHTML = Core.computeMetrics(topic, state.scene).map(Core.metricCard).join("");
}

function updateGraph(topic) {
  const host = document.getElementById("scene-graph-host");
  if (!host) return;

  if (!Core.isStereo(topic) && ["circle", "ellipse"].includes(topic.id)) {
    host.innerHTML = graphCard(topic);
  } else {
    host.innerHTML = "";
  }
}

function ensureThreeLoaded() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (threeState.loadPromise) return threeState.loadPromise;

  threeState.loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/three@0.158/build/three.min.js";
    script.async = true;
    script.onload = () => resolve(window.THREE);
    script.onerror = () => reject(new Error("Three.js failed to load"));
    document.head.appendChild(script);
  });

  return threeState.loadPromise;
}

function disposeGroup(group) {
  if (!group) return;

  group.traverse((item) => {
    if (item.geometry) item.geometry.dispose();
    if (item.material) {
      if (Array.isArray(item.material)) {
        item.material.forEach((material) => material.dispose());
      } else {
        item.material.dispose();
      }
    }
  });
}

function makeVertexPoints(geometry) {
  const THREE = window.THREE;
  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute("position", geometry.getAttribute("position").clone());

  return new THREE.Points(
    pointsGeometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.11,
      sizeAttenuation: true,
    }),
  );
}

function createStereoObject(topic) {
  const THREE = window.THREE;
  const a = state.scene.base;
  const b = state.scene.depth;
  const h = state.scene.height;

  let geometry;

  if (topic.id === "cube") {
    geometry = new THREE.BoxGeometry(a, a, a);
  } else if (topic.id === "rectangular-prism") {
    geometry = new THREE.BoxGeometry(a, h, b);
  } else if (topic.id === "cylinder") {
    geometry = new THREE.CylinderGeometry(a, a, h, 24, 1);
  } else if (topic.id === "cone") {
    geometry = new THREE.ConeGeometry(a, h, 24, 1);
  } else if (topic.id === "sphere") {
    geometry = new THREE.SphereGeometry(a, 20, 14);
  } else if (topic.id === "pyramid") {
    geometry = new THREE.ConeGeometry(a * 0.88, h, 4, 1);
    geometry.rotateY(Math.PI / 4);
  } else {
    geometry = new THREE.BoxGeometry(a, a, a);
  }

  const group = new THREE.Group();

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0x78b7ff,
      transparent: true,
      opacity: state.scene.showFaces ? 0.78 : 0.06,
      roughness: 0.38,
      metalness: 0.06,
    }),
  );

  group.add(mesh);

  if (state.scene.showEdges) {
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: 0xe8f4ff })));
  }

  if (state.scene.showVertices) {
    group.add(makeVertexPoints(geometry));
  }

  const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z, 1);

  return { group, maxDimension };
}

function createThreeRuntime() {
  const THREE = window.THREE;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1120);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  scene.add(new THREE.AmbientLight(0xffffff, 1.08));

  const key = new THREE.DirectionalLight(0xffffff, 1.18);
  key.position.set(8, 12, 8);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x99b1ff, 0.42);
  fill.position.set(-6, 4, -8);
  scene.add(fill);

  scene.add(new THREE.GridHelper(22, 20, 0x5f78bd, 0x243553));
  scene.add(new THREE.AxesHelper(6));

  const orbit = {
    radius: 12,
    theta: 0.82,
    phi: 1.04,
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
  };

  const runtime = {
    container: null,
    scene,
    camera,
    renderer,
    orbit,
    objectGroup: null,
    signature: "",
    frameId: 0,
    continuous: false,
    needsRender: true,
    resizeObserver: null,
    onPointerDown: null,
    onPointerMove: null,
    onPointerUp: null,
    onWheel: null,
  };

  function updateCamera() {
    const x = orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
    const y = orbit.radius * Math.cos(orbit.phi);
    const z = orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);

    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  }

  function resize() {
    if (!runtime.container) return;

    const width = runtime.container.clientWidth || 620;
    const height = runtime.container.clientHeight || 340;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    runtime.requestRender();
  }

  function scheduleFrame() {
    if (runtime.frameId) return;

    runtime.frameId = window.requestAnimationFrame(() => {
      runtime.frameId = 0;

      if (runtime.continuous && state.scene.autoRotate && !orbit.dragging && runtime.objectGroup) {
        runtime.objectGroup.rotation.y += 0.01;
        runtime.needsRender = true;
      }

      if (!runtime.needsRender && !runtime.continuous) {
        return;
      }

      updateCamera();
      renderer.render(scene, camera);
      runtime.needsRender = false;

      if (runtime.continuous) {
        scheduleFrame();
      }
    });
  }

  runtime.requestRender = () => {
    runtime.needsRender = true;
    scheduleFrame();
  };

  runtime.setContinuous = (value) => {
    runtime.continuous = Boolean(value);

    if (runtime.continuous) {
      runtime.requestRender();
    }
  };

  runtime.onPointerDown = (event) => {
    if (!runtime.container) return;

    orbit.dragging = true;
    orbit.pointerId = event.pointerId;
    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;

    runtime.container.setPointerCapture?.(event.pointerId);
    runtime.setContinuous(true);
  };

  runtime.onPointerMove = (event) => {
    if (!orbit.dragging) return;
    if (orbit.pointerId !== null && event.pointerId !== orbit.pointerId) return;

    const dx = event.clientX - orbit.lastX;
    const dy = event.clientY - orbit.lastY;

    orbit.lastX = event.clientX;
    orbit.lastY = event.clientY;

    orbit.theta -= dx * 0.01;
    orbit.phi = Math.max(0.25, Math.min(Math.PI - 0.25, orbit.phi + dy * 0.01));

    runtime.requestRender();
  };

  runtime.onPointerUp = (event) => {
    if (orbit.pointerId !== null && event.pointerId !== orbit.pointerId) return;

    orbit.dragging = false;
    orbit.pointerId = null;
    runtime.setContinuous(state.scene.autoRotate);
    runtime.requestRender();
  };

  runtime.onWheel = (event) => {
    event.preventDefault();
    orbit.radius = Math.max(4, Math.min(60, orbit.radius + event.deltaY * 0.01));
    runtime.requestRender();
  };

  runtime.attach = (container) => {
    if (runtime.container === container) return;

    runtime.detach();

    runtime.container = container;
    runtime.container.innerHTML = "";
    runtime.container.classList.add("three-stage");
    runtime.container.appendChild(renderer.domElement);

    runtime.container.addEventListener("pointerdown", runtime.onPointerDown);
    runtime.container.addEventListener("pointermove", runtime.onPointerMove);
    runtime.container.addEventListener("pointerup", runtime.onPointerUp);
    runtime.container.addEventListener("pointercancel", runtime.onPointerUp);
    runtime.container.addEventListener("wheel", runtime.onWheel, { passive: false });

    if (typeof ResizeObserver !== "undefined") {
      runtime.resizeObserver = new ResizeObserver(resize);
      runtime.resizeObserver.observe(runtime.container);
    } else {
      window.addEventListener("resize", resize);
    }

    resize();
  };

  runtime.detach = () => {
    if (!runtime.container) return;

    runtime.container.removeEventListener("pointerdown", runtime.onPointerDown);
    runtime.container.removeEventListener("pointermove", runtime.onPointerMove);
    runtime.container.removeEventListener("pointerup", runtime.onPointerUp);
    runtime.container.removeEventListener("pointercancel", runtime.onPointerUp);
    runtime.container.removeEventListener("wheel", runtime.onWheel);

    runtime.resizeObserver?.disconnect();
    runtime.resizeObserver = null;

    runtime.container.classList.remove("three-stage");
    runtime.container = null;
  };

  runtime.updateObject = (topic, forceCameraReset = false) => {
    if (runtime.objectGroup) {
      scene.remove(runtime.objectGroup);
      disposeGroup(runtime.objectGroup);
      runtime.objectGroup = null;
    }

    const { group, maxDimension } = createStereoObject(topic);
    runtime.objectGroup = group;
    scene.add(group);

    if (forceCameraReset) {
      orbit.radius = Math.max(10, maxDimension * 3.6);
      orbit.theta = 0.82;
      orbit.phi = 1.04;
    } else {
      orbit.radius = Math.max(orbit.radius, maxDimension * 2.2);
    }

    runtime.requestRender();
  };

  runtime.dispose = () => {
    runtime.setContinuous(false);

    if (runtime.frameId) {
      window.cancelAnimationFrame(runtime.frameId);
      runtime.frameId = 0;
    }

    runtime.detach();
    window.removeEventListener("resize", resize);

    if (runtime.objectGroup) {
      disposeGroup(runtime.objectGroup);
      runtime.objectGroup = null;
    }

    renderer.dispose();
  };

  return runtime;
}

function getThreeSignature(topic) {
  return [
    topic.id,
    state.scene.base,
    state.scene.height,
    state.scene.depth,
    state.scene.showEdges ? "1" : "0",
    state.scene.showVertices ? "1" : "0",
    state.scene.showFaces ? "1" : "0",
  ].join("|");
}

async function renderThreeCanvas(container, topic, forceCameraReset = false) {
  try {
    await ensureThreeLoaded();

    if (!window.THREE) throw new Error("Three.js unavailable");

    if (!threeState.runtime) {
      threeState.runtime = createThreeRuntime();
    }

    threeState.runtime.attach(container);

    const signature = getThreeSignature(topic);
    if (threeState.runtime.signature !== signature || forceCameraReset) {
      threeState.runtime.updateObject(topic, forceCameraReset);
      threeState.runtime.signature = signature;
    } else {
      threeState.runtime.requestRender();
    }

    threeState.runtime.setContinuous(Boolean(state.scene.autoRotate));
  } catch (error) {
    container.innerHTML = `<div class="three-warning">3D-сцена не запустилась. Проверь подключение к CDN и обнови страницу.</div>`;
    console.error("Three.js scene init failed", error);
  }
}

function stopThreeCanvas(host = null) {
  if (!threeState.runtime) return;

  threeState.runtime.setContinuous(false);
  threeState.runtime.detach();

  if (host) {
    host.innerHTML = "";
  }
}

function renderSceneCanvas(topic, force = false) {
  const host = document.getElementById("scene-canvas");
  if (!host) return;

  if (Core.isStereo(topic) && state.scene.mode === "3d") {
    renderThreeCanvas(host, topic, force);
    return;
  }

  stopThreeCanvas(host);
  host.innerHTML = svgScene(topic.id);
}

function applySceneReset() {
  const keepTopic = state.scene.topicId;
  const keepMode = state.scene.mode;

  state.scene = {
    ...Core.defaultSceneState(),
    topicId: keepTopic,
    mode: keepMode,
  };

  persistScene();
}

function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!currentTopic) return;

    const modeBtn = target.closest("[data-scene-mode]");
    if (modeBtn) {
      state.scene.mode = modeBtn.dataset.sceneMode || "2d";
      persistScene();
      updateControls(currentTopic);
      renderSceneCanvas(currentTopic, false);
      return;
    }

    const highlightBtn = target.closest("[data-highlight]");
    if (highlightBtn) {
      state.scene.highlight = highlightBtn.dataset.highlight || "sides";
      persistScene();
      updateControls(currentTopic);
      renderSceneCanvas(currentTopic, false);
      return;
    }

    const toggleBtn = target.closest("[data-three-toggle]");
    if (toggleBtn) {
      const key = toggleBtn.dataset.threeToggle;
      if (!key) return;

      state.scene[key] = !state.scene[key];
      persistScene();
      updateControls(currentTopic);
      renderSceneCanvas(currentTopic, false);

      if (key === "autoRotate" && threeState.runtime) {
        threeState.runtime.setContinuous(Boolean(state.scene.autoRotate));
      }
      return;
    }

    const selectorToggle = target.closest("[data-selector-toggle]");
    if (selectorToggle instanceof HTMLElement) {
      const panelKey = selectorToggle.dataset.selectorToggle;
      if (!panelKey) return;

      selectorPanels[panelKey] = !selectorPanels[panelKey];
      syncSelectorPanelsUi();
      return;
    }

    if (target.id === "scene-reset") {
      applySceneReset();
      updateControls(currentTopic);
      updateMetrics(currentTopic);
      updateGraph(currentTopic);
      renderSceneCanvas(currentTopic, true);
      return;
    }

    if (target.id === "scene-fullscreen") {
      const host = document.querySelector(".scene-canvas");
      if (!host) return;

      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else {
        host.requestFullscreen?.();
      }
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!currentTopic) return;

    const field = target.closest("[data-scene-field]");
    if (!(field instanceof HTMLElement)) return;

    const key = field.dataset.sceneField;
    if (!key) return;

    if (!(field instanceof HTMLInputElement)) return;
    state.scene[key] = Number(field.value);

    const valueNode = document.querySelector(`[data-field-value="${key}"]`);
    if (valueNode) {
      const def = Core.sceneFieldDefs(currentTopic).find((item) => item.key === key);
      valueNode.textContent = `${state.scene[key]}${def?.suffix || ""}`;
    }

    debouncedVisualUpdate();
  });
}

function init() {
  bindEvents();

  const topic = topicByUrlOrState();
  if (!topic) {
    Core.initShell({
      page: "scene",
      title: "Сцена",
      badge: Core.routeLabel("scene"),
      shortcutPage: "scene",
    });

    const root = refs.root();
    if (root) {
      root.innerHTML = Core.emptyView("Нет тем для сцены", "Проверь, что файл course-data.js подключён и содержит темы.");
    }
    return;
  }

  currentTopic = topic;
  state.scene.topicId = topic.id;
  ensureTopicMode(topic);
  syncSelectorDefaults(topic);
  persistScene();
  renderLayout(topic);
}

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("beforeunload", () => {
  if (!threeState.runtime) return;

  threeState.runtime.dispose();
  threeState.runtime = null;
});
