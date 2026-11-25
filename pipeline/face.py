"""Face tracking with OpenCV YuNet. Samples 4–8 fps, keeps the largest face and
smooths the crop with an EMA, a dead zone and a maximum pan speed so the frame
never jitters.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .config import MODELS_DIR

MODEL_PATH = MODELS_DIR / "face_detection_yunet_2023mar.onnx"


@dataclass
class Track:
    samples: list[tuple[float, float]]  # (seconds relative to clip, 0..1 centre x)
    width: int
    height: int
    crop_width: int
    found: bool

    def x_at(self, seconds: float) -> float:
        if not self.samples:
            return (self.width - self.crop_width) / 2
        if seconds <= self.samples[0][0]:
            centre = self.samples[0][1]
        elif seconds >= self.samples[-1][0]:
            centre = self.samples[-1][1]
        else:
            centre = self.samples[-1][1]
            for (time_a, centre_a), (time_b, centre_b) in zip(self.samples, self.samples[1:]):
                if time_a <= seconds <= time_b:
                    ratio = (seconds - time_a) / max(1e-6, time_b - time_a)
                    centre = centre_a + (centre_b - centre_a) * ratio
                    break
        return max(0.0, min(self.width - self.crop_width, centre * self.width - self.crop_width / 2))


def _smooth(raw: list[tuple[float, float]], alpha: float = 0.28, dead_zone: float = 0.006, max_speed: float = 0.45) -> list[tuple[float, float]]:
    if not raw:
        return []
    result: list[tuple[float, float]] = []
    value = raw[0][1]
    previous_time = raw[0][0]
    for time, centre in raw:
        dt = max(0.001, time - previous_time)
        delta = centre - value
        if abs(delta) < dead_zone:
            target = value
        else:
            target = value + (delta - (dead_zone if delta > 0 else -dead_zone)) * alpha
        limit = max_speed * dt
        value = max(value - limit, min(value + limit, target))
        result.append((time, value))
        previous_time = time
    return result


def track(video_path: str, start: float, end: float, sample_fps: float = 5.0) -> Track:
    try:
        import cv2  # type: ignore
    except Exception:
        return Track([], 1920, 1080, 608, False)

    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        return Track([], 1920, 1080, 608, False)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 1920)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 1080)
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 30)
    crop_width = int(round(height * 9 / 16 / 2) * 2)
    crop_width = min(crop_width, width - (width % 2))

    if not MODEL_PATH.exists():
        capture.release()
        return Track([], width, height, crop_width, False)

    detector = cv2.FaceDetectorYN.create(str(MODEL_PATH), "", (width, height), 0.6, 0.3, 1000)
    capture.set(cv2.CAP_PROP_POS_MSEC, max(0.0, start) * 1000)
    step = max(1, int(round(fps / max(1.0, sample_fps))))
    raw: list[tuple[float, float]] = []
    index = 0
    while True:
        if index % step:
            if not capture.grab():
                break
        else:
            ok, frame = capture.read()
            if not ok:
                break
            seconds = start + index / fps
            if seconds > end:
                break
            try:
                _, faces = detector.detect(frame)
            except Exception:
                faces = None
            if faces is not None and len(faces):
                best = max(faces, key=lambda face: float(face[2]) * float(face[3]))
                centre = (float(best[0]) + float(best[2]) / 2) / width
                raw.append((seconds - start, max(0.0, min(1.0, centre))))
        index += 1
    capture.release()

    smoothed = _smooth(raw)
    return Track(smoothed, width, height, crop_width, bool(smoothed))


def sendcmd_file(track: Track, path: str) -> str:
    """Writes crop-x commands for every smoothed sample plus time 0."""
    lines = []
    if track.samples:
        lines.append(f"0.000 crop@face x {track.x_at(0.0):.1f};")
        for time, _centre in track.samples:
            lines.append(f"{time:.3f} crop@face x {track.x_at(time):.1f};")
    Path(path).write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")
    return path
