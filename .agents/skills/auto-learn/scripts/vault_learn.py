#!/usr/bin/env python3
"""auto-learn 파이프라인의 결정적 작업을 맡는다.

전사 큐와 작업자, 학습 출처 목록의 채널 RSS 수집, 임시 전사 작업 이관, 단서 수집함 색인, learn과 harvest run의
기준선과 규칙 검사, Git 게시와 증명, 다이제스트 자료, launchd가 부르는 Claude/Codex 실행(잠금, 시간 제한, 사용량 한도
백오프)을 한다. 상태는 장비 로컬 디렉터리(기본 ~/.local/state/vault-auto-learn, VAULT_LEARN_STATE로 변경)에 두고
저장소에는 지식 문서와 학습 출처 목록만 커밋한다. 절차와 운영은 같은 스킬의 SKILL.md를 따르며 표준 라이브러리만 쓴다.
"""

import argparse
import contextlib
import datetime as dt
import fcntl
import hashlib
import html
import io
import json
import os
import plistlib
import re
import shlex
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# 스킬 스크립트의 __pycache__는 다음 실행이 불러오는 코드라 실행 검사가 본다. VL은 바이트코드를 쓰지 않아 정상 실행이
# 그 파일을 바꾸지 않는다(launchd, 엔진의 VL 호출과 대화형 실행 모두 이 줄을 지난다).
sys.dont_write_bytecode = True
import palantir_docs  # noqa: E402

SCRIPT = Path(__file__).resolve()
SKILL = SCRIPT.parent.parent
REPO = SKILL.parents[2]
TRANSCRIBE = SKILL.parent / "memo" / "scripts" / "yt_transcript.py"
S = Path(os.environ.get("VAULT_LEARN_STATE", "~/.local/state/vault-auto-learn")).expanduser()
LABEL = "com.dcchoi.vault-learn."
MODES = ("harvest", "instagram", "learn", "digest")
# 과거 DM 기록의 가림용 이름(instagram_dm_name)과 뉴스레터 발신 주소는 config.json에만 둔다.
# 2026-10-25 사용자 결정: 모든 작업에서 Claude가 우선이고 Codex는 Claude를 쓸 수 없을 때만 쓴다(alternate, primary claude).
DEFAULTS = {"k": 6, "jobs": 2, "whisper_threads": 4, "learn_timeout_min": 180, "harvest_timeout_min": 90,
            "instagram_timeout_min": 45, "digest_timeout_min": 30, "idle_interval_min": 180, "stale_days": 180,
            "claude": "claude", "codex": "codex", "codex_model": "gpt-6-astra", "codex_effort": "high",
            "engine": {mode: "alternate" for mode in MODES}, "primary": {mode: "claude" for mode in MODES},
            "threads_reposts_url": "", "adhoc_dir": "", "instagram_saved_url": "",
            "instagram_saved_collection": "", "instagram_dm_name": "", "instagram_dm_thread_url": "",
            "email_since": "", "email_senders": []}
# 30초 간격 3회 재시도는 사용자 결정이다. 그 뒤 6시간 쉬고 다시 시도하며, 세 차례 모두 실패하면 제외한다.
ATTEMPTS, RETRY_WAIT_S, COOLDOWN_S, MAX_ROUNDS, MAX_LIVE_ROUNDS = 3, 30, 6 * 3600, 3, 20
PERMANENT = re.compile(
    r"members-only|Join this channel|Private video|This video is private|Video unavailable|video has been removed|"
    r"account associated with this video has been terminated|confirm your age|"
    r"말소리를 찾지 못했다|전사 결과가 비어 있다|받을 수 있는 오디오 형식이 없다|영상 하나의 URL", re.I)
LIVE = re.compile(r"라이브 방송이다|Premieres in|live event will begin", re.I)
SYSTEMIC = re.compile(r"not a bot|HTTP Error 429|Too Many Requests", re.I)
LIMIT = re.compile(r"usage limit|limit reached|hit your (?:(?:session|weekly) )?limit|rate.?limit|overloaded|\b(?:429|529)\b", re.I)
WIKILINK = re.compile(r"\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")
PHONE = re.compile(r"(?<!\d)0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}(?!\d)")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
SAFE_EMAIL = re.compile(r"^(?:git|ec2-user|ubuntu|root|admin|user|postgres|no-?reply)@|@(?:example|test|localhost)\b|"
                        r"\.(?:png|jpe?g|gif|svg|webp)$", re.I)
# 공개 저장소로 자동 푸시하므로 키와 토큰 형식을 막는다. AWS 문서의 예시 키(...EXAMPLE)는 허용한다.
SECRET = re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:AKIA|ASIA)(?![0-9A-Z]{9}EXAMPLE)[0-9A-Z]{16}\b|"
                    r"\bgh[pousr]_[A-Za-z0-9]{30,}|\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}|\bxox[abprs]-[A-Za-z0-9-]{10,}|"
                    r"\bAIza[0-9A-Za-z_-]{35}\b")
VIDEO = re.compile(r"(?:[?&]v=|youtu\.be/|/shorts/|/live/|/embed/)([\w-]{11})(?![\w-])")
# 자동 학습이 고치고 게시하는 지식 문서. AGENTS.md, CLAUDE.md와 그 변형(AGENTS.override.md, CLAUDE.local.md)은 다음
# 실행이 읽는 지침이라 도메인 폴더 안에 있어도 제외한다(대소문자를 가리지 않는 macOS 파일 시스템).
EDITABLE = re.compile(r"^(?:tech|biz|econ|fit)/(?:.+/)?(?!(?i:agents|claude)(?:\.[^/]+)?\.md$)[^/]+\.md$")
TRAILERS = {"claude": "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>",
            "codex": "Co-Authored-By: Codex <noreply@openai.com>"}
TRAILER = TRAILERS["claude"]
ENGINES = ("claude", "codex")
AUTH = re.compile(r"authentication|unauthorized|not logged in|login required|invalid.?api.?key|\b401\b", re.I)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
ATOM = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
INDEX_COLS = ["order", "id", "status", "reason", "author", "posted_at", "chain", "captured", "images", "videos",
              "links", "title", "file"]
TITLE_SKIP = ("[[QUOTE]]", "## ", "Source:", "Media:", "- [")
# 학습할 YouTube 채널과 뉴스레터의 정본(2026-10-05 사용자 결정). channels.tsv는 채널 id 캐시와 제외 기록이다.
SOURCES = "fit/growth/learning/Learning-Sources.md"
SOURCE_SECTIONS = ("YouTube 채널", "이메일 뉴스레터")
DOMAINS = ("tech", "biz", "econ", "fit")
YT_LINK = re.compile(r"\]\(https://www\.youtube\.com/(@[^)\s]+|channel/UC[\w-]{22})\)")
CHANNEL_COLS = ["handle", "channel_id", "title", "decision", "reason", "added_at"]
# 단서 수집함과 learn key 접두사. threads의 본 id 목록은 처음 만든 이름(seen_reposts)을 그대로 쓴다.
INBOX = {"threads": "repost", "instagram": "insta", "email": "email"}
GMAIL_READ = ("search_threads", "get_thread", "get_message")
GMAIL_WRITE = ("send_message reply forward create_draft update_draft delete_draft label_message label_thread "
               "unlabel_message unlabel_thread update_message_labels apply_sensitive_message_label "
               "apply_sensitive_thread_label create_label update_label delete_label trash_message trash_thread "
               "untrash_message untrash_thread mark_message_spam mark_thread_spam unmark_message_spam "
               "unmark_thread_spam").split()
BROWSER = ("harvest", "instagram")  # ego lite를 쓰는 수집 작업
# 브라우저 결과 신호. 두 엔진은 같은 ego lite 프로필을 쓰므로 로그아웃(logged_out)은 엔진을 바꿔도 같다. 연결 실패(chrome)는
# Claude가 보면 ego lite 문제지만 Codex는 자기 샌드박스나 규칙 문제일 수 있다. 사용자가 넘겨받은 브라우저는 재시도하거나
# 우회하지 않는다(takeover, ego-browser 안내의 사용자 제어 규칙).
BROWSER_SIGNALS = {"CHROME_UNAVAILABLE": "chrome", "INSTAGRAM_LOGGED_OUT": "logged_out",
                   "GMAIL_LOGGED_OUT": "logged_out", "USER_TAKEOVER": "takeover"}
ENGINE_WAIT = ("limit", "auth", "unavailable")  # 엔진 자체를 쓸 수 없다. 이때만 다른 엔진이 대신한다.
BROWSER_WAIT = ("chrome", "logged_out")  # 그 수집 작업만 쉰다. S/backoff/browser-<모드>.json
ORIGIN_MAIN = "refs/remotes/origin/main"
PENDING = "guard-pending.json"  # 실행 뒤 검사가 끝나야 지우는 표시(S 아래)
# Codex 실행에서 끄는 브라우저 MCP(2026-10-25 사용자 결정): Playwright, node_repl, unified-computer-use 플러그인의 cua_repl.
# 플러그인 이름에 '@'가 있어 점 경로로 쓰면 따옴표가 키 글자로 남아 꺼지지 않으므로(codex-cli 0.164.0의 codex mcp list로
# 확인) 인라인 표로 끈다.
BROWSER_MCP = ("playwright", "node_repl", "cua_repl")
CODEX_NO_BROWSER = ("-c", "mcp_servers.playwright.enabled=false", "-c", "mcp_servers.node_repl.enabled=false",
                    "-c", 'plugins={"unified-computer-use@openai-bundled"={enabled=false}}')
STOP = threading.Event()


# ---------------------------------------------------------------- 공통 도구

def now():
    return dt.datetime.now().astimezone()


def stamp():
    return now().strftime("%Y%m%d-%H%M%S")


def log(message):
    print(f"{now():%Y-%m-%d %H:%M:%S} {message}", flush=True)


def emit(obj):
    print(json.dumps(obj, ensure_ascii=False, indent=1))


def field(value):
    """TSV 칸에 넣을 수 있게 탭과 줄바꿈을 공백 하나로 줄인다."""
    return re.sub(r"\s+", " ", "" if value is None else str(value)).strip()


def read_lines(path):
    try:
        return Path(path).read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return []


def rows(path):
    return [line.split("\t") for line in read_lines(path) if line.strip()]


def append(path, text):
    """한 번의 write로 덧붙여 다른 작업자의 줄과 섞이지 않게 한다."""
    if not text:
        return
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(text)


def write_text(path, text):
    """중간에 끊겨도 반쯤 쓴 파일이 남지 않도록 임시 파일에 쓴 뒤 옮긴다."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def read_json(path, default=None):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def write_json(path, obj):
    write_text(path, json.dumps(obj, ensure_ascii=False, indent=1) + "\n")


def read_jsonl(path):
    out = []
    for line in read_lines(path):
        with contextlib.suppress(ValueError):
            out.append(json.loads(line))
    return out


def cfg():
    return DEFAULTS | (read_json(S / "config.json", {}) or {})


@contextlib.contextmanager
def locked(name, wait=True):
    """프로세스가 죽으면 풀리는 flock. wait=False면 이미 잡혀 있을 때 False를 준다."""
    path = S / "locks" / f"{name}.lock"
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        try:
            fcntl.flock(f, fcntl.LOCK_EX | (0 if wait else fcntl.LOCK_NB))
        except BlockingIOError:
            yield False
            return
        yield True


def ensure_layout():
    for name in ("queue", "transcripts", *(f"inbox/{src}" for src in INBOX), "digests", "runs", "logs/agent", "locks",
                 "tmp", "launchd", "migrate"):
        (S / name).mkdir(parents=True, exist_ok=True)


def seen_file(src):
    return S / ("seen_reposts" if src == "threads" else f"seen_{src}")


def hkey(handle):
    """YouTube handle 비교 키. 대소문자와 한글 자모 분리(NFD) 차이를 무시한다."""
    return unicodedata.normalize("NFC", handle.strip()).lower()


def parse_sources(lines):
    """학습 출처 목록에서 YouTube 채널 {handle: (채널명, 태그)}와 뉴스레터 {이름: 태그}를 읽는다."""
    channels, letters, section = {}, {}, ""
    for line in lines:
        section = line[3:].strip() if line.startswith("## ") else section
        cells = [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", line.strip())[1:-1]]
        tags = [t for t in re.split(r"[\s,]+", cells[-1]) if t in DOMAINS] if line.startswith("|") and cells else []
        link = YT_LINK.search(line)
        if tags and link and section == SOURCE_SECTIONS[0]:
            channels[urllib.parse.unquote(link.group(1))] = (cells[0], tags)
        elif tags and section == SOURCE_SECTIONS[1]:
            letters[cells[0]] = tags
    return channels, letters


def learning_sources():
    return parse_sources(read_lines(REPO / SOURCES))


def sources_problems(text):
    """학습 출처 목록의 표 행을 discover와 email-query가 읽을 수 있는지 본다(채널 링크, 도메인 태그)."""
    problems, section = [], ""
    for n, line in enumerate(text.splitlines(), 1):
        section = line[3:].strip() if line.startswith("## ") else section
        if section not in SOURCE_SECTIONS or not line.startswith("|") or re.fullmatch(r"[|\s:-]+", line):
            continue
        cells = [c.strip() for c in re.split(r"(?<!\\)\|", line.strip())[1:-1]]
        if cells[-1:] == ["도메인"]:  # 머리글 행
            continue
        tags = re.split(r"[\s,]+", cells[-1]) if cells else [""]
        if not line.rstrip().endswith("|") or not set(tags) <= set(DOMAINS):
            problems.append(f"{SOURCES}:{n}: 마지막 칸은 tech, biz, econ, fit 중 하나 이상이어야 한다")
        elif section == SOURCE_SECTIONS[0] and not YT_LINK.search(line):
            problems.append(f"{SOURCES}:{n}: YouTube 채널 링크가 없다")
    return problems


def http_get(url, timeout=20):
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except (urllib.error.URLError, OSError):
        return 0, ""


def online():
    try:
        urllib.request.urlopen("https://www.youtube.com/generate_204", timeout=10).close()
    except urllib.error.HTTPError:
        return True
    except (urllib.error.URLError, OSError):
        return False
    return True


def video_id(text):
    text = text.strip()
    if re.fullmatch(r"[\w-]{11}", text):
        return text
    match = VIDEO.search(text)
    return match.group(1) if match else None


def as_int(value):
    return int(value) if str(value).isdigit() else 0


def frontmatter(path):
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    match = re.match(r"---\n(.*?)\n---\n", text, re.S)
    meta = {}
    if match:
        for line in match.group(1).splitlines():
            key, sep, value = line.partition(": ")
            if sep:
                meta[key.strip()] = value.strip().strip('"')
    return meta, text[match.end():] if match else text


# ---------------------------------------------------------------- 큐와 전사

def enqueue(items, prio):
    """[id, source, published, title] 목록을 큐에 넣는다. seen_videos에 있는 id는 건너뛰고 넣은 id를 돌려준다."""
    with locked("state"):
        seen = set(read_lines(S / "seen_videos"))
        added = []
        for vid, *rest in items:
            if vid not in seen:
                seen.add(vid)
                added.append([vid, *rest])
        stamped = now().isoformat(timespec="seconds")
        append(S / "queue" / f"{prio}.tsv", "".join("\t".join(map(field, [*a, stamped])) + "\n" for a in added))
        append(S / "seen_videos", "".join(a[0] + "\n" for a in added))
    return [a[0] for a in added]


def done_ids():
    return {p.parent.name for p in (S / "transcripts").glob("*/transcript.md")}


def skipped_ids():
    return {r[0] for r in rows(S / "skipped.tsv")}


def failure_state():
    state = {}
    for r in rows(S / "failures.tsv"):
        if len(r) < 3:
            continue
        s = state.setdefault(r[0], {"rounds": 0, "live": 0, "last": 0.0})
        s["live" if r[2] == "live" else "rounds"] += 1
        s["last"] = max(s["last"], float(r[1]))
    return state


def classify(rc, output):
    if rc == 3:
        return "tools"
    if PERMANENT.search(output):
        return "skip"
    if LIVE.search(output):
        return "live"
    if SYSTEMIC.search(output):
        return "systemic"
    return "transient"


def tidy(work):
    """끝났거나 제외한 작업 폴더의 큰 파일을 지운다. meta.log는 영상당 약 1.7MB인 yt-dlp JSON 로그라 다시 쓰지 않는다."""
    for name in ("audio16k.wav", "audio16k.tmp.wav", "meta.log"):
        (work / name).unlink(missing_ok=True)
    for path in work.glob("download.*"):
        if path.suffix != ".log":
            path.unlink(missing_ok=True)


def record_skip(vid, reason):
    append(S / "skipped.tsv", f"{vid}\t{dt.date.today()}\t{field(reason)[:200]}\n")
    if (S / "transcripts" / vid).is_dir():
        tidy(S / "transcripts" / vid)
    log(f"skip {vid}: {reason}")


class Transcriber:
    """KeepAlive 작업자. 스레드마다 새 업로드 큐를 먼저, 그다음 백로그 큐를 처리한다."""

    def __init__(self, conf):
        self.conf = conf
        self.mu = threading.Lock()
        self.claimed = set()
        self.hold_until = 0.0

    def claim(self):
        with self.mu:
            done, skipped, fails, t = done_ids(), skipped_ids(), failure_state(), time.time()
            for prio in ("new", "backlog"):
                for r in rows(S / "queue" / f"{prio}.tsv"):
                    vid, fail = r[0], fails.get(r[0])
                    if vid in done or vid in skipped or vid in self.claimed or (fail and t - fail["last"] < COOLDOWN_S):
                        continue
                    self.claimed.add(vid)
                    return prio, vid
        return None

    def hold(self, seconds, why):
        log(f"hold {seconds // 60}m: {why}")
        self.hold_until = max(self.hold_until, time.time() + seconds)

    def process(self, prio, vid):
        # JS 런타임이 없으면 yt-dlp가 형식을 못 받아 '오디오 형식이 없다'로 끝나고 영구 제외로 잘못 분류된다.
        if not (shutil.which("node") or shutil.which("deno")):
            return self.hold(15 * 60, "PATH에서 node나 deno를 찾지 못했다")
        output, kind = "", "transient"
        for attempt in range(1, ATTEMPTS + 1):
            p = subprocess.Popen([sys.executable, str(TRANSCRIBE), f"https://www.youtube.com/watch?v={vid}",
                                  "--out", str(S / "transcripts"), "--threads", str(self.conf["whisper_threads"])],
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace")
            out, err = p.communicate()
            # 메타데이터 단계에서 끝나면(라이브, 조회 실패) yt_transcript.py가 수 MB의 meta-<pid>.log를 남긴다.
            (S / "transcripts" / f"meta-{p.pid}.log").unlink(missing_ok=True)
            if p.returncode == 0:
                tidy(S / "transcripts" / vid)
                log(f"done {prio} {vid}")
                return
            output = (out + err).strip()
            kind = classify(p.returncode, output)
            if kind != "transient" or attempt == ATTEMPTS or STOP.wait(RETRY_WAIT_S):
                break
        if STOP.is_set():
            return
        lines = output.splitlines()
        reason = field(next((l for l in lines if l.startswith("오류:")), lines[-1] if lines else "no output"))[:200]
        if kind == "tools":
            return self.hold(15 * 60, reason)
        if kind == "systemic" or (kind == "transient" and not online()):
            return self.hold(30 * 60, reason)
        if kind == "skip":
            return record_skip(vid, reason)
        append(S / "failures.tsv", f"{vid}\t{time.time():.0f}\t{kind}\t{reason}\n")
        state = failure_state().get(vid, {})
        if state.get("rounds", 0) >= MAX_ROUNDS or state.get("live", 0) >= MAX_LIVE_ROUNDS:
            record_skip(vid, f"failed {state.get('rounds', 0)} rounds: {reason}")
        else:
            log(f"retry later {vid}: {reason}")

    def loop(self):
        while not STOP.is_set():
            if (S / "paused").exists() or time.time() < self.hold_until:
                STOP.wait(30)
                continue
            item = self.claim()
            if not item:
                STOP.wait(60)
                continue
            try:
                self.process(*item)
            except Exception as e:  # 한 항목의 예외로 작업자 전체가 멈추지 않게 한다.
                log(f"error {item[1]}: {e!r}")
                STOP.wait(30)
            finally:
                with self.mu:
                    self.claimed.discard(item[1])


def cmd_transcribe(a):
    conf = cfg()
    if a.dry_run:
        worker = Transcriber(conf)
        picks = [worker.claim() for _ in range(5)]
        emit({"next": [p for p in picks if p], "waiting": waiting_counts()})
        return 0
    with locked("transcriber"):  # 다른 작업자가 있으면 끝날 때까지 기다린다(재시작 반복 대신).
        signal.signal(signal.SIGTERM, lambda *_: STOP.set())
        log(f"transcriber start jobs={conf['jobs']}")
        worker = Transcriber(conf)
        threads = [threading.Thread(target=worker.loop) for _ in range(conf["jobs"])]
        for t in threads:
            t.start()
        while any(t.is_alive() for t in threads):
            for t in threads:
                t.join(1)
        log("transcriber stop")
    return 0


def waiting_counts():
    done, skipped = done_ids(), skipped_ids()
    return {prio: sum(1 for r in rows(S / "queue" / f"{prio}.tsv") if r[0] not in done and r[0] not in skipped)
            for prio in ("new", "backlog")}


def cmd_enqueue(a):
    items = []
    for text in a.ids:
        vid = video_id(text)
        if vid:
            items.append([vid, a.source, "", ""])
        else:
            log(f"영상 id를 찾지 못했다: {text}")
    emit({"added": enqueue(items, a.priority)})
    return 0


# ---------------------------------------------------------------- RSS 수집

def fetch_feed(channel_id):
    status, body = http_get(f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}")
    if status != 200:
        return status, []
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        return 0, []
    return 200, [(e.findtext("yt:videoId", "", ATOM), field(e.findtext("a:title", "", ATOM)),
                  e.findtext("a:published", "", ATOM)) for e in root.findall("a:entry", ATOM)]


def poll_due(state, t):
    """최근 60일 안에 올린 영상이 없는 채널은 하루 한 번만 확인한다."""
    if not state or not state.get("last"):
        return True
    quiet = t - dt.datetime.fromisoformat(state["last"]).timestamp() > 60 * 86400
    return not quiet or t - state.get("checked", 0) > 86400


def listed_channels(write=True):
    """학습 출처 목록의 채널을 channels.tsv 캐시 행으로 바꾼다.

    캐시에 없는 handle(다른 장비, 손으로 더한 행)은 채널 페이지에서 id를 찾아 오늘 날짜로 더하므로 그날 이후 업로드부터 모은다.
    """
    listed = learning_sources()[0]
    cache = {hkey(r[0]): r for r in rows(S / "channels.tsv")[1:] if len(r) >= 6 and r[1]}
    missing = [(h, title) for h, (title, _) in listed.items() if hkey(h) not in cache]
    if missing:
        with ThreadPoolExecutor(6) as ex:
            infos = [i for i in ex.map(lambda ht: resolve_channel(*ht), missing) if i["channel_id"]]
        new = [[i["handle"], i["channel_id"], field(i["title"]), "learn", "listed", str(dt.date.today())] for i in infos]
        if write and new:
            with locked("channels"):
                table = rows(S / "channels.tsv") or [CHANNEL_COLS]
                write_text(S / "channels.tsv", "".join("\t".join(r) + "\n" for r in [*table, *new]))
        cache |= {hkey(r[0]): r for r in new}
    return [cache[hkey(h)] for h in listed if hkey(h) in cache]


def cmd_discover(a):
    if (S / "paused").exists() and not a.dry_run:
        log("discover: paused")
        return 0
    with locked("discover", wait=False) as ok:
        if not ok:
            log("discover: 이전 실행이 진행 중")
            return 0
        documents = discover_documents(dry_run=a.dry_run)
        poll = read_json(S / "channel_poll.json", {}) or {}
        if poll.get("_backoff_until", 0) > time.time():
            log("discover: RSS 429 백오프 중")
            return 0
        # 학습 출처 목록이 정본이다. 구독을 해지한 채널은 목록에 남아 있어도 건너뛴다.
        gone = {hkey(h) for h in read_lines(S / "unsubscribed")}
        learn = [r for r in listed_channels(write=not a.dry_run) if hkey(r[0]) not in gone]
        t = time.time()
        due = [r for r in learn if poll_due(poll.get(r[1]), t)][: a.limit or None]
        with ThreadPoolExecutor(6) as ex:
            results = list(ex.map(fetch_feed, (r[1] for r in due)))
        found, throttled = [], False
        for r, (status, entries) in zip(due, results):
            if status == 429:
                throttled = True
            if status != 200:
                continue
            state = poll.setdefault(r[1], {})
            state["checked"] = t
            if entries:
                state["last"] = max(e[2] for e in entries)
            added_at = dt.datetime.fromisoformat(r[5]).astimezone()  # 날짜만 있으면 그날 0시(현지)로 본다.
            found += [[vid, r[0], published, title] for vid, title, published in entries
                      if vid and published and dt.datetime.fromisoformat(published) > added_at]
        found.sort(key=lambda x: x[2])  # 오래된 업로드부터 넣어 큐 순서가 업로드 순서를 따르게 한다.
        if a.dry_run:
            seen = set(read_lines(S / "seen_videos"))
            emit({"checked": len(due), "learn_channels": len(learn), "throttled": throttled,
                  "palantir": documents,
                  "would_enqueue": [x for x in found if x[0] not in seen]})
            return 0
        if throttled:
            poll["_backoff_until"] = t + 3600
        added = enqueue(found, "new")
        write_json(S / "channel_poll.json", poll)
        log(f"discover: channels={len(due)}/{len(learn)} new={len(added)} throttled={throttled}")
    return 0


def discover_documents(dry_run=False):
    if not palantir_docs.listed(read_lines(REPO / SOURCES)):
        return {"enabled": False}
    try:
        report = palantir_docs.discover(S, cfg().get("palantir_docs", {}), dry_run=dry_run)
    except (OSError, ValueError) as error:
        report = {"error": str(error)}
    if not dry_run:
        log(f"discover: palantir={json.dumps(report, ensure_ascii=False)}")
    return report


def cmd_documents_discover(a):
    if (S / "paused").exists() and not a.dry_run:
        emit({"status": "paused"})
        return 0
    with locked("discover", wait=False) as ok:
        if not ok:
            emit({"status": "busy"})
            return 0
        emit(discover_documents(dry_run=a.dry_run))
    return 0


# ---------------------------------------------------------------- 임시 전사 작업 이관

def pid_alive(pid):
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def runner_procs():
    """임시 전사 작업(xargs -P2 -n1 ./one2.sh < queue2.txt)의 공급 프로세스와 진행 중 (pid, 영상 id)."""
    out = subprocess.run(["ps", "-axo", "pid=,command="], capture_output=True, text=True).stdout
    feeders, jobs = [], []
    for line in out.splitlines():
        pid, _, command = line.strip().partition(" ")
        if "one2.sh" not in command or not pid.isdigit():
            continue
        match = re.search(r"one2\.sh\s+([\w-]{11})\s*$", command)
        if "xargs" in command:
            feeders.append(int(pid))
        elif match:
            jobs.append((int(pid), match.group(1)))
    return feeders, jobs


def stop_runner(feeders, jobs, wait_s):
    """공급을 끊고 진행 중 전사가 끝나기를 기다린다. 시간 안에 끝나지 않은 작업은 프로세스 그룹째 멈추고 다시 큐에 넣는다."""
    for pid in feeders:
        with contextlib.suppress(ProcessLookupError):
            os.kill(pid, signal.SIGTERM)
    if feeders:  # 처음 스캔과 공급 종료 사이에 xargs가 띄운 작업도 기다리거나 멈춘다.
        time.sleep(2)
        jobs = list(dict.fromkeys(jobs + runner_procs()[1]))
    deadline = time.time() + wait_s
    while (left := [j for j in jobs if pid_alive(j[0])]) and time.time() < deadline:
        log(f"migrate: 진행 중 전사 {len(left)}개를 기다린다 ({', '.join(v for _, v in left)})")
        time.sleep(15)
    left = [j for j in jobs if pid_alive(j[0])]
    groups = set()
    for pid, _ in left:
        with contextlib.suppress(ProcessLookupError):
            groups.add(os.getpgid(pid))
    # macOS는 좀비만 남은 그룹에 신호를 보내면 EPERM을 준다. 그때 이관 전체가 멈추지 않게 함께 무시한다.
    for pgid in groups - {os.getpgrp()}:
        with contextlib.suppress(ProcessLookupError, PermissionError):
            os.killpg(pgid, signal.SIGTERM)
    if groups:
        time.sleep(10)
        for pgid in groups - {os.getpgrp()}:
            with contextlib.suppress(ProcessLookupError, PermissionError):
                os.killpg(pgid, signal.SIGKILL)
    return [v for _, v in left]


def cmd_migrate(a):
    conf = cfg()
    src = Path(a.src or conf["adhoc_dir"] or "/nonexistent").expanduser()
    marker = S / "migrated.json"
    if marker.exists() and not a.force:
        print(marker.read_text(encoding="utf-8"))
        return 0
    queue_file = src / "queue2.txt" if (src / "queue2.txt").exists() else S / "migrate" / "queue2.txt"
    yt2 = src / "yt2"

    def snapshot():
        done = {}
        for line in read_lines(yt2 / "done.txt"):
            rc, _, vid = line.partition(" ")
            if vid.strip():
                done[vid.strip()] = rc.strip()  # 같은 id가 다시 나오면 마지막 결과를 쓴다.
        queue = [v for v in dict.fromkeys(read_lines(queue_file)) if re.fullmatch(r"[\w-]{11}", v)]
        finished = [v for v, rc in done.items() if rc == "0" and (yt2 / v / "transcript.md").exists()]
        failed = {v: rc for v, rc in done.items() if rc != "0"}
        order = list(dict.fromkeys(finished + list(failed) + queue))
        partial = [v for v in order if v not in done and (yt2 / v).is_dir()]
        return done, finished, failed, order, partial

    feeders, jobs = runner_procs()
    if a.dry_run:
        done, finished, failed, order, partial = snapshot()
        learned = [p.name for d in ("yt", "one") for p in (src / d).glob("*") if re.fullmatch(r"[\w-]{11}", p.name)]
        emit({"src": str(src), "queue_file": str(queue_file), "feeder_pids": feeders,
              "in_flight": [{"pid": p, "id": v} for p, v in jobs], "wait_mins": a.wait_mins,
              "queue2_ids": len(read_lines(queue_file)), "done_ok": len(finished), "done_failed": failed,
              "would_move_transcripts": len([v for v in finished if not (S / "transcripts" / v).exists()]),
              "partial_dirs": partial, "would_enqueue_backlog": len([v for v in order if v not in finished]),
              "backlog_rows_total": len(order), "mark_seen_learned": len(learned)})
        return 0
    requeued = stop_runner(feeders, jobs, a.wait_mins * 60)
    done, finished, failed, order, partial = snapshot()
    moved = 0
    for vid in finished + partial:
        dst = S / "transcripts" / vid
        if (yt2 / vid).is_dir() and not dst.exists():
            shutil.move(str(yt2 / vid), str(dst))
            moved += 1
            if vid in finished:
                tidy(dst)
    permanent = []
    for vid, rc in failed.items():
        tail = "\n".join(read_lines(yt2 / f"log_{vid}.txt")[-5:])
        if classify(int(rc) if rc.isdigit() else 1, tail) == "skip" and vid not in skipped_ids():
            record_skip(vid, tail.splitlines()[-1] if tail else f"exit {rc}")
            permanent.append(vid)
    # 끝난 전사도 백로그에 넣어야 learn이 순서와 우선순위를 안다. 전사 작업자는 끝난 id를 건너뛴다.
    added = enqueue([[v, "migrate", "", ""] for v in order], "backlog")
    learned = [p.name for d in ("yt", "one") for p in (src / d).glob("*") if re.fullmatch(r"[\w-]{11}", p.name)]
    with locked("state"):
        seen = set(read_lines(S / "seen_videos"))
        append(S / "seen_videos", "".join(v + "\n" for v in dict.fromkeys(learned) if v not in seen))
    summary = {"at": now().isoformat(timespec="seconds"), "src": str(src), "stopped_feeders": feeders,
               "requeued_in_flight": requeued, "moved_transcripts": moved, "permanent_skips": permanent,
               "backlog_added": len(added), "marked_seen_learned": len(learned)}
    write_json(marker, summary)
    emit(summary)
    return 0


# ---------------------------------------------------------------- Git

class GitError(RuntimeError):
    pass


def git(*args, check=True, timeout=120):
    env = os.environ | {"GIT_TERMINAL_PROMPT": "0"}
    for _ in range(3):
        p = subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True, errors="replace",
                           env=env, timeout=timeout)
        # 다른 작업이 index.lock을 잡고 있으면 잠시 기다렸다가 다시 시도한다.
        if p.returncode == 0 or "index.lock" not in p.stderr:
            break
        time.sleep(5)
    if check and p.returncode != 0:
        raise GitError(f"git {' '.join(args)}: {(p.stderr or p.stdout).strip()[-400:]}")
    return p


def dirty_paths(untracked=True):
    out = git("status", "--porcelain=v1", "-z", f"--untracked-files={'all' if untracked else 'no'}").stdout
    parts, paths, i = out.split("\0"), [], 0
    while i < len(parts):
        entry = parts[i]
        i += 1
        if len(entry) < 4:
            continue
        paths.append(entry[3:])
        if entry[0] in "RC" and i < len(parts):  # 이름 변경은 원래 경로가 다음 칸에 온다.
            paths.append(parts[i])
            i += 1
    return paths


def repo_blockers():
    git_dir = Path(git("rev-parse", "--absolute-git-dir").stdout.strip())
    found = [n for n in ("rebase-merge", "rebase-apply", "MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD")
             if (git_dir / n).exists()]
    branch = git("rev-parse", "--abbrev-ref", "HEAD").stdout.strip()
    return found + ([f"branch={branch}"] if branch != "main" else [])


def count_unpushed():
    out = git("rev-list", "--count", "@{u}..HEAD", check=False).stdout.strip()
    return int(out) if out.isdigit() else None


def norm_rel(path):
    p = Path(path)
    if p.is_absolute():
        try:
            p = p.resolve().relative_to(REPO.resolve())
        except ValueError:
            return None
    rel = os.path.normpath(p.as_posix())
    if rel.startswith("..") or rel.startswith("/") or rel == ".":
        return None
    try:
        canonical = (REPO / rel).resolve().relative_to(REPO.resolve()).as_posix()
    except ValueError:
        return None
    return rel if canonical == rel else None


def own_commits():
    return set(read_lines(S / "own_commits"))


def remote_main():
    """git ls-remote로 확인한 원격 main의 SHA. 확인하지 못하면 None이다."""
    try:
        ls = git("ls-remote", "origin", "refs/heads/main", check=False, timeout=60)
    except subprocess.TimeoutExpired:
        return None
    return ls.stdout.split()[0] if ls.returncode == 0 and ls.stdout.strip() else None


def remote_refs():
    """원격 추적 ref {이름: SHA, symref면 그 대상}. 로컬 파일이라 실행 중에 위조할 수 있다."""
    refs = {}
    for line in git("for-each-ref", "--format=%(refname) %(objectname) %(symref)", "refs/remotes").stdout.splitlines():
        name, sha, *target = line.split()
        refs[name] = target[0] if target else sha
    return refs


def prove():
    head = git("rev-parse", "HEAD").stdout.strip()
    upstream = git("rev-parse", "@{u}", check=False).stdout.strip()
    remote = remote_main()
    divergence = git("rev-list", "--left-right", "--count", "HEAD...@{u}", check=False).stdout.split()
    ok = remote is not None and head == upstream == remote and divergence == ["0", "0"]
    return {"status": "published" if ok else ("unverified" if remote is None else "mismatch"), "head": head,
            "upstream": upstream, "remote": remote, "divergence": " ".join(divergence),
            "tree_clean": not dirty_paths(untracked=False)}


def sync_and_push():
    """원격과 맞추고 푸시한 뒤 증명한다. 남의 미푸시 커밋이나 미커밋 변경이 있으면 리베이스와 푸시를 미룬다."""
    try:
        git("fetch", "--quiet", "origin", "main", timeout=180)
    except (GitError, subprocess.TimeoutExpired) as e:
        return {"status": "unverified", "note": f"fetch 실패: {e}"}
    ahead, behind = (int(x) for x in git("rev-list", "--left-right", "--count", "HEAD...origin/main").stdout.split())
    if not ahead:
        return {"status": "nothing", "behind": behind}
    foreign = [c for c in git("rev-list", "origin/main..HEAD").stdout.split() if c not in own_commits()]
    if foreign:
        return {"status": "deferred", "note": f"다른 작업의 미푸시 커밋 {len(foreign)}개가 있어 푸시하지 않았다"}
    rebased = False
    if behind:
        if dirty_paths(untracked=False):
            return {"status": "deferred", "note": "원격이 앞서 있고 다른 작업의 미커밋 변경이 있어 리베이스하지 않았다"}
        if git("rebase", "origin/main", check=False).returncode != 0:
            git("rebase", "--abort", check=False)
            return {"status": "conflict", "note": "리베이스 충돌로 중단했고 커밋은 로컬에 남겼다"}
        append(S / "own_commits", "".join(c + "\n" for c in git("rev-list", "origin/main..HEAD").stdout.split()))
        rebased = True
    try:
        p = git("push", "origin", "HEAD:main", check=False, timeout=180)
    except subprocess.TimeoutExpired:
        return {"status": "push_failed", "note": "push 시간 초과", "rebased": rebased}
    if p.returncode != 0:
        return {"status": "push_failed", "note": p.stderr.strip()[-300:], "rebased": rebased}
    return prove() | {"rebased": rebased}


def resolve_commit(sha, subject):
    """리베이스로 바뀐 SHA를 제목으로 다시 찾는다."""
    if not sha or git("merge-base", "--is-ancestor", sha, "HEAD", check=False).returncode == 0:
        return sha
    for line in git("log", "-n", "300", "--format=%H%x09%s", check=False).stdout.splitlines():
        h, _, s = line.partition("\t")
        if subject and s.endswith(subject):
            return h
    return sha


# ---------------------------------------------------------------- run 기록과 검사

def run_dir(run):
    if not re.fullmatch(r"[\w.-]+", run or ""):
        raise SystemExit(f"잘못된 run id: {run}")
    return S / "runs" / run


def load_manifest(run):
    m = read_json(run_dir(run) / "manifest.json")
    if not m:
        raise SystemExit(f"run이 없다: {run}")
    return m


def save_manifest(m):
    write_json(run_dir(m["run"]) / "manifest.json", m)


def block_scope(m):
    if m:
        m |= {"status": "scope_blocked", "left": {}}
        save_manifest(m)


def file_hash(rel):
    path = REPO / rel
    if path.is_symlink():
        return "symlink:" + os.readlink(path)
    return hashlib.sha1(path.read_bytes()).hexdigest() if path.is_file() else "absent"


def repo_snapshot():
    """저장소 파일의 해시. 숨긴 로컬 설정과 다음 실행이 불러오는 코드(스킬 스크립트의 __pycache__, ontology/node_modules)도
    본다. Codex learn의 작업공간 쓰기 샌드박스도 그 경로에 쓸 수 있다. Git 내부 파일은 보호 상태로 따로 보고, Obsidian
    설정은 앱이 늘 고쳐 뺀다. IDE, 브라우저 도구 작업 폴더와 Claude 로컬 권한 파일은 평소 작업으로도 바뀌어 오탐 일시정지를
    부르므로 2026-10-26 사용자 결정으로 뺀다."""
    paths = set(git("ls-files", "--cached", "--others", "--exclude-standard", "-z").stdout.split("\0")) - {""}
    skip = {".git", ".obsidian", ".venv", ".idea", ".playwright-mcp", "_workspace"}
    for root, dirs, names in os.walk(REPO):
        dirs[:] = [d for d in dirs if d not in skip]
        for name in names:
            paths.add((Path(root) / name).relative_to(REPO).as_posix())
    paths = {p for p in paths if p.split("/", 1)[0] not in skip and p != ".claude/settings.local.json"}
    return {rel: file_hash(rel) for rel in paths}


def scope_problems(before, after, dirty, files, mode):
    changed = {f for f in before.keys() | after.keys() if before.get(f, "absent") != after.get(f, "absent")}
    allowed = {f for f in files if EDITABLE.fullmatch(f) and (mode != "harvest" or f == SOURCES)}
    return sorted(f for f in changed if f in dirty or f not in allowed or after.get(f, "").startswith("symlink:"))


def manifests():
    """run manifest 중 dict이고 run 이름이 폴더와 같은 것만 준다. 깨진 파일이 runner와 범위 검사를 멈추지 않게 한다."""
    for path in sorted((S / "runs").glob("*/manifest.json")):
        m = read_json(path)
        if isinstance(m, dict) and m.get("run") == path.parent.name:
            yield path, m


def leftover_runs(kind=None):
    """끝난 run(kind를 주면 그 종류만)이 게시하지 못하고 남긴 파일 중 그 뒤 내용이 그대로인 것({run: [파일]}).

    내용이 바뀐 파일은 사용자나 다른 작업이 고친 것일 수 있어 이어받지 않는다(게시하거나 되돌리면 남의 작업을 건드린다).
    """
    dirty, out = set(dirty_paths()), {}
    for _, m in manifests():
        if (kind and m.get("kind") != kind) or m.get("status") == "scope_blocked":
            continue
        files = sorted(f for f, h in (m.get("left") or {}).items() if f in dirty and file_hash(f) == h)
        if files:
            out[m["run"]] = files
    return out


def finish_runs(since, kind, agent=None):
    """launchd learn, harvest 실행이 끝나면 그동안 연 그 종류의 run마다 게시하지 못한 파일과 그 내용 해시를 남긴다.

    agent를 주면 그 실행이 연 run만 닫는다. 같은 시간대에 대화형 세션이 연 run의 plan을 비우지 않는다.
    """
    dirty = set(dirty_paths())
    for _, m in manifests():
        if m.get("kind") != kind or "ended" in m or dt.datetime.fromisoformat(m["started"]).timestamp() < since:
            continue
        if agent is not None and m.get("agent") != agent:
            continue
        m["files"] = [f for f in m["files"] if f in dirty]
        if m.get("engine") == "codex":
            owned = m.get("writer_hashes", {})
            if any(owned.get(f) != file_hash(f) for f in m["files"]):
                m["status"] = "scope_blocked"
            # 검사 뒤 사용자가 고쳐도 소유 해시는 작성자 종료 시점의 값만 남긴다.
            left = {f: owned[f] for f in m["files"]} if m.get("status") != "scope_blocked" else {}
        else:
            left = {f: file_hash(f) for f in m["files"]} if m.get("status") != "scope_blocked" else {}
        m |= {"left": left, "ended": now().isoformat(timespec="seconds")}
        save_manifest(m)


def cmd_begin(a):
    if os.environ.get("VAULT_LEARN_ENGINE") == "codex":
        emit({"blocked": "Codex run은 외부 runner가 연다"})
        return 1
    blockers = repo_blockers()
    if blockers:
        emit({"blocked": blockers})
        return 1
    run = f"{stamp()}-{time.time_ns()}-{a.kind}"
    with locked("runs"):
        adopted = leftover_runs(a.kind)  # learn은 learn run의, harvest는 harvest run의 남은 파일만 이어받는다.
        for old in adopted:  # 이어받은 파일은 이 run의 plan이 된다. 이전 run은 더 손대지 않는다.
            om = load_manifest(old)
            om["files"], om["left"] = [], {}
            save_manifest(om)
        mine = sorted({f for files in adopted.values() for f in files})
        m = {"run": run, "kind": a.kind, "started": now().isoformat(timespec="seconds"), "status": "open",
             "head": git("rev-parse", "HEAD").stdout.strip(),
             "baseline_dirty": [f for f in dirty_paths() if f not in mine], "files": mine,
             "engine": os.environ.get("VAULT_LEARN_ENGINE", "claude"), "agent": os.environ.get("VAULT_LEARN_AGENT", ""),
             "adopted": [{"run": r, "files": f} for r, f in adopted.items()]}
        save_manifest(m)
    emit({"run": run, "foreign_dirty": m["baseline_dirty"], "adopted": m["adopted"], "unpushed": count_unpushed()})
    return 0


def cmd_plan(a):
    m = load_manifest(a.run)
    dirty, rejected = set(dirty_paths()), []
    for f in a.file:
        rel = norm_rel(f)
        # harvest는 학습 출처 목록만 고친다. 다른 파일을 plan하면 그사이 다른 세션이 고친 내용까지 커밋할 수 있다.
        if not rel or not EDITABLE.fullmatch(rel) or (m.get("kind") == "harvest" and rel != SOURCES) or (rel and (REPO / rel).is_symlink()):
            rejected.append({"file": f, "why": "learn은 tech/, biz/, econ/, fit/ 아래 지식 문서 Markdown만(AGENTS, CLAUDE 지침 "
                                             f"파일 제외), harvest는 {SOURCES}만 편집한다"})
        elif rel in m["files"]:
            continue
        elif rel in m["baseline_dirty"] or rel in dirty:
            # run 시작 뒤 다른 세션이 고치기 시작한 파일도 막는다. plan 없이 먼저 편집한 파일도 여기서 걸린다.
            rejected.append({"file": rel, "why": "다른 작업의 미커밋 변경이 있다(run 시작 전이나 그 뒤)"})
        else:
            m["files"].append(rel)
    save_manifest(m)
    emit({"files": m["files"], "rejected": rejected})
    return 3 if rejected else 0


def repo_names():
    names = set()
    for root, dirs, files in os.walk(REPO):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", ".obsidian")]
        for f in files:
            names.add(f.lower())
            if f.endswith(".md"):
                names.add(f[:-3].lower())
    return names


def personal_terms():
    """저장소 문서와 커밋 메시지에 들어가면 안 되는 이름: personal 사유로 제외한 채널의 handle, id, 이름,
    지정한 친구 DM의 이름, 개인이 보내는 뉴스레터(private)의 발신 주소 앞부분."""
    terms = set()
    for r in rows(S / "channels.tsv")[1:]:
        if len(r) >= 5 and r[4].strip() == "personal":
            terms |= {t.strip().lower() for t in (r[0].lstrip("@"), r[1], r[2]) if len(t.strip()) >= 3}
    conf = cfg()
    private = [s.get("from", "").split("@")[0] for s in conf["email_senders"] if s.get("private")]
    return terms | {t.strip().lower() for t in [conf["instagram_dm_name"], *private] if len(t.strip()) >= 2}


def added_lines(rel):
    """새 파일은 모든 줄, 추적 중인 파일은 HEAD 대비 추가된 줄을 (줄 번호, 내용)으로 돌려준다."""
    path = REPO / rel
    if git("ls-files", "--error-unmatch", "--", rel, check=False).returncode != 0:
        return list(enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1))
    out, n = [], 0
    for line in git("diff", "--no-color", "--unified=0", "HEAD", "--", rel).stdout.splitlines():
        if line.startswith("@@"):
            n = int(re.search(r"\+(\d+)", line).group(1))
        elif line.startswith("+") and not line.startswith("+++"):
            out.append((n, line[1:]))
            n += 1
    return out


def line_problems(line, personal):
    """공개 저장소에 들어가면 안 되는 줄(문서의 추가된 줄과 커밋 메시지)."""
    low, out = line.lower(), []
    if re.search(r"threads\.(?:com|net)/|instagram\.com/(?:[\w.]+/)?(?:p|reels?|tv|stories|direct)/", low):
        out.append("Threads나 Instagram 글 링크(단서는 출처로 쓰지 않는다)")
    if "vault-auto-learn" in low:
        out.append("로컬 상태 경로")
    if any(term in low for term in personal):
        out.append("personal로 제외한 채널의 이름")
    if PHONE.search(line) or any(not SAFE_EMAIL.search(e) for e in EMAIL.findall(line)):
        out.append("연락처 형식(전화번호, 이메일)")
    if SECRET.search(line):
        out.append("비밀 값 형식(키, 토큰)")
    return out


def check_files(files):
    names, personal, problems = repo_names(), personal_terms(), []
    for rel in files:
        path = REPO / rel
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if "\u00b7" in text:
            problems.append(f"{rel}: 가운뎃점(U+00B7)")
        if not text.startswith("---\n"):
            problems.append(f"{rel}: frontmatter 없음")
        if rel == SOURCES:
            problems += sources_problems(text)
        for target in WIKILINK.findall(re.sub(r"```.*?```", "", text, flags=re.S)):
            name = target.strip().rstrip("\\").split("/")[-1].lower()  # 표 안의 [[파일\|별칭]]
            if name and name not in names:
                problems.append(f"{rel}: 깨진 위키링크 [[{target}]]")
        problems += [f"{rel}:{n}: {p}" for n, line in added_lines(rel) for p in line_problems(line, personal)]
    return problems


def cmd_check(a):
    files = load_manifest(a.run)["files"] if a.run else [norm_rel(f) for f in a.files]
    problems = check_files([f for f in files if f])
    emit({"ok": not problems, "problems": problems})
    return 1 if problems else 0


def cmd_discard(a):
    if os.environ.get("VAULT_LEARN_ENGINE") == "codex":
        emit({"status": "blocked", "note": "Codex는 자동으로 파일을 되돌리지 않는다"})
        return 1
    m = load_manifest(a.run)
    for f in a.file:
        rel = norm_rel(f)
        if rel not in m["files"] or rel in m["baseline_dirty"]:
            emit({"file": f, "error": "이 run이 plan으로 등록했고 시작 때 깨끗했던 파일만 되돌린다"})
            return 1
        if git("ls-files", "--error-unmatch", "--", rel, check=False).returncode == 0:
            git("restore", "--source=HEAD", "--staged", "--worktree", "--", rel)
        else:
            (REPO / rel).unlink(missing_ok=True)
        m["files"].remove(rel)
    save_manifest(m)
    emit({"files": m["files"]})
    return 0


def commit_message(result, engine="claude"):
    scope, subject = result.get("scope", ""), (result.get("subject") or "").strip()
    if not re.fullmatch(r"[a-z0-9-]+", scope) or not subject:
        raise SystemExit("result.json에 scope(영문 소문자, 숫자, 하이픈)와 subject가 있어야 한다")
    text = f"docs({scope}): {subject}"
    if (result.get("body") or "").strip():
        text += "\n\n" + result["body"].strip()
    text += "\n\n" + TRAILERS[engine]
    if "\u00b7" in text:
        raise SystemExit("커밋 메시지에 가운뎃점(U+00B7)이 있다")
    return text


def cmd_publish(a):
    m = load_manifest(a.run)
    if (m.get("engine") == "codex" or os.environ.get("VAULT_LEARN_ENGINE") == "codex") and not getattr(a, "outer", False):
        emit({"status": "blocked", "note": "Codex는 게시하지 않는다. 외부 runner만 게시한다"})
        return 1
    result = read_json(run_dir(a.run) / "result.json", {}) or {}
    items = result.get("items", [])
    pending = set(dirty_paths())
    # plan으로 등록한 파일만 커밋한다. result.json에만 적힌 파일은 사용자나 다른 작업의 변경일 수 있다.
    changed = [f for f in m["files"] if f in pending and EDITABLE.fullmatch(f)
               and f not in m["baseline_dirty"] and (m.get("kind") != "harvest" or f == SOURCES)]
    if m.get("engine") == "codex":
        expected = m.get("publish_hashes", {})
        if git("rev-parse", "HEAD").stdout.strip() != m.get("head") or set(expected) != set(changed) or any(expected.get(f) != file_hash(f) for f in changed):
            block_scope(m)
            emit({"status": "scope_blocked", "note": "범위 검사 또는 검증 뒤 파일이 바뀌었다"})
            return 1
    unplanned = sorted({f for it in items for f in map(norm_rel, it.get("files", []))
                        if f and f in pending and f not in m["files"]})
    report = {"run": a.run, "committed": changed, "skipped_unplanned": unplanned}
    message = commit_message(result, m.get("engine", "claude")) if changed else None
    personal = personal_terms()
    problems = check_files(changed) + [f"커밋 메시지: {p}" for line in (message or "").splitlines()
                                       for p in line_problems(line, personal)]
    if problems:
        emit(report | {"status": "check_failed", "problems": problems})
        return 1
    if a.dry_run:
        emit(report | {"status": "dry_run", "message": message})
        return 0
    with locked("git"):
        blockers = repo_blockers()  # 사용자가 리베이스나 병합 중이면 그 작업에 커밋을 끼워 넣거나 중단시키지 않는다.
        if blockers:
            emit(report | {"status": "blocked", "blocked": blockers})
            return 1
        sha = None
        current_pending = set(dirty_paths()) if m.get("engine") == "codex" else pending
        if m.get("engine") == "codex" and (git("rev-parse", "HEAD").stdout.strip() != m.get("head")
                or set(m.get("publish_hashes", {})) != set(changed)
                or set(changed) != {f for f in m["files"] if f in current_pending}
                or any(m.get("publish_hashes", {}).get(f) != file_hash(f) for f in changed)):
            block_scope(m)
            emit(report | {"status": "scope_blocked", "note": "Git 잠금 대기 중 파일이 바뀌었다"})
            return 1
        if changed:
            git("add", "--all", "--", *changed)
            git("commit", "--only", "-m", message, "--", *changed)
            sha = git("rev-parse", "HEAD").stdout.strip()
            append(S / "own_commits", sha + "\n")
            m["files"] = [f for f in m["files"] if f not in changed]  # 다시 고치려면 다시 plan한다.
        committed = set(changed)
        logged = set(m.get("logged_keys", []))  # 한 run에서 묶음마다 게시하므로 이미 기록한 항목은 건너뛴다.
        out = []
        for it in items:
            if it.get("key") in logged:
                continue
            files_it = {norm_rel(f) for f in it.get("files", [])} - {None}
            res, note = it.get("result", "skipped"), it.get("note", "")
            if res in ("learned", "merged") and not committed & files_it:
                res, note = (("deferred", "plan하지 않았거나 다른 작업이 바꾼 파일이라 커밋하지 않았다")
                             if files_it & set(unplanned) else ("skipped", note or "바뀐 파일이 없다"))
            out.append({"ts": now().isoformat(timespec="seconds"), "run": a.run, "key": it.get("key"), "result": res,
                        "files": sorted(files_it), "topic": it.get("topic", ""), "takeaway": it.get("takeaway", ""),
                        "note": note, "commit": sha if committed & files_it else None, "subject": result.get("subject")})
            logged.add(it.get("key"))
        # 푸시 전에 기록해 둔다. 푸시 중에 끊겨도 커밋한 항목을 다음 run이 다시 배우지 않는다.
        append(S / "digests" / "log.jsonl", "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in out))
        m["logged_keys"] = sorted(k for k in logged if k)
        m["commits"] = m.get("commits", []) + ([sha] if sha else [])
        save_manifest(m)
        sync = sync_and_push()
        if sha and sync.get("rebased"):
            sha = git("rev-parse", "HEAD").stdout.strip()
    m["status"] = sync["status"]
    save_manifest(m)
    emit(report | {"commit": sha} | sync)
    return 0 if sync["status"] in ("published", "nothing", "deferred", "unverified") else 1


# ---------------------------------------------------------------- learn 후보

def settle_deferred(log_rows, today):
    """처리 끝난 key. 보류는 7일 뒤 재시도하며 Palantir 외에는 두 번 보류하면 끝난 것으로 본다."""
    final, deferred = set(), {}
    for r in log_rows:
        if r.get("result") == "deferred":
            deferred.setdefault(r.get("key"), []).append(r.get("ts", "")[:10])
        else:
            final.add(r.get("key"))
    for key, dates in deferred.items():
        exhausted = len(dates) >= 2 and not (key or "").startswith("palantir:")
        if exhausted or (today - dt.date.fromisoformat(max(dates))).days < 7:
            final.add(key)
    return final


def processed_keys():
    return settle_deferred(read_jsonl(S / "digests" / "log.jsonl"), dt.date.today())


def repost_title(body):
    text = body.split("## Text\n", 1)[-1]
    return next((field(l)[:80] for l in text.splitlines() if l.strip() and not l.strip().startswith(TITLE_SKIP)), "")


def transcript_meta(path):
    head = Path(path).read_text(encoding="utf-8", errors="replace")[:2000].splitlines()
    meta = {"title": head[0][2:].strip() if head and head[0].startswith("# ") else ""}
    for line in head[1:12]:
        key, sep, value = line[2:].partition(": ")
        if line.startswith("- ") and sep:
            meta[key] = value
    return meta


def idle_candidates(k, done):
    todos, stale = [], []
    cutoff = dt.date.today() - dt.timedelta(days=cfg()["stale_days"])
    for top in ("tech", "biz", "econ"):
        for path in sorted((REPO / top).rglob("*.md")):
            rel = path.relative_to(REPO).as_posix()
            text = path.read_text(encoding="utf-8", errors="replace")
            for line in text.splitlines():
                if re.match(r"\s*- \[ \] ", line):
                    key = f"todo:{rel}#{hashlib.sha1(line.strip().encode()).hexdigest()[:8]}"
                    if key not in done:
                        todos.append({"key": key, "path": rel, "line": field(line)[:160]})
            match = re.search(r"^verified_at:\s*(\d{4}-\d{2}-\d{2})", text[:1500], re.M)
            with contextlib.suppress(ValueError):
                if match and dt.date.fromisoformat(match.group(1)) < cutoff:
                    key = f"stale:{rel}@{match.group(1)}"
                    if key not in done:
                        stale.append({"key": key, "path": rel, "verified_at": match.group(1)})
    stale.sort(key=lambda x: x["verified_at"])
    return {"todos": todos[: 2 * k], "stale": stale[:k]}


def inbox_leads(done):
    """처리하지 않은 단서(Threads 리포스트, Instagram 글, 이메일 뉴스레터)를 최근 수집, 수집 순서대로 준다."""
    leads = []
    for src, prefix in INBOX.items():
        root = S / "inbox" / src
        excluded = {r[0] for r in rows(root / "EXCLUDED.tsv")}
        for path in root.glob("*.md"):
            key = f"{prefix}:{path.stem}"
            if key in done or path.stem in excluded:
                continue
            meta, body = frontmatter(path)
            leads.append({"key": key, "source": src, "title": meta.get("subject") or repost_title(body),
                          "who": meta.get("publication") or meta.get("author", ""),
                          "date": (meta.get("posted_at") or meta.get("date", ""))[:10], "path": str(path),
                          "chain": meta.get("chain", ""), "links": body.count("\n- http"),
                          "harvested": meta.get("harvested_at", ""),
                          "order": as_int(meta.get("repost_order") or meta.get("order"))})
    leads.sort(key=lambda x: (x["harvested"], -x["order"]), reverse=True)
    return leads


def pick_data(k):
    done, ready = processed_keys(), done_ids()
    leads = inbox_leads(done)
    # 영상의 tags는 학습 출처 목록에 적은 채널의 주 도메인이며 우선순위에만 쓴다. 이관한 백로그는 채널명으로 찾는다.
    tags = {hkey(h): t for h, (_, t) in learning_sources()[0].items()}
    by_title = {r[2]: r[0] for r in rows(S / "channels.tsv")[1:] if len(r) > 2}

    def videos(prio):
        """전사가 끝났고 처리하지 않은 영상의 (전체 수, 앞쪽 2k개의 메타데이터)."""
        entries = [r for r in rows(S / "queue" / f"{prio}.tsv") if r[0] in ready and f"video:{r[0]}" not in done]
        out = []
        for r in entries[: 2 * k]:
            path = S / "transcripts" / r[0] / "transcript.md"
            meta = transcript_meta(path)
            handle = r[1] if len(r) > 1 and r[1].startswith("@") else by_title.get(meta.get("채널", ""), "")
            out.append({"key": f"video:{r[0]}", "title": meta.get("title", ""), "who": meta.get("채널", ""),
                        "date": meta.get("업로드", ""), "duration": meta.get("길이", ""), "path": str(path),
                        "tags": tags.get(hkey(handle), [])})
        return len(entries), out

    (new_count, new), (backlog_count, backlog) = videos("new"), videos("backlog")
    documents = palantir_docs.candidates(S, done) if palantir_docs.listed(read_lines(REPO / SOURCES)) else []
    document_limit = max(1, (k + 2) // 3) if new or leads or backlog else k
    data = {"k": k, "tier1": new + leads[: 3 * k] + documents[:document_limit], "tier2": backlog,
            "palantir_limit": document_limit,
            "counts": {"new_videos": new_count, "leads": dict(Counter(x["source"] for x in leads)),
                       "palantir_documents": len(documents),
                       "backlog_videos": backlog_count, "awaiting_transcription": waiting_counts()}}
    if not data["tier1"] and not data["tier2"]:
        data["tier3"] = idle_candidates(k, done)
    return data


def cmd_pick(a):
    emit(pick_data(a.k or cfg()["k"]))
    return 0


# ---------------------------------------------------------------- 다이제스트

def state_summary():
    done, skipped, keys = done_ids(), skipped_ids(), processed_keys()
    backoff = {engine: engine_backoff(engine) for engine in ENGINES} | {f"browser-{m}": browser_backoff(m) for m in BROWSER}
    log_rows = read_jsonl(S / "digests" / "log.jsonl")
    unpushed = count_unpushed()
    return {"paused": (S / "paused").exists(), "transcribe_waiting": waiting_counts(), "transcripts": len(done),
            "videos_skipped": len(skipped), "videos_unlearned": sum(1 for v in done if f"video:{v}" not in keys),
            "leads_unlearned": {src: sum(1 for p in (S / "inbox" / src).glob("*.md") if f"{prefix}:{p.stem}" not in keys)
                                for src, prefix in INBOX.items()},
            "processed": dict(Counter(r.get("result") for r in log_rows)),
            "palantir": palantir_docs.summary(S, log_rows) | {"enabled": palantir_docs.listed(read_lines(REPO / SOURCES))},
            "channels": dict(Counter(r[3] for r in rows(S / "channels.tsv")[1:] if len(r) > 3))
            | {"listed": len(learning_sources()[0])},
            "unpushed_commits": unpushed,
            # 나중에 푸시되면 지난 보류는 더 알릴 필요가 없다.
            "deferred_runs": sorted(m["run"] for _, m in manifests()
                                    if m.get("status") in ("deferred", "conflict", "push_failed", "unverified"))[-5:]
            if unpushed else [],
            "leftover_files": sum(len(v) for v in leftover_runs().values()),
            "engines": engine_view(cfg()),
            "backoff": {engine: value if value.get("until", 0) > time.time() else None
                        for engine, value in backoff.items()},
            "last_attempts": {mode: read_json(S / "runs" / f"last-{mode}.json") for mode in MODES}}


def cmd_digest_data(a):
    day = dt.date.fromisoformat(a.date) if a.date else dt.date.today()
    selection = S / "digests" / f"{day}.json"
    if selection.exists():  # 같은 날 다시 불러도(재시도) 같은 범위를 준다.
        print(selection.read_text(encoding="utf-8"))
        return 0
    log_rows = read_jsonl(S / "digests" / "log.jsonl")
    previous = sorted(p for p in (S / "digests").glob("????-??-??.json") if p.stem < str(day))
    since = ((read_json(previous[-1], {}) or {}).get("generated_at") if previous else None) \
        or (now() - dt.timedelta(days=1)).isoformat(timespec="seconds")
    # 다이제스트에는 커밋한 변경만 싣는다(건너뛰거나 미룬 항목은 넣지 않는다).
    changes = [{"key": r["key"], "result": r["result"], "files": r.get("files", []), "topic": r.get("topic", ""),
                "takeaway": r.get("takeaway", ""), "commit": resolve_commit(r.get("commit"), r.get("subject"))}
               for r in log_rows if r.get("ts", "") > since and r.get("commit")]
    data = {"date": str(day), "generated_at": now().isoformat(timespec="seconds"), "since": since, "changes": changes}
    write_json(selection, data)
    emit(data)
    return 0


# ---------------------------------------------------------------- 단서 수집함과 구독 채널

def cmd_inbox_reindex(a):
    """단서 파일을 정리(가운뎃점, 본문의 연락처, 지정한 친구 이름)하고 INDEX.tsv와 본 id 목록을 다시 만든다."""
    allowed = {"mail"} if a.source == "email" else ({"saved"} if a.source == "instagram" else set())
    if not set(a.complete) <= allowed:
        raise ValueError(f"잘못된 complete: {a.source}")
    root, prefix = S / "inbox" / a.source, INBOX[a.source] + ":"
    status = {r["key"][len(prefix):]: r["result"] for r in read_jsonl(S / "digests" / "log.jsonl")
              if str(r.get("key", "")).startswith(prefix)}
    old_reason = {r[1]: r[3] for r in rows(root / "INDEX.tsv")[1:] if len(r) > 3}
    friend = cfg()["instagram_dm_name"].strip()
    records, normalized, problems = [], [], []
    for path in sorted(root.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        head = re.match(r"---\n.*?\n---\n", text, re.S)
        cut = head.end() if head else 0  # 메일의 sender처럼 frontmatter에 둔 값은 그대로 두고 본문만 가린다.
        clean = (text[:cut] + EMAIL.sub("[연락처]", PHONE.sub("[연락처]", text[cut:]))).replace("\u00b7", "/")
        if friend:
            clean = clean.replace(friend, "[지정한 친구]")
        if clean != text:
            normalized.append(path.name)
            if not a.dry_run:
                write_text(path, clean)
        meta, body = frontmatter(path)
        if meta.get("id") != path.stem:
            problems.append(f"{path.name}: frontmatter id가 파일명과 다르다")
        links = body.split("## Outbound links\n", 1)
        records.append({"harvested": meta.get("harvested_at", ""),
                        "o": as_int(meta.get("repost_order") or meta.get("order")),
                        "id": path.stem, "status": status.get(path.stem, "new"), "reason": old_reason.get(path.stem, ""),
                        "author": meta.get("publication") or meta.get("author", ""),
                        "posted_at": meta.get("posted_at") or meta.get("date", ""),
                        "chain": meta.get("chain", ""), "captured": meta.get("chain_captured", ""),
                        "images": meta.get("images", ""), "videos": meta.get("videos", ""),
                        "links": sum(1 for l in links[1].splitlines() if l.startswith("- http")) if len(links) > 1 else 0,
                        "title": meta.get("subject") or repost_title(body), "file": path.name})
    for r in rows(root / "EXCLUDED.tsv"):
        records.append({"harvested": r[1] if len(r) > 1 else "", "id": r[0], "status": "excluded",
                        "o": as_int(r[2]) if len(r) > 2 else 0,
                        "reason": r[3] if len(r) > 3 else "personal"})
    records.sort(key=lambda r: (r["harvested"], -r["o"]), reverse=True)
    text = "\t".join(INDEX_COLS) + "\n" + "".join(
        "\t".join(field(i if c == "order" else r.get(c, "")) for c in INDEX_COLS) + "\n"
        for i, r in enumerate(records, 1))
    seen = set(read_lines(seen_file(a.source)))
    new_seen = [r["id"] for r in records if r["id"] not in seen]
    changed = text != "\n".join(read_lines(root / "INDEX.tsv")) + "\n"
    # 처음부터 모으기(뉴스레터 소급, Instagram 저장 글)를 끝낸 부분과 날짜. 과거 DM 날짜는 보존한다.
    state = (read_json(root / "STATE.json", {}) or {}) | {part: str(dt.date.today()) for part in a.complete}
    if not a.dry_run:
        write_text(root / "INDEX.tsv", text)
        append(seen_file(a.source), "".join(i + "\n" for i in new_seen))
        if a.complete:
            write_json(root / "STATE.json", state)
    emit({"rows": len(records), "index_changed": changed, "normalized": normalized, "new_seen": len(new_seen),
          "state": state, "problems": problems})
    return 1 if problems else 0


def cmd_email_query(a):
    """harvest의 Gmail 검색어. 학습 출처 목록에 있는 뉴스레터의 발신 주소만 넣고, 소급을 끝낸 뒤에는 마지막으로
    검색 결과를 다 처리한 날의 이틀 전부터 찾는다(겹친 메일은 본 id로 거른다)."""
    conf, letters = cfg(), learning_sources()[1]
    senders = [s for s in conf["email_senders"] if s.get("name") in letters]
    done = (read_json(S / "inbox" / "email" / "STATE.json", {}) or {}).get("mail")
    since = conf["email_since"] or str(dt.date.today())
    if done:
        since = max(since, str(dt.date.fromisoformat(done) - dt.timedelta(days=2)))
    query = "{" + " ".join(f"from:{s['from']}" for s in senders) + "} after:" + since.replace("-", "/")
    emit({"query": query if senders else "", "since": since, "senders": senders,
          "seen": len(read_lines(seen_file("email")))})
    return 0


def cmd_lead_id(a):
    """외부 링크의 수집함 id. 같은 링크(조각 제외)는 늘 같은 id다."""
    print("link-" + hashlib.sha1(urllib.parse.urldefrag(a.url.strip())[0].encode()).hexdigest()[:12])
    return 0


def resolve_channel(handle, title):
    info = {"handle": handle, "title": title, "channel_id": "", "about": "", "recent": [], "last_published": ""}
    status, page = http_get("https://www.youtube.com/" + urllib.parse.quote(handle, safe="@-_./"))
    match = re.search(r'<link rel="canonical" href="https://www\.youtube\.com/channel/(UC[\w-]{22})"', page)
    info["channel_id"] = match.group(1) if match else (handle.split("/", 1)[1] if handle.startswith("channel/") else "")
    about = re.search(r'<meta (?:property|name)="og:description" content="([^"]*)"', page)
    info["about"] = html.unescape(about.group(1))[:400] if about else ""
    if info["channel_id"]:
        _, entries = fetch_feed(info["channel_id"])
        info["recent"] = [e[1] for e in entries[:8]]
        info["last_published"] = entries[0][2][:10] if entries else ""
    return info


def cmd_channels_merge(a):
    path = S / "channels.tsv"
    lock = contextlib.nullcontext() if getattr(a, "dry_run", False) else locked("channels")
    with lock:  # discover가 채널 캐시를 쓰는 동안 실제 병합만 잠근다.
        table = rows(path) or [CHANNEL_COLS]
        header, body = table[0], table[1:]
        known_handles, known_ids = {r[0] for r in body}, {r[1] for r in body if len(r) > 1}
        incoming = {}
        for line in read_lines(a.rows):
            handle, _, title = line.partition("\t")
            handle = handle.strip().lstrip("/")
            if handle.startswith("@") or handle.startswith("channel/UC"):
                incoming.setdefault(handle, field(title))
        before = len(body)
        new = [(h, t) for h, t in incoming.items() if h not in known_handles]
        with ThreadPoolExecutor(6) as ex:
            infos = list(ex.map(lambda ht: resolve_channel(*ht), new))
        added = []
        for info in infos:
            if info["channel_id"] and info["channel_id"] not in known_ids:
                body.append([info["handle"], info["channel_id"], info["title"], "pending", "", str(dt.date.today())])
                known_ids.add(info["channel_id"])
                added.append(info["handle"])
        unsubscribed = []
        if a.complete and len(incoming) >= 0.9 * before:  # 목록을 덜 읽었을 때 대량 구독 해지로 오인하지 않는다.
            # 구독하지 않고 목록에만 적은 채널(reason listed)은 구독 해지로 보지 않는다.
            unsubscribed = sorted({r[0] for r in body if r[4:5] != ["listed"]} - set(incoming))
            if not getattr(a, "dry_run", False):
                write_text(S / "unsubscribed", "".join(h + "\n" for h in unsubscribed))
        if not getattr(a, "dry_run", False):
            write_text(path, "".join("\t".join(r) + "\n" for r in [header, *body]))
    resolved = {info["handle"]: info for info in infos}
    pending = [r for r in body if len(r) > 3 and r[3] == "pending"]
    with ThreadPoolExecutor(6) as ex:
        details = list(ex.map(lambda r: resolved.get(r[0]) or resolve_channel(r[0], r[2]), pending))
    listed = {hkey(h) for h in learning_sources()[0]}  # 목록에 이미 있으면(앞선 harvest가 게시) channels-set만 한다.
    emit({"incoming": len(incoming), "added": added, "unsubscribed": len(unsubscribed),
          "leftover": leftover_runs("harvest"),
          "pending": [d | {"listed": hkey(d["handle"]) in listed} for d in details]})
    return 0


def cmd_channels_set(a):
    path = S / "channels.tsv"
    listed = {hkey(h) for h in learning_sources()[0]}
    with locked("channels"):
        table = rows(path)
        hits = [r for r in table[1:] if a.handle in (r[0], r[1])]
        if not hits:
            raise SystemExit(f"채널이 없다: {a.handle}")
        # learn은 저장소 목록이 정본이므로 목록에 행을 더해 게시한 뒤에만 기록한다(실패하면 pending으로 남아 다시 시도된다).
        if a.decision == "learn" and any(hkey(r[0]) not in listed for r in hits):
            raise SystemExit(f"{SOURCES}에 먼저 행을 더해 게시한다: {a.handle}")
        # 목록에 남은 채널을 로컬에서만 제외하면 discover는 계속 모으고 공개 목록과 기록이 어긋난다.
        if a.decision == "exclude" and any(hkey(r[0]) in listed for r in hits):
            raise SystemExit(f"{SOURCES}에서 먼저 행을 지워 게시한다: {a.handle}")
        for r in hits:
            r[3], r[4] = a.decision, field(a.reason)
        write_text(path, "".join("\t".join(r) + "\n" for r in table))
    emit({"updated": [r[0] for r in hits], "decision": a.decision})
    return 0


# ---------------------------------------------------------------- claude -p 실행

def agent_rules(mode):
    repo, state, vl = REPO.as_posix(), S.as_posix(), SCRIPT.as_posix()
    # 모든 모드는 읽기, VL과 에이전트가 직접 쓰는 상태 폴더 편집만 쓴다. config.json(실행할 claude 경로, 지정한 친구
    # 이름)과 own_commits(VL이 푸시해도 되는 커밋 목록)는 VL과 사용자만 바꾼다. 모드마다 필요한 것만 더 연다.
    allow = ["Read", "Grep", "Glob", "ToolSearch", f"Bash(python3 {vl} *)",
             f"Bash(python3 {SCRIPT.relative_to(REPO).as_posix()} *)",
             *(f"Edit(/{state}/{sub}/**)" for sub in ("runs", "tmp", "inbox", "digests"))]
    if mode == "learn":
        allow += ["Agent", "WebSearch", "WebFetch", "mcp__development-context", "mcp__plugin_context7_context7",
                  *(f"Edit(/{repo}/{top}/**)" for top in DOMAINS)]
    if mode in BROWSER:  # 브라우저는 ego lite의 ego-browser CLI만 쓴다(2026-10-25 사용자 결정).
        allow += ["Bash(ego-browser skill)", "Bash(ego-browser skill *)", "Bash(ego-browser nodejs *)"]
    if mode == "harvest":  # 새 learn 채널을 학습 출처 목록에 더하고, Gmail 연결이 있으면 읽기 도구만 쓴다.
        allow += [f"Edit(/{repo}/{SOURCES})", *(f"mcp__claude_ai_Gmail__{t}" for t in GMAIL_READ)]
    # 사용자와 프로젝트 설정의 허용 규칙(git add/commit/push, codex exec, pandoc, pnpm build, python3 -m)도
    # 이 실행에 그대로 적용된다. 거부가 우선하므로 Git 쓰기와 그 밖의 실행 경로를 여기서 막는다. 메일 쓰기, ego lite의
    # 갱신과 가져오기, ego lite 밖의 브라우저 도구는 설정에 넓은 허용 규칙이 생겨도 열리지 않게 함께 막는다.
    deny = [f"Bash(git {sub} *)" for sub in ("add", "commit", "push", "stash", "reset", "checkout", "restore",
                                              "clean", "rebase", "merge", "pull", "rm")]
    deny += ["Bash(rm *)", "Bash(codex *)", "Bash(pandoc *)", "Bash(pnpm *)", "Bash(python3 -m *)",
             "Bash(ego-browser upgrade *)", "Bash(ego-browser import *)", "mcp__claude-in-chrome",
             "mcp__plugin_playwright_playwright", f"Edit(/{repo}/**/AGENTS.md)", f"Edit(/{repo}/**/CLAUDE.md)",
             *(f"mcp__claude_ai_Gmail__{t}" for t in GMAIL_WRITE),
             *(f"Read(~/{p})" for p in (".ssh/**", ".aws/**", ".gnupg/**", ".config/**", ".codex/**", ".netrc"))]
    return allow, deny


def workflow_sections(mode, engine):
    root = SKILL.parents[2] / (".agents" if engine == "codex" else ".claude")
    path = root / "skills" / "auto-learn" / "SKILL.md"
    sections = re.split(r"(?m)^## ", path.read_text(encoding="utf-8"))[1:]
    wanted = {"구성", "공통 원칙", f"{mode} 모드", "운영"}
    if engine == "codex":
        wanted.add("Codex 실행 차이")
    selected = {part.split("\n", 1)[0]: "## " + part for part in sections}
    if not wanted <= selected.keys():
        raise ValueError(f"auto-learn 필수 절차가 없다: {sorted(wanted - selected.keys())}")
    return "\n".join(part for name, part in selected.items() if name in wanted)


def ego_guide():
    """VL은 두 샌드박스 밖에서 돌므로 브라우저 실행 전에 `ego-browser skill` 안내를 S/tmp에 저장한다. 실패하면 None이다."""
    try:
        p = subprocess.run(["ego-browser", "skill"], capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.SubprocessError):
        return None
    if p.returncode != 0 or "[ego-browser:skill] end of guide" not in p.stdout:
        return None
    path = S / "tmp" / "ego-browser-skill.md"
    write_text(path, p.stdout)
    return path


def agent_prompt(mode, conf):
    browser = ""
    if mode in BROWSER:  # TaskSpace 이름은 모드마다 고정해 끝내지 못한 공간을 다음 실행이 이어받게 하고, 파일 접두사는 실행마다 바꾼다.
        guide = ego_guide()
        browser = ((f" 브라우저 단계 전에 VL이 저장한 ego-browser 안내 {guide}를 끝 줄까지 읽고 따른다." if guide else
                    " 브라우저 단계 전에 `ego-browser skill`을 실행해 끝까지 읽고 따른다.")
                   + f" TaskSpace 이름은 vault-learn-{mode}, 이 실행의 파일 접두사는 {S}/tmp/vault-learn-{mode}-{stamp()}이고 "
                   f"헬퍼는 {SCRIPT.parent}/youtube_subs.js와 {SCRIPT.parent}/threads_extract.js다. ego-browser가 ego lite에 "
                   "연결하지 못하면 CHROME_UNAVAILABLE(ego lite를 쓸 수 없다는 뜻)만, 사용자가 브라우저를 넘겨받았거나 그 "
                   "TaskSpace 이름을 사용자 소유 공간이 쓰고 있으면 USER_TAKEOVER만 출력한다. "
                   "권한 규칙이나 정책이 브라우저 동작을 거부했으면 POLICY_BLOCKED만 출력하고 끝낸다. "
                   "정책 거부를 연결 실패로 바꾸거나 다른 엔진과 브라우저로 우회하지 않는다.")
    extra = {"learn": f" K={conf['k']}.", "harvest": browser, "instagram": browser,
             "digest": f" 날짜는 {dt.date.today()}이다."}
    return (f"auto-learn 스킬의 {mode} 모드를 launchd에서 무인으로 실행한다. 아래에 제공한 스킬의 공통 원칙과 "
            f"{mode} 절차를 따른다. 같은 스킬을 다시 읽지 않는다. 상태 디렉터리는 {S}이고 VL은 `python3 {SCRIPT}`다. "
            "사용자에게 물을 수 없으므로 판단이 서지 않는 항목은 deferred로 남기고 넘어간다. "
            "마지막 줄에는 절차가 정한 결과 JSON 한 줄만 출력한다." + extra[mode]
            + "\n\n" + workflow_sections(mode, "claude"))


def last_result(text):
    decoder = json.JSONDecoder()
    starts = [i for i in (text.rfind('{"type":"result"'),) if i >= 0]
    starts += [m.start() for m in re.finditer(r"^\{", text, re.M)][::-1]
    for i in starts:
        with contextlib.suppress(ValueError):
            obj, _ = decoder.raw_decode(text, i)
            if isinstance(obj, dict) and obj.get("type") == "result":
                return obj
    return {}


def engine_settings(conf):
    settings = {}
    for mode in MODES:
        selected = conf.get("engine", {})
        primary = conf.get("primary", {})
        selected = selected.get(mode, "alternate") if isinstance(selected, dict) else selected
        primary = primary.get(mode, "claude") if isinstance(primary, dict) else primary
        if selected not in (*ENGINES, "alternate") or primary not in ENGINES:
            raise SystemExit(f"잘못된 engine/primary 설정: {mode}")
        settings[mode] = {"engine": selected, "primary": primary}
    return settings


def engine_backoff(engine):
    """엔진 자체의 대기(사용량 한도, 인증, 실행 파일 없음)."""
    value = read_json(S / "backoff" / f"{engine}.json", {}) or {}
    if not value and engine == "claude":
        value = read_json(S / "backoff.json", {}) or {}  # 기존 전역 한도는 Claude 실행에서 생겼다.
    # 이전 형식의 브라우저 기록(reason chrome)은 엔진 대기가 아니다. 브라우저 대기는 browser_backoff가 맡는다.
    return {} if value.get("reason") == "chrome" else value


def browser_backoff(mode):
    """수집 작업별 브라우저 대기. engines는 쉬는 엔진이며 엔진 대기와 파일과 횟수를 나눠 서로 덮어쓰지 않는다."""
    return (read_json(S / "backoff" / f"browser-{mode}.json", {}) or {}) if mode in BROWSER else {}


def engine_candidates(mode, conf, ignore_backoff=False):
    setting = engine_settings(conf)[mode]
    first = setting["primary"] if setting["engine"] == "alternate" else setting["engine"]
    engines = [first, next(e for e in ENGINES if e != first)] if setting["engine"] == "alternate" else [first]
    if ignore_backoff:
        return engines
    current = time.time()
    wait = browser_backoff(mode)
    resting = set(wait.get("engines", ENGINES)) if wait.get("until", 0) > current else set()
    return [e for e in engines if e not in resting and engine_backoff(e).get("until", 0) <= current]


def engine_view(conf):
    """설정과 실제로 시도하는 엔진 순서(effective). 백오프는 빼고 본다."""
    return {m: v | {"effective": engine_candidates(m, conf, ignore_backoff=True)} for m, v in engine_settings(conf).items()}


def cmd_engine(a):
    if a.mode and os.environ.get("VAULT_LEARN_ENGINE") in ENGINES:
        raise SystemExit("학습 agent는 엔진 설정을 바꾸지 않는다")
    if a.mode:
        if not a.engine:
            raise SystemExit("engine <mode|all> <claude|codex|alternate> [--primary claude|codex]")
        with locked("config"):
            conf = read_json(S / "config.json", {}) or {}
            settings = engine_settings(DEFAULTS | conf)
            for mode in MODES if a.mode == "all" else (a.mode,):
                settings[mode]["engine"] = a.engine
                if a.primary:
                    settings[mode]["primary"] = a.primary
            conf["engine"] = {m: v["engine"] for m, v in settings.items()}
            conf["primary"] = {m: v["primary"] for m, v in settings.items()}
            write_json(S / "config.json", conf)
    elif a.engine or a.primary:
        raise SystemExit("--primary는 mode와 engine을 지정할 때 쓴다")
    emit(engine_view(cfg()))
    return 0


def set_backoff(text, engine="claude", reason="limit", mode=None):
    browser = reason in BROWSER_WAIT
    path = S / "backoff" / (f"browser-{mode}.json" if browser else f"{engine}.json")
    previous = (read_json(path, {}) or {}) if browser else engine_backoff(engine)
    # 횟수는 같은 대기에서만 잇는다. 만료된 사용량 한도의 횟수로 인증이나 브라우저 대기가 길어지지 않게 한다.
    n = previous.get("n", 0) + 1 if browser or previous.get("reason") == reason else 1
    current = time.time()
    until = current + (2 * 3600 if reason == "limit" else min(900 * 2 ** min(n - 1, 5), 8 * 3600))
    reset = re.search(r"\|(\d{10})\b", text)
    if reason == "limit" and reset and int(reset.group(1)) > current:  # 확인한 복구 시각이 더 이르면 먼저 시도한다.
        until = min(until, int(reset.group(1)) + 60)
    local = dt.datetime.fromtimestamp(until).astimezone().isoformat(timespec="minutes")
    record = {"n": n, "until": until, "until_local": local, "reason": reason}
    if browser:  # 로그아웃과 Claude가 본 연결 실패는 같은 ego lite 프로필이라 두 엔진 모두, Codex의 연결 실패는 Codex만 쉰다.
        record["engines"] = ["codex"] if engine == "codex" and reason == "chrome" else list(ENGINES)
    write_json(path, record)
    if engine == "claude" and not browser:
        (S / "backoff.json").unlink(missing_ok=True)
    return local


def clear_backoff(engine, mode=None):
    """완료한 엔진의 대기와 완료한 수집 작업의 브라우저 대기를 지운다."""
    (S / "backoff" / f"{engine}.json").unlink(missing_ok=True)
    if engine == "claude":
        (S / "backoff.json").unlink(missing_ok=True)
    if mode in BROWSER:
        (S / "backoff" / f"browser-{mode}.json").unlink(missing_ok=True)


def transport_errors(text):
    errors = []
    for line in text.splitlines():
        try:
            value = json.loads(line)
        except ValueError:
            errors.append(line)  # CLI 실행 자체의 stderr(시작 실패, 인증 실패 등).
            continue
        if isinstance(value, dict) and value.get("type") in ("error", "turn.failed", "thread.error"):
            error = value.get("error") or value.get("message") or ""
            errors.append(error.get("message", "") if isinstance(error, dict) else str(error))
    return "\n".join(errors)


def fallback_reason(text, failure=""):
    """엔진을 쉬게 하거나 바꿀 이유. text는 에이전트의 마지막 응답, failure는 CLI 자체가 실패했을 때의 오류 문구다.

    사용량 한도와 인증은 failure로만 판단한다. git 오류나 지식 문서를 인용한 에이전트 본문으로 Claude를 쉬게 하지 않는다.
    """
    sentinel = text.strip()  # CHROME_UNAVAILABLE은 이름을 유지한 ego lite 연결 실패다.
    if sentinel != "POLICY_BLOCKED" and sentinel not in BROWSER_SIGNALS:
        error = json_response(text).get("error")
        sentinel = error if isinstance(error, str) else ""
    if sentinel == "POLICY_BLOCKED":
        return "policy"
    if sentinel == "USER_TAKEOVER":
        return "takeover"
    if LIMIT.search(failure):
        return "limit"
    if AUTH.search(failure):
        return "auth"
    return BROWSER_SIGNALS.get(sentinel)


def codex_command(mode, conf, output, verify=False, run=None):
    readonly = mode == "digest" or verify
    cmd = [conf["codex"], "-a", "never", "exec", "--ephemeral", "--sandbox",
           "read-only" if readonly else "workspace-write", "-C", str(REPO), "-m",
           "gpt-6-astra" if verify else conf["codex_model"],
           "-c", f'model_reasoning_effort="{"ultra" if verify else conf["codex_effort"]}"',
           "-c", "features.fast_mode=false", "-c", 'web_search="live"' if mode == "learn" else 'web_search="disabled"',
           *CODEX_NO_BROWSER, "-c", "features.multi_agent=false",
           "-c", 'shell_environment_policy.set.VAULT_LEARN_ENGINE="codex"',
           "-c", "shell_environment_policy.set.VAULT_LEARN_STATE=" + json.dumps(str(S)),
           "-c", "sandbox_workspace_write.network_access=false",
           "-c", "sandbox_workspace_write.writable_roots=[]",
           "-c", "sandbox_workspace_write.exclude_tmpdir_env_var=true",
           "-c", "sandbox_workspace_write.exclude_slash_tmp=true", "--json", "--color", "never", "-o", str(output)]
    if not readonly:
        # 루트 config, 채널 캐시, 처리 기록과 own_commits는 모델에게 쓰기 권한을 주지 않는다.
        roots = {"learn": [S / "tmp", run_dir(run) if run else S / "runs" / "RUN"],
                 "harvest": [S / "tmp", run_dir(run) if run else S / "runs" / "RUN",
                             S / "inbox" / "threads", S / "inbox" / "email"],
                 "instagram": [S / "tmp", S / "inbox" / "instagram"]}
        for root in roots[mode]:
            cmd += ["--add-dir", str(root)]
    return cmd


def codex_prompt(mode, conf, run=None, digest=None):
    text = (f"Follow the auto-learn workflow sections below for {mode}; they are already provided, do not reread SKILL.md. "
            "Read root and applicable domain AGENTS.md unless already present in context. "
            f"State S={S}; VL=`python3 {SCRIPT}`. Noninteractive: defer uncertain items. "
            "Do not commit, push, publish, discard, restore, install jobs, change config, or invoke another AI CLI. "
            "Do not read ~/.ssh, ~/.aws, ~/.gnupg, ~/.netrc, credential/auth/session files, or Claude configuration. "
            "Read installed Codex plugin skill files only when required. No state identifiers or private names in repo files. ")
    if mode in ("learn", "harvest"):
        m = load_manifest(run)
        text += (f"Runner already opened run R={run}; do not begin another. Baseline dirty files are protected: "
                 f"{json.dumps(m['baseline_dirty'], ensure_ascii=False)}. Adopted plan: {json.dumps(m['files'])}. "
                 "Use VL plan before every edit. Write result.json once with every item in this run, then VL check. "
                 "Skip in-skill publish and writer-side verification: outer runner independently verifies learn and publishes. "
                 "Do not change manifest.json directly. Never edit files that plan rejected. "
                 f"Final JSON must include mode={mode!r} and run={run!r}. ")
    if mode == "learn":
        text += (f"K={conf['k']}. For existing-document merges, plan category indexes only when their content needs changing. "
                 "Read the index first: if the document is already linked, no checkbox or summary needs updating, and domain rules "
                 "require no index change, leave that index out of the plan. A dirty unchanged index does not block a clean document. "
                 "New, moved, unlinked, or newly completed documents still require applicable index updates and normal plan approval. "
                 "Final response is one JSON object with mode and run. "
                 "Do not run VL enqueue because queue/seen state is runner-owned. "
                 "Return discovered YouTube links as actions.enqueue=[{url:URL,source:PICK_KEY}]; outer runner enqueues them. ")
    if mode not in BROWSER:  # 사용자의 ego-browser 허용 규칙은 모든 Codex 실행에 적용되므로 수집 작업 밖에서는 막는다.
        text += "Never run ego-browser or use any browser; this mode needs none. "
    if mode in BROWSER:
        prefix = f"vault-learn-{mode}-{stamp()}"
        script = S / "tmp" / f"{prefix}-N.mjs"
        guide = ego_guide()
        # 사용자의 Codex 규칙 prefix_rule(["ego-browser"])은 리디렉션, heredoc, 파이프가 없는 단독 명령만 샌드박스 밖에서
        # 실행한다. stdin 형식은 샌드박스 안에서 돌아 ego lite의 Mach 서비스에 닿지 못하므로 스크립트 파일을 import한다.
        text += ("Browser (2026-10-25 user decision): ego lite only, through the ego-browser CLI in your shell; use no other "
                 "browser, browser tool or backend. Run each ego-browser command alone as one plain command with no "
                 "redirection, heredoc, pipe, substitution or variable: only that form matches the user's Codex rule that "
                 "runs ego-browser outside the sandbox. "
                 + (f"Read the ego-browser guide the runner saved at {guide} to its end-of-guide line and follow it. " if guide
                    else "Run `ego-browser skill` first and follow it to its end-of-guide line. ")
                 + f"Write every round as a new file {script} (N = 1, 2, ...; never rewrite an earlier file) and run exactly: "
                 f"ego-browser nodejs -e \"await import('{script.as_uri()}')\" (the imported module has the same helpers). "
                 "Never run ego-browser upgrade or import. "
                 f"Use one TaskSpace named vault-learn-{mode} (taskSpace resumes it if an earlier run left it open), reuse "
                 "Page p1 with goto, and call await task.finish({ keep: [] }) once after success, never after an error. "
                 "If a user-owned space holds that name (EGO_TASK_SPACE_NAME_IN_USE) or the user takes control of the browser, "
                 "stop without claiming, finishing or opening another space and return USER_TAKEOVER; never retry or route around it. "
                 f"Save screenshots as {S}/tmp/{prefix}-N.png. "
                 f"Read {SCRIPT.parent}/youtube_subs.js or threads_extract.js with node:fs in the ego script, define it with "
                 "page.evaluate(source) (page.evaluate(new Function(source)) if that is a SyntaxError), then call it in the "
                 "order its header comment gives, which does not rely on page.evaluate awaiting a page Promise, and follow next "
                 "to the end. "
                 "If ego-browser cannot reach ego lite, return CHROME_UNAVAILABLE, meaning ego lite is unavailable; never ask "
                 "for full access or switch browsers. "
                 "If automatic approval or policy rejects a browser action, return POLICY_BLOCKED; do not retry or switch engines/surfaces. "
                 "For Instagram, follow the workflow to log out of a different account and enter the exact configured Instagram "
                 "account from the saved-login screen without typing a password; never infer it from Threads. "
                 "Return INSTAGRAM_LOGGED_OUT only if that saved login cannot be completed or the target account cannot be verified. "
                 "In Gmail and Instagram never use keyboard.*, press, fill, selectOption, setInputFiles, dblclick, dragAndDrop, cdp, "
                 "clicks with clickCount above 1, or page.evaluate that clicks or types; "
                 "never like/save/send/reply/archive/delete/change-labels or explicitly mark read/unread. "
                 "Collect Instagram saved posts only. Never open or read Instagram DM lists/conversations or create DM leads. "
                 "Write inbox files but do not run inbox-reindex; outer runner performs it. "
                 "Final response JSON may include actions.complete={email:['mail'],instagram:['saved']} "
                 "only for fully scanned portions. ")
    if mode == "harvest":
        text += ("Use Gmail through ego lite. If YouTube, Threads or Gmail is signed out, skip that step and list it in login_needed. "
                 "Standing user authorization (2026-10-08): open registered newsletter bodies by URL "
                 "regardless of unread or uncertain read status, including incidental marking as read; no per-run confirmation is needed. "
                 "This permission covers newsletter viewing only; all other mail restrictions above remain. "
                 "Use list-only only when the body cannot be retrieved. Write subscriptions TSV under S/tmp. "
                 "Use VL channels-merge --rows PATH --dry-run [--complete] for pending channel preview. "
                 "Do not use channels-set or real channels-merge. Add approved learning channels only after successful plan. "
                 "Final JSON actions={subscriptions:PATH,subscriptions_complete:true|false,"
                 "channels:[{handle:HANDLE,decision:'learn'|'exclude',reason:SHORT_ENGLISH_REASON}],"
                 "complete:{email:['mail']}}; omit actions you did not complete. Outer runner applies cache/seen changes. ")
    if mode == "digest":
        text += (f"Today={dt.date.today()}. Read-only process: do not call VL digest-data or write any files. "
                 "The runner supplies selected data below. Return only Markdown with ## 변경 and ## 핵심 3가지. "
                 "If changes is empty use 없음 under ## 변경. Read changed documents to choose three useful points.\n"
                 + json.dumps(digest, ensure_ascii=False))
    return workflow_sections(mode, "codex") + "\n\nRunner instructions (override workflow execution details):\n" + text


def codex_final(text):
    for line in reversed(text.splitlines()):
        with contextlib.suppress(ValueError):
            obj = json.loads(line)
            item = obj.get("item", {})
            if obj.get("type") == "item.completed" and item.get("type") == "agent_message":
                return item.get("text", "")
    return ""


def json_response(text):
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    with contextlib.suppress(ValueError):
        value = json.loads(text.strip())
        if isinstance(value, dict):
            return value
    for line in reversed(text.splitlines()):
        with contextlib.suppress(ValueError):
            value = json.loads(line)
            if isinstance(value, dict):
                return value
    return {}


def call_codex(mode, conf, prompt, verify=False, run=None):
    output = S / "logs" / "agent" / f"{mode}-codex-{stamp()}-{time.time_ns()}.response"
    cmd = codex_command(mode, conf, output, verify, run)
    rc, path = run_cli(mode, "codex", cmd, prompt, conf[f"{mode}_timeout_min"] * 60)
    text = path.read_text(encoding="utf-8", errors="replace")
    final = output.read_text(encoding="utf-8") if output.exists() else codex_final(text)
    return rc, path, final


def verify_codex(run, conf, files):
    prompt = (f"Independent adversarial read-only review. Read root/domain AGENTS.md and {run_dir(run) / 'result.json'}. "
              f"Review only these planned files: {json.dumps(files, ensure_ascii=False)}. Read git diff HEAD -- FILES "
              "and untracked full files. Follow original source paths/primary URLs in the documents, verify facts, "
              "dates, scope, domain routing, wiki links, PII, faith exclusion, U+00B7 and verified_at rules. "
              "Do not edit files or execute state mutations. Never read credentials or private config outside the task. "
              'Return only JSON {"ok":true|false,"findings":[{"kind":"confirmed|conditional|unverified|limitation",'
              '"file":"path","reason":"evidence"}]}. '
              "Use confirmed for defects and unverified for material claims lacking evidence; either requires ok false. "
              "Use limitation only for non-blocking review coverage limits that do not undermine any added claim; "
              "explain which evidence supports those claims despite the limit. Do not classify unsupported claims as limitations. "
              "Use conditional for risks whose triggering conditions are not established. Set ok true only if no blocker remains.")
    rc, path, final = call_codex("learn", conf, prompt, verify=True)
    value = json_response(final)
    ok = rc == 0 and value.get("ok") is True and isinstance(value.get("findings"), list)
    findings = value.get("findings", [])
    if not isinstance(findings, list):
        findings = []
        ok = False
    if any(not isinstance(f, dict)
           or f.get("kind") not in ("confirmed", "conditional", "unverified", "limitation")
           or any(not isinstance(f.get(key), str) or not f[key].strip() for key in ("file", "reason"))
           for f in findings):
        ok = False
    if any(f.get("kind") in ("confirmed", "unverified") for f in findings if isinstance(f, dict)):
        ok = False
    return ok, {"log": path.name, "result": value, "rc": rc}


def codex_actions(mode, value, published=False, cache=False):
    actions = value.get("actions", {})
    if not isinstance(actions, dict):
        raise ValueError("actions는 JSON object여야 한다")
    with open(os.devnull, "w") as null, contextlib.redirect_stdout(null):
        if mode == "learn":
            entries = actions.get("enqueue", [])
            if not isinstance(entries, list):
                raise ValueError("enqueue는 JSON array여야 한다")
            pending = []
            for entry in entries:
                if not isinstance(entry, dict) or not isinstance(entry.get("url"), str) or not isinstance(entry.get("source"), str):
                    raise ValueError("enqueue 항목에 url과 source 문자열이 있어야 한다")
                vid = video_id(entry["url"])
                if not vid or not entry["source"].strip():
                    raise ValueError("enqueue에 유효한 YouTube 영상과 출처 key가 있어야 한다")
                pending.append((vid, entry["source"]))
            for vid, source in pending:
                cmd_enqueue(argparse.Namespace(ids=[vid], source=source, priority="new"))
            return
        if cache and mode == "harvest" and actions.get("subscriptions"):
            path = Path(actions["subscriptions"]).resolve()
            path.relative_to((S / "tmp").resolve())
            cmd_channels_merge(argparse.Namespace(rows=str(path), complete=actions.get("subscriptions_complete") is True))
        if mode == "harvest":
            for channel in actions.get("channels", []):
                if channel.get("decision") not in ("learn", "exclude"):
                    raise ValueError("잘못된 채널 결정")
                if cache and channel["decision"] != "exclude":
                    continue
                if not cache and (channel["decision"] != "learn" or not published):
                    continue
                cmd_channels_set(argparse.Namespace(handle=channel["handle"], decision=channel["decision"],
                                                   reason=channel.get("reason", "")))
        if cache:
            return
        for source in ("threads", "email") if mode == "harvest" else ("instagram",):
            allowed = {"mail"} if source == "email" else ({"saved"} if source == "instagram" else set())
            parts = (actions.get("complete", {}) or {}).get(source, [])
            if not isinstance(parts, list) or not set(parts) <= allowed:
                raise ValueError(f"잘못된 complete: {source}")
            cmd_inbox_reindex(argparse.Namespace(source=source, complete=parts, dry_run=False))


def execute_codex(mode, conf):
    run, digest, trusted = None, None, None
    if mode in ("learn", "harvest"):
        opened = io.StringIO()
        with contextlib.redirect_stdout(opened):
            rc = cmd_begin(argparse.Namespace(kind=mode))
        if rc:
            return {"engine": "codex", "status": "blocked", "reason": "repo_state"}
        run = json_response(opened.getvalue())["run"]
        m = load_manifest(run)
        m["engine"] = "codex"
        save_manifest(m)
        trusted = m.copy()
    if mode == "digest":
        with open(os.devnull, "w") as null, contextlib.redirect_stdout(null):
            cmd_digest_data(argparse.Namespace(date=str(dt.date.today())))
        digest = read_json(S / "digests" / f"{dt.date.today()}.json")
    prompt = codex_prompt(mode, conf, run, digest)
    base = guard_baseline(mode)  # 게시는 이 검사 뒤 runner가 하므로 own_commits에도 이 실행의 줄이 생기면 안 된다.
    if run:
        base["dirty"] -= set(trusted["files"])  # 해시가 같은 이전 미게시 파일만 begin이 이어받는다.
    dirty, head = base["dirty"], base["head"]
    # 사용자 규칙으로 샌드박스 밖에서 도는 ego-browser 명령이 있으므로 모든 모드를 검사한다. 예외나 SIGTERM으로 끝나도
    # 로그를 해석하기 전에 검사하고, 검사 전에 프로세스가 죽으면 남은 표시로 다음 실행이 멈춘다.
    mark_guard(mode, "codex")
    try:
        rc, path, final = call_codex(mode, conf, prompt, run=run)
    finally:
        current = read_json(run_dir(run) / "manifest.json") if run else {}
        files = current.get("files", []) if isinstance(current, dict) else None
        valid = isinstance(files, list) and all(isinstance(f, str) and norm_rel(f) == f for f in files)
        stop, scope, after = end_guard(base, files if valid else [])
    value = json_response(final)
    # 사용량 한도와 인증은 CLI가 실패했을 때 그 오류 이벤트와 stderr로만 판단한다(응답의 mode, run 불일치는 일반 실패).
    cli_failed = rc != 0 or not final.strip()
    failed = cli_failed or (mode != "digest" and value.get("mode") != mode) or bool(run and value.get("run") != run)
    failure = transport_errors(path.read_text(encoding="utf-8", errors="replace")) if cli_failed else ""
    reason = fallback_reason(final, failure)
    reset = re.search(r"\|(\d{10})\b", failure)
    report = {"engine": "codex", "log": path.name, "rc": rc, "run": run, "reset": reset.group(0) if reset else ""}
    if isinstance(value.get("login_needed"), list):  # 사용자가 ego lite에서 직접 로그인할 사이트를 status에 남긴다.
        report["login_needed"] = value["login_needed"]
    if stop:
        report["paused"] = True
    m = trusted
    if not valid:
        block_scope(m)
        return report | {"status": "scope_blocked", "note": "잘못된 plan 경로", "files": stop + scope}
    if m:
        m |= {"run": run, "engine": "codex", "kind": mode, "files": files,
              "baseline_dirty": sorted(dirty), "head": head}
        save_manifest(m)
    problems = stop + scope
    if git("rev-parse", "HEAD").stdout.strip() != head:
        problems.append("HEAD changed during Codex run")
    if problems:
        block_scope(m)
        return report | {"status": "scope_blocked", "files": problems}
    if m:
        pending = set(dirty_paths())
        m["writer_hashes"] = {f: after.get(f, "absent") for f in files if f in pending}
        save_manifest(m)
    if reason or failed:
        return report | {"status": "failed", "reason": reason, "note": final[-1000:]}
    if mode == "digest":
        if not final.strip().startswith("## 변경") or "## 핵심 3가지" not in final or "\u00b7" in final:
            return report | {"status": "failed", "reason": "digest_format"}
        write_text(S / "digests" / f"{dt.date.today()}.md", final.strip() + "\n")
        notify_digest()
        return report | {"status": "completed"}
    if mode == "harvest":
        codex_actions(mode, value, cache=True)  # 새 personal 채널도 게시 전 PII 검사에 포함한다.
    if run:
        pending = set(dirty_paths())
        changed = [f for f in files if f in pending]
        hashes = m["writer_hashes"]
        if set(changed) != set(hashes) or any(file_hash(f) != h for f, h in hashes.items()):
            block_scope(m)
            return report | {"status": "scope_blocked", "note": "작성 뒤 plan 파일이 바뀌었다"}
        problems = check_files(changed)
        if problems:
            return report | {"status": "check_failed", "problems": problems}
        if mode == "learn" and changed:
            mark_guard(mode, "codex")  # 검증 실행에도 사용자의 ego-browser 규칙이 적용되므로 같은 검사를 한다.
            try:
                ok, verification = verify_codex(run, conf, changed)
            finally:
                stop, scope, _ = end_guard(base, files)
            m["verification"] = verification
            save_manifest(m)
            review_pending = set(dirty_paths())
            if (stop or scope
                    or set(hashes) != {f for f in files if f in review_pending}
                    or git("rev-parse", "HEAD").stdout.strip() != head
                    or any(file_hash(f) != h for f, h in hashes.items())):
                block_scope(m)
                return report | {"status": "scope_blocked", "note": "검증 동안 파일이나 HEAD가 바뀌었다",
                                 "files": stop + scope} | ({"paused": True} if stop else {})
            if not ok:
                m["status"] = "verification_failed"
                save_manifest(m)
                return report | {"status": "verification_failed", "verification": verification}
        if git("rev-parse", "HEAD").stdout.strip() != head or any(file_hash(f) != h for f, h in hashes.items()):
            block_scope(m)
            return report | {"status": "scope_blocked", "note": "검증 뒤 파일이 바뀌었다"}
        m["publish_hashes"] = hashes
        save_manifest(m)
        result = run_dir(run) / "result.json"
        if changed and not result.exists():
            return report | {"status": "failed", "reason": "result_missing"}
        if result.exists():
            result_data = read_json(result)
            if not isinstance(result_data, dict) or not isinstance(result_data.get("items", []), list):
                return report | {"status": "failed", "reason": "result_format"}
            if changed and (not isinstance(result_data.get("scope"), str) or not isinstance(result_data.get("subject"), str)):
                return report | {"status": "failed", "reason": "result_format"}
            out = io.StringIO()
            try:
                with contextlib.redirect_stdout(out):
                    published = cmd_publish(argparse.Namespace(run=run, dry_run=False, outer=True)) == 0
            except (SystemExit, TypeError) as e:
                return report | {"status": "failed", "reason": "result_format", "note": str(e)}
            report["publish"] = json_response(out.getvalue())
        else:
            published = True
    else:
        published = True
    if mode in ("learn", "harvest", "instagram"):
        codex_actions(mode, value, published)
    status = "completed" if published else ("scope_blocked" if report.get("publish", {}).get("status") == "scope_blocked" else "publish_failed")
    return report | {"status": status}


def agent_has_work(mode, conf):
    if mode == "digest":
        if (S / "digests" / f"{dt.date.today()}.md").exists():
            log("digest: 오늘 다이제스트가 이미 있다")
            return False
        return True
    if mode == "instagram" and not conf["instagram_saved_url"]:
        log("instagram: config.json에 저장 글 주소가 없다")
        return False
    if mode in ("harvest", "instagram"):
        if subprocess.run(["pgrep", "-x", "ego lite"], capture_output=True).returncode != 0:
            log(f"{mode}: ego lite가 실행 중이 아니다")
            return False
        return True
    data = pick_data(conf["k"])
    if data["tier1"] or data["tier2"] or leftover_runs("learn"):
        return True
    idle = read_json(S / "runs" / "idle.json", {}) or {}
    if time.time() - idle.get("ts", 0) < conf["idle_interval_min"] * 60:
        log("learn: 새 항목이 없고 유휴 보강 주기 전이다")
        return False
    write_json(S / "runs" / "idle.json", {"ts": time.time()})
    return bool(data["tier3"]["todos"] or data["tier3"]["stale"])


def run_cli(mode, engine, cmd, prompt, timeout_s):
    path = S / "logs" / "agent" / f"{mode}-{engine}-{stamp()}-{time.time_ns()}.log"
    with open(path, "w", encoding="utf-8") as out:
        proc = subprocess.Popen(cmd, cwd=REPO, stdin=subprocess.PIPE, stdout=out, stderr=subprocess.STDOUT,
                                text=True, start_new_session=True,
                                # 엔진이 부르는 다른 Python도 실행 검사가 보는 __pycache__를 쓰지 않게 한다.
                                env=os.environ | {"VAULT_LEARN_ENGINE": engine, "VAULT_LEARN_STATE": str(S),
                                                  "PYTHONDONTWRITEBYTECODE": "1"})

        def stop(signum, _frame):  # launchd가 작업을 내리면 엔진 프로세스 그룹까지 정리한다.
            with contextlib.suppress(ProcessLookupError):
                os.killpg(proc.pid, signal.SIGTERM)
            try:  # 엔진이 끝난 뒤의 파일 상태로 실행 뒤 검사와 finish_runs가 돌게 한다.
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                with contextlib.suppress(ProcessLookupError):
                    os.killpg(proc.pid, signal.SIGKILL)
            sys.exit(128 + signum)  # 호출한 쪽의 finally가 실행 뒤 검사를 한다.

        signal.signal(signal.SIGTERM, stop)
        proc.stdin.write(prompt)
        proc.stdin.close()
        try:
            return proc.wait(timeout=timeout_s), path
        except subprocess.TimeoutExpired:
            with contextlib.suppress(ProcessLookupError):
                os.killpg(proc.pid, signal.SIGTERM)
            try:
                proc.wait(timeout=30)
            except subprocess.TimeoutExpired:
                with contextlib.suppress(ProcessLookupError):
                    os.killpg(proc.pid, signal.SIGKILL)
                proc.wait()
            out.write(f"\n[vault_learn] {timeout_s // 60}분 시간 제한으로 중단했다\n")
            return "timeout", path


def notify(text, title="Vault 자동 학습"):
    script = (f"display notification {json.dumps(text[:200], ensure_ascii=False)} "
              f"with title {json.dumps(title, ensure_ascii=False)}")
    subprocess.run(["osascript", "-e", script], capture_output=True)


def notify_digest():
    selection = read_json(S / "digests" / f"{dt.date.today()}.json", {}) or {}
    files = {f for c in selection.get("changes") or [] for f in c.get("files", [])}
    notify(f"바뀐 문서 {len(files)}개와 핵심 3가지가 준비됐다." if files else "어제 바뀐 문서가 없다.", "Vault 학습 다이제스트")


def agent_log_paths(pattern):
    entries = []
    for path in (S / "logs" / "agent").glob(pattern):
        with contextlib.suppress(FileNotFoundError):  # 다른 모드의 정리가 glob 이후 파일을 지울 수 있다.
            entries.append((path.stat().st_mtime, path))
    return [path for _, path in sorted(entries, reverse=True)]


def prune_agent_logs(keep=300):
    for pattern in ("*.log", "*.response"):
        for path in agent_log_paths(pattern)[keep:]:
            path.unlink(missing_ok=True)
    cutoff = time.time() - 3 * 86400  # 브라우저 실행이 파일 접두사로 남긴 스크립트, 스크린샷과 폴더
    for path in (S / "tmp").glob("vault-learn-*"):
        with contextlib.suppress(OSError):
            if path.lstat().st_mtime >= cutoff:
                continue
            if path.is_dir() and not path.is_symlink():
                shutil.rmtree(path)
            else:
                path.unlink()


def protected_state(git_dir):
    """VL과 Git이 다음 실행에서 읽는 상태(VL 설정, Git 설정과 훅). 읽을 수 없는 파일은 inode 변경 시각으로 기록한다."""
    state = {}
    for p in [S / "config.json", git_dir / "config", *(git_dir / "hooks").glob("*")]:
        try:
            if p.is_file():
                state[str(p)] = hashlib.sha256(p.read_bytes()).hexdigest()
        except OSError:
            try:
                state[str(p)] = f"unreadable:{p.lstat().st_ctime_ns}"
            except OSError:
                state[str(p)] = "unreadable"
    return state


def protected_changes(before, after):
    return [f"protected state changed: {k}" for k in sorted(before.keys() | after.keys()) if before.get(k) != after.get(k)]


def pause_guard(mode, stop):
    (S / "paused").touch()
    log(f"{mode}: 보호 상태나 허용 범위 밖의 변경이 있어 자동 실행을 멈췄다: {', '.join(stop)}")
    notify(f"{mode} 실행 뒤 허용 밖 변경으로 자동 학습을 멈췄다: {', '.join(stop[:3])}"[:150]
           + ". vault-learn status로 확인한 뒤 vault-learn resume으로 다시 연다.")


def mark_guard(mode, engine):
    """검사할 엔진 실행 직전의 표시. 실행 뒤 검사가 끝나야 지우므로 검사 전에 죽은 실행(SIGKILL, 전원)이 남는다."""
    write_json(S / PENDING, {"mode": mode, "engine": engine, "at": now().isoformat(timespec="seconds")})


def end_guard(base, files, token=None):
    """실행 뒤 검사. 멈출 문제가 있으면 표시를 지우기 전에 멈춘다."""
    stop, scope, after = guard_problems(base, files, token)
    if stop:
        pause_guard(base["mode"], stop)
    (S / PENDING).unlink(missing_ok=True)
    return stop, scope, after


def guard_left(mode):
    """agent-write 잠금을 잡은 뒤에도 표시가 있으면 실행 뒤 검사 전에 끝난 실행이다. 상태를 알 수 없으므로 멈춘다."""
    if not (S / PENDING).exists():
        return False
    left = read_json(S / PENDING, {})
    left = left if isinstance(left, dict) else {}
    mode = left.get("mode") if left.get("mode") in MODES else mode
    stop = [f"guard did not finish: {left.get('engine')} {mode} run started {left.get('at')}"]
    pause_guard(mode, stop)
    write_json(S / "runs" / f"last-{mode}.json", {"at": now().isoformat(timespec="seconds"), "attempts": [
        {"engine": left.get("engine"), "status": "scope_blocked", "paused": True, "files": stop}]})
    (S / PENDING).unlink(missing_ok=True)
    return True


def guard_baseline(mode):
    """실행 전 상태. ego 스크립트는 ego lite의 Node에서, Codex의 ego-browser 명령은 사용자 규칙으로 샌드박스 밖에서 돈다."""
    git_dir = Path(git("rev-parse", "--absolute-git-dir").stdout.strip())
    own = S / "own_commits"
    return {"mode": mode, "git_dir": git_dir, "protected": protected_state(git_dir),
            "own": own.read_bytes() if own.exists() else b"", "repo": repo_snapshot(),
            "dirty": set(dirty_paths()), "head": git("rev-parse", "HEAD").stdout.strip(), "refs": remote_refs(),
            # Claude harvest는 실행 중 begin으로 이전 harvest의 미게시 목록 편집을 이어받는다.
            "adoptable": {f for files in leftover_runs("harvest").values() for f in files} if mode == "harvest" else set()}


def own_commit_problems(before):
    """실행 중 own_commits 변화. VL publish와 리베이스 게시가 덧붙인 줄만 받는다. 덧붙인 줄은 지식 문서(EDITABLE)만
    바꾼 커밋이어야 한다. 리베이스 전 원래 커밋은 HEAD 이력에서 빠지지만 VL은 HEAD 이력만 푸시한다."""
    path = S / "own_commits"
    after = path.read_bytes() if path.exists() else b""
    if not after.startswith(before):
        return ["own_commits rewritten"]
    problems = []
    for sha in after[len(before):].decode("utf-8", "replace").split():
        commit = re.fullmatch(r"[0-9a-f]{40}", sha) and git("cat-file", "-t", sha, check=False).stdout.strip() == "commit"
        paths = (set(git("diff-tree", "-m", "--root", "--no-commit-id", "--name-only", "-r", "-z", sha).stdout.split("\0"))
                 - {""}) if commit else None
        if paths is None or not all(EDITABLE.fullmatch(f) for f in paths):
            problems.append(f"own_commits entry is not a VL commit: {sha[:12]}")
    return problems


def guard_problems(base, files, token=None):
    """실행 뒤 (자동 실행을 멈출 문제, 범위 문제, 실행 뒤 저장소 해시). 검사 자체가 실패해도 멈춘다(fail closed).

    files는 이 실행이 고쳐도 되는 파일이다. 그 밖에서 바뀐 경로 중 지식 문서(Git이 무시하지 않는 tech/, biz/, econ/, fit/
    Markdown, 지침 파일 제외)는 범위 문제로 남기고, 코드, 설정, 지침 파일, 무시된 경로와 심볼릭 링크는 멈춘다. VL이 기록한
    커밋과 원격 커밋만으로 설명되는 경로(리베이스 게시가 받아 온 원격 변경, 대화형 VL publish)는 받는다. 원격 커밋은 실행 전
    origin/main과, 옮겨졌으면 git ls-remote와 같은 origin/main에서 닿는 커밋만 인정한다. 원격 추적 ref는 로컬 파일이라
    위조할 수 있어서 다른 원격 ref가 바뀌어도 멈춘다.
    """
    stop, scope, after = [], [], {}
    try:
        stop += protected_changes(base["protected"], protected_state(base["git_dir"]))
        stop += own_commit_problems(base["own"])
        own = S / "own_commits"
        mine = set(own.read_bytes().decode("utf-8", "replace").split()) if own.exists() else set()
        head, refs, before_main = base["head"], remote_refs(), base["refs"].get(ORIGIN_MAIN)
        stop += [f"remote ref changed: {r}" for r in sorted(base["refs"].keys() | refs.keys())
                 if r != ORIGIN_MAIN and base["refs"].get(r) != refs.get(r)]
        trusted = [before_main] if before_main else []
        if refs.get(ORIGIN_MAIN) not in (None, before_main):
            if remote_main() == refs[ORIGIN_MAIN]:
                trusted.append(refs[ORIGIN_MAIN])
            else:
                stop.append("origin/main moved but does not match git ls-remote")
        exclude = [f"^{c}" for c in trusted]
        added = git("rev-list", "HEAD", f"^{head}", *exclude).stdout.split()
        scope += [f"commit not published by VL: {c[:12]}" for c in added if c not in mine]
        dirty = set(base["dirty"])
        if base["adoptable"]:
            adopted = {f for _, m in manifests() if token and m.get("agent") == token
                       for a in m.get("adopted") or [] for f in a.get("files") or []}
            dirty -= base["adoptable"] & adopted
        after = repo_snapshot()
        bad = scope_problems(base["repo"], after, dirty, files, base["mode"])
        if bad:
            explained = set()
            dropped = git("rev-list", head, "^HEAD", *exclude).stdout.split()
            if all(c in mine for c in added + dropped):
                explained = set(git("diff", "--no-renames", "--name-only", "-z", head, "HEAD").stdout.split("\0"))
                explained -= {""} | set(dirty_paths())
            visible = set(git("ls-files", "--cached", "--others", "--exclude-standard", "-z").stdout.split("\0"))
            for f in bad:
                if f not in explained:  # 지운 지식 문서는 무시 목록과 상관없이 지식 문서다(git rm, git mv).
                    now_at = after.get(f, "absent")
                    note = EDITABLE.fullmatch(f) and (now_at == "absent" or f in visible and not now_at.startswith("symlink:"))
                    (scope if note else stop).append(f)
    except Exception as e:  # 검사를 끝내지 못하면 이유와 관계없이 멈춘다.
        stop.append(f"guard check failed: {type(e).__name__}: {e}")
    return stop, scope, after


def execute_claude(mode, conf):
    allow, deny = agent_rules(mode)
    cmd = [conf["claude"], "-p", "--model", "opus", "--effort", "max", "--permission-mode", "dontAsk",
           "--add-dir", str(S), "--output-format", "json", "--no-session-persistence",
           "--allowedTools", *allow, "--disallowedTools", *deny, "--no-chrome"]
    prompt = agent_prompt(mode, conf)
    base = guard_baseline(mode) if mode in BROWSER else None
    token, stop, scope = os.environ.get("VAULT_LEARN_AGENT"), [], []
    if base:
        mark_guard(mode, "claude")
    try:
        rc, path = run_cli(mode, "claude", cmd, prompt, conf[f"{mode}_timeout_min"] * 60)
    finally:  # 로그를 읽기 전에, 시간 제한이나 SIGTERM으로 끝나도 검사한다. 멈춤은 다른 정리보다 먼저다.
        if base:
            stop, scope, _ = end_guard(base, [SOURCES] if mode == "harvest" else [], token)
    text = path.read_text(encoding="utf-8", errors="replace")
    result = last_result(text)
    cli_failed = rc != 0 or not result or result.get("is_error")
    final = result.get("result") or ""
    value = json_response(final)
    failed = cli_failed
    if mode == "learn":
        failed = failed or value.get("mode") != "learn" or bool(value.get("blocked") or value.get("error"))
        failed = failed or value.get("status") in ("blocked", "failed", "scope_blocked", "verification_failed", "check_failed")
        failed = failed or value.get("publish") not in ("published", "nothing", "deferred", "unverified")
    # 사용량 한도와 인증은 CLI가 실패했을 때 그 오류 문구(stderr, 오류 결과)로만 판단한다. 결과 JSON의 게시 실패나
    # 본문에 인용한 git 인증 오류, 문서 주제는 Claude 자체를 쓸 수 없다는 뜻이 아니다.
    failure = (transport_errors(text) + ("\n" + final if result.get("is_error") else "")) if cli_failed else ""
    reason = fallback_reason(final, failure)
    reset = re.search(r"\|(\d{10})\b", failure)
    report = {"engine": "claude", "log": path.name, "rc": rc, "reset": reset.group(0) if reset else "",
              "status": "failed" if failed or reason else "completed", "reason": reason}
    if isinstance(value.get("login_needed"), list):  # 사용자가 ego lite에서 직접 로그인할 사이트를 status에 남긴다.
        report["login_needed"] = value["login_needed"]
    if stop:
        report["paused"] = True
    if stop or scope:  # 다른 엔진으로 넘기지 않고, 이 실행이 연 harvest run을 다음 실행이 이어받지 않게 한다.
        report |= {"status": "scope_blocked", "reason": None, "files": stop + scope}
        for _, m in manifests():
            if token and m.get("agent") == token:
                block_scope(m)
    return report


def cmd_agent(a):
    if os.environ.get("VAULT_LEARN_ENGINE") in ENGINES:
        emit({"status": "blocked", "note": "학습 agent는 다른 agent를 재귀 실행하지 않는다"})
        return 1
    conf, mode = cfg(), a.mode
    if getattr(a, "engine", None):
        conf = conf | {"engine": {m: a.engine if m == mode else v["engine"]
                                  for m, v in engine_settings(conf).items()}}
    if (S / "paused").exists() and not a.dry_run:
        log(f"{mode}: paused")
        return 0
    with locked(f"agent-{mode}", wait=False) as ok:
        if not ok:
            log(f"{mode}: 이전 실행이 아직 진행 중이다")
            return 0
        previous = read_json(S / "runs" / f"last-{mode}.json", {}) or {}
        if mode == "learn" and not a.dry_run and previous.get("retry_until", 0) > time.time():
            log("learn: 이전 실행 실패의 재시도 대기 중이다")
            return 0
        engines = engine_candidates(mode, conf, ignore_backoff=a.dry_run)
        if not engines:
            log(f"{mode}: 선택한 엔진이 모두 백오프 중이다")
            return 0
        if a.dry_run:
            for engine in engines:
                if engine == "codex":
                    print(shlex.join(codex_command(mode, conf, S / "logs" / "agent" / "dry-run.response")))
                    # dry-run은 실제 run이나 다이제스트 선택을 만들지 않는다.
                    print(f"Codex {mode}: runner begins run, checks scope, verifies learn, publishes; digest returns Markdown.")
                else:
                    allow, deny = agent_rules(mode)
                    cmd = [conf["claude"], "-p", "--model", "opus", "--effort", "max", "--permission-mode", "dontAsk",
                           "--add-dir", str(S), "--output-format", "json", "--no-session-persistence",
                           "--allowedTools", *allow, "--disallowedTools", *deny, "--no-chrome"]
                    print(shlex.join(cmd))
                    print(agent_prompt(mode, conf))
            return 0
        if not agent_has_work(mode, conf):
            return 0
        # 읽기 전용 모드도 HEAD와 보호 상태를 검사하므로 다른 자동 실행의 게시와 겹치지 않게 한다.
        # 잠금 이름 chrome은 기존 이름을 유지한 ego lite 잠금이다.
        chrome = locked("chrome") if mode in BROWSER else contextlib.nullcontext()
        editing = locked("agent-write")
        attempts = []
        with chrome, editing:
            for engine in engine_candidates(mode, conf):  # 엔진마다 한 번, 한 slot에 최대 두 번만 실행한다.
                # 잠금 대기 중이나 앞 엔진의 실행 검사로 생긴 멈춤, 검사 전에 끝난 실행의 표시도 따른다.
                if guard_left(mode) or (S / "paused").exists():
                    log(f"{mode}: paused")
                    break
                since = int(time.time())
                token = f"{os.getpid()}-{time.time_ns()}"
                os.environ["VAULT_LEARN_AGENT"] = token  # 이 실행과 엔진 자식이 여는 run에만 붙는다.
                try:
                    report = execute_codex(mode, conf) if engine == "codex" else execute_claude(mode, conf)
                except (ValueError, GitError, OSError, subprocess.SubprocessError) as e:
                    # 실행 파일이 없을 때만 엔진을 쓸 수 없는 것이다. 사라진 로그 같은 다른 파일 오류는 일반 실패다.
                    missing = isinstance(e, FileNotFoundError) and not shutil.which(conf[engine])
                    report = {"engine": engine, "status": "failed", "reason": "unavailable" if missing else None,
                              "note": str(e)}
                finally:
                    os.environ.pop("VAULT_LEARN_AGENT", None)
                    if mode in ("learn", "harvest"):
                        finish_runs(since, mode, token)
                attempts.append(report)
                last = {"at": now().isoformat(timespec="seconds"), "attempts": attempts}
                reason = report.get("reason")
                wait = reason in ENGINE_WAIT or (reason in BROWSER_WAIT and mode in BROWSER)
                # 엔진 대기는 엔진별 백오프가 맡고, 범위/검증 등 실행 실패는 AI를 띄우기 전에 쉰다.
                if mode == "learn" and report["status"] != "completed" and not wait:
                    count = min(previous.get("retry_count", 0) + 1, 5)
                    delay = 4  # 다음 1분 실행 주기를 포함해 통상 5분 안에 재시도한다.
                    last |= {"retry_count": count, "retry_until": time.time() + delay * 60}
                    log(f"learn: 실행 실패, {delay}분 뒤 재시도한다")
                write_json(S / "runs" / f"last-{mode}.json", last)
                if report["status"] == "completed":
                    clear_backoff(engine, mode)
                    log(f"{mode}: {engine} 완료 ({report.get('log', '')})")
                    if mode == "digest" and engine == "claude":
                        notify_digest()
                    break
                if report["status"] == "failed" and wait:
                    until = set_backoff(report.get("reset", ""), engine, reason, mode)
                    log(f"{mode}: {engine} {reason}, {until}까지 쉰다")
                    if reason in ENGINE_WAIT:  # Claude 자체를 쓸 수 없을 때만 다른 엔진이 대신한다.
                        continue
                # 범위, 검증, 정책 거부, 사용자 인계와 브라우저 실패는 다른 엔진으로 넘기지 않는다.
                if reason == "takeover":
                    notify(f"{mode}: ego lite 작업 공간을 사용자가 쓰고 있어 수집을 멈췄다. 공간을 닫으면 다음 실행부터 이어진다.")
                log(f"{mode}: {engine} {report['status']} {reason or ''} ({report.get('log', '')})")
                break
        prune_agent_logs()
    return 0


# ---------------------------------------------------------------- 운영

def cmd_status(a):
    summary = state_summary()
    summary["last_agent_runs"] = {}
    for mode in MODES:
        logs = agent_log_paths(f"{mode}-*.log")
        summary["last_agent_runs"][mode] = logs[0].name if logs else None
    emit(summary)
    return 0


def cmd_doctor(a):
    problems = []
    for tool in ("python3", "uvx", "ffmpeg", "ffprobe", "whisper-cli", "node", "git", "osascript", "ego-browser",
                 cfg()["claude"], cfg()["codex"]):
        if not shutil.which(tool):
            problems.append(f"PATH에서 {tool}을 찾지 못했다")
    models = Path(os.environ.get("WHISPER_CPP_MODEL_DIR", "~/.cache/whisper-cpp")).expanduser()
    problems += [f"whisper 모델이 없다: {models / n}" for n in ("ggml-large-v3-turbo.bin", "ggml-silero-v6.2.0.bin")
                 if not (models / n).exists()]
    if not TRANSCRIBE.exists():
        problems.append(f"전사 스크립트가 없다: {TRANSCRIBE}")
    twin = REPO / (".agents" if SKILL.parent.parent.name == ".claude" else ".claude") / "skills" / SKILL.name / "scripts"
    for path in SCRIPT.parent.iterdir():
        if path.is_file() and (not (twin / path.name).exists() or path.read_bytes() != (twin / path.name).read_bytes()):
            problems.append(f"스킬 스크립트 사본이 다르다: {path.name}")
    codex = shutil.which(cfg()["codex"])
    if codex:  # codex_command가 끄는 브라우저 MCP가 현재 Codex 설정에서도 꺼지는지 본다(모델을 부르지 않는다).
        try:
            p = subprocess.run([codex, "mcp", "list", "--json", *CODEX_NO_BROWSER], cwd=REPO, capture_output=True,
                               text=True, timeout=60)
            live = sorted(s["name"] for s in json.loads(p.stdout) if s.get("enabled") and s.get("name") in BROWSER_MCP)
        except (OSError, subprocess.SubprocessError, ValueError, TypeError, KeyError, AttributeError) as e:
            live = [f"확인 실패({type(e).__name__})"]
        if live:
            problems.append(f"Codex 실행에서 꺼지지 않은 브라우저 MCP: {', '.join(live)}")
    channels, letters = learning_sources()
    if not channels:
        problems.append(f"{SOURCES}에서 YouTube 채널을 읽지 못했다")
    unmapped = sorted(set(letters) - {s.get("name") for s in cfg()["email_senders"]})
    if unmapped:
        problems.append(f"config.json email_senders에 발신 주소가 없는 뉴스레터: {', '.join(unmapped)}")
    if not cfg()["threads_reposts_url"]:
        problems.append("config.json에 threads_reposts_url이 없다")
    print("\n".join(problems) or "ok")
    return 1 if problems else 0


def cmd_plists(a):
    """launchd plist를 S/launchd에 만든다. node 경로가 바뀌면 다시 만든 뒤 vault-learn install을 다시 한다."""
    python = shutil.which("python3") or sys.executable
    node = shutil.which("node")
    path = ":".join(dict.fromkeys([str(Path.home() / ".local/bin"), "/opt/homebrew/bin", "/opt/homebrew/sbin",
                                   *([str(Path(node).parent)] if node else []),
                                   "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"]))
    env = {"PATH": path, "HOME": str(Path.home()), "LANG": "en_US.UTF-8", "PYTHONUTF8": "1", "PYTHONUNBUFFERED": "1"}
    jobs = {"transcriber": (["transcribe"], {"KeepAlive": True, "RunAtLoad": True, "ThrottleInterval": 60, "Nice": 5}),
            "discover": (["discover"], {"StartInterval": 1800, "RunAtLoad": True}),
            "harvest": (["agent", "harvest"], {"StartInterval": 7200}),
            # Instagram은 계정 제한을 피하려고 하루 세 번만 읽는다(2026-10-05 사용자 결정).
            "instagram": (["agent", "instagram"], {"StartCalendarInterval": [{"Hour": h, "Minute": 0}
                                                                             for h in (9, 15, 21)]}),
            "learn": (["agent", "learn"], {"StartInterval": 60}),
            # 07:30이 본 실행이다. 밤새 learn이 사용량 한도에 걸려 백오프 중이거나 실패하면 그날 뒤 시각에 다시 한다.
            # 오늘 다이제스트가 있으면 agent_has_work가 엔진을 띄우지 않고 끝낸다.
            "digest": (["agent", "digest"], {"StartCalendarInterval": [{"Hour": h, "Minute": 30}
                                                                       for h in (7, 9, 11, 13, 16, 19, 22)]})}
    written = []
    for name, (args, extra) in jobs.items():
        plist = {"Label": LABEL + name, "ProgramArguments": [python, str(SCRIPT), *args], "WorkingDirectory": str(S),
                 "EnvironmentVariables": env, "StandardOutPath": str(S / "logs" / f"{name}.log"),
                 "StandardErrorPath": str(S / "logs" / f"{name}.log"), **extra}
        target = S / "launchd" / f"{LABEL}{name}.plist"
        with open(target, "wb") as f:
            plistlib.dump(plist, f)
        written.append(str(target))
    emit({"written": written, "PATH": path})
    return 0


def selftest_engines():
    global S, REPO, call_codex, verify_codex, cmd_publish, execute_claude, execute_codex, agent_has_work, notify, ego_guide, agent_rules, run_cli
    original = S, REPO, call_codex, verify_codex, cmd_publish, execute_claude, execute_codex, agent_has_work, notify, ego_guide, agent_rules, run_cli
    notify = lambda *_: None  # 자체 검사는 알림을 띄우거나 ego-browser를 실행하지 않는다.
    ego_guide = lambda: None
    try:
        with tempfile.TemporaryDirectory() as tmp:
            REPO, S = Path(tmp) / "repo", Path(tmp) / "state"
            REPO.mkdir()
            ensure_layout()
            git("init", "-q", "-b", "main")
            (REPO / "tech").mkdir()
            (REPO / "tech" / "A.md").write_text("---\nstatus: done\n---\n\n# A\n", encoding="utf-8")
            (REPO / "tech" / "B.md").write_text("---\nstatus: done\n---\n\n# B\n", encoding="utf-8")
            (REPO / "AGENTS.md").write_text("protected\n", encoding="utf-8")
            git("add", ".")
            git("-c", "user.name=Test", "-c", "user.email=user@example.com", "commit", "-qm", "baseline")
            # 실행 검사는 git ls-remote로 원격 main을 확인하므로 로컬 bare 저장소를 origin으로 둔다.
            git("init", "-q", "--bare", str(Path(tmp) / "origin.git"))
            git("remote", "add", "origin", str(Path(tmp) / "origin.git"))
            git("push", "-q", "origin", "main")
            conf = DEFAULTS.copy()
            # 지침 파일(변형 포함)은 도메인 폴더 안에 있어도 자동 학습이 고치는 지식 문서가 아니다.
            assert EDITABLE.fullmatch("tech/a/Claude-Code-Business-Automation.md") and EDITABLE.fullmatch("fit/AGENTS-x.md")
            assert not any(EDITABLE.fullmatch(p) for p in ("tech/AGENTS.md", "fit/x/CLAUDE.md", "biz/agents.md",
                                                            "econ/AGENTS.override.md", "tech/CLAUDE.local.md", "AGENTS.md"))
            # 다른 실행이 glob과 stat 사이에서 지운 로그 때문에 상태 조회나 정리가 실패하지 않는다.
            real_stat = Path.stat
            try:
                def disappearing_stat(path, *args, **kwargs):
                    if path.name.startswith("learn-gone."):
                        path.unlink(missing_ok=True)
                    return real_stat(path, *args, **kwargs)

                for suffix in ("log", "response"):
                    for age, name in enumerate(("old", "gone", "new"), 1):
                        path = S / "logs" / "agent" / f"learn-{name}.{suffix}"
                        path.write_text(name, encoding="utf-8")
                        os.utime(path, (age, age))
                Path.stat = disappearing_stat
                captured = io.StringIO()
                with contextlib.redirect_stdout(captured):
                    cmd_status(None)
                assert json_response(captured.getvalue())["last_agent_runs"]["learn"] == "learn-new.log"
                prune_agent_logs(keep=1)
                assert {p.name for p in (S / "logs" / "agent").iterdir()} == {"learn-new.log", "learn-new.response"}
            finally:
                Path.stat = real_stat
            for path in (S / "logs" / "agent").iterdir():
                path.unlink()
            # 브라우저 실행의 파일 접두사로 남은 오래된 스크립트와 폴더만 지우고, 다른 임시 파일은 그대로 둔다.
            (S / "tmp" / "vault-learn-harvest-3").mkdir()
            (S / "tmp" / "vault-learn-harvest-3" / "round-1.mjs").write_text("x", encoding="utf-8")
            (S / "tmp" / "vault-learn-harvest-4").mkdir()
            for name, age in (("vault-learn-harvest-1-1.mjs", 4), ("vault-learn-harvest-2-1.png", 0), ("subs.tsv", 9),
                              ("vault-learn-harvest-3", 4), ("vault-learn-harvest-4", 1)):
                if not (S / "tmp" / name).exists():
                    (S / "tmp" / name).write_text("x", encoding="utf-8")
                os.utime(S / "tmp" / name, (time.time() - age * 86400,) * 2)
            prune_agent_logs()
            assert sorted(p.name for p in (S / "tmp").iterdir()) == ["subs.tsv", "vault-learn-harvest-2-1.png",
                                                                     "vault-learn-harvest-4"]
            (S / "tmp" / "vault-learn-harvest-4").rmdir()
            # 검증 한계만 남긴 통과는 수용하되, 중요한 미검증 주장과 잘못된 응답은 차단한다.
            finding = {"file": "tech/A.md", "reason": "영상 화면은 확인하지 못했지만 추가 주장은 원문으로 확인했다"}
            for kind, expected in (("limitation", True), ("conditional", True), ("confirmed", False),
                                   ("unverified", False), ("unknown", False)):
                value = {"ok": True, "findings": [finding | {"kind": kind}]}
                call_codex = lambda *args, **kwargs: (0, Path("review.log"), json.dumps(value))
                assert verify_codex("test", conf, ["tech/A.md"])[0] is expected, kind
            for findings in ([{"kind": "limitation"}],
                             [finding | {"kind": "limitation", "reason": " "}],
                             [finding | {"kind": "limitation", "reason": None}],
                             [finding | {"kind": "limitation", "file": 1}],
                             [finding | {"kind": "limitation"}, finding | {"kind": "unverified"}]):
                value = {"ok": True, "findings": findings}
                call_codex = lambda *args, **kwargs: (0, Path("review.log"), json.dumps(value))
                assert verify_codex("test", conf, ["tech/A.md"])[0] is False, findings
            for rc, value in ((1, {"ok": True, "findings": []}),
                              (0, {"ok": False, "findings": [finding | {"kind": "limitation"}]}),
                              (0, {"ok": "true", "findings": []}), (0, {"ok": True}),
                              (0, {"ok": True, "findings": {}}), (0, {"ok": True, "findings": [None]}),
                              (0, {})):
                call_codex = lambda *args, **kwargs: (rc, Path("review.log"), json.dumps(value))
                assert verify_codex("test", conf, ["tech/A.md"])[0] is False, (rc, value)
            call_codex = original[2]
            # 2026-10-25 사용자 결정: 모든 작업에서 Claude가 먼저이고 Codex는 Claude를 쓸 수 없을 때만 쓴다.
            assert all(engine_candidates(mode, conf) == ["claude", "codex"] for mode in MODES)
            assert engine_candidates("learn", conf | {"primary": {"learn": "codex"}}) == ["codex", "claude"]
            assert engine_candidates("harvest", conf | {"engine": {"harvest": "codex"}}) == ["codex"]  # 사용자 고정은 따른다.
            view = engine_view(conf | {"engine": {"harvest": "codex"}})
            assert view["harvest"] == {"engine": "codex", "primary": "claude", "effective": ["codex"]}
            assert view["instagram"]["effective"] == ["claude", "codex"]
            write_json(S / "backoff.json", {"until": time.time() + 120})
            assert engine_candidates("learn", conf) == ["codex"]
            assert not engine_backoff("codex")
            set_backoff("usage limit", "codex")
            assert not engine_candidates("learn", conf)
            assert engine_candidates("learn", conf, True) == ["claude", "codex"]
            clear_backoff("codex")
            assert engine_candidates("learn", conf | {"engine": {"learn": "claude"}}) == []
            clear_backoff("claude")
            for engine in ENGINES:
                for failures in (0, 10):
                    for reset_after in (None, -60, 1800, 8 * 3600):
                        started = time.time()
                        reset_at = int(started) + reset_after if reset_after is not None else 0
                        write_json(S / "backoff" / f"{engine}.json", {"n": failures})
                        set_backoff(f"|{reset_at}" if reset_at else "", engine)
                        until = engine_backoff(engine)["until"]
                        if reset_after == 1800:
                            assert until == reset_at + 60
                        else:
                            assert started + 7200 <= until <= time.time() + 7200
                clear_backoff(engine)
            # 브라우저 대기는 수집 작업별 파일과 횟수를 쓰고 엔진 대기와 서로 덮어쓰지 않는다.
            write_json(S / "backoff" / "codex.json", {"n": 13, "until": time.time() - 60, "reason": "limit"})  # 만료된 한도
            set_backoff("", "codex", "chrome", "harvest")  # Codex의 연결 실패는 Codex 샌드박스나 규칙 문제일 수 있다.
            wait = browser_backoff("harvest")
            assert wait["n"] == 1 and wait["engines"] == ["codex"] and wait["until"] <= time.time() + 900
            assert engine_candidates("harvest", conf) == ["claude"] and engine_candidates("instagram", conf) == ["claude", "codex"]
            set_backoff("", "claude", "chrome", "harvest")  # Claude가 본 연결 실패는 ego lite 문제라 두 엔진 모두 쉰다.
            assert browser_backoff("harvest")["n"] == 2 and not engine_candidates("harvest", conf)
            set_backoff("", "claude", "logged_out", "instagram")
            set_backoff("usage limit", "claude")  # 엔진 한도가 수집 작업의 브라우저 대기를 지우지 않는다.
            assert engine_backoff("claude")["n"] == 1
            assert [engine_candidates(mode, conf) for mode in MODES] == [[], [], ["codex"], ["codex"]]
            clear_backoff("codex", "learn")  # 다른 작업의 완료는 브라우저 대기를 지우지 않는다.
            assert not engine_candidates("harvest", conf) and not engine_candidates("instagram", conf)
            clear_backoff("codex", "harvest")
            assert engine_candidates("harvest", conf) == ["codex"] and not engine_candidates("instagram", conf)
            set_backoff("", "codex", "logged_out", "instagram")  # 로그아웃은 같은 프로필이라 어느 엔진이 봐도 둘 다 쉰다.
            assert browser_backoff("instagram")["engines"] == list(ENGINES)
            clear_backoff("claude", "instagram")
            assert all(engine_candidates(mode, conf) == ["claude", "codex"] for mode in MODES)
            write_json(S / "backoff" / "claude.json", {"n": 1, "until": time.time() + 120, "reason": "chrome"})
            assert all(engine_candidates(mode, conf) == ["claude", "codex"] for mode in MODES)  # 이전 형식은 엔진 대기가 아니다.
            clear_backoff("claude")
            for reason in ("limit", "auth", "unavailable"):
                set_backoff("", "codex", reason)
                assert all(engine_candidates(mode, conf) == ["claude"] for mode in MODES)
                clear_backoff("codex")
            write_json(S / "backoff" / "codex.json", {"n": 13, "until": time.time() - 60, "reason": "limit"})
            set_backoff("", "codex", "auth")  # 만료된 한도의 횟수로 인증 대기가 8시간이 되지 않는다.
            assert engine_backoff("codex")["n"] == 1 and engine_backoff("codex")["until"] <= time.time() + 900
            set_backoff("", "codex", "auth")
            assert engine_backoff("codex")["n"] == 2
            clear_backoff("codex")
            # 사용량 한도와 인증은 CLI 자체의 오류 문구로만 판단하고 에이전트 본문은 분류하지 않는다.
            assert fallback_reason("", "authentication failed") == "auth"
            assert fallback_reason("CHROME_UNAVAILABLE") == "chrome"
            assert fallback_reason('{"error":"INSTAGRAM_LOGGED_OUT","reason":"x"}') == "logged_out"
            assert fallback_reason("USER_TAKEOVER") == "takeover"
            assert fallback_reason('{"error":"USER_TAKEOVER","detail":"usage limit"}', "usage limit") == "takeover"
            assert fallback_reason('{"error":{"code":"CHROME_UNAVAILABLE"}}', "exit 1") is None  # 문자열이 아닌 error
            assert fallback_reason("", "usage limit") == "limit"
            for message in ("You've hit your session limit - resets 2:40pm (Asia/Seoul)",
                            "You've hit your weekly limit - resets Oct 11 at 9am (Asia/Seoul)"):
                assert fallback_reason("", message) == "limit"
                assert fallback_reason(message) is None
            assert fallback_reason('{"mode":"learn","publish":"push_failed","note":"Authentication failed, HTTP 429"}') is None
            assert fallback_reason("POLICY_BLOCKED", "usage limit") == "policy"
            assert fallback_reason('{"error":"POLICY_BLOCKED","detail":"authentication usage limit"}', "usage limit") == "policy"
            assert fallback_reason("generic failed edit", "exit 1") is None
            assert fallback_reason("source mentions CHROME_UNAVAILABLE") is None
            telemetry = json.dumps({"type": "item.completed", "item": {"type": "command_execution",
                                      "output": "CHROME_UNAVAILABLE usage limit authentication"}})
            assert not transport_errors(telemetry)
            assert transport_errors(json.dumps({"type": "turn.failed", "error": {"message": "usage limit"}})) == "usage limit"
            cmd = codex_command("learn", conf, S / "last.response")
            assert "features.fast_mode=false" in cmd and not any("service_tier" in arg for arg in cmd)
            assert cmd[1:4] == ["-a", "never", "exec"] and "workspace-write" in cmd
            assert "danger-full-access" not in cmd and "--dangerously-bypass-approvals-and-sandbox" not in cmd
            assert "sandbox_workspace_write.writable_roots=[]" in cmd and "mcp_servers.playwright.enabled=false" in cmd
            assert cmd.count("--add-dir") == 2
            readonly = codex_command("digest", conf, S / "last.response")
            assert "read-only" in readonly and "--add-dir" not in readonly
            verifier = codex_command("learn", conf, S / "last.response", verify=True)
            assert 'model_reasoning_effort="ultra"' in verifier and "read-only" in verifier
            for browserless in (*(codex_command(mode, conf, S / "last.response") for mode in MODES), verifier):
                # Codex 브라우저 백엔드는 쓰지 않는다(2026-10-25 사용자 결정). 플러그인 키는 인라인 표여야 실제로 꺼진다.
                assert all(arg in browserless for arg in CODEX_NO_BROWSER) and not any("BROWSER_USE" in a for a in browserless)
                assert 'plugins={"unified-computer-use@openai-bundled"={enabled=false}}' in browserless
                assert not any(a.startswith('plugins."') for a in browserless)
            shown = io.StringIO()
            with contextlib.redirect_stdout(shown):
                cmd_engine(argparse.Namespace(mode="all", engine="codex", primary="codex"))
            assert all(v == {"engine": "codex", "primary": "codex"} for v in engine_settings(cfg()).values())
            assert json_response(shown.getvalue())["harvest"]["effective"] == ["codex"]
            (S / "config.json").unlink()
            before = repo_snapshot()
            (REPO / "tech" / "A.md").write_text("---\nstatus: done\n---\n\n# Changed\n", encoding="utf-8")
            after = repo_snapshot()
            assert scope_problems(before, after, set(), ["tech/A.md"], "learn") == []
            assert scope_problems(before, after, {"tech/A.md"}, ["tech/A.md"], "learn") == ["tech/A.md"]
            assert scope_problems(before, after, set(), ["tech/A.md"], "harvest") == ["tech/A.md"]
            assert scope_problems(before, after, set(), [], "learn") == ["tech/A.md"]
            git("restore", "tech/A.md")
            (REPO / ".gitignore").write_text("local-config.json\n", encoding="utf-8")
            before = repo_snapshot()
            (REPO / "local-config.json").write_text("{}", encoding="utf-8")
            assert "local-config.json" in scope_problems(before, repo_snapshot(), set(), [], "learn")
            (REPO / ".gitignore").unlink()
            (REPO / "local-config.json").unlink()
            publications, reviews, writes = [], [], [0]

            def fake_call(mode, _conf, prompt, verify=False, run=None):
                run = re.search(r"run R=([^;]+);", prompt).group(1)
                cmd_plan(argparse.Namespace(run=run, file=["tech/A.md"]))
                writes[0] += 1
                (REPO / "tech" / "A.md").write_text(f"---\nstatus: done\n---\n\n# Learned {writes[0]}\n", encoding="utf-8")
                write_json(run_dir(run) / "result.json", {"scope": "tech", "subject": "learn", "items": []})
                path = S / "logs" / "agent" / "fake.log"
                path.write_text("success", encoding="utf-8")
                return 0, path, json.dumps({"mode": mode, "run": run})

            def fake_verify(run, _conf, files):
                reviews.append((run, list(files)))
                return True, {"result": {"ok": True, "findings": []}}

            def fake_publish(a):
                manifest = load_manifest(a.run)
                assert manifest["engine"] == "codex" and a.outer
                assert manifest["publish_hashes"] == {"tech/A.md": file_hash("tech/A.md")}
                publications.append(a.run)
                emit({"status": "nothing"})
                return 0

            call_codex, verify_codex, cmd_publish = fake_call, fake_verify, fake_publish
            with contextlib.redirect_stdout(io.StringIO()):
                report = execute_codex("learn", conf)
            assert report["status"] == "completed" and len(publications) == len(reviews) == 1
            git("restore", "tech/A.md")
            verify_codex = lambda *_: (False, {"result": {"ok": False, "findings": []}})
            with contextlib.redirect_stdout(io.StringIO()):
                report = execute_codex("learn", conf)
            assert report["status"] == "verification_failed" and len(publications) == 1
            git("restore", "tech/A.md")
            verify_codex = fake_verify
            good_call = call_codex

            def bad_call(*args, **kwargs):
                result = good_call(*args, **kwargs)
                (REPO / "AGENTS.md").write_text("modified", encoding="utf-8")
                return result

            call_codex = bad_call
            with contextlib.redirect_stdout(io.StringIO()):
                report = execute_codex("learn", conf)
            assert report["status"] == "scope_blocked" and "AGENTS.md" in report["files"]
            assert report["paused"] and (S / "paused").exists()  # 지침 파일은 다음 실행이 읽으므로 자동 실행을 멈춘다.
            assert len(publications) == 1 and (REPO / "AGENTS.md").read_text() == "modified"
            assert report["run"] not in leftover_runs("learn")
            git("restore", "AGENTS.md", "tech/A.md")
            (S / "paused").unlink()
            call_codex = good_call

            def user_edit_during_review(run, _conf, files):
                (REPO / "tech/A.md").write_text("---\nstatus: done\n---\n\n# Concurrent user edit\n", encoding="utf-8")
                return True, {"result": {"ok": True, "findings": []}}

            verify_codex = user_edit_during_review
            with contextlib.redirect_stdout(io.StringIO()):
                report = execute_codex("learn", conf)
                finish_runs(0, "learn")
            assert report["status"] == "scope_blocked" and load_manifest(report["run"])["status"] == "scope_blocked"
            assert report["run"] not in leftover_runs("learn") and len(publications) == 1
            assert "Concurrent user edit" in (REPO / "tech/A.md").read_text()
            git("restore", "tech/A.md")

            def user_commit_during_review(run, _conf, files):
                git("add", "tech/A.md")
                git("-c", "user.name=Test", "-c", "user.email=user@example.com", "commit", "-qm", "user commit")
                return True, {"result": {"ok": True, "findings": []}}

            verify_codex = user_commit_during_review
            with contextlib.redirect_stdout(io.StringIO()):
                report = execute_codex("learn", conf)
                finish_runs(0, "learn")
            assert report["status"] == "scope_blocked" and load_manifest(report["run"])["status"] == "scope_blocked"
            assert report["run"] not in leftover_runs("learn") and len(publications) == 1
            assert not read_jsonl(S / "digests" / "log.jsonl")
            for concurrent in (user_edit_during_review, user_commit_during_review):
                def failed_review(*args):
                    concurrent(*args)
                    return False, {"result": {"ok": False, "findings": []}}
                verify_codex = failed_review
                with contextlib.redirect_stdout(io.StringIO()):
                    report = execute_codex("learn", conf)
                    finish_runs(0, "learn")
                assert report["status"] == "scope_blocked" and load_manifest(report["run"])["status"] == "scope_blocked"
                assert report["run"] not in leftover_runs("learn") and len(publications) == 1
                git("restore", "tech/A.md")

            def two_plan_call(*args, **kwargs):
                result = good_call(*args, **kwargs)
                run = json_response(result[2])["run"]
                cmd_plan(argparse.Namespace(run=run, file=["tech/B.md"]))
                return result

            call_codex = two_plan_call
            for verdict in (True, False, "exception"):
                def edit_clean_planned(run, _conf, files):
                    (REPO / "tech/B.md").write_text("---\nstatus: done\n---\n\n# User B\n", encoding="utf-8")
                    if verdict == "exception":
                        raise ValueError("verifier error")
                    return verdict, {"result": {"ok": verdict, "findings": []}}
                verify_codex = edit_clean_planned
                with contextlib.redirect_stdout(io.StringIO()):
                    try:
                        report = execute_codex("learn", conf)
                    except ValueError:
                        assert verdict == "exception"
                    finish_runs(0, "learn")
                run = max(p.parent.name for p in (S / "runs").glob("*/manifest.json"))
                assert load_manifest(run)["status"] == "scope_blocked" and run not in leftover_runs("learn")
                assert not load_manifest(run).get("left") and len(publications) == 1
                assert "User B" in (REPO / "tech/B.md").read_text()
                git("restore", "tech/A.md", "tech/B.md")
            # CLI 종료 코드가 0이어도 Claude가 보고한 학습 실패에는 다음 AI 호출을 막는다.
            cli_calls = []
            final_value = {"mode": "learn", "publish": "blocked"}

            def fake_claude_cli(*args):
                assert "--no-chrome" in args[2] and "--chrome" not in args[2]
                cli_calls.append(1)
                path = S / "logs" / "agent" / "claude-result.log"
                write_json(path, {"type": "result", "is_error": False, "result": json.dumps(final_value)})
                return 0, path

            run_cli, agent_has_work = fake_claude_cli, lambda *_: True
            agent_rules = lambda *_: ([], [])  # 실제 CLI를 띄우지 않는 결과 분류 검사다.
            for final_value in ({"mode": "learn", "publish": "blocked"},
                                {"mode": "learn", "blocked": "repo"}, {},
                                {"mode": "learn", "status": "verification_failed", "publish": "nothing"}):
                assert execute_claude("learn", conf)["status"] == "failed"
            final_value = {"mode": "learn", "publish": "blocked"}
            cli_calls.clear()
            with contextlib.redirect_stdout(io.StringIO()):
                for _ in range(2):
                    cmd_agent(argparse.Namespace(mode="learn", engine="claude", dry_run=False))
            assert cli_calls == [1] and read_json(S / "runs" / "last-learn.json")["retry_until"] > time.time()
            for publish in ("published", "nothing", "deferred", "unverified"):
                final_value = {"mode": "learn", "publish": publish}
                assert execute_claude("learn", conf)["status"] == "completed"
            # 게시 실패 결과가 git 인증 오류나 한도 문구를 인용해도 Claude를 쉬게 하거나 Codex로 넘기지 않는다.
            final_value = {"mode": "learn", "publish": "push_failed",
                           "note": "git push: Authentication failed (401), API rate limit 429 |1999999999"}
            report = execute_claude("learn", conf)
            assert (report["status"], report["reason"], report["reset"]) == ("failed", None, ""), report
            (S / "runs" / "last-learn.json").unlink()
            cli_calls.clear()
            real_codex = execute_codex
            execute_codex = lambda *_: cli_calls.append("codex") or {"engine": "codex", "status": "completed"}
            with contextlib.redirect_stdout(io.StringIO()):
                cmd_agent(argparse.Namespace(mode="learn", engine=None, dry_run=False))
            assert cli_calls == [1] and not engine_backoff("claude"), cli_calls
            execute_codex = real_codex
            # CLI 자체가 한도로 실패하면 그 오류 결과로 판단하고 확인한 복구 시각을 남긴다.
            reset_at = int(time.time()) + 600

            def limited_cli(*args):
                path = S / "logs" / "agent" / "claude-result.log"
                write_json(path, {"type": "result", "is_error": True, "result": f"Claude AI usage limit reached|{reset_at}"})
                return 1, path

            run_cli = limited_cli
            report = execute_claude("learn", conf)
            assert (report["reason"], report["reset"]) == ("limit", f"|{reset_at}"), report
            run_cli = fake_claude_cli
            # ego 스크립트는 권한 규칙 밖에서 돌므로 Claude 브라우저 실행도 runner가 전후 상태를 비교한다.
            (REPO / SOURCES).parent.mkdir(parents=True, exist_ok=True)
            (REPO / SOURCES).write_text("---\nstatus: done\n---\n\n# 출처\n", encoding="utf-8")
            git("add", SOURCES)
            git("-c", "user.name=Test", "-c", "user.email=user@example.com", "commit", "-qm", "sources")

            def commit(rel, text, own=True):  # own이면 VL publish처럼 own_commits에 덧붙인다.
                (REPO / rel).write_text(text, encoding="utf-8")
                git("add", rel)
                git("-c", "user.name=Test", "-c", "user.email=user@example.com", "commit", "-qm", rel)
                if own:
                    append(S / "own_commits", git("rev-parse", "HEAD").stdout.strip() + "\n")

            prior_agent = os.environ.get("VAULT_LEARN_AGENT")
            os.environ["VAULT_LEARN_AGENT"] = "guard-test"
            save_manifest({"run": "guard-run", "kind": "harvest", "started": now().isoformat(), "status": "open",
                           "agent": "guard-test", "files": [SOURCES]})
            hook = Path(git("rev-parse", "--absolute-git-dir").stdout.strip()) / "hooks" / "pre-commit"
            pyc = REPO / ".claude" / "skills" / "auto-learn" / "scripts" / "__pycache__" / "palantir_docs.cpython-314.pyc"
            (REPO / ".gitignore").write_text("__pycache__/\n", encoding="utf-8")  # 실제 저장소처럼 git 목록에는 없는 캐시
            empty_commit = lambda: git("-c", "user.name=Test", "-c", "user.email=user@example.com", "commit", "-q",
                                       "--allow-empty", "-m", "empty")

            scripts = REPO / ".claude" / "skills" / "auto-learn" / "scripts"
            runner = scripts / "vault_learn.py"  # launchd가 다음 주기에 실행하는 작업 트리의 runner

            def code_commit(rel, text, own=False):
                (REPO / rel).parent.mkdir(parents=True, exist_ok=True)
                commit(rel, text, own)

            def rebase_publish():  # VL publish가 원격 변경 위로 리베이스해 푸시한다. 원래 커밋과 리베이스한 커밋을 모두 적는다.
                start = git("rev-parse", "HEAD").stdout.strip()
                commit(SOURCES, "---\nstatus: done\n---\n\n# 리베이스 전\n")
                original_sha = git("rev-parse", "HEAD").stdout.strip()
                git("reset", "-q", "--hard", start)
                # 다른 기기에서 푸시한 코드 변경. git ls-remote와 같은 origin/main에서 닿으므로 원격 커밋으로 받는다.
                code_commit((scripts / "palantir_docs.py").relative_to(REPO).as_posix(), "remote\n")
                git("-c", "user.name=Test", "-c", "user.email=user@example.com", "cherry-pick", original_sha)
                append(S / "own_commits", git("rev-parse", "HEAD").stdout.strip() + "\n")
                git("push", "-q", "origin", "HEAD:main")

            forged = REPO / "tech" / "__pycache__" / "note.md"  # 지식 문서 모양이어도 Git이 무시하는 경로
            for mode, effect, status, paused, note in (
                    ("harvest", lambda: None, "completed", False, ""),
                    ("harvest", lambda: commit(SOURCES, "---\nstatus: done\n---\n\n# 채널\n"), "completed", False, ""),
                    # 허용 밖 지식 문서 편집과 그것만 바꾼 남의 커밋은 범위 문제로만 남긴다(Obsidian, 대화형 편집).
                    ("instagram", lambda: (REPO / "tech/A.md").write_text("edit\n", encoding="utf-8"),
                     "scope_blocked", False, "tech/A.md"),
                    ("instagram", lambda: commit("tech/A.md", "user\n", own=False), "scope_blocked", False,
                     "commit not published by VL"),
                    ("instagram", lambda: (git("rm", "-q", "tech/B.md"), git("-c", "user.name=Test", "-c",
                                           "user.email=user@example.com", "commit", "-qm", "rm")),
                     "scope_blocked", False, "commit not published by VL"),
                    # 지식 문서가 아닌 경로(지침, 코드, 설정, 무시된 경로, 심볼릭 링크)는 커밋으로 바꿔도 멈춘다.
                    ("instagram", lambda: commit("AGENTS.md", "user\n", own=False), "scope_blocked", True, "AGENTS.md"),
                    ("instagram", lambda: code_commit(runner.relative_to(REPO).as_posix(), "user\n"), "scope_blocked",
                     True, "vault_learn.py"),
                    ("harvest", lambda: (REPO / ".mcp.json").write_text("{}", encoding="utf-8"), "scope_blocked", True,
                     ".mcp.json"),
                    ("instagram", lambda: (forged.parent.mkdir(exist_ok=True), forged.write_text("x", encoding="utf-8")),
                     "scope_blocked", True, "tech/__pycache__/note.md"),
                    ("instagram", lambda: (REPO / "tech/link.md").symlink_to("../AGENTS.md"), "scope_blocked", True,
                     "tech/link.md"),
                    # 작업 트리를 바꾸지 않은 남의 커밋은 VL이 푸시하지 않으므로 기록만 한다.
                    ("instagram", empty_commit, "scope_blocked", False, "commit not published by VL"),
                    ("instagram", lambda: append(S / "own_commits", "f" * 40 + "\n"), "scope_blocked", True, "own_commits"),
                    ("harvest", lambda: commit("AGENTS.md", "rogue\n"), "scope_blocked", True, "not a VL commit"),
                    # 원격 추적 ref는 로컬 파일이다. 위조한 ref로 남의 커밋을 원격 커밋처럼 보이게 하면 멈춘다.
                    ("instagram", lambda: (commit("AGENTS.md", "forged\n", own=False),
                                           git("update-ref", "refs/remotes/zz/x", "HEAD")),
                     "scope_blocked", True, "remote ref changed: refs/remotes/zz/x"),
                    ("instagram", lambda: (code_commit(runner.relative_to(REPO).as_posix(), "forged\n"),
                                           git("update-ref", ORIGIN_MAIN, "HEAD")),
                     "scope_blocked", True, "does not match git ls-remote"),
                    # 대화형 VL publish(지식 문서만 바꾼 own 커밋)와 리베이스 게시는 받는다.
                    ("harvest", lambda: commit("tech/B.md", "concurrent publish\n"), "completed", False, ""),
                    ("harvest", rebase_publish, "completed", False, ""),
                    ("instagram", lambda: (pyc.parent.mkdir(parents=True, exist_ok=True), pyc.write_bytes(b"x")),
                     "scope_blocked", True, "__pycache__"),
                    ("instagram", lambda: (S / "own_commits").chmod(0), "scope_blocked", True, "guard check failed"),
                    # 깨진 manifest는 건너뛰고 이 실행이 연 run만 막는다.
                    ("harvest", lambda: (write_json(S / "runs" / "broken" / "manifest.json", [1]), empty_commit()),
                     "scope_blocked", False, "commit not published by VL"),
                    ("harvest", lambda: write_json(S / "config.json", {"claude": "x"}), "scope_blocked", True, "config.json"),
                    ("harvest", lambda: hook.write_text("#!/bin/sh\n", encoding="utf-8"), "scope_blocked", True, "hooks")):
                def browser_cli(*args):
                    assert (S / PENDING).exists()  # 엔진이 도는 동안 검사 표시가 있다.
                    effect()
                    path = S / "logs" / "agent" / "claude-browser.log"
                    write_json(path, {"type": "result", "is_error": False,
                                      "result": json.dumps({"mode": mode, "login_needed": ["youtube"]})})
                    return 0, path

                run_cli = browser_cli
                with contextlib.redirect_stdout(io.StringIO()):
                    report = execute_claude(mode, conf)
                assert (report["status"], (S / "paused").exists()) == (status, paused), report
                assert note in " ".join(report.get("files", [])) and report["login_needed"] == ["youtube"], report
                assert report.get("reason") is None and report.get("paused", False) == paused, report
                assert not (S / PENDING).exists(), report
                for path in (S / "paused", S / "config.json", hook, pyc, S / "runs" / "broken" / "manifest.json",
                             REPO / ".mcp.json", forged, REPO / "tech/link.md"):
                    path.unlink(missing_ok=True)
                with contextlib.suppress(FileNotFoundError):
                    (S / "own_commits").chmod(0o644)
                git("update-ref", "-d", "refs/remotes/zz/x", check=False)
                git("fetch", "-q", "origin")  # 위조한 origin/main을 원격 값으로 되돌린다.
                git("restore", "tech/A.md")
            assert load_manifest("guard-run")["status"] == "scope_blocked"  # 이 실행이 연 harvest run은 이어받지 않는다.
            (run_dir("guard-run") / "manifest.json").unlink()
            # 브라우저 실패 신호와 함께 범위 문제가 나면 다른 엔진으로 넘길 이유(reason)를 지운다.
            def chrome_cli(*args):
                (REPO / "tech/A.md").write_text("edit\n", encoding="utf-8")
                path = S / "logs" / "agent" / "claude-browser.log"
                write_json(path, {"type": "result", "is_error": False, "result": "CHROME_UNAVAILABLE"})
                return 0, path

            run_cli = chrome_cli
            with contextlib.redirect_stdout(io.StringIO()):
                report = execute_claude("harvest", conf)
            assert (report["status"], report["reason"], report.get("paused")) == ("scope_blocked", None, None), report
            git("restore", "tech/A.md")
            # 검사 전에 끝나도(SIGTERM으로 끝난 엔진, 사라진 로그) 로그를 읽기 전에 검사하고 멈춘다.
            def killed_cli(*args):
                write_json(S / "config.json", {"claude": "x"})
                raise SystemExit(143)

            run_cli = killed_cli
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    execute_claude("instagram", conf)
            except SystemExit:
                pass
            assert (S / "paused").exists() and not (S / PENDING).exists()
            for path in (S / "paused", S / "config.json"):
                path.unlink()
            run_cli = lambda *args: (hook.write_text("#!/bin/sh\n", encoding="utf-8"), (1, S / "logs" / "agent" / "gone.log"))[1]
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    execute_claude("instagram", conf)
            except FileNotFoundError:
                pass
            else:
                raise AssertionError("사라진 로그를 읽었다")
            assert (S / "paused").exists() and not (S / PENDING).exists()
            for path in (S / "paused", hook):
                path.unlink()
            # 이전 harvest가 남긴 목록 편집을 이 실행의 begin이 이어받으면 시작 때 미커밋이었어도 받는다.
            (REPO / SOURCES).write_text("---\nstatus: done\n---\n\n# 남은 편집\n", encoding="utf-8")
            save_manifest({"run": "prev-harvest", "kind": "harvest", "started": now().isoformat(), "status": "deferred",
                           "files": [], "left": {SOURCES: file_hash(SOURCES)}, "ended": now().isoformat()})

            def adopt_cli(*args):
                with contextlib.redirect_stdout(io.StringIO()):
                    assert cmd_begin(argparse.Namespace(kind="harvest")) == 0
                (REPO / SOURCES).write_text("---\nstatus: done\n---\n\n# 남은 편집\n\n# 새 채널\n", encoding="utf-8")
                path = S / "logs" / "agent" / "claude-browser.log"
                write_json(path, {"type": "result", "is_error": False, "result": json.dumps({"mode": "harvest"})})
                return 0, path

            run_cli = adopt_cli
            with contextlib.redirect_stdout(io.StringIO()):
                report = execute_claude("harvest", conf)
            assert report["status"] == "completed" and not (S / "paused").exists(), report
            for path, m in list(manifests()):
                if m.get("kind") == "harvest":
                    path.unlink()
            git("restore", SOURCES)
            # 읽을 수 없게 된 보호 파일도 해시 대신 따로 기록해 바뀐 것으로 본다.
            hook.write_text("#!/bin/sh\n", encoding="utf-8")
            hook.chmod(0)
            try:
                assert protected_state(hook.parent.parent)[str(hook)].startswith("unreadable:")
            finally:
                hook.chmod(0o644)
                hook.unlink()
            if prior_agent is None:
                os.environ.pop("VAULT_LEARN_AGENT", None)
            else:
                os.environ["VAULT_LEARN_AGENT"] = prior_agent
            # Codex의 ego-browser 명령은 사용자 규칙으로 샌드박스 밖에서 돌고 그 규칙은 모든 Codex 실행에 적용된다. 또
            # launchd가 작업 트리의 runner를 다음 주기에 실행하므로 보호 상태, own_commits와 지식 문서가 아닌 경로가 바뀌면
            # 모든 모드에서 멈추고, 허용 밖 지식 문서 편집은 범위 문제로 남긴다.
            own_before = (S / "own_commits").read_text(encoding="utf-8")
            runner_rel, local_settings = runner.relative_to(REPO).as_posix(), REPO / ".claude" / "settings.local.json"
            for mode, effect, status, paused, note in (
                    ("instagram", lambda: None, "completed", False, ""),
                    ("instagram", lambda: hook.write_text("#!/bin/sh\n", encoding="utf-8"), "scope_blocked", True, "hooks"),
                    ("harvest", lambda: write_json(S / "config.json", {"claude": "x"}), "scope_blocked", True, "config.json"),
                    ("harvest", lambda: append(S / "own_commits", "f" * 40 + "\n"), "scope_blocked", True, "own_commits"),
                    ("harvest", lambda: (REPO / "tech/A.md").write_text("edit\n", encoding="utf-8"), "scope_blocked", False,
                     "tech/A.md"),
                    ("harvest", lambda: local_settings.write_text("{}", encoding="utf-8"), "completed", False, ""),
                    ("learn", lambda: hook.write_text("#!/bin/sh\n", encoding="utf-8"), "scope_blocked", True, "hooks"),
                    ("digest", lambda: write_json(S / "config.json", {"claude": "x"}), "scope_blocked", True, "config.json"),
                    ("learn", lambda: (REPO / "AGENTS.md").write_text("edit\n", encoding="utf-8"), "scope_blocked", True,
                     "AGENTS.md"),
                    ("learn", lambda: runner.write_text("trojan\n", encoding="utf-8"), "scope_blocked", True, runner_rel),
                    ("learn", lambda: (pyc.parent.mkdir(parents=True, exist_ok=True), pyc.write_bytes(b"x")), "scope_blocked",
                     True, "__pycache__"),
                    ("digest", lambda: runner.write_text("trojan\n", encoding="utf-8"), "scope_blocked", True, runner_rel),
                    ("learn", lambda: (REPO / "tech/B.md").write_text("unplanned\n", encoding="utf-8"), "scope_blocked",
                     False, "tech/B.md")):
                def guarded_call(m, _conf, prompt, verify=False, run=None):
                    assert (S / PENDING).exists()  # 엔진이 도는 동안 검사 표시가 있다.
                    effect()
                    path = S / "logs" / "agent" / "codex-guard.log"
                    path.write_text("ok", encoding="utf-8")
                    return 0, path, json.dumps({"mode": m, "run": run, "login_needed": ["gmail"]})

                call_codex = guarded_call
                with contextlib.redirect_stdout(io.StringIO()):
                    report = execute_codex(mode, conf)
                    finish_runs(0, mode)
                assert (report["status"], (S / "paused").exists(), report.get("paused", False)) == (status, paused, paused), report
                assert note in " ".join(report.get("files", [])) and report["login_needed"] == ["gmail"], report
                assert not (S / PENDING).exists(), report
                for path in (S / "paused", S / "config.json", hook, local_settings, pyc):
                    path.unlink(missing_ok=True)
                write_text(S / "own_commits", own_before)
                git("restore", "tech/A.md", "tech/B.md", "AGENTS.md", runner_rel)
            # Codex 응답의 mode, run 불일치는 일반 실패다. 로그에 남은 인증, 한도 문구로 Codex를 쉬게 하지 않는다.
            def mismatched_call(m, _conf, prompt, verify=False, run=None):
                path = S / "logs" / "agent" / "codex-guard.log"
                path.write_text("warning: MCP authentication failed (401), usage limit\n", encoding="utf-8")
                return 0, path, json.dumps({"mode": "other"})

            call_codex = mismatched_call
            with contextlib.redirect_stdout(io.StringIO()):
                report = execute_codex("instagram", conf)
            assert (report["status"], report["reason"]) == ("failed", None), report
            # 검증 실행에도 사용자의 ego-browser 규칙이 적용되므로 검증 중 코드가 바뀌면 멈추고 게시하지 않는다.
            call_codex = good_call

            def trojan_review(run, _conf, files):
                runner.write_text("trojan\n", encoding="utf-8")
                return True, {"result": {"ok": True, "findings": []}}

            verify_codex = trojan_review
            with contextlib.redirect_stdout(io.StringIO()):
                report = execute_codex("learn", conf)
                finish_runs(0, "learn")
            assert (report["status"], report.get("paused"), (S / "paused").exists()) == ("scope_blocked", True, True), report
            assert runner_rel in report["files"] and len(publications) == 1 and not (S / PENDING).exists(), report
            (S / "paused").unlink()
            git("restore", "tech/A.md", runner_rel)
            verify_codex = fake_verify
            (S / "runs" / "last-learn.json").unlink()
            agent_rules, run_cli = original[-2:]
            # 모든 모드의 범위 검사가 다른 자동 실행의 정상 게시와 겹치지 않도록 같은 잠금을 유지한다.
            locked_modes = []
            def locked_execution(engine):
                def execute(mode, _conf):
                    with locked("agent-write", wait=False) as acquired:
                        assert not acquired, mode
                    locked_modes.append((mode, engine))
                    return {"engine": engine, "status": "completed"}
                return execute

            execute_claude, execute_codex = locked_execution("claude"), locked_execution("codex")
            for mode in MODES:
                with contextlib.redirect_stdout(io.StringIO()):
                    cmd_agent(argparse.Namespace(mode=mode, engine="codex", dry_run=False))
            assert locked_modes == [(m, "codex") for m in MODES]
            # alternate 한 slot은 최대 두 번이며, 일반 실패와 범위 실패에는 교대하지 않는다.
            calls = []
            execute_claude = lambda *_: calls.append("claude") or {"engine": "claude", "status": "failed", "reason": "limit"}
            execute_codex = lambda *_: calls.append("codex") or {"engine": "codex", "status": "completed"}
            agent_has_work = lambda *_: True
            for mode in MODES:  # 기본 설정에서는 모든 작업이 Claude 먼저, 한도에 걸리면 Codex다.
                calls.clear()
                with contextlib.redirect_stdout(io.StringIO()):
                    cmd_agent(argparse.Namespace(mode=mode, engine=None, dry_run=False))
                assert calls == ["claude", "codex"] and engine_backoff("claude").get("until", 0) > time.time(), mode
                assert not engine_backoff("codex")
                clear_backoff("claude")
            calls.clear()
            execute_codex = lambda *_: calls.append("codex") or {"engine": "codex", "status": "failed", "reason": "auth"}
            with contextlib.redirect_stdout(io.StringIO()):
                cmd_agent(argparse.Namespace(mode="learn", engine=None, dry_run=False))
            assert calls == ["claude", "codex"] and not engine_candidates("learn", conf)
            with contextlib.redirect_stdout(io.StringIO()):
                cmd_agent(argparse.Namespace(mode="learn", engine=None, dry_run=False))
            assert calls == ["claude", "codex"]
            for engine in ENGINES:
                clear_backoff(engine)
            calls.clear()
            execute_claude = lambda *_: calls.append("claude") or {"engine": "claude", "status": "failed", "reason": None}
            with contextlib.redirect_stdout(io.StringIO()):
                cmd_agent(argparse.Namespace(mode="learn", engine=None, dry_run=False))
            assert calls == ["claude"]
            # 실패 뒤 다음 1분 주기에는 AI를 호출하지 않고, 반복 실패해도 대기는 4분으로 유지한다.
            for minutes in (4, 4, 4, 4, 4, 4):
                last = read_json(S / "runs" / "last-learn.json")
                assert minutes * 60 - 5 < last["retry_until"] - time.time() <= minutes * 60
                called = list(calls)
                with contextlib.redirect_stdout(io.StringIO()):
                    cmd_agent(argparse.Namespace(mode="learn", engine=None, dry_run=False))
                assert calls == called
                last["retry_until"] = 0
                write_json(S / "runs" / "last-learn.json", last)
                with contextlib.redirect_stdout(io.StringIO()):
                    cmd_agent(argparse.Namespace(mode="learn", engine=None, dry_run=False))
                assert calls == called + ["claude"]
            last = read_json(S / "runs" / "last-learn.json")
            last["retry_until"] = 0
            write_json(S / "runs" / "last-learn.json", last)
            execute_claude = lambda *_: {"engine": "claude", "status": "completed"}
            with contextlib.redirect_stdout(io.StringIO()):
                cmd_agent(argparse.Namespace(mode="learn", engine=None, dry_run=False))
            assert "retry_until" not in read_json(S / "runs" / "last-learn.json")
            calls.clear()  # 잠금을 기다리는 동안 생긴 멈춤이면 엔진을 띄우지 않는다.
            execute_claude = lambda *_: calls.append("claude") or {"engine": "claude", "status": "completed"}
            agent_has_work = lambda *_: (S / "paused").touch() or True
            with contextlib.redirect_stdout(io.StringIO()):
                cmd_agent(argparse.Namespace(mode="learn", engine=None, dry_run=False))
            assert calls == [] and (S / "paused").exists()
            (S / "paused").unlink()
            agent_has_work = lambda *_: True
            # 검사 전에 끝난 실행(SIGKILL, 전원)의 표시가 잠금을 잡은 뒤에도 있으면 엔진을 띄우지 않고 멈춘다.
            mark_guard("harvest", "claude")
            with contextlib.redirect_stdout(io.StringIO()):
                cmd_agent(argparse.Namespace(mode="learn", engine=None, dry_run=False))
            assert calls == [] and (S / "paused").exists() and not (S / PENDING).exists()
            assert "guard did not finish" in read_json(S / "runs" / "last-harvest.json")["attempts"][0]["files"][0]
            (S / "paused").unlink()
            execute_claude = lambda *_: calls.append("claude") or {"engine": "claude", "status": "failed", "reason": "policy"}
            with contextlib.redirect_stdout(io.StringIO()):
                cmd_agent(argparse.Namespace(mode="learn", engine=None, dry_run=False))
            assert calls == ["claude"]
            # 실행 파일이 없을 때만 엔진을 쓸 수 없다고 보고 넘긴다. 사라진 로그 같은 파일 오류는 일반 실패다.
            for binary, expected in ((sys.executable, ["claude"]), ("/nonexistent/claude-cli", ["claude", "codex"])):
                calls.clear()
                write_json(S / "config.json", {"claude": binary})

                def vanished(*_):
                    calls.append("claude")
                    raise FileNotFoundError(2, "No such file or directory", str(S / "logs" / "agent" / "gone.log"))

                execute_claude = vanished
                execute_codex = lambda *_: calls.append("codex") or {"engine": "codex", "status": "completed"}
                with contextlib.redirect_stdout(io.StringIO()):
                    cmd_agent(argparse.Namespace(mode="harvest", engine=None, dry_run=False))
                assert calls == expected, (binary, calls)
                (S / "config.json").unlink()
                clear_backoff("claude")
            # 범위 실패, 멈춤, 브라우저 실패와 사용자 인계는 Codex로 넘기지 않는다. 로그아웃과 Claude가 본 연결 실패는
            # 그 수집 작업을 두 엔진 모두 쉬게 한다.
            for mode, result, touch, blocked in (
                    ("harvest", {"status": "scope_blocked", "reason": "chrome"}, False, ()),
                    ("harvest", {"status": "failed", "reason": "limit"}, True, ()),
                    ("harvest", {"status": "failed", "reason": "chrome"}, False, ("harvest",)),
                    ("instagram", {"status": "failed", "reason": "logged_out"}, False, ("instagram",)),
                    ("instagram", {"status": "failed", "reason": "takeover"}, False, ())):
                calls.clear()
                execute_claude = lambda *_: (calls.append("claude"), touch and (S / "paused").touch(),
                                             {"engine": "claude"} | result)[2]
                with contextlib.redirect_stdout(io.StringIO()):
                    cmd_agent(argparse.Namespace(mode=mode, engine=None, dry_run=False))
                assert calls == ["claude"], (mode, result)
                assert [m for m in BROWSER if not engine_candidates(m, conf)] == list(blocked), (mode, result)
                (S / "paused").unlink(missing_ok=True)
                for engine in ENGINES:
                    clear_backoff(engine, mode)
            calls.clear()  # Codex의 연결 실패는 Codex 샌드박스나 규칙 문제일 수 있어 Claude의 수집은 막지 않는다.
            execute_codex = lambda *_: calls.append("codex") or {"engine": "codex", "status": "failed", "reason": "chrome"}
            with contextlib.redirect_stdout(io.StringIO()):
                cmd_agent(argparse.Namespace(mode="harvest", engine="codex", dry_run=False))
            assert calls == ["codex"] and engine_candidates("harvest", conf) == ["claude"]
            clear_backoff("codex", "harvest")
            (S / "runs" / "last-learn.json").unlink()  # 아래 독립 실행 검사는 백오프 없이 시작한다.
            codex_actions("learn", {"actions": {"enqueue": [{"url": "https://youtu.be/aaaaaaaaaaa", "source": "repost:x"}]}})
            assert rows(S / "queue" / "new.tsv")[0][:2] == ["aaaaaaaaaaa", "repost:x"]
            assert read_lines(S / "seen_videos") == ["aaaaaaaaaaa"]
            try:
                codex_actions("learn", {"actions": {"enqueue": [{"url": "nope", "source": "x"}]}})
            except ValueError:
                pass
            else:
                raise AssertionError("잘못된 enqueue를 받았다")
            assert len(rows(S / "queue" / "new.tsv")) == 1
            save_manifest({"run": "mine", "kind": "learn", "started": now().isoformat(), "status": "open",
                           "agent": "", "files": ["tech/A.md"]})
            finish_runs(0, "learn", "other-agent")  # launchd 실행은 대화형 세션이 연 run을 닫지 않는다.
            assert "ended" not in load_manifest("mine")
            (run_dir("mine") / "manifest.json").unlink()
            (REPO / "tech/A.md").write_text("---\nstatus: done\n---\n\n# Owned\n", encoding="utf-8")
            owned_hash = file_hash("tech/A.md")
            save_manifest({"run": "toc", "kind": "learn", "started": now().isoformat(), "status": "open",
                           "engine": "codex", "files": ["tech/A.md"], "writer_hashes": {"tech/A.md": owned_hash}})
            real_hash = globals()["file_hash"]
            hash_calls = [0]

            def edit_after_hash(rel):
                digest = real_hash(rel)
                if rel == "tech/A.md":
                    hash_calls[0] += 1
                    if hash_calls[0] == 1:
                        (REPO / rel).write_text("---\nstatus: done\n---\n\n# User after hash\n", encoding="utf-8")
                return digest

            try:
                globals()["file_hash"] = edit_after_hash
                finish_runs(0, "learn")
                assert load_manifest("toc")["left"] == {"tech/A.md": owned_hash}
                assert "toc" not in leftover_runs("learn")
            finally:
                globals()["file_hash"] = real_hash
            assert "User after hash" in (REPO / "tech/A.md").read_text()
            prior_engine = os.environ.get("VAULT_LEARN_ENGINE")
            try:
                for child in ENGINES:
                    os.environ["VAULT_LEARN_ENGINE"] = child
                    try:
                        cmd_engine(argparse.Namespace(mode="all", engine="codex", primary=None))
                    except SystemExit:
                        pass
                    else:
                        raise AssertionError("child agent가 엔진 설정을 바꿨다")
                    with contextlib.redirect_stdout(io.StringIO()):
                        assert cmd_engine(argparse.Namespace(mode=None, engine=None, primary=None)) == 0
                        assert cmd_agent(argparse.Namespace(mode="learn", engine=None, dry_run=False)) == 1
            finally:
                if prior_engine is None:
                    os.environ.pop("VAULT_LEARN_ENGINE", None)
                else:
                    os.environ["VAULT_LEARN_ENGINE"] = prior_engine
    finally:
        S, REPO, call_codex, verify_codex, cmd_publish, execute_claude, execute_codex, agent_has_work, notify, ego_guide, agent_rules, run_cli = original


def cmd_selftest(a):
    global S, ego_guide
    assert sys.dont_write_bytecode  # 정상 실행은 실행 검사가 보는 __pycache__를 고치지 않는다.
    for engine in ENGINES:
        for mode in MODES:
            excerpt = workflow_sections(mode, engine)
            headings = re.findall(r"(?m)^## (.+)$", excerpt)
            assert {"구성", "공통 원칙", "운영", f"{mode} 모드"} <= set(headings)
            assert ("Codex 실행 차이" in headings) == (engine == "codex")
            assert not any(f"{other} 모드" in headings for other in MODES if other != mode)
            # 두 엔진 모두 짧은 import 형식만 쓴다(Codex 규칙과 Claude 허용 규칙에 함께 맞는다).
            assert "await import('file://" in excerpt and "ego-browser nodejs <" not in excerpt
            assert "학습 영역은 개발, CS" in excerpt
            if mode == "instagram":
                assert "source: saved" in excerpt and "DM 목록과 대화에는 접근하지 않는다" in excerpt
                assert "--complete dm" not in excerpt and "https://www.instagram.com/direct/inbox/" not in excerpt
            if mode in BROWSER:
                assert "ego-browser skill" in excerpt and "mcp__claude-in-chrome" not in excerpt and "javascript_tool" not in excerpt
                assert "`vault-learn-<모드>` 하나만" in excerpt and "- 실행 검사:" in excerpt
                assert "S/guard-pending.json" in excerpt and "S/backoff/browser-<모드>.json" in excerpt
                assert "USER_TAKEOVER" in excerpt and "EGO_TASK_SPACE_NAME_IN_USE" in excerpt
                assert "Promise를 기다린다" not in excerpt and "S/tmp/ego-browser-skill.md" in excerpt
            if mode == "harvest":
                assert "__vlSubsLoad" in excerpt and "page.waitForFunction" in excerpt
    assert classify(1, "ERROR: [youtube] x: Join this channel to get access to members-only content") == "skip"
    assert classify(1, "오류: VAD가 말소리를 찾지 못했다. 음악이나 무음 위주의 오디오일 수 있다.") == "skip"
    assert classify(1, "ERROR: Sign in to confirm you’re not a bot") == "systemic"
    assert classify(1, "오류: 진행 중이거나 예정된 라이브 방송이다.") == "live"
    assert classify(3, "") == "tools" and classify(1, "HTTP Error 503") == "transient"
    assert video_id("https://youtu.be/UqXdVgehxTA?t=3") == "UqXdVgehxTA"
    assert video_id("https://www.youtube.com/watch?feature=x&v=UqXdVgehxTA") == "UqXdVgehxTA"
    assert video_id("https://www.youtube.com/shorts/UqXdVgehxTA") == "UqXdVgehxTA" and video_id("nope") is None
    assert WIKILINK.findall("[[A|b]] [[C#h]] [[D]] [[#x]]") == ["A", "C", "D", ""]
    assert field(0) == "0" and field(None) == "" and field("a\tb\nc") == "a b c"
    today = dt.date(2026, 10, 10)
    log_rows = [{"key": "a", "result": "learned", "ts": "2026-10-01"},
                {"key": "b", "result": "deferred", "ts": "2026-10-08"},
                {"key": "c", "result": "deferred", "ts": "2026-10-01"},
                {"key": "d", "result": "deferred", "ts": "2026-09-01"}, {"key": "d", "result": "deferred", "ts": "2026-09-20"}]
    assert settle_deferred(log_rows, today) == {"a", "b", "d"}
    assert PHONE.search("문의 010-1234-5678") and not PHONE.search("2026-10-05")
    assert not SAFE_EMAIL.search("someone@corp.co.kr") and SAFE_EMAIL.search("git@github.com")
    assert SAFE_EMAIL.search("icon@2x.png") and SAFE_EMAIL.search("ec2-user@10.0.0.1")
    assert WIKILINK.findall("| [[A\\|b]] |")[0].rstrip("\\") == "A"  # 표 안의 이스케이프된 별칭
    assert SECRET.search("k=AKIA" + "Q" * 16) and not SECRET.search("AKIAIOSFODNN7EXAMPLE")
    assert line_problems("근거 https://www.threads.com/@a/post/1", set()) and not line_problems("docs(x): 요약", set())
    assert line_problems("채널 abcd 소개", {"abcd"}) and not line_problems(TRAILER, set())
    assert line_problems("https://www.instagram.com/p/AbC123/", set()) and line_problems("instagram.com/u/reel/x/", set())
    assert not line_problems("https://help.instagram.com/123", set())
    assert hkey(unicodedata.normalize("NFD", "@가나Ab")) == hkey("@가나aB")
    sample = ["## YouTube 채널", "| 채널 | 링크 | 도메인 |", "|---|---|---|",
              "| A \\| B | [@가나](https://www.youtube.com/@가나) | tech, biz |", "| 링크 없음 | @x | tech |",
              "## 이메일 뉴스레터", "| 뉴스레터 | 도메인 |", "|---|---|", "| 레터 | fit |", "| 태그 없음 | |"]
    assert parse_sources(sample) == ({"@가나": ("A | B", ["tech", "biz"])}, {"레터": ["fit"]})
    problems = sources_problems("\n".join(sample))  # 링크 없는 채널 행(5행)과 태그 없는 뉴스레터 행(10행)
    assert len(problems) == 2 and ":5:" in problems[0] and ":10:" in problems[1]
    real = S
    with tempfile.TemporaryDirectory() as tmp:
        S = Path(tmp)
        ensure_layout()
        assert enqueue([["aaaaaaaaaaa", "t", "", ""], ["bbbbbbbbbbb", "t", "", ""]], "backlog") == ["aaaaaaaaaaa", "bbbbbbbbbbb"]
        assert enqueue([["ccccccccccc", "t", "", ""], ["aaaaaaaaaaa", "t", "", ""]], "new") == ["ccccccccccc"]
        (S / "transcripts" / "bbbbbbbbbbb").mkdir(parents=True)
        (S / "transcripts" / "bbbbbbbbbbb" / "transcript.md").write_text("# t\n", encoding="utf-8")
        append(S / "failures.tsv", f"ccccccccccc\t{time.time():.0f}\ttransient\tx\n")
        worker = Transcriber(DEFAULTS)
        assert worker.claim() == ("backlog", "aaaaaaaaaaa")  # c는 쉬는 중, b는 끝났다.
        assert worker.claim() is None
        write_json(S / "config.json", {"instagram_dm_name": "테스트친구",
                                       "email_senders": [{"from": "jane.doe@corp.example", "name": "x", "private": True}]})
        assert {"테스트친구", "jane.doe"} <= personal_terms()
        # VL이 ego-browser 안내를 저장했으면 두 엔진에 그 파일을, 저장하지 못했으면 직접 실행을 알린다.
        real_guide = ego_guide
        try:
            for guide in (S / "tmp" / "ego-browser-skill.md", None):
                ego_guide = lambda guide=guide: guide
                prompt = codex_prompt("instagram", DEFAULTS)
                claude_prompt = agent_prompt("harvest", DEFAULTS)  # TaskSpace 이름은 고정, 파일 접두사는 실행마다 다르다.
                runner = prompt.split("Runner instructions", 1)[1]
                assert (f"guide the runner saved at {guide}" in runner) == bool(guide)
                assert ("Run `ego-browser skill` first" in runner) == (not guide)
                assert (f"ego-browser 안내 {guide}를" in claude_prompt) == bool(guide)
                assert ("`ego-browser skill`을 실행해" in claude_prompt) == (not guide)
        finally:
            ego_guide = real_guide
        assert "Never open or read Instagram DM" in prompt and "instagram:['saved']" in prompt
        assert "Read only user-sent DM items" not in prompt
        assert "cua_repl" not in prompt and "control-chrome" not in prompt
        assert "TaskSpace named vault-learn-instagram (" in prompt and f"{S}/tmp/vault-learn-instagram-" in prompt
        assert "ego-browser nodejs -e \"await import('file:///" in runner and "ego-browser nodejs <" not in runner
        assert "return USER_TAKEOVER" in runner and "Never run ego-browser or use any browser" not in runner
        assert "TaskSpace 이름은 vault-learn-harvest," in claude_prompt and f"{S}/tmp/vault-learn-harvest-" in claude_prompt
        assert "threads_extract.js" in claude_prompt and "CHROME_UNAVAILABLE(ego lite" in claude_prompt
        assert "USER_TAKEOVER만" in claude_prompt and "USER_TAKEOVER" not in agent_prompt("digest", DEFAULTS).split("\n\n")[0]
        write_json(run_dir("t-learn") / "manifest.json", {"run": "t-learn", "kind": "learn", "files": [], "baseline_dirty": []})
        for quiet in (codex_prompt("learn", DEFAULTS, "t-learn"), codex_prompt("digest", DEFAULTS, digest={"changes": []})):
            # 사용자의 ego-browser 허용 규칙은 모든 Codex 실행에 적용되므로 learn과 digest에서는 쓰지 말라고 한다.
            assert "Never run ego-browser or use any browser" in quiet.split("Runner instructions", 1)[1]
        allow, deny = agent_rules("harvest")
        assert {"Bash(ego-browser skill)", "Bash(ego-browser nodejs *)"} <= set(allow)
        assert not any("chrome" in rule for rule in allow)
        assert {"mcp__claude-in-chrome", "mcp__plugin_playwright_playwright", "Bash(ego-browser upgrade *)"} <= set(deny)
        assert not any("ego-browser" in rule for rule in agent_rules("learn")[0])
        assert "POLICY_BLOCKED; do not retry or switch engines/surfaces" in prompt
        assert not agent_has_work("instagram", DEFAULTS | {"instagram_dm_name": "테스트친구"})
        box = S / "inbox"
        (box / "email" / "m1.md").write_text("---\nid: m1\npublication: 레터\nsender: a@b.example\nsubject: 제목\n"
                                             "date: 2026-10-05T07:00:00+09:00\nharvested_at: 2026-10-05\n---\n\n"
                                             "## Text\n\n본문\n", encoding="utf-8")
        (box / "instagram" / "x1.md").write_text("---\nid: x1\n---\n", encoding="utf-8")
        (box / "instagram" / "EXCLUDED.tsv").write_text("x1\t2026-10-05\t1\tpersonal\n", encoding="utf-8")
        (box / "instagram" / "p1.md").write_text("---\nid: p1\nauthor: \"@a\"\nharvested_at: 2026-10-04\n---\n\n"
                                                 "## Sender note\n\n테스트친구에게 a@corp.co.kr\n", encoding="utf-8")
        assert [(x["key"], x["title"], x["who"]) for x in inbox_leads(set())][:1] == [("email:m1", "제목", "레터")]
        assert "insta:x1" not in {x["key"] for x in inbox_leads(set())}  # 제외한 단서
        write_json(box / "instagram" / "STATE.json", {"dm": "2026-10-04"})
        for action in (
            lambda: cmd_inbox_reindex(argparse.Namespace(source="instagram", dry_run=False, complete=["dm"])),
            lambda: codex_actions("instagram", {"actions": {"complete": {"instagram": ["dm"]}}}),
        ):
            try:
                action()
            except ValueError:
                pass
            else:
                raise AssertionError("Instagram DM completion accepted")
        assert not (box / "instagram" / "INDEX.tsv").exists()
        assert read_json(box / "instagram" / "STATE.json") == {"dm": "2026-10-04"}
        with open(os.devnull, "w") as null, contextlib.redirect_stdout(null):
            codex_actions("instagram", {"actions": {"complete": {"instagram": ["saved"]}}})
            cmd_inbox_reindex(argparse.Namespace(source="email", dry_run=False, complete=[]))
        note = (box / "instagram" / "p1.md").read_text(encoding="utf-8")
        assert "테스트친구" not in note and "[연락처]" in note and "@a" in note
        assert "a@b.example" in (box / "email" / "m1.md").read_text(encoding="utf-8")  # frontmatter는 그대로 둔다.
        assert set(read_lines(seen_file("instagram"))) == {"p1", "x1"} and read_lines(seen_file("email")) == ["m1"]
        assert read_json(box / "instagram" / "STATE.json") == {"dm": "2026-10-04", "saved": str(dt.date.today())}
        # harvest run은 학습 출처 목록 밖의 파일을 plan하지 못하고, 목록에 있는 채널은 로컬에서만 제외하지 못한다.
        write_json(run_dir("t-harvest") / "manifest.json", {"run": "t-harvest", "kind": "harvest", "files": [],
                                                              "baseline_dirty": []})
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            assert cmd_plan(argparse.Namespace(run="t-harvest", file=["tech/x.md"])) == 3
        assert json.loads(out.getvalue())["rejected"][0]["file"] == "tech/x.md"
        handle = next(iter(learning_sources()[0]))
        (S / "channels.tsv").write_text("\t".join(CHANNEL_COLS) + f"\n{handle}\tUC{'x' * 22}\tt\tlearn\tx\t2026-10-05\n",
                                        encoding="utf-8")
        with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
            cmd_channels_set(argparse.Namespace(handle=handle, decision="exclude", reason="x"))
            raise AssertionError("목록에 있는 채널을 제외했다")
    S = real
    selftest_engines()
    print("selftest ok")
    return 0


def main():
    ap = argparse.ArgumentParser(description="auto-learn 파이프라인 도구. 절차는 SKILL.md를 따른다.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    def add(name, fn, help_text):
        p = sub.add_parser(name, help=help_text)
        p.set_defaults(fn=fn)
        return p

    add("transcribe", cmd_transcribe, "전사 작업자(launchd KeepAlive)").add_argument("--dry-run", action="store_true")
    p = add("discover", cmd_discover, "학습 출처 목록의 채널 RSS에서 새 업로드를 큐에 넣는다")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--limit", type=int, default=0, help="확인할 채널 수 상한(시험용)")
    add("documents-discover", cmd_documents_discover, "공식 문서만 발견하고 제한된 본문을 수집한다").add_argument(
        "--dry-run", action="store_true")
    p = add("enqueue", cmd_enqueue, "영상 URL이나 id를 전사 큐에 넣는다")
    p.add_argument("ids", nargs="+")
    p.add_argument("--priority", choices=("new", "backlog"), default="new")
    p.add_argument("--source", default="manual")
    p = add("migrate", cmd_migrate, "임시 전사 작업을 멈추고 결과와 남은 id를 옮긴다(install이 실행)")
    p.add_argument("--src", help="임시 작업 폴더. 기본값은 config.json의 adhoc_dir")
    p.add_argument("--wait-mins", type=int, default=20, help="진행 중 전사를 기다릴 시간. 넘기면 멈추고 다시 큐에 넣는다")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--force", action="store_true", help="이미 이관했어도 다시 한다")
    add("begin", cmd_begin, "learn 또는 harvest run을 연다").add_argument("--kind", choices=("learn", "harvest"),
                                                                    default="learn")
    add("pick", cmd_pick, "learn 후보를 우선순위대로 보여 준다").add_argument("--k", type=int, default=0)
    p = add("plan", cmd_plan, "편집할 파일을 run에 등록한다")
    p.add_argument("--run", required=True)
    p.add_argument("--file", nargs="+", required=True)
    p = add("check", cmd_check, "규칙 검사(가운뎃점, 위키링크, 단서 링크, 개인 정보, 연락처, 학습 출처 목록 형식)")
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--run")
    group.add_argument("--files", nargs="+")
    p = add("discard", cmd_discard, "run이 바꾼 파일을 되돌린다")
    p.add_argument("--run", required=True)
    p.add_argument("--file", nargs="+", required=True)
    p = add("publish", cmd_publish, "검사, 커밋, 원격 동기화, 푸시, 증명, 다이제스트 기록")
    p.add_argument("--run", required=True)
    p.add_argument("--dry-run", action="store_true")
    add("digest-data", cmd_digest_data, "다이제스트 자료(지난 다이제스트 이후 커밋한 변경)").add_argument("--date")
    p = add("inbox-reindex", cmd_inbox_reindex, "단서 정리와 INDEX.tsv, 본 id 목록 재생성")
    p.add_argument("source", choices=tuple(INBOX))
    p.add_argument("--complete", action="append", default=[], choices=("mail", "saved"),
                   help="처음부터 모으기를 끝낸 부분(email은 mail, instagram은 saved)")
    p.add_argument("--dry-run", action="store_true")
    add("email-query", cmd_email_query, "harvest의 Gmail 검색어와 발신자")
    add("lead-id", cmd_lead_id, "외부 링크의 수집함 id").add_argument("url")
    p = add("channels-merge", cmd_channels_merge, "ego lite에서 읽은 구독 목록을 channels.tsv에 합친다")
    p.add_argument("--rows", required=True, help="handle<TAB>title 행 파일")
    p.add_argument("--complete", action="store_true", help="목록 전체를 읽었을 때만 준다(구독 해지 반영)")
    p.add_argument("--dry-run", action="store_true", help="상태를 쓰지 않고 분류할 pending 미리 보기")
    p = add("channels-set", cmd_channels_set, "채널 분류를 기록한다")
    p.add_argument("--handle", required=True)
    p.add_argument("--decision", choices=("learn", "exclude"), required=True)
    p.add_argument("--reason", required=True)
    p = add("agent", cmd_agent, "선택한 Claude/Codex로 harvest, instagram, learn, digest 모드를 실행한다(launchd)")
    p.add_argument("mode", choices=MODES)
    p.add_argument("--engine", choices=(*ENGINES, "alternate"), help="이 실행만 엔진 선택을 바꾼다")
    p.add_argument("--dry-run", action="store_true")
    p = add("engine", cmd_engine, "모드별 Claude/Codex/alternate와 우선 엔진을 보고 바꾼다(기본: 모든 모드 Claude 먼저, 막히면 Codex)")
    p.add_argument("mode", nargs="?", choices=(*MODES, "all"))
    p.add_argument("engine", nargs="?", choices=(*ENGINES, "alternate"))
    p.add_argument("--primary", choices=ENGINES)
    add("status", cmd_status, "큐, 처리 기록, 백오프, 미푸시 커밋")
    add("doctor", cmd_doctor, "도구, 모델, 스크립트 사본, 설정 점검")
    add("plists", cmd_plists, "S/launchd에 plist를 만든다")
    add("selftest", cmd_selftest, "순수 함수와 큐 순서 자체 검사")
    args = ap.parse_args()
    if args.cmd != "selftest" and os.environ.get("VAULT_LEARN_ENGINE") != "codex":
        ensure_layout()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
