"""Access control for the local pipeline API.

The service listens on 127.0.0.1 only, but any web page the user opens can
still try to reach it, so every request passes four checks:

1. Host header: only 127.0.0.1:<port> or localhost:<port>. Blocks DNS
   rebinding, where a hostile name resolves to 127.0.0.1.
2. Origin header: when a browser sends one it must be on the allowlist
   (config.ALLOWED_ORIGINS). There is no `*`.
3. Credentials: a bearer token. Two kinds exist:
   - the launch token, new every start, held by whoever started the service
     (the desktop app or the CLI). It can do everything, including approving
     and revoking pairings.
   - pairing tokens, one per approved browser. They survive restarts, are
     stored only as SHA-256 hashes and can be revoked one by one. They cannot
     manage pairings.
4. Tickets: `<video>`, `<img>` and EventSource cannot send headers, so a
   paired client asks POST /auth/ticket for a short-lived signed ticket and
   adds `?ticket=` to media and progress URLs. Tickets only work for GET on
   /files/* and /jobs/<id>/events and die with their pairing.

Public without a token: GET /health (discovery), POST /pair/request and
GET /pair/request/<id> (the pairing handshake itself).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from .config import ALLOWED_ORIGINS, DATA_DIR, LAUNCH_TOKEN

INSTANCE_FILE = DATA_DIR / "instance.json"
LAUNCH_TOKEN_FILE = DATA_DIR / "launch-token"
RUNTIME_FILE = DATA_DIR / "runtime.json"

TICKET_SECONDS = 6 * 60 * 60  # media URLs stay valid through a long review session
REQUEST_SECONDS = 10 * 60
MAX_PENDING_REQUESTS = 5
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I/L

TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{32,128}$")
CODE_RE = re.compile(r"^[A-Z2-9]{4}-?[A-Z2-9]{4}$")

SCHEMA = """
CREATE TABLE IF NOT EXISTS pairings (
  id TEXT PRIMARY KEY,
  origin TEXT NOT NULL,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS pair_requests (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  secret_hash TEXT NOT NULL,
  origin TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  pairing_id TEXT
);
"""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(value: datetime) -> str:
    return value.isoformat()


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _write_private(path: Path, text: str) -> None:
    """Writes a file only the current user can read (on Windows, %LOCALAPPDATA% is already per-user)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        handle.write(text)
    os.replace(tmp, path)


# ---------------------------------------------------------------------------
# Instance identity, launch token and runtime info
# ---------------------------------------------------------------------------


def _load_instance() -> dict[str, str]:
    try:
        data = json.loads(INSTANCE_FILE.read_text("utf-8"))
        if isinstance(data.get("id"), str) and isinstance(data.get("secret"), str) and len(data["secret"]) >= 64:
            return data
    except (OSError, ValueError):
        pass
    data = {"id": secrets.token_hex(8), "secret": secrets.token_hex(32)}
    _write_private(INSTANCE_FILE, json.dumps(data))
    return data


@dataclass
class State:
    instance_id: str
    secret: bytes
    launch_token: str
    port: int | None = None


_state: State | None = None


def state() -> State:
    global _state
    if _state is None:
        instance = _load_instance()
        launch = LAUNCH_TOKEN if TOKEN_RE.match(LAUNCH_TOKEN or "") else secrets.token_urlsafe(32)
        _state = State(instance_id=instance["id"], secret=bytes.fromhex(instance["secret"]), launch_token=launch)
    return _state


def publish_runtime(port: int) -> None:
    """Records the bound port and launch token so `pipeline.cli pair …` and the
    Vite dev proxy can reach the running service."""
    current = state()
    current.port = port
    if not LAUNCH_TOKEN:
        _write_private(LAUNCH_TOKEN_FILE, current.launch_token)
    _write_private(RUNTIME_FILE, json.dumps({"port": port, "pid": os.getpid(), "instanceId": current.instance_id}))


def read_runtime() -> tuple[int, str] | None:
    """For CLI commands: the port and launch token of the running service."""
    try:
        runtime = json.loads(RUNTIME_FILE.read_text("utf-8"))
        token = LAUNCH_TOKEN or LAUNCH_TOKEN_FILE.read_text("utf-8").strip()
        return int(runtime["port"]), token
    except (OSError, ValueError, KeyError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------


def _connect():  # noqa: ANN202 - context manager from db.connect
    from .db import connect

    return connect()


def init() -> None:
    with _connect() as connection:
        connection.executescript(SCHEMA)
    state()


def _expire_requests(connection: sqlite3.Connection) -> None:
    connection.execute(
        "UPDATE pair_requests SET status='expired' WHERE status IN ('pending','approved') AND expires_at < ?",
        (_iso(_now()),),
    )


# ---------------------------------------------------------------------------
# Header checks
# ---------------------------------------------------------------------------


def host_allowed(host: str | None) -> bool:
    if not host:
        return False
    port = state().port
    names = ("127.0.0.1", "localhost")
    if port is None:
        # Not started through serve() (tests, embedded use): accept the names on any port.
        return any(host == name or host.startswith(f"{name}:") for name in names)
    return host in {f"{name}:{port}" for name in names}


def origin_allowed(origin: str | None) -> bool:
    return origin is None or origin.rstrip("/") in ALLOWED_ORIGINS


# ---------------------------------------------------------------------------
# Credentials
# ---------------------------------------------------------------------------


@dataclass
class Principal:
    kind: str  # "launch" | "pairing"
    pairing_id: str | None = None


def from_bearer(header: str | None) -> Principal | None:
    if not header:
        return None
    match = re.match(r"^Bearer\s+(\S+)$", header.strip(), re.IGNORECASE)
    if not match:
        return None
    token = match.group(1)
    if not TOKEN_RE.match(token):
        return None
    if hmac.compare_digest(token, state().launch_token):
        return Principal("launch")
    with _connect() as connection:
        row = connection.execute(
            "SELECT id FROM pairings WHERE token_hash=? AND revoked_at IS NULL", (_sha256(token),)
        ).fetchone()
        if not row:
            return None
        connection.execute("UPDATE pairings SET last_used_at=? WHERE id=?", (_iso(_now()), row["id"]))
    return Principal("pairing", row["id"])


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def make_ticket(principal: Principal, seconds: int = TICKET_SECONDS) -> dict[str, Any]:
    subject = principal.pairing_id if principal.kind == "pairing" else "launch"
    expires = int(time.time()) + seconds
    body = f"{subject}.{expires}"
    signature = _b64(hmac.new(state().secret, body.encode(), hashlib.sha256).digest())
    return {"ticket": f"t1.{body}.{signature}", "expiresAt": expires}


def from_ticket(ticket: str | None) -> Principal | None:
    if not ticket or len(ticket) > 200:
        return None
    parts = ticket.split(".")
    if len(parts) != 4 or parts[0] != "t1":
        return None
    _, subject, expires, signature = parts
    body = f"{subject}.{expires}"
    expected = _b64(hmac.new(state().secret, body.encode(), hashlib.sha256).digest())
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        if int(expires) < time.time():
            return None
    except ValueError:
        return None
    if subject == "launch":
        return Principal("launch")
    with _connect() as connection:
        row = connection.execute("SELECT id FROM pairings WHERE id=? AND revoked_at IS NULL", (subject,)).fetchone()
    return Principal("pairing", subject) if row else None


# ---------------------------------------------------------------------------
# Pairing
# ---------------------------------------------------------------------------


class PairingError(Exception):
    def __init__(self, status: int, detail: str):
        super().__init__(detail)
        self.status = status
        self.detail = detail


def _clean_name(name: str) -> str:
    cleaned = re.sub(r"[^\w .,()+-]", "", name or "", flags=re.UNICODE).strip()
    return cleaned[:60] or "Browser"


def _new_code() -> str:
    raw = "".join(secrets.choice(CODE_ALPHABET) for _ in range(8))
    return f"{raw[:4]}-{raw[4:]}"


def request_pairing(origin: str | None, name: str) -> dict[str, Any]:
    if not origin or origin.rstrip("/") not in ALLOWED_ORIGINS:
        raise PairingError(403, "Pairing is only available from the Clipfarm website.")
    now = _now()
    with _connect() as connection:
        _expire_requests(connection)
        pending = connection.execute("SELECT COUNT(*) AS n FROM pair_requests WHERE status='pending'").fetchone()["n"]
        if pending >= MAX_PENDING_REQUESTS:
            raise PairingError(429, "Too many pairing requests are waiting. Approve or deny them first, or wait ten minutes.")
        request_id = secrets.token_hex(8)
        secret = secrets.token_urlsafe(32)
        code = _new_code()
        while connection.execute("SELECT 1 FROM pair_requests WHERE code=?", (code,)).fetchone():
            code = _new_code()
        expires = now + timedelta(seconds=REQUEST_SECONDS)
        connection.execute(
            "INSERT INTO pair_requests (id, code, secret_hash, origin, name, status, created_at, expires_at) VALUES (?,?,?,?,?,?,?,?)",
            (request_id, code, _sha256(secret), origin.rstrip("/"), _clean_name(name), "pending", _iso(now), _iso(expires)),
        )
    print(f"[pairing] {origin} asks to connect ({_clean_name(name)}). Code {code}. Approve with: python -m pipeline.cli pair approve {code}", flush=True)
    return {"id": request_id, "secret": secret, "code": code, "expiresAt": _iso(expires), "instanceId": state().instance_id}


def poll_pairing(request_id: str, secret: str | None) -> dict[str, Any]:
    """The browser polls with its request secret. On approval the first poll
    creates the pairing and returns its token; later polls never repeat it."""
    with _connect() as connection:
        _expire_requests(connection)
        row = connection.execute("SELECT * FROM pair_requests WHERE id=?", (request_id,)).fetchone()
        if not row or not secret or not hmac.compare_digest(_sha256(secret), row["secret_hash"]):
            raise PairingError(404, "Pairing request not found.")
        if row["status"] != "approved":
            return {"status": row["status"]}
        token = secrets.token_urlsafe(32)
        pairing_id = secrets.token_hex(8)
        claimed = connection.execute(
            "UPDATE pair_requests SET status='claimed', pairing_id=? WHERE id=? AND status='approved'", (pairing_id, request_id)
        )
        if claimed.rowcount == 0:
            return {"status": "claimed"}
        connection.execute(
            "INSERT INTO pairings (id, origin, name, token_hash, created_at) VALUES (?,?,?,?,?)",
            (pairing_id, row["origin"], row["name"], _sha256(token), _iso(_now())),
        )
    return {"status": "approved", "token": token, "pairingId": pairing_id, "instanceId": state().instance_id}


def list_requests() -> list[dict[str, Any]]:
    with _connect() as connection:
        _expire_requests(connection)
        rows = connection.execute(
            "SELECT id, code, origin, name, created_at, expires_at FROM pair_requests WHERE status='pending' ORDER BY created_at"
        ).fetchall()
    return [dict(row) for row in rows]


def decide(code: str, approve: bool) -> dict[str, Any]:
    normalized = code.strip().upper().replace(" ", "")
    if not CODE_RE.match(normalized):
        raise PairingError(422, "That is not a pairing code.")
    if "-" not in normalized:
        normalized = f"{normalized[:4]}-{normalized[4:]}"
    with _connect() as connection:
        _expire_requests(connection)
        row = connection.execute("SELECT id, origin, name, status FROM pair_requests WHERE code=?", (normalized,)).fetchone()
        if not row or row["status"] != "pending":
            raise PairingError(404, "No pending pairing request has that code. It may have expired.")
        connection.execute("UPDATE pair_requests SET status=? WHERE id=?", ("approved" if approve else "denied", row["id"]))
    return {"ok": True, "origin": row["origin"], "name": row["name"], "status": "approved" if approve else "denied"}


def list_pairings() -> list[dict[str, Any]]:
    with _connect() as connection:
        rows = connection.execute(
            "SELECT id, origin, name, created_at, last_used_at FROM pairings WHERE revoked_at IS NULL ORDER BY created_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]


def revoke(pairing_id: str) -> bool:
    with _connect() as connection:
        cursor = connection.execute(
            "UPDATE pairings SET revoked_at=? WHERE id=? AND revoked_at IS NULL", (_iso(_now()), pairing_id)
        )
    return cursor.rowcount > 0


# ---------------------------------------------------------------------------
# Route classes
# ---------------------------------------------------------------------------

PUBLIC = {("GET", "/health"), ("POST", "/pair/request")}
PUBLIC_PREFIX = (("GET", "/pair/request/"),)
LAUNCH_ONLY_PREFIX = ("/pair/requests", "/pairings")
TICKET_RE = re.compile(r"^/(files/.+|jobs/[A-Za-z0-9]+/events)$")


def route_class(method: str, path: str) -> str:
    """public | launch | ticket | token"""
    if (method, path) in PUBLIC or any(method == m and path.startswith(p) for m, p in PUBLIC_PREFIX):
        return "public"
    if path.startswith(LAUNCH_ONLY_PREFIX):
        return "launch"
    if method in {"GET", "HEAD"} and TICKET_RE.match(path):
        return "ticket"
    return "token"


__all__ = [
    "Principal",
    "PairingError",
    "decide",
    "from_bearer",
    "from_ticket",
    "host_allowed",
    "init",
    "list_pairings",
    "list_requests",
    "make_ticket",
    "origin_allowed",
    "poll_pairing",
    "publish_runtime",
    "read_runtime",
    "request_pairing",
    "revoke",
    "route_class",
    "state",
]
