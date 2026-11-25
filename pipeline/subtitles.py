"""Word-level subtitle generation.

Captions are built from Whisper words (never from whole segments), grouped into
2–4 word phrases, and every word gets its own ASS event so the active word can
be highlighted. The same words are exported as SRT and VTT next to the clip.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .config import FONTS_DIR

ACCENT = "&H003EFFD7"  # lime #D7FF3E in ABGR
WHITE = "&H00FFFFFF"
BLACK = "&H00141414"
DARK = "&H00101010"

PRESETS: dict[str, dict[str, object]] = {
    "bold": {"font": "Anton", "size": 96, "outline": 7, "shadow": 3, "border": 1, "back": "&H80000000", "accent": ACCENT},
    "clean": {"font": "Bebas Neue", "size": 108, "outline": 5, "shadow": 2, "border": 1, "back": "&H80000000", "accent": "&H005AA0FF"},
    "box": {"font": "Noto Sans", "size": 84, "outline": 2, "shadow": 0, "border": 3, "back": "&H66000000", "accent": ACCENT},
}

CJK = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]")


@dataclass
class Word:
    start: float
    end: float
    text: str
    probability: float = 1.0


@dataclass
class Phrase:
    start: float
    end: float
    words: list[Word]


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def _is_cjk(text: str) -> bool:
    return bool(CJK.search(text))


def join_words(words: list[Word]) -> str:
    if not words:
        return ""
    if _is_cjk("".join(word.text for word in words)):
        return "".join(word.text.strip() for word in words)
    return _clean(" ".join(word.text.strip() for word in words))


def group_phrases(words: list[Word], max_words: int = 3, max_seconds: float = 2.4) -> list[Phrase]:
    phrases: list[Phrase] = []
    current: list[Word] = []
    for word in words:
        candidate = current + [word]
        duration = candidate[-1].end - candidate[0].start
        punctuation = bool(re.search(r"[.!?,;:…]$", word.text.strip()))
        too_long = len(candidate) > max_words or duration > max_seconds
        if current and (too_long or punctuation):
            phrases.append(Phrase(current[0].start, current[-1].end, current))
            current = []
        if punctuation and not current:
            phrases.append(Phrase(word.start, word.end, [word]))
            continue
        current.append(word)
    if current:
        phrases.append(Phrase(current[0].start, current[-1].end, current))

    # 2–4 words per line: fold lone words into a neighbour when they are close.
    merged: list[Phrase] = []
    for phrase in phrases:
        if merged and len(phrase.words) == 1 and len(merged[-1].words) < max_words and phrase.start - merged[-1].end < 0.8:
            merged[-1].words.extend(phrase.words)
            merged[-1].end = max(merged[-1].end, phrase.end)
        else:
            merged.append(phrase)
    for index in range(len(merged) - 1, 0, -1):
        if len(merged[index].words) == 1 and len(merged[index - 1].words) < max_words:
            merged[index - 1].words.extend(merged[index].words)
            merged[index - 1].end = max(merged[index - 1].end, merged[index].end)
            merged.pop(index)

    # A phrase must last at least 0.35 s, otherwise it flashes.
    for phrase in merged:
        if phrase.end - phrase.start < 0.35:
            phrase.end = phrase.start + 0.35
    return merged


def ass_header(preset: str = "bold") -> str:
    style = PRESETS.get(preset, PRESETS["bold"])
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,{style['font']},{style['size']},{WHITE},{style['accent']},{DARK},{style['back']},-1,0,0,0,100,100,0,0,{style['border']},{style['outline']},{style['shadow']},2,80,80,520,1
Style: Title,{style['font']},{max(64, int(style['size']) - 12)},{WHITE},{style['accent']},{DARK},&H66000000,-1,0,0,0,100,100,0,0,3,6,0,8,100,100,170,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def _stamp(seconds: float) -> str:
    seconds = max(0.0, seconds)
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:d}:{minutes:02d}:{secs:05.2f}"


def build_ass(words: list[Word], clip_start: float, title: str | None = None, preset: str = "bold") -> str:
    """ASS with one event per word; the active word is tinted with the accent."""
    style = PRESETS.get(preset, PRESETS["bold"])
    parts = [ass_header(preset)]
    relative = [Word(max(0.0, w.start - clip_start), max(0.01, w.end - clip_start), w.text, w.probability) for w in words]
    phrases = group_phrases(relative)

    if title:
        safe_title = _escape(_clean(title))
        parts.append(
            f"Dialogue: 1,{_stamp(0)},{_stamp(3.0)},Title,,0,0,0,,{{\\fad(250,400)}}{safe_title}\n"
        )

    for phrase in phrases:
        phrase_words = phrase.words
        cursor = phrase.start
        for index, word in enumerate(phrase_words):
            start = max(cursor, word.start)
            if index + 1 < len(phrase_words):
                end = max(start + 0.08, phrase_words[index + 1].start)
            else:
                end = max(start + 0.08, word.end, phrase.end)
            cursor = end
            text_parts = []
            for position, piece in enumerate(phrase_words):
                content = _escape(piece.text.strip())
                if position == index:
                    content = f"{{\\c{style['accent']}}}{content}{{\\c{WHITE}}}"
                text_parts.append(content)
            separator = "" if _is_cjk("".join(piece.text for piece in phrase_words)) else " "
            text = separator.join(text_parts)
            fade = "{\\fad(120,80)}" if index == 0 else ""
            parts.append(f"Dialogue: 0,{_stamp(start)},{_stamp(end)},Caption,,0,0,0,,{fade}{text}\n")
    return "".join(parts)


def to_srt(words: list[Word], clip_start: float) -> str:
    relative = [Word(max(0.0, w.start - clip_start), max(0.01, w.end - clip_start), w.text, w.probability) for w in words]
    phrases = group_phrases(relative, max_words=5, max_seconds=3.2)

    def stamp(seconds: float) -> str:
        ms = max(0, round(seconds * 1000))
        return f"{ms // 3600000:02d}:{(ms // 60000) % 60:02d}:{(ms // 1000) % 60:02d},{ms % 1000:03d}"

    rows = []
    for index, phrase in enumerate(phrases, start=1):
        rows.append(f"{index}\n{stamp(phrase.start)} --> {stamp(phrase.end)}\n{join_words(phrase.words)}\n")
    return "\n".join(rows)


def to_vtt(words: list[Word], clip_start: float) -> str:
    srt = to_srt(words, clip_start).replace(" --> ", " --> ")
    lines = ["WEBVTT", ""]
    for block in srt.strip().split("\n\n"):
        rows = block.splitlines()
        if len(rows) < 3:
            continue
        timing = rows[1].replace(",", ".")
        lines.append(timing)
        lines.append("\n".join(rows[2:]))
        lines.append("")
    return "\n".join(lines)


def available_fonts() -> list[str]:
    return sorted(path.name for path in FONTS_DIR.glob("*.ttf"))
