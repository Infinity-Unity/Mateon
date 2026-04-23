(function () {
  "use strict";

  class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    add(other) {
      return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    sub(other) {
      return new Vec3(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    scale(value) {
      return new Vec3(this.x * value, this.y * value, this.z * value);
    }

    dot(other) {
      return this.x * other.x + this.y * other.y + this.z * other.z;
    }

    cross(other) {
      return new Vec3(
        this.y * other.z - this.z * other.y,
        this.z * other.x - this.x * other.z,
        this.x * other.y - this.y * other.x
      );
    }

    length() {
      return Math.hypot(this.x, this.y, this.z);
    }

    normalize() {
      const len = this.length() || 1;
      return this.scale(1 / len);
    }
  }

  class Mat4 {
    constructor(elements) {
      this.elements = elements || [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ];
    }

    static multiply(left, right) {
      const a = left.elements;
      const b = right.elements;
      const out = new Array(16).fill(0);

      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          for (let i = 0; i < 4; i += 1) {
            out[row * 4 + col] += a[row * 4 + i] * b[i * 4 + col];
          }
        }
      }

      return new Mat4(out);
    }

    static rotationX(angle) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return new Mat4([
        1, 0, 0, 0,
        0, c, -s, 0,
        0, s, c, 0,
        0, 0, 0, 1
      ]);
    }

    static rotationY(angle) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return new Mat4([
        c, 0, s, 0,
        0, 1, 0, 0,
        -s, 0, c, 0,
        0, 0, 0, 1
      ]);
    }

    static perspective(fov, aspect, near, far) {
      const f = 1 / Math.tan(fov / 2);
      return new Mat4([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) / (near - far), (2 * far * near) / (near - far),
        0, 0, -1, 0
      ]);
    }

    static lookAt(eye, target, up) {
      const zAxis = eye.sub(target).normalize();
      const xAxis = up.cross(zAxis).normalize();
      const yAxis = zAxis.cross(xAxis);

      return new Mat4([
        xAxis.x, xAxis.y, xAxis.z, -xAxis.dot(eye),
        yAxis.x, yAxis.y, yAxis.z, -yAxis.dot(eye),
        zAxis.x, zAxis.y, zAxis.z, -zAxis.dot(eye),
        0, 0, 0, 1
      ]);
    }

    transformVec4(vector) {
      const m = this.elements;
      return {
        x: m[0] * vector.x + m[1] * vector.y + m[2] * vector.z + m[3] * vector.w,
        y: m[4] * vector.x + m[5] * vector.y + m[6] * vector.z + m[7] * vector.w,
        z: m[8] * vector.x + m[9] * vector.y + m[10] * vector.z + m[11] * vector.w,
        w: m[12] * vector.x + m[13] * vector.y + m[14] * vector.z + m[15] * vector.w
      };
    }
  }

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const round = (value) => Number(value.toFixed(3));

  function formatNumber(value) {
    return new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 3
    }).format(round(value));
  }

  function createEdgesFromFaces(faces) {
    const map = new Map();

    faces.forEach((face) => {
      face.forEach((pointIndex, index) => {
        const next = face[(index + 1) % face.length];
        const key = [pointIndex, next].sort((a, b) => a - b).join("-");
        if (!map.has(key)) {
          map.set(key, [pointIndex, next]);
        }
      });
    });

    return Array.from(map.values());
  }

  function createTopic(id, title, group, theory, formulas, visualization, examples, preset) {
    return { id, title, group, theory, formulas, visualization, examples, preset };
  }

  const topics = [
    createTopic("cube", "Куб", "Базовые тела", "Куб — регулярный многогранник с шестью квадратными гранями, двенадцатью рёбрами и восемью вершинами.", "S = 6a², V = a³, диагональ куба d = a√3.", "В сцене удобно включить грани и вершины, чтобы увидеть симметрию и равенство всех рёбер.", "Если a = 4, то S = 96, а V = 64.", { figureId: "cube", params: { side: 4 }, highlight: { faces: true, edges: true, vertices: true }, note: "Пресет: куб и все базовые слои." }),
    createTopic("rectangular-prism", "Прямоугольный параллелепипед", "Базовые тела", "Это тело с попарно параллельными прямоугольными гранями. Куб является его частным случаем.", "S = 2(ab + bc + ac), V = abc, пространственная диагональ d = √(a² + b² + c²).", "Меняйте три ребра независимо и отслеживайте, как вытягивается тело по осям.", "Для a = 3, b = 4, c = 5 имеем S = 94 и V = 60.", { figureId: "rectangularPrism", params: { width: 4, height: 3, depth: 5 }, highlight: { faces: true, edges: true, vertices: false }, note: "Пресет: разные длины рёбер и акцент на форму." }),
    createTopic("triangular-prism", "Правильная треугольная призма", "Призмы", "Основания — равные равносторонние треугольники, а боковые грани — прямоугольники.", "S = 2·(√3/4·a²) + 3ah, V = (√3/4·a²)·h.", "В viewer видно, как призма получается вытяжением треугольного основания вдоль высоты.", "Если a = 4 и h = 7, то V ≈ 48.497.", { figureId: "triangularPrism", params: { side: 4, length: 7 }, highlight: { faces: true, edges: true, vertices: false }, note: "Пресет: призма с вытянутой высотой." }),
    createTopic("square-pyramid", "Правильная четырёхугольная пирамида", "Пирамиды", "Основание пирамиды — квадрат, а вершина находится на перпендикуляре через центр основания.", "S = a² + 2al, где l = √(h² + (a/2)²); V = a²h/3.", "Подсветка граней хорошо показывает сходящиеся в одну вершину боковые треугольники.", "При a = 6 и h = 5 объём равен 60.", { figureId: "squarePyramid", params: { base: 6, height: 5 }, highlight: { faces: true, edges: true, vertices: true }, note: "Пресет: пирамида с выделенной вершиной." }),
    createTopic("tetrahedron", "Правильный тетраэдр", "Регулярные многогранники", "Тетраэдр состоит из четырёх равносторонних треугольников и является простейшим правильным многогранником.", "S = √3·a², V = a³ / (6√2).", "Если включить вершины, легко увидеть, что любая пара вершин соединяется ребром.", "Для a = 5 получаем V ≈ 14.731.", { figureId: "tetrahedron", params: { side: 5 }, highlight: { faces: true, edges: true, vertices: true }, note: "Пресет: регулярный тетраэдр." }),
    createTopic("octahedron", "Правильный октаэдр", "Регулярные многогранники", "Октаэдр можно представить как две одинаковые пирамиды, соединённые основаниями.", "S = 2√3·a², V = (√2/3)·a³.", "При вращении тела заметно, как симметрия относительно центра сохраняется с любого ракурса.", "Если a = 4, то V ≈ 30.17.", { figureId: "octahedron", params: { side: 4 }, highlight: { faces: true, edges: true, vertices: false }, note: "Пресет: октаэдр как двойная пирамида." }),
    createTopic("hexagonal-prism", "Правильная шестиугольная призма", "Призмы", "Основаниями служат правильные шестиугольники, а боковая поверхность образована шестью прямоугольниками.", "S = 3√3·a² + 6ah, V = (3√3/2·a²)·h.", "Фигура удобно показывает связь между правильным многоугольником в основании и высотой призмы.", "Для a = 3 и h = 8 объём ≈ 187.061.", { figureId: "hexagonalPrism", params: { side: 3, height: 8 }, highlight: { faces: true, edges: true, vertices: false }, note: "Пресет: высокая шестиугольная призма." }),
    createTopic("surface-area", "Площадь поверхности", "Общие идеи", "Площадь поверхности тела складывается из площадей всех граней или участков поверхности.", "Для многогранников S = сумма площадей всех граней; при масштабировании в k раз площадь меняется в k² раз.", "Меняя параметры тела в сцене, можно сразу наблюдать рост площади без изменения принципа вычисления.", "Если ребро куба увеличить в 2 раза, площадь возрастёт в 4 раза.", { figureId: "cube", params: { side: 3 }, highlight: { faces: true, edges: false, vertices: false }, note: "Пресет: акцент только на поверхности." }),
    createTopic("volume", "Объём тела", "Общие идеи", "Объём показывает, сколько пространства занимает тело, и зависит от линейных размеров кубически.", "При масштабировании в k раз объём меняется в k³ раз.", "В viewer можно менять один параметр и видеть, насколько чувствительно объём реагирует на рост высоты или ребра.", "Если все размеры увеличить в 3 раза, объём вырастет в 27 раз.", { figureId: "rectangularPrism", params: { width: 2, height: 3, depth: 6 }, highlight: { faces: true, edges: true, vertices: false }, note: "Пресет: сравнение линейного роста и объёма." }),
    createTopic("prism-sections", "Сечения призмы", "Сечения", "Сечение — это фигура, получаемая при пересечении тела плоскостью. Для призм оно часто наследует структуру основания.", "Площадь сечения зависит от положения плоскости и формы основания.", "Даже без плоскости сечения в MVP полезно переключить призму и проследить, где могли бы проходить типовые разрезы.", "В треугольной призме плоскость через три подходящие точки может дать треугольник или четырёхугольник.", { figureId: "triangularPrism", params: { side: 5, length: 6 }, highlight: { faces: false, edges: true, vertices: true }, note: "Пресет: акцент на каркас фигуры для мысленного сечения." }),
    createTopic("pyramid-sections", "Сечения пирамиды", "Сечения", "Сечения пирамиды особенно наглядны, когда плоскость параллельна основанию или проходит через вершину.", "Параллельное основанию сечение подобно основанию, а его размеры зависят от расстояния до вершины.", "В сцене полезно смотреть на пирамиду в режиме рёбер и вершин, чтобы представлять, как плоскость режет боковые грани.", "Если сечение параллельно основанию и проходит на половине высоты, линейный масштаб уменьшится в 2 раза.", { figureId: "squarePyramid", params: { base: 7, height: 6 }, highlight: { faces: false, edges: true, vertices: true }, note: "Пресет: пирамида в каркасном режиме." }),
    createTopic("spatial-diagonals", "Пространственные диагонали и расстояния", "Линейные элементы", "Пространственная диагональ соединяет две вершины, не лежащие в одной грани, и помогает связывать 3D с теоремой Пифагора.", "Для прямоугольного параллелепипеда d = √(a² + b² + c²).", "Поверните тело так, чтобы увидеть диагональ как общий путь вдоль трёх измерений.", "Для размеров 1, 2, 2 диагональ равна 3.", { figureId: "rectangularPrism", params: { width: 2, height: 2, depth: 1 }, highlight: { faces: false, edges: true, vertices: true }, note: "Пресет: компактное тело для диагонали." }),
    createTopic("parallel-perpendicular", "Параллельность и перпендикулярность в пространстве", "Отношения", "В стереометрии важно отличать параллельные прямые и плоскости от перпендикулярных направлений и нормалей.", "Для прямоугольных тел соседние рёбра попарно перпендикулярны, а противоположные рёбра параллельны.", "Viewer помогает увидеть эти отношения при произвольном ракурсе, когда плоский рисунок уже не вводит в заблуждение.", "У куба любые две пересекающиеся рёбра одной вершины взаимно перпендикулярны.", { figureId: "cube", params: { side: 4 }, highlight: { faces: false, edges: true, vertices: true }, note: "Пресет: рёбра и вершины для пространственных отношений." }),
    createTopic("similar-solids", "Подобные тела и масштабирование", "Общие идеи", "Подобные тела имеют одинаковую форму, но разные линейные размеры, поэтому площади и объёмы меняются по разным законам.", "Если коэффициент подобия равен k, то площади относятся как k², а объёмы — как k³.", "Изменяя только один ползунок масштаба в сцене, удобно обсуждать, почему объём растёт быстрее площади.", "При k = 1.5 площадь растёт в 2.25 раза, а объём — в 3.375 раза.", { figureId: "cube", params: { side: 5 }, highlight: { faces: true, edges: true, vertices: false }, note: "Пресет: куб как эталон для масштабирования." })
  ];

  topics.push(
    createTopic("lateral-area", "Площадь боковой поверхности", "Новые темы", "Боковая поверхность отделяет вклад оснований от вкладов боковых граней или образующих.", "Для цилиндра Sбок = 2πrh, для конуса Sбок = πrl, для призм сумма боковых граней зависит от периметра основания.", "Сравните цилиндр, конус и усечённый конус: полная и боковая площади ведут себя по-разному.", "Если у цилиндра r = 3 и h = 5, то Sбок = 30π.", { figureId: "cylinder", params: { radius: 3, height: 5 }, highlight: { faces: true, edges: true, vertices: false }, note: "Пресет: цилиндр с акцентом на боковую поверхность." }),
    createTopic("inscribed-described", "Вписанные и описанные тела", "Новые темы", "Вписанные и описанные тела позволяют сравнивать одно и то же пространство через разные геометрические модели.", "Например, сфера может быть вписана в куб, а цилиндр — описан около призмы.", "Полезно переключаться между сферой и кубом, чтобы увидеть, как радиус связан с ребром.", "Если сфера вписана в куб, то её диаметр равен ребру куба.", { figureId: "sphere", params: { radius: 3 }, highlight: { faces: true, edges: false, vertices: false }, note: "Пресет: сфера для темы вписанных и описанных тел." }),
    createTopic("nets", "Развёртки многогранников", "Новые темы", "Развёртка помогает мысленно превратить поверхность многогранника в плоский набор граней.", "Площадь поверхности остаётся той же, но форма записи становится планиметрической.", "В сцене удобно выделять только грани и рёбра, чтобы представить, как тело могло бы раскрыться.", "Кубическая развёртка состоит из шести квадратов, соединённых по рёбрам.", { figureId: "dodecahedron", params: { side: 2.5 }, highlight: { faces: true, edges: true, vertices: false }, note: "Пресет: многогранник для обсуждения развёрток." }),
    createTopic("symmetry", "Симметрия в пространстве", "Новые темы", "Правильные тела обладают богатой системой осей и плоскостей симметрии.", "Симметрия помогает объяснять равенство рёбер, граней и углов, а также строить доказательства.", "Особенно наглядны икосаэдр и додекаэдр, где симметрия видна даже при сложной форме.", "У сферы любая прямая через центр задаёт ось симметрии.", { figureId: "icosahedron", params: { side: 3.4 }, highlight: { faces: true, edges: true, vertices: true }, note: "Пресет: икосаэдр для темы пространственной симметрии." }),
    createTopic("sections-of-solids", "Сечения тел вращения", "Новые темы", "Сечения конуса и других тел вращения ведут к эллипсам, параболам и гиперболам.", "Тип кривой зависит от положения плоскости относительно оси и образующей.", "Даже без полной геометрии сечения полезно сопоставить форму конуса с кривыми на плоскости.", "Сечение конуса плоскостью, параллельной образующей, даёт параболу.", { figureId: "cone", params: { radius: 3, height: 7 }, highlight: { faces: true, edges: true, vertices: false }, note: "Пресет: конус для разговора о конических сечениях." }),
    createTopic("composite-solids", "Комбинации тел", "Новые темы", "Составные тела позволяют разбирать объём и площадь как сумму или разность знакомых фигур.", "Часто задача сводится к разбиению на призмы, пирамиды и тела вращения.", "Наклонная пирамида и призма помогают обсуждать композиции на одном основании.", "Если тело состоит из призмы и пирамиды на том же основании, общий объём равен сумме двух объёмов.", { figureId: "obliquePyramid", params: { width: 5, depth: 4, height: 6, shift: 1.6 }, highlight: { faces: true, edges: true, vertices: true }, note: "Пресет: составной характер через пирамидальную форму." }),
    createTopic("classical-problems", "Удвоение куба и классические задачи", "Новые темы", "Исторические задачи стереометрии показывают, как геометрия связана с алгеброй и построениями.", "Удвоение куба требует увеличить ребро в ∛2 раза, чтобы объём вырос ровно вдвое.", "Через viewer удобно сравнивать масштабы кубов и обсуждать, почему задача не решается только циркулем и линейкой.", "Если исходное ребро равно a, то для двойного объёма нужно ребро a∛2.", { figureId: "cube", params: { side: 4 }, highlight: { faces: true, edges: true, vertices: true }, note: "Пресет: куб для классической задачи об удвоении." })
  );

  function squareFace(a, b, c, d) {
    return [a, b, c, d];
  }

  function averagePoint(points) {
    const total = points.reduce((sum, point) => sum.add(point), new Vec3());
    return total.scale(1 / points.length);
  }

  function polygonArea3D(points) {
    if (points.length < 3) {
      return 0;
    }

    let area = 0;
    for (let index = 1; index < points.length - 1; index += 1) {
      const ab = points[index].sub(points[0]);
      const ac = points[index + 1].sub(points[0]);
      area += ab.cross(ac).length() / 2;
    }
    return area;
  }

  function convexMeshMetrics(mesh) {
    const center = averagePoint(mesh.vertices);
    let surface = 0;
    let volume = 0;

    mesh.faces.forEach((face) => {
      const points = face.map((vertexIndex) => mesh.vertices[vertexIndex]);
      surface += polygonArea3D(points);

      for (let index = 1; index < points.length - 1; index += 1) {
        const a = points[0].sub(center);
        const b = points[index].sub(center);
        const c = points[index + 1].sub(center);
        volume += Math.abs(a.dot(b.cross(c))) / 6;
      }
    });

    return { surface, volume };
  }

  function createRegularPolygon(sides, radius, y, phase = 0, offsetX = 0, offsetZ = 0) {
    return Array.from({ length: sides }, (_, index) => {
      const angle = phase + (Math.PI * 2 * index) / sides;
      return new Vec3(
        offsetX + Math.cos(angle) * radius,
        y,
        offsetZ + Math.sin(angle) * radius
      );
    });
  }

  function createPrismMeshFromPolygons(bottom, top) {
    const vertices = bottom.concat(top);
    const count = bottom.length;
    const faces = [
      Array.from({ length: count }, (_, index) => count - 1 - index),
      Array.from({ length: count }, (_, index) => count + index)
    ];

    for (let index = 0; index < count; index += 1) {
      const next = (index + 1) % count;
      faces.push([index, next, count + next, count + index]);
    }

    return { vertices, faces, edges: createEdgesFromFaces(faces) };
  }

  function createCylinderMesh(radius, height, segments = 28) {
    const bottom = createRegularPolygon(segments, radius, -height / 2, 0);
    const top = createRegularPolygon(segments, radius, height / 2, 0);
    return createPrismMeshFromPolygons(bottom, top);
  }

  function createFrustumMesh(radiusBottom, radiusTop, height, segments = 28) {
    const bottom = createRegularPolygon(segments, radiusBottom, -height / 2, 0);
    const top = createRegularPolygon(segments, radiusTop, height / 2, 0);
    return createPrismMeshFromPolygons(bottom, top);
  }

  function createConeMesh(radius, height, segments = 28) {
    const base = createRegularPolygon(segments, radius, -height / 2, 0);
    const apex = new Vec3(0, height / 2, 0);
    const vertices = base.concat([apex]);
    const apexIndex = vertices.length - 1;
    const faces = [Array.from({ length: segments }, (_, index) => segments - 1 - index)];

    for (let index = 0; index < segments; index += 1) {
      const next = (index + 1) % segments;
      faces.push([index, next, apexIndex]);
    }

    return { vertices, faces, edges: createEdgesFromFaces(faces) };
  }

  function createSphereMesh(radius, segments = 26, rings = 14) {
    const vertices = [];
    const faces = [];

    vertices.push(new Vec3(0, radius, 0));

    for (let ring = 1; ring < rings; ring += 1) {
      const phi = (Math.PI * ring) / rings;
      const y = Math.cos(phi) * radius;
      const ringRadius = Math.sin(phi) * radius;

      for (let segment = 0; segment < segments; segment += 1) {
        const theta = (Math.PI * 2 * segment) / segments;
        vertices.push(new Vec3(
          Math.cos(theta) * ringRadius,
          y,
          Math.sin(theta) * ringRadius
        ));
      }
    }

    const southIndex = vertices.length;
    vertices.push(new Vec3(0, -radius, 0));

    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      faces.push([0, 1 + next, 1 + segment]);
    }

    for (let ring = 0; ring < rings - 2; ring += 1) {
      const start = 1 + ring * segments;
      const nextStart = start + segments;

      for (let segment = 0; segment < segments; segment += 1) {
        const next = (segment + 1) % segments;
        faces.push([start + segment, start + next, nextStart + next, nextStart + segment]);
      }
    }

    const lastRingStart = 1 + (rings - 2) * segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      faces.push([lastRingStart + segment, lastRingStart + next, southIndex]);
    }

    return { vertices, faces, edges: createEdgesFromFaces(faces) };
  }

  function scaleMeshToSide(rawVertices, faces, targetSide) {
    const [aIndex, bIndex] = faces[0];
    const currentSide = rawVertices[aIndex].sub(rawVertices[bIndex]).length();
    const scale = targetSide / currentSide;
    const vertices = rawVertices.map((vertex) => vertex.scale(scale));
    return { vertices, faces, edges: createEdgesFromFaces(faces) };
  }

  function createIcosahedronMesh(side) {
    const phi = (1 + Math.sqrt(5)) / 2;
    const rawVertices = [
      new Vec3(-1, phi, 0), new Vec3(1, phi, 0), new Vec3(-1, -phi, 0), new Vec3(1, -phi, 0),
      new Vec3(0, -1, phi), new Vec3(0, 1, phi), new Vec3(0, -1, -phi), new Vec3(0, 1, -phi),
      new Vec3(phi, 0, -1), new Vec3(phi, 0, 1), new Vec3(-phi, 0, -1), new Vec3(-phi, 0, 1)
    ];
    const faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];
    return scaleMeshToSide(rawVertices, faces, side);
  }

  function createDodecahedronMesh(side) {
    const icosahedron = createIcosahedronMesh(1);
    const faceCenters = icosahedron.faces.map((face) => averagePoint(face.map((index) => icosahedron.vertices[index])));
    const facesByVertex = icosahedron.vertices.map(() => []);

    icosahedron.faces.forEach((face, faceIndex) => {
      face.forEach((vertexIndex) => facesByVertex[vertexIndex].push(faceIndex));
    });

    const dodecahedronFaces = facesByVertex.map((incidentFaces, vertexIndex) => {
      const origin = icosahedron.vertices[vertexIndex].normalize();
      const tangent = Math.abs(origin.y) < 0.9 ? new Vec3(0, 1, 0).cross(origin).normalize() : new Vec3(1, 0, 0).cross(origin).normalize();
      const bitangent = origin.cross(tangent).normalize();

      return incidentFaces
        .map((faceIndex) => {
          const point = faceCenters[faceIndex].sub(icosahedron.vertices[vertexIndex]);
          const angle = Math.atan2(point.dot(bitangent), point.dot(tangent));
          return { faceIndex, angle };
        })
        .sort((left, right) => left.angle - right.angle)
        .map((entry) => entry.faceIndex);
    });

    const scaled = scaleMeshToSide(faceCenters, dodecahedronFaces, side);
    return scaled;
  }

  function createObliquePrismMesh(width, height, depth, shiftX, shiftZ) {
    const x = width / 2;
    const y = height / 2;
    const z = depth / 2;
    const bottom = [
      new Vec3(-x, -y, -z),
      new Vec3(x, -y, -z),
      new Vec3(x, -y, z),
      new Vec3(-x, -y, z)
    ];
    const top = bottom.map((vertex) => new Vec3(vertex.x + shiftX, y, vertex.z + shiftZ));
    return createPrismMeshFromPolygons(bottom, top);
  }

  function createObliquePyramidMesh(width, depth, height, shiftX, shiftZ) {
    const x = width / 2;
    const y = height / 2;
    const z = depth / 2;
    const vertices = [
      new Vec3(-x, -y, -z),
      new Vec3(x, -y, -z),
      new Vec3(x, -y, z),
      new Vec3(-x, -y, z),
      new Vec3(shiftX, y, shiftZ)
    ];
    const faces = [[3, 2, 1, 0], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]];
    return { vertices, faces, edges: createEdgesFromFaces(faces) };
  }

  function createAntiprismMesh(side, height) {
    const n = 6;
    const radius = side / (2 * Math.sin(Math.PI / n));
    const bottom = createRegularPolygon(n, radius, -height / 2, 0);
    const top = createRegularPolygon(n, radius, height / 2, Math.PI / n);
    const vertices = bottom.concat(top);
    const faces = [
      Array.from({ length: n }, (_, index) => n - 1 - index),
      Array.from({ length: n }, (_, index) => n + index)
    ];

    for (let index = 0; index < n; index += 1) {
      const next = (index + 1) % n;
      faces.push([index, next, n + index]);
      faces.push([next, n + next, n + index]);
    }

    return { vertices, faces, edges: createEdgesFromFaces(faces) };
  }

  const figureDefinitions = {
    cube: {
      id: "cube",
      name: "Куб",
      description: "Регулярное тело с равными рёбрами и шестью квадратными гранями.",
      params: [
        { key: "side", label: "Ребро a", min: 1, max: 12, step: 0.1, defaultValue: 4 }
      ],
      createMesh(params) {
        const s = params.side / 2;
        const vertices = [
          new Vec3(-s, -s, -s), new Vec3(s, -s, -s), new Vec3(s, s, -s), new Vec3(-s, s, -s),
          new Vec3(-s, -s, s), new Vec3(s, -s, s), new Vec3(s, s, s), new Vec3(-s, s, s)
        ];
        const faces = [
          squareFace(0, 1, 2, 3),
          squareFace(4, 5, 6, 7),
          squareFace(0, 1, 5, 4),
          squareFace(1, 2, 6, 5),
          squareFace(2, 3, 7, 6),
          squareFace(3, 0, 4, 7)
        ];
        return { vertices, faces, edges: createEdgesFromFaces(faces) };
      },
      getMetrics(params) {
        const a = params.side;
        return {
          surface: 6 * a * a,
          volume: a * a * a,
          note: "Все грани куба равны, поэтому площадь складывается из шести квадратов.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = 6a²", numeric: `S = 6 × ${formatNumber(a)}² = ${formatNumber(6 * a * a)}` },
            { title: "Объём", symbolic: "V = a³", numeric: `V = ${formatNumber(a)}³ = ${formatNumber(a * a * a)}` }
          ]
        };
      }
    },
    rectangularPrism: {
      id: "rectangularPrism",
      name: "Прямоугольный параллелепипед",
      description: "Тело с тремя независимыми размерами и прямоугольными гранями.",
      params: [
        { key: "width", label: "Ширина a", min: 1, max: 12, step: 0.1, defaultValue: 4 },
        { key: "height", label: "Высота b", min: 1, max: 12, step: 0.1, defaultValue: 3 },
        { key: "depth", label: "Глубина c", min: 1, max: 12, step: 0.1, defaultValue: 5 }
      ],
      createMesh(params) {
        const x = params.width / 2;
        const y = params.height / 2;
        const z = params.depth / 2;
        const vertices = [
          new Vec3(-x, -y, -z), new Vec3(x, -y, -z), new Vec3(x, y, -z), new Vec3(-x, y, -z),
          new Vec3(-x, -y, z), new Vec3(x, -y, z), new Vec3(x, y, z), new Vec3(-x, y, z)
        ];
        const faces = [
          squareFace(0, 1, 2, 3),
          squareFace(4, 5, 6, 7),
          squareFace(0, 1, 5, 4),
          squareFace(1, 2, 6, 5),
          squareFace(2, 3, 7, 6),
          squareFace(3, 0, 4, 7)
        ];
        return { vertices, faces, edges: createEdgesFromFaces(faces) };
      },
      getMetrics(params) {
        const { width: a, height: b, depth: c } = params;
        return {
          surface: 2 * (a * b + b * c + a * c),
          volume: a * b * c,
          note: "Площадь складывается из трёх пар равных прямоугольников.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = 2(ab + bc + ac)", numeric: `S = 2(${formatNumber(a)}×${formatNumber(b)} + ${formatNumber(b)}×${formatNumber(c)} + ${formatNumber(a)}×${formatNumber(c)}) = ${formatNumber(2 * (a * b + b * c + a * c))}` },
            { title: "Объём", symbolic: "V = abc", numeric: `V = ${formatNumber(a)} × ${formatNumber(b)} × ${formatNumber(c)} = ${formatNumber(a * b * c)}` }
          ]
        };
      }
    },
    triangularPrism: {
      id: "triangularPrism",
      name: "Правильная треугольная призма",
      description: "Призма с равносторонним треугольником в основании и прямой боковой поверхностью.",
      params: [
        { key: "side", label: "Сторона основания a", min: 1, max: 12, step: 0.1, defaultValue: 4 },
        { key: "length", label: "Высота призмы h", min: 1, max: 14, step: 0.1, defaultValue: 7 }
      ],
      createMesh(params) {
        const a = params.side;
        const h = params.length / 2;
        const triangleHeight = Math.sqrt(3) * a / 2;
        const baseY = triangleHeight / 3;
        const vertices = [
          new Vec3(-a / 2, -baseY, -h),
          new Vec3(a / 2, -baseY, -h),
          new Vec3(0, triangleHeight - baseY, -h),
          new Vec3(-a / 2, -baseY, h),
          new Vec3(a / 2, -baseY, h),
          new Vec3(0, triangleHeight - baseY, h)
        ];
        const faces = [[0, 1, 2], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]];
        return { vertices, faces, edges: createEdgesFromFaces(faces) };
      },
      getMetrics(params) {
        const a = params.side;
        const h = params.length;
        const baseArea = Math.sqrt(3) * a * a / 4;
        return {
          surface: 2 * baseArea + 3 * a * h,
          volume: baseArea * h,
          note: "Основания одинаковы, а боковая поверхность распадается на три прямоугольника.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = 2·(√3/4·a²) + 3ah", numeric: `S = 2·(${formatNumber(Math.sqrt(3) / 4)}×${formatNumber(a)}²) + 3×${formatNumber(a)}×${formatNumber(h)} = ${formatNumber(2 * baseArea + 3 * a * h)}` },
            { title: "Объём", symbolic: "V = (√3/4·a²)·h", numeric: `V = (${formatNumber(Math.sqrt(3) / 4)}×${formatNumber(a)}²) × ${formatNumber(h)} = ${formatNumber(baseArea * h)}` }
          ]
        };
      }
    },
    squarePyramid: {
      id: "squarePyramid",
      name: "Правильная четырёхугольная пирамида",
      description: "Квадратное основание и вершина на оси, проходящей через центр основания.",
      params: [
        { key: "base", label: "Сторона основания a", min: 1, max: 12, step: 0.1, defaultValue: 6 },
        { key: "height", label: "Высота h", min: 1, max: 14, step: 0.1, defaultValue: 5 }
      ],
      createMesh(params) {
        const a = params.base / 2;
        const h = params.height / 2;
        const vertices = [new Vec3(-a, -h, -a), new Vec3(a, -h, -a), new Vec3(a, -h, a), new Vec3(-a, -h, a), new Vec3(0, h, 0)];
        const faces = [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]];
        return { vertices, faces, edges: createEdgesFromFaces(faces) };
      },
      getMetrics(params) {
        const a = params.base;
        const h = params.height;
        const slant = Math.sqrt(h * h + (a / 2) * (a / 2));
        return {
          surface: a * a + 2 * a * slant,
          volume: a * a * h / 3,
          note: "Боковые грани равны, поэтому достаточно найти апофему.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = a² + 2al, l = √(h² + (a/2)²)", numeric: `S = ${formatNumber(a)}² + 2×${formatNumber(a)}×${formatNumber(slant)} = ${formatNumber(a * a + 2 * a * slant)}` },
            { title: "Объём", symbolic: "V = a²h / 3", numeric: `V = ${formatNumber(a)}² × ${formatNumber(h)} / 3 = ${formatNumber(a * a * h / 3)}` }
          ]
        };
      }
    },
    tetrahedron: {
      id: "tetrahedron",
      name: "Правильный тетраэдр",
      description: "Все четыре грани — равносторонние треугольники.",
      params: [
        { key: "side", label: "Ребро a", min: 1, max: 12, step: 0.1, defaultValue: 5 }
      ],
      createMesh(params) {
        const scale = params.side / (2 * Math.sqrt(2));
        const vertices = [
          new Vec3(1, 1, 1).scale(scale),
          new Vec3(-1, -1, 1).scale(scale),
          new Vec3(-1, 1, -1).scale(scale),
          new Vec3(1, -1, -1).scale(scale)
        ];
        const faces = [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]];
        return { vertices, faces, edges: createEdgesFromFaces(faces) };
      },
      getMetrics(params) {
        const a = params.side;
        return {
          surface: Math.sqrt(3) * a * a,
          volume: a * a * a / (6 * Math.sqrt(2)),
          note: "Тетраэдр удобно воспринимать как минимальный каркас с максимальной связностью вершин.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = √3·a²", numeric: `S = ${formatNumber(Math.sqrt(3))} × ${formatNumber(a)}² = ${formatNumber(Math.sqrt(3) * a * a)}` },
            { title: "Объём", symbolic: "V = a³ / (6√2)", numeric: `V = ${formatNumber(a)}³ / (6×${formatNumber(Math.sqrt(2))}) = ${formatNumber(a * a * a / (6 * Math.sqrt(2)))}` }
          ]
        };
      }
    },
    octahedron: {
      id: "octahedron",
      name: "Правильный октаэдр",
      description: "Восемь равносторонних треугольников образуют тело с двумя симметричными вершинами.",
      params: [
        { key: "side", label: "Ребро a", min: 1, max: 12, step: 0.1, defaultValue: 4 }
      ],
      createMesh(params) {
        const radius = params.side / Math.sqrt(2);
        const vertices = [
          new Vec3(radius, 0, 0),
          new Vec3(-radius, 0, 0),
          new Vec3(0, radius, 0),
          new Vec3(0, -radius, 0),
          new Vec3(0, 0, radius),
          new Vec3(0, 0, -radius)
        ];
        const faces = [
          [0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0],
          [0, 4, 3], [4, 1, 3], [1, 5, 3], [5, 0, 3]
        ];
        return { vertices, faces, edges: createEdgesFromFaces(faces) };
      },
      getMetrics(params) {
        const a = params.side;
        return {
          surface: 2 * Math.sqrt(3) * a * a,
          volume: Math.sqrt(2) * a * a * a / 3,
          note: "Октаэдр удобно трактовать как две одинаковые пирамиды с общим основанием.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = 2√3·a²", numeric: `S = 2×${formatNumber(Math.sqrt(3))}×${formatNumber(a)}² = ${formatNumber(2 * Math.sqrt(3) * a * a)}` },
            { title: "Объём", symbolic: "V = (√2/3)·a³", numeric: `V = (${formatNumber(Math.sqrt(2))}/3) × ${formatNumber(a)}³ = ${formatNumber(Math.sqrt(2) * a * a * a / 3)}` }
          ]
        };
      }
    },
    hexagonalPrism: {
      id: "hexagonalPrism",
      name: "Правильная шестиугольная призма",
      description: "Призма с правильным шестиугольником в основании и шестью прямоугольными боковыми гранями.",
      params: [
        { key: "side", label: "Сторона основания a", min: 1, max: 10, step: 0.1, defaultValue: 3 },
        { key: "height", label: "Высота h", min: 1, max: 14, step: 0.1, defaultValue: 8 }
      ],
      createMesh(params) {
        const r = params.side;
        const half = params.height / 2;
        const bottom = [];
        const top = [];

        for (let index = 0; index < 6; index += 1) {
          const angle = (Math.PI / 3) * index;
          const x = Math.cos(angle) * r;
          const z = Math.sin(angle) * r;
          bottom.push(new Vec3(x, -half, z));
          top.push(new Vec3(x, half, z));
        }

        const vertices = bottom.concat(top);
        const faces = [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11]];

        for (let index = 0; index < 6; index += 1) {
          const next = (index + 1) % 6;
          faces.push([index, next, next + 6, index + 6]);
        }

        return { vertices, faces, edges: createEdgesFromFaces(faces) };
      },
      getMetrics(params) {
        const a = params.side;
        const h = params.height;
        const baseArea = 3 * Math.sqrt(3) * a * a / 2;
        return {
          surface: 2 * baseArea + 6 * a * h,
          volume: baseArea * h,
          note: "Шестиугольник в основании хорошо показывает переход от планиметрии к стереометрии.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = 3√3·a² + 6ah", numeric: `S = 3×${formatNumber(Math.sqrt(3))}×${formatNumber(a)}² + 6×${formatNumber(a)}×${formatNumber(h)} = ${formatNumber(2 * baseArea + 6 * a * h)}` },
            { title: "Объём", symbolic: "V = (3√3/2·a²)·h", numeric: `V = (${formatNumber(3 * Math.sqrt(3) / 2)}×${formatNumber(a)}²) × ${formatNumber(h)} = ${formatNumber(baseArea * h)}` }
          ]
        };
      }
    },
    icosahedron: {
      id: "icosahedron",
      name: "Правильный икосаэдр",
      description: "Платоново тело с двадцатью равносторонними треугольными гранями.",
      params: [
        { key: "side", label: "Ребро a", min: 1, max: 10, step: 0.1, defaultValue: 3.5 }
      ],
      createMesh(params) {
        return createIcosahedronMesh(params.side);
      },
      getMetrics(params) {
        const a = params.side;
        return {
          surface: 5 * Math.sqrt(3) * a * a,
          volume: (5 * (3 + Math.sqrt(5)) * a * a * a) / 12,
          note: "Икосаэдр продолжает ряд правильных тел с треугольными гранями: тетраэдр → октаэдр → икосаэдр.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = 5√3·a²", numeric: `S = 5×${formatNumber(Math.sqrt(3))}×${formatNumber(a)}² = ${formatNumber(5 * Math.sqrt(3) * a * a)}` },
            { title: "Объём", symbolic: "V = 5(3 + √5)a³ / 12", numeric: `V = 5(3 + ${formatNumber(Math.sqrt(5))})×${formatNumber(a)}³ / 12 = ${formatNumber((5 * (3 + Math.sqrt(5)) * a * a * a) / 12)}` }
          ]
        };
      }
    },
    dodecahedron: {
      id: "dodecahedron",
      name: "Правильный додекаэдр",
      description: "Платоново тело с двенадцатью правильными пятиугольными гранями, дуальное икосаэдру.",
      params: [
        { key: "side", label: "Ребро a", min: 1, max: 8, step: 0.1, defaultValue: 2.5 }
      ],
      createMesh(params) {
        return createDodecahedronMesh(params.side);
      },
      getMetrics(params) {
        const a = params.side;
        return {
          surface: 3 * Math.sqrt(25 + 10 * Math.sqrt(5)) * a * a,
          volume: ((15 + 7 * Math.sqrt(5)) * a * a * a) / 4,
          note: "Додекаэдр завершает тему Платоновых тел и визуально контрастирует с икосаэдром.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = 3√(25 + 10√5)·a²", numeric: `S = 3×√(25 + 10×${formatNumber(Math.sqrt(5))})×${formatNumber(a)}² = ${formatNumber(3 * Math.sqrt(25 + 10 * Math.sqrt(5)) * a * a)}` },
            { title: "Объём", symbolic: "V = (15 + 7√5)a³ / 4", numeric: `V = (15 + 7×${formatNumber(Math.sqrt(5))})×${formatNumber(a)}³ / 4 = ${formatNumber(((15 + 7 * Math.sqrt(5)) * a * a * a) / 4)}` }
          ]
        };
      }
    },
    cylinder: {
      id: "cylinder",
      name: "Цилиндр",
      description: "Базовое тело вращения, связывающее многоугольные призмы и гладкие поверхности.",
      params: [
        { key: "radius", label: "Радиус r", min: 1, max: 10, step: 0.1, defaultValue: 3 },
        { key: "height", label: "Высота h", min: 1, max: 14, step: 0.1, defaultValue: 7 }
      ],
      createMesh(params) {
        return createCylinderMesh(params.radius, params.height);
      },
      getMetrics(params) {
        const r = params.radius;
        const h = params.height;
        return {
          surface: 2 * Math.PI * r * (r + h),
          volume: Math.PI * r * r * h,
          note: "Цилиндр удобно использовать как переход от многогранников к телам вращения.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = 2πr(r + h)", numeric: `S = 2π×${formatNumber(r)}×(${formatNumber(r)} + ${formatNumber(h)}) = ${formatNumber(2 * Math.PI * r * (r + h))}` },
            { title: "Объём", symbolic: "V = πr²h", numeric: `V = π×${formatNumber(r)}²×${formatNumber(h)} = ${formatNumber(Math.PI * r * r * h)}` },
            { title: "Боковая поверхность", symbolic: "Sбок = 2πrh", numeric: `Sбок = 2π×${formatNumber(r)}×${formatNumber(h)} = ${formatNumber(2 * Math.PI * r * h)}` }
          ]
        };
      }
    },
    cone: {
      id: "cone",
      name: "Конус",
      description: "Ключевое тело вращения с круглым основанием и одной вершиной.",
      params: [
        { key: "radius", label: "Радиус r", min: 1, max: 10, step: 0.1, defaultValue: 3 },
        { key: "height", label: "Высота h", min: 1, max: 14, step: 0.1, defaultValue: 6 }
      ],
      createMesh(params) {
        return createConeMesh(params.radius, params.height);
      },
      getMetrics(params) {
        const r = params.radius;
        const h = params.height;
        const l = Math.sqrt(r * r + h * h);
        return {
          surface: Math.PI * r * (r + l),
          volume: (Math.PI * r * r * h) / 3,
          note: "Конус помогает перейти к теме сечений тел вращения и к коническим кривым.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = πr(r + l), l = √(r² + h²)", numeric: `S = π×${formatNumber(r)}×(${formatNumber(r)} + ${formatNumber(l)}) = ${formatNumber(Math.PI * r * (r + l))}` },
            { title: "Объём", symbolic: "V = πr²h / 3", numeric: `V = π×${formatNumber(r)}²×${formatNumber(h)} / 3 = ${formatNumber((Math.PI * r * r * h) / 3)}` },
            { title: "Боковая поверхность", symbolic: "Sбок = πrl", numeric: `Sбок = π×${formatNumber(r)}×${formatNumber(l)} = ${formatNumber(Math.PI * r * l)}` }
          ]
        };
      }
    },
    sphere: {
      id: "sphere",
      name: "Сфера",
      description: "Гладкое тело вращения, у которого формула площади принципиально отличается от многогранников.",
      params: [
        { key: "radius", label: "Радиус r", min: 1, max: 10, step: 0.1, defaultValue: 4 }
      ],
      createMesh(params) {
        return createSphereMesh(params.radius);
      },
      getMetrics(params) {
        const r = params.radius;
        return {
          surface: 4 * Math.PI * r * r,
          volume: (4 * Math.PI * r * r * r) / 3,
          note: "Сфера важна для тем вписанных и описанных тел, а также пространственной симметрии.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = 4πr²", numeric: `S = 4π×${formatNumber(r)}² = ${formatNumber(4 * Math.PI * r * r)}` },
            { title: "Объём", symbolic: "V = 4πr³ / 3", numeric: `V = 4π×${formatNumber(r)}³ / 3 = ${formatNumber((4 * Math.PI * r * r * r) / 3)}` }
          ]
        };
      }
    },
    frustum: {
      id: "frustum",
      name: "Усечённый конус",
      description: "Тело вращения с двумя круговыми основаниями разного радиуса.",
      params: [
        { key: "bottomRadius", label: "Нижний радиус R", min: 1, max: 10, step: 0.1, defaultValue: 4 },
        { key: "topRadius", label: "Верхний радиус r", min: 0.5, max: 9, step: 0.1, defaultValue: 2 },
        { key: "height", label: "Высота h", min: 1, max: 14, step: 0.1, defaultValue: 5 }
      ],
      createMesh(params) {
        return createFrustumMesh(params.bottomRadius, params.topRadius, params.height);
      },
      getMetrics(params) {
        const R = Math.max(params.bottomRadius, params.topRadius);
        const r = Math.min(params.bottomRadius, params.topRadius);
        const h = params.height;
        const l = Math.sqrt((R - r) * (R - r) + h * h);
        return {
          surface: Math.PI * (R * R + r * r + (R + r) * l),
          volume: (Math.PI * h * (R * R + R * r + r * r)) / 3,
          note: "Усечённый конус полезен для задач на сечения и для прикладной геометрии.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S = π(R² + r² + (R + r)l)", numeric: `S = π(${formatNumber(R)}² + ${formatNumber(r)}² + (${formatNumber(R)} + ${formatNumber(r)})×${formatNumber(l)}) = ${formatNumber(Math.PI * (R * R + r * r + (R + r) * l))}` },
            { title: "Объём", symbolic: "V = πh(R² + Rr + r²) / 3", numeric: `V = π×${formatNumber(h)}×(${formatNumber(R)}² + ${formatNumber(R)}×${formatNumber(r)} + ${formatNumber(r)}²) / 3 = ${formatNumber((Math.PI * h * (R * R + R * r + r * r)) / 3)}` },
            { title: "Боковая поверхность", symbolic: "Sбок = π(R + r)l", numeric: `Sбок = π×(${formatNumber(R)} + ${formatNumber(r)})×${formatNumber(l)} = ${formatNumber(Math.PI * (R + r) * l)}` }
          ]
        };
      }
    },
    obliquePrism: {
      id: "obliquePrism",
      name: "Наклонная призма",
      description: "Призма с параллельными основаниями и наклонными боковыми рёбрами.",
      params: [
        { key: "width", label: "Ширина a", min: 1, max: 10, step: 0.1, defaultValue: 4 },
        { key: "depth", label: "Глубина b", min: 1, max: 10, step: 0.1, defaultValue: 3 },
        { key: "height", label: "Высота h", min: 1, max: 12, step: 0.1, defaultValue: 6 },
        { key: "shift", label: "Сдвиг s", min: -4, max: 4, step: 0.1, defaultValue: 2 }
      ],
      createMesh(params) {
        return createObliquePrismMesh(params.width, params.height, params.depth, params.shift, params.shift * 0.35);
      },
      getMetrics(params) {
        const mesh = createObliquePrismMesh(params.width, params.height, params.depth, params.shift, params.shift * 0.35);
        const metrics = convexMeshMetrics(mesh);
        const baseArea = params.width * params.depth;
        return {
          surface: metrics.surface,
          volume: baseArea * params.height,
          note: "Наклонная призма показывает, что формула объёма V = Sосн·h работает и вне прямого случая.",
          formulas: [
            { title: "Объём", symbolic: "V = Sосн·h = ab·h", numeric: `V = ${formatNumber(params.width)}×${formatNumber(params.depth)}×${formatNumber(params.height)} = ${formatNumber(baseArea * params.height)}` },
            { title: "Площадь поверхности", symbolic: "S вычисляется как сумма площадей граней модели", numeric: `S ≈ ${formatNumber(metrics.surface)}` }
          ]
        };
      }
    },
    obliquePyramid: {
      id: "obliquePyramid",
      name: "Наклонная пирамида",
      description: "Пирамида со смещённой вершиной, сохраняющая общий закон объёма.",
      params: [
        { key: "width", label: "Ширина основания a", min: 1, max: 10, step: 0.1, defaultValue: 5 },
        { key: "depth", label: "Глубина основания b", min: 1, max: 10, step: 0.1, defaultValue: 4 },
        { key: "height", label: "Высота h", min: 1, max: 12, step: 0.1, defaultValue: 6 },
        { key: "shift", label: "Смещение вершины s", min: -4, max: 4, step: 0.1, defaultValue: 1.5 }
      ],
      createMesh(params) {
        return createObliquePyramidMesh(params.width, params.depth, params.height, params.shift, -params.shift * 0.4);
      },
      getMetrics(params) {
        const mesh = createObliquePyramidMesh(params.width, params.depth, params.height, params.shift, -params.shift * 0.4);
        const metrics = convexMeshMetrics(mesh);
        const baseArea = params.width * params.depth;
        return {
          surface: metrics.surface,
          volume: (baseArea * params.height) / 3,
          note: "Даже при смещённой вершине объём пирамиды остаётся равным одной трети произведения площади основания на высоту.",
          formulas: [
            { title: "Объём", symbolic: "V = Sосн·h / 3 = ab·h / 3", numeric: `V = ${formatNumber(params.width)}×${formatNumber(params.depth)}×${formatNumber(params.height)} / 3 = ${formatNumber((baseArea * params.height) / 3)}` },
            { title: "Площадь поверхности", symbolic: "S вычисляется как сумма основания и боковых треугольников", numeric: `S ≈ ${formatNumber(metrics.surface)}` }
          ]
        };
      }
    },
    antiprism: {
      id: "antiprism",
      name: "Полуправильная антипризма",
      description: "Антипризма с двумя параллельными основаниями и чередующимися треугольными боковыми гранями.",
      params: [
        { key: "side", label: "Сторона основания a", min: 1, max: 8, step: 0.1, defaultValue: 2.4 },
        { key: "height", label: "Высота h", min: 1, max: 10, step: 0.1, defaultValue: 4.2 }
      ],
      createMesh(params) {
        return createAntiprismMesh(params.side, params.height);
      },
      getMetrics(params) {
        const mesh = createAntiprismMesh(params.side, params.height);
        const metrics = convexMeshMetrics(mesh);
        return {
          surface: metrics.surface,
          volume: metrics.volume,
          note: "Антипризма служит мостом между привычными призмами и более сложными многогранниками.",
          formulas: [
            { title: "Площадь поверхности", symbolic: "S вычисляется по сумме оснований и боковых треугольников", numeric: `S ≈ ${formatNumber(metrics.surface)}` },
            { title: "Объём", symbolic: "V вычисляется численно по координатам выпуклой модели", numeric: `V ≈ ${formatNumber(metrics.volume)}` }
          ]
        };
      }
    }
  };

  function sampleCartesian(xMin, xMax, steps, fn, maxJump = 8) {
    const segments = [];
    let current = [];

    for (let index = 0; index <= steps; index += 1) {
      const x = xMin + ((xMax - xMin) * index) / steps;
      const y = fn(x);

      if (!Number.isFinite(y)) {
        if (current.length > 1) {
          segments.push(current);
        }
        current = [];
        continue;
      }

      if (current.length > 0 && Math.abs(y - current[current.length - 1].y) > maxJump) {
        if (current.length > 1) {
          segments.push(current);
        }
        current = [];
      }

      current.push({ x, y });
    }

    if (current.length > 1) {
      segments.push(current);
    }

    return segments;
  }

  function sampleParametric(tMin, tMax, steps, fn) {
    const segments = [];
    let segment = [];
    for (let index = 0; index <= steps; index += 1) {
      const t = tMin + ((tMax - tMin) * index) / steps;
      const point = fn(t);
      if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
        if (segment.length > 0) {
          const previous = segment[segment.length - 1];
          if (Math.hypot(point.x - previous.x, point.y - previous.y) > 4) {
            if (segment.length > 1) {
              segments.push(segment);
            }
            segment = [];
          }
        }
        segment.push(point);
      } else if (segment.length > 1) {
        segments.push(segment);
        segment = [];
      }
    }
    if (segment.length > 1) {
      segments.push(segment);
    }
    return segments;
  }

  function samplePolar(thetaMin, thetaMax, steps, fn) {
    const segment = [];
    for (let index = 0; index <= steps; index += 1) {
      const theta = thetaMin + ((thetaMax - thetaMin) * index) / steps;
      const r = fn(theta);
      if (Number.isFinite(r)) {
        segment.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) });
      }
    }
    return segment.length > 1 ? [segment] : [];
  }

  function createGraph(id, name, description, params, formulas, sample, camera = { centerX: 0, centerY: 0, scale: 36 }) {
    return { id, name, description, params, formulas, sample, camera };
  }

  const graphDefinitions = {
    line: createGraph("line", "Прямая", "Линейная функция показывает постоянный темп изменения.", [{ key: "k", label: "Наклон k", min: -4, max: 4, step: 0.1, defaultValue: 1 }, { key: "b", label: "Сдвиг b", min: -6, max: 6, step: 0.1, defaultValue: 0 }], ["y = kx + b"], (p) => sampleCartesian(-10, 10, 420, (x) => p.k * x + p.b)),
    parabola: createGraph("parabola", "Парабола", "Квадратичная функция задаёт классическую U-образную кривую.", [{ key: "a", label: "Коэффициент a", min: -2, max: 2, step: 0.05, defaultValue: 0.5 }], ["y = ax²"], (p) => sampleCartesian(-8, 8, 420, (x) => p.a * x * x)),
    cubicParabola: createGraph("cubicParabola", "Кубическая парабола", "Кубическая функция показывает точку перегиба и смену выпуклости.", [{ key: "a", label: "Коэффициент a", min: -1.5, max: 1.5, step: 0.05, defaultValue: 0.18 }], ["y = ax³"], (p) => sampleCartesian(-8, 8, 420, (x) => p.a * x * x * x)),
    hyperbola: createGraph("hyperbola", "Гипербола", "График обратной пропорциональности с двумя ветвями и асимптотами.", [{ key: "a", label: "Параметр a", min: -8, max: 8, step: 0.1, defaultValue: 4 }], ["y = a / x"], (p) => sampleCartesian(-10, 10, 800, (x) => Math.abs(x) < 0.08 ? NaN : p.a / x), 14),
    semicubicalParabola: createGraph("semicubicalParabola", "Полукубическая парабола", "Кривая Нейла имеет острую вершину и удобна для исторических сюжетов.", [{ key: "a", label: "Параметр a", min: 0.5, max: 3, step: 0.05, defaultValue: 1.1 }], ["x = at², y = at³"], (p) => sampleParametric(-4, 4, 500, (t) => ({ x: p.a * t * t, y: p.a * t * t * t })), { centerX: 2, centerY: 0, scale: 30 }),
    agnesi: createGraph("agnesi", "Локон Аньези", "Гладкая рациональная кривая с характерным колоколом.", [{ key: "a", label: "Параметр a", min: 1, max: 6, step: 0.1, defaultValue: 3 }], ["y = a³ / (x² + a²)"], (p) => sampleCartesian(-12, 12, 500, (x) => (p.a ** 3) / (x * x + p.a * p.a))),
    descartesFolium: createGraph("descartesFolium", "Декартов лист", "Алгебраическая кривая с петлёй и асимптотическим хвостом.", [{ key: "a", label: "Параметр a", min: 1, max: 5, step: 0.1, defaultValue: 2.4 }], ["x = 3at / (1 + t³), y = 3at² / (1 + t³)"], (p) => sampleParametric(-6, 6, 1000, (t) => Math.abs(1 + t ** 3) < 1e-3 ? { x: NaN, y: NaN } : ({ x: (3 * p.a * t) / (1 + t ** 3), y: (3 * p.a * t * t) / (1 + t ** 3) }))),
    dioclesCissoid: createGraph("dioclesCissoid", "Циссоида Диокла", "Кривая, исторически связанная с задачами удвоения куба.", [{ key: "a", label: "Параметр a", min: 1, max: 5, step: 0.1, defaultValue: 2.2 }], ["x = 2at² / (1 + t²), y = 2at³ / (1 + t²)"], (p) => sampleParametric(-6, 6, 800, (t) => ({ x: (2 * p.a * t * t) / (1 + t * t), y: (2 * p.a * t * t * t) / (1 + t * t) })), { centerX: 2, centerY: 0, scale: 32 }),
    strophoid: createGraph("strophoid", "Строфоида", "Рациональная кривая с петлёй и асимптотическим поведением.", [{ key: "a", label: "Параметр a", min: 1, max: 5, step: 0.1, defaultValue: 2.5 }], ["x = a(1 - t²) / (1 + t²), y = at(1 - t²) / (1 + t²)"], (p) => sampleParametric(-6, 6, 1000, (t) => ({ x: (p.a * (1 - t * t)) / (1 + t * t), y: (p.a * t * (1 - t * t)) / (1 + t * t) }))),
    bernoulliLemniscate: createGraph("bernoulliLemniscate", "Лемниската Бернулли", "Классическая восьмёрка, задаваемая полярным уравнением.", [{ key: "a", label: "Параметр a", min: 1, max: 6, step: 0.1, defaultValue: 3 }], ["r² = a² cos 2θ"], (p) => {
      const segments = [];
      const ranges = [[-Math.PI / 4, Math.PI / 4], [3 * Math.PI / 4, 5 * Math.PI / 4]];
      ranges.forEach(([start, end]) => {
        segments.push(...samplePolar(start, end, 320, (theta) => p.a * Math.sqrt(Math.max(0, Math.cos(2 * theta)))));
      });
      return segments;
    }),
    pascalLimacon: createGraph("pascalLimacon", "Улитка Паскаля", "Полярная кривая, зависящая от суммы постоянного и гармонического радиуса.", [{ key: "a", label: "Параметр a", min: 0.5, max: 6, step: 0.1, defaultValue: 2 }, { key: "b", label: "Параметр b", min: 0.5, max: 6, step: 0.1, defaultValue: 3 }], ["r = a + b cos θ"], (p) => samplePolar(0, Math.PI * 2, 720, (theta) => p.a + p.b * Math.cos(theta))),
    cardioid: createGraph("cardioid", "Кардиоида", "Частный случай улитки Паскаля с одной острой точкой.", [{ key: "a", label: "Параметр a", min: 0.5, max: 6, step: 0.1, defaultValue: 3 }], ["r = a(1 + cos θ)"], (p) => samplePolar(0, Math.PI * 2, 720, (theta) => p.a * (1 + Math.cos(theta)))),
    astroid: createGraph("astroid", "Астроида", "Гипоциклоида с четырьмя каспами и красивой параметризацией.", [{ key: "a", label: "Параметр a", min: 1, max: 6, step: 0.1, defaultValue: 3 }], ["x = a cos³ t, y = a sin³ t"], (p) => sampleParametric(0, Math.PI * 2, 720, (t) => ({ x: p.a * Math.cos(t) ** 3, y: p.a * Math.sin(t) ** 3 }))),
    nephroid: createGraph("nephroid", "Нефроида", "Эпициклоида с двумя крупными лепестками.", [{ key: "a", label: "Параметр a", min: 0.3, max: 2, step: 0.05, defaultValue: 0.8 }], ["x = a(3 cos t - cos 3t), y = a(3 sin t - sin 3t)"], (p) => sampleParametric(0, Math.PI * 2, 720, (t) => ({ x: p.a * (3 * Math.cos(t) - Math.cos(3 * t)), y: p.a * (3 * Math.sin(t) - Math.sin(3 * t)) }))),
    deltoid: createGraph("deltoid", "Дельтоида", "Кривая Штейнера с тремя каспами.", [{ key: "a", label: "Параметр a", min: 0.5, max: 4, step: 0.1, defaultValue: 1.2 }], ["x = 2a cos t + a cos 2t, y = 2a sin t - a sin 2t"], (p) => sampleParametric(0, Math.PI * 2, 720, (t) => ({ x: 2 * p.a * Math.cos(t) + p.a * Math.cos(2 * t), y: 2 * p.a * Math.sin(t) - p.a * Math.sin(2 * t) }))),
    cassini: createGraph("cassini", "Овалы Кассини", "Семейство кривых с двумя фокусами и меняющейся топологией.", [{ key: "a", label: "Половина расстояния между фокусами a", min: 0.5, max: 4, step: 0.1, defaultValue: 2 }, { key: "b", label: "Параметр b", min: 0.5, max: 5, step: 0.1, defaultValue: 2.4 }], ["(x² + y²)² - 2a²(x² - y²) = b⁴ - a⁴"], (p) => {
      const segments = [];
      const roots = [1, -1];
      roots.forEach((sign) => {
        const segment = [];
        for (let i = 0; i <= 720; i += 1) {
          const theta = (Math.PI * 2 * i) / 720;
          const disc = p.b ** 4 - p.a ** 4 * Math.sin(2 * theta) ** 2;
          if (disc < 0) {
            if (segment.length > 1) {
              segments.push(segment.splice(0));
            }
            continue;
          }
          const rSquared = p.a ** 2 * Math.cos(2 * theta) + sign * Math.sqrt(disc);
          if (rSquared <= 0) {
            if (segment.length > 1) {
              segments.push(segment.splice(0));
            }
            continue;
          }
          const r = Math.sqrt(rSquared);
          segment.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) });
        }
        if (segment.length > 1) {
          segments.push(segment);
        }
      });
      return segments;
    }),
    conchoid: createGraph("conchoid", "Конхоида Никомеда", "Кривая, где расстояние до заданной прямой сохраняет добавку b.", [{ key: "a", label: "Параметр a", min: 1, max: 6, step: 0.1, defaultValue: 2.5 }, { key: "b", label: "Параметр b", min: 0.5, max: 5, step: 0.1, defaultValue: 2 }], ["x = a + b / cos t, y = b tan t"], (p) => sampleParametric(-1.2, 1.2, 720, (t) => ({ x: p.a + p.b / Math.cos(t), y: p.b * Math.tan(t) })), { centerX: 3, centerY: 0, scale: 24 }),
    kappa: createGraph("kappa", "Каппа", "Алгебраическая кривая с двумя ветвями и вертикальной границей области.", [{ key: "a", label: "Параметр a", min: 1, max: 6, step: 0.1, defaultValue: 3 }], ["x²(x² + y²) = a²y²"], (p) => {
      const upper = sampleCartesian(-p.a + 0.05, p.a - 0.05, 500, (x) => (x * x) / Math.sqrt(p.a * p.a - x * x));
      const lower = sampleCartesian(-p.a + 0.05, p.a - 0.05, 500, (x) => -(x * x) / Math.sqrt(p.a * p.a - x * x));
      return upper.concat(lower);
    }),
    sine: createGraph("sine", "Синусоида", "Периодическая волна, задающая колебательные процессы.", [{ key: "a", label: "Амплитуда a", min: 0.5, max: 5, step: 0.1, defaultValue: 2 }, { key: "w", label: "Частота ω", min: 0.5, max: 4, step: 0.1, defaultValue: 1 }], ["y = a sin(ωx)"], (p) => sampleCartesian(-12, 12, 900, (x) => p.a * Math.sin(p.w * x))),
    cosine: createGraph("cosine", "Косинусоида", "Классическая гармоника, сдвинутая относительно синуса.", [{ key: "a", label: "Амплитуда a", min: 0.5, max: 5, step: 0.1, defaultValue: 2 }, { key: "w", label: "Частота ω", min: 0.5, max: 4, step: 0.1, defaultValue: 1 }], ["y = a cos(ωx)"], (p) => sampleCartesian(-12, 12, 900, (x) => p.a * Math.cos(p.w * x))),
    tangent: createGraph("tangent", "Тангенсоида", "Периодическая функция с вертикальными асимптотами.", [{ key: "a", label: "Масштаб a", min: 0.5, max: 4, step: 0.1, defaultValue: 1 }, { key: "w", label: "Частота ω", min: 0.5, max: 3, step: 0.1, defaultValue: 1 }], ["y = a tan(ωx)"], (p) => sampleCartesian(-6, 6, 1800, (x) => p.a * Math.tan(p.w * x), 3)),
    cotangent: createGraph("cotangent", "Котангенсоида", "Дополнительная к тангенсу периодическая функция.", [{ key: "a", label: "Масштаб a", min: 0.5, max: 4, step: 0.1, defaultValue: 1 }, { key: "w", label: "Частота ω", min: 0.5, max: 3, step: 0.1, defaultValue: 1 }], ["y = a cot(ωx)"], (p) => sampleCartesian(-6, 6, 1800, (x) => {
      const value = Math.tan(p.w * x);
      return Math.abs(value) < 1e-3 ? NaN : p.a / value;
    }, 3))
  };

  const defaultsByFigure = Object.fromEntries(
    Object.values(figureDefinitions).map((figure) => [
      figure.id,
      Object.fromEntries(figure.params.map((param) => [param.key, param.defaultValue]))
    ])
  );

  const defaultsByGraph = Object.fromEntries(
    Object.values(graphDefinitions).map((graph) => [
      graph.id,
      Object.fromEntries(graph.params.map((param) => [param.key, param.defaultValue]))
    ])
  );

  const state = {
    activeSection: "home",
    viewMode: "solid",
    projectionMode: "perspective",
    activeFigureId: "cube",
    activeGraphId: "line",
    figureParams: JSON.parse(JSON.stringify(defaultsByFigure)),
    graphParams: JSON.parse(JSON.stringify(defaultsByGraph)),
    highlight: {
      faces: true,
      edges: true,
      vertices: false
    },
    section: {
      enabled: false,
      offset: 0,
      tiltX: 0,
      tiltZ: 0
    },
    showFormulaValues: true,
    presetLabel: "Базовый режим просмотра",
    camera: {
      yaw: 0.85,
      pitch: 0.5,
      distance: 18
    },
    graphCamera: {
      centerX: 0,
      centerY: 0,
      scale: 34
    },
    pointer: {
      active: false,
      x: 0,
      y: 0,
      dragMode: "rotate"
    }
  };

  const dom = {
    sections: Array.from(document.querySelectorAll("[data-section]")),
    navLinks: Array.from(document.querySelectorAll("[data-nav-link]")),
    courseCards: document.getElementById("course-cards"),
    theoryCards: document.getElementById("theory-cards"),
    viewModeSelect: document.getElementById("view-mode-select"),
    projectionSelect: document.getElementById("projection-select"),
    solidField: document.getElementById("solid-field"),
    graphField: document.getElementById("graph-field"),
    highlightGroup: document.getElementById("highlight-group"),
    sectionGroup: document.getElementById("section-group"),
    sectionControls: document.getElementById("section-controls"),
    toggleSection: document.getElementById("toggle-section"),
    sectionOffset: document.getElementById("section-offset"),
    sectionOffsetValue: document.getElementById("section-offset-value"),
    sectionTiltX: document.getElementById("section-tilt-x"),
    sectionTiltXValue: document.getElementById("section-tilt-x-value"),
    sectionTiltZ: document.getElementById("section-tilt-z"),
    sectionTiltZValue: document.getElementById("section-tilt-z-value"),
    figureSelect: document.getElementById("figure-select"),
    graphSelect: document.getElementById("graph-select"),
    toolbarLabel: document.getElementById("toolbar-label"),
    sceneControlTitle: document.getElementById("scene-control-title"),
    figureTitle: document.getElementById("figure-title"),
    figureDescription: document.getElementById("figure-description"),
    paramsGrid: document.getElementById("params-grid"),
    metricPrimaryLabel: document.getElementById("metric-primary-label"),
    metricSecondaryLabel: document.getElementById("metric-secondary-label"),
    metricSurface: document.getElementById("metric-surface"),
    metricVolume: document.getElementById("metric-volume"),
    metricSectionWrap: document.getElementById("metric-section-wrap"),
    metricSection: document.getElementById("metric-section"),
    metricNote: document.getElementById("metric-note"),
    formulaPanel: document.getElementById("formula-panel"),
    presetLabel: document.getElementById("preset-label"),
    toggleFaces: document.getElementById("toggle-faces"),
    toggleEdges: document.getElementById("toggle-edges"),
    toggleVertices: document.getElementById("toggle-vertices"),
    toggleFormulaValues: document.getElementById("toggle-formula-values"),
    canvasFrame: document.getElementById("canvas-frame"),
    canvas: document.getElementById("scene-canvas")
  };

  const ctx = dom.canvas.getContext("2d");

  function getActiveFigure() {
    return figureDefinitions[state.activeFigureId];
  }

  function getActiveGraph() {
    return graphDefinitions[state.activeGraphId];
  }

  function getActiveParams() {
    return state.figureParams[state.activeFigureId];
  }

  function getActiveGraphParams() {
    return state.graphParams[state.activeGraphId];
  }

  function setSection(sectionId) {
    state.activeSection = sectionId;

    dom.sections.forEach((section) => {
      const isActive = section.dataset.section === sectionId;
      section.hidden = !isActive;
      section.classList.toggle("is-active", isActive);
    });

    dom.navLinks.forEach((link) => {
      if (link.dataset.navLink === sectionId) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    const activeSection = dom.sections.find((section) => section.dataset.section === sectionId);
    if (activeSection) {
      activeSection.focus({ preventScroll: true });
    }
  }

  function syncRoute() {
    const requested = window.location.hash.replace("#", "") || "home";
    const valid = dom.sections.some((section) => section.dataset.section === requested);
    setSection(valid ? requested : "home");
  }

  function renderTopicCard(topic, index, mode) {
    const card = document.createElement("article");
    card.className = "topic-card";
    const stepLabel = mode === "course" ? `Шаг ${String(index + 1).padStart(2, "0")}` : topic.group;

    card.innerHTML = `
      <div class="topic-card__meta">
        <span class="topic-tag">${stepLabel}</span>
        <span class="topic-tag">${topic.group}</span>
      </div>
      <div><h3>${topic.title}</h3></div>
      <div class="topic-blocks">
        <div class="topic-block"><strong>Теория</strong><p>${topic.theory}</p></div>
        <div class="topic-block"><strong>Формулы</strong><p>${topic.formulas}</p></div>
        <div class="topic-block"><strong>Визуализация</strong><p>${topic.visualization}</p></div>
        <div class="topic-block"><strong>Примеры</strong><p>${topic.examples}</p></div>
      </div>
      <button class="topic-button" type="button">Показать в сцене</button>
    `;

    card.querySelector(".topic-button").addEventListener("click", () => {
      applyPreset(topic.preset);
      window.location.hash = "scene";
    });

    return card;
  }

  function renderTopics() {
    topics.forEach((topic, index) => {
      dom.courseCards.appendChild(renderTopicCard(topic, index, "course"));
      dom.theoryCards.appendChild(renderTopicCard(topic, index, "theory"));
    });
  }

  function populateFigureSelect() {
    Object.values(figureDefinitions).forEach((figure) => {
      const option = document.createElement("option");
      option.value = figure.id;
      option.textContent = figure.name;
      dom.figureSelect.appendChild(option);
    });
    dom.figureSelect.value = state.activeFigureId;
  }

  function populateGraphSelect() {
    Object.values(graphDefinitions).forEach((graph) => {
      const option = document.createElement("option");
      option.value = graph.id;
      option.textContent = graph.name;
      dom.graphSelect.appendChild(option);
    });
    dom.graphSelect.value = state.activeGraphId;
  }

  function renderParams() {
    const active = state.viewMode === "solid" ? getActiveFigure() : getActiveGraph();
    const params = state.viewMode === "solid" ? getActiveParams() : getActiveGraphParams();
    dom.paramsGrid.innerHTML = "";

    active.params.forEach((param) => {
      const value = params[param.key];
      const wrapper = document.createElement("div");
      wrapper.className = "param-control";
      wrapper.innerHTML = `
        <label for="param-${param.key}">
          <span>${param.label}</span>
          <strong>${formatNumber(value)}</strong>
        </label>
        <input id="param-${param.key}" type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${value}">
      `;

      const input = wrapper.querySelector("input");
      const output = wrapper.querySelector("strong");

      input.addEventListener("input", (event) => {
        params[param.key] = Number(event.target.value);
        output.textContent = formatNumber(params[param.key]);
        updateInfoPanels();
      });

      dom.paramsGrid.appendChild(wrapper);
    });
  }

  function renderFormulaPanel(formulas) {
    dom.formulaPanel.innerHTML = "";
    formulas.forEach((formula) => {
      const block = document.createElement("article");
      block.className = "formula-card";
      block.innerHTML = `
        <h4>${formula.title}</h4>
        <p>${formula.symbolic}</p>
        ${state.showFormulaValues ? `<small>${formula.numeric}</small>` : ""}
      `;
      dom.formulaPanel.appendChild(block);
    });
  }

  function updateInfoPanels() {
    if (state.viewMode === "solid") {
      const figure = getActiveFigure();
      const metrics = figure.getMetrics(getActiveParams());
      const section = state.section.enabled ? computeSectionGeometry(figure.createMesh(getActiveParams()), getSectionPlane()) : null;
      dom.toolbarLabel.textContent = "Активное тело";
      dom.figureTitle.textContent = figure.name;
      dom.figureDescription.textContent = figure.description;
      dom.metricPrimaryLabel.textContent = "Площадь поверхности S";
      dom.metricSecondaryLabel.textContent = "Объём V";
      dom.metricSurface.textContent = formatNumber(metrics.surface);
      dom.metricVolume.textContent = formatNumber(metrics.volume);
      dom.metricSectionWrap.classList.toggle("is-hidden", !section);
      dom.metricSection.textContent = section ? formatNumber(section.area) : "0";
      dom.metricNote.textContent = section
        ? `${metrics.note} Площадь активного сечения обновляется по положению секущей плоскости.`
        : metrics.note;
      renderFormulaPanel(metrics.formulas);
      return;
    }

    const graph = getActiveGraph();
    const params = getActiveGraphParams();
    const { width, height } = getViewportSize();
    dom.toolbarLabel.textContent = "Активный график";
    const formulas = graph.formulas.map((formula, index) => ({
      title: index === 0 ? "Уравнение" : `Форма ${index + 1}`,
      symbolic: formula,
      numeric: Object.keys(params).length > 0
        ? `Параметры: ${Object.entries(params).map(([key, value]) => `${key} = ${formatNumber(value)}`).join(", ")}`
        : "Без дополнительных параметров"
    }));

    const xMin = state.graphCamera.centerX - width / (2 * state.graphCamera.scale);
    const xMax = state.graphCamera.centerX + width / (2 * state.graphCamera.scale);
    const yMin = state.graphCamera.centerY - height / (2 * state.graphCamera.scale);
    const yMax = state.graphCamera.centerY + height / (2 * state.graphCamera.scale);

    dom.figureTitle.textContent = graph.name;
    dom.figureDescription.textContent = graph.description;
    dom.metricPrimaryLabel.textContent = "Диапазон X";
    dom.metricSecondaryLabel.textContent = "Диапазон Y";
    dom.metricSurface.textContent = `${formatNumber(xMin)} … ${formatNumber(xMax)}`;
    dom.metricVolume.textContent = `${formatNumber(yMin)} … ${formatNumber(yMax)}`;
    dom.metricSectionWrap.classList.add("is-hidden");
    dom.metricNote.textContent = "В 2D-режиме можно перетаскивать плоскость и масштабировать её колесом.";
    renderFormulaPanel(formulas);
  }

  function updateFigureUI() {
    dom.viewModeSelect.value = state.viewMode;
    dom.projectionSelect.value = state.projectionMode;
    dom.figureSelect.value = state.activeFigureId;
    dom.graphSelect.value = state.activeGraphId;
    dom.sceneControlTitle.textContent = state.viewMode === "solid" ? "Управление телом" : "Управление графиком";
    dom.solidField.classList.toggle("is-hidden", state.viewMode !== "solid");
    dom.graphField.classList.toggle("is-hidden", state.viewMode !== "graph");
    dom.highlightGroup.classList.toggle("is-hidden", state.viewMode !== "solid");
    dom.sectionGroup.classList.toggle("is-hidden", state.viewMode !== "solid");
    dom.sectionControls.classList.toggle("is-hidden", state.viewMode !== "solid" || !state.section.enabled);
    dom.toggleSection.checked = state.section.enabled;
    dom.sectionOffset.value = state.section.offset;
    dom.sectionTiltX.value = state.section.tiltX;
    dom.sectionTiltZ.value = state.section.tiltZ;
    dom.sectionOffsetValue.textContent = formatNumber(state.section.offset);
    dom.sectionTiltXValue.textContent = `${Math.round(state.section.tiltX)}°`;
    dom.sectionTiltZValue.textContent = `${Math.round(state.section.tiltZ)}°`;
    renderParams();
    updateInfoPanels();
    dom.presetLabel.textContent = state.presetLabel;
  }

  function applyPreset(preset) {
    if (preset.mode === "graph") {
      state.viewMode = "graph";
      state.projectionMode = "graph2d";
      state.activeGraphId = preset.graphId;
      state.graphParams[preset.graphId] = {
        ...state.graphParams[preset.graphId],
        ...preset.params
      };
      const camera = graphDefinitions[preset.graphId].camera || { centerX: 0, centerY: 0, scale: 34 };
      state.graphCamera = { ...state.graphCamera, ...camera };
    } else {
      state.viewMode = "solid";
      state.projectionMode = preset.projectionMode || "perspective";
      state.activeFigureId = preset.figureId;
      state.figureParams[preset.figureId] = {
        ...state.figureParams[preset.figureId],
        ...preset.params
      };
      state.highlight = { ...state.highlight, ...preset.highlight };
      dom.toggleFaces.checked = state.highlight.faces;
      dom.toggleEdges.checked = state.highlight.edges;
      dom.toggleVertices.checked = state.highlight.vertices;
    }

    state.presetLabel = preset.note;
    updateFigureUI();
  }

  function getViewportSize() {
    const rect = dom.canvasFrame.getBoundingClientRect();
    const width = Math.max(360, Math.floor(rect.width - 32));
    const height = Math.max(280, Math.floor(width * 0.66));

    if (dom.canvas.width !== width || dom.canvas.height !== height) {
      dom.canvas.width = width;
      dom.canvas.height = height;
    }

    return { width, height };
  }

  function getCameraPosition() {
    const { yaw, pitch, distance } = state.camera;
    const cosPitch = Math.cos(pitch);

    return new Vec3(
      Math.sin(yaw) * cosPitch * distance,
      Math.sin(pitch) * distance,
      Math.cos(yaw) * cosPitch * distance
    );
  }

  function createSceneProjector(width, height) {
    const eye = getCameraPosition();
    const view = Mat4.lookAt(eye, new Vec3(0, 0, 0), new Vec3(0, 1, 0));
    const model = Mat4.multiply(Mat4.rotationY(0.25), Mat4.rotationX(-0.2));
    const projection = Mat4.perspective(Math.PI / 3.2, width / height, 0.1, 200);
    const modelView = Mat4.multiply(view, model);
    const mvp = Mat4.multiply(projection, modelView);
    const isOrtho = state.projectionMode === "graph2d" && state.viewMode === "solid";

    function world(point) {
      return model.transformVec4({ x: point.x, y: point.y, z: point.z, w: 1 });
    }

    function project(point) {
      const worldPoint = world(point);

      if (isOrtho) {
        return {
          world: worldPoint,
          screen: {
            x: width / 2 + worldPoint.x * 18,
            y: height / 2 - worldPoint.y * 18,
            z: worldPoint.z
          }
        };
      }

      const clip = mvp.transformVec4({ x: worldPoint.x, y: worldPoint.y, z: worldPoint.z, w: worldPoint.w });
      const safeW = clip.w || 1e-6;
      return {
        world: worldPoint,
        screen: {
          x: (clip.x / safeW * 0.5 + 0.5) * width,
          y: (1 - (clip.y / safeW * 0.5 + 0.5)) * height,
          z: clip.z / safeW
        }
      };
    }

    function projectList(points) {
      return points.map(project);
    }

    return {
      eye,
      project,
      projectList
    };
  }

  function projectMesh(mesh, width, height) {
    const projector = createSceneProjector(width, height);
    const mapped = projector.projectList(mesh.vertices);
    return {
      projector,
      worldVertices: mapped.map((entry) => entry.world),
      projected: mapped.map((entry) => entry.screen)
    };
  }

  function faceNormal(face, worldVertices) {
    const a = worldVertices[face[0]];
    const b = worldVertices[face[1]];
    const c = worldVertices[face[2]];
    return new Vec3(a.x, a.y, a.z)
      .sub(new Vec3(b.x, b.y, b.z))
      .cross(new Vec3(c.x, c.y, c.z).sub(new Vec3(b.x, b.y, b.z)))
      .normalize();
  }

  function getSectionPlane() {
    const tiltX = state.section.tiltX * Math.PI / 180;
    const tiltZ = state.section.tiltZ * Math.PI / 180;
    const normal = new Vec3(
      Math.sin(tiltZ),
      Math.cos(tiltZ) * Math.cos(tiltX),
      Math.sin(tiltX)
    ).normalize();
    return {
      normal,
      offset: state.section.offset
    };
  }

  function dedupePoints(points, epsilon = 1e-4) {
    return points.filter((point, index) => !points.slice(0, index).some((other) =>
      Math.abs(other.x - point.x) < epsilon &&
      Math.abs(other.y - point.y) < epsilon &&
      Math.abs(other.z - point.z) < epsilon
    ));
  }

  function computeSectionGeometry(mesh, plane) {
    const intersections = [];
    const epsilon = 1e-6;

    mesh.edges.forEach(([from, to]) => {
      const a = mesh.vertices[from];
      const b = mesh.vertices[to];
      const da = plane.normal.dot(a) - plane.offset;
      const db = plane.normal.dot(b) - plane.offset;

      if (Math.abs(da) < epsilon && Math.abs(db) < epsilon) {
        intersections.push(a, b);
        return;
      }

      if (Math.abs(da) < epsilon) {
        intersections.push(a);
        return;
      }

      if (Math.abs(db) < epsilon) {
        intersections.push(b);
        return;
      }

      if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
        const t = da / (da - db);
        intersections.push(a.add(b.sub(a).scale(t)));
      }
    });

    const uniquePoints = dedupePoints(intersections);
    if (uniquePoints.length < 3) {
      return null;
    }

    const center = averagePoint(uniquePoints);
    const tangentSeed = Math.abs(plane.normal.y) < 0.9 ? new Vec3(0, 1, 0) : new Vec3(1, 0, 0);
    const u = tangentSeed.cross(plane.normal).normalize();
    const v = plane.normal.cross(u).normalize();
    const sorted = uniquePoints
      .map((point) => {
        const rel = point.sub(center);
        const x = rel.dot(u);
        const y = rel.dot(v);
        return { point, x, y, angle: Math.atan2(y, x) };
      })
      .sort((left, right) => left.angle - right.angle);

    let shoelace = 0;
    let radius = 0;
    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      const next = sorted[(index + 1) % sorted.length];
      shoelace += current.x * next.y - next.x * current.y;
      radius = Math.max(radius, Math.hypot(current.x, current.y));
    }

    return {
      points: sorted.map((entry) => entry.point),
      area: Math.abs(shoelace) / 2,
      center,
      u,
      v,
      radius: radius || 1
    };
  }

  function graphWorldToScreen(point, width, height) {
    return {
      x: width / 2 + (point.x - state.graphCamera.centerX) * state.graphCamera.scale,
      y: height / 2 - (point.y - state.graphCamera.centerY) * state.graphCamera.scale
    };
  }

  function drawGraphGrid(width, height) {
    const spacing = state.graphCamera.scale;
    const offsetX = ((width / 2 - state.graphCamera.centerX * spacing) % spacing + spacing) % spacing;
    const offsetY = ((height / 2 + state.graphCamera.centerY * spacing) % spacing + spacing) % spacing;

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;

    for (let x = offsetX; x <= width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = offsetY; y <= height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const axis = graphWorldToScreen({ x: 0, y: 0 }, width, height);
    ctx.strokeStyle = "rgba(255,202,122,0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, axis.y);
    ctx.lineTo(width, axis.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(axis.x, 0);
    ctx.lineTo(axis.x, height);
    ctx.stroke();
    ctx.restore();
  }

  function drawGraph(width, height) {
    const graph = getActiveGraph();
    const params = getActiveGraphParams();
    const segments = graph.sample(params);

    ctx.clearRect(0, 0, width, height);
    drawGraphGrid(width, height);

    ctx.save();
    ctx.strokeStyle = "rgba(125, 226, 209, 0.95)";
    ctx.lineWidth = 2.6;

    segments.forEach((segment) => {
      ctx.beginPath();
      segment.forEach((point, index) => {
        const screen = graphWorldToScreen(point, width, height);
        if (index === 0) {
          ctx.moveTo(screen.x, screen.y);
        } else {
          ctx.lineTo(screen.x, screen.y);
        }
      });
      ctx.stroke();
    });

    ctx.restore();
  }

  function drawScene() {
    const { width, height } = getViewportSize();

    if (state.viewMode === "graph") {
      drawGraph(width, height);
      return;
    }

    const figure = getActiveFigure();
    const mesh = figure.createMesh(getActiveParams());
    const { projector, worldVertices, projected } = projectMesh(mesh, width, height);
    const section = state.section.enabled ? computeSectionGeometry(mesh, getSectionPlane()) : null;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(0.5, 0.5);

    const eye = getCameraPosition();
    const sortedFaces = mesh.faces
      .map((face) => {
        const avgZ = face.reduce((sum, vertexIndex) => sum + projected[vertexIndex].z, 0) / face.length;
        const normal = faceNormal(face, worldVertices);
        const cameraToFace = new Vec3(
          eye.x - worldVertices[face[0]].x,
          eye.y - worldVertices[face[0]].y,
          eye.z - worldVertices[face[0]].z
        ).normalize();
        const brightness = clamp(normal.dot(cameraToFace), 0.18, 0.95);
        return { face, avgZ, brightness };
      })
      .sort((left, right) => right.avgZ - left.avgZ);

    if (state.highlight.faces) {
      sortedFaces.forEach(({ face, brightness }) => {
        ctx.beginPath();
        face.forEach((vertexIndex, index) => {
          const point = projected[vertexIndex];
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.closePath();
        ctx.fillStyle = `rgba(125, 226, 209, ${0.14 + brightness * 0.25})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + brightness * 0.14})`;
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
      });
    }

    if (section) {
      const planeRadius = section.radius * 1.7 + 0.8;
      const planePoints = [
        section.center.add(section.u.scale(-planeRadius)).add(section.v.scale(-planeRadius)),
        section.center.add(section.u.scale(planeRadius)).add(section.v.scale(-planeRadius)),
        section.center.add(section.u.scale(planeRadius)).add(section.v.scale(planeRadius)),
        section.center.add(section.u.scale(-planeRadius)).add(section.v.scale(planeRadius))
      ];
      const planeProjected = projector.projectList(planePoints).map((entry) => entry.screen);
      const sectionProjected = projector.projectList(section.points).map((entry) => entry.screen);

      ctx.beginPath();
      planeProjected.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(147, 168, 255, 0.12)";
      ctx.strokeStyle = "rgba(147, 168, 255, 0.28)";
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      sectionProjected.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 202, 122, 0.28)";
      ctx.strokeStyle = "rgba(255, 202, 122, 0.96)";
      ctx.lineWidth = 2.4;
      ctx.fill();
      ctx.stroke();
    }

    mesh.edges.forEach(([from, to]) => {
      const a = projected[from];
      const b = projected[to];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = state.highlight.edges ? 2.2 : 1;
      ctx.strokeStyle = state.highlight.edges ? "rgba(255, 202, 122, 0.92)" : "rgba(255, 255, 255, 0.18)";
      ctx.stroke();
    });

    if (state.highlight.vertices) {
      projected.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "#eff6ff";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(125, 226, 209, 0.9)";
        ctx.stroke();
      });
    }

    ctx.restore();
  }

  function animate() {
    drawScene();
    window.requestAnimationFrame(animate);
  }

  function bindSceneControls() {
    dom.viewModeSelect.addEventListener("change", (event) => {
      state.viewMode = event.target.value;
      if (state.viewMode === "graph") {
        state.projectionMode = "graph2d";
        state.graphCamera = {
          ...state.graphCamera,
          ...(graphDefinitions[state.activeGraphId].camera || {})
        };
      } else if (state.projectionMode === "graph2d") {
        state.projectionMode = "perspective";
      }
      state.presetLabel = state.viewMode === "graph" ? "Режим 2D-графиков" : "Режим пространственных тел";
      updateFigureUI();
    });

    dom.projectionSelect.addEventListener("change", (event) => {
      state.projectionMode = event.target.value;
      updateFigureUI();
    });

    dom.figureSelect.addEventListener("change", (event) => {
      state.activeFigureId = event.target.value;
      state.presetLabel = "Пользовательский выбор фигуры";
      updateFigureUI();
    });

    dom.graphSelect.addEventListener("change", (event) => {
      state.activeGraphId = event.target.value;
      state.viewMode = "graph";
      state.projectionMode = "graph2d";
      state.graphCamera = {
        ...state.graphCamera,
        ...(graphDefinitions[state.activeGraphId].camera || {})
      };
      state.presetLabel = "Пользовательский выбор графика";
      updateFigureUI();
    });

    dom.toggleFaces.addEventListener("change", (event) => {
      state.highlight.faces = event.target.checked;
    });

    dom.toggleEdges.addEventListener("change", (event) => {
      state.highlight.edges = event.target.checked;
    });

    dom.toggleVertices.addEventListener("change", (event) => {
      state.highlight.vertices = event.target.checked;
    });

    dom.toggleFormulaValues.addEventListener("change", (event) => {
      state.showFormulaValues = event.target.checked;
      updateInfoPanels();
    });

    dom.toggleSection.addEventListener("change", (event) => {
      state.section.enabled = event.target.checked;
      updateFigureUI();
    });

    dom.sectionOffset.addEventListener("input", (event) => {
      state.section.offset = Number(event.target.value);
      dom.sectionOffsetValue.textContent = formatNumber(state.section.offset);
      updateInfoPanels();
    });

    dom.sectionTiltX.addEventListener("input", (event) => {
      state.section.tiltX = Number(event.target.value);
      dom.sectionTiltXValue.textContent = `${Math.round(state.section.tiltX)}°`;
      updateInfoPanels();
    });

    dom.sectionTiltZ.addEventListener("input", (event) => {
      state.section.tiltZ = Number(event.target.value);
      dom.sectionTiltZValue.textContent = `${Math.round(state.section.tiltZ)}°`;
      updateInfoPanels();
    });

    dom.canvas.addEventListener("pointerdown", (event) => {
      state.pointer.active = true;
      state.pointer.x = event.clientX;
      state.pointer.y = event.clientY;
      state.pointer.dragMode = state.viewMode === "graph" ? "pan" : "rotate";
      dom.canvas.setPointerCapture(event.pointerId);
    });

    dom.canvas.addEventListener("pointermove", (event) => {
      if (!state.pointer.active) {
        return;
      }

      const deltaX = event.clientX - state.pointer.x;
      const deltaY = event.clientY - state.pointer.y;
      state.pointer.x = event.clientX;
      state.pointer.y = event.clientY;

      if (state.pointer.dragMode === "pan") {
        state.graphCamera.centerX -= deltaX / state.graphCamera.scale;
        state.graphCamera.centerY += deltaY / state.graphCamera.scale;
        updateInfoPanels();
      } else {
        state.camera.yaw += deltaX * 0.01;
        state.camera.pitch = clamp(state.camera.pitch + deltaY * 0.01, -1.35, 1.35);
      }
    });

    const stopPointer = (event) => {
      state.pointer.active = false;
      if (event.pointerId !== undefined && dom.canvas.hasPointerCapture(event.pointerId)) {
        dom.canvas.releasePointerCapture(event.pointerId);
      }
    };

    dom.canvas.addEventListener("pointerup", stopPointer);
    dom.canvas.addEventListener("pointercancel", stopPointer);
    dom.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      if (state.viewMode === "graph") {
        const factor = event.deltaY > 0 ? 0.92 : 1.08;
        state.graphCamera.scale = clamp(state.graphCamera.scale * factor, 16, 120);
        updateInfoPanels();
      } else {
        state.camera.distance = clamp(state.camera.distance + event.deltaY * 0.01, 6, 40);
      }
    }, { passive: false });

    window.addEventListener("resize", () => {
      drawScene();
      updateInfoPanels();
    });
  }

  function bindRouting() {
    window.addEventListener("hashchange", syncRoute);
    syncRoute();
  }

  function init() {
    renderTopics();
    populateFigureSelect();
    populateGraphSelect();
    bindSceneControls();
    bindRouting();
    updateFigureUI();
    animate();
  }

  init();
}());
