from __future__ import annotations

import math
from pathlib import Path

import cv2
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "assets" / "program-flyers"
CANVAS = (1700, 2400)
PROGRAM_URL = "https://www.agent-tech.ai/agentech-education/agentech-ff-eai-robotics-future-founder-immersion-program"
DISPLAY_URL_LINE_1 = "www.agent-tech.ai/agentech-education/"
DISPLAY_URL_LINE_2 = "agentech-ff-eai-robotics-future-founder-immersion-program"

ASSETS = {
    "agentech": ROOT / "public" / "assets" / "logo" / "AGENTECH-white-official.png",
    "ff": ROOT / "public" / "assets" / "partners" / "faraday_future_gray.png",
    "robot": ROOT / "public" / "assets" / "ff-robotics" / "ff-master-x2-hero.jpg",
    "lab": ROOT / "public" / "assets" / "ff-robotics" / "day-1-ai-branded-lab-arrival.png",
    "mentor": ROOT / "public" / "assets" / "ff-robotics" / "day-6-ai-branded-engineering-sprint.png",
    "hackathon": ROOT / "public" / "assets" / "ff-robotics" / "day-9-ai-branded-hackathon.png",
    "demo": ROOT / "public" / "assets" / "ff-robotics" / "day-10-ai-branded-demo-day.png",
    "chip": ROOT / "public" / "assets" / "ff-robotics" / "ff-official-x2-chip-jetson.jpg",
}

FONTS = {
    "display": "/System/Library/Fonts/HelveticaNeue.ttc",
    "body": "/System/Library/Fonts/HelveticaNeue.ttc",
    "zh": "/System/Library/Fonts/Supplemental/Hiragino Sans GB.ttc",
    "zh_fallback": "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "mono": "/System/Library/Fonts/SFNSMono.ttf",
}

WHITE = (246, 248, 251, 255)
MUTED = (201, 211, 223, 230)
DIM = (152, 164, 180, 220)
ORANGE = (255, 96, 54, 255)
CYAN = (92, 207, 237, 255)
DARK = (8, 14, 24, 255)


def font(path: str, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size=size, index=index)
    except TypeError:
        return ImageFont.truetype(path, size=size)
    except OSError:
        return ImageFont.load_default(size=size)


def f_en(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return font(FONTS["display"], size, 1 if bold else 0)


def f_zh(size: int) -> ImageFont.FreeTypeFont:
    if Path(FONTS["zh"]).exists():
        return font(FONTS["zh"], size)
    return font(FONTS["zh_fallback"], size)


def f_mono(size: int) -> ImageFont.FreeTypeFont:
    return font(FONTS["mono"], size)


def cover_image(path: Path, size: tuple[int, int], crop_bias: tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    image = Image.open(path).convert("RGB")
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((int(image.width * scale), int(image.height * scale)), Image.Resampling.LANCZOS)
    left = int((resized.width - target_w) * crop_bias[0])
    top = int((resized.height - target_h) * crop_bias[1])
    return resized.crop((left, top, left + target_w, top + target_h))


def crop_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bbox = rgba.getbbox()
    return rgba.crop(bbox) if bbox else rgba


def paste_contain(base: Image.Image, overlay: Image.Image, box: tuple[int, int, int, int], opacity: float = 1.0) -> None:
    x1, y1, x2, y2 = box
    w, h = x2 - x1, y2 - y1
    image = crop_alpha(overlay)
    scale = min(w / image.width, h / image.height)
    image = image.resize((max(1, int(image.width * scale)), max(1, int(image.height * scale))), Image.Resampling.LANCZOS)
    if opacity < 1:
        image.putalpha(image.getchannel("A").point(lambda value: int(value * opacity)))
    base.alpha_composite(image, (x1 + (w - image.width) // 2, y1 + (h - image.height) // 2))


def ff_white_mark() -> Image.Image:
    src = Image.open(ASSETS["ff"]).convert("RGBA")
    px = src.load()
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = px[x, y]
            if a == 0 or (r > 235 and g > 235 and b > 235):
                px[x, y] = (255, 255, 255, 0)
            else:
                px[x, y] = (255, 255, 255, 225)
    return crop_alpha(src)


def rounded_paste(base: Image.Image, image: Image.Image, box: tuple[int, int, int, int], radius: int, opacity: float = 1.0) -> None:
    x1, y1, x2, y2 = box
    image = cover_to_box(image.convert("RGB"), (x2 - x1, y2 - y1)).convert("RGBA")
    if opacity < 1:
        image.putalpha(image.getchannel("A").point(lambda value: int(value * opacity)))
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, image.width, image.height), radius=radius, fill=255)
    base.paste(image, (x1, y1), mask)


def cover_to_box(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((int(image.width * scale), int(image.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def draw_background(base: Image.Image) -> None:
    width, height = base.size
    px = base.load()
    for y in range(height):
        yy = y / height
        for x in range(width):
            xx = x / width
            right_glow = max(0, 1 - math.dist((xx, yy), (0.78, 0.20)) * 1.75)
            lower_glow = max(0, 1 - math.dist((xx, yy), (0.55, 0.82)) * 2.2)
            r = int(3 + 50 * right_glow + 8 * lower_glow)
            g = int(8 + 58 * right_glow + 12 * lower_glow)
            b = int(15 + 64 * right_glow + 18 * lower_glow)
            px[x, y] = (r, g, b, 255)
    draw = ImageDraw.Draw(base, "RGBA")
    draw.rectangle((0, 0, 760, height), fill=(0, 0, 0, 92))
    for y in range(760, height):
        alpha = min(132, int((y - 760) / 520 * 132))
        draw.line((0, y, width, y), fill=(2, 8, 15, alpha))


def draw_program_mark(base: Image.Image, draw: ImageDraw.ImageDraw) -> None:
    paste_contain(base, Image.open(ASSETS["agentech"]), (82, 80, 405, 128), opacity=0.98)
    draw.line((432, 64, 432, 142), fill=(255, 255, 255, 160), width=2)
    paste_contain(base, ff_white_mark(), (466, 54, 560, 154), opacity=0.95)
    draw.text((600, 72), "EAI ROBOTICS FUTURE FOUNDER", font=f_mono(24), fill=(255, 255, 255, 216))
    draw.text((600, 110), "IMMERSION PROGRAM", font=f_mono(24), fill=(255, 255, 255, 216))


def draw_pill(draw: ImageDraw.ImageDraw, text: str, is_zh: bool) -> None:
    font_obj = f_zh(30) if is_zh else f_en(27, True)
    x1, y1, x2, y2 = 1220, 72, 1612, 130
    draw.rounded_rectangle((x1, y1, x2, y2), radius=29, fill=(255, 255, 255, 238))
    bbox = draw.textbbox((0, 0), text, font=font_obj)
    draw.text((x1 + (x2 - x1 - (bbox[2] - bbox[0])) // 2, y1 + (y2 - y1 - (bbox[3] - bbox[1])) // 2 - 2), text, font=font_obj, fill=(16, 20, 27, 255))


def draw_text_shadow(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font_obj: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
    stroke: int = 0,
) -> None:
    x, y = xy
    draw.text((x + 6, y + 8), text, font=font_obj, fill=(0, 0, 0, 155), stroke_width=stroke, stroke_fill=(0, 0, 0, 160))
    draw.text((x, y), text, font=font_obj, fill=fill, stroke_width=stroke, stroke_fill=(0, 0, 0, 210))


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont, max_width: int, zh: bool = False) -> list[str]:
    if zh:
        lines: list[str] = []
        current = ""
        for char in text:
            trial = current + char
            if draw.textbbox((0, 0), trial, font=font_obj)[2] <= max_width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = char
        if current:
            lines.append(current)
        return lines

    lines = []
    current = ""
    for word in text.split():
        trial = f"{current} {word}".strip()
        if draw.textbbox((0, 0), trial, font=font_obj)[2] <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font_obj: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int, int],
    max_width: int,
    line_gap: int,
    zh: bool = False,
) -> int:
    x, y = xy
    for line in wrap_text(draw, text, font_obj, max_width, zh=zh):
        draw.text((x, y), line, font=font_obj, fill=fill)
        bbox = draw.textbbox((x, y), line, font=font_obj)
        y += bbox[3] - bbox[1] + line_gap
    return y


def paste_circle(base: Image.Image, image: Image.Image, center: tuple[int, int], diameter: int, outline: tuple[int, int, int, int]) -> None:
    img = cover_to_box(image.convert("RGB"), (diameter, diameter)).convert("RGBA")
    mask = Image.new("L", (diameter, diameter), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, diameter, diameter), fill=255)
    x = center[0] - diameter // 2
    y = center[1] - diameter // 2
    base.paste(img, (x, y), mask)
    draw = ImageDraw.Draw(base, "RGBA")
    draw.ellipse((x - 5, y - 5, x + diameter + 5, y + diameter + 5), outline=(255, 255, 255, 230), width=5)
    draw.ellipse((x - 12, y - 12, x + diameter + 12, y + diameter + 12), outline=outline, width=5)


def draw_icon(draw: ImageDraw.ImageDraw, kind: str, center: tuple[int, int], color: tuple[int, int, int, int]) -> None:
    x, y = center
    draw.ellipse((x - 37, y - 37, x + 37, y + 37), outline=color, width=3)
    if kind == "robot":
        draw.rounded_rectangle((x - 18, y - 16, x + 18, y + 15), radius=5, outline=color, width=3)
        draw.line((x, y - 16, x, y - 28), fill=color, width=3)
        draw.ellipse((x - 3, y - 34, x + 3, y - 28), fill=color)
        draw.ellipse((x - 9, y - 4, x - 4, y + 1), fill=color)
        draw.ellipse((x + 4, y - 4, x + 9, y + 1), fill=color)
        draw.line((x - 11, y + 23, x + 11, y + 23), fill=color, width=3)
    elif kind == "code":
        draw.line((x - 19, y, x - 5, y - 14), fill=color, width=4)
        draw.line((x - 19, y, x - 5, y + 14), fill=color, width=4)
        draw.line((x + 19, y, x + 5, y - 14), fill=color, width=4)
        draw.line((x + 19, y, x + 5, y + 14), fill=color, width=4)
        draw.line((x - 1, y + 19, x + 8, y - 19), fill=color, width=4)
    elif kind == "trophy":
        draw.rounded_rectangle((x - 17, y - 18, x + 17, y + 8), radius=4, outline=color, width=3)
        draw.line((x, y + 8, x, y + 24), fill=color, width=3)
        draw.line((x - 18, y + 24, x + 18, y + 24), fill=color, width=3)
        draw.arc((x - 35, y - 14, x - 10, y + 13), 270, 90, fill=color, width=3)
        draw.arc((x + 10, y - 14, x + 35, y + 13), 90, 270, fill=color, width=3)
    elif kind == "presentation":
        draw.rectangle((x - 22, y - 18, x + 22, y + 12), outline=color, width=3)
        draw.line((x - 25, y - 22, x + 25, y - 22), fill=color, width=3)
        draw.line((x, y + 12, x, y + 25), fill=color, width=3)
        draw.line((x, y + 18, x - 13, y + 27), fill=color, width=3)
        draw.line((x, y + 18, x + 13, y + 27), fill=color, width=3)
    elif kind == "calendar":
        draw.rounded_rectangle((x - 22, y - 18, x + 22, y + 22), radius=4, outline=color, width=3)
        draw.line((x - 22, y - 5, x + 22, y - 5), fill=color, width=3)
        draw.line((x - 9, y - 24, x - 9, y - 12), fill=color, width=3)
        draw.line((x + 9, y - 24, x + 9, y - 12), fill=color, width=3)
    elif kind == "clock":
        draw.ellipse((x - 22, y - 22, x + 22, y + 22), outline=color, width=3)
        draw.line((x, y, x, y - 13), fill=color, width=3)
        draw.line((x, y, x + 11, y + 8), fill=color, width=3)
    elif kind == "pin":
        draw.ellipse((x - 18, y - 26, x + 18, y + 10), outline=color, width=3)
        draw.ellipse((x - 6, y - 14, x + 6, y - 2), outline=color, width=3)
        draw.line((x - 13, y + 7, x, y + 29), fill=color, width=3)
        draw.line((x + 13, y + 7, x, y + 29), fill=color, width=3)
    elif kind == "users":
        draw.ellipse((x - 21, y - 17, x - 3, y + 1), outline=color, width=3)
        draw.ellipse((x + 6, y - 18, x + 22, y - 2), outline=color, width=3)
        draw.arc((x - 29, y + 3, x + 4, y + 31), 200, 340, fill=color, width=3)
        draw.arc((x - 1, y + 3, x + 30, y + 30), 200, 340, fill=color, width=3)


def draw_feature(draw: ImageDraw.ImageDraw, x: int, y: int, feature: tuple[str, str, str, str], is_zh: bool) -> None:
    num, icon, title, body = feature
    draw.rounded_rectangle((x - 18, y - 20, x + 330, y + 236), radius=18, fill=(5, 13, 22, 246), outline=(255, 255, 255, 54), width=1)
    draw_icon(draw, icon, (x, y + 38), ORANGE)
    draw.text((x + 78, y + 6), num, font=f_mono(23), fill=ORANGE)
    title_font = f_zh(28) if is_zh else f_en(27, True)
    body_font = f_zh(20) if is_zh else f_en(19)
    stroke = 1 if is_zh else 0
    title_y = y + 41
    title_lines = title.split("\n")
    line_step = 36 if is_zh else 31
    for idx, line in enumerate(title_lines):
        draw.text(
            (x + 78, title_y + idx * line_step),
            line,
            font=title_font,
            fill=WHITE,
            stroke_width=stroke,
            stroke_fill=(0, 0, 0, 150),
        )
    body_y = title_y + len(title_lines) * line_step + 15
    draw_wrapped(draw, (x + 78, body_y), body, body_font, (218, 224, 232, 218), 230, 6, zh=is_zh)


def draw_snapshot_card(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], icon: str, label: str, value: str, is_zh: bool) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=18, fill=(12, 19, 29, 246), outline=(255, 255, 255, 92), width=1)
    draw_icon(draw, icon, (x1 + 58, y1 + 58), ORANGE)
    draw.text((x1 + 116, y1 + 38), label.upper() if not is_zh else label, font=f_zh(19) if is_zh else f_mono(18), fill=(218, 226, 236, 195))
    draw_wrapped(draw, (x1 + 116, y1 + 82), value, f_zh(31) if is_zh else f_en(30, True), WHITE, x2 - x1 - 145, 7, zh=is_zh)


def draw_book_mockup(base: Image.Image) -> None:
    book = Image.new("RGBA", (245, 315), (0, 0, 0, 0))
    d = ImageDraw.Draw(book, "RGBA")
    d.rounded_rectangle((22, 12, 215, 296), radius=12, fill=(13, 18, 24, 255), outline=(255, 255, 255, 80), width=2)
    d.line((48, 46, 188, 26), fill=ORANGE, width=2)
    d.text((48, 78), "EAI ROBOTICS", font=f_en(18, True), fill=WHITE)
    d.text((48, 106), "FUTURE FOUNDER", font=f_en(18, True), fill=ORANGE)
    d.text((48, 134), "IMMERSION", font=f_en(18, True), fill=WHITE)
    d.text((48, 162), "PROGRAM", font=f_en(18, True), fill=WHITE)
    d.text((48, 244), "PROGRAM GUIDE", font=f_mono(13), fill=(210, 218, 228, 190))
    robot = cover_image(ASSETS["robot"], (68, 120), crop_bias=(0.64, 0.44)).convert("RGBA")
    book.alpha_composite(robot, (132, 154))
    book = book.rotate(-6, expand=True, resample=Image.Resampling.BICUBIC)
    base.alpha_composite(book, (130, 2010))


def make_qr_image(target_url: str, size: int) -> Image.Image:
    qr_array = cv2.QRCodeEncoder_create().encode(target_url)
    qr = Image.fromarray(qr_array).convert("L")
    qr = qr.point(lambda value: 0 if value < 128 else 255)
    quiet_zone = 4
    bordered = Image.new("L", (qr.width + quiet_zone * 2, qr.height + quiet_zone * 2), 255)
    bordered.paste(qr, (quiet_zone, quiet_zone))
    return bordered.resize((size, size), Image.Resampling.NEAREST).convert("RGBA")


def draw_qr_code(base: Image.Image, draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], is_zh: bool) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=16, fill=(255, 255, 255, 255), outline=(30, 35, 42, 185), width=2)
    padding = 16
    qr = make_qr_image(PROGRAM_URL, x2 - x1 - padding * 2)
    base.alpha_composite(qr, (x1 + padding, y1 + padding))
    label = "扫码查看项目页" if is_zh else "SCAN PROGRAM PAGE"
    bbox = draw.textbbox((0, 0), label, font=f_mono(13))
    draw.text((x1 + (x2 - x1 - (bbox[2] - bbox[0])) // 2, y1 - 24), label, font=f_mono(13), fill=(60, 65, 74, 255))


def draw_cta(base: Image.Image, draw: ImageDraw.ImageDraw, is_zh: bool) -> None:
    x1, y1, x2, y2 = 82, 1955, 1618, 2246
    draw.rounded_rectangle((x1, y1, x2, y2), radius=18, fill=(248, 250, 252, 252), outline=(255, 255, 255, 110), width=2)
    draw_book_mockup(base)
    label = "了解详情" if is_zh else "LEARN MORE"
    title = "课程详情\n+ 兴趣申请" if is_zh else "PROGRAM DETAILS\n+ INTEREST FORM"
    draw.text((520, 2010), label, font=f_zh(25) if is_zh else f_mono(22), fill=ORANGE)
    draw_wrapped(draw, (520, 2060), title, f_zh(50) if is_zh else f_en(47, True), (16, 21, 29, 255), 560, 7, zh=is_zh)
    draw.text((520, 2176), DISPLAY_URL_LINE_1, font=f_mono(25), fill=ORANGE)
    draw.text((520, 2216), DISPLAY_URL_LINE_2, font=f_mono(18), fill=(32, 38, 47, 232))
    draw_qr_code(base, draw, (1324, 2020, 1538, 2234), is_zh)


def create_flyer(language: str) -> Image.Image:
    is_zh = language == "zh"
    base = Image.new("RGBA", CANVAS, (0, 0, 0, 255))
    draw_background(base)
    draw = ImageDraw.Draw(base, "RGBA")

    lab = cover_image(ASSETS["lab"], (CANVAS[0], 740), crop_bias=(0.5, 0.42)).convert("RGBA")
    lab.putalpha(42)
    base.alpha_composite(lab, (0, 0))
    draw.rectangle((0, 0, CANVAS[0], 760), fill=(0, 0, 0, 90))

    robot = cover_image(ASSETS["robot"], (720, 1080), crop_bias=(0.63, 0.38)).convert("RGBA")
    fade = Image.new("L", robot.size, 255)
    fd = ImageDraw.Draw(fade)
    for y in range(robot.height):
        for x in range(robot.width):
            alpha = 255
            if x < 110:
                alpha = min(alpha, int(255 * x / 110))
            if y > 650:
                alpha = min(alpha, max(0, 255 - int((y - 650) * 0.75)))
            fade.putpixel((x, y), alpha)
    fade = fade.filter(ImageFilter.GaussianBlur(1.6))
    robot.putalpha(fade)
    base.alpha_composite(robot, (878, 230))

    draw_program_mark(base, draw)
    draw_pill(draw, "适合 9-12 年级" if is_zh else "SUITABLE FOR GRADES 9-12", is_zh)

    paste_circle(base, cover_image(ASSETS["mentor"], (260, 260), crop_bias=(0.48, 0.45)), (1125, 910), 230, ORANGE)
    paste_circle(base, cover_image(ASSETS["chip"], (180, 180), crop_bias=(0.5, 0.5)), (1345, 1094), 138, CYAN)
    paste_circle(base, cover_image(ASSETS["demo"], (180, 180), crop_bias=(0.5, 0.48)), (1480, 1230), 158, (255, 255, 255, 200))

    draw = ImageDraw.Draw(base, "RGBA")
    draw.text((84, 270), "AI ROBOTICS STARTUP CAMP", font=f_mono(25), fill=ORANGE)
    if is_zh:
        title_lines = [("具身智能机器人", WHITE), ("未来创始人", ORANGE), ("沉浸项目", WHITE)]
        y = 342
        for text, fill in title_lines:
            draw_text_shadow(draw, (82, y), text, f_zh(78), fill, stroke=1)
            y += 100
        draw.text((88, 656), "EAI Robotics Future Founder Immersion Program", font=f_en(28, True), fill=(218, 228, 241, 225))
        lead_y = 720
        lead_font = f_zh(35)
        lead2_font = f_zh(25)
        lead = "两期 5 天进入真实机器人公司环境"
        hook = "可选第一期 第二期 或两期联报 每期都有构建冲刺和 Demo 路演"
        cta = "兴趣申请开放"
    else:
        title_lines = [("EAI ROBOTICS", WHITE), ("FUTURE FOUNDER", ORANGE), ("IMMERSION", WHITE), ("PROGRAM", WHITE)]
        y = 338
        for text, fill in title_lines:
            draw_text_shadow(draw, (82, y), text, f_en(76, True), fill, stroke=1)
            y += 84
        lead_y = 716
        lead_font = f_en(34, True)
        lead2_font = f_en(25)
        lead = "Two 5-day sessions inside a real robotics company."
        hook = "Choose Session 1, Session 2, or both. Each session ends with a mini hackathon and pitch."
        cta = "INTEREST LIST OPEN"

    draw.line((84, lead_y - 28, 146, lead_y - 28), fill=ORANGE, width=6)
    lead_end = draw_wrapped(draw, (86, lead_y), lead, lead_font, WHITE, 660, 8, zh=is_zh)
    draw_wrapped(draw, (86, lead_end + 16), hook, lead2_font, (222, 229, 238, 220), 560, 7, zh=is_zh)
    draw.rounded_rectangle((86, lead_end + 112, 440, lead_end + 176), radius=32, fill=ORANGE)
    draw.text((130, lead_end + 128), cta, font=f_zh(27) if is_zh else f_en(25, True), fill=WHITE)

    feature_y = 1098
    features = (
        [
            ("01", "robot", "两期 5 天选择", "可选第一期 第二期 或两期联报 每期都是完整体验"),
            ("02", "code", "内容不重复", "第一期聚焦机器人创业构建 第二期聚焦 AI 产品与自主能力"),
            ("03", "trophy", "每期 Hackathon", "第 4 天启动构建冲刺 第 5 天完成 Demo 与路演"),
            ("04", "presentation", "价格明确", "每期价格清楚 两期联报更优惠"),
        ]
        if is_zh
        else [
            ("01", "robot", "TWO 5-DAY\nOPTIONS", "Choose Session 1, Session 2, or both. Each session stands alone."),
            ("02", "code", "NON-REPEATING\nCONTENT", "Session 1 builds a venture; Session 2 builds an AI robotics product."),
            ("03", "trophy", "HACKATHON\nEACH SESSION", "Day 4 kicks off the sprint. Day 5 brings demo, pitch, and Q&A."),
            ("04", "presentation", "CLEAR\nPRICING", "$1,399 per session or $2,500 for both sessions."),
        ]
    )
    for x, feature in zip([84, 485, 890, 1290], features):
        draw_feature(draw, x, feature_y, feature, is_zh)

    draw.text((84, 1462), "项目速览" if is_zh else "PROGRAM SNAPSHOT", font=f_zh(29) if is_zh else f_mono(23), fill=(255, 255, 255, 220))
    snapshot = (
        [
            ("calendar", "时间", "7 月上旬\n+ 7 月下旬"),
            ("clock", "选择", "第一期 / 第二期\n/ 两期联报"),
            ("users", "价格", "$1,399 每期\n$2,500 两期"),
            ("pin", "地点", "FF 总部\n近 LAX"),
        ]
        if is_zh
        else [
            ("calendar", "Time", "Early + Late\nJuly 2026"),
            ("clock", "Options", "Session 1 / 2\nor both"),
            ("users", "Pricing", "$1,399 each\n$2,500 both"),
            ("pin", "Location", "FF Headquarters\nnear LAX"),
        ]
    )
    card_y = 1518
    for idx, (icon, label, value) in enumerate(snapshot):
        x1 = 82 + idx * 388
        draw_snapshot_card(draw, (x1, card_y, x1 + 360, card_y + 188), icon, label, value, is_zh)

    draw_cta(base, draw, is_zh)
    draw.text((82, 2324), "Agentech × FF", font=f_mono(22), fill=(213, 220, 230, 180))
    footer = "EAI Robotics Future Founder Immersion Program"
    bbox = draw.textbbox((0, 0), footer, font=f_mono(22))
    draw.text(((CANVAS[0] - (bbox[2] - bbox[0])) // 2, 2324), footer, font=f_mono(22), fill=(213, 220, 230, 180))
    draw.text((1428, 2324), "agent-tech.ai", font=f_mono(22), fill=(213, 220, 230, 190))
    return base.convert("RGB")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for language in ("en", "zh"):
        image = create_flyer(language)
        output = OUT_DIR / f"eai-robotics-future-founder-immersion-program-flyer-{language}.png"
        image.save(output, quality=96)
        print(output)


if __name__ == "__main__":
    main()
