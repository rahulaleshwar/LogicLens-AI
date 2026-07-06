"""Bounded passive-inspection primitives shared by MCP and tests."""

from __future__ import annotations

import asyncio
import ipaddress
import socket
import ssl
import time
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

MAX_RESPONSE_BYTES = 256_000
MAX_REDIRECTS = 3
REQUEST_TIMEOUT_SECONDS = 10.0
USER_AGENT = "LogicLens-Passive-Inspector/1.0"


class UnsafeTargetError(ValueError):
    """Raised when a target could expose internal or non-public infrastructure."""


def _is_public_ip(value: str) -> bool:
    ip = ipaddress.ip_address(value)
    return bool(ip.is_global)


async def validate_public_url(url: str) -> str:
    """Validate scheme and every resolved address for SSRF protection."""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise UnsafeTargetError("Only explicit HTTP(S) URLs are allowed")
    if parsed.username or parsed.password:
        raise UnsafeTargetError("Credentials in URLs are not allowed")
    if parsed.hostname.lower() in {"localhost", "localhost.localdomain"}:
        raise UnsafeTargetError("Local targets are blocked")
    try:
        literal = ipaddress.ip_address(parsed.hostname)
        addresses = [str(literal)]
    except ValueError:
        loop = asyncio.get_running_loop()
        records = await loop.getaddrinfo(
            parsed.hostname,
            parsed.port or (443 if parsed.scheme == "https" else 80),
            type=socket.SOCK_STREAM,
        )
        addresses = [str(record[4][0]) for record in records]
    if not addresses or any(not _is_public_ip(address) for address in addresses):
        raise UnsafeTargetError(
            "Target resolves to a private, local, reserved, or non-public address"
        )
    return url


async def inspect_http_url(url: str, method: str = "GET") -> dict[str, Any]:
    """Perform a bounded passive GET or HEAD while validating every redirect."""
    method = method.upper()
    if method not in {"GET", "HEAD"}:
        return {"status": "denied", "error": "Only GET and HEAD are permitted"}
    try:
        current = await validate_public_url(url)
        redirect_history: list[dict[str, Any]] = []
        started = time.perf_counter()
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT_SECONDS,
            follow_redirects=False,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/json;q=0.9,*/*;q=0.1",
            },
        ) as client:
            for _ in range(MAX_REDIRECTS + 1):
                async with client.stream(method, current) as response:
                    if response.is_redirect:
                        location = response.headers.get("location")
                        if not location:
                            break
                        next_url = urljoin(current, location)
                        await validate_public_url(next_url)
                        redirect_history.append({"status": response.status_code, "url": current})
                        current = next_url
                        continue
                    chunks: list[bytes] = []
                    size = 0
                    truncated = False
                    if method == "GET":
                        async for chunk in response.aiter_bytes():
                            remaining = MAX_RESPONSE_BYTES - size
                            if remaining <= 0:
                                truncated = True
                                break
                            chunks.append(chunk[:remaining])
                            size += len(chunk[:remaining])
                            if len(chunk) > remaining:
                                truncated = True
                                break
                    selected_headers = {
                        key.lower(): value
                        for key, value in response.headers.items()
                        if key.lower()
                        in {
                            "content-type",
                            "content-length",
                            "server",
                            "set-cookie",
                            "strict-transport-security",
                            "content-security-policy",
                            "x-content-type-options",
                            "x-frame-options",
                            "referrer-policy",
                            "permissions-policy",
                            "cache-control",
                        }
                    }
                    body = b"".join(chunks).decode(response.encoding or "utf-8", errors="replace")
                    return {
                        "status": "success",
                        "requested_url": url,
                        "final_url": str(response.url),
                        "http_status": response.status_code,
                        "redirect_history": redirect_history,
                        "headers": selected_headers,
                        "body_sample": body,
                        "body_bytes": size,
                        "truncated": truncated,
                        "elapsed_ms": round((time.perf_counter() - started) * 1000, 2),
                    }
        return {"status": "error", "error": "Redirect limit exceeded"}
    except (UnsafeTargetError, httpx.HTTPError, socket.gaierror) as exc:
        return {"status": "error", "error": str(exc)}


def inspect_security_headers(headers: dict[str, str]) -> dict[str, Any]:
    """Evaluate already captured response headers using deterministic rules."""
    normalized = {key.lower(): value for key, value in headers.items()}
    checks = {
        "strict-transport-security": "Enforces HTTPS for future browser requests",
        "content-security-policy": "Restricts script and content execution sources",
        "x-content-type-options": "Prevents MIME-type sniffing",
        "x-frame-options": "Restricts framing and clickjacking exposure",
        "referrer-policy": "Controls referrer information leakage",
        "permissions-policy": "Restricts access to browser capabilities",
    }
    missing = [
        {"header": key, "reason": reason} for key, reason in checks.items() if key not in normalized
    ]
    return {
        "status": "success",
        "present": sorted(key for key in checks if key in normalized),
        "missing": missing,
        "score": round((len(checks) - len(missing)) / len(checks), 2),
    }


class _PublicLinkParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__()
        self.base_url = base_url
        self.links: set[str] = set()
        self.scripts: set[str] = set()
        self.forms: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "a" and values.get("href"):
            self.links.add(urljoin(self.base_url, values["href"]))
        elif tag == "script" and values.get("src"):
            self.scripts.add(urljoin(self.base_url, values["src"]))
        elif tag == "form":
            self.forms.add(urljoin(self.base_url, values.get("action") or self.base_url))


def extract_public_links(base_url: str, html: str) -> dict[str, Any]:
    """Extract public page references without fetching or executing them."""
    parser = _PublicLinkParser(base_url)
    parser.feed(html[:MAX_RESPONSE_BYTES])

    def allowed(values: set[str]) -> list[str]:
        return sorted(value for value in values if urlparse(value).scheme in {"http", "https"})[
            :200
        ]

    return {
        "status": "success",
        "links": allowed(parser.links),
        "scripts": allowed(parser.scripts),
        "forms": allowed(parser.forms),
    }


async def inspect_tls_certificate(hostname: str, port: int = 443) -> dict[str, Any]:
    """Read public TLS certificate metadata without sending application data."""
    try:
        await validate_public_url(f"https://{hostname}:{port}")

        def fetch() -> dict[str, Any]:
            context = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=REQUEST_TIMEOUT_SECONDS) as raw:
                with context.wrap_socket(raw, server_hostname=hostname) as tls:
                    certificate = tls.getpeercert() or {}
                    return {
                        "status": "success",
                        "subject": certificate.get("subject"),
                        "issuer": certificate.get("issuer"),
                        "serial_number": certificate.get("serialNumber"),
                        "not_before": certificate.get("notBefore"),
                        "not_after": certificate.get("notAfter"),
                        "subject_alt_names": certificate.get("subjectAltName", [])[:100],
                        "protocol": tls.version(),
                    }

        return await asyncio.to_thread(fetch)
    except (UnsafeTargetError, OSError, ssl.SSLError) as exc:
        return {"status": "error", "error": str(exc)}


def request_active_test(operation: str, target_url: str, approval_id: str) -> dict[str, Any]:
    """Deny active testing unless a future external approval service validates it."""
    return {
        "status": "denied",
        "operation": operation,
        "target_url": target_url,
        "approval_id": approval_id,
        "error": "Active testing is not implemented. Human approval verification is mandatory.",
    }
