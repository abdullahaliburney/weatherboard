"""Generate the PWA icons from code so they can be reproduced, not hand-waved.

Same composition as public/favicon.svg: a dark rounded tile, a warm sun and a
light cloud. Run `python3 scripts/generate-icons.py` from the project root.
"""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path("public/icons")


def make_icon(size: int, *, maskable: bool = False) -> Image.Image:
    scale = size / 512
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    inset = int(size * 0.0) if maskable else int(size * 0.04)
    radius = int(size * 0.22) if not maskable else 0
    draw.rounded_rectangle(
        [inset, inset, size - inset - 1, size - inset - 1],
        radius=radius,
        fill="#0b1220",
    )

    # Maskable icons keep their content inside a safe circle, so the glyph is
    # drawn smaller when this flag is set.
    factor = 0.72 if maskable else 1.0
    cx, cy = size / 2, size / 2

    def point(x: int, y: int) -> tuple[float, float]:
        return (cx + (x - 256) * scale * factor, cy + (y - 256) * scale * factor)

    sun = 78 * scale * factor
    sun_center = point(330, 176)
    draw.ellipse(
        [sun_center[0] - sun, sun_center[1] - sun, sun_center[0] + sun, sun_center[1] + sun],
        fill="#ffb457",
    )

    cloud = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cloud_draw = ImageDraw.Draw(cloud)

    def ellipse(x0: int, y0: int, x1: int, y1: int) -> None:
        cloud_draw.ellipse([point(x0, y0), point(x1, y1)], fill="#e8eef9")

    ellipse(104, 244, 264, 384)
    ellipse(188, 208, 372, 372)
    ellipse(288, 250, 412, 366)
    cloud_draw.rectangle([point(150, 320), point(360, 384)], fill="#e8eef9")

    image.alpha_composite(cloud)
    return image


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    targets = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, False),
    ]
    for name, size, maskable in targets:
        make_icon(size, maskable=maskable).save(OUT / name)
        print(f"wrote {OUT / name} ({size}x{size})")


if __name__ == "__main__":
    main()
