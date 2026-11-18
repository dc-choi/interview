"""Instagram 릴스의 영상과 음성 트랙에서 화면 글자와 음성 전사를 뽑아 단서 파일에 붙이고, 옛 릴스의 소급 추출 대기
목록(S/inbox/instagram/BACKFILL.tsv)을 관리한다. 표준 라이브러리만 쓴다.

VL reel-extract가 부른다. instagram 모드가 S/tmp 아래 <id> 폴더에 받은 video.mp4(프레임)와 audio.mp4(전사, 없으면
video.mp4)를 읽어 S/inbox/instagram/<id>.md 끝의 `## Screen text`와 `## Transcript` 절로 쓰고 그 폴더를 지운다.
글자 인식은 macOS Vision을 쓰는 reel_ocr.swift를 S/bin/reel-ocr로 빌드해 쓰고(저장소 안에는 산출물을 만들지 않는다.
실행 검사가 저장소 파일 변경을 본다), 전사는 memo 스킬의 yt_transcript.py에 맡긴다. 도구가 없거나 한 단계가 실패해도
예외를 내지 않고 결과의 status와 note로 알린다. VL reel-backfill과 reel-extract는 대기 목록의 추가, 다음 항목, 시도
결과와 추출 뒤 정리를 여기에 맡기고, 처리 기록(S/digests/log.jsonl)을 읽고 덧붙이는 일만 직접 한다.
"""

import contextlib
import os
import re
import shutil
import signal
import subprocess
import sys
from pathlib import Path

SOURCE = Path(__file__).resolve().with_name("reel_ocr.swift")
REEL_ID = re.compile(r"[A-Za-z0-9_-]+")
FRONTMATTER = re.compile(r"---\n.*?\n---\n", re.S)
# ponytail: 프레임은 앞 600초만 뽑는다(전사는 전체). 10분이 넘는 릴스가 늘면 상한을 올리거나 구간을 나눠 읽는다.
MAX_SECONDS, STEP_SECONDS = 600, 2
# 단계별 시간 제한(초). 처음 빌드와 두 번의 ffprobe(길이, 음성 트랙)까지 더해도 580초라 에이전트의 Bash 최대 시간
# 제한(10분) 안에서 끝나고 폴더를 지운다. 2026-11-18 실측은 95초 릴스에서 프레임 0.8초, 글자 인식 5초(프레임당 약 0.1초), 전사 11초,
# 빌드 1초였다.
SWIFTC_TIMEOUT, FFPROBE_TIMEOUT, FFMPEG_TIMEOUT, OCR_TIMEOUT, STT_TIMEOUT = 90, 10, 60, 170, 240
# VL이 쓴 절은 제목 다음 첫 내용 줄이 MARK로 시작한다. 캡션 속 같은 제목과 가리고, Source:로 시작해 캡션이 없는 단서의
# 제목(VL repost_title)으로 뽑히지 않는다.
SCREEN, TRANSCRIPT, MARK = "## Screen text", "## Transcript", "Source: 기계 추출"
SCREEN_SOURCE = (f"{MARK}. 앞 {MAX_SECONDS // 60}분에서 {STEP_SECONDS}초 간격으로 뽑은 프레임을 macOS Vision으로 읽은 "
                 "화면 글자라 오인식과 배경 글자가 섞이고, 앞에서 나온 줄은 다시 적지 않았다.")
TRANSCRIPT_SOURCE = (f"{MARK}. 로컬 음성 인식(whisper.cpp, 언어 자동 감지)이라 음차와 오인식이 있고 배경 음악의 가사가 "
                     "섞일 수 있다.")
NO_SPEECH = re.compile(r"말소리를 찾지 못했다|전사 결과가 비어 있다")
# yt_transcript.py가 모든 음성 인식 전사에 붙이는 확인할 점. 나머지(환각 의심, 반복 축약, 길이 초과)는 전사 절로 옮긴다.
STANDARD_NOTES = ("음성 인식 결과라 ", "청중 소리와 겹친 ")
QUEUE = ("id", "state", "tries", "updated", "note")


def run(cmd, timeout):
    """도구를 새 프로세스 그룹으로 실행한다. 시간 제한을 넘기거나 SIGTERM으로 바뀐 SystemExit 같은 예외로 빠져나가면
    자식(전사의 whisper-cli 등)까지 끝낸다. 실행할 수 없거나 시간을 넘기면 RuntimeError다."""
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace",
                                start_new_session=True)
    except OSError as error:
        raise RuntimeError(f"실행하지 못했다({Path(cmd[0]).name}): {error.strerror or error}") from None
    try:
        out, err = proc.communicate(timeout=timeout)
    except BaseException as error:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(proc.pid, signal.SIGKILL)
        proc.communicate()
        if isinstance(error, subprocess.TimeoutExpired):
            raise RuntimeError(f"시간 제한 {timeout}초를 넘었다({Path(cmd[0]).name})") from None
        raise
    return subprocess.CompletedProcess(cmd, proc.returncode, out, err)


def tail(text):
    """도구 출력의 사유 한 줄. 전사 스크립트는 사유를 '오류:'로 시작하는 줄에 쓴다."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return next((line for line in lines if line.startswith("오류:")), lines[-1] if lines else "출력 없음")[:200]


def ocr_binary(state):
    """S/bin/reel-ocr. 없거나 소스보다 오래됐으면 swiftc -O로 다시 만들고, 빌드가 끊겨도 반쯤 만든 파일을 쓰지 않는다."""
    binary = Path(state) / "bin" / "reel-ocr"
    if binary.exists() and binary.stat().st_mtime >= SOURCE.stat().st_mtime:
        return binary
    binary.parent.mkdir(parents=True, exist_ok=True)
    tmp = binary.with_name(f".{binary.name}.{os.getpid()}.tmp")
    try:
        built = run(["swiftc", "-O", "-o", str(tmp), str(SOURCE)], SWIFTC_TIMEOUT)
        if built.returncode or not tmp.exists():
            raise RuntimeError(f"swiftc 빌드 실패: {tail(built.stderr)}")
        tmp.replace(binary)
    finally:
        tmp.unlink(missing_ok=True)
    return binary


def wrong_video(path, expected):
    """받은 파일(video.mp4, 없으면 audio.mp4)의 길이가 페이지의 영상 길이(초)와 max(2초, 10%)보다 크게 다르면 그 사유.
    다른 영상의 트랙이 붙는 오류를 막는다."""
    probe = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                FFPROBE_TIMEOUT)
    try:
        actual = float(probe.stdout.strip())
    except ValueError:
        return f"길이를 확인하지 못했다({path.name}): {tail(probe.stderr)}"
    if abs(actual - expected) > max(2, expected / 10):
        return f"다른 영상으로 보인다({path.name} {actual:.1f}초, 페이지 {expected:g}초)"
    return ""


def has_audio(path):
    """파일에 음성 스트림이 있는가. audio.mp4 없이 video.mp4로 전사할 때만 본다."""
    probe = run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0",
                 str(path)], FFPROBE_TIMEOUT)
    if probe.returncode:
        raise RuntimeError(f"음성 트랙을 확인하지 못했다: {tail(probe.stderr)}")
    return bool(probe.stdout.strip())


def frame_images(video, folder):
    """앞 MAX_SECONDS초에서 STEP_SECONDS초마다 뽑은 프레임(0001.jpg부터)."""
    shutil.rmtree(folder, ignore_errors=True)  # 끊긴 이전 실행의 프레임이 섞이지 않게 한다.
    folder.mkdir()
    cut = run(["ffmpeg", "-v", "error", "-y", "-t", str(MAX_SECONDS), "-i", str(video), "-vf", f"fps=1/{STEP_SECONDS}",
               "-q:v", "3", str(folder / "%04d.jpg")], FFMPEG_TIMEOUT)
    images = sorted(folder.glob("*.jpg"))
    if cut.returncode or not images:
        raise RuntimeError(f"프레임을 뽑지 못했다: {tail(cut.stderr)}")
    return images


def screen_text(state, images):
    """프레임마다 처음 나온 화면 글자를 [mm:ss] 줄로 준다. 프레임 번호 n은 (n-1)*STEP_SECONDS초다."""
    read = run([str(ocr_binary(state)), *map(str, images)], OCR_TIMEOUT)
    if read.returncode:
        raise RuntimeError(f"글자 인식 실패(종료 코드 {read.returncode}): {tail(read.stderr)}")
    lines = []
    for row in read.stdout.splitlines():
        name, sep, text = row.partition("\t")
        if sep and Path(name).stem.isdigit() and text.strip():
            at = (int(Path(name).stem) - 1) * STEP_SECONDS
            lines.append(f"[{at // 60:02d}:{at % 60:02d}] {' '.join(text.split())}")
    return lines


def transcript(source, folder, threads, transcribe):
    """(전사문의 `## 본문`, 확인할 점 중 이 전사에만 해당하는 항목). 말소리가 없으면 ("", [])이고 그 밖의 실패는
    RuntimeError다."""
    done = run([sys.executable, str(transcribe), str(source), "--out", str(folder), "--threads", str(threads),
                "--lang", "auto"], STT_TIMEOUT)  # 로컬 파일의 기본 언어는 ko라 영어 릴스가 깨진다.
    if done.returncode == 0:  # 성공하면 마지막 줄이 transcript.md 경로다.
        text = Path((done.stdout.strip().splitlines() or [""])[-1]).read_text(encoding="utf-8")
        checks = text.partition("\n## 확인할 점\n")[2].split("\n## ", 1)[0]
        notes = [line[2:].strip() for line in checks.splitlines()
                 if line.startswith("- ") and not line[2:].startswith(STANDARD_NOTES)]
        return text.partition("\n## 본문\n")[2].strip(), notes
    if NO_SPEECH.search(done.stderr):
        return "", []
    raise RuntimeError(tail(done.stderr + "\n" + done.stdout))


def split_head(text):
    """(frontmatter, 본문 줄 목록). 줄은 줄바꿈을 포함한다."""
    head = FRONTMATTER.match(text)
    cut = head.end() if head else 0
    return text[:cut], text[cut:].splitlines(keepends=True)


def owned(lines, i):
    """lines[i]가 VL이 쓴 `## Screen text`나 `## Transcript` 제목인가(다음 첫 내용 줄이 MARK로 시작한다)."""
    return lines[i].strip() in (SCREEN, TRANSCRIPT) and \
        next((line for line in lines[i + 1:] if line.strip()), "").startswith(MARK)


def extracted(text):
    """단서에 VL이 쓴 절이 있는가."""
    lines = split_head(text)[1]
    return any(owned(lines, i) for i in range(len(lines)))


def merge(text, sections):
    """단서의 두 절을 바꾼다. 값이 None이면 그 절을 그대로 두고(이번 추출 실패), 빈 문자열이면 지우고, 내용이 있으면
    지운 뒤 끝에 붙인다. VL이 쓴 절만 지우므로 캡션 속 같은 제목, frontmatter와 다른 절은 그대로이고 다시 실행해도
    같은 결과다."""
    head, lines = split_head(text)
    kept, skip = [], False
    for i, line in enumerate(lines):
        if line.startswith("## "):
            skip = sections.get(line.strip()) is not None and owned(lines, i)
        if not skip:
            kept.append(line)
    added = "".join(f"\n\n{title}\n\n{body}" for title, body in sections.items() if body)
    return head + "".join(kept).rstrip("\n") + added.replace("\u00b7", "/") + "\n"


def write(path, text):
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def input_problem(tmp, lead, work, reel_id, media):
    """입력 오류의 사유. 맞으면 빈 문자열이다."""
    if not REEL_ID.fullmatch(reel_id):
        return "id는 영문자, 숫자, _, -만 쓴다"
    if not lead.is_file():
        return f"단서 파일이 없다: {lead}"
    if not work.exists() and extracted(lead.read_text(encoding="utf-8", errors="replace")):
        return f"폴더가 없고 단서에 이미 추출한 절이 있다(이미 처리했다): {work}"
    if not (work.is_relative_to(tmp) and work != tmp and work.name == reel_id and work.is_dir()):
        return f"폴더는 {tmp} 아래의 <id> 폴더여야 한다: {work}"
    if not any(path.is_file() for path in media):
        return "폴더에 video.mp4나 audio.mp4가 없다"
    return ""


def inputs(state, reel_id, folder):
    """(입력 오류 사유, 단서 경로, 작업 폴더). 사유가 빈 문자열이면 추출할 수 있다. VL이 추출 전 대기 목록 등록에도 쓴다."""
    state, work = Path(state), Path(folder).expanduser().resolve()
    lead = lead_path(state, reel_id)
    return input_problem((state / "tmp").resolve(), lead, work, reel_id, (work / "video.mp4", work / "audio.mp4")), \
        lead, work


def attempt(errors, label, step):
    """step()의 결과. 도구나 파일 오류면 사유를 errors에 남기고 None(그 절은 이전 것을 둔다)이다."""
    try:
        return step()
    except (OSError, RuntimeError) as error:
        errors.append(f"{label}: {error}")
        return None


def screen_section(state, video, folder, report):
    """`## Screen text` 절 내용. 화면 글자가 없으면 빈 문자열이다."""
    images = frame_images(video, folder)
    report["frames"] = len(images)
    lines = screen_text(state, images)
    report["screen_lines"] = len(lines)
    return "\n".join([SCREEN_SOURCE, "", *lines]) if lines else ""


def transcript_section(source, folder, threads, transcribe, report):
    """`## Transcript` 절 내용. Source 줄 다음에 이 전사의 확인할 점을 두고, 말소리가 없으면 빈 문자열이다."""
    body, checks = transcript(source, folder, threads, transcribe)
    report["transcript_chars"] = len(body)
    return "\n".join([TRANSCRIPT_SOURCE, *(f"- {c}" for c in checks), "", body]) if body else ""


def extract(state, reel_id, folder, threads, transcribe, duration=None):
    """VL reel-extract 본체. status는 ok(절을 하나 이상 기록), empty(화면 글자와 전사 두 단계가 모두 돌았지만 기록할
    내용이 없음), failed(입력 오류, 페이지와 길이가 다른 영상, 단서 파일 오류, 또는 기록한 절 없이 한 단계 이상이 실패했거나
    video.mp4나 음성이 없어 돌지 못함)다.
    duration(초)을 주면 video.mp4(없으면 audio.mp4)의 길이와 비교해 다른 영상으로 보이면 단서를 고치지 않는다. audio.mp4가
    없고 video.mp4에 음성 트랙이 없으면 전사를 건너뛴다. 입력이 맞으면 결과와 관계없이 폴더를 지우고, 입력 오류면
    아무것도 지우거나 쓰지 않는다."""
    problem, lead, work = inputs(state, reel_id, folder)
    report = {"id": reel_id, "status": "failed", "frames": 0, "screen_lines": 0, "transcript_chars": 0, "note": ""}
    if problem:
        return report | {"note": f"입력 오류: {problem}"}
    video, audio = work / "video.mp4", work / "audio.mp4"
    errors, notes = [], []
    try:
        try:
            wrong = wrong_video(video if video.is_file() else audio, duration) if duration else ""
        except RuntimeError as error:
            wrong = f"길이를 확인하지 못했다: {error}"
        if wrong:
            errors.append(wrong)  # 다른 영상의 내용이 붙지 않도록 단서를 고치지 않는다.
        else:
            sections = {SCREEN: None, TRANSCRIPT: None}
            if video.is_file():
                sections[SCREEN] = attempt(errors, "화면 글자",
                                           lambda: screen_section(state, video, work / "frames", report))
            else:
                notes.append("화면 글자: video.mp4가 없다")
            speech = audio.is_file() or attempt(errors, "전사", lambda: has_audio(video))
            if speech:
                sections[TRANSCRIPT] = attempt(errors, "전사", lambda: transcript_section(
                    audio if audio.is_file() else video, work / "stt", threads, transcribe, report))
            elif speech is False:
                notes.append("전사: 음성 트랙이 없다")
            if sections[TRANSCRIPT] == "":
                notes.append("전사: 말소리를 찾지 못했다")
            text = lead.read_text(encoding="utf-8")
            merged = merge(text, sections)
            if merged != text:
                write(lead, merged)
            ran_all = video.is_file() and bool(speech) and not errors  # 한쪽 트랙만 받았으면 내용 없음으로 닫지 않는다.
            report["status"] = "ok" if any(sections.values()) else "empty" if ran_all else "failed"
    except (OSError, ValueError) as error:  # 단서 파일을 읽거나 쓰지 못했다.
        errors.append(f"단서 파일: {error}")
        report["status"] = "failed"
    finally:
        shutil.rmtree(work, ignore_errors=True)
    report["note"] = "; ".join(errors + notes)
    return report


# ---------------------------------------------------------------- 소급 추출 대기 목록
# 판정에 쓰는 done(처리 끝난 key)과 last(key별 판정 기준 기록, records)는 VL이 S/digests/log.jsonl에서 만들고,
# reopen(행)은 그 파일에 reopened 행을 덧붙인다.

HAS_SECTIONS = "이미 추출한 절이 있다"


def lead_path(state, reel_id):
    return Path(state) / "inbox" / "instagram" / f"{reel_id}.md"


def lead_meta(text):
    """단서 frontmatter의 key: value. 따옴표로 감싼 값(kind: "reel")은 벗긴다."""
    meta = {}
    for line in split_head(text)[0].splitlines():
        key, sep, value = line.partition(": ")
        if sep:
            meta[key.strip()] = value.strip().strip('"')
    return meta


def load_queue(state):
    path = Path(state) / "inbox" / "instagram" / "BACKFILL.tsv"
    lines = path.read_text(encoding="utf-8").splitlines()[1:] if path.exists() else []
    return [dict(zip(QUEUE, (line.split("\t") + [""] * len(QUEUE))[:len(QUEUE)])) for line in lines if line.strip()]


def save_queue(state, entries):
    write(Path(state) / "inbox" / "instagram" / "BACKFILL.tsv", "\t".join(QUEUE) + "\n" + "".join(
        "\t".join(" ".join(str(entry[c]).split()) for c in QUEUE) + "\n" for entry in entries))


def personal(row):
    """신앙 관련으로 건너뛴 처리 기록인가(사유 personal)."""
    return str((row or {}).get("note", "")).strip().lower() == "personal"


def records(log_rows):
    """key별 판정 기준 기록. 보통은 마지막 행이지만, 한 번이라도 learned나 merged로 반영했거나 personal로 건너뛴 key는
    뒤에 다른 결과가 붙어도(일괄 정리의 skipped 등) 그 행을 유지한다. 반영한 단서와 신앙 관련 단서를 다시 열지 않기
    위해서다. personal 뒤의 learned나 merged는 반영이 우선한다."""
    kept = {}
    for row in log_rows:
        prev = kept.get(row.get("key")) or {}
        reflected = row.get("result") in ("learned", "merged")
        if prev.get("result") in ("learned", "merged") or (personal(prev) and not reflected):
            continue
        kept[row.get("key")] = row
    return kept


def refusal(state, reel_id, last):
    """지금 추출할 대상이 아닌 사유. 대상이면 빈 문자열이다. last는 그 단서의 판정 기준 기록(records)이다."""
    if not REEL_ID.fullmatch(reel_id):
        return "id 형식이 아니다"
    lead = lead_path(state, reel_id)
    try:
        text = lead.read_text(encoding="utf-8")
    except FileNotFoundError:
        return "단서 파일이 없다"
    except (OSError, ValueError) as error:
        return f"단서 파일을 읽지 못했다: {error}"
    kind = lead_meta(text).get("kind", "")
    last = last or {}
    if kind != "reel":
        return f"릴스가 아니다(kind: {kind or '없음'})"
    if extracted(text):
        return HAS_SECTIONS
    if last.get("result") in ("learned", "merged"):
        return f"이미 반영했다({last['result']})"
    if personal(last):  # 신앙 관련으로 건너뛴 단서는 다시 추출하지 않는다.
        return "personal로 건너뛴 단서다"
    return ""


def closing(reel_id, done, last):
    """절이 생긴 항목을 닫을 상태. 처리 기록이 끝났고 판정 기준 기록(records)이 skipped나 deferred이며 personal이 아니면 learn
    후보로 되돌릴 reopened, 그 밖에는 extracted다."""
    key = f"insta:{reel_id}"
    row = last.get(key) or {}
    reopen = key in done and row.get("result") in ("skipped", "deferred") and not personal(row)
    return "reopened" if reopen else "extracted"


def close(entry, status, note, stamp, reopen):
    """항목의 상태를 바꾼다. reopened면 처리 기록 행을 먼저 덧붙인다. 목록 저장이 실패해도 다음 판정이 extracted로 끝낸다."""
    if status == "reopened":
        reopen({"ts": stamp, "key": f"insta:{entry['id']}", "result": "reopened",
                "note": "릴스 소급 추출로 화면 글자나 전사가 생겼다"})
    entry.update(state=status, note=note, updated=stamp)


def backfill_add(state, ids, last, stamp, note=""):
    """대상인 id를 pending으로 목록 끝에 넣는다. dropped 항목은 지금도 대상이면 tries 0의 pending으로 되살리고, 그 밖에
    이미 목록에 있는 id는 그대로 둔다."""
    entries = load_queue(state)
    added, rejected = [], []
    for reel_id in dict.fromkeys(ids):
        listed = next((entry for entry in entries if entry["id"] == reel_id), None)
        reason = (f"이미 목록에 있다({listed['state']})" if listed and listed["state"] != "dropped"
                  else refusal(state, reel_id, last.get(f"insta:{reel_id}")))
        if reason:
            rejected.append({"id": reel_id, "reason": reason})
            continue
        if listed:
            entries.remove(listed)
        entries.append({"id": reel_id, "state": "pending", "tries": 0, "updated": stamp, "note": note[:120]})
        added.append(reel_id)
    if added:
        save_queue(state, entries)
    return {"added": added, "rejected": rejected, "pending": sum(entry["state"] == "pending" for entry in entries)}


def backfill_next(state, n, done, last, reopen, stamp):
    """pending을 목록 순서대로 지금 처리 기록으로 다시 따져 n개까지 준다. 이미 절이 생긴 항목은 mark와 같은 판정으로,
    단서가 없거나 반영했거나 personal로 건너뛴 항목은 dropped로 닫고 내주지 않는다. 주소는 단서의 값을 믿지 않고 검사한
    id로 만든다. pending은 이번에 준 항목을 뺀 남은 수다."""
    entries = load_queue(state)
    items, changed = [], False
    for entry in entries:
        if len(items) >= n:
            break
        if entry["state"] != "pending":
            continue
        reason = refusal(state, entry["id"], last.get(f"insta:{entry['id']}"))
        if not reason:
            items.append({"id": entry["id"], "url": f"https://www.instagram.com/p/{entry['id']}/"})
            continue
        close(entry, closing(entry["id"], done, last) if reason == HAS_SECTIONS else "dropped",
              "" if reason == HAS_SECTIONS else reason, stamp, reopen)
        changed = True
    if changed:
        save_queue(state, entries)
    return {"items": items, "pending": sum(entry["state"] == "pending" for entry in entries) - len(items)}


def backfill_mark(state, reel_id, gone, done, last, reopen, stamp):
    """시도 뒤 pending 항목의 상태를 정한다. 단서에 VL 절이 생겼으면 closing 판정(reopened나 extracted)으로 닫고, 절이
    없으면 시도 수를 올려 --gone이거나 두 번째 실패면 dropped, 아니면 pending으로 목록 끝에 둔다."""
    entries = load_queue(state)
    entry = next((e for e in entries if e["id"] == reel_id), None)
    if entry is None:
        return {"id": reel_id, "error": "대기 목록에 없다"}
    if entry["state"] != "pending":
        return {"id": reel_id, "state": entry["state"], "note": "이미 끝난 항목이라 바꾸지 않았다"}
    lead = lead_path(state, reel_id)
    has = REEL_ID.fullmatch(reel_id) and lead.is_file() and extracted(lead.read_text(encoding="utf-8"))
    entry["tries"] = int(entry["tries"] or 0) + 1
    if has:
        close(entry, closing(reel_id, done, last), "", stamp, reopen)
    elif gone or entry["tries"] >= 2:
        close(entry, "dropped", "게시물을 볼 수 없다" if gone else "추출 2회 실패", stamp, reopen)
    else:
        close(entry, "pending", "추출 실패, 다음 실행에서 다시 시도한다", stamp, reopen)
        entries.remove(entry)
        entries.append(entry)
    save_queue(state, entries)
    return {"id": reel_id, "state": entry["state"], "tries": entry["tries"]}


def backfill_settle(state, reel_id, status, done, last, reopen, stamp):
    """reel-extract가 끝난 뒤 그 릴스의 pending 항목을 정리한다. ok면 closing 판정(reopened나 extracted)으로 닫고(뒤따르는
    mark는 이미 끝난 항목이라고 답한다), empty면 dropped로 닫아 같은 릴스를 다시 받지 않게 하며, failed는 pending으로 둬
    다음 instagram 실행이 다시 시도한다. 바꾼 상태를 주고, 바꾸지 않았으면 None이다."""
    entries = load_queue(state)
    entry = next((e for e in entries if e["id"] == reel_id and e["state"] == "pending"), None)
    if entry is None or status == "failed":
        return None
    if status == "ok":
        close(entry, closing(reel_id, done, last), "", stamp, reopen)
    else:
        close(entry, "dropped", "화면 글자와 말소리가 없다", stamp, reopen)
    save_queue(state, entries)
    return entry["state"]
