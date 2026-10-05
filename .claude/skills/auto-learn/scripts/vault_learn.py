#!/usr/bin/env python3
"""auto-learn 파이프라인의 결정적 작업을 맡는다.

전사 큐와 작업자, 구독 채널 RSS 수집, 임시 전사 작업 이관, learn run의 기준선과 규칙 검사, Git 게시와 증명,
다이제스트 자료와 회상 퀴즈 일정, launchd가 부르는 claude -p 실행(잠금, 시간 제한, 사용량 한도 백오프)을 한다.
상태는 장비 로컬 디렉터리(기본 ~/.local/state/vault-auto-learn, VAULT_LEARN_STATE로 변경)에 두고 저장소에는
지식 문서만 커밋한다. 절차와 운영은 같은 스킬의 SKILL.md를 따르며 표준 라이브러리만 쓴다.
"""

import argparse
import contextlib
import datetime as dt
import fcntl
import hashlib
import html
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
MODES = ("harvest", "learn", "digest")
DEFAULTS = {"k": 6, "jobs": 2, "whisper_threads": 4, "learn_timeout_min": 180, "harvest_timeout_min": 90,
            "digest_timeout_min": 30, "idle_interval_min": 180, "stale_days": 180, "claude": "claude",
            "threads_reposts_url": "", "adhoc_dir": ""}
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
VIDEO = re.compile(r"(?:[?&]v=|youtu\.be/|/shorts/|/live/|/embed/)([\w-]{11})(?![\w-])")
EDITABLE = re.compile(r"^(?:tech|biz|econ|fit)/.+\.md$")
TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
ATOM = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
INDEX_COLS = ["order", "id", "status", "reason", "author", "posted_at", "chain", "captured", "images", "videos",
              "links", "title", "file"]
TITLE_SKIP = ("[[QUOTE]]", "## ", "Source:", "Media:", "- [")
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
    for name in ("queue", "transcripts", "inbox/threads", "digests", "runs", "logs/agent", "locks", "tmp",
                 "launchd", "migrate"):
        (S / name).mkdir(parents=True, exist_ok=True)


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
        output, kind = "", "transient"
        for attempt in range(1, ATTEMPTS + 1):
            p = subprocess.run([sys.executable, str(TRANSCRIBE), f"https://www.youtube.com/watch?v={vid}",
                                "--out", str(S / "transcripts"), "--threads", str(self.conf["whisper_threads"])],
                               capture_output=True, text=True, errors="replace")
            if p.returncode == 0:
                tidy(S / "transcripts" / vid)
                log(f"done {prio} {vid}")
                return
            output = (p.stdout + p.stderr).strip()
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
        gone = set(read_lines(S / "unsubscribed"))
        learn = [r for r in rows(S / "channels.tsv")[1:] if len(r) >= 6 and r[3] == "learn" and r[0] not in gone]
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
    deadline = time.time() + wait_s
    while (left := [j for j in jobs if pid_alive(j[0])]) and time.time() < deadline:
        log(f"migrate: 진행 중 전사 {len(left)}개를 기다린다 ({', '.join(v for _, v in left)})")
        time.sleep(15)
    left = [j for j in jobs if pid_alive(j[0])]
    groups = set()
    for pid, _ in left:
        with contextlib.suppress(ProcessLookupError):
            groups.add(os.getpgid(pid))
    for pgid in groups - {os.getpgrp()}:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(pgid, signal.SIGTERM)
    if groups:
        time.sleep(10)
        for pgid in groups - {os.getpgrp()}:
            with contextlib.suppress(ProcessLookupError):
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


def orphan_runs(exclude=None):
    """시간 제한을 넘겼는데 plan으로 등록한 파일이 미커밋으로 남은 run. 남은 변경이 없으면 닫는다."""
    limit = (cfg()["learn_timeout_min"] + 30) * 60
    dirty, out = set(dirty_paths()), []
    for path in sorted((S / "runs").glob("*/manifest.json")):
        m = read_json(path, {}) or {}
        if m.get("run") == exclude or m.get("status") == "closed" or "started" not in m:
            continue
        if time.time() - dt.datetime.fromisoformat(m["started"]).timestamp() < limit:
            continue
        files = [f for f in m.get("files", []) if f in dirty]
        if files:
            out.append({"run": m["run"], "kind": m.get("kind"), "files": files})
        else:
            m["status"] = "closed"
            save_manifest(m)
    return out


def cmd_begin(a):
    blockers = repo_blockers()
    if blockers:
        emit({"blocked": blockers})
        return 1
    run = f"{stamp()}-{a.kind}"
    m = {"run": run, "kind": a.kind, "started": now().isoformat(timespec="seconds"), "status": "open",
         "head": git("rev-parse", "HEAD").stdout.strip(), "baseline_dirty": dirty_paths(), "files": []}
    save_manifest(m)
    orphans = orphan_runs(exclude=run)
    mine = {f for o in orphans for f in o["files"]}
    emit({"run": run, "foreign_dirty": [f for f in m["baseline_dirty"] if f not in mine], "orphans": orphans,
          "unpushed": count_unpushed()})
    return 0


def cmd_plan(a):
    m = load_manifest(a.run)
    rejected = []
    for f in a.file:
        rel = norm_rel(f)
        if not rel or not EDITABLE.match(rel):
            rejected.append({"file": f, "why": "tech/, biz/, econ/, fit/ 아래 Markdown만 편집한다"})
        elif rel in m["baseline_dirty"]:
            rejected.append({"file": rel, "why": "run 시작 전부터 다른 작업의 미커밋 변경이 있다"})
        elif rel not in m["files"]:
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
    """personal 사유로 제외한 채널의 handle, id, 이름. 저장소 문서에 들어가면 안 된다."""
    terms = set()
    for r in rows(S / "channels.tsv")[1:]:
        if len(r) >= 5 and r[4].strip() == "personal":
            terms |= {t.strip().lower() for t in (r[0].lstrip("@"), r[1], r[2]) if len(t.strip()) >= 3}
    return terms


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
        for target in WIKILINK.findall(re.sub(r"```.*?```", "", text, flags=re.S)):
            name = target.strip().rstrip("\\").split("/")[-1].lower()  # 표 안의 [[파일\|별칭]]
            if name and name not in names:
                problems.append(f"{rel}: 깨진 위키링크 [[{target}]]")
        for n, line in added_lines(rel):
            low = line.lower()
            if re.search(r"threads\.(?:com|net)/", low):
                problems.append(f"{rel}:{n}: Threads 링크(단서는 출처로 쓰지 않는다)")
            if "vault-auto-learn" in low:
                problems.append(f"{rel}:{n}: 로컬 상태 경로")
            if any(term in low for term in personal):
                problems.append(f"{rel}:{n}: personal로 제외한 채널의 이름")
            if PHONE.search(line) or any(not SAFE_EMAIL.search(e) for e in EMAIL.findall(line)):
                problems.append(f"{rel}:{n}: 연락처 형식(전화번호, 이메일)")
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
    item_files = [norm_rel(f) for it in items for f in it.get("files", [])]
    files = list(dict.fromkeys(m["files"] + [f for f in item_files if f]))
    foreign = [f for f in files if f in m["baseline_dirty"]]
    pending = set(dirty_paths())
    changed = [f for f in files if f not in foreign and f in pending and EDITABLE.match(f)]
    report = {"run": a.run, "skipped_foreign": foreign, "committed": changed}
    problems = check_files(changed)
    if problems:
        emit(report | {"status": "check_failed", "problems": problems})
        return 1
    message = commit_message(result) if changed else None
    if a.dry_run:
        emit(report | {"status": "dry_run", "message": message})
        return 0
    with locked("git"):
        sha = None
        if changed:
            git("add", "--all", "--", *changed)
            git("commit", "--only", "-m", message, "--", *changed)
            sha = git("rev-parse", "HEAD").stdout.strip()
            append(S / "own_commits", sha + "\n")
        sync = sync_and_push()
        if sha and sync.get("rebased"):
            sha = git("rev-parse", "HEAD").stdout.strip()
    committed = set(changed) if sha else set()
    logged = set(m.get("logged_keys", []))  # 한 run에서 묶음마다 게시하므로 이미 기록한 항목은 건너뛴다.
    out = []
    for it in items:
        if it.get("key") in logged:
            continue
        files_it = {norm_rel(f) for f in it.get("files", [])} - {None}
        res, note = it.get("result", "skipped"), it.get("note", "")
        if res in ("learned", "merged") and not committed & files_it:
            res, note = (("deferred", "다른 작업의 미커밋 변경과 겹쳐 커밋하지 못했다") if files_it & set(foreign)
                         else ("skipped", note or "바뀐 파일이 없다"))
        out.append({"ts": now().isoformat(timespec="seconds"), "run": a.run, "key": it.get("key"), "result": res,
                    "files": sorted(files_it), "topic": it.get("topic", ""), "takeaway": it.get("takeaway", ""),
                    "recall": it.get("recall", []) if res in ("learned", "merged") else [], "note": note,
                    "commit": sha if committed & files_it else None, "subject": result.get("subject")})
        logged.add(it.get("key"))
    append(S / "digests" / "log.jsonl", "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in out))
    m["logged_keys"] = sorted(k for k in logged if k)
    m["commits"] = m.get("commits", []) + ([sha] if sha else [])
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


def pick_data(k):
    done, ready = processed_keys(), done_ids()
    excluded = {r[0] for r in rows(S / "inbox" / "threads" / "EXCLUDED.tsv")}
    reposts = []
    for path in (S / "inbox" / "threads").glob("*.md"):
        key = f"repost:{path.stem}"
        if key in done or path.stem in excluded:
            continue
        meta, body = frontmatter(path)
        reposts.append({"key": key, "title": repost_title(body), "who": meta.get("author", ""),
                        "date": meta.get("posted_at", "")[:10], "path": str(path), "chain": meta.get("chain", ""),
                        "links": body.count("\n- http"), "harvested": meta.get("harvested_at", ""),
                        "order": as_int(meta.get("repost_order"))})
    reposts.sort(key=lambda x: (x["harvested"], -x["order"]), reverse=True)  # 최근 수집, 최근 리포스트 순

    def videos(prio):
        """전사가 끝났고 처리하지 않은 영상의 (전체 수, 앞쪽 2k개의 메타데이터)."""
        ids = [r[0] for r in rows(S / "queue" / f"{prio}.tsv") if r[0] in ready and f"video:{r[0]}" not in done]
        out = []
        for vid in ids[: 2 * k]:
            path = S / "transcripts" / vid / "transcript.md"
            meta = transcript_meta(path)
            out.append({"key": f"video:{vid}", "title": meta.get("title", ""), "who": meta.get("채널", ""),
                        "date": meta.get("업로드", ""), "duration": meta.get("길이", ""), "path": str(path)})
        return len(ids), out

    (new_count, new), (backlog_count, backlog) = videos("new"), videos("backlog")
    data = {"k": k, "tier1": new + reposts[: 3 * k], "tier2": backlog,
            "counts": {"new_videos": new_count, "reposts": len(reposts), "backlog_videos": backlog_count,
                       "awaiting_transcription": waiting_counts()}}
    if not data["tier1"] and not data["tier2"]:
        data["tier3"] = idle_candidates(k, done)
    return data


def cmd_pick(a):
    emit(pick_data(a.k or cfg()["k"]))
    return 0


# ---------------------------------------------------------------- 다이제스트와 퀴즈

def next_due(result, round_no, today):
    """틀림 1일, 부분 3일 뒤 다시 묻는다. 맞으면 7일, 21일 뒤 한 번씩 더 묻고 끝낸다."""
    gap = {"wrong": 1, "partial": 3}.get(result) or {1: 7, 2: 21}.get(round_no)
    return str(today + dt.timedelta(days=gap)) if gap else None


def choose_questions(day, log_rows):
    quiz = read_jsonl(S / "quiz.jsonl")
    parents = {q.get("parent") for q in quiz}
    due = sorted((q for q in quiz if q.get("due") and q["due"] <= str(day) and q["qid"] not in parents),
                 key=lambda q: q["due"])
    picked = [{"item": q["item"], "doc": q.get("doc", ""), "q": q["q"], "a": q["a"], "round": q.get("round", 1) + 1,
               "parent": q["qid"], "why": "다시 묻기"} for q in due[:2]]
    spaced = []
    for gap in (7, 3, 1):
        same_day = [r for r in log_rows if r.get("ts", "")[:10] == str(day - dt.timedelta(days=gap))
                    and r.get("result") in ("learned", "merged") and r.get("recall")]
        same_day.sort(key=lambda r: hashlib.sha1(f"{r['key']}{day}".encode()).hexdigest())
        spaced += [(gap, r) for r in same_day]
    for gap, r in spaced:
        if len(picked) >= 2:
            break
        rec = r["recall"][{7: 2, 3: 1, 1: 0}[gap] % len(r["recall"])]
        picked.append({"item": r["key"], "doc": rec.get("doc", ""), "q": rec["q"], "a": rec["a"], "round": 1,
                       "why": f"{gap}일 전 학습"})
    for i, q in enumerate(picked, 1):
        q |= {"qid": f"{day:%Y%m%d}-{i}", "date": str(day)}
    append(S / "quiz.jsonl", "".join(json.dumps(q, ensure_ascii=False) + "\n" for q in picked))
    return picked


def state_summary():
    done, skipped, keys = done_ids(), skipped_ids(), processed_keys()
    backoff = read_json(S / "backoff.json", {}) or {}
    log_rows = read_jsonl(S / "digests" / "log.jsonl")
    return {"paused": (S / "paused").exists(), "transcribe_waiting": waiting_counts(), "transcripts": len(done),
            "videos_skipped": len(skipped), "videos_unlearned": sum(1 for v in done if f"video:{v}" not in keys),
            "reposts_unlearned": sum(1 for p in (S / "inbox" / "threads").glob("*.md") if f"repost:{p.stem}" not in keys),
            "processed": dict(Counter(r.get("result") for r in log_rows)),
            "channels": dict(Counter(r[3] for r in rows(S / "channels.tsv")[1:] if len(r) > 3)),
            "unpushed_commits": count_unpushed(),
            "deferred_runs": [p.parent.name for p in (S / "runs").glob("*/manifest.json")
                              if (read_json(p, {}) or {}).get("status") in ("deferred", "conflict", "push_failed")],
            "backoff_until": backoff.get("until_local") if backoff.get("until", 0) > time.time() else None}


def cmd_digest_data(a):
    day = dt.date.fromisoformat(a.date) if a.date else dt.date.today()
    selection = S / "digests" / f"{day}.json"
    if selection.exists():  # 같은 날 다시 불러도 같은 문항을 준다.
        print(selection.read_text(encoding="utf-8"))
        return 0
    log_rows = read_jsonl(S / "digests" / "log.jsonl")
    previous = sorted(p for p in (S / "digests").glob("????-??-??.json") if p.stem < str(day))
    since = ((read_json(previous[-1], {}) or {}).get("generated_at") if previous else None) \
        or (now() - dt.timedelta(days=1)).isoformat(timespec="seconds")
    changes = [{"key": r["key"], "result": r["result"], "files": r.get("files", []), "topic": r.get("topic", ""),
                "takeaway": r.get("takeaway", ""), "note": r.get("note", ""),
                "commit": resolve_commit(r.get("commit"), r.get("subject"))}
               for r in log_rows if r.get("ts", "") > since]
    data = {"date": str(day), "generated_at": now().isoformat(timespec="seconds"), "since": since,
            "changes": changes, "questions": choose_questions(day, log_rows), "state": state_summary()}
    write_json(selection, data)
    emit(data)
    return 0


def cmd_quiz_grade(a):
    quiz = read_jsonl(S / "quiz.jsonl")
    q = next((x for x in quiz if x.get("qid") == a.qid), None)
    if not q:
        raise SystemExit(f"문항이 없다: {a.qid}")
    today = dt.date.today()
    q |= {"result": a.result, "graded": str(today), "note": a.note,
          "due": next_due(a.result, q.get("round", 1), today)}
    write_text(S / "quiz.jsonl", "".join(json.dumps(x, ensure_ascii=False) + "\n" for x in quiz))
    emit(q)
    return 0


# ---------------------------------------------------------------- Threads와 구독 채널

def cmd_threads_reindex(a):
    """리포스트 파일을 정리(가운뎃점, 연락처)하고 INDEX.tsv와 seen_reposts를 다시 만든다."""
    root = S / "inbox" / "threads"
    status = {r["key"][7:]: r["result"] for r in read_jsonl(S / "digests" / "log.jsonl")
              if str(r.get("key", "")).startswith("repost:")}
    old_reason = {r[1]: r[3] for r in rows(root / "INDEX.tsv")[1:] if len(r) > 3}
    records, normalized, problems = [], [], []
    for path in sorted(root.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        clean = EMAIL.sub("[연락처]", PHONE.sub("[연락처]", text.replace("\u00b7", "/")))
        if clean != text:
            normalized.append(path.name)
            if not a.dry_run:
                write_text(path, clean)
        meta, body = frontmatter(path)
        if meta.get("id") != path.stem:
            problems.append(f"{path.name}: frontmatter id가 파일명과 다르다")
        links = body.split("## Outbound links\n", 1)
        records.append({"harvested": meta.get("harvested_at", ""), "o": as_int(meta.get("repost_order")),
                        "id": path.stem, "status": status.get(path.stem, "new"), "reason": old_reason.get(path.stem, ""),
                        "author": meta.get("author", ""), "posted_at": meta.get("posted_at", ""),
                        "chain": meta.get("chain", ""), "captured": meta.get("chain_captured", ""),
                        "images": meta.get("images", ""), "videos": meta.get("videos", ""),
                        "links": sum(1 for l in links[1].splitlines() if l.startswith("- http")) if len(links) > 1 else 0,
                        "title": repost_title(body), "file": path.name})
    for r in rows(root / "EXCLUDED.tsv"):
        records.append({"harvested": r[1] if len(r) > 1 else "", "id": r[0], "status": "excluded",
                        "o": as_int(r[2]) if len(r) > 2 else 0,
                        "reason": r[3] if len(r) > 3 else "personal"})
    records.sort(key=lambda r: (r["harvested"], -r["o"]), reverse=True)
    text = "\t".join(INDEX_COLS) + "\n" + "".join(
        "\t".join(field(i if c == "order" else r.get(c, "")) for c in INDEX_COLS) + "\n"
        for i, r in enumerate(records, 1))
    seen = set(read_lines(S / "seen_reposts"))
    new_seen = [r["id"] for r in records if r["id"] not in seen]
    changed = text != "\n".join(read_lines(root / "INDEX.tsv")) + "\n"
    if not a.dry_run:
        write_text(root / "INDEX.tsv", text)
        append(S / "seen_reposts", "".join(i + "\n" for i in new_seen))
    emit({"rows": len(records), "index_changed": changed, "normalized": normalized, "new_seen": len(new_seen),
          "problems": problems})
    return 1 if problems else 0


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
    table = rows(path)
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
        unsubscribed = sorted({r[0] for r in body} - set(incoming))
        write_text(S / "unsubscribed", "".join(h + "\n" for h in unsubscribed))
    write_text(path, "".join("\t".join(r) + "\n" for r in [header, *body]))
    resolved = {info["handle"]: info for info in infos}
    pending = [r for r in body if len(r) > 3 and r[3] == "pending"]
    with ThreadPoolExecutor(6) as ex:
        details = list(ex.map(lambda r: resolved.get(r[0]) or resolve_channel(r[0], r[2]), pending))
    emit({"incoming": len(incoming), "added": added, "unsubscribed": len(unsubscribed), "pending": details})
    return 0


def cmd_channels_set(a):
    path = S / "channels.tsv"
    table = rows(path)
    hits = [r for r in table[1:] if a.handle in (r[0], r[1])]
    if not hits:
        raise SystemExit(f"채널이 없다: {a.handle}")
    for r in hits:
        r[3], r[4] = a.decision, field(a.reason)
    write_text(path, "".join("\t".join(r) + "\n" for r in table))
    emit({"updated": [r[0] for r in hits], "decision": a.decision})
    return 0


# ---------------------------------------------------------------- claude -p 실행

def agent_rules(mode):
    repo, state, vl = REPO.as_posix(), S.as_posix(), SCRIPT.as_posix()
    allow = ["Read", "Grep", "Glob", "Agent", "ToolSearch", "WebSearch", "WebFetch",
             f"Edit(/{repo}/**)", f"Edit(/{state}/**)", f"Bash(python3 {vl} *)",
             f"Bash(python3 {SCRIPT.relative_to(REPO).as_posix()} *)",
             "mcp__development-context", "mcp__plugin_context7_context7"]
    if mode == "harvest":
        allow.append("mcp__claude-in-chrome")
    # Git 쓰기는 VL publish만 한다. 사용자 설정의 git add/commit/push 허용보다 거부 규칙이 우선한다.
    deny = [f"Bash(git {sub} *)" for sub in ("add", "commit", "push", "stash", "reset", "checkout", "restore",
                                              "clean", "rebase", "merge", "pull", "rm")]
    deny += ["Bash(rm *)", "mcp__plugin_playwright_playwright", f"Edit(/{repo}/.claude/**)",
             f"Edit(/{repo}/.agents/**)", f"Edit(/{repo}/ontology/**)", f"Edit(/{repo}/**/AGENTS.md)",
             f"Edit(/{repo}/**/CLAUDE.md)", f"Edit(/{repo}/README.md)", f"Edit(/{state}/launchd/**)"]
    return allow, deny


def agent_prompt(mode, conf):
    extra = {"learn": f" K={conf['k']}.",
             "harvest": " Chrome 도구를 쓸 수 없으면 CHROME_UNAVAILABLE 한 줄만 출력하고 끝낸다.",
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
    if mode == "harvest":
        if subprocess.run(["pgrep", "-x", "Google Chrome"], capture_output=True).returncode != 0:
            log("harvest: Chrome이 실행 중이 아니다")
            return False
        return True
    data = pick_data(conf["k"])
    if data["tier1"] or data["tier2"] or orphan_runs():
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
    questions = selection.get("questions") or []
    text = f"회상 퀴즈 {len(questions)}문항: {questions[0]['q']}" if questions else "오늘 다이제스트가 준비됐다."
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
               "--allowedTools", *allow, "--disallowedTools", *deny, *(["--chrome"] if mode == "harvest" else [])]
        prompt = agent_prompt(mode, conf)
        if a.dry_run:
            print(shlex.join(cmd))
            print(prompt)
            return 0
        rc, path = run_claude(mode, cmd, prompt, conf[f"{mode}_timeout_min"] * 60)
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
    if not any(len(r) > 3 and r[3] == "learn" for r in rows(S / "channels.tsv")[1:]):
        problems.append("channels.tsv에 learn 채널이 없다")
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
            "learn": (["agent", "learn"], {"StartInterval": 1800}),
            "digest": (["agent", "digest"], {"StartCalendarInterval": {"Hour": 7, "Minute": 30}})}
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
    assert next_due("wrong", 2, today) == "2026-10-11" and next_due("partial", 1, today) == "2026-10-13"
    assert next_due("correct", 1, today) == "2026-10-17" and next_due("correct", 3, today) is None
    log_rows = [{"key": "a", "result": "learned", "ts": "2026-10-01"},
                {"key": "b", "result": "deferred", "ts": "2026-10-08"},
                {"key": "c", "result": "deferred", "ts": "2026-10-01"},
                {"key": "d", "result": "deferred", "ts": "2026-09-01"}, {"key": "d", "result": "deferred", "ts": "2026-09-20"}]
    assert settle_deferred(log_rows, today) == {"a", "b", "d"}
    assert PHONE.search("문의 010-1234-5678") and not PHONE.search("2026-10-05")
    assert not SAFE_EMAIL.search("someone@corp.co.kr") and SAFE_EMAIL.search("git@github.com")
    assert SAFE_EMAIL.search("icon@2x.png") and SAFE_EMAIL.search("ec2-user@10.0.0.1")
    assert WIKILINK.findall("| [[A\\|b]] |")[0].rstrip("\\") == "A"  # 표 안의 이스케이프된 별칭
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
    p = add("discover", cmd_discover, "learn 채널 RSS에서 새 업로드를 큐에 넣는다")
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
    add("begin", cmd_begin, "learn 또는 quiz run을 연다").add_argument("--kind", choices=("learn", "quiz"), default="learn")
    add("pick", cmd_pick, "learn 후보를 우선순위대로 보여 준다").add_argument("--k", type=int, default=0)
    p = add("plan", cmd_plan, "편집할 파일을 run에 등록한다")
    p.add_argument("--run", required=True)
    p.add_argument("--file", nargs="+", required=True)
    p = add("check", cmd_check, "규칙 검사(가운뎃점, 위키링크, Threads 링크, 개인 채널, 연락처)")
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--run")
    group.add_argument("--files", nargs="+")
    p = add("discard", cmd_discard, "run이 바꾼 파일을 되돌린다")
    p.add_argument("--run", required=True)
    p.add_argument("--file", nargs="+", required=True)
    p = add("publish", cmd_publish, "검사, 커밋, 원격 동기화, 푸시, 증명, 다이제스트 기록")
    p.add_argument("--run", required=True)
    p.add_argument("--dry-run", action="store_true")
    add("digest-data", cmd_digest_data, "다이제스트 자료와 오늘의 회상 퀴즈").add_argument("--date")
    p = add("quiz-grade", cmd_quiz_grade, "퀴즈 채점 결과와 다음 복습일을 기록한다")
    p.add_argument("--qid", required=True)
    p.add_argument("--result", choices=("correct", "partial", "wrong"), required=True)
    p.add_argument("--note", default="")
    add("threads-reindex", cmd_threads_reindex, "리포스트 정리와 INDEX.tsv 재생성").add_argument("--dry-run", action="store_true")
    p = add("channels-merge", cmd_channels_merge, "Chrome에서 읽은 구독 목록을 channels.tsv에 합친다")
    p.add_argument("--rows", required=True, help="handle<TAB>title 행 파일")
    p.add_argument("--complete", action="store_true", help="목록 전체를 읽었을 때만 준다(구독 해지 반영)")
    p = add("channels-set", cmd_channels_set, "채널 분류를 기록한다")
    p.add_argument("--handle", required=True)
    p.add_argument("--decision", choices=("learn", "exclude"), required=True)
    p.add_argument("--reason", required=True)
    p = add("agent", cmd_agent, "claude -p로 harvest, learn, digest 모드를 실행한다(launchd)")
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
