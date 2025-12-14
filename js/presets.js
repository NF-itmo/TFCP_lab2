// Сердце
export const preset_heart = (N) => {
  return Array.from({ length: N }, (_, j) => {
    const t = (2 * Math.PI * j) / N;
    const x = 16 * Math.sin(t) ** 3;
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    return { x: x / 20, y: y / 20 };
  });
}

// Цветок
export const preset_flower = (N) => {
  return Array.from({ length: N }, (_, j) => {
    const t = (2 * Math.PI * j) / N;
    const r = 0.6 + 0.4 * Math.cos(5 * t);
    return { x: r * Math.cos(t), y: r * Math.sin(t) };
  });
}

// Спираль (логарифмическая спираль)
export const preset_spiral = (N) => {
  return Array.from({ length: N }, (_, j) => {
    const t = ((j / (N - 1)) * 4 * Math.PI);
    const r = 0.05 + 0.9 * (j / (N - 1));
    return { x: r * Math.cos(t), y: r * Math.sin(t) };
  });
}
