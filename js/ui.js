// Кэширует и возвращает все необходимые ссылки на DOM элементы
export const initUI = () => {
  return {
    // Canvas и его контекст
    canvas: document.getElementById('cv'),

    // Input элементы
    Ninput: document.getElementById('N'),
    Kinput: document.getElementById('K'),
    Linput: document.getElementById('L'),
    MlistTA: document.getElementById('Mlist'),
    ManimateInput: document.getElementById('Manimate'), // Новое поле для анимации!

    // Кнопки действий
    btnBuild: document.getElementById('btnBuild'),
    btnCompute: document.getElementById('btnCompute'),
    btnAnimate: document.getElementById('btnAnimate'),
    btnDraw: document.getElementById('btnDraw'),
    btnClear: document.getElementById('btnClear'),
    btnExportPNG: document.getElementById('btnExportPNG'),

    // Кнопки режима выбора
    modeOrderBtn: document.getElementById('modeOrder'),
    modeMagBtn: document.getElementById('modeMag'),

    // Элементы отображения значений
    Nval: document.getElementById('Nval'),
    Kval: document.getElementById('Kval'),
    Lval: document.getElementById('Lval'),
    Mbadges: document.getElementById('Mbadges'),

    // Легенда
    legendEl: document.getElementById('legend'),
  };
}

// Обновляет отображение текущих значений слайдеров
export const updateDisplayValues = (ui) => {
  ui.Nval.textContent = ui.Ninput.value;
  ui.Kval.textContent = ui.Kinput.value;
  ui.Lval.textContent = ui.Linput.value;
}

// Подсвечивает значения M в виде бэджей
export const updateMBadges = (ui) => {
  ui.Mbadges.innerHTML = '';
  ui.MlistTA.value
    .split(',')
    .map((s) => s.trim())
    .filter((x) => x)
    .forEach((x) => {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = x;
      ui.Mbadges.appendChild(b);
    });
}

// Парсит список M из текстареи
export const parseM = (MlistTA) => {
  return MlistTA.value
    .split(',')
    .map((s) => +s.trim())
    .filter((x) => Number.isFinite(x) && x >= 0);
}

// Получает M для анимации из отдельного поля
export const getMForAnimation = (ManimateInput) => {
  const value = parseInt(ManimateInput.value);
  return Number.isFinite(value) && value > 0 ? value : 150;
}

// Переводит координаты pointer event в нормализованные координаты
export const pointerToNorm = (event, canvas) => {
  const r = canvas.getBoundingClientRect();
  const x = (event.clientX - r.left) / r.width;
  const y = (event.clientY - r.top) / r.height;
  return { x: x * 2 - 1, y: 1 - y * 2 };
}

// Переключает активное состояние кнопки режима
export const setModeActive = (modeBtn, otherBtn) => {
  modeBtn.classList.add('active');
  otherBtn.classList.remove('active');
}

// Проверяет, активен ли режим
export const isModeActive = (modeBtn) => {
  return modeBtn.classList.contains('active');
}

// Устанавливает состояние кнопки Draw (активна ли)
export const setDrawButtonState = (btnDraw, isActive) => {
  if (isActive) {
    btnDraw.classList.add('toggle', 'active');
  } else {
    btnDraw.classList.remove('toggle', 'active');
  }
}

// Проверяет, находится ли кнопка Draw в активном состоянии
export const isDrawButtonActive = (btnDraw) => {
  return btnDraw.classList.contains('active');
}

// Устанавливает состояние кнопки Animate
export const setAnimateButtonState = (btnAnimate, isAnimating) => {
  btnAnimate.textContent = isAnimating ? 'Stop' : 'Анимация';
}

// Отключает/включает кнопку
export const setButtonDisabled = (btn, disabled) => {
  btn.disabled = disabled;
}