/**
 * Комплексная экспонента: e^(it) = cos(t) + i*sin(t)
 */
export const cexp = (t) => ({
  re: Math.cos(t),
  im: Math.sin(t),
});

/**
 * Нормализует точки к диапазону [-1.25, 1.25] с сохранением пропорций
 */
export const normalizePoints = (pts) => {
  if (!pts || !pts.length) return [];

  // Найти границы
  let minx = Infinity,
    maxx = -Infinity,
    miny = Infinity,
    maxy = -Infinity;
  for (const p of pts) {
    if (p.x < minx) minx = p.x;
    if (p.x > maxx) maxx = p.x;
    if (p.y < miny) miny = p.y;
    if (p.y > maxy) maxy = p.y;
  }

  // Вычислить масштаб
  const cx = (minx + maxx) / 2;
  const cy = (miny + maxy) / 2;
  const w = Math.max(1e-9, maxx - minx);
  const h = Math.max(1e-9, maxy - miny);
  const scale = Math.max(w, h);
  const MARGIN = 1.25;

  // Нормализовать
  return pts.map((p) => ({
    x: ((p.x - cx) / scale) * MARGIN,
    y: ((p.y - cy) / scale) * MARGIN,
  }));
}

/**
 * Ресемплирует точки по длине дуги на N равномерно распределённых точек
 */
export const resampleByArcLength = (points, N) => {
  if (!points || !points.length) return [];

  // Вычислить накопленные расстояния
  const d = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    d[i] = d[i - 1] + Math.hypot(dx, dy);
  }

  // Интерполировать
  const L = d[d.length - 1] || 1;
  const out = [];
  for (let k = 0; k < N; k++) {
    const target = (k / (N - 1)) * L;
    let i = 1;
    while (i < d.length && d[i] < target) i++;

    if (i >= d.length) {
      out.push({ ...points[points.length - 1] });
      continue;
    }

    const t = (target - d[i - 1]) / (d[i] - d[i - 1] || 1e-12);
    out.push({
      x: points[i - 1].x * (1 - t) + points[i].x * t,
      y: points[i - 1].y * (1 - t) + points[i].y * t,
    });
  }
  return out;
}

/**
 * Вычисляет коэффициенты Фурье для набора точек
 * Возвращает объект с коэффициентами, отсортированными по порядку и величине
 */
export const computeCoefficients = (points, K) => {
  const N = points.length;
  const dt = 1 / N;
  const arr = [];

  // Вычислить DFT для n от -K до K
  for (let n = -K; n <= K; n++) {
    let re = 0;
    let im = 0;
    const twoPiN = 2 * Math.PI * n;

    for (let j = 0; j < N; j++) {
      const angle = -twoPiN * (j / N);
      const e = cexp(angle);
      re += points[j].x * e.re - points[j].y * e.im;
      im += points[j].x * e.im + points[j].y * e.re;
    }

    re *= dt;
    im *= dt;
    arr.push({
      n,
      re,
      im,
      mag: Math.hypot(re, im),
    });
  }

  return {
    byOrder: arr.slice().sort((a, b) => a.n - b.n),
    byMag: arr.slice().sort((a, b) => b.mag - a.mag),
  };
}

/**
 * Выбирает коэффициенты в зависимости от режима и параметра M
 * mode='order': выбирает |n| <= M
 * mode='mag': выбирает M коэффициентов с наибольшей величиной
 */
export const chooseCoefficients = (coeffObj, M, mode) => {
  if (!coeffObj) return [];

  if (mode === 'mag') {
    return coeffObj.byMag.slice(0, M);
  }

  return coeffObj.byOrder.filter((c) => Math.abs(c.n) <= M);
}

/**
 * Упорядочивает коэффициенты по порядку эпициклов (0, 1, -1, 2, -2, ...)
 */
export const epicycleOrder = (byOrderArr, M) => {
  const map = new Map(byOrderArr.map((c) => [c.n, c]));
  const seq = [];

  // DC компонента (n=0)
  if (map.has(0)) seq.push(map.get(0));

  // Пары положительных и отрицательных частот
  for (let k = 1; k <= M; k++) {
    if (map.has(k)) seq.push(map.get(k));
    if (map.has(-k)) seq.push(map.get(-k));
  }

  return seq;
}

/**
 * Строит функцию преобразования из нормализованных координат в пиксели
 */
export const buildTransformForRect = (widthPx, heightPx, allPoints) => {
  const W = widthPx;
  const H = heightPx;

  if (!allPoints || allPoints.length === 0) {
    const scale = Math.min(W, H) * 0.45;
    return {
      toCanvas: (p) => ({
        x: W / 2 + p.x * scale,
        y: H / 2 - p.y * scale,
      }),
      scale,
      cx: 0,
      cy: 0,
    };
  }

  // Найти границы
  let minx = Infinity,
    maxx = -Infinity,
    miny = Infinity,
    maxy = -Infinity;
  for (const p of allPoints) {
    if (p.x < minx) minx = p.x;
    if (p.x > maxx) maxx = p.x;
    if (p.y < miny) miny = p.y;
    if (p.y > maxy) maxy = p.y;
  }

  // Вычислить масштаб и смещение
  const cx = (minx + maxx) / 2;
  const cy = (miny + maxy) / 2;
  const w = Math.max(1e-9, maxx - minx);
  const h = Math.max(1e-9, maxy - miny);
  const scale = Math.min(W / w, H / h) * 0.45;

  return {
    toCanvas: (p) => ({
      x: W / 2 + (p.x - cx) * scale,
      y: H / 2 - (p.y - cy) * scale,
    }),
    scale,
    cx,
    cy,
  };
}
