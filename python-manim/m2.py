from manim import *
import numpy as np
from svgpathtools import svg2paths2


def svg_to_points(filename, N=2000):
    paths, _, _ = svg2paths2(filename)

    points = []
    for path in paths:
        for t in np.linspace(0, 1, max(10, N // len(paths))):
            z = path.point(t)
            points.append(z.real + 1j * z.imag)

    z = np.array(points)

    # центрирование
    z -= np.mean(z)

    # нормализация
    z /= np.max(np.abs(z))
    return z

def compute_coeffs(z, K):
    N = len(z)
    t = np.linspace(0, 1, N, endpoint=False)

    coeffs = {}
    for n in range(-K, K + 1):
        coeffs[n] = np.sum(z * np.exp(-2j * np.pi * n * t)) / N
    return coeffs

def fourier_partial_sum(coeffs, N, t):
    s = 0
    for n in range(-N, N + 1):
        if n in coeffs:
            s += coeffs[n] * np.exp(2j * np.pi * n * t)
    return np.array([s.real, s.imag, 0])

def make_legend():
    items = []

    def legend_item(color, text):
        line = Line(LEFT * 0.3, RIGHT * 0.3, color=color, stroke_width=4)
        label = Text(text, font_size=24)
        return VGroup(line, label).arrange(RIGHT, buff=0.3)

    items.append(legend_item(WHITE, "Оригинальный рисунок"))
    items.append(legend_item(RED, "Частичная сумма N = 3"))
    items.append(legend_item(ORANGE, "Частичная сумма N = 7"))
    items.append(legend_item(GREEN, "Частичная сумма N = 15"))
    items.append(legend_item(BLUE, "Частичная сумма N = 30"))

    legend = VGroup(*items).arrange(DOWN, aligned_edge=LEFT, buff=0.25)

    background = RoundedRectangle(
        corner_radius=0.2,
        height=legend.height + 0.4,
        width=legend.width + 0.6,
        fill_color=BLACK,
        fill_opacity=0.6,
        stroke_width=1
    )

    legend_group = VGroup(background, legend)
    legend_group.to_corner(UL)

    return legend_group

class FourierApproximationStatic(Scene):
    def construct(self):
        z = svg_to_points("./github.svg") * -1
        coeffs = compute_coeffs(z, K=60)

        original_curve = ParametricFunction(
            lambda t: np.array([
                z[int(t * (len(z) - 1))].real,
                z[int(t * (len(z) - 1))].imag,
                0
            ]),
            t_range=[0, 1],
            color=WHITE,
            stroke_width=4
        )

        self.add(original_curve)

        Ns = [3, 7, 15, 30]
        colors = [RED, ORANGE, GREEN, BLUE]

        for N, color in zip(Ns, colors):
            curve = ParametricFunction(
                lambda t, N=N: fourier_partial_sum(coeffs, N, t),
                t_range=[0, 1],
                color=color,
                stroke_width=2
            )
            self.add(curve)

        legend = make_legend()
        self.add(legend)
