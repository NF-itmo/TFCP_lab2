from manim import *
import numpy as np
from svgpathtools import svg2paths2

def svg_to_points(filename, N=2000):
    paths, _, _ = svg2paths2(filename)

    points = []
    for path in paths:
        for t in np.linspace(0, 1, max(10, N // len(paths))):
            z = path.point(t)
            points.append([z.real, z.imag, 0])

    pts = np.array(points)

    pts[:, 0] -= np.mean(pts[:, 0])
    pts[:, 1] -= np.mean(pts[:, 1])

    scale = np.max(np.sqrt(pts[:, 0]**2 + pts[:, 1]**2))
    pts /= scale

    return pts

def heart(t):
    x = 16 * np.sin(t)**3
    y = 13*np.cos(t) - 5*np.cos(2*t) - 2*np.cos(3*t) - np.cos(4*t)
    return np.array([x, y, 0]) / 20

def get_points(N=2000):
    ts = np.linspace(0, 2*np.pi, N)
    return np.array([heart(t) for t in ts])

def compute_coeffs(points, K):
    N = len(points)
    dt = 1 / N
    z = points[:, 0] + 1j*points[:, 1]

    coeffs = []
    t_vals = np.linspace(0, 1, N)

    for n in range(-K, K+1):
        c = np.sum(z * np.exp(-1j * 2*np.pi*n*t_vals)) * dt
        coeffs.append((n, c))

    coeffs.sort(key=lambda x: abs(x[1]), reverse=True)
    return coeffs

class FourierHeartEnhanced(Scene):
    def construct(self):
        # Создаем точки и коэффициенты
        points = svg_to_points("./github.svg") * -1 # get_points()
        coeffs = compute_coeffs(points, K=50)
        t = ValueTracker(0)
        origin = ORIGIN
        
        def get_endpoint():
            tt = t.get_value()
            pos = origin
            for (n, c) in coeffs:
                r = abs(c)
                phi = np.angle(c)
                pos = pos + r * np.array([
                    np.cos(2*np.pi*n*tt + phi),
                    np.sin(2*np.pi*n*tt + phi),
                    0
                ])
            return pos
        
        dot = Dot(color=RED, radius=0.05).add_updater(
            lambda m: m.move_to(get_endpoint())
        )

        path = TracedPath(
            dot.get_center,
            stroke_color=YELLOW,
            stroke_width=3.5,
            stroke_opacity=0.9,
            z_index=1
        )

        lines = VGroup()
        def get_lines():
            tt = t.get_value()
            group = VGroup()
            center = origin
            
            max_lines = 15
            for i, (n, c) in enumerate(coeffs[:max_lines]):
                r = abs(c)
                if r < 0.001:
                    continue
                    
                next_center = center + r * np.array([
                    np.cos(2*np.pi*n*tt + np.angle(c)),
                    np.sin(2*np.pi*n*tt + np.angle(c)),
                    0
                ])
                
                line = Line(
                    center, next_center,
                    color=GREEN, 
                    stroke_width=1,
                    stroke_opacity=0.6
                )
                group.add(line)
                center = next_center
            return group
        
        lines.add_updater(lambda m: m.become(get_lines()))
        
        circles = VGroup()
        def get_circles():
            tt = t.get_value()
            center = origin
            group = VGroup()
            
            max_circles = 15
            for i, (n, c) in enumerate(coeffs[:max_circles]):
                r = abs(c)
                if r < 0.001:
                    continue
                    
                circle = Circle(
                    radius=r, 
                    color=BLUE_E, 
                    stroke_width=1,
                    stroke_opacity=0.4,
                    z_index=0
                ).move_to(center)
                group.add(circle)
                
                center = center + r * np.array([
                    np.cos(2*np.pi*n*tt + np.angle(c)),
                    np.sin(2*np.pi*n*tt + np.angle(c)),
                    0
                ])
            return group
        
        circles.add_updater(lambda m: m.become(get_circles()))
        
        self.add(circles, lines, dot, path)
        
        self.play(
            t.animate.set_value(1),
            run_time=12,
            rate_func=linear
        )

        self.wait(3)