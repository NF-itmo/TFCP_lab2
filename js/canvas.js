import { buildTransformForRect } from './math.js';

export const initCanvas = (canvasElement) => {
  const ctx = canvasElement.getContext('2d');

  const resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvasElement.getBoundingClientRect();
    canvasElement.width = Math.max(300, rect.width) * dpr;
    canvasElement.height = Math.max(300, rect.height) * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  return { ctx, resizeCanvas };
}

// Очищает холст
export const clearCanvas = (ctx, canvas) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Отрисовывает оригинальную кривую и все частичные суммы на холсте
export const renderStatic = (
  ctx,
  canvas,
  basePoints,
  partials,
  legendEl
) => {
  clearCanvas(ctx, canvas);

  const all = [...(basePoints || [])];
  partials.forEach((s) => all.push(...(s.pts || [])));

  const W = canvas.width / (window.devicePixelRatio || 1);
  const H = canvas.height / (window.devicePixelRatio || 1);

  const { toCanvas } = buildTransformForRect(W, H, all.length ? all : basePoints);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.restore();

  // Оригинальная кривая
  if (basePoints && basePoints.length) {
    ctx.beginPath();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(230,238,248,0.95)';
    basePoints.forEach((p, i) => {
      const q = toCanvas(p);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    });
    ctx.stroke();
  }

  // Частичные суммы
  partials.forEach((s) => {
    if (!s.pts || !s.pts.length) return;
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = s.color;
    s.pts.forEach((p, i) => {
      const q = toCanvas(p);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    });
    ctx.stroke();
  });

  // Обновить легенду
  legendEl.innerHTML = '';
  if (basePoints && basePoints.length) {
    const el = document.createElement('span');
    el.className = 'item';
    const sw = document.createElement('i');
    sw.className = 'sw';
    sw.style.background = 'rgba(255,255,255,0.92)';
    el.appendChild(sw);
    el.appendChild(document.createTextNode('Оригинал'));
    legendEl.appendChild(el);
  }
  partials.forEach((s) => {
    const el = document.createElement('span');
    el.className = 'item';
    const sw = document.createElement('i');
    sw.className = 'sw';
    sw.style.background = s.color;
    el.appendChild(sw);
    el.appendChild(
      document.createTextNode(`M=${s.M} (${s.mode})`)
    );
    legendEl.appendChild(el);
  });
}

// Отрисовывает на произвольный контекст (для экспорта)
export const renderStaticTo = (
  targetCtx,
  widthPx,
  heightPx,
  basePointsLocal,
  partialsLocal
) => {
  targetCtx.clearRect(0, 0, widthPx, heightPx);

  const all = [...(basePointsLocal || [])];
  (partialsLocal || []).forEach((s) => all.push(...(s.pts || [])));

  const { toCanvas } = buildTransformForRect(
    widthPx,
    heightPx,
    all.length ? all : basePointsLocal
  );

  // Оси
  targetCtx.save();
  targetCtx.strokeStyle = 'rgba(255,255,255,0.06)';
  targetCtx.lineWidth = 1;
  targetCtx.beginPath();
  targetCtx.moveTo(0, heightPx / 2);
  targetCtx.lineTo(widthPx, heightPx / 2);
  targetCtx.moveTo(widthPx / 2, 0);
  targetCtx.lineTo(widthPx / 2, heightPx);
  targetCtx.stroke();
  targetCtx.restore();

  // Оригинальная кривая
  if (basePointsLocal && basePointsLocal.length) {
    targetCtx.beginPath();
    targetCtx.lineWidth = 2.2;
    targetCtx.strokeStyle = 'rgba(230,238,248,0.95)';
    basePointsLocal.forEach((p, i) => {
      const q = toCanvas(p);
      i ? targetCtx.lineTo(q.x, q.y) : targetCtx.moveTo(q.x, q.y);
    });
    targetCtx.stroke();
  }

  // Частичные суммы
  (partialsLocal || []).forEach((s) => {
    if (!s.pts || !s.pts.length) return;
    targetCtx.beginPath();
    targetCtx.lineWidth = 2;
    targetCtx.strokeStyle = s.color;
    s.pts.forEach((p, i) => {
      const q = toCanvas(p);
      i ? targetCtx.lineTo(q.x, q.y) : targetCtx.moveTo(q.x, q.y);
    });
    targetCtx.stroke();
  });
}

// Отрисовывает эпициклы и анимацию на произвольный контекст
export const renderEpicyclesFrameTo = (
  chosenCoeffs,
  tailPoints,
  currentT,
  targetCtx,
  widthPx,
  heightPx,
  basePointsLocal,
  Linput
) => {
  const all = [...(basePointsLocal || []), ...(tailPoints || [])];
  const { toCanvas, scale } = buildTransformForRect(
    widthPx,
    heightPx,
    all.length ? all : basePointsLocal
  );

  // Оригинальная кривая (тусклая)
  if (basePointsLocal && basePointsLocal.length) {
    targetCtx.beginPath();
    targetCtx.lineWidth = 1.2;
    targetCtx.strokeStyle = 'rgba(255,255,255,0.06)';
    basePointsLocal.forEach((p, i) => {
      const q = toCanvas(p);
      i ? targetCtx.lineTo(q.x, q.y) : targetCtx.moveTo(q.x, q.y);
    });
    targetCtx.stroke();
  }

  // Обработка DC компоненты
  let cx = 0;
  let cy = 0;
  const coeffsCopy = chosenCoeffs.slice();
  const dcIndex = coeffsCopy.findIndex((c) => c.n === 0);
  if (dcIndex !== -1) {
    const dc = coeffsCopy.splice(dcIndex, 1)[0];
    cx += dc.re;
    cy += dc.im;
  }

  // Отрисовать использованные эпициклы
  const L = Math.max(
    1,
    Math.min(coeffsCopy.length, +Linput.value || coeffsCopy.length)
  );
  const used = coeffsCopy.slice(0, L);
  targetCtx.lineWidth = 1;
  targetCtx.strokeStyle = 'rgba(90,160,255,0.6)';

  for (const c of used) {
    const a = 2 * Math.PI * c.n * currentT;
    const dx = c.re * Math.cos(a) - c.im * Math.sin(a);
    const dy = c.re * Math.sin(a) + c.im * Math.cos(a);
    const r = Math.hypot(c.re, c.im);

    const c0 = toCanvas({ x: cx, y: cy });
    const c1 = toCanvas({ x: cx + dx, y: cy + dy });

    targetCtx.beginPath();
    targetCtx.arc(c0.x, c0.y, Math.abs(r) * scale, 0, Math.PI * 2);
    targetCtx.stroke();

    targetCtx.beginPath();
    targetCtx.moveTo(c0.x, c0.y);
    targetCtx.lineTo(c1.x, c1.y);
    targetCtx.stroke();

    cx += dx;
    cy += dy;
  }

  // Хвост траектории
  if (tailPoints && tailPoints.length) {
    targetCtx.beginPath();
    targetCtx.lineWidth = 2.5;
    targetCtx.strokeStyle = 'rgba(255,120,90,0.95)';
    tailPoints.forEach((p, i) => {
      const q = toCanvas(p);
      i ? targetCtx.lineTo(q.x, q.y) : targetCtx.moveTo(q.x, q.y);
    });
    targetCtx.stroke();
  }

  // Движущаяся точка
  const last = toCanvas({ x: cx, y: cy });
  targetCtx.beginPath();
  targetCtx.fillStyle = 'rgba(255,60,60,1)';
  targetCtx.arc(last.x, last.y, 4.5, 0, Math.PI * 2);
  targetCtx.fill();
}

// Отрисовка режима рисования
export function renderDrawing(ctx, canvas, rawDraw) {
  clearCanvas(ctx, canvas);
  if (!rawDraw || !rawDraw.length) return;

  const W = canvas.width / (window.devicePixelRatio || 1);
  const H = canvas.height / (window.devicePixelRatio || 1);

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  rawDraw.forEach((p, i) => {
    const px = ((p.x + 1) / 2) * W;
    const py = (1 - (p.y + 1) / 2) * H;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  });
  ctx.stroke();
}
