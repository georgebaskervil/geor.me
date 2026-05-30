#!/usr/bin/env python3
"""Generate CRT barrel displacement map (512²) with SVG-equivalent Gaussian blur baked in."""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

SIZE = 512
CENTER = SIZE / 2
BLUR_STDDEV = 0.35


def build_raw_map() -> list[tuple[int, int, int, int]]:
    pixels: list[tuple[int, int, int, int]] = []
    for y in range(SIZE):
        for x in range(SIZE):
            dx = x - CENTER
            dy = y - CENTER
            length = math.sqrt(dx * dx + dy * dy)
            t = min(length / CENTER, 1.0)
            factor = t * t * 0.7
            r = int(max(0, min(255, 128 + dx * factor)))
            g = int(max(0, min(255, 128 + dy * factor)))
            pixels.append((r, g, 0, 255))
    return pixels


def gaussian_kernel(stddev: float) -> list[float]:
    radius = max(1, int(math.ceil(stddev * 3)))
    kernel = []
    total = 0.0
    for i in range(-radius, radius + 1):
        value = math.exp(-(i * i) / (2 * stddev * stddev))
        kernel.append(value)
        total += value
    return [v / total for v in kernel]


def separable_blur_channel(
    values: list[float], size: int, kernel: list[float]
) -> list[float]:
    radius = len(kernel) // 2
    temp = [0.0] * (size * size)
    out = [0.0] * (size * size)

    for y in range(size):
        for x in range(size):
            acc = 0.0
            for k, weight in enumerate(kernel):
                sx = min(size - 1, max(0, x + k - radius))
                acc += values[y * size + sx] * weight
            temp[y * size + x] = acc

    for y in range(size):
        for x in range(size):
            acc = 0.0
            for k, weight in enumerate(kernel):
                sy = min(size - 1, max(0, y + k - radius))
                acc += temp[sy * size + x] * weight
            out[y * size + x] = acc

    return out


def blur_pixels(pixels: list[tuple[int, int, int, int]]) -> list[tuple[int, int, int, int]]:
    kernel = gaussian_kernel(BLUR_STDDEV)
    size = SIZE
    channels = [[float(p[c]) for p in pixels] for c in range(2)]
    blurred = [separable_blur_channel(ch, size, kernel) for ch in channels]
    result: list[tuple[int, int, int, int]] = []
    for i, (_, _, _, a) in enumerate(pixels):
        r = int(max(0, min(255, round(blurred[0][i]))))
        g = int(max(0, min(255, round(blurred[1][i]))))
        result.append((r, g, 0, a))
    return result


def write_png(path: Path, pixels: list[tuple[int, int, int, int]]) -> None:
    raw = bytearray()
    for y in range(SIZE):
        raw.append(0)
        for x in range(SIZE):
            r, g, b, a = pixels[y * SIZE + x]
            raw.extend((r, g, b, a))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0)
    compressed = zlib.compress(bytes(raw), 9)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", compressed)
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def main() -> None:
    out = Path(__file__).resolve().parent.parent / "app" / "images" / "crt-displacement-map.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    raw = build_raw_map()
    # Blur is applied in SVG via feGaussianBlur (must match stdDeviation there).
    write_png(out, raw)
    print(f"Wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
