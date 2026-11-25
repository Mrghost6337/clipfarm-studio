"""Security tests for the local pipeline API.

Run: .venv/bin/python -m unittest discover -s pipeline/tests -t .
"""

from __future__ import annotations

import os
import tempfile
import unittest

_DATA = tempfile.mkdtemp(prefix="clipfarm-sec-")
os.environ["PIPELINE_DATA"] = _DATA
os.environ["CLIPFARM_SITE_ORIGIN"] = "https://site.example"
os.environ.pop("PIPELINE_LAUNCH_TOKEN", None)

from fastapi.testclient import TestClient  # noqa: E402

from pipeline import api, security  # noqa: E402

SITE = "https://site.example"
EVIL = "https://evil.example"


class SecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(api.app, base_url="http://127.0.0.1:8787")
        cls.client.__enter__()
        security.state().port = 8787
        cls.launch = {"authorization": f"Bearer {security.state().launch_token}"}

    @classmethod
    def tearDownClass(cls) -> None:
        cls.client.__exit__(None, None, None)

    def pair(self) -> str:
        created = self.client.post("/pair/request", json={"name": "Chrome on test"}, headers={"origin": SITE})
        self.assertEqual(created.status_code, 200, created.text)
        body = created.json()
        poll = self.client.get(f"/pair/request/{body['id']}", headers={"origin": SITE, "x-pair-secret": body["secret"]})
        self.assertEqual(poll.json()["status"], "pending")
        approved = self.client.post("/pair/requests/approve", json={"code": body["code"]}, headers=self.launch)
        self.assertEqual(approved.status_code, 200, approved.text)
        claimed = self.client.get(f"/pair/request/{body['id']}", headers={"origin": SITE, "x-pair-secret": body["secret"]})
        token = claimed.json()["token"]
        again = self.client.get(f"/pair/request/{body['id']}", headers={"origin": SITE, "x-pair-secret": body["secret"]})
        self.assertNotIn("token", again.json(), "the token must be handed out once")
        return token

    def test_health_is_public_but_jobs_are_not(self) -> None:
        self.assertEqual(self.client.get("/health").status_code, 200)
        self.assertEqual(self.client.get("/jobs").status_code, 401)
        self.assertEqual(self.client.get("/jobs", headers={"authorization": "Bearer " + "x" * 43}).status_code, 401)
        self.assertEqual(self.client.get("/jobs", headers=self.launch).status_code, 200)

    def test_host_header_is_checked(self) -> None:
        response = self.client.get("/health", headers={"host": "rebind.example:8787"})
        self.assertEqual(response.status_code, 421)
        response = self.client.get("/health", headers={"host": "127.0.0.1:9999"})
        self.assertEqual(response.status_code, 421)

    def test_unknown_origin_is_refused_without_cors(self) -> None:
        response = self.client.get("/health", headers={"origin": EVIL})
        self.assertEqual(response.status_code, 403)
        self.assertNotIn("access-control-allow-origin", response.headers)
        response = self.client.get("/jobs", headers={"origin": EVIL, **self.launch})
        self.assertEqual(response.status_code, 403, "even a valid token is refused from an unknown site")
        preflight = self.client.options("/jobs", headers={"origin": EVIL, "access-control-request-method": "GET"})
        self.assertEqual(preflight.status_code, 403)

    def test_allowed_origin_gets_exact_cors(self) -> None:
        preflight = self.client.options(
            "/jobs",
            headers={"origin": SITE, "access-control-request-method": "GET", "access-control-request-private-network": "true"},
        )
        self.assertEqual(preflight.status_code, 204)
        self.assertEqual(preflight.headers["access-control-allow-origin"], SITE)
        self.assertEqual(preflight.headers["access-control-allow-private-network"], "true")
        self.assertNotEqual(preflight.headers["access-control-allow-origin"], "*")

    def test_pairing_flow_and_revocation(self) -> None:
        token = self.pair()
        auth = {"authorization": f"Bearer {token}", "origin": SITE}
        self.assertEqual(self.client.get("/jobs", headers=auth).status_code, 200)
        # A pairing token cannot manage pairings.
        self.assertEqual(self.client.get("/pairings", headers=auth).status_code, 403)
        self.assertEqual(self.client.post("/pair/requests/approve", json={"code": "AAAA-BBBB"}, headers=auth).status_code, 403)
        # Persistent: a new process state (simulated restart) keeps the pairing.
        listed = self.client.get("/pairings", headers=self.launch).json()
        pairing_id = next(item["id"] for item in listed)
        self.assertEqual(self.client.delete(f"/pairings/{pairing_id}", headers=self.launch).status_code, 200)
        self.assertEqual(self.client.get("/jobs", headers=auth).status_code, 401)

    def test_pairing_only_from_allowed_site(self) -> None:
        self.assertEqual(self.client.post("/pair/request", json={"name": "x"}).status_code, 403)
        self.assertEqual(self.client.post("/pair/request", json={"name": "x"}, headers={"origin": EVIL}).status_code, 403)

    def test_poll_needs_the_request_secret(self) -> None:
        created = self.client.post("/pair/request", json={"name": "x"}, headers={"origin": SITE}).json()
        self.assertEqual(self.client.get(f"/pair/request/{created['id']}", headers={"origin": SITE}).status_code, 404)
        wrong = self.client.get(f"/pair/request/{created['id']}", headers={"origin": SITE, "x-pair-secret": "nope"})
        self.assertEqual(wrong.status_code, 404)
        self.client.post("/pair/requests/deny", json={"code": created["code"]}, headers=self.launch)
        denied = self.client.get(f"/pair/request/{created['id']}", headers={"origin": SITE, "x-pair-secret": created["secret"]})
        self.assertEqual(denied.json()["status"], "denied")

    def test_tickets_only_open_media_and_events(self) -> None:
        token = self.pair()
        auth = {"authorization": f"Bearer {token}", "origin": SITE}
        ticket = self.client.post("/auth/ticket", headers=auth).json()["ticket"]
        # Missing file with a valid ticket reaches the file server (404), not the guard (401).
        self.assertEqual(self.client.get(f"/files/nothing/clip.mp4?ticket={ticket}").status_code, 404)
        self.assertEqual(self.client.get("/files/nothing/clip.mp4").status_code, 401)
        self.assertEqual(self.client.get(f"/jobs?ticket={ticket}").status_code, 401, "tickets do not open the JSON API")
        self.assertEqual(self.client.get(f"/files/x?ticket={ticket[:-2]}aa").status_code, 401, "tampered ticket")
        # A ticket dies with its pairing.
        self.client.delete("/pairing", headers=auth)
        self.assertEqual(self.client.get(f"/files/nothing/clip.mp4?ticket={ticket}").status_code, 401)

    def test_expired_ticket(self) -> None:
        expired = security.make_ticket(security.Principal("launch"), seconds=-5)["ticket"]
        self.assertEqual(self.client.get(f"/files/x?ticket={expired}").status_code, 401)


if __name__ == "__main__":
    unittest.main()
