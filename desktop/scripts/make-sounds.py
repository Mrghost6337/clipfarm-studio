"""Generates Clipfarm Studio's interface sounds from scratch (no samples).

    python3 desktop/scripts/make-sounds.py <ffmpeg>

Writes desktop/assets/sounds/*.ogg. Everything is synthesised here with sine
oscillators, filtered noise and a small algorithmic reverb, so the sounds are
original work owned by the project (see desktop/assets/sounds/LICENSE.txt).

- intro.ogg   3.0 s signature: low swell, a soft "hit" at 1.05 s when the logo
              lands, and an apricot-warm chord that rings out.
- check.ogg   PC check finished: two rising notes.
- ready.ogg   Models ready: three-note arpeggio.
- start.ogg   "Start": a short bright swell into the app.
"""

from __future__ import annotations

import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

RATE = 48_000
OUT = Path(__file__).resolve().parents[1] / "assets" / "sounds"


def t(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * RATE)) / RATE


def note(freq: float, seconds: float, attack: float = 0.01, decay: float = 1.5, partials=((1, 1.0), (2, 0.35), (3, 0.12), (4.2, 0.05))) -> np.ndarray:
    """A soft bell-like tone: a few partials with an exponential decay."""
    x = t(seconds)
    tone = sum(amp * np.sin(2 * np.pi * freq * mult * x) * np.exp(-x * (decay * mult**0.5)) for mult, amp in partials)
    env = np.minimum(1.0, x / max(attack, 1e-4))
    return tone * env


def lowpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    """One-pole low-pass filter."""
    alpha = 1 - np.exp(-2 * np.pi * cutoff / RATE)
    out = np.empty_like(signal)
    acc = 0.0
    for i, value in enumerate(signal):
        acc += alpha * (value - acc)
        out[i] = acc
    return out


def reverb(signal: np.ndarray, seconds: float = 1.6, mix: float = 0.28, seed: int = 7) -> np.ndarray:
    """Convolution with a synthetic, decaying noise impulse (a small warm room)."""
    rng = np.random.default_rng(seed)
    length = int(seconds * RATE)
    ir = rng.standard_normal(length) * np.exp(-np.linspace(0, 7, length))
    ir = lowpass(ir, 5200)
    ir /= np.sqrt(np.sum(ir**2))
    wet = np.convolve(signal, ir)[: len(signal) + length]
    wet = np.pad(wet, (0, len(signal) + length - len(wet)))
    dry = np.concatenate([signal, np.zeros(length)])
    return (1 - mix) * dry + mix * wet


def place(track: np.ndarray, sound: np.ndarray, at: float, gain: float = 1.0) -> None:
    start = int(at * RATE)
    end = min(len(track), start + len(sound))
    track[start:end] += gain * sound[: end - start]


def finish(signal: np.ndarray, seconds: float, peak: float = 0.8) -> np.ndarray:
    signal = signal[: int(seconds * RATE)]
    fade = int(0.25 * RATE)
    signal[-fade:] *= np.linspace(1, 0, fade) ** 2
    signal[: int(0.005 * RATE)] *= np.linspace(0, 1, int(0.005 * RATE))
    return signal / (np.max(np.abs(signal)) + 1e-9) * peak


def stereo(left: np.ndarray, right: np.ndarray) -> np.ndarray:
    return np.stack([left, right], axis=1)


def write(name: str, data: np.ndarray, ffmpeg: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    wav = OUT / f"{name}.wav"
    pcm = (np.clip(data, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(wav), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes(pcm.tobytes())
    subprocess.run([ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav), "-c:a", "libvorbis", "-q:a", "5", str(OUT / f"{name}.ogg")], check=True)
    wav.unlink()
    print(f"{name}.ogg  {len(data) / RATE:.2f}s")


def intro() -> np.ndarray:
    length = 3.0
    left = np.zeros(int((length + 2) * RATE))
    right = np.zeros_like(left)
    # 0.0–1.05 s: a low swell (two detuned sines + filtered noise rising).
    x = t(1.1)
    swell_env = (x / 1.1) ** 2.2
    pad_l = (np.sin(2 * np.pi * 110 * x) + 0.6 * np.sin(2 * np.pi * 164.8 * x * 1.002)) * swell_env * 0.35
    pad_r = (np.sin(2 * np.pi * 110.4 * x) + 0.6 * np.sin(2 * np.pi * 164.8 * x * 0.998)) * swell_env * 0.35
    noise = lowpass(np.random.default_rng(3).standard_normal(len(x)), 900) * swell_env * 0.5
    place(left, pad_l + noise, 0.0)
    place(right, pad_r + noise, 0.0)
    # 1.05 s: the hit when the logo lands (a pitched-down sine "thump").
    hx = t(0.6)
    freq = 120 * np.exp(-hx * 9) + 46
    thump = np.sin(2 * np.pi * np.cumsum(freq) / RATE) * np.exp(-hx * 7)
    place(left, thump, 1.05, 0.9)
    place(right, thump, 1.05, 0.9)
    # 1.05 s onwards: A major add9 chord, spread across the stereo field.
    for freq, pan, delay in [(220.0, 0.5, 0.0), (277.18, 0.3, 0.012), (329.63, 0.7, 0.02), (493.88, 0.25, 0.035), (659.25, 0.75, 0.05)]:
        tone = note(freq, 2.4, attack=0.02, decay=1.1) * 0.22
        place(left, tone, 1.05 + delay, 1 - pan)
        place(right, tone, 1.05 + delay, pan)
    left, right = reverb(left, 1.8, 0.32, 1), reverb(right, 1.8, 0.32, 2)
    return stereo(finish(left, length), finish(right, length))


def cue(freqs: list[float], spacing: float, seconds: float, bright: float = 1.0) -> np.ndarray:
    left = np.zeros(int((seconds + 1) * RATE))
    right = np.zeros_like(left)
    for index, freq in enumerate(freqs):
        tone = note(freq, seconds, attack=0.004, decay=3.2, partials=((1, 1.0), (2, 0.25 * bright), (3, 0.08 * bright))) * 0.3
        pan = 0.35 + 0.3 * (index / max(1, len(freqs) - 1))
        place(left, tone, index * spacing, 1 - pan)
        place(right, tone, index * spacing, pan)
    left, right = reverb(left, 0.9, 0.22, 4), reverb(right, 0.9, 0.22, 5)
    return stereo(finish(left, seconds, 0.6), finish(right, seconds, 0.6))


def start() -> np.ndarray:
    seconds = 1.2
    x = t(seconds)
    sweep = np.sin(2 * np.pi * np.cumsum(330 + 330 * (x / seconds) ** 1.5) / RATE) * np.exp(-((x - 0.35) ** 2) / 0.05) * 0.25
    chord = sum(note(f, seconds, attack=0.03, decay=2.4) for f in (440.0, 554.37, 659.25)) * 0.18
    mix = np.zeros(len(x) + RATE)
    place(mix, sweep, 0.0)
    place(mix, chord, 0.22)
    left, right = reverb(mix, 1.0, 0.25, 6), reverb(mix * 0.98, 1.0, 0.25, 8)
    return stereo(finish(left, seconds, 0.6), finish(right, seconds, 0.6))


if __name__ == "__main__":
    ffmpeg = sys.argv[1] if len(sys.argv) > 1 else "ffmpeg"
    write("intro", intro(), ffmpeg)
    write("check", cue([659.25, 987.77], 0.11, 0.9), ffmpeg)
    write("ready", cue([523.25, 659.25, 783.99], 0.09, 1.0), ffmpeg)
    write("start", start(), ffmpeg)
