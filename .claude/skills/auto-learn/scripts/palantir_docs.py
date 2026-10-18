"""Bounded collection of Palantir's public English documentation, without learning claims."""

import hashlib
import http.client
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

BASE = "https://www.palantir.com"
SITEMAPS = [f"{BASE}/docs/sitemap{suffix}.xml" for suffix in ("", "-1", "-2")]
SEEDS = [f"{BASE}/platforms/ontology", f"{BASE}/docs/foundry", *(
    f"{BASE}/docs/foundry/{path}" for path in (
        "developers", "data-integration/overview", "model-integration/overview", "action-types/overview",
        "security/overview", "object-backend/overview", "architecture-center/multimodal-data-plane",
        "ontology-sdk/overview", "chatbot-studio/tools", "ontology-mcp", "functions/overview"))]
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


def canonical(url):
    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme != "https" or parsed.netloc.lower() not in ("palantir.com", "www.palantir.com")
            or re.search(r"%(?:2f|5c|2e)", parsed.path, re.I)):
        return ""
    path = re.sub(r"/+", "/", parsed.path).rstrip("/")
    if any(part in (".", "..") for part in path.split("/")):
        return ""
    path = re.sub(r"^/docs/(?:en|jp|kr|zh)(?=/|$)", "/docs", path)
    if path == "/docs/foundry/ontology-mcp/overview":
        path = "/docs/foundry/ontology-mcp"
    if not (path == "/docs" or path.startswith("/docs/") or path == "/platforms/ontology"):
        return ""
    return BASE + path


def page_url(url):
    url = canonical(url)
    path = urllib.parse.urlsplit(url).path
    excluded = {"/docs/500", "/docs/404", "/docs/feedback", "/docs/versions",
                *(f"/docs/{product}/search" for product in ("apollo", "foundry", "gotham"))}
    if not url or path.endswith((".xml", ".txt")) or path in excluded:
        return ""
    return url


def listed(lines):
    section = ""
    for line in lines:
        if line.startswith("## "):
            section = line[3:].strip()
        if section == "공식 문서" and line.startswith("|"):
            if any(canonical(url) == BASE + "/docs" for url in re.findall(r"https://[^\s) |]+", line)):
                return True
    return False


class OfficialRedirects(urllib.request.HTTPRedirectHandler):
    # Python 3.9 does not dispatch HTTP 308 redirects.
    http_error_308 = urllib.request.HTTPRedirectHandler.http_error_302

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not canonical(newurl):
            raise ValueError("redirect outside Palantir documentation")
        redirected = super().redirect_request(req, fp, 307 if code == 308 else code, msg, headers, newurl)
        if code == 308:
            redirected.method = req.get_method()
        return redirected


def fetch(url):
    if not canonical(url):
        raise ValueError("URL outside Palantir documentation")
    request = urllib.request.Request(url, headers={"User-Agent": "vault-auto-learn/1.0", "Accept-Language": "en"})
    try:
        with urllib.request.build_opener(OfficialRedirects()).open(request, timeout=20) as response:
            data = response.read(8 * 1024 * 1024 + 1)
            if len(data) > 8 * 1024 * 1024:
                raise ValueError("response exceeds 8 MiB")
            return data.decode("utf-8", "replace")
    except http.client.HTTPException as error:
        raise ValueError(f"HTTP response failed: {error}") from error


class BodyParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.groups = []
        self.title = []
        self.next_data = []
        self.in_next_data = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("id") == "__NEXT_DATA__":
            self.in_next_data = True
        parent_skip, group = self.stack[-1][1:] if self.stack else (False, None)
        skip = (parent_skip or tag in ("script", "style", "nav", "header", "footer", "aside", "svg", "noscript")
                or attrs.get("aria-hidden") == "true" or "data-pagefind-ignore" in attrs)
        rank = None
        if "data-pagefind-body" in attrs:
            rank = 3
        elif "__bodyContainer__" in (attrs.get("class") or ""):
            rank = 2
        elif tag in ("main", "article"):
            rank = 1
        elif tag == "body":
            rank = 0
        if rank is not None and not skip:
            group = len(self.groups)
            self.groups.append((rank, []))
        if group is not None and not skip:
            if tag in ("p", "div", "li", "tr", "pre", "br") or re.fullmatch(r"h[1-6]", tag):
                self.groups[group][1].append("\n")
        if tag not in VOID:
            self.stack.append((tag, skip, group))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_next_data = False
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                _, skip, group = self.stack[index]
                if group is not None and not skip:
                    self.groups[group][1].append("\n" if tag in ("p", "div", "li", "tr", "pre") or re.fullmatch(r"h[1-6]", tag) else " ")
                del self.stack[index:]
                break

    def handle_data(self, data):
        if self.in_next_data:
            self.next_data.append(data)
        if self.stack and self.stack[-1][0] == "title" and any(tag == "head" for tag, _, _ in self.stack):
            self.title.append(data)
        if self.stack:
            _, skip, group = self.stack[-1]
            if group is not None and not skip:
                self.groups[group][1].append(data)


def extract(body):
    parser = BodyParser()
    parser.feed(body)
    title = " ".join(parser.title).strip().replace("\u00b7", ",")
    try:
        props = json.loads("".join(parser.next_data))["props"]["pageProps"]
    except (ValueError, KeyError, TypeError):
        props = {}
    if not isinstance(props, dict):
        props = {}
    page = props.get("page")
    if not isinstance(page, dict):
        page = {}
    content = page.get("content")
    if isinstance(props.get("markdown"), str):
        content = {"type": "markdown", "markdown": props["markdown"]}
    has_document_data = "releases" in props or (isinstance(content, dict) and bool(content.get("type")))
    if "releases" in props:
        releases = props["releases"]
        if not isinstance(releases, list) or not releases:
            raise ValueError("empty_body: missing release notes")
        for day in releases:
            if (not isinstance(day, dict) or not isinstance(day.get("date"), str)
                    or not day["date"].strip() or not isinstance(day.get("releaseNotes"), list)
                    or not day["releaseNotes"]):
                raise ValueError("empty_body: missing release day or notes")
            for note in day["releaseNotes"]:
                if (not isinstance(note, dict) or not isinstance(note.get("title"), str)
                        or not note["title"].strip()
                        or not any(isinstance(note.get(key), str) and note[key].strip()
                                   for key in ("description", "longDescription"))):
                    raise ValueError("empty_body: missing release narrative")
        text = json.dumps(releases, ensure_ascii=False, indent=2)
    elif has_document_data:
        if isinstance(page.get("title"), str):
            title = page["title"].replace("\u00b7", ",")
        kind = content["type"]
        if kind == "markdown" and isinstance(content.get("markdown"), str):
            text = content["markdown"].strip()
        elif kind in ("ontology", "endpoint"):
            payload = content.get(kind)
            if not isinstance(payload, dict) or not payload:
                raise ValueError("empty_body: missing typed document payload")
            if kind == "endpoint":
                if (not all(isinstance(payload.get(key), str) and payload[key].strip()
                            for key in ("operationId", "path"))
                        or not isinstance(payload.get("operationType"), dict)
                        or payload["operationType"].get("type") not in
                        ("get", "post", "put", "patch", "delete", "head", "options")):
                    raise ValueError("empty_body: missing endpoint operation")
            elif not ((isinstance(payload.get("description"), str) and payload["description"].strip())
                      or (isinstance(payload.get("properties"), list) and payload["properties"])
                      or (isinstance(payload.get("ontologyEntityTypeContent"), dict)
                          and payload["ontologyEntityTypeContent"])):
                raise ValueError("empty_body: missing ontology definition")
            # Preserve schemas and code while excluding navigation and the site-wide graph.
            text = json.dumps(content, ensure_ascii=False, indent=2)
        else:
            raise ValueError("empty_body: unsupported or missing document content")
    else:
        if not parser.groups or max(rank for rank, _ in parser.groups) == 0:
            raise ValueError("empty_body: no document container")
        _, chunks = max(parser.groups, key=lambda group: group[0])
        text = "\n".join(line for line in (re.sub(r"[ \t\r\f\v]+", " ", line).strip()
                                          for line in "".join(chunks).splitlines()) if line)
        if re.search(r"(?:^|\n)loading(?:\.\.\.|\u2026)\s*$", text, re.I):
            raise ValueError("empty_body: loading document shell")
    if not text or (not has_document_data and len(text) < 80) or re.search(r"access denied|page not found|just a moment|verify you are human", title, re.I):
        raise ValueError("empty_body: missing or blocked document text")
    return title, text


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def discover(state_dir, conf, dry_run=False):
    root = Path(state_dir) / "palantir"
    state = load(root / "STATE.json")
    entries = state.setdefault("documents", {})
    t = time.time()
    limit = max(1, min(100, int(conf.get("fetch_limit", 12))))
    refresh = max(1, int(conf.get("refresh_hours", 168))) * 3600
    seeds = list(dict.fromkeys(filter(None, map(page_url, [*conf.get("seed_urls", []), *SEEDS]))))
    for url in seeds:
        entries.setdefault(url, {"discovered_at": t})
    errors = []
    if t >= state.get("sitemap_retry_at", 0) and t - state.get("sitemap_checked_at", 0) >= 86400:
        pending, visited = list(SITEMAPS), set()
        raw_urls, aliases, filtered = set(), set(), set()
        try:
            robots = fetch(BASE + "/docs/robots.txt")
            pending += [url for url in (canonical(u) for u in re.findall(r"(?mi)^Sitemap:\s*(\S+)", robots)) if url]
        except (OSError, ValueError) as error:
            errors.append(f"robots: {error}")
        while pending and len(visited) < 20:
            url = pending.pop(0)
            if url in visited:
                continue
            visited.add(url)
            try:
                tree = ET.fromstring(fetch(url))
                if tree.tag == f"{{{NS['s']}}}sitemapindex":
                    pending += [u for u in (canonical(e.findtext("s:loc", "", NS)) for e in tree) if u]
                    continue
                if tree.tag != f"{{{NS['s']}}}urlset":
                    raise ValueError("invalid sitemap root")
                for row in tree:
                    original = row.findtext("s:loc", "", NS)
                    raw_urls.add(original)
                    target = page_url(original)
                    if target:
                        translated = bool(re.search(r"/docs/(?:jp|kr|zh)/", original))
                        if translated:
                            aliases.add(original)
                        entry = entries.setdefault(target, {"discovered_at": t})
                        if not translated or entry.get("lastmod_translated", True):
                            entry["lastmod"] = row.findtext("s:lastmod", "", NS)
                            entry["lastmod_translated"] = translated
                    else:
                        filtered.add(original)
            except (OSError, ValueError, ET.ParseError) as error:
                errors.append(f"sitemap {url}: {error}")
        if pending:
            errors.append("sitemap traversal exceeds 20 files")
        state["sitemap_errors"] = errors
        state["sitemap_counts"] = {"raw_urls": len(raw_urls), "language_aliases": len(aliases), "filtered_urls": len(filtered)}
        state["sitemap_retry_at"] = t + 1800 if errors else 0
        if not errors:
            state["sitemap_checked_at"] = t
    priority = {url: index for index, url in enumerate(seeds)}
    due = [(url, entry) for url, entry in entries.items() if t >= entry.get("retry_at", 0)
           and (not entry.get("key") or entry.get("lastmod") != entry.get("fetched_lastmod")
                or t - entry.get("checked_at", 0) >= refresh)]
    due.sort(key=lambda item: (bool(item[1].get("key")), priority.get(item[0], len(seeds)), item[1].get("checked_at", 0), item[0]))
    report = {"discovered": len(entries), "due": len(due), "fetched": 0, "changed": 0, "errors": errors, "fetch_errors": [],
              "would_fetch": [url for url, _ in due[:limit]] if dry_run else []}
    if dry_run:
        return report
    for url, entry in due[:limit]:
        entry["checked_at"] = t
        try:
            title, text = extract(fetch(url))
            digest = hashlib.sha256(text.encode()).hexdigest()
            doc_id = hashlib.sha256(url.encode()).hexdigest()[:20]
            key = f"palantir:{doc_id}:{digest}"
            path = Path(state_dir) / "inbox" / "palantir" / f"{doc_id}-{digest}.md"
            if not path.exists():
                write(path, f"# {title}\n\n- Source: {url}\n- Fetched: {t:.0f}\n- SHA256: {digest}\n\n{text}\n")
            report["fetched"] += 1
            report["changed"] += key != entry.get("key")
            entry.update(key=key, path=str(path), title=title, sha256=digest, fetched_at=t,
                         fetched_lastmod=entry.get("lastmod"), failures=0, retry_at=0, error="")
        except (OSError, ValueError) as error:
            report["fetch_errors"].append({"url": url, "error": str(error)})
            failures = entry.get("failures", 0) + 1
            entry.update(error=str(error), failures=failures, retry_at=t + min(86400, 1800 * 2 ** min(failures - 1, 6)))
    write(root / "STATE.json", json.dumps(state, ensure_ascii=False, indent=1) + "\n")
    return report


def baseline(state_dir):
    """Body hashes already learned outside the queue, such as a manual full-corpus pass."""
    return load(Path(state_dir) / "palantir" / "BASELINE.json").get("documents", {})


def candidates(state_dir, done):
    entries = load(Path(state_dir) / "palantir" / "STATE.json").get("documents", {})
    known = baseline(state_dir)
    return [{"key": e["key"], "source": "palantir", "title": e.get("title", ""), "url": url,
             "path": e["path"], "sha256": e["sha256"], "fetched_at": e["fetched_at"], "tags": ["tech", "biz"]}
            for url, e in entries.items() if e.get("key") not in done and e.get("sha256") not in known.get(url, ())
            and e.get("path") and Path(e["path"]).is_file()]


def summary(state_dir, log_rows):
    state = load(Path(state_dir) / "palantir" / "STATE.json")
    entries = state.get("documents", {})
    learned = {r.get("key") for r in log_rows if r.get("result") in ("learned", "merged") and r.get("commit")}
    known = baseline(state_dir)
    return {"discovered": len(entries), "fetched": sum(bool(e.get("key")) for e in entries.values()),
            "learned_current": sum(e.get("key") in learned for e in entries.values()),
            "baseline_current": sum(e.get("sha256") in known.get(url, ()) for url, e in entries.items()),
            "fetch_errors": sum(bool(e.get("error")) for e in entries.values()),
            "sitemap_counts": state.get("sitemap_counts", {}),
            "sitemap_checked_at": state.get("sitemap_checked_at"), "sitemap_errors": state.get("sitemap_errors", [])}
