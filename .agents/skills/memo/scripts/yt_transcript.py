#!/usr/bin/env python3
"""YouTube 영상이나 로컬 녹음을 메모 정리용 전사문으로 만든다.

1. yt-dlp로 제목, 설명란, 챕터와 자막 목록을 받는다.
2. 음성 언어와 같은 언어의 사람이 단 자막이 있으면 그 자막을 쓴다.
3. 자동 자막만 있거나 자막이 없거나 자막을 받지 못하면 오디오를 받아 whisper.cpp로 전사한다.
   2026-09-24 실측에서 YouTube 자동 자막은 CER 35.6%, whisper.cpp는 13.7%였다(사람 자막 기준, 영상 1편).

결과는 <출력 폴더>/<작업 폴더>/transcript.md이고, 성공하면 종료 코드 0과 함께 마지막 줄에 그 경로를 출력한다.
작업 폴더는 YouTube면 영상 ID, 다른 사이트면 <추출기>-<ID>-<URL 해시>, 로컬 녹음이면 <파일명>-<경로 해시>다.
이 파일은 문서 작성의 입력이며 vault에 저장하지 않는다. 다운로드와 전사 결과는 결과에 영향을 주는 입력과 옵션이 같을 때만
재사용한다(--threads와 whisper.cpp 판은 캐시 키에 없어 판을 올린 뒤에는 --force를 준다).
종료 코드 3은 필요한 도구나 모델이 없다는 뜻이고, 설치 명령을 stderr에 출력한다.
"""

import argparse
import fcntl
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

MODEL_DIR = Path(os.environ.get("WHISPER_CPP_MODEL_DIR", "~/.cache/whisper-cpp")).expanduser()
WHISPER_MODEL = "ggml-large-v3-turbo.bin"
VAD_MODEL = "ggml-silero-v6.2.0.bin"
MODEL_URLS = {
    WHISPER_MODEL: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin",
    VAD_MODEL: "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin",
}
# 기본값(임계값 0.50, 여유 30ms)은 청중 환호와 겹친 첫머리 발화를 통째로 지웠다.
# 임계값 0.25, 여유 300ms에서 일부가 되살아났고 환각은 늘지 않았다.
VAD_ARGS = ["-vt", "0.25", "-vp", "300"]
# YouTube 추출 방식이 자주 바뀌므로 yt-dlp는 최신판을, mlx-audio는 인자와 출력 파일명을 검증한 판을 쓴다.
YTDLP_FROM = "yt-dlp[default,curl-cffi]@latest"
MLX_AUDIO_FROM = "mlx-audio[stt]==0.5.5"
QWEN3_MODEL = "mlx-community/Qwen3-ASR-1.7B-8bit"
QWEN3_LANGS = {"ko": "Korean", "en": "English", "ja": "Japanese", "zh": "Chinese"}
# YouTube 언어 코드와 whisper 언어 코드가 다른 경우. whisper -l 인자를 만들 때만 쓴다.
WHISPER_LANG_ALIASES = {"iw": "he", "jv": "jw"}
PARAGRAPH_SECONDS = 60
EXIT_MISSING_TOOLS = 3
SUSPECT = re.compile(r"자막\s*(제공|by)|시청해\s*주셔서|구독(과|,)?\s*좋아요|다음\s*영상에서\s*만나요"
                     r"|thanks?( you)? for watching|subtitles by|please subscribe", re.I)
SRT_TIME = re.compile(r"(\d+):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d+):(\d{2}):(\d{2})[,.](\d{3})")
DETECTED_LANG = re.compile(r"auto-detected language: (\w+)")


SAVED = []


def fail(message, code=1):
    print(f"오류: {message}", file=sys.stderr)
    if SAVED:
        # 본문을 저장한 뒤 --qwen3 같은 후속 단계가 실패해도 본문은 쓸 수 있다.
        print(f"본문 전사는 저장됐다: {SAVED[-1]}", file=sys.stderr)
    sys.exit(code)


def run(cmd, step, log, check=True):
    result = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    Path(log).write_text(result.stdout + result.stderr)
    if check and result.returncode != 0:
        tail = "\n".join((result.stderr or result.stdout).strip().splitlines()[-10:])
        fail(f"{step} 실패(종료 코드 {result.returncode}). 전체 로그: {log}\n{tail}")
    return result


def ytdlp(*args):
    cmd = ["uvx", "--from", YTDLP_FROM, "yt-dlp", "--no-playlist"]
    if not shutil.which("deno") and shutil.which("node"):
        cmd += ["--js-runtimes", "node"]
    return cmd + list(args)


def check_tools(tools, models=False):
    missing = [tool for tool in tools if not shutil.which(tool)]
    absent = [name for name in MODEL_URLS if models and not (MODEL_DIR / name).exists()]
    if not missing and not absent:
        return
    brew = {"uvx": "uv", "ffmpeg": "ffmpeg", "ffprobe": "ffmpeg", "whisper-cli": "whisper.cpp"}
    lines = ["필요한 도구나 모델이 없다. 다음을 실행한 뒤 다시 시도한다."]
    if missing:
        lines.append("brew install " + " ".join(dict.fromkeys(brew[t] for t in missing)))
    if absent:
        lines.append(f"mkdir -p {MODEL_DIR}")
        lines += [f"curl -fL -o {MODEL_DIR / name} {MODEL_URLS[name]}" for name in absent]
    fail("\n".join(lines), code=EXIT_MISSING_TOOLS)


def read_json(path):
    try:
        return json.loads(Path(path).read_text())
    except (OSError, ValueError):
        return None


def file_id(path, full=False):
    """크기와 내용 해시로 파일을 식별한다. mtime을 보존하는 복사나 확장 속성 변경에 흔들리지 않는다.

    녹음은 크기를 유지한 편집도 잡도록 전체를 해시하고, 큰 모델 파일은 앞뒤 1MB만 해시한다(2MB 이하는 전체).
    """
    size = path.stat().st_size
    digest = hashlib.sha1()
    with open(path, "rb") as f:
        if full:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                digest.update(chunk)
        else:
            digest.update(f.read(1 << 20))
            if size > 2 << 20:
                f.seek(-(1 << 20), os.SEEK_END)
            digest.update(f.read())
    return [path.name, size, digest.hexdigest()[:16]]


def log_reasons(log):
    lines = Path(log).read_text(errors="replace").splitlines() if Path(log).exists() else []
    return " / ".join(l.strip()[:160] for l in lines if "ERROR" in l or "WARNING" in l)[-400:] or "사유 없음"


def fmt_ts(seconds, long_form):
    seconds = int(seconds)
    h, rest = divmod(seconds, 3600)
    m, s = divmod(rest, 60)
    return f"{h}:{m:02d}:{s:02d}" if long_form or h else f"{m:02d}:{s:02d}"


def probe_duration(path, work):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
              "길이 확인", work / "ffprobe.log").stdout
    try:
        return float(out.strip())
    except ValueError:
        return None


def ensure_wav(args, meta, local, work):
    """16kHz mono wav를 만들고 (경로, 입력 키)를 돌려준다. 입력 키가 같으면 재사용한다.

    전사 캐시가 이 키를 포함하므로 로컬 파일을 바꾸면 전사도 다시 한다. 중간에 끊긴 파일이 남지 않도록 임시 파일에서 옮긴다.
    """
    wav, key_file = work / "audio16k.wav", work / "audio16k.json"
    key = {"local": [str(local.resolve())] + file_id(local, full=True)} if local else {"url": [meta.get("extractor_key"), meta["id"],
                                                                                  meta.get("webpage_url")]}
    if not args.force and wav.exists() and read_json(key_file) == key:
        return wav, key
    for old in list(work.glob("download.*")) + [wav, key_file]:
        old.unlink(missing_ok=True)
    src = local
    if not local:
        run(ytdlp("-f", "bestaudio/best", "-o", str(work / "download.%(ext)s"), args.source),
            "오디오 다운로드", work / "download.log")
        found = [p for p in work.glob("download.*") if p.suffix not in (".part", ".log", ".ytdl")]
        if not found:
            fail(f"오디오를 받지 못했다. 로그인이나 멤버십이 필요한 영상인지 {work / 'download.log'}에서 확인한다.")
        src = found[0]
    tmp = work / "audio16k.tmp.wav"
    run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", str(src), "-vn", "-ac", "1", "-ar", "16000",
         "-c:a", "pcm_s16le", str(tmp)], "오디오 변환", work / "ffmpeg.log")
    tmp.replace(wav)
    key_file.write_text(json.dumps(key, ensure_ascii=False))
    if not local:
        src.unlink(missing_ok=True)
    return wav, key


def has_media(meta):
    """스토리보드 같은 이미지 형식만 있으면 받을 오디오가 없다고 본다. yt-dlp가 쓰는 기준과 같다.

    formats 없이 url만 있는 결과는 yt-dlp가 결과 자체를 유일한 형식으로 쓰므로 그것으로 판정한다.
    """
    formats = meta.get("formats") or ([meta] if meta.get("url") else [])
    return any(f.get("acodec") != "none" or f.get("vcodec") != "none" for f in formats)


def detect_lang(meta):
    """음성 언어를 메타데이터나 원어 자동 자막 트랙(<lang>-orig)으로 정한다. 정할 수 없으면 None."""
    if meta.get("language"):
        return meta["language"].split("-")[0]
    origs = {k[:-5].split("-")[0] for k in (meta.get("automatic_captions") or {}) if k.endswith("-orig")}
    if len(origs) == 1:
        return origs.pop()
    return "ko" if "ko" in origs else None


def pick_manual_sub(meta, lang):
    for key in (meta.get("subtitles") or {}):
        if key == lang or key.startswith(lang + "-"):
            return key
    return None


def fetch_subs(args, sub_key, work):
    """사람이 단 자막을 받는다. 받지 못하면 (None, 사유)를 돌려줘 음성 인식으로 넘어가게 한다."""
    path, log = work / f"subs.{sub_key}.json3", work / "subs.log"
    if path.exists() and not args.force:
        return path, None
    path.unlink(missing_ok=True)
    # 재생 형식이 없어도 자막은 받을 수 있도록 형식 오류를 경고로 낮춘다.
    run(ytdlp("--skip-download", "--ignore-no-formats-error", "--write-subs", "--sub-langs", sub_key,
              "--sub-format", "json3", "-o", str(work / "subs"), args.source), "자막 다운로드", log, check=False)
    return (path, None) if path.exists() else (None, log_reasons(log))


def read_subs(path):
    """자막 json3를 읽는다. 비었거나 깨졌으면 다음 실행이 같은 파일을 재사용하지 않도록 지우고 None을 돌려준다."""
    try:
        return parse_json3(path)
    except (ValueError, AttributeError, TypeError):
        path.unlink(missing_ok=True)
        return None


def parse_json3(path):
    segments = []
    for event in json.loads(Path(path).read_text()).get("events", []):
        text = "".join(seg.get("utf8", "") for seg in event.get("segs") or []).replace("\n", " ").strip()
        if text:
            start = event.get("tStartMs", 0) / 1000
            segments.append((start, start + event.get("dDurationMs", 0) / 1000, text))
    return segments


def parse_srt(path):
    segments = []
    for block in re.split(r"\n\s*\n", Path(path).read_text(errors="replace").strip()):
        lines = block.splitlines()
        for i, line in enumerate(lines):
            m = SRT_TIME.search(line)
            if not m:
                continue
            v = [int(x) for x in m.groups()]
            start = v[0] * 3600 + v[1] * 60 + v[2] + v[3] / 1000
            end = v[4] * 3600 + v[5] * 60 + v[6] + v[7] / 1000
            text = " ".join(part.strip() for part in lines[i + 1:]).strip()
            if text:
                segments.append((start, end, text))
            break
    return segments


def is_long_form(meta, segments):
    """시각에 시를 붙일지 정한다. 본문과 확인할 점, 두 전사 문서가 같은 기준을 쓰도록 길이가 있으면 길이만 본다."""
    if meta.get("duration"):
        return meta["duration"] >= 3600
    return max([0] + [s[1] for s in segments]) >= 3600


def clean_segments(segments, duration, long_form):
    """오디오 길이를 넘는 구간을 버리고 연속 반복을 줄인다. 환각 의심 문장은 지우지 않고 목록만 남긴다."""
    notes, cleaned = [], []
    limit = duration + 1 if duration else None
    beyond = [s for s in segments if limit and s[0] >= limit]
    if beyond:
        notes.append(f"오디오 길이를 넘는 구간 {len(beyond)}개를 버렸다: {beyond[0][2][:40]}")
    segments = [s for s in segments if not (limit and s[0] >= limit)]
    i = 0
    while i < len(segments):
        j = i
        while j + 1 < len(segments) and segments[j + 1][2] == segments[i][2]:
            j += 1
        # 두 번 되풀이한 말은 실제 발화일 수 있어 남기고, 세 번 이상 이어질 때만 반복 루프로 보고 줄인다.
        if j - i + 1 >= 3:
            notes.append(f"[{fmt_ts(segments[i][0], long_form)}] 같은 문장 {j - i + 1}회 반복을 1회로 줄였다: {segments[i][2][:40]}")
            cleaned.append(segments[i])
        else:
            cleaned.extend(segments[i:j + 1])
        i = j + 1
    for start, _, text in cleaned:
        if SUSPECT.search(text):
            notes.append(f"[{fmt_ts(start, long_form)}] 환각 의심 문장: {text[:60]}")
    return cleaned, notes


def render(meta, segments, source, notes, long_form):
    lines = [f"# {meta.get('title') or '제목 없음'}", ""]
    uploaded = meta.get("upload_date") or ""
    uploaded = f"{uploaded[:4]}-{uploaded[4:6]}-{uploaded[6:]}" if len(uploaded) == 8 else uploaded
    info = [("URL", meta.get("webpage_url")), ("파일", meta.get("file_name")),
            ("채널", meta.get("channel") or meta.get("uploader")),
            ("업로드", uploaded), ("길이", fmt_ts(meta["duration"], long_form) if meta.get("duration") else None),
            ("텍스트 출처", source)]
    lines += [f"- {k}: {v}" for k, v in info if v]
    if notes:
        lines += ["", "## 확인할 점", ""] + [f"- {n}" for n in notes]
    if meta.get("description"):
        lines += ["", "## 설명란", "", meta["description"].strip()]
    lines += ["", "## 본문"]
    chapters = sorted(meta.get("chapters") or [], key=lambda c: c.get("start_time", 0))
    next_chapter, para, para_start = 0, [], None

    def flush():
        if para:
            lines.extend(["", f"[{fmt_ts(para_start, long_form)}] " + " ".join(para)])

    def heading(chapter):
        lines.extend(["", f"### [{fmt_ts(chapter.get('start_time', 0), long_form)}] {chapter.get('title', '')}"])

    for start, _, text in segments:
        if next_chapter < len(chapters) and start >= chapters[next_chapter].get("start_time", 0):
            flush()
            para, para_start = [], None
            while next_chapter < len(chapters) and start >= chapters[next_chapter].get("start_time", 0):
                heading(chapters[next_chapter])
                next_chapter += 1
        if para_start is None:
            para_start = start
        elif start - para_start >= PARAGRAPH_SECONDS:
            flush()
            para, para_start = [], start
        para.append(text)
    flush()
    for chapter in chapters[next_chapter:]:
        heading(chapter)
    return "\n".join(lines) + "\n"


def transcribe_whisper(wav, audio_key, lang, prompt, threads, work, force):
    """whisper.cpp로 전사한다. 같은 입력, 모델, 언어, 프롬프트로 만든 결과가 있으면 재사용한다. (srt, 감지 언어)를 돌려준다."""
    srt, key_file, log = work / "whisper.srt", work / "whisper.json", work / "whisper.log"
    key = {"audio": audio_key, "model": file_id(MODEL_DIR / WHISPER_MODEL), "vad_model": file_id(MODEL_DIR / VAD_MODEL),
           "vad": VAD_ARGS, "lang": lang, "prompt": prompt or ""}
    if not force and srt.exists() and srt.stat().st_size > 0 and read_json(key_file) == key:
        return srt, (DETECTED_LANG.findall(log.read_text(errors="replace")) or [None])[0] if log.exists() else None
    srt.unlink(missing_ok=True)
    key_file.unlink(missing_ok=True)
    cmd = ["whisper-cli", "-m", str(MODEL_DIR / WHISPER_MODEL), "-f", str(wav), "-l", WHISPER_LANG_ALIASES.get(lang, lang),
           "-t", str(threads), "--vad", "-vm", str(MODEL_DIR / VAD_MODEL), *VAD_ARGS, "-osrt", "-of", str(work / "whisper")]
    if prompt:
        # 프롬프트는 용어 표기를 돕지만 첫 구간의 실제 발화를 제목 표기로 바꾼 사례가 있어 기본으로 끈다.
        cmd += ["--prompt", prompt, "--carry-initial-prompt"]
    begin = time.time()
    run(cmd, "whisper.cpp 전사", log)
    if not srt.exists() or srt.stat().st_size == 0:
        if "speech segments after filtering: 0" in log.read_text(errors="replace"):
            fail(f"VAD가 말소리를 찾지 못했다. 음악이나 무음 위주의 오디오일 수 있다. 전체 로그: {log}")
        fail(f"whisper.cpp가 결과를 만들지 못했다. 전체 로그: {log}")
    key_file.write_text(json.dumps(key, ensure_ascii=False))
    print(f"whisper.cpp 전사 {time.time() - begin:.0f}초", file=sys.stderr)
    return srt, (DETECTED_LANG.findall(log.read_text(errors="replace")) or [None])[0]


def transcribe_qwen3(wav, audio_key, lang, work, force):
    """용어 교차 확인용 2차 전사. 프롬프트를 넣으면 짧은 꼬리 청크에 프롬프트가 그대로 출력돼 넣지 않는다."""
    key_file = work / "qwen3.json"
    key = {"audio": audio_key, "model": QWEN3_MODEL, "from": MLX_AUDIO_FROM, "lang": lang}
    found = sorted(work.glob("qwen3*.srt"))
    if not force and found and read_json(key_file) == key:
        return found[0]
    for old in found + [key_file]:
        old.unlink(missing_ok=True)
    begin = time.time()
    run(["uvx", "--python", "3.12", "--from", MLX_AUDIO_FROM, "mlx_audio.stt.generate", "--model", QWEN3_MODEL,
         "--audio", str(wav), "--language", QWEN3_LANGS[lang], "--chunk-duration", "30",
         "--max-parallel-segments", "4", "--format", "srt", "--output-path", str(work / "qwen3")],
        "Qwen3-ASR 전사", work / "qwen3.log")
    found = sorted(work.glob("qwen3*.srt"))
    if not found:
        fail(f"Qwen3-ASR 결과 SRT를 찾지 못했다. 전체 로그: {work / 'qwen3.log'}")
    key_file.write_text(json.dumps(key, ensure_ascii=False))
    print(f"Qwen3-ASR 전사 {time.time() - begin:.0f}초", file=sys.stderr)
    return found[0]


def main():
    parser = argparse.ArgumentParser(description="YouTube 영상이나 로컬 녹음을 메모 정리용 전사문으로 만든다.")
    parser.add_argument("source", help="YouTube 영상 URL 또는 로컬 오디오, 영상 파일 경로")
    parser.add_argument("--out", help="출력 폴더. 그 아래 입력별 작업 폴더에 결과를 만든다. 기본값은 임시 폴더의 yt-transcript")
    parser.add_argument("--lang", help="음성 언어 코드(ko, en 등)나 auto. YouTube는 메타데이터로 추정하고 모르면 auto, "
                                       "로컬 녹음은 ko가 기본값")
    parser.add_argument("--force-stt", action="store_true", help="사람이 단 자막이 있어도 음성 인식을 쓴다")
    parser.add_argument("--prompt", help="whisper.cpp에 줄 용어 힌트. 첫 구간 발화를 바꿀 수 있어 필요할 때만 쓴다")
    parser.add_argument("--qwen3", action="store_true", help="Qwen3-ASR로 용어 교차 확인용 전사를 추가로 만든다")
    parser.add_argument("--threads", type=int, default=4, help="whisper.cpp 스레드 수")
    parser.add_argument("--force", action="store_true", help="다운로드부터 다시 한다")
    args = parser.parse_args()

    candidate = Path(args.source).expanduser()
    local = candidate if candidate.is_file() else None
    base = Path(args.out).expanduser() if args.out else Path(tempfile.gettempdir()) / "yt-transcript"
    if local:
        check_tools(["ffmpeg", "ffprobe", "whisper-cli"] + (["uvx"] if args.qwen3 else []), models=True)
        digest = hashlib.sha1(str(local.resolve()).encode()).hexdigest()[:8]
        meta = {"id": f"{re.sub(r'[^0-9A-Za-z가-힣]+', '-', local.stem).strip('-') or 'local'}-{digest}",
                "title": local.stem, "file_name": local.name}
        work = base / meta["id"]
        work.mkdir(parents=True, exist_ok=True)
    else:
        check_tools(["uvx"])
        base.mkdir(parents=True, exist_ok=True)
        meta_log = base / f"meta-{os.getpid()}.log"
        result = run(ytdlp("-j", "--skip-download", "--flat-playlist", "--ignore-no-formats-error", args.source),
                     "메타데이터 조회", meta_log)
        rows = result.stdout.strip().splitlines()
        try:
            meta = json.loads(rows[0]) if len(rows) == 1 else {}
        except ValueError:
            fail(f"메타데이터를 읽지 못했다. 전체 로그: {meta_log}")
        if meta.get("_type", "video") != "video" or not meta.get("id"):
            fail("재생목록이나 채널이 아니라 영상 하나의 URL을 준다.")
        if meta.get("is_live") or meta.get("live_status") in ("is_live", "is_upcoming"):
            fail("진행 중이거나 예정된 라이브 방송이다. 방송이 끝나고 다시보기가 올라온 뒤 다시 시도한다.")
        extractor = meta.get("extractor_key") or "Generic"
        if extractor == "Youtube":
            folder = meta["id"]
        else:
            # 다른 사이트의 ID는 URL 파일명에서 나와 겹칠 수 있어 주소 해시를 붙인다.
            url_hash = hashlib.sha1(str(meta.get("webpage_url") or args.source).encode()).hexdigest()[:8]
            folder = f"{extractor.lower()}-{re.sub(r'[^0-9A-Za-z._-]+', '-', meta['id']).strip('-')}-{url_hash}"
        work = base / folder
        work.mkdir(parents=True, exist_ok=True)
        meta_log.replace(work / "meta.log")

    lock = open(work / ".lock", "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        fail(f"같은 입력의 전사가 이미 실행 중이다({work}). 끝난 뒤 다시 시도한다.")
    transcript, qwen3_md = work / "transcript.md", work / "transcript.qwen3.md"
    # 실패한 실행이 이전 결과를 남기지 않도록 결과 문서부터 지운다. 다운로드와 전사 캐시는 입력 키로 따로 관리한다.
    transcript.unlink(missing_ok=True)
    qwen3_md.unlink(missing_ok=True)

    if args.lang:
        lang = None if args.lang == "auto" else args.lang.split("-")[0]
    else:
        lang = "ko" if local else detect_lang(meta)
    if args.qwen3 and lang and lang not in QWEN3_LANGS:
        fail(f"--qwen3는 {', '.join(QWEN3_LANGS)} 음성만 지원하도록 설정돼 있다.")

    notes, segments, source = [], None, None
    if not local and not args.force_stt:
        # 번역 자막을 원문으로 쓰지 않도록 음성 언어와 같은 자막만 고른다.
        sub_key = pick_manual_sub(meta, lang) if lang else None
        if not lang and meta.get("subtitles"):
            notes.append(f"음성 언어를 확인하지 못해 사람이 단 자막({', '.join(meta['subtitles'])})을 쓰지 않았다.")
        if sub_key:
            subs, reason = fetch_subs(args, sub_key, work)
            parsed = read_subs(subs) if subs else None
            if subs and parsed is None:
                reason = "자막 파일을 읽지 못함"
            segments = parsed or None
            if segments:
                source = f"사람이 단 YouTube 자막({sub_key})"
                # 이후 --qwen3 오디오 단계가 실패해도 받은 자막 본문은 남도록 먼저 저장한다.
                transcript.write_text(render(meta, segments, source, notes, is_long_form(meta, segments)))
                SAVED.append(transcript)
            else:
                notes.append(f"사람이 단 자막({sub_key})을 받지 못해 음성 인식으로 대신했다: {reason or '자막 파일에 텍스트가 없음'}")

    wav = audio_key = None
    if segments is None or args.qwen3:
        if not local and not has_media(meta):
            fail(f"받을 수 있는 오디오 형식이 없다. 로그인, 멤버십, 비공개 영상인지 확인한다. "
                 f"사유: {log_reasons(work / 'meta.log')}")
        check_tools(["ffmpeg", "ffprobe"] + (["whisper-cli"] if segments is None else [])
                    + (["uvx"] if args.qwen3 else []), models=segments is None)
        wav, audio_key = ensure_wav(args, meta, local, work)
        if not meta.get("duration"):
            meta["duration"] = probe_duration(wav, work)

    if segments is None:
        srt, detected = transcribe_whisper(wav, audio_key, lang or "auto", args.prompt, args.threads, work, args.force)
        raw = parse_srt(srt)
        segments, cleaned_notes = clean_segments(raw, meta.get("duration"), is_long_form(meta, raw))
        if not segments:
            fail(f"전사 결과가 비어 있다. {work}의 로그를 확인한다.")
        source = f"로컬 음성 인식(whisper.cpp large-v3-turbo, VAD{', 용어 프롬프트' if args.prompt else ''})"
        if not lang:
            source += f", 언어 자동 감지({detected or '감지 결과 없음'})"
            lang = detected
        if lang and any(k.split("-")[0] == lang for k in (meta.get("automatic_captions") or {})):
            source += ", YouTube 자동 자막은 품질이 낮아 쓰지 않음"
        notes = ["음성 인식 결과라 기술 용어가 소리 나는 대로 적히거나(예: 퀵→QUIC) 비슷한 단어로 바뀔 수 있다"
                 "(예: 사과→사가). 문맥과 공식 문서로 교정한다.",
                 "청중 소리와 겹친 발화는 빠질 수 있고, 화면의 슬라이드와 코드는 들어 있지 않다."] + notes + cleaned_notes
        transcript.write_text(render(meta, segments, source, notes, is_long_form(meta, segments)))
        SAVED.append(transcript)

    if args.qwen3:
        if lang not in QWEN3_LANGS:
            fail(f"--qwen3는 {', '.join(QWEN3_LANGS)} 음성만 지원하도록 설정돼 있다. 감지 언어: {lang}")
        raw = parse_srt(transcribe_qwen3(wav, audio_key, lang, work, args.force))
        qsegments, qnotes = clean_segments(raw, meta.get("duration"), is_long_form(meta, raw))
        qnotes.insert(0, "용어 교차 확인용 2차 전사다. 본문 기준은 transcript.md다.")
        qwen3_md.write_text(render(meta, qsegments, "로컬 음성 인식(Qwen3-ASR-1.7B-8bit)", qnotes,
                                   is_long_form(meta, qsegments)))
        print(qwen3_md)

    print(f"{source}, 구간 {len(segments)}개, {sum(len(s[2]) for s in segments)}자", file=sys.stderr)
    print(transcript)


if __name__ == "__main__":
    main()
