"""Find the best moments: sentence-boundary candidates, heuristic scoring and an
optional free LLM (Ollama / OpenAI-compatible) for titles, scores and hashtags.
"""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass, field
from typing import Any, Callable

from .config import FFMPEG, MAX_CLIP_SECONDS, MAX_CLIPS, MIN_CLIP_SECONDS, TARGET_CLIP_SECONDS
from .subtitles import Word, join_words

SIGNALS = re.compile(
    r"\b(oh my god|no way|what the|holy|laugh(?:s|ed|ing)?|insane|crazy|unbelievable|clutch|destroy(?:ed|ing)?|rage|raging|"
    r"first try|world record|let'?s go|bruh|exposed|secret|never|best|worst|wins?|winning|won|beat|record|can'?t believe|"
    r"didn'?t expect|finally|chat|clip that|huge|massive|disaster|fail(?:ed|ure)?|perfect|actually|literally|serious(?:ly)?|"
    r"backstab|betray|caught|plot twist|politie|achtervolging|ontsnap\w*|gestolen|helikopter|gepakt|niet te geloven|erger|gestoord|belachelijk|"
    r"polizei|verfolgung|gestohlen|wahnsinn|unglaublich|polic[ií]a|persecuci[oó]n|robado|incre[ií]ble|incroyable|poursuite|vol[eé]|h[eé]licopt[eè]re)\b",
    re.I,
)
GTA_SIGNALS = re.compile(
    r"\b(gta(?: vi| 6)?|wanted level|busted|wasted|heist|cop chase|police chase|cops|police|getaway|carjack(?:ed|ing)?|"
    r"rampage|vice city|leonida|shark card|five stars|six stars|mission passed|stunt|shootout|explosion|rammed|helicopter|tank)\b",
    re.I,
)
LAUGHS = re.compile(r"\[(laughter|applause|cheering)\]|(ha){2,}|(lol){2,}", re.I)

LANGUAGE_TAGS = {
    "nl": ["#nederlands", "#nederland"],
    "de": ["#deutsch", "#germany"],
    "fr": ["#français", "#france"],
    "es": ["#español", "#españa"],
    "pt": ["#português", "#brasil"],
    "it": ["#italiano", "#italia"],
    "pl": ["#polska"],
    "tr": ["#türkiye"],
    "id": ["#indonesia"],
    "ja": ["#日本語"],
    "ko": ["#한국"],
    "zh": ["#中文"],
    "ru": ["#россия"],
    "hi": ["#हिन्दी"],
    "ar": ["#العربية"],
}


@dataclass
class Candidate:
    start: float
    end: float
    text: str
    words: list[Word]
    score: float = 0
    title: str = ""
    reason: str = ""
    hashtags: list[str] = field(default_factory=list)


class DetectError(RuntimeError):
    pass


def _sentences(words: list[Word]) -> list[list[Word]]:
    groups: list[list[Word]] = []
    current: list[Word] = []
    for word in words:
        gap = word.start - current[-1].end if current else 0.0
        current.append(word)
        if re.search(r"[.!?…]$", word.text.strip()) or gap > 0.9:
            groups.append(current)
            current = []
    if current:
        groups.append(current)
    return groups


def _score_text(text: str) -> float:
    words = len(text.split())
    if not words:
        return 0
    signals = len(SIGNALS.findall(text))
    gta = len(GTA_SIGNALS.findall(text))
    laughs = len(LAUGHS.findall(text))
    bangs = min(3, text.count("!"))
    questions = min(3, text.count("?"))
    return signals * 3 + laughs * 4 + gta * 2.5 + bangs * 1.5 + questions + min(4, words / 16)


def mean_volume(wav: str | None, start: float, duration: float) -> float | None:
    if not wav:
        return None
    try:
        result = subprocess.run(
            [FFMPEG, "-hide_banner", "-ss", f"{start:.2f}", "-t", f"{duration:.2f}", "-i", wav, "-af", "volumedetect", "-f", "null", "-"],
            capture_output=True, text=True, timeout=90,
        )
        match = re.search(r"mean_volume:\s*(-?[\d.]+) dB", result.stderr)
        return float(match.group(1)) if match else None
    except Exception:
        return None


def _tidy_title(text: str, fallback: str, max_words: int = 6) -> str:
    cleaned = re.sub(r"\s+", " ", text).strip()
    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    scored = [(sentence, _score_text(sentence)) for sentence in sentences if len(sentence.split()) >= 3]
    if not scored:
        return fallback
    scored = [
        item
        for item in scored
        if len(item[0].split()) >= 3
        and not re.search(r"(\b\w+-\w+\b\s*){2,}", item[0])
        and not re.search(r"\b(\w+)(?:\s+\1\b){2,}", item[0], re.I)
    ]
    if not scored:
        return fallback
    hot = [item for item in scored if item[1] >= 1]
    best = max(hot, key=lambda item: item[1])[0] if hot else max(scored, key=lambda item: len(item[0].split()))[0]
    best = re.sub(
        r"^(so|and|but|well|okay|ok|like|um|uh|yeah|dus|maar|en|want|nou|gewoon|eigenlijk|kijk|zeg)\s+",
        "",
        best.strip(),
        flags=re.I,
    )
    words = best.split()
    title = " ".join(words[:max_words]).strip(" .,;:!?-")
    title = re.sub(r"[.,;:!?-]+$", "", title)
    if len(title) < 4:
        return fallback
    return title[0].upper() + title[1:]


def _hashtags(text: str, language: str | None, count: int = 5) -> list[str]:
    tags = ["#shorts"]
    if GTA_SIGNALS.search(text):
        tags += ["#gta6", "#gaming"]
    elif re.search(r"\b(game|gameplay|stream|fortnite|minecraft|valorant|fps)\b", text, re.I):
        tags += ["#gaming", "#streamer"]
    elif re.search(r"\b(food|recipe|cook|eat)\b", text, re.I):
        tags += ["#food", "#recipe"]
    tags += LANGUAGE_TAGS.get((language or "en").lower(), [])
    tags += ["#clips", "#viral", "#fyp"]
    unique: list[str] = []
    for tag in tags:
        if tag not in unique:
            unique.append(tag)
    return unique[: max(3, min(5, count))]


def _score_candidates(candidates: list[Candidate], wav: str | None, language: str | None) -> list[Candidate]:
    loudness = [mean_volume(wav, candidate.start, candidate.end - candidate.start) for candidate in candidates]
    usable = [level for level in loudness if level is not None]
    loud_min, loud_max = (min(usable), max(usable)) if usable else (0.0, 0.0)
    for candidate, level in zip(candidates, loudness):
        base = _score_text(candidate.text)
        energy = 0.0
        if level is not None and loud_max > loud_min:
            energy = (level - loud_min) / (loud_max - loud_min) * 2.5
        sweet = 1.5 if 18 <= candidate.end - candidate.start <= 42 else 0
        candidate.score = base + energy + sweet
        confident = [word for word in candidate.words if word.probability >= 0.45]
        title_source = join_words(confident) if len(confident) >= 4 else candidate.text
        candidate.title = _tidy_title(title_source, f"{int(candidate.start // 60)}:{int(candidate.start % 60):02d} highlight")
        candidate.reason = "Laughter, claims and dense speech in this window." if base > 3 else "A complete, self-contained moment."
        candidate.hashtags = _hashtags(candidate.text, language)
    return candidates


def _uniform_candidates(words: list[Word], duration: float, count: int) -> list[Candidate]:
    """Last resort for short videos: equal word-aligned windows, never mid-word."""
    span = duration / max(1, count)
    windows: list[Candidate] = []
    for index in range(count):
        start_target = index * span
        end_target = duration if index == count - 1 else (index + 1) * span
        window = [word for word in words if word.start >= start_target - 0.35 and word.end <= end_target + 0.35]
        if len(window) < 3:
            continue
        windows.append(Candidate(start=window[0].start, end=window[-1].end, text=join_words(window), words=window))
    return windows


def build_candidates(words: list[Word], duration: float, min_seconds: float, max_seconds: float, target: float) -> list[Candidate]:
    sentences = _sentences(words)
    candidates: list[Candidate] = []
    for index in range(len(sentences)):
        group: list[Word] = []
        for sentence in sentences[index:]:
            group.extend(sentence)
            span = group[-1].end - group[0].start
            if span >= target:
                break
            if span >= max_seconds:
                break
        if not group:
            continue
        start, end = group[0].start, group[-1].end
        span = end - start
        if span < min_seconds:
            continue
        if span > max_seconds:
            end = start + max_seconds
            group = [word for word in group if word.end <= end]
            if not group:
                continue
        candidates.append(Candidate(start=start, end=end, text=join_words(group), words=group))
    return candidates


SYSTEM = (
    "You rank short-form clip moments. Answer with JSON only, no markdown. "
    "Keep hook titles in the same language as the transcript. Never invent facts."
)


def _llm_rank(candidates: list[Candidate], language: str | None, max_clips: int) -> list[Candidate] | None:
    from . import llm

    if not llm.provider():
        return None
    listing = "\n".join(
        f"[{index}] {candidate.start:.1f}-{candidate.end:.1f}s: {candidate.text[:500]}"
        for index, candidate in enumerate(candidates)
    )
    prompt = f"""Transcript language: {language or 'unknown'}.
Pick the {max_clips} strongest, non-overlapping moments from these candidate windows.
Return JSON: {{"clips":[{{"index":0,"score":0-100,"hook_title":"max 6 words","reason":"one short sentence","hashtags":["#tag"]}}]}}
Use 3-5 hashtags in the transcript language, broad + niche. Only use the given indexes.

{listing}"""
    for attempt in range(2):
        try:
            raw = llm.complete(prompt, SYSTEM)
            data = _extract_json(raw)
            clips = data.get("clips") if isinstance(data, dict) else data
            if not isinstance(clips, list):
                raise ValueError("no clips array")
            chosen: list[Candidate] = []
            for item in clips[:max_clips]:
                try:
                    index = int(item["index"])
                except (KeyError, TypeError, ValueError):
                    continue
                if not 0 <= index < len(candidates):
                    continue
                candidate = candidates[index]
                candidate.score = max(0, min(100, int(item.get("score", 0))))
                title = str(item.get("hook_title") or "").strip()
                if title:
                    candidate.title = " ".join(title.split()[:6])
                candidate.reason = str(item.get("reason") or "").strip()[:240]
                tags = [str(tag).strip() for tag in item.get("hashtags", []) if str(tag).startswith("#")]
                if 3 <= len(tags) <= 5:
                    candidate.hashtags = tags
                chosen.append(candidate)
            if chosen:
                return chosen
        except Exception:
            if attempt == 0:
                continue
    return None


def _extract_json(raw: str) -> Any:
    import json

    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.M).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.S)
        if match:
            return json.loads(match.group(0))
        raise


def detect(
    words: list[Word],
    duration: float,
    language: str | None,
    wav: str | None = None,
    max_clips: int = MAX_CLIPS,
    progress: Callable[[str, float], None] | None = None,
) -> list[Candidate]:
    if len(words) < 20:
        raise DetectError("There is not enough speech to rank moments.")

    min_seconds = min(MIN_CLIP_SECONDS, max(6.0, duration / 5))
    max_seconds = min(MAX_CLIP_SECONDS, max(12.0, duration))
    target = min(TARGET_CLIP_SECONDS, max(8.0, duration / 4))
    candidates = build_candidates(words, duration, min_seconds, max_seconds, target)
    if not candidates:
        raise DetectError("No sentence-bounded window fits the clip length rules.")

    progress and progress(f"Scoring {len(candidates)} candidate windows", 0.78)
    _score_candidates(candidates, wav, language)

    ranked = _llm_rank(candidates, language, max_clips)
    if ranked is None:
        ranked = sorted(candidates, key=lambda item: item.score, reverse=True)

    chosen: list[Candidate] = []
    for candidate in sorted(ranked, key=lambda item: item.score, reverse=True):
        if len(chosen) >= max_clips:
            break
        overlap = any(
            min(candidate.end, taken.end) - max(candidate.start, taken.start) > 0.4 * min(candidate.end - candidate.start, taken.end - taken.start)
            for taken in chosen
        )
        if overlap:
            continue
        chosen.append(candidate)

    desired = min(3, max(1, int(duration // 12)))
    if len(chosen) < desired and len(words) >= 12:
        fallback = _score_candidates(_uniform_candidates(words, duration, desired), wav, language)
        if len(fallback) >= desired:
            chosen = fallback

    if not chosen:
        raise DetectError("Every candidate overlapped; try a longer video.")

    best = max(item.score for item in chosen) or 1
    for item in chosen:
        item.score = max(1, min(100, round(item.score / best * 92) + 8)) if item.score <= 100 else item.score
        if not item.hashtags:
            item.hashtags = _hashtags(item.text, language)
    chosen.sort(key=lambda item: item.start)
    progress and progress(f"{len(chosen)} moments selected", 0.82)
    return chosen
