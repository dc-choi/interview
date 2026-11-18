"""Offline checks for reel extraction and the reel backfill queue. RealToolsTests runs only when ffmpeg, swiftc,
whisper-cli, its models and say exist (about 20 to 40 seconds, mostly whisper.cpp model loading)."""

import argparse
import contextlib
import io
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch

sys.dont_write_bytecode = True  # 실행 검사가 보는 스킬 스크립트의 __pycache__를 고치지 않는다.
import reel_media as media  # noqa: E402
import vault_learn as vl  # noqa: E402

# 아래 id, 주소, 화면 문구와 전사는 모두 지어낸 값이다.
ID = "Fake_Reel-01"
LEAD = ("---\nid: Fake_Reel-01\nurl: https://www.instagram.com/reel/Fake_Reel-01/\nauthor: \"@example\"\nkind: reel\n"
        "source: saved\norder: 1\nharvested_at: 2026-11-18\nstatus: lead\n---\n\n## Text\n\n지어낸 캡션\n\n"
        "## Media\n\n- on-screen: 첫 화면\n\n## Outbound links\n\n- https://example.com/\n")
OCR = "0001.jpg\t지어낸 제목 / 다섯 가지 요약\n0004.jpg\t1. 첫째 항목\n"
SPEECH = "[00:00] 첫 번째 문장이다.\n\n[01:01] 마지막 문장이다."
STANDARD = ["음성 인식 결과라 기술 용어가 소리 나는 대로 적힐 수 있다.", "청중 소리와 겹친 발화는 빠질 수 있다."]
VL = Path(vl.__file__).resolve()


def done(cmd, out="", err="", rc=0):
    return subprocess.CompletedProcess(cmd, rc, out, err)


def lead_text(reel_id, kind="reel"):
    return LEAD.replace(ID, reel_id).replace("kind: reel", f"kind: {kind}")


def gone(pid, wait=5):
    """pid가 끝났고 회수됐는가. 프로세스 그룹을 끝낸 뒤 launchd가 고아 손자를 회수할 시간을 준다."""
    for _ in range(int(wait / 0.05)):
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return True
        time.sleep(0.05)
    return False


class Tools:
    """reel_media.run을 대신한다. 호출한 도구를 기록하고, fail에 든 도구는 실행 파일이 없는 것처럼 실패한다."""

    def __init__(self):
        self.frames, self.ocr, self.speech, self.checks, self.length = 4, OCR, SPEECH, [], 31.0
        self.lengths, self.audio_stream, self.fail, self.build_rc, self.calls = {}, True, set(), 0, []

    def __call__(self, cmd, timeout):
        tool = "stt" if cmd[0] == sys.executable else Path(cmd[0]).name
        self.calls.append((tool, cmd))
        if tool in self.fail:
            raise RuntimeError(f"실행하지 못했다({tool}): No such file or directory")
        if tool == "ffprobe" and "-select_streams" in cmd:  # 음성 스트림 확인
            return done(cmd, "1\n" if self.audio_stream else "")
        if tool == "ffprobe":  # 길이 확인. lengths에 파일 이름별 길이를 둘 수 있다.
            length = self.lengths.get(Path(cmd[-1]).name, self.length)
            return done(cmd, f"{length}\n") if length is not None else done(cmd, "", "Invalid data", 1)
        if tool == "ffmpeg":
            for n in range(1, self.frames + 1):
                (Path(cmd[-1]).parent / f"{n:04d}.jpg").write_bytes(b"jpg")
            return done(cmd)
        if tool == "swiftc":
            Path(cmd[cmd.index("-o") + 1]).write_text("binary")
            return done(cmd, err="error: build", rc=self.build_rc)
        if tool == "reel-ocr":
            return done(cmd, self.ocr)
        if self.speech is None:
            return done(cmd, err="오류: VAD가 말소리를 찾지 못했다. 음악이나 무음 위주의 오디오일 수 있다.", rc=1)
        work = Path(cmd[cmd.index("--out") + 1]) / "audio-1234abcd"
        work.mkdir(parents=True)
        checks = "".join(f"- {c}\n" for c in STANDARD + self.checks)
        (work / "transcript.md").write_text(f"# audio\n\n- 파일: audio.mp4\n\n## 확인할 점\n\n{checks}\n## 본문\n\n"
                                            f"{self.speech}\n", encoding="utf-8")
        return done(cmd, f"{work / 'transcript.md'}\n")

    def used(self):
        return [tool for tool, _ in self.calls]


class StateCase(unittest.TestCase):
    """임시 상태 디렉터리(S)에 단서 하나를 두고 외부 도구를 Tools로 바꾼다."""

    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.state = self.root / "state"
        for sub in ("inbox/instagram", "digests", "tmp"):
            (self.state / sub).mkdir(parents=True)
        self.lead = self.state / "inbox" / "instagram" / f"{ID}.md"
        self.lead.write_text(LEAD, encoding="utf-8")
        self.tools = Tools()
        patch.object(media, "run", self.tools).start()
        patch.object(vl, "S", self.state).start()
        self.addCleanup(patch.stopall)

    def folder(self, *names, reel_id=ID, base=None):
        folder = (base or self.state / "tmp" / "vault-learn-instagram-20261118-090000-reels") / reel_id
        folder.mkdir(parents=True, exist_ok=True)
        for name in names:
            (folder / name).write_bytes(b"mp4")
        return folder

    def extract(self, folder, reel_id=ID, duration=None):
        return media.extract(self.state, reel_id, folder, 4, self.root / "yt_transcript.py", duration)

    def text(self, reel_id=ID):
        return (self.state / "inbox" / "instagram" / f"{reel_id}.md").read_text(encoding="utf-8")

    def vl(self, fn, **args):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            rc = fn(argparse.Namespace(**args))
        return rc, json.loads(out.getvalue())

    def log(self, *rows):
        vl.append(self.state / "digests" / "log.jsonl", "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))


class ExtractTests(StateCase):
    def test_input_errors_are_rejected_without_writing_or_deleting(self):
        outside = self.folder("video.mp4", base=self.root / "elsewhere")
        link = self.state / "tmp" / "link-reels"
        link.mkdir(parents=True)
        (link / ID).symlink_to(outside)
        (self.state / "inbox" / "instagram" / "tmp.md").write_text(LEAD, encoding="utf-8")
        (self.state / "tmp" / "video.mp4").write_bytes(b"mp4")
        cases = [(outside, ID, "폴더는"), (link / ID, ID, "폴더는"), (self.state / "tmp", "tmp", "폴더는"),
                 (self.folder("video.mp4", reel_id="Other"), ID, "폴더는"),
                 (self.folder("video.mp4", reel_id="Missing1"), "Missing1", "단서 파일이 없다"),
                 (self.folder(), ID, "video.mp4나 audio.mp4가 없다")]
        cases += [(outside, bad, "id는") for bad in ("../x", "a b", "", "a/b", "Fake.md")]
        for folder, reel_id, why in cases:
            with self.subTest(folder=folder, reel_id=reel_id):
                report = self.extract(folder, reel_id)
                self.assertEqual(report["status"], "failed")
                self.assertTrue(report["note"].startswith("입력 오류:") and why in report["note"], report["note"])
                self.assertTrue(Path(folder).exists())
        self.assertEqual(self.text(), LEAD)
        self.assertEqual(self.tools.calls, [])
        self.assertTrue((outside / "video.mp4").exists() and (self.state / "tmp" / "video.mp4").exists())

    def test_missing_folder_of_an_extracted_lead_says_it_was_already_processed(self):
        missing = self.state / "tmp" / "vault-learn-instagram-20261118-090000-reels" / ID
        self.assertIn("폴더는", self.extract(missing)["note"])  # 아직 추출하지 않은 단서
        self.extract(self.folder("video.mp4", "audio.mp4"))  # 추출이 끝나면 폴더를 지운다.
        report = self.extract(missing)
        self.assertEqual(report["status"], "failed")
        self.assertIn("이미 처리했다", report["note"])

    def test_sections_follow_existing_content_and_rerun_replaces_them(self):
        folder = self.folder("video.mp4", "audio.mp4")
        report = self.extract(folder)
        self.assertEqual(report, {"id": ID, "status": "ok", "frames": 4, "screen_lines": 2,
                                  "transcript_chars": len(SPEECH), "note": ""})
        self.assertFalse(folder.exists())
        first = self.text()
        self.assertTrue(first.startswith(LEAD.rstrip("\n") + "\n\n## Screen text\n\n" + media.SCREEN_SOURCE + "\n\n"))
        self.assertIn("[00:00] 지어낸 제목 / 다섯 가지 요약\n[00:06] 1. 첫째 항목\n\n## Transcript\n\n"
                      + media.TRANSCRIPT_SOURCE + "\n\n" + SPEECH + "\n", first)
        self.assertTrue(first.endswith(SPEECH + "\n") and media.extracted(first) and not media.extracted(LEAD))
        stt = next(cmd for tool, cmd in self.tools.calls if tool == "stt")
        self.assertEqual(stt[2:], [str(folder.resolve() / "audio.mp4"), "--out", str(folder.resolve() / "stt"),
                                   "--threads", "4", "--lang", "auto"])
        self.extract(self.folder("video.mp4", "audio.mp4"))
        self.assertEqual(self.text(), first)  # 같은 결과로 다시 실행하면 파일이 그대로다.
        self.tools.ocr = "0002.jpg\t2. 둘째 항목\n"
        self.extract(self.folder("video.mp4", "audio.mp4"))
        again = self.text()
        self.assertEqual((again.count("## Screen text"), again.count("## Transcript")), (1, 1))
        self.assertIn("[00:02] 2. 둘째 항목", again)
        self.assertNotIn("1. 첫째 항목", again)

    def test_caption_headings_are_not_taken_for_vl_sections(self):
        caption = "## Transcript\n\n캡션에 적힌 대본이다.\n\n## Screen text\n\n캡션에 적힌 화면 설명이다."
        lead = LEAD.replace("지어낸 캡션", caption)
        self.lead.write_text(lead, encoding="utf-8")
        self.assertFalse(media.extracted(lead))
        for _ in range(2):  # 처음과 다시 실행 모두 캡션은 그대로, VL 절만 바뀐다.
            self.extract(self.folder("video.mp4", "audio.mp4"))
            text = self.text()
            self.assertTrue(text.startswith(lead.rstrip("\n")), text)
            self.assertEqual((text.count("## Screen text"), text.count("## Transcript")), (2, 2))
        self.tools.ocr, self.tools.speech = "", None  # 내용이 없어지면 VL 절만 지운다.
        self.extract(self.folder("video.mp4", "audio.mp4"))
        self.assertEqual(self.text(), lead)

    def test_transcript_checks_follow_the_source_line(self):
        self.tools.checks = ["[00:10] 환각 의심 문장: 지어낸 인사말", "[00:20] 같은 문장 4회 반복을 1회로 줄였다: 후렴"]
        self.extract(self.folder("video.mp4", "audio.mp4"))
        section = self.text().split("## Transcript\n\n", 1)[1]
        self.assertTrue(section.startswith(media.TRANSCRIPT_SOURCE + "\n- [00:10] 환각 의심 문장: 지어낸 인사말\n"
                                           "- [00:20] 같은 문장 4회 반복을 1회로 줄였다: 후렴\n\n" + SPEECH), section)
        self.assertFalse(any(note in section for note in STANDARD))

    def test_timestamps_noise_rows_and_middle_dots(self):
        self.tools.ocr = ("0001.jpg\t가나\u00b7다라\n0031.jpg\t  가\t나  \n0300.jpg\t끝\nnoise\nx.jpg\t글자\n"
                          "0005.jpg\t   \n")
        self.tools.speech = "[00:00] 마바\u00b7사아"
        report = self.extract(self.folder("video.mp4", "audio.mp4"))
        text = self.text()
        self.assertEqual(report["screen_lines"], 3)
        self.assertIn("[00:00] 가나/다라\n[01:00] 가 나\n[09:58] 끝\n\n## Transcript", text)
        self.assertIn("[00:00] 마바/사아", text)
        self.assertNotIn("\u00b7", text)

    def test_empty_results_omit_sections_and_remove_old_ones(self):
        self.extract(self.folder("video.mp4", "audio.mp4"))
        self.tools.ocr, self.tools.speech = "", None
        folder = self.folder("video.mp4", "audio.mp4")
        report = self.extract(folder)
        self.assertEqual((report["status"], report["screen_lines"], report["transcript_chars"]), ("empty", 0, 0))
        self.assertIn("말소리", report["note"])
        self.assertEqual(self.text(), LEAD)  # 내용 없는 절은 만들지 않고 이전 절은 지운다.
        self.assertFalse(folder.exists())

    def test_tool_failures_are_reported_and_keep_previous_sections(self):
        self.tools.fail = {"ffmpeg", "stt"}
        folder = self.folder("video.mp4", "audio.mp4")
        report = self.extract(folder)
        self.assertEqual(report["status"], "failed")
        self.assertIn("화면 글자: 실행하지 못했다(ffmpeg)", report["note"])
        self.assertIn("전사: 실행하지 못했다(stt)", report["note"])
        self.assertFalse(folder.exists())
        self.assertEqual(self.text(), LEAD)
        self.tools.fail = {"stt"}  # 한 단계만 실패하면 다른 절은 쓰고 ok다.
        report = self.extract(self.folder("video.mp4", "audio.mp4"))
        self.assertEqual(report["status"], "ok")
        self.assertIn("전사:", report["note"])
        self.assertIn("## Screen text", self.text())
        self.assertNotIn("## Transcript", self.text())
        self.tools.fail, self.tools.ocr = {"ffmpeg"}, "0001.jpg\t새 글자\n"  # 실패한 단계의 이전 절은 그대로 둔다.
        report = self.extract(self.folder("video.mp4", "audio.mp4"))
        self.assertEqual(report["status"], "ok")
        self.assertIn("1. 첫째 항목", self.text())
        self.assertNotIn("새 글자", self.text())
        self.assertIn("## Transcript", self.text())

    def test_media_choice_without_video_or_audio_track(self):
        report = self.extract(self.folder("audio.mp4"))
        self.assertEqual((report["status"], report["frames"]), ("ok", 0))
        self.assertIn("video.mp4가 없다", report["note"])
        self.assertNotIn("## Screen text", self.text())
        self.assertNotIn("ffmpeg", self.tools.used())
        folder = self.folder("video.mp4")  # 음성 트랙이 없으면 영상 파일로 전사한다(한 파일에 음성이 든 경우).
        self.extract(folder)
        stt = [cmd for tool, cmd in self.tools.calls if tool == "stt"][-1]
        self.assertEqual(stt[2], str(folder.resolve() / "video.mp4"))

    def test_video_without_an_audio_stream_skips_the_transcript(self):
        self.tools.audio_stream, self.tools.calls = False, []
        report = self.extract(self.folder("video.mp4"))
        self.assertEqual(report["status"], "ok")
        self.assertEqual(report["note"], "전사: 음성 트랙이 없다")  # 오류가 아니다.
        self.assertNotIn("stt", self.tools.used())
        self.assertIn("## Screen text", self.text())
        self.assertNotIn("## Transcript", self.text())
        self.lead.write_text(LEAD, encoding="utf-8")
        self.tools.ocr = ""  # 전사 단계가 돌지 못했으므로 내용 없음(empty)으로 닫지 않는다.
        self.assertEqual(self.extract(self.folder("video.mp4"))["status"], "failed")
        self.tools.fail = {"ffprobe"}  # 음성 스트림을 확인하지 못해도 오류로 남고 내용 없음이 아니다.
        report = self.extract(self.folder("video.mp4"))
        self.assertEqual(report["status"], "failed")
        self.assertIn("전사", report["note"])

    def test_duration_mismatch_marks_another_video_and_keeps_the_lead(self):
        for expected, length, ok in ((31, 31.4, True), (31, 34.5, False), (100, 109.0, True), (100, 111.0, False),
                                     (10, 11.9, True), (10, 12.5, False)):
            with self.subTest(expected=expected, length=length):
                self.lead.write_text(LEAD, encoding="utf-8")
                self.tools.length, self.tools.calls = length, []
                folder = self.folder("video.mp4", "audio.mp4")
                report = self.extract(folder, duration=expected)
                self.assertEqual(report["status"], "ok" if ok else "failed", report)
                self.assertFalse(folder.exists())
                if not ok:
                    self.assertIn("다른 영상으로 보인다", report["note"])
                    self.assertEqual(self.text(), LEAD)
                    self.assertEqual(self.tools.used(), ["ffprobe"])
                else:
                    self.assertEqual(self.tools.used()[:2], ["ffprobe", "ffmpeg"])  # 길이는 video.mp4만 본다.
        # 영상과 음성의 길이가 다르면 video.mp4만 보고, video.mp4가 없을 때만 audio.mp4를 본다.
        for names, lengths, status in ((("video.mp4", "audio.mp4"), {"video.mp4": 50, "audio.mp4": 31}, "failed"),
                                       (("video.mp4", "audio.mp4"), {"video.mp4": 31, "audio.mp4": 50}, "ok"),
                                       (("audio.mp4",), {"audio.mp4": 50}, "failed"),
                                       (("audio.mp4",), {"audio.mp4": 31}, "ok")):
            with self.subTest(names=names, lengths=lengths):
                self.lead.write_text(LEAD, encoding="utf-8")
                self.tools.lengths, self.tools.calls = lengths, []
                self.assertEqual(self.extract(self.folder(*names), duration=31)["status"], status)
                probed = [Path(cmd[-1]).name for tool, cmd in self.tools.calls if tool == "ffprobe"]
                self.assertEqual(probed, [names[0]])
        self.tools.lengths = {}
        self.lead.write_text(LEAD, encoding="utf-8")
        self.tools.length = None
        report = self.extract(self.folder("video.mp4"), duration=31)
        self.assertIn("길이를 확인하지 못했다", report["note"])
        self.assertEqual((report["status"], self.text()), ("failed", LEAD))
        self.tools.fail, self.tools.calls = {"ffprobe"}, []
        self.assertEqual(self.extract(self.folder("video.mp4"), duration=31)["status"], "failed")
        self.tools.fail, self.tools.calls = set(), []
        self.extract(self.folder("video.mp4", "audio.mp4"))  # 길이를 주지 않으면 확인하지 않는다.
        self.assertNotIn("ffprobe", self.tools.used())

    def test_ocr_binary_is_built_in_state_and_rebuilt_only_when_stale(self):
        binary = self.state / "bin" / "reel-ocr"
        self.tools.build_rc = 1  # 빌드 실패는 반쯤 만든 파일을 남기지 않는다.
        report = self.extract(self.folder("video.mp4", "audio.mp4"))
        self.assertIn("swiftc 빌드 실패: error: build", report["note"])
        self.assertEqual(sorted(p.name for p in binary.parent.iterdir()), [])
        self.tools.build_rc = 0
        self.extract(self.folder("video.mp4", "audio.mp4"))
        self.assertTrue(binary.exists())
        build = [cmd for tool, cmd in self.tools.calls if tool == "swiftc"][-1]
        self.assertEqual(build[-1], str(media.SOURCE))
        self.assertTrue(Path(build[build.index("-o") + 1]).parent == binary.parent)
        count = self.tools.used().count("swiftc")
        self.extract(self.folder("video.mp4", "audio.mp4"))
        self.assertEqual(self.tools.used().count("swiftc"), count)  # 소스보다 새로우면 다시 빌드하지 않는다.
        old = media.SOURCE.stat().st_mtime - 60
        os.utime(binary, (old, old))
        self.extract(self.folder("video.mp4", "audio.mp4"))
        self.assertEqual(self.tools.used().count("swiftc"), count + 1)

    def command(self, folder, reel_id=ID, duration=None):
        return self.vl(vl.cmd_reel_extract, id=reel_id, dir=str(folder), duration=duration)

    def queue(self):
        return [(e["id"], e["state"], int(e["tries"]), e["note"]) for e in media.load_queue(self.state)]

    def test_vl_command_prints_json_and_closes_its_own_queue_entry(self):
        # 새 릴스는 추출 전에 목록에 들어가고, ok면 이번 호출이 닫는다(처리 기록이 없어 extracted).
        self.assertEqual(self.command(self.folder("video.mp4", "audio.mp4"), duration=31), (0, {
            "id": ID, "status": "ok", "frames": 4, "screen_lines": 2, "transcript_chars": len(SPEECH), "note": ""}))
        self.assertEqual([q[:3] for q in self.queue()], [(ID, "extracted", 0)])
        # 입력 오류(이미 처리한 릴스의 재실행, 잘못된 폴더)는 목록을 늘리지 않는다.
        rc, report = self.command(self.root / "nowhere" / ID)
        self.assertEqual((rc, report["status"]), (1, "failed"))
        self.assertIn("이미 처리했다", report["note"])
        other = self.state / "inbox" / "instagram" / "Reel_Other1.md"
        other.write_text(lead_text("Reel_Other1"), encoding="utf-8")
        self.assertEqual(self.command(self.root / "nowhere" / "Reel_Other1", "Reel_Other1")[0], 1)
        self.assertEqual([q[0] for q in self.queue()], [ID])

    def test_empty_and_failed_runs_leave_the_queue_as_documented(self):
        self.tools.ocr, self.tools.speech = "", None
        # 한쪽 트랙만 받아 한 단계가 돌지 못했으면 내용 없음이 아니라 실패다. pending으로 남아 다시 받는다.
        rc, report = self.command(self.folder("audio.mp4"))
        self.assertEqual((rc, report["status"]), (1, "failed"))
        self.assertIn("video.mp4가 없다", report["note"])
        self.assertEqual(self.queue()[0][:3], (ID, "pending", 0))
        # 두 단계가 모두 돈 empty는 실패가 아니지만 같은 릴스를 다시 받지 않게 닫는다.
        self.assertEqual(self.command(self.folder("video.mp4", "audio.mp4"))[0], 0)
        self.assertEqual(self.queue(), [(ID, "dropped", 0, "화면 글자와 말소리가 없다")])
        new = self.state / "inbox" / "instagram" / "Reel_Fail1.md"
        new.write_text(lead_text("Reel_Fail1"), encoding="utf-8")
        self.tools.fail = {"ffmpeg", "stt"}  # failed는 pending으로 남아 다음 실행이 다시 시도한다.
        rc, report = self.command(self.folder("video.mp4", "audio.mp4", reel_id="Reel_Fail1"), "Reel_Fail1")
        self.assertEqual(rc, 1)
        self.assertTrue(report["note"].endswith("; 소급 추출 대기 목록에 넣었다"), report["note"])
        self.assertEqual(self.queue()[-1][:3], ("Reel_Fail1", "pending", 0))
        rc, report = self.command(self.folder("video.mp4", "audio.mp4", reel_id="Reel_Fail1"), "Reel_Fail1")
        self.assertNotIn("대기 목록", report["note"])  # 이미 목록에 있으면 다시 넣지 않는다.
        self.assertEqual(len(self.queue()), 2)

    def test_existing_pending_entries_are_closed_by_the_result(self):
        other = self.state / "inbox" / "instagram" / "Reel_Other1.md"
        other.write_text(lead_text("Reel_Other1"), encoding="utf-8")
        self.vl(vl.cmd_reel_backfill, action="add", ids=[ID, "Reel_Other1"])
        self.command(self.folder("video.mp4", "audio.mp4"))  # 원래 있던 항목도 ok면 이 호출이 닫는다.
        self.assertEqual(self.queue()[0][:2], (ID, "extracted"))
        rc, report = self.vl(vl.cmd_reel_backfill, action="mark", id=ID, gone=False)  # 뒤따르는 mark는 바꾸지 않는다.
        self.assertEqual((rc, report["state"]), (0, "extracted"))
        self.tools.ocr, self.tools.speech = "", None
        self.command(self.folder("video.mp4", "audio.mp4", reel_id="Reel_Other1"), "Reel_Other1")
        self.assertEqual(self.queue()[1][:2], ("Reel_Other1", "dropped"))

    def test_sigterm_ends_tools_and_removes_the_folder(self):
        folder = self.folder("video.mp4")
        tools, pidfile = self.root / "bin", self.root / "ffmpeg.pid"
        tools.mkdir()
        (tools / "ffmpeg").write_text(f"#!/bin/sh\necho $$ > {pidfile}\nexec sleep 60\n")
        (tools / "ffmpeg").chmod(0o755)
        env = os.environ | {"PATH": f"{tools}:{os.environ['PATH']}", "VAULT_LEARN_STATE": str(self.state),
                            "PYTHONDONTWRITEBYTECODE": "1"}
        proc = subprocess.Popen([sys.executable, str(VL), "reel-extract", "--id", ID, "--dir", str(folder)], env=env,
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            for _ in range(400):  # 가짜 ffmpeg가 시작할 때까지 기다린다(부하가 크면 VL 시작이 느리다).
                if pidfile.exists() and pidfile.read_text().strip():
                    break
                time.sleep(0.05)
            else:
                self.fail(f"가짜 ffmpeg가 시작하지 않았다(VL 종료 코드 {proc.poll()})")
            proc.send_signal(signal.SIGTERM)
            self.assertEqual(proc.wait(timeout=30), 128 + signal.SIGTERM)
        finally:
            if proc.poll() is None:
                proc.kill()
        self.assertTrue(gone(int(pidfile.read_text())))
        self.assertFalse(folder.exists())
        self.assertEqual(self.text(), LEAD)
        self.assertEqual([q[:3] for q in self.queue()], [(ID, "pending", 0)])  # 다음 실행이 다시 시도한다.


class BackfillTests(StateCase):
    def setUp(self):
        super().setUp()
        box = self.state / "inbox" / "instagram"
        for reel_id, kind in (("Reel_Skip1", "reel"), ("Reel_Def1", "reel"), ("Reel_New1", "reel"),
                              ("Reel_Done1", "reel"), ("Reel_Pers1", "reel"), ("Reel_Quote1", '"reel"'),
                              ("Reel_Old1", "reel"), ("Post_One1", "post")):
            (box / f"{reel_id}.md").write_text(lead_text(reel_id, kind), encoding="utf-8")
        (box / "Reel_Has1.md").write_text(lead_text("Reel_Has1") + f"\n## Transcript\n\n{media.TRANSCRIPT_SOURCE}\n\n가\n",
                                          encoding="utf-8")
        self.log({"key": "insta:Reel_Skip1", "result": "skipped", "ts": "2026-11-01T09:00:00+09:00", "note": "짧다"},
                 {"key": "insta:Reel_Def1", "result": "deferred", "ts": "2026-10-01T09:00:00+09:00"},
                 {"key": "insta:Reel_Def1", "result": "deferred", "ts": "2026-10-10T09:00:00+09:00"},
                 {"key": "insta:Reel_Done1", "result": "skipped", "ts": "2026-11-01T09:00:00+09:00"},
                 {"key": "insta:Reel_Done1", "result": "learned", "ts": "2026-11-02T09:00:00+09:00"},
                 {"key": "insta:Reel_Pers1", "result": "skipped", "ts": "2026-11-01T09:00:00+09:00",
                  "note": "personal"},
                 # 한 번 보류하고 7일이 지나 이미 후보로 돌아온 단서
                 {"key": "insta:Reel_Old1", "result": "deferred", "ts": "2026-10-01T09:00:00+09:00"})

    def backfill(self, action, **args):
        return self.vl(vl.cmd_reel_backfill, action=action, **args)

    def queue(self):
        return [(e["id"], e["state"], int(e["tries"])) for e in media.load_queue(self.state)]

    def test_add_rejects_with_reasons_and_keeps_listed_ids(self):
        ids = ["Reel_Skip1", "Reel_Def1", "Reel_New1", "Reel_Quote1", "Reel_Skip1", "Reel_Done1", "Reel_Pers1",
               "Post_One1", "Reel_Has1", "Reel_None1", "../x"]
        rc, report = self.backfill("add", ids=ids)
        self.assertEqual(rc, 0)
        self.assertEqual(report["added"], ["Reel_Skip1", "Reel_Def1", "Reel_New1", "Reel_Quote1"])
        reasons = {r["id"]: r["reason"] for r in report["rejected"]}
        self.assertEqual(reasons, {"Reel_Done1": "이미 반영했다(learned)", "Reel_Pers1": "personal로 건너뛴 단서다",
                                   "Post_One1": "릴스가 아니다(kind: post)", "Reel_Has1": "이미 추출한 절이 있다",
                                   "Reel_None1": "단서 파일이 없다", "../x": "id 형식이 아니다"})
        self.assertEqual(report["pending"], 4)
        rc, report = self.backfill("add", ids=["Reel_Skip1"])
        self.assertEqual(report["rejected"], [{"id": "Reel_Skip1", "reason": "이미 목록에 있다(pending)"}])
        header = (self.state / "inbox" / "instagram" / "BACKFILL.tsv").read_text(encoding="utf-8").splitlines()[0]
        self.assertEqual(header, "id\tstate\ttries\tupdated\tnote")

    def with_sections(self, reel_id):
        path = self.state / "inbox" / "instagram" / f"{reel_id}.md"
        path.write_text(media.merge(path.read_text(encoding="utf-8"),
                                    {media.SCREEN: None, media.TRANSCRIPT: f"{media.TRANSCRIPT_SOURCE}\n\n가"}),
                        encoding="utf-8")

    def reopened(self):
        return [r["key"] for r in vl.read_jsonl(self.state / "digests" / "log.jsonl") if r["result"] == "reopened"]

    def test_next_follows_list_order_count_and_setting(self):
        self.backfill("add", ids=["Reel_Skip1", "Reel_Def1", "Reel_New1"])
        rc, report = self.backfill("next", n=None)  # 기본값 instagram_backfill_per_run 6
        self.assertEqual([i["id"] for i in report["items"]], ["Reel_Skip1", "Reel_Def1", "Reel_New1"])
        self.assertEqual(report["pending"], 0)
        self.assertEqual(self.backfill("next", n=2)[1], {"items": report["items"][:2], "pending": 1})
        self.assertEqual(self.backfill("next", n=0)[1], {"items": [], "pending": 3})
        vl.write_json(self.state / "config.json", {"instagram_backfill_per_run": 0})
        self.assertEqual(self.backfill("next", n=None)[1]["items"], [])
        vl.write_json(self.state / "config.json", {"instagram_backfill_per_run": 1})
        self.assertEqual([i["id"] for i in self.backfill("next", n=None)[1]["items"]], ["Reel_Skip1"])

    def test_next_builds_urls_from_the_checked_id_not_the_lead(self):
        path = self.state / "inbox" / "instagram" / "Reel_Skip1.md"
        path.write_text(path.read_text(encoding="utf-8").replace("https://www.instagram.com/reel/Reel_Skip1/",
                                                                 "https://evil.example.com/x"), encoding="utf-8")
        self.backfill("add", ids=["Reel_Skip1", "Reel_Def1"])
        self.assertEqual([i["url"] for i in self.backfill("next", n=None)[1]["items"]],
                         ["https://www.instagram.com/p/Reel_Skip1/", "https://www.instagram.com/p/Reel_Def1/"])

    def test_next_closes_items_that_no_longer_qualify(self):
        box = self.state / "inbox" / "instagram"
        (box / "Reel_Fresh1.md").write_text(lead_text("Reel_Fresh1"), encoding="utf-8")
        self.backfill("add", ids=["Reel_Skip1", "Reel_New1", "Reel_Quote1", "Reel_Old1", "Reel_Fresh1", "Reel_Def1"])
        # 넣은 뒤 learn이 personal로 건너뛰거나 반영했고, 단서가 없어졌거나 절이 이미 생겼다.
        self.log({"key": "insta:Reel_New1", "result": "skipped", "ts": "2026-11-18T09:00:00+09:00", "note": "personal"},
                 {"key": "insta:Reel_Quote1", "result": "merged", "ts": "2026-11-18T09:00:00+09:00", "commit": "abc"})
        (box / "Reel_Old1.md").unlink()
        self.with_sections("Reel_Skip1")
        self.with_sections("Reel_Fresh1")
        rc, report = self.backfill("next", n=None)
        self.assertEqual(report, {"items": [{"id": "Reel_Def1", "url": "https://www.instagram.com/p/Reel_Def1/"}],
                                  "pending": 0})
        self.assertEqual({e["id"]: (e["state"], e["note"]) for e in media.load_queue(self.state)}, {
            "Reel_Skip1": ("reopened", ""), "Reel_Fresh1": ("extracted", ""),
            "Reel_New1": ("dropped", "personal로 건너뛴 단서다"), "Reel_Quote1": ("dropped", "이미 반영했다(merged)"),
            "Reel_Old1": ("dropped", "단서 파일이 없다"), "Reel_Def1": ("pending", "")})
        self.assertEqual(self.reopened(), ["insta:Reel_Skip1"])
        self.assertNotIn("insta:Reel_Skip1", vl.processed_keys())
        self.assertEqual(self.backfill("next", n=None)[1]["items"], report["items"])  # 다시 불러도 같다.
        self.assertEqual(self.reopened(), ["insta:Reel_Skip1"])

    def test_mark_does_not_reopen_personal_skips(self):
        (self.state / "inbox" / "instagram" / "Reel_Late1.md").write_text(lead_text("Reel_Late1"), encoding="utf-8")
        self.backfill("add", ids=["Reel_Late1"])
        self.log({"key": "insta:Reel_Late1", "result": "skipped", "ts": "2026-11-18T09:00:00+09:00", "note": "personal"})
        self.with_sections("Reel_Late1")
        self.assertEqual(self.backfill("mark", id="Reel_Late1", gone=False)[1]["state"], "extracted")
        self.assertEqual(self.reopened(), [])

    def test_reflected_or_personal_keys_are_never_reopened(self):
        box = self.state / "inbox" / "instagram"
        for reel_id in ("Reel_Swept1", "Reel_Swept2", "Reel_Late2"):
            (box / f"{reel_id}.md").write_text(lead_text(reel_id), encoding="utf-8")
        # 일괄 정리처럼 반영(merged)이나 personal 뒤에 다른 사유의 skipped가 붙어도 마지막 행으로 판정하지 않는다.
        self.log({"key": "insta:Reel_Swept1", "result": "merged", "ts": "2026-10-01T09:00:00+09:00", "commit": "abc"},
                 {"key": "insta:Reel_Swept1", "result": "skipped", "ts": "2026-10-14T09:00:00+09:00", "note": "정리"},
                 {"key": "insta:Reel_Swept2", "result": "skipped", "ts": "2026-10-01T09:00:00+09:00", "note": "personal"},
                 {"key": "insta:Reel_Swept2", "result": "skipped", "ts": "2026-10-14T09:00:00+09:00", "note": "정리"})
        rejected = {r["id"]: r["reason"] for r in self.backfill("add", ids=["Reel_Swept1", "Reel_Swept2"])[1]["rejected"]}
        self.assertEqual(rejected, {"Reel_Swept1": "이미 반영했다(merged)", "Reel_Swept2": "personal로 건너뛴 단서다"})
        # 목록에 있는 동안 learn이 반영한 단서에 절이 생겨도 mark와 next 모두 다시 열지 않는다.
        self.backfill("add", ids=["Reel_New1", "Reel_Late2"])
        self.log({"key": "insta:Reel_New1", "result": "learned", "ts": "2026-11-18T09:00:00+09:00", "commit": "abc"},
                 {"key": "insta:Reel_Late2", "result": "merged", "ts": "2026-11-18T09:00:00+09:00", "commit": "abc"},
                 {"key": "insta:Reel_Late2", "result": "skipped", "ts": "2026-11-18T10:00:00+09:00", "note": "정리"})
        self.with_sections("Reel_New1")
        self.with_sections("Reel_Late2")
        self.assertEqual(self.backfill("mark", id="Reel_New1", gone=False)[1]["state"], "extracted")
        self.assertEqual(self.backfill("next", n=None)[1]["items"], [])
        self.assertEqual(self.queue(), [("Reel_New1", "extracted", 1), ("Reel_Late2", "extracted", 0)])
        self.assertEqual(self.reopened(), [])
        # 읽는 쪽도 막는다. 반영한 key에 reopened 행이 있어도 처리 끝으로 남는다.
        self.log({"key": "insta:Reel_Late2", "result": "reopened", "ts": "2026-11-18T11:00:00+09:00"})
        self.assertIn("insta:Reel_Late2", vl.processed_keys())

    def test_interrupted_reopen_is_not_repeated(self):
        # reopened 행은 덧붙였는데 목록 저장 전에 끊긴 상태. 다음 next와 mark는 extracted로 닫고 행을 더 쓰지 않는다.
        self.backfill("add", ids=["Reel_Skip1", "Reel_Def1"])
        for reel_id in ("Reel_Skip1", "Reel_Def1"):
            self.with_sections(reel_id)
            self.log({"key": f"insta:{reel_id}", "result": "reopened", "ts": "2026-11-18T09:00:00+09:00"})
        self.assertEqual(self.backfill("mark", id="Reel_Skip1", gone=False)[1]["state"], "extracted")
        self.assertEqual(self.backfill("next", n=None)[1]["items"], [])
        self.assertEqual(self.queue(), [("Reel_Skip1", "extracted", 1), ("Reel_Def1", "extracted", 0)])
        self.assertEqual(sorted(self.reopened()), ["insta:Reel_Def1", "insta:Reel_Skip1"])

    def test_a_key_is_reopened_only_once(self):
        # reopened 행을 쓴 뒤 목록 저장 전에 끊겼고, 그사이 learn이 그 단서를 또 건너뛰었다. 한 번 더 열지 않는다.
        self.backfill("add", ids=["Reel_Skip1"])
        self.with_sections("Reel_Skip1")
        self.log({"key": "insta:Reel_Skip1", "result": "reopened", "ts": "2026-11-18T09:00:00+09:00"},
                 {"key": "insta:Reel_Skip1", "result": "skipped", "ts": "2026-11-18T10:00:00+09:00", "note": "짧다"})
        self.assertEqual(self.backfill("mark", id="Reel_Skip1", gone=False)[1]["state"], "extracted")
        self.assertEqual(self.reopened(), ["insta:Reel_Skip1"])
        self.assertIn("insta:Reel_Skip1", vl.processed_keys())

    def test_extract_reopens_a_revived_dropped_reel_once(self):
        self.backfill("add", ids=["Reel_Skip1"])
        self.backfill("mark", id="Reel_Skip1", gone=True)
        folder = self.folder("video.mp4", "audio.mp4", reel_id="Reel_Skip1")
        self.assertEqual(self.vl(vl.cmd_reel_extract, id="Reel_Skip1", dir=str(folder), duration=None)[1]["status"], "ok")
        self.assertEqual(self.queue(), [("Reel_Skip1", "reopened", 0)])
        self.backfill("mark", id="Reel_Skip1", gone=False)
        self.backfill("next", n=None)
        self.assertEqual(self.reopened(), ["insta:Reel_Skip1"])

    def test_add_revives_dropped_entries_that_still_qualify(self):
        self.backfill("add", ids=["Reel_Skip1", "Reel_New1", "Reel_Def1"])
        for reel_id in ("Reel_Skip1", "Reel_New1"):
            self.backfill("mark", id=reel_id, gone=True)
        self.log({"key": "insta:Reel_New1", "result": "learned", "ts": "2026-11-18T09:00:00+09:00", "commit": "abc"})
        rc, report = self.backfill("add", ids=["Reel_Skip1", "Reel_New1", "Reel_Def1"])
        self.assertEqual(report["added"], ["Reel_Skip1"])
        self.assertEqual({r["id"]: r["reason"] for r in report["rejected"]},
                         {"Reel_New1": "이미 반영했다(learned)", "Reel_Def1": "이미 목록에 있다(pending)"})
        self.assertEqual(self.queue(), [("Reel_New1", "dropped", 1), ("Reel_Def1", "pending", 0),
                                        ("Reel_Skip1", "pending", 0)])

    def test_mark_transitions(self):
        self.backfill("add", ids=["Reel_Skip1", "Reel_Def1", "Reel_New1", "Reel_Quote1", "Reel_Old1"])
        # 절이 없으면 한 번은 목록 끝으로, 두 번째는 dropped. --gone은 바로 dropped.
        self.assertEqual(self.backfill("mark", id="Reel_Skip1", gone=False)[1]["state"], "pending")
        self.assertEqual(self.queue()[-1], ("Reel_Skip1", "pending", 1))
        self.assertEqual(self.backfill("mark", id="Reel_Skip1", gone=False)[1]["state"], "dropped")
        self.assertEqual(self.backfill("mark", id="Reel_Quote1", gone=True)[1], {"id": "Reel_Quote1", "state": "dropped",
                                                                                "tries": 1})
        # 절이 생겼고 skipped나 deferred로 끝난 key는 다시 열고, 처리 기록이 없거나 이미 후보인 key는 extracted다.
        for reel_id in ("Reel_Def1", "Reel_New1", "Reel_Old1"):
            self.with_sections(reel_id)
        self.assertEqual(self.backfill("mark", id="Reel_Def1", gone=False)[1]["state"], "reopened")
        self.assertEqual(self.backfill("mark", id="Reel_New1", gone=False)[1]["state"], "extracted")
        self.assertEqual(self.backfill("mark", id="Reel_Old1", gone=False)[1]["state"], "extracted")
        rows = vl.read_jsonl(self.state / "digests" / "log.jsonl")
        self.assertEqual([(r["key"], r["result"]) for r in rows[-1:]], [("insta:Reel_Def1", "reopened")])
        self.assertEqual(sum(r["result"] == "reopened" for r in rows), 1)
        self.assertNotIn("insta:Reel_Def1", vl.processed_keys())
        # 끝난 항목은 바꾸지 않고, 목록에 없는 id는 오류다.
        rc, report = self.backfill("mark", id="Reel_Def1", gone=True)
        self.assertEqual((rc, report["state"]), (0, "reopened"))
        self.assertEqual(self.backfill("mark", id="Reel_None1", gone=False)[0], 1)
        self.assertEqual(sorted(self.queue()), [("Reel_Def1", "reopened", 1), ("Reel_New1", "extracted", 1),
                                                ("Reel_Old1", "extracted", 1), ("Reel_Quote1", "dropped", 1),
                                                ("Reel_Skip1", "dropped", 2)])

    def test_status_and_index_show_reopened_leads_as_new(self):
        self.backfill("add", ids=["Reel_Skip1", "Reel_New1"])
        self.backfill("mark", id="Reel_New1", gone=True)
        self.assertEqual(vl.state_summary()["reel_backfill"], {"pending": 1, "dropped": 1})
        self.log({"key": "insta:Reel_Skip1", "result": "reopened", "ts": "2026-11-18T09:00:00+09:00"})
        with contextlib.redirect_stdout(io.StringIO()):
            vl.cmd_inbox_reindex(argparse.Namespace(source="instagram", dry_run=False, complete=[]))
        index = {r[1]: r[2] for r in vl.rows(self.state / "inbox" / "instagram" / "INDEX.tsv")[1:]}
        self.assertEqual((index["Reel_Skip1"], index["Reel_Done1"], index["Reel_New1"]), ("new", "learned", "new"))
        summary = vl.state_summary()
        self.assertEqual(summary["processed"]["reopened"], 1)
        # 단서 10개 중 Reel_Def1(두 번 보류), Reel_Done1, Reel_Pers1만 처리 끝이고 다시 연 Reel_Skip1은 아니다.
        self.assertEqual(summary["leads_unlearned"]["instagram"], 7)

    def test_skipped_reel_returns_to_pick_after_backfill(self):
        self.assertNotIn("insta:Reel_Skip1", {x["key"] for x in vl.pick_data(6)["tier1"]})
        self.backfill("add", ids=["Reel_Skip1"])
        item = self.backfill("next", n=None)[1]["items"][0]
        self.assertEqual(item["id"], "Reel_Skip1")
        report = self.vl(vl.cmd_reel_extract, id="Reel_Skip1", dir=str(self.folder("video.mp4", "audio.mp4",
                                                                                reel_id="Reel_Skip1")), duration=31)[1]
        self.assertEqual(report["status"], "ok")
        self.assertEqual(self.queue()[0], ("Reel_Skip1", "reopened", 0))  # 추출이 ok면 그 호출이 닫고 다시 연다.
        self.assertEqual(self.backfill("mark", id="Reel_Skip1", gone=False)[1]["state"], "reopened")
        self.assertEqual(self.reopened(), ["insta:Reel_Skip1"])
        tier1 = {x["key"]: x for x in vl.pick_data(6)["tier1"]}
        self.assertIs(tier1["insta:Reel_Skip1"]["extracted"], True)  # learn이 제목만 보고 건너뛰지 않게 표시한다.
        self.assertNotIn("extracted", tier1["insta:Reel_New1"])
        self.log({"key": "insta:Reel_Skip1", "result": "skipped", "ts": "2026-11-18T10:00:00+09:00"})
        self.assertNotIn("insta:Reel_Skip1", {x["key"] for x in vl.pick_data(6)["tier1"]})  # 다시 처리하면 끝이다.


class RunTests(unittest.TestCase):
    SCRIPT = ("import subprocess, sys, time; p = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)']); "
              "open(sys.argv[1], 'w').write(str(p.pid)); time.sleep(60)")

    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.pidfile = Path(temp.name) / "grandchild.pid"

    def grandchild(self):
        for _ in range(400):
            if self.pidfile.exists() and self.pidfile.read_text().strip():
                return int(self.pidfile.read_text())
            time.sleep(0.05)
        self.fail("손자 프로세스가 시작하지 않았다")

    def test_missing_tool_and_output(self):
        with self.assertRaisesRegex(RuntimeError, r"실행하지 못했다\(reel-tool\)"):
            media.run(["/nonexistent/reel-tool"], 5)
        self.assertEqual(media.run([sys.executable, "-c", "print('ok')"], 10).stdout, "ok\n")

    def test_timeout_ends_the_whole_process_group(self):
        begin = time.time()
        with self.assertRaisesRegex(RuntimeError, r"시간 제한 5초"):
            media.run([sys.executable, "-c", self.SCRIPT, str(self.pidfile)], 5)
        self.assertLess(time.time() - begin, 15)
        self.assertTrue(gone(self.grandchild()))

    def test_sigterm_during_a_tool_ends_the_whole_process_group(self):
        def terminate():
            self.grandchild()
            os.kill(os.getpid(), signal.SIGTERM)

        previous = signal.signal(signal.SIGTERM, lambda signum, _frame: sys.exit(128 + signum))
        try:
            threading.Thread(target=terminate, daemon=True).start()
            with self.assertRaises(SystemExit):
                media.run([sys.executable, "-c", self.SCRIPT, str(self.pidfile)], 60)
        finally:
            signal.signal(signal.SIGTERM, previous)
        self.assertTrue(gone(self.grandchild()))


class TrackHelperTests(unittest.TestCase):
    @unittest.skipUnless(shutil.which("node"), "node가 없다")
    def test_node_check(self):
        check = subprocess.run(["node", str(Path(__file__).with_name("test_reel_tracks.mjs"))], capture_output=True,
                               text=True, timeout=60)
        self.assertEqual((check.returncode, check.stdout.strip()), (0, "reel_tracks ok"), check.stderr)


MODELS = Path(os.environ.get("WHISPER_CPP_MODEL_DIR", "~/.cache/whisper-cpp")).expanduser()
REAL = all(shutil.which(tool) for tool in ("ffmpeg", "ffprobe", "swiftc", "whisper-cli", "say")) and all(
    (MODELS / name).exists() for name in ("ggml-large-v3-turbo.bin", "ggml-silero-v6.2.0.bin"))


@unittest.skipUnless(REAL, "ffmpeg, swiftc, whisper-cli와 모델, say 중 없는 것이 있다")
class RealToolsTests(unittest.TestCase):
    """실제 도구로 ffmpeg 인자, 빌드, reel-ocr 출력 형식, 전사 스크립트의 종료 계약과 말소리 없음 처리만 본다(내용은 보지 않는다)."""

    def test_synthetic_reel_end_to_end(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            state, folder = root / "state", root / "state" / "tmp" / "vault-learn-instagram-test-reels" / ID
            (state / "inbox" / "instagram").mkdir(parents=True)
            folder.mkdir(parents=True)
            lead = state / "inbox" / "instagram" / f"{ID}.md"
            lead.write_text(LEAD, encoding="utf-8")

            def make(*args):
                subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True, timeout=60)

            subprocess.run(["say", "-o", str(root / "speech.aiff"), "This is a short test sentence for the reel "
                            "transcript check."], check=True, timeout=60)
            make("-i", str(root / "speech.aiff"), "-c:a", "aac", str(folder / "audio.mp4"))
            length = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                           "csv=p=0", str(folder / "audio.mp4")], capture_output=True, text=True,
                                          check=True).stdout)
            make("-f", "lavfi", "-i", f"testsrc2=duration={length:.2f}:size=640x360:rate=10", "-c:v", "mpeg4",
                 str(folder / "video.mp4"))  # testsrc2는 시각과 프레임 번호를 그린다(drawtext 필터가 없어도 된다).
            make("-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "3", "-c:a", "aac", str(root / "silence.mp4"))
            report = media.extract(state, ID, folder, 4, vl.TRANSCRIBE, round(length))
            self.assertEqual(report["status"], "ok", report)
            self.assertTrue(report["frames"] >= 1 and report["screen_lines"] >= 1 and report["transcript_chars"] > 0,
                            report)
            self.assertFalse(folder.exists())
            text = lead.read_text(encoding="utf-8")
            screen = text.split("## Screen text\n\n", 1)[1].split("\n\n## Transcript", 1)[0].splitlines()
            self.assertEqual(screen[:2], [media.SCREEN_SOURCE, ""])
            self.assertTrue(all(re.fullmatch(r"\[\d\d:\d\d\] \S.*", line) for line in screen[2:]), screen)
            self.assertTrue(text.split("## Transcript\n\n", 1)[1].startswith(media.TRANSCRIPT_SOURCE))
            binary = state / "bin" / "reel-ocr"
            self.assertTrue(binary.exists())
            (root / "bad.jpg").write_bytes(b"not an image")
            self.assertEqual(subprocess.run([str(binary), str(root / "bad.jpg")], capture_output=True).returncode, 1)
            self.assertEqual(media.transcript(root / "silence.mp4", root / "stt", 4, vl.TRANSCRIBE), ("", []))
            # audio.mp4 없이 음성 스트림이 없는 video.mp4만 받은 경우: 전사를 건너뛰고 화면 글자만 쓴다.
            lead.write_text(LEAD, encoding="utf-8")
            folder.mkdir()
            make("-f", "lavfi", "-i", "testsrc2=duration=3:size=640x360:rate=10", "-c:v", "mpeg4",
                 str(folder / "video.mp4"))
            report = media.extract(state, ID, folder, 4, vl.TRANSCRIBE, 3)
            self.assertEqual((report["status"], report["note"], report["transcript_chars"]),
                             ("ok", "전사: 음성 트랙이 없다", 0), report)
            text = lead.read_text(encoding="utf-8")
            self.assertIn("## Screen text", text)
            self.assertNotIn("## Transcript", text)


if __name__ == "__main__":
    unittest.main()
