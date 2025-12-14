import * as math from './math.js';
import * as canvasModule from './canvas.js';
import * as uiModule from './ui.js';
import * as presets from './presets.js';

class AppState {
  constructor() {
    this.basePoints = [];
    this.coeffs = null;
    this.partials = [];
    this.animId = null;
    this.tail = [];
    this.drawMode = false;
    this.rawDraw = [];
    this.currentT = 0;
  }

  reset() {
    this.basePoints = [];
    this.coeffs = null;
    this.partials = [];
    this.tail = [];
    this.drawMode = false;
    this.rawDraw = [];
    this.currentT = 0;
  }

  resetDrawing() {
    this.drawMode = false;
    this.rawDraw = [];
  }

  stopAnimation() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}


export const initApp = () => {
  const ui = uiModule.initUI();
  const canvasElement = ui.canvas;
  const canvasInfo = canvasModule.initCanvas(canvasElement);
  const state = new AppState();

  state.basePoints = math.normalizePoints(
    presets.preset_heart(+ui.Ninput.value)
  );

  canvasModule.renderStatic(
    canvasInfo.ctx,
    canvasElement,
    state.basePoints,
    state.partials,
    ui.legendEl
  );

  uiModule.updateDisplayValues(ui);
  uiModule.updateMBadges(ui);

  return {
    state,
    ui,
    canvas: canvasElement,
    canvasInfo: canvasInfo,
    ctx: canvasInfo.ctx,
  };
}

// Обработчики событий слайдеров
export const setupSliderHandlers = (appState) => {
  const { ui } = appState;

  ui.Ninput.addEventListener('input', () => {
    uiModule.updateDisplayValues(ui);
  });

  ui.Kinput.addEventListener('input', () => {
    uiModule.updateDisplayValues(ui);
  });

  ui.Linput.addEventListener('input', () => {
    uiModule.updateDisplayValues(ui);
  });
}

// Обработчики для списка M
export const setupMListHandlers = (appState) => {
  const { ui } = appState;

  ui.MlistTA.addEventListener('input', () => {
    uiModule.updateMBadges(ui);
  });
}

// Обработчики для режима выбора коэффициентов
export const setupModeHandlers = (appState) => {
  const { ui } = appState;

  ui.modeOrderBtn.addEventListener('click', () => {
    uiModule.setModeActive(ui.modeOrderBtn, ui.modeMagBtn);
  });

  ui.modeMagBtn.addEventListener('click', () => {
    uiModule.setModeActive(ui.modeMagBtn, ui.modeOrderBtn);
  });
}


// Обработчики для пресетов
export const setupPresetHandlers = (appState) => {
  const { state, ui, canvas, ctx } = appState;

  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const N = +ui.Ninput.value;
      state.resetDrawing();
      uiModule.setDrawButtonState(ui.btnDraw, false);

      // Загрузить нужный пресет
      if (btn.dataset.preset === 'heart') {
        state.basePoints = math.normalizePoints(presets.preset_heart(N));
      } else if (btn.dataset.preset === 'flower') {
        state.basePoints = math.normalizePoints(presets.preset_flower(N));
      } else if (btn.dataset.preset === 'spiral') {
        state.basePoints = math.normalizePoints(presets.preset_spiral(N));
      }

      state.coeffs = null;
      state.partials = [];
      canvasModule.renderStatic(ctx, canvas, state.basePoints, state.partials, ui.legendEl);
    });
  });
}

// Обработчики кнопок Clear и Draw
export const setupDrawHandlers = (appState) => {
  const { state, ui, canvas, ctx } = appState;

  // Clear
  ui.btnClear.addEventListener('click', () => {
    state.reset();
    uiModule.setDrawButtonState(ui.btnDraw, false);
    canvasModule.renderStatic(ctx, canvas, state.basePoints, state.partials, ui.legendEl);
  });

  // Draw toggle
  ui.btnDraw.addEventListener('click', () => {
    state.drawMode = !state.drawMode;
    state.rawDraw = [];

    if (state.drawMode) {
      uiModule.setDrawButtonState(ui.btnDraw, true);
      canvas.focus();
      canvasModule.renderDrawing(ctx, canvas, state.rawDraw);
    } else {
      uiModule.setDrawButtonState(ui.btnDraw, false);
      canvasModule.renderStatic(ctx, canvas, state.basePoints, state.partials, ui.legendEl);
    }
  });

  // Pointer events для рисования
  let drawingActive = false;
  canvas.addEventListener('pointerdown', (e) => {
    if (!state.drawMode) return;
    drawingActive = true;
    canvas.setPointerCapture(e.pointerId);
    state.rawDraw = [uiModule.pointerToNorm(e, canvas)];
    canvasModule.renderDrawing(ctx, canvas, state.rawDraw);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawingActive) return;
    state.rawDraw.push(uiModule.pointerToNorm(e, canvas));
    canvasModule.renderDrawing(ctx, canvas, state.rawDraw);
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!drawingActive) return;
    drawingActive = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {}

    // Если нарисовали мало, отменить
    if (state.rawDraw.length < 6) {
      state.rawDraw = [];
      state.drawMode = false;
      uiModule.setDrawButtonState(ui.btnDraw, false);
      canvasModule.renderStatic(ctx, canvas, state.basePoints, state.partials, ui.legendEl);
      return;
    }

    // Ресемплировать и нормализовать
    const N = +ui.Ninput.value;
    const resampled = math.resampleByArcLength(state.rawDraw, N);
    state.basePoints = math.normalizePoints(resampled);
    state.coeffs = null;
    state.partials = [];
    state.drawMode = false;
    uiModule.setDrawButtonState(ui.btnDraw, false);
    canvasModule.renderStatic(ctx, canvas, state.basePoints, state.partials, ui.legendEl);
  });
}

// Обработчики вычислений
export const setupComputeHandlers = (appState) => {
  const { state, ui, canvas, ctx } = appState;

  ui.btnCompute.addEventListener('click', () => {
    if (!state.basePoints || !state.basePoints.length) {
      alert('Сначала выберите или нарисуйте фигуру.');
      return;
    }

    const K = +ui.Kinput.value;
    uiModule.setButtonDisabled(ui.btnCompute, true);

    setTimeout(() => {
      state.coeffs = math.computeCoefficients(state.basePoints, K);
      uiModule.setButtonDisabled(ui.btnCompute, false);
      alert(`Коэффициенты вычислены (K=${K}).`);
    }, 10);
  });

  ui.btnBuild.addEventListener('click', () => {
    if (!state.basePoints || !state.basePoints.length) {
      alert('Сначала выберите или нарисуйте фигуру.');
      return;
    }

    const K = +ui.Kinput.value;
    if (!state.coeffs || state.coeffs.byOrder.length < 2 * K + 1) {
      state.coeffs = math.computeCoefficients(state.basePoints, K);
    }

    const Ms = uiModule.parseM(ui.MlistTA);
    if (!Ms.length) {
      alert('Нужно указать хотя бы одно M.');
      return;
    }

    const modeSel = uiModule.isModeActive(ui.modeMagBtn) ? 'mag' : 'order';

    // Построить частичные суммы
    state.partials = Ms.map((M, idx) => {
      const chosen = math.chooseCoefficients(state.coeffs, M, modeSel);
      const S = 1500;
      const pts = new Array(S);

      for (let k = 0; k < S; k++) {
        const t = k / (S - 1);
        let sx = 0;
        let sy = 0;
        for (const c of chosen) {
          const a = 2 * Math.PI * c.n * t;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          sx += c.re * ca - c.im * sa;
          sy += c.re * sa + c.im * ca;
        }
        pts[k] = { x: sx, y: sy };
      }

      return {
        M,
        mode: modeSel,
        pts,
        color: `hsl(${((idx * 72) % 360)} 70% 60%)`,
      };
    });

    canvasModule.renderStatic(ctx, canvas, state.basePoints, state.partials, ui.legendEl);
  });
}

// Обработчик анимации - ИЗМЕНЕНО: используем M из отдельного поля
export const setupAnimationHandler = (appState) => {
  const { state, ui, canvas, ctx } = appState;

  ui.btnAnimate.addEventListener('click', () => {
    if (state.animId) {
      state.stopAnimation();
      uiModule.setAnimateButtonState(ui.btnAnimate, false);
      return;
    }

    if (!state.coeffs) {
      alert('Сначала вычислите коэффициенты (Вычислить coeffs) или нажмите Построить.');
      return;
    }

    console.log(ui.ManimateInput)
    const M = uiModule.getMForAnimation(ui.ManimateInput);
    
    const modeSel = uiModule.isModeActive(ui.modeMagBtn) ? 'mag' : 'order';
    const chosen = modeSel === 'mag' 
      ? state.coeffs.byMag.slice(0, M) 
      : math.epicycleOrder(state.coeffs.byOrder, M);

    if (!chosen || !chosen.length) {
      alert('Нет выбранных коэффициентов');
      return;
    }

    state.tail = [];
    uiModule.setAnimateButtonState(ui.btnAnimate, true);

    const duration = 8000;
    let start = null;

    function step(now) {
      if (!start) start = now;
      const t = ((now - start) % duration) / duration;
      state.currentT = t;

      // Вычислить конечную точку и обновить хвост
      let cx = 0;
      let cy = 0;
      for (const c of chosen) {
        const a = 2 * Math.PI * c.n * t;
        cx += c.re * Math.cos(a) - c.im * Math.sin(a);
        cy += c.re * Math.sin(a) + c.im * Math.cos(a);
      }
      state.tail.push({ x: cx, y: cy });
      if (state.tail.length > 2500) state.tail.shift();

      canvasModule.clearCanvas(ctx, canvas);
      canvasModule.renderStatic(ctx, canvas, state.basePoints, state.partials, ui.legendEl);
      canvasModule.renderEpicyclesFrameTo(
        chosen,
        state.tail,
        state.currentT,
        ctx,
        canvas.width / (window.devicePixelRatio || 1),
        canvas.height / (window.devicePixelRatio || 1),
        state.basePoints,
        ui.Linput
      );

      state.animId = requestAnimationFrame(step);
    }

    state.animId = requestAnimationFrame(step);
  });
}

// Обработчик экспорта PNG - ИЗМЕНЕНО: используем M из отдельного поля
export const setupExportHandler = (appState) => {
  const { state, ui, canvas } = appState;

  ui.btnExportPNG.addEventListener('click', async () => {
    const exportScale = 3;
    const srcPixelW = canvas.width;
    const srcPixelH = canvas.height;
    const dstW = srcPixelW * exportScale;
    const dstH = srcPixelH * exportScale;

    const tmp = document.createElement('canvas');
    tmp.width = dstW;
    tmp.height = dstH;
    const tctx = tmp.getContext('2d');

    canvasModule.renderStaticTo(tctx, dstW, dstH, state.basePoints, state.partials);

    // ИЗМЕНЕНО: Используем M из отдельного поля, а не последний из списка
    if (state.coeffs) {
      const M = uiModule.getMForAnimation(ui.ManimateInput);
      const modeSel = uiModule.isModeActive(ui.modeMagBtn) ? 'mag' : 'order';
      const chosen = modeSel === 'mag' 
        ? state.coeffs.byMag.slice(0, M) 
        : math.epicycleOrder(state.coeffs.byOrder, M);
      
      if (chosen && chosen.length) {
        canvasModule.renderEpicyclesFrameTo(
          chosen,
          state.tail,
          state.currentT,
          tctx,
          dstW,
          dstH,
          state.basePoints,
          ui.Linput
        );
      }
    }

    tmp.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fourier_highres.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  });
}

// Главная функция инициализации
export const setupAllHandlers = (appState) => {
  setupSliderHandlers(appState);
  setupMListHandlers(appState);
  setupModeHandlers(appState);
  setupPresetHandlers(appState);
  setupDrawHandlers(appState);
  setupComputeHandlers(appState);
  setupAnimationHandler(appState);
  setupExportHandler(appState);
}