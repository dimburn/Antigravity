"""GTO Dojo アイコン生成スクリプト — Pillow で PNG を直接描画"""
from PIL import Image, ImageDraw, ImageFont
import math, os

def make_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = size / 512  # スケール係数

    # --- 背景 (角丸長方形) ---
    r = int(90 * s)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=(10, 10, 26, 255))

    # グラデーション風: 右下を少し明るく
    overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(size):
        alpha = int(20 * (i / size))
        od.line([(i, 0), (i, size)], fill=(26, 26, 62, alpha))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    # --- 中央グロー ---
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = int(256 * s), int(220 * s)
    for radius in range(int(180 * s), 0, -1):
        alpha = int(8 * (1 - radius / (180 * s)))
        gd.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                    fill=(139, 92, 246, alpha))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # --- スペードシンボル ---
    def draw_spade(draw, cx, cy, scale):
        # スペード頂点のパス (近似ポリゴン)
        pts = []
        # 上部: 丸い二つのこぶ
        for deg in range(0, 361, 5):
            rad = math.radians(deg)
            # 左のこぶ
            if deg <= 180:
                bx = cx - 32 * scale + 38 * scale * math.cos(rad)
                by = cy - 10 * scale + 38 * scale * math.sin(rad)

        # 簡略化: ポリゴンで描画
        top = cy - int(100 * scale)
        left_bulge = cx - int(70 * scale)
        right_bulge = cx + int(70 * scale)
        mid_y = cy + int(10 * scale)
        bottom_y = cy + int(55 * scale)

        spade_pts = [
            (cx, top),
            (cx - int(20 * scale), top + int(20 * scale)),
            (left_bulge, cy - int(20 * scale)),
            (left_bulge, mid_y),
            (cx - int(40 * scale), mid_y + int(25 * scale)),
            (cx - int(15 * scale), bottom_y),
            (cx, cy + int(40 * scale)),
            (cx + int(15 * scale), bottom_y),
            (cx + int(40 * scale), mid_y + int(25 * scale)),
            (right_bulge, mid_y),
            (right_bulge, cy - int(20 * scale)),
            (cx + int(20 * scale), top + int(20 * scale)),
        ]

        # グロー
        glow_layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow_layer)
        for offset in range(int(8 * scale), 0, -1):
            alpha = int(15 * (1 - offset / (8 * scale)))
            expanded = [(x + (x - cx) * offset * 0.02, y + (y - cy) * offset * 0.02)
                        for x, y in spade_pts]
            gd.polygon(expanded, fill=(139, 92, 246, alpha))

        # 本体
        draw.polygon(spade_pts, fill=(139, 92, 246, 230))

        # 茎
        stem_w = int(8 * scale)
        stem_top = cy + int(35 * scale)
        stem_bot = cy + int(80 * scale)
        draw.rounded_rectangle(
            [cx - stem_w, stem_top, cx + stem_w, stem_bot],
            radius=int(4 * scale),
            fill=(139, 92, 246, 210)
        )

        # 足元の楕円
        draw.ellipse(
            [cx - int(25 * scale), stem_bot - int(5 * scale),
             cx + int(25 * scale), stem_bot + int(10 * scale)],
            fill=(139, 92, 246, 180)
        )

        return glow_layer

    glow_layer = draw_spade(draw, int(256 * s), int(210 * s), s)
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img)

    # --- 金帯 ---
    belt_y = int(225 * s)
    belt_h = int(12 * s)
    belt_x1 = int(140 * s)
    belt_x2 = int(372 * s)
    draw.rounded_rectangle(
        [belt_x1, belt_y, belt_x2, belt_y + belt_h],
        radius=int(6 * s),
        fill=(245, 158, 11, 220)
    )
    # 帯の結び目
    knot_r = int(10 * s)
    knot_cx = int(256 * s)
    knot_cy = belt_y + belt_h // 2
    draw.ellipse(
        [knot_cx - knot_r, knot_cy - knot_r, knot_cx + knot_r, knot_cy + knot_r],
        outline=(251, 191, 36, 230), width=max(1, int(3 * s))
    )

    # --- テキスト "GTO" ---
    try:
        font_gto = ImageFont.truetype("arial.ttf", int(52 * s))
        font_dojo = ImageFont.truetype("arial.ttf", int(30 * s))
    except:
        font_gto = ImageFont.load_default()
        font_dojo = ImageFont.load_default()

    # GTO
    gto_text = "GTO"
    bbox = draw.textbbox((0, 0), gto_text, font=font_gto)
    tw = bbox[2] - bbox[0]
    gto_x = int(256 * s) - tw // 2
    gto_y = int(330 * s)
    # テキストグロー
    for off in range(int(6 * s), 0, -1):
        alpha = int(30 * (1 - off / (6 * s)))
        draw.text((gto_x, gto_y), gto_text, font=font_gto, fill=(139, 92, 246, alpha))
    draw.text((gto_x, gto_y), gto_text, font=font_gto, fill=(139, 92, 246, 255))

    # DOJO
    dojo_text = "DOJO"
    bbox2 = draw.textbbox((0, 0), dojo_text, font=font_dojo)
    tw2 = bbox2[2] - bbox2[0]
    dojo_x = int(256 * s) - tw2 // 2
    dojo_y = int(380 * s)
    draw.text((dojo_x, dojo_y), dojo_text, font=font_dojo, fill=(232, 232, 240, 180))

    # --- コーナー装飾 ---
    corner_color = (139, 92, 246, 80)
    cl = int(30 * s)
    cw = max(1, int(3 * s))
    margin = int(40 * s)
    # 左上
    draw.rounded_rectangle([margin, margin, margin + cl, margin + cw], radius=1, fill=corner_color)
    draw.rounded_rectangle([margin, margin, margin + cw, margin + cl], radius=1, fill=corner_color)
    # 右上
    draw.rounded_rectangle([size - margin - cl, margin, size - margin, margin + cw], radius=1, fill=corner_color)
    draw.rounded_rectangle([size - margin - cw, margin, size - margin, margin + cl], radius=1, fill=corner_color)
    # 左下
    draw.rounded_rectangle([margin, size - margin - cw, margin + cl, size - margin], radius=1, fill=corner_color)
    draw.rounded_rectangle([margin, size - margin - cl, margin + cw, size - margin], radius=1, fill=corner_color)
    # 右下
    draw.rounded_rectangle([size - margin - cl, size - margin - cw, size - margin, size - margin], radius=1, fill=corner_color)
    draw.rounded_rectangle([size - margin - cw, size - margin - cl, size - margin, size - margin], radius=1, fill=corner_color)

    return img

if __name__ == '__main__':
    out_dir = r'c:\Users\daisuke-nakagawa\Desktop\Antigravity\product\gto_dojo\assets\icons'
    os.makedirs(out_dir, exist_ok=True)

    for sz in [192, 512]:
        icon = make_icon(sz)
        path = os.path.join(out_dir, f'icon-{sz}.png')
        icon.save(path, 'PNG')
        print(f'✅ Generated {path} ({sz}x{sz})')
