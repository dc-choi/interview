#!/usr/bin/env python3
"""auto-learn 파이프라인의 결정적 작업을 맡는다.

전사 큐와 작업자, 학습 출처 목록의 채널 RSS 수집, 임시 전사 작업 이관, 단서 수집함 색인, learn과 harvest run의
기준선과 규칙 검사, Git 게시와 증명, 다이제스트 자료, launchd가 부르는 claude -p 실행(잠금, 시간 제한, 사용량 한도
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

SCRIPT = Path(__file__).resolve()
SKILL = SCRIPT.parent.parent
REPO = SKILL.parents[2]
TRANSCRIBE = SKILL.parent / "memo" / "scripts" / "yt_transcript.py"
S = Path(os.environ.get("VAULT_LEARN_STATE", "~/.local/state/vault-auto-learn")).expanduser()
LABEL = "com.dcchoi.vault-learn."
MODES = ("harvest", "instagram", "learn", "digest")
# 지정한 친구 DM의 이름(instagram_dm_name)과 뉴스레터 발신 주소는 config.json에만 둔다.
DEFAULTS = {"k": 6, "jobs": 2, "whisper_threads": 4, "learn_timeout_min": 180, "harvest_timeout_min": 90,
            "instagram_timeout_min": 45, "digest_timeout_min": 30, "idle_interval_min": 180, "stale_days": 180,
            "claude": "claude", "threads_reposts_url": "", "adhoc_dir": "", "instagram_saved_url": "",
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
LIMIT = re.compile(r"usage limit|limit reached|hit your limit|rate.?limit|overloaded|\b(?:429|529)\b", re.I)
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
EDITABLE = re.compile(r"^(?:tech|biz|econ|fit)/.+\.md$")
TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
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
CHROME_TOOLS = ("tabs_context_mcp", "tabs_create_mcp", "tabs_close_mcp", "navigate", "javascript_tool", "get_page_text",
                "find", "computer", "read_page", "list_connected_browsers", "select_browser")
GMAIL_READ = ("search_threads", "get_thread", "get_message")
GMAIL_WRITE = ("send_message reply forward create_draft update_draft delete_draft label_message label_thread "
               "unlabel_message unlabel_thread update_message_labels apply_sensitive_message_label "
               "apply_sensitive_thread_label create_label update_label delete_label trash_message trash_thread "
               "untrash_message untrash_thread mark_message_spam mark_thread_spam unmark_message_spam "
               "unmark_thread_spam").split()
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
                  "would_enqueue": [x for x in found if x[0] not in seen]})
            return 0
        if throttled:
            poll["_backoff_until"] = t + 3600
        added = enqueue(found, "new")
        write_json(S / "channel_poll.json", poll)
        log(f"discover: channels={len(due)}/{len(learn)} new={len(added)} throttled={throttled}")
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
    return None if rel.startswith("..") or rel.startswith("/") or rel == "." else rel


def own_commits():
    return set(read_lines(S / "own_commits"))


def prove():
    head = git("rev-parse", "HEAD").stdout.strip()
    upstream = git("rev-parse", "@{u}", check=False).stdout.strip()
    try:
        ls = git("ls-remote", "origin", "refs/heads/main", check=False, timeout=60)
        remote = ls.stdout.split()[0] if ls.returncode == 0 and ls.stdout.strip() else None
    except subprocess.TimeoutExpired:
        remote = None
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


def file_hash(rel):
    path = REPO / rel
    return hashlib.sha1(path.read_bytes()).hexdigest() if path.is_file() else "absent"


def leftover_runs(kind=None):
    """끝난 run(kind를 주면 그 종류만)이 게시하지 못하고 남긴 파일 중 그 뒤 내용이 그대로인 것({run: [파일]}).

    내용이 바뀐 파일은 사용자나 다른 작업이 고친 것일 수 있어 이어받지 않는다(게시하거나 되돌리면 남의 작업을 건드린다).
    """
    dirty, out = set(dirty_paths()), {}
    for path in sorted((S / "runs").glob("*/manifest.json")):
        m = read_json(path, {}) or {}
        if kind and m.get("kind") != kind:
            continue
        files = sorted(f for f, h in (m.get("left") or {}).items() if f in dirty and file_hash(f) == h)
        if files:
            out[m["run"]] = files
    return out


def finish_runs(since, kind):
    """launchd learn, harvest 실행이 끝나면 그동안 연 그 종류의 run마다 게시하지 못한 파일과 그 내용 해시를 남긴다."""
    dirty = set(dirty_paths())
    for path in (S / "runs").glob("*/manifest.json"):
        m = read_json(path, {}) or {}
        if m.get("kind") != kind or "ended" in m or dt.datetime.fromisoformat(m["started"]).timestamp() < since:
            continue
        m["files"] = [f for f in m["files"] if f in dirty]
        m |= {"left": {f: file_hash(f) for f in m["files"]}, "ended": now().isoformat(timespec="seconds")}
        save_manifest(m)


def cmd_begin(a):
    blockers = repo_blockers()
    if blockers:
        emit({"blocked": blockers})
        return 1
    run = f"{stamp()}-{a.kind}"
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
        if not rel or not EDITABLE.match(rel) or (m.get("kind") == "harvest" and rel != SOURCES):
            rejected.append({"file": f, "why": f"learn은 tech/, biz/, econ/, fit/ 아래 Markdown만, harvest는 {SOURCES}만 편집한다"})
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


def commit_message(result):
    scope, subject = result.get("scope", ""), (result.get("subject") or "").strip()
    if not re.fullmatch(r"[a-z0-9-]+", scope) or not subject:
        raise SystemExit("result.json에 scope(영문 소문자, 숫자, 하이픈)와 subject가 있어야 한다")
    text = f"docs({scope}): {subject}"
    if (result.get("body") or "").strip():
        text += "\n\n" + result["body"].strip()
    text += "\n\n" + TRAILER
    if "\u00b7" in text:
        raise SystemExit("커밋 메시지에 가운뎃점(U+00B7)이 있다")
    return text


def cmd_publish(a):
    m = load_manifest(a.run)
    result = read_json(run_dir(a.run) / "result.json", {}) or {}
    items = result.get("items", [])
    pending = set(dirty_paths())
    # plan으로 등록한 파일만 커밋한다. result.json에만 적힌 파일은 사용자나 다른 작업의 변경일 수 있다.
    changed = [f for f in m["files"] if f in pending and EDITABLE.match(f)]
    unplanned = sorted({f for it in items for f in map(norm_rel, it.get("files", []))
                        if f and f in pending and f not in m["files"]})
    report = {"run": a.run, "committed": changed, "skipped_unplanned": unplanned}
    message = commit_message(result) if changed else None
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
    """처리 끝난 key. deferred는 7일 뒤 다시 후보가 되고 두 번 미뤄지면 끝난 것으로 본다."""
    final, deferred = set(), {}
    for r in log_rows:
        if r.get("result") == "deferred":
            deferred.setdefault(r.get("key"), []).append(r.get("ts", "")[:10])
        else:
            final.add(r.get("key"))
    for key, dates in deferred.items():
        if len(dates) >= 2 or (today - dt.date.fromisoformat(max(dates))).days < 7:
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
    data = {"k": k, "tier1": new + leads[: 3 * k], "tier2": backlog,
            "counts": {"new_videos": new_count, "leads": dict(Counter(x["source"] for x in leads)),
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
    backoff = read_json(S / "backoff.json", {}) or {}
    log_rows = read_jsonl(S / "digests" / "log.jsonl")
    unpushed = count_unpushed()
    return {"paused": (S / "paused").exists(), "transcribe_waiting": waiting_counts(), "transcripts": len(done),
            "videos_skipped": len(skipped), "videos_unlearned": sum(1 for v in done if f"video:{v}" not in keys),
            "leads_unlearned": {src: sum(1 for p in (S / "inbox" / src).glob("*.md") if f"{prefix}:{p.stem}" not in keys)
                                for src, prefix in INBOX.items()},
            "processed": dict(Counter(r.get("result") for r in log_rows)),
            "channels": dict(Counter(r[3] for r in rows(S / "channels.tsv")[1:] if len(r) > 3))
            | {"listed": len(learning_sources()[0])},
            "unpushed_commits": unpushed,
            # 나중에 푸시되면 지난 보류는 더 알릴 필요가 없다.
            "deferred_runs": sorted(p.parent.name for p in (S / "runs").glob("*/manifest.json")
                                    if (read_json(p, {}) or {}).get("status") in ("deferred", "conflict", "push_failed",
                                                                                  "unverified"))[-5:] if unpushed else [],
            "leftover_files": sum(len(v) for v in leftover_runs().values()),
            "backoff_until": backoff.get("until_local") if backoff.get("until", 0) > time.time() else None}


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
    # 처음부터 모으기(뉴스레터 소급, Instagram 저장 글과 DM)를 끝낸 부분과 날짜. 다음 수집은 최신 항목만 본다.
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
    """DM에서 본 외부 링크의 수집함 id. 같은 링크(조각 제외)는 늘 같은 id다."""
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
    with locked("channels"):  # discover가 목록에만 있던 채널을 캐시에 더하는 쓰기와 겹치지 않게 한다.
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
            write_text(S / "unsubscribed", "".join(h + "\n" for h in unsubscribed))
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
    if mode in ("harvest", "instagram"):  # 서버 전체가 아니라 SKILL.md의 읽기 도구만 연다.
        allow += [f"mcp__claude-in-chrome__{t}" for t in CHROME_TOOLS]
    if mode == "harvest":  # 새 learn 채널을 학습 출처 목록에 더하고, Gmail 연결이 있으면 읽기 도구만 쓴다.
        allow += [f"Edit(/{repo}/{SOURCES})", *(f"mcp__claude_ai_Gmail__{t}" for t in GMAIL_READ)]
    # 사용자와 프로젝트 설정의 허용 규칙(git add/commit/push, codex exec, pandoc, pnpm build, python3 -m)도
    # 이 실행에 그대로 적용된다. 거부가 우선하므로 Git 쓰기와 그 밖의 실행 경로를 여기서 막는다. 메일 쓰기와
    # 브라우저의 파일 업로드, 폼 입력은 설정에 넓은 허용 규칙이 생겨도 열리지 않게 함께 막는다.
    deny = [f"Bash(git {sub} *)" for sub in ("add", "commit", "push", "stash", "reset", "checkout", "restore",
                                              "clean", "rebase", "merge", "pull", "rm")]
    deny += ["Bash(rm *)", "Bash(codex *)", "Bash(pandoc *)", "Bash(pnpm *)", "Bash(python3 -m *)",
             "mcp__plugin_playwright_playwright", f"Edit(/{repo}/**/AGENTS.md)", f"Edit(/{repo}/**/CLAUDE.md)",
             *(f"mcp__claude_ai_Gmail__{t}" for t in GMAIL_WRITE),
             *(f"mcp__claude-in-chrome__{t}" for t in ("file_upload", "upload_image", "form_input")),
             *(f"Read(~/{p})" for p in (".ssh/**", ".aws/**", ".gnupg/**", ".config/**", ".codex/**", ".netrc"))]
    return allow, deny


def agent_prompt(mode, conf):
    chrome = " Chrome 도구를 쓸 수 없으면 CHROME_UNAVAILABLE 한 줄만 출력하고 끝낸다."
    extra = {"learn": f" K={conf['k']}.", "harvest": chrome, "instagram": chrome,
             "digest": f" 날짜는 {dt.date.today()}이다."}
    return (f"auto-learn 스킬의 {mode} 모드를 launchd에서 무인으로 실행한다. 먼저 {SKILL / 'SKILL.md'}를 읽고 "
            f"공통 원칙과 {mode} 절차를 그대로 따른다. 상태 디렉터리는 {S}이고 VL은 `python3 {SCRIPT}`다. "
            "사용자에게 물을 수 없으므로 판단이 서지 않는 항목은 deferred로 남기고 넘어간다. "
            "마지막 줄에는 절차가 정한 결과 JSON 한 줄만 출력한다." + extra[mode])


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


def set_backoff(text):
    previous = read_json(S / "backoff.json", {}) or {}
    n = previous.get("n", 0) + 1
    reset = re.search(r"\|(\d{10})\b", text)
    reset_at = int(reset.group(1)) if reset else 0
    until = reset_at + 60 if reset_at > time.time() else time.time() + min(900 * 2 ** (n - 1), 8 * 3600)
    local = dt.datetime.fromtimestamp(until).astimezone().isoformat(timespec="minutes")
    match = LIMIT.search(text)
    write_json(S / "backoff.json", {"n": n, "until": until, "until_local": local,
                                    "reason": match.group(0) if match else "error"})
    return local


def agent_has_work(mode, conf):
    if mode == "digest":
        if (S / "digests" / f"{dt.date.today()}.md").exists():
            log("digest: 오늘 다이제스트가 이미 있다")
            return False
        return True
    if mode == "instagram" and not (conf["instagram_saved_url"] or conf["instagram_dm_name"]):
        log("instagram: config.json에 저장 글 주소와 DM 이름이 없다")
        return False
    if mode in ("harvest", "instagram"):
        if subprocess.run(["pgrep", "-x", "Google Chrome"], capture_output=True).returncode != 0:
            log(f"{mode}: Chrome이 실행 중이 아니다")
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


def run_claude(mode, cmd, prompt, timeout_s):
    path = S / "logs" / "agent" / f"{mode}-{stamp()}.log"
    with open(path, "w", encoding="utf-8") as out:
        proc = subprocess.Popen(cmd, cwd=REPO, stdin=subprocess.PIPE, stdout=out, stderr=subprocess.STDOUT,
                                text=True, start_new_session=True)

        def stop(signum, _frame):  # launchd가 작업을 내리면 claude 프로세스 그룹까지 정리한다.
            with contextlib.suppress(ProcessLookupError):
                os.killpg(proc.pid, signal.SIGTERM)
            with contextlib.suppress(subprocess.TimeoutExpired):
                proc.wait(timeout=10)  # 끝난 뒤의 파일 상태로 finish_runs가 남은 파일을 기록하게 한다.
            sys.exit(128 + signum)

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


def notify_digest():
    selection = read_json(S / "digests" / f"{dt.date.today()}.json", {}) or {}
    files = {f for c in selection.get("changes") or [] for f in c.get("files", [])}
    text = f"바뀐 문서 {len(files)}개와 핵심 3가지가 준비됐다." if files else "어제 바뀐 문서가 없다."
    script = (f"display notification {json.dumps(text[:200], ensure_ascii=False)} "
              f"with title {json.dumps('Vault 학습 다이제스트', ensure_ascii=False)}")
    subprocess.run(["osascript", "-e", script], capture_output=True)


def prune_agent_logs(keep=300):
    logs = sorted((S / "logs" / "agent").glob("*.log"), key=lambda p: p.stat().st_mtime, reverse=True)
    for path in logs[keep:]:
        path.unlink(missing_ok=True)


def cmd_agent(a):
    conf, mode = cfg(), a.mode
    if (S / "paused").exists() and not a.dry_run:
        log(f"{mode}: paused")
        return 0
    with locked(f"agent-{mode}", wait=False) as ok:
        if not ok:
            log(f"{mode}: 이전 실행이 아직 진행 중이다")
            return 0
        backoff = read_json(S / "backoff.json", {}) or {}
        if backoff.get("until", 0) > time.time() and not a.dry_run:
            log(f"{mode}: 사용량 한도 백오프 중({backoff.get('until_local')})")
            return 0
        if not a.dry_run and not agent_has_work(mode, conf):
            return 0
        allow, deny = agent_rules(mode)
        cmd = [conf["claude"], "-p", "--model", "opus", "--effort", "max", "--permission-mode", "dontAsk",
               "--add-dir", str(S), "--output-format", "json", "--no-session-persistence",
               "--allowedTools", *allow, "--disallowedTools", *deny,
               *(["--chrome"] if mode in ("harvest", "instagram") else [])]
        prompt = agent_prompt(mode, conf)
        if a.dry_run:
            print(shlex.join(cmd))
            print(prompt)
            return 0
        since = int(time.time())
        # harvest와 instagram은 같은 Chrome을 쓴다. 겹치면 탭 전환과 클릭이 섞이므로 앞 실행이 끝날 때까지 기다린다.
        chrome = locked("chrome") if mode in ("harvest", "instagram") else contextlib.nullcontext()
        try:
            with chrome:
                rc, path = run_claude(mode, cmd, prompt, conf[f"{mode}_timeout_min"] * 60)
        finally:
            if mode in ("learn", "harvest"):
                finish_runs(since, mode)
        text = path.read_text(encoding="utf-8", errors="replace")
        result = last_result(text)
        failed = rc != 0 or not result or result.get("is_error")
        final = ((result.get("result") or "").strip().splitlines() or [""])[-1][:300]
        if failed and LIMIT.search(text):
            log(f"{mode}: 사용량 한도로 {set_backoff(text)}까지 쉰다 ({path.name})")
        elif failed:
            log(f"{mode}: 실패 rc={rc} ({path.name}) {final}")
        else:
            (S / "backoff.json").unlink(missing_ok=True)
            log(f"{mode}: 완료 ({path.name}) {final}")
            if mode == "digest":
                notify_digest()
        prune_agent_logs()
    return 0


# ---------------------------------------------------------------- 운영

def cmd_status(a):
    summary = state_summary()
    summary["last_agent_runs"] = {}
    for mode in MODES:
        logs = sorted((S / "logs" / "agent").glob(f"{mode}-*.log"))
        summary["last_agent_runs"][mode] = logs[-1].name if logs else None
    emit(summary)
    return 0


def cmd_doctor(a):
    problems = []
    for tool in ("python3", "uvx", "ffmpeg", "ffprobe", "whisper-cli", "node", "git", "osascript", cfg()["claude"]):
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
            "learn": (["agent", "learn"], {"StartInterval": 1800}),
            # 07:30이 본 실행이다. 밤새 learn이 사용량 한도에 걸려 백오프 중이거나 실패하면 그날 뒤 시각에 다시 한다.
            # 오늘 다이제스트가 있으면 agent_has_work가 claude를 띄우지 않고 끝낸다.
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


def cmd_selftest(a):
    global S
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
        with open(os.devnull, "w") as null, contextlib.redirect_stdout(null):
            cmd_inbox_reindex(argparse.Namespace(source="instagram", dry_run=False, complete=["dm"]))
            cmd_inbox_reindex(argparse.Namespace(source="email", dry_run=False, complete=[]))
        note = (box / "instagram" / "p1.md").read_text(encoding="utf-8")
        assert "테스트친구" not in note and "[연락처]" in note and "@a" in note
        assert "a@b.example" in (box / "email" / "m1.md").read_text(encoding="utf-8")  # frontmatter는 그대로 둔다.
        assert set(read_lines(seen_file("instagram"))) == {"p1", "x1"} and read_lines(seen_file("email")) == ["m1"]
        assert (read_json(box / "instagram" / "STATE.json") or {}).get("dm") == str(dt.date.today())
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
    p.add_argument("--complete", action="append", default=[], choices=("mail", "saved", "dm"),
                   help="처음부터 모으기를 끝낸 부분(email은 mail, instagram은 saved와 dm)")
    p.add_argument("--dry-run", action="store_true")
    add("email-query", cmd_email_query, "harvest의 Gmail 검색어와 발신자")
    add("lead-id", cmd_lead_id, "DM에서 본 외부 링크의 수집함 id").add_argument("url")
    p = add("channels-merge", cmd_channels_merge, "Chrome에서 읽은 구독 목록을 channels.tsv에 합친다")
    p.add_argument("--rows", required=True, help="handle<TAB>title 행 파일")
    p.add_argument("--complete", action="store_true", help="목록 전체를 읽었을 때만 준다(구독 해지 반영)")
    p = add("channels-set", cmd_channels_set, "채널 분류를 기록한다")
    p.add_argument("--handle", required=True)
    p.add_argument("--decision", choices=("learn", "exclude"), required=True)
    p.add_argument("--reason", required=True)
    p = add("agent", cmd_agent, "claude -p로 harvest, instagram, learn, digest 모드를 실행한다(launchd)")
    p.add_argument("mode", choices=MODES)
    p.add_argument("--dry-run", action="store_true")
    add("status", cmd_status, "큐, 처리 기록, 백오프, 미푸시 커밋")
    add("doctor", cmd_doctor, "도구, 모델, 스크립트 사본, 설정 점검")
    add("plists", cmd_plists, "S/launchd에 plist를 만든다")
    add("selftest", cmd_selftest, "순수 함수와 큐 순서 자체 검사")
    args = ap.parse_args()
    if args.cmd != "selftest":
        ensure_layout()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
