window.SceneRenderers = (() => {
  const THREE_READY = typeof window.THREE !== "undefined";
  let runtime = null;

  function cleanupThreeScene() {
    if (!runtime) return;

    cancelAnimationFrame(runtime.frameId);
    runtime.resizeObserver?.disconnect();
    runtime.container?.removeEventListener("pointerdown", runtime.onPointerDown);
    runtime.container?.removeEventListener("wheel", runtime.onWheel);
    window.removeEventListener("pointermove", runtime.onPointerMove);
    window.removeEventListener("pointerup", runtime.onPointerUp);

    runtime.root?.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material.dispose();
      }
    });

    runtime.renderer?.dispose();
    if (runtime.renderer?.domElement?.parentNode) {
      runtime.renderer.domElement.parentNode.removeChild(runtime.renderer.domElement);
    }

    runtime = null;
  }

  function px(value) {
    return value * 16;
  }

  function pts(count, radius, cx = 210, cy = 150, rot = -Math.PI / 2) {
    return Array.from({ length: count }, (_, index) => {
      const angle = rot + (index * Math.PI * 2) / count;
      return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    });
  }

  function poly(points) {
    return points.map((point) => point.join(",")).join(" ");
  }

  function pointMarks(points, state) {
    if (!["points", "angles"].includes(state.highlight)) return "";
    return points.map((point, index) => `
      <circle class="shape-point" cx="${point[0]}" cy="${point[1]}" r="5"></circle>
      <text class="shape-text" x="${point[0] + 8}" y="${point[1] - 8}">${String.fromCharCode(65 + index)}</text>
    `).join("");
  }

  function polyShape(points, state) {
    const fillClass = ["area", "zones"].includes(state.highlight) ? "shape-fill area" : "shape-fill";
    const lineClass = state.highlight === "sides" ? "shape-line focus" : "shape-line";
    return `
      <g class="shape">
        <polygon class="${fillClass}" points="${poly(points)}"></polygon>
        <polygon class="${lineClass}" points="${poly(points)}"></polygon>
        ${pointMarks(points, state)}
        ${state.highlight === "area" ? `<text class="shape-value" x="202" y="154">S</text>` : ""}
      </g>
    `;
  }

  function ellipseShape(rx, ry, state) {
    const fillClass = ["area", "zones"].includes(state.highlight) ? "shape-fill area" : "shape-fill";
    const lineClass = state.highlight === "sides" ? "shape-line focus" : "shape-line";
    const guide = ["points", "angles"].includes(state.highlight)
      ? `<line class="shape-guide" x1="210" y1="150" x2="${210 + rx}" y2="150"></line><circle class="shape-point" cx="210" cy="150" r="5"></circle><text class="shape-text" x="${210 + rx / 2}" y="142">r</text>`
      : "";

    return `
      <g class="shape">
        <ellipse class="${fillClass}" cx="210" cy="150" rx="${rx}" ry="${ry}"></ellipse>
        <ellipse class="${lineClass}" cx="210" cy="150" rx="${rx}" ry="${ry}"></ellipse>
        ${guide}
        ${state.highlight === "area" ? `<text class="shape-value" x="202" y="154">S</text>` : ""}
      </g>
    `;
  }

  function sectorShape(radius, degrees, state) {
    const radians = (degrees * Math.PI) / 180;
    const x = 210 + Math.cos(radians) * radius;
    const y = 150 - Math.sin(radians) * radius;
    const largeArc = degrees > 180 ? 1 : 0;
    const fillClass = ["area", "zones"].includes(state.highlight) ? "shape-fill area" : "shape-fill";
    const lineClass = state.highlight === "sides" ? "shape-line focus" : "shape-line";

    return `
      <g class="shape">
        <path class="${fillClass}" d="M210 150 L ${210 + radius} 150 A ${radius} ${radius} 0 ${largeArc} 0 ${x} ${y} Z"></path>
        <path class="${lineClass}" d="M210 150 L ${210 + radius} 150 A ${radius} ${radius} 0 ${largeArc} 0 ${x} ${y} Z"></path>
        <circle class="shape-point" cx="210" cy="150" r="5"></circle>
        ${state.highlight === "angles" ? `<text class="shape-text" x="220" y="140">α</text>` : ""}
      </g>
    `;
  }

  function svgScene(topicId, state) {
    const a = px(state.base);
    const h = px(state.height);
    const b = px(state.depth);
    const angleOffset = state.angle * 0.5;

    let body = "";
    if (topicId === "triangle") body = polyShape([[210, 150 - h], [210 - a / 2, 210], [210 + a / 2, 210]], state);
    else if (topicId === "square") body = polyShape([[210 - a / 2, 150 - a / 2], [210 + a / 2, 150 - a / 2], [210 + a / 2, 150 + a / 2], [210 - a / 2, 150 + a / 2]], state);
    else if (topicId === "rectangle") body = polyShape([[210 - a / 2, 150 - h / 2], [210 + a / 2, 150 - h / 2], [210 + a / 2, 150 + h / 2], [210 - a / 2, 150 + h / 2]], state);
    else if (topicId === "circle") body = ellipseShape(Math.min(a, 96), Math.min(a, 96), state);
    else if (topicId === "ellipse") body = ellipseShape(Math.min(a, 112), Math.min(h, 86), state);
    else if (topicId === "sector") body = sectorShape(Math.min(a, 100), state.angle, state);
    else if (topicId === "polygon") body = polyShape(pts(state.sides, Math.min(a, 92)), state);
    else if (topicId === "parallelogram") body = polyShape([[140 + angleOffset, 100], [280 + angleOffset, 100], [280 - angleOffset, 200], [140 - angleOffset, 200]], state);
    else if (topicId === "rhombus") body = polyShape([[210, 150 - h], [210 + a / 2, 150], [210, 150 + h], [210 - a / 2, 150]], state);
    else if (topicId === "trapezoid") body = polyShape([[210 - a / 2, 110], [210 + a / 2, 110], [210 + (a + b) / 2, 210], [210 - (a + b) / 2, 210]], state);
    else if (topicId === "cube") body = polyShape([[150, 90], [270, 90], [270, 210], [150, 210]], state);
    else if (topicId === "rectangular-prism") body = polyShape([[130, 104], [290, 104], [290, 196], [130, 196]], state);
    else if (topicId === "pyramid") body = polyShape([[210, 86], [135, 214], [285, 214]], state);
    else if (topicId === "cylinder") body = ellipseShape(Math.min(a, 78), Math.min(a * 0.55, 54), state);
    else if (topicId === "cone") body = polyShape([[210, 80], [134, 216], [286, 216]], state);
    else if (topicId === "sphere") body = ellipseShape(Math.min(a, 92), Math.min(a, 92), state);

    return `<svg viewBox="0 0 420 300" role="img" aria-label="Интерактивная 2D фигура">${body}</svg>`;
  }

  function graphGrid() {
    const lines = [];
    for (let x = 30; x <= 330; x += 30) lines.push(`<line class="graph-grid" x1="${x}" y1="20" x2="${x}" y2="320"></line>`);
    for (let y = 20; y <= 320; y += 30) lines.push(`<line class="graph-grid" x1="30" y1="${y}" x2="330" y2="${y}"></line>`);
    return lines.join("");
  }

  function graphCard(topic, state) {
    const circleGraph = `
      <svg class="graph-svg" viewBox="0 0 360 340" role="img" aria-label="График круга">
        ${graphGrid()}
        <line class="graph-axis" x1="180" y1="20" x2="180" y2="320"></line>
        <line class="graph-axis" x1="30" y1="170" x2="330" y2="170"></line>
        <circle class="graph-shape" cx="180" cy="170" r="${Math.min(110, state.base * 12)}"></circle>
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
        <ellipse class="graph-shape" cx="180" cy="170" rx="${Math.min(122, Math.max(state.base, state.height) * 12)}" ry="${Math.min(92, Math.min(state.base, state.height) * 12)}"></ellipse>
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
          <span class="badge">SVG graph</span>
        </div>
        <div class="graph-frame">
          ${topic.id === "circle" ? circleGraph : ellipseGraph}
        </div>
      </section>
    `;
  }

  function makeVertexPoints(geometry) {
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute("position", geometry.getAttribute("position").clone());
    return new THREE.Points(pointsGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 }));
  }

  function showThreeWarning(container, message) {
    if (!container) return;
    container.innerHTML = `<div class="three-warning">${message}</div>`;
  }

  function createStereoObject(topic, state) {
    const group = new THREE.Group();
    const a = state.base;
    const b = state.depth;
    const h = state.height;

    let geometry;
    if (topic.id === "cube") geometry = new THREE.BoxGeometry(a, a, a);
    else if (topic.id === "rectangular-prism") geometry = new THREE.BoxGeometry(a, h, b);
    else if (topic.id === "cylinder") geometry = new THREE.CylinderGeometry(a, a, h, 36, 1);
    else if (topic.id === "cone") geometry = new THREE.ConeGeometry(a, h, 36, 1);
    else if (topic.id === "sphere") geometry = new THREE.SphereGeometry(a, 28, 20);
    else if (topic.id === "pyramid") {
      geometry = new THREE.ConeGeometry(a * 0.88, h, 4, 1);
      geometry.rotateY(Math.PI / 4);
    } else {
      geometry = new THREE.BoxGeometry(a, a, a);
    }

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0x9b78ff,
        transparent: true,
        opacity: state.showFaces ? 0.78 : 0.08,
        roughness: 0.34,
        metalness: 0.08,
      })
    );
    group.add(mesh);

    if (state.showEdges) {
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: 0xf6d4ff })));
    }
    if (state.showVertices) {
      group.add(makeVertexPoints(geometry));
    }

    const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
    return { group, maxDimension: Math.max(size.x, size.y, size.z, 1) };
  }

  function initThreeScene(topic, state) {
    cleanupThreeScene();
    if (!THREE_READY) return;

    const container = document.getElementById("three-stage");
    if (!container) return;

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f0e15);
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 1.1));
      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(8, 12, 9);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xb79cff, 0.48);
      fill.position.set(-6, 5, -7);
      scene.add(fill);
      scene.add(new THREE.GridHelper(24, 24, 0x6d58b8, 0x30284f));
      scene.add(new THREE.AxesHelper(6));

      const { group, maxDimension } = createStereoObject(topic, state);
      scene.add(group);

      const orbit = {
        radius: Math.max(10, maxDimension * 3.6),
        theta: 0.82,
        phi: 1.04,
        dragging: false,
        lastX: 0,
        lastY: 0,
      };

      function updateCamera() {
        const x = orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
        const y = orbit.radius * Math.cos(orbit.phi);
        const z = orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
        camera.position.set(x, y, z);
        camera.lookAt(0, 0, 0);
      }

      function resize() {
        const width = container.clientWidth || 600;
        const height = container.clientHeight || 420;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      function animate() {
        if (state.autoRotate && !orbit.dragging) group.rotation.y += 0.01;
        updateCamera();
        renderer.render(scene, camera);
        runtime.frameId = requestAnimationFrame(animate);
      }

      const onPointerDown = (event) => {
        orbit.dragging = true;
        orbit.lastX = event.clientX;
        orbit.lastY = event.clientY;
      };

      const onPointerMove = (event) => {
        if (!orbit.dragging) return;
        const dx = event.clientX - orbit.lastX;
        const dy = event.clientY - orbit.lastY;
        orbit.lastX = event.clientX;
        orbit.lastY = event.clientY;
        orbit.theta -= dx * 0.01;
        orbit.phi = Math.max(0.25, Math.min(Math.PI - 0.25, orbit.phi + dy * 0.01));
      };

      const onPointerUp = () => {
        orbit.dragging = false;
      };

      const onWheel = (event) => {
        event.preventDefault();
        orbit.radius = Math.max(4, Math.min(60, orbit.radius + event.deltaY * 0.01));
      };

      container.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      container.addEventListener("wheel", onWheel, { passive: false });

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);

      runtime = {
        container,
        renderer,
        root: group,
        resizeObserver,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onWheel,
        frameId: 0,
      };

      resize();
      updateCamera();
      animate();
    } catch (error) {
      cleanupThreeScene();
      showThreeWarning(container, "3D-сцена не запустилась в этом окружении. Открой 2D-режим или обнови браузер.");
      console.error("Three.js scene init failed", error);
    }
  }

  return {
    THREE_READY,
    cleanupThreeScene,
    svgScene,
    graphCard,
    initThreeScene,
  };
})();
