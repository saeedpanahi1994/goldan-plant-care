from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw


@dataclass(frozen=True)
class Palette:
    bg: tuple[int, int, int, int] = (248, 255, 254, 255)  # #F8FFFE
    pot: tuple[int, int, int, int] = (46, 125, 50, 255)  # #2E7D32
    pot_highlight: tuple[int, int, int, int] = (76, 175, 80, 255)  # #4CAF50
    leaf: tuple[int, int, int, int] = (76, 175, 80, 255)  # #4CAF50
    leaf_dark: tuple[int, int, int, int] = (38, 118, 50, 255)
    circuit: tuple[int, int, int, int] = (46, 125, 50, 230)


def _rounded_rect(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_goldan_icon(size: int, *, with_background: bool, padding_ratio: float = 0.0) -> Image.Image:
    """Generate a simple 'plant pot + AI circuit' icon."""
    p = Palette()

    canvas = Image.new("RGBA", (size, size), p.bg if with_background else (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    pad = int(size * padding_ratio)
    left = pad
    top = pad
    right = size - pad
    bottom = size - pad

    w = right - left
    h = bottom - top

    # Pot geometry
    pot_top_y = top + int(h * 0.62)
    pot_bottom_y = top + int(h * 0.90)
    pot_top_w = int(w * 0.46)
    pot_bottom_w = int(w * 0.58)
    cx = left + w // 2

    pot_top_left = cx - pot_top_w // 2
    pot_top_right = cx + pot_top_w // 2
    pot_bottom_left = cx - pot_bottom_w // 2
    pot_bottom_right = cx + pot_bottom_w // 2

    pot_poly = [
        (pot_top_left, pot_top_y),
        (pot_top_right, pot_top_y),
        (pot_bottom_right, pot_bottom_y),
        (pot_bottom_left, pot_bottom_y),
    ]

    # Pot lip
    lip_h = max(2, int(h * 0.045))
    lip_box = (
        pot_top_left - int(w * 0.03),
        pot_top_y - lip_h,
        pot_top_right + int(w * 0.03),
        pot_top_y + lip_h,
    )
    _rounded_rect(draw, lip_box, radius=int(lip_h * 0.9), fill=p.pot)

    draw.polygon(pot_poly, fill=p.pot)

    # Pot highlight stripe
    stripe_w = max(2, int(w * 0.04))
    stripe_box = (
        cx - stripe_w // 2,
        pot_top_y + int(h * 0.02),
        cx + stripe_w // 2,
        pot_bottom_y - int(h * 0.03),
    )
    _rounded_rect(draw, stripe_box, radius=stripe_w // 2, fill=p.pot_highlight)

    # Stem
    stem_w = max(2, int(w * 0.02))
    stem_x = cx
    stem_top_y = top + int(h * 0.26)
    draw.line(
        [(stem_x, stem_top_y), (stem_x, pot_top_y - int(h * 0.02))],
        fill=p.leaf_dark,
        width=stem_w,
        joint="curve",
    )

    # Leaf: draw on its own layer and rotate for a softer look
    leaf_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ld = ImageDraw.Draw(leaf_layer)

    leaf_w = int(w * 0.42)
    leaf_h = int(h * 0.34)
    leaf_box = (
        cx - int(leaf_w * 0.1),
        top + int(h * 0.12),
        cx - int(leaf_w * 0.1) + leaf_w,
        top + int(h * 0.12) + leaf_h,
    )
    ld.ellipse(leaf_box, fill=p.leaf)

    # Leaf vein
    vein_w = max(1, int(w * 0.012))
    ld.line(
        [
            (leaf_box[0] + int(leaf_w * 0.18), leaf_box[1] + int(leaf_h * 0.78)),
            (leaf_box[0] + int(leaf_w * 0.72), leaf_box[1] + int(leaf_h * 0.24)),
        ],
        fill=(255, 255, 255, 160),
        width=vein_w,
    )

    leaf_layer = leaf_layer.rotate(-18, resample=Image.Resampling.BICUBIC, center=(cx, top + int(h * 0.30)))
    canvas.alpha_composite(leaf_layer)

    # AI circuit cluster (top-right)
    # A small node network to hint "AI" without text.
    node_r = max(2, int(w * 0.022))
    n1 = (left + int(w * 0.70), top + int(h * 0.22))
    n2 = (left + int(w * 0.84), top + int(h * 0.18))
    n3 = (left + int(w * 0.84), top + int(h * 0.32))
    n4 = (left + int(w * 0.74), top + int(h * 0.36))

    for a, b in [(n1, n2), (n1, n3), (n1, n4), (n4, (stem_x, stem_top_y + int(h * 0.05)))]:
        draw.line([a, b], fill=p.circuit, width=max(2, int(w * 0.01)))

    for n in [n1, n2, n3, n4]:
        draw.ellipse([n[0] - node_r, n[1] - node_r, n[0] + node_r, n[1] + node_r], fill=p.pot_highlight)

    return canvas


def save_png(img: Image.Image, path: Path, size: int):
    out = img.resize((size, size), resample=Image.Resampling.LANCZOS)
    out.save(path, format="PNG", optimize=True)


def main() -> int:
    repo_root = Path(__file__).resolve().parents[2]
    frontend_dir = repo_root / "frontend"

    public_dir = frontend_dir / "public"
    android_res = frontend_dir / "android" / "app" / "src" / "main" / "res"

    # Web/PWA assets
    base_web = draw_goldan_icon(1024, with_background=True)
    save_png(base_web, public_dir / "logo512.png", 512)
    save_png(base_web, public_dir / "logo192.png", 192)

    # Favicon (ICO)
    favicon = draw_goldan_icon(256, with_background=True)
    favicon.save(
        public_dir / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64)],
    )

    # Android launcher icons (legacy)
    legacy_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    base_legacy = draw_goldan_icon(1024, with_background=True)
    for folder, px in legacy_sizes.items():
        d = android_res / folder
        save_png(base_legacy, d / "ic_launcher.png", px)
        save_png(base_legacy, d / "ic_launcher_round.png", px)

    # Android adaptive foreground icons: transparent with padding (safe zone)
    base_foreground = draw_goldan_icon(1024, with_background=False, padding_ratio=0.12)
    foreground_sizes = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432,
    }
    for folder, px in foreground_sizes.items():
        d = android_res / folder
        save_png(base_foreground, d / "ic_launcher_foreground.png", px)

    print("Generated icon assets for web + Android.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
