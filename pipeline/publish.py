"""Optional posting through official APIs only.

YouTube Shorts uses `videos.insert` with the upload scope. TikTok and Instagram
need an approved developer app / public video URL, so the UI offers the honest
download + open-upload-page path for them instead of automating logins.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .config import YOUTUBE_CLIENT_SECRETS, YOUTUBE_TOKEN_FILE

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


class PublishError(RuntimeError):
    pass


def status() -> dict[str, Any]:
    secrets_file = Path(YOUTUBE_CLIENT_SECRETS)
    token_file = Path(YOUTUBE_TOKEN_FILE)
    return {
        "youtube": {
            "configured": secrets_file.exists() and token_file.exists(),
            "clientSecrets": secrets_file.exists(),
            "token": token_file.exists(),
            "note": "Uploads from an unaudited API project are forced to private. Quota is 10,000 units/day and one upload costs about 1,600.",
        },
        "tiktok": {
            "configured": False,
            "note": "TikTok Content Posting API needs an approved app. Until then use Download + Open TikTok upload.",
        },
        "instagram": {
            "configured": False,
            "note": "Instagram Reels needs a Business account, a Meta app and a public video URL. Advanced and optional.",
        },
    }


def _credentials():
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError as error:
        raise PublishError("Google API client is not installed. Run `python -m pipeline.cli setup`.") from error

    token_file = Path(YOUTUBE_TOKEN_FILE)
    credentials = None
    if token_file.exists():
        credentials = Credentials.from_authorized_user_file(str(token_file), SCOPES)
    if credentials and credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())
        token_file.write_text(credentials.to_json(), encoding="utf-8")
    if credentials and credentials.valid:
        return credentials

    secrets_file = Path(YOUTUBE_CLIENT_SECRETS)
    if not secrets_file.exists():
        raise PublishError(
            f"YouTube is not connected. Put an OAuth client JSON at {secrets_file} and run `python -m pipeline.cli auth-youtube`."
        )
    flow = InstalledAppFlow.from_client_secrets_file(str(secrets_file), SCOPES)
    credentials = flow.run_local_server(port=0, open_browser=True)
    token_file.parent.mkdir(parents=True, exist_ok=True)
    token_file.write_text(credentials.to_json(), encoding="utf-8")
    return credentials


def auth_youtube() -> dict[str, Any]:
    _credentials()
    return {"ok": True, "token": YOUTUBE_TOKEN_FILE}


def upload_short(video_path: str, title: str, description: str, hashtags: list[str], privacy: str = "private") -> dict[str, Any]:
    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
    except ImportError as error:
        raise PublishError("Google API client is not installed. Run `python -m pipeline.cli setup`.") from error

    path = Path(video_path)
    if not path.exists():
        raise PublishError("That clip file no longer exists.")

    credentials = _credentials()
    service = build("youtube", "v3", credentials=credentials, cache_discovery=False)
    tags = [tag.lstrip("#") for tag in hashtags]
    body = {
        "snippet": {
            "title": (f"{title} #Shorts" if "#shorts" not in title.lower() else title)[:100],
            "description": f"{description}\n\n{' '.join(hashtags)}".strip()[:4900],
            "tags": tags[:15],
            "categoryId": "22",
        },
        "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False},
    }
    media = MediaFileUpload(str(path), chunksize=-1, resumable=True, mimetype="video/mp4")
    request = service.videos().insert(part="snippet,status", body=body, media_body=media)
    response = None
    while response is None:
        _, response = request.next_chunk()
    return {"ok": True, "videoId": response.get("id"), "url": f"https://youtube.com/shorts/{response.get('id')}", "privacy": privacy}
