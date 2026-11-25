"""Optional free LLM access: local Ollama first, then any OpenAI-compatible
endpoint (Groq free tier, OpenRouter `:free`, etc.). No key is required: the
pipeline falls back to heuristics when neither is reachable.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from .config import LLM_PROVIDER, OLLAMA_MODEL, OLLAMA_URL, OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL


def _post(url: str, payload: dict, headers: dict[str, str] | None = None, timeout: int = 120) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"content-type": "application/json", **(headers or {})},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def ollama_available() -> bool:
    try:
        request = urllib.request.Request(f"{OLLAMA_URL}/api/tags", method="GET")
        with urllib.request.urlopen(request, timeout=1.5) as response:
            return response.status == 200
    except Exception:
        return False


def provider() -> str | None:
    if LLM_PROVIDER == "none":
        return None
    if LLM_PROVIDER in {"auto", "ollama"} and ollama_available():
        return "ollama"
    if LLM_PROVIDER in {"auto", "openai"} and OPENAI_API_KEY:
        return "openai"
    return None


def complete(prompt: str, system: str) -> str:
    chosen = provider()
    if chosen == "ollama":
        data = _post(
            f"{OLLAMA_URL}/api/chat",
            {
                "model": OLLAMA_MODEL,
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.2},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
            },
        )
        return (data.get("message") or {}).get("content", "")
    if chosen == "openai":
        data = _post(
            f"{OPENAI_BASE_URL.rstrip('/')}/chat/completions",
            {
                "model": OPENAI_MODEL,
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
            },
            headers={"authorization": f"Bearer {OPENAI_API_KEY}"},
        )
        return data["choices"][0]["message"]["content"]
    raise RuntimeError("No LLM is configured.")
