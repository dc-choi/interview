#!/usr/bin/env python3
"""vault_guard 자체 검사: python3 .claude/hooks/test_vault_guard.py
실제 작업 트리를 건드리지 않도록 임시 worktree에 현재 hook과 검사기를 복사해 post와 commit을 시험한다."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SRC = Path(__file__).resolve().parents[2]
COPY = [".claude/hooks/vault_guard.py", ".claude/skills/auto-learn/scripts/vault_learn.py", ".githooks/pre-commit", ".githooks/commit-msg"]
ENV = os.environ | {"CLAUDE_HARNESS_STATE": tempfile.mkdtemp()}


def run(repo, mode, data):
    p = subprocess.run([sys.executable, str(repo / ".claude/hooks/vault_guard.py"), mode], input=json.dumps(data),
                       capture_output=True, text=True, env=ENV, cwd=repo)
    return p.returncode, p.stdout + p.stderr


def edit(path, tool="Write", session="s1"):
    return {"tool_name": tool, "session_id": session, "tool_input": {"file_path": str(path)}}


def commit(repo, *files, msg="t"):
    subprocess.run(["git", "add", "--", *files], cwd=repo, check=True, capture_output=True)
    p = subprocess.run(["git", "-c", "core.hooksPath=.githooks", "-c", "user.name=T", "-c", "user.email=t@example.com", "commit", "-qm", msg],
                       cwd=repo, capture_output=True, text=True, env=ENV)
    # reset --hard는 복사해 둔 수정본(vault_learn.py)까지 HEAD로 되돌리므로 시험 파일만 unstage한다.
    subprocess.run(["git", "reset", "-q", "--", *files], cwd=repo, capture_output=True)
    return p.returncode, p.stderr


FM = "---\nstatus: done\n---\n"
wt = Path(tempfile.mkdtemp()) / "wt"
subprocess.run(["git", "worktree", "add", "-q", "--detach", str(wt), "HEAD"], cwd=SRC, check=True, capture_output=True)
try:
    for f in COPY:
        (wt / f).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SRC / f, wt / f)

    # pre: 금지 경로만 막는다(가운뎃점 사전 차단은 PC 하네스 몫)
    assert run(wt, "pre", edit(wt / "tech/CLAUDE.md"))[0] == 2
    assert run(wt, "pre", edit(wt / ".claude/CLAUDE.md"))[0] == 2
    assert run(wt, "pre", edit(Path.home() / ".claude/projects/x/memory/a.md"))[0] == 2
    assert run(wt, "pre", edit(wt / "tech/a.md")) == (0, "")
    assert run(wt, "pre", edit(Path.home() / ".claude/CLAUDE.md")) == (0, "")  # 저장소 밖 사용자 설정은 허용

    # post
    doc = wt / "tech/Vault-Guard-Selftest.md"
    doc.write_text(FM + "[[없는-문서-zzz]]\n")
    code, out = run(wt, "post", edit(doc))
    assert code == 2 and "깨진 위키링크" in out and "작성 예정" in out, out
    doc.write_text(FM + "명세 표기 `[[Prototype]]`\n")
    assert run(wt, "post", edit(doc)) == (0, ""), run(wt, "post", edit(doc))
    doc.write_text(FM + "연락 010-1234-5678\n")
    assert run(wt, "post", edit(doc))[0] == 2
    doc.write_text(FM + "줄\n" * 210)
    code, out = run(wt, "post", edit(doc, "Edit"))
    assert code == 0 and "Parent-as-TOC" in out, out
    assert run(wt, "post", edit(doc, "Edit")) == (0, "")  # 같은 세션 반복 안내 없음
    doc.write_text("---\nstatus: index\n---\n" + "줄\n" * 210)
    assert run(wt, "post", edit(doc, "Edit", "s2")) == (0, "")
    doc.unlink()
    skill = wt / ".claude/skills/zz-test/SKILL.md"
    skill.parent.mkdir(parents=True)
    skill.write_text("---\nname: zz\n---\n상태 경로 ~/.local/state/vault-auto-learn\n")
    assert run(wt, "post", edit(skill)) == (0, "")  # 동명 SKILL.md와 auto-learn 전용 검사는 지식 문서에만

    # commit: 한글 경로, 동명 파일, CLAUDE.md는 막고 새 스킬은 통과
    ko = wt / "tech/한글-검사.md"
    ko.write_text(FM + "A\u00b7B\n")
    code, err = commit(wt, str(ko))
    assert code != 0 and "U+00B7" in err, err
    ko.unlink()
    name = next(n for n in subprocess.run(["git", "ls-files", "-z", "tech/*.md"], cwd=wt, capture_output=True, text=True).stdout.split("\0")
                if n.isascii() and not n.endswith("AGENTS.md"))
    dup = wt / "biz" / Path(name).name
    dup.write_text(FM + "x\n")
    code, err = commit(wt, str(dup))
    assert code != 0 and "동명 파일" in err, err
    dup.unlink()
    # 같은 커밋의 새 파일끼리도 동명이면 막는다
    n1, n2 = wt / "tech/New-Pair-Selftest.md", wt / "biz/New-Pair-Selftest.md"
    n1.write_text(FM + "x\n"); n2.write_text(FM + "y\n")
    code, err = commit(wt, str(n1), str(n2))
    assert code != 0 and "동명 파일" in err, err
    n1.unlink(); n2.unlink()
    (wt / "tech/CLAUDE.md").write_text("x")
    assert commit(wt, "tech/CLAUDE.md")[0] != 0
    (wt / "tech/CLAUDE.md").unlink()
    # Threads 출처는 수동 지식 문서에서 막지 않는다(auto-learn 게시 검사 몫)
    th = wt / "tech/Threads-Source-Selftest.md"
    th.write_text(FM + "- [글](https://www.threads.com/@a/post/1)\n")
    assert run(wt, "post", edit(th)) == (0, ""), run(wt, "post", edit(th))
    th.unlink()
    ig = wt / "tech/Instagram-Source-Selftest.md"
    ig.write_text(FM + "- [글](https://www.instagram.com/p/abc/)\n")
    assert run(wt, "post", edit(ig))[0] == 2  # Instagram 링크는 계속 막는다
    ig.unlink()
    # 부분 stage는 막는다
    ps = wt / "tech/Partial-Stage-Selftest.md"
    ps.write_text(FM + "ok\n")
    subprocess.run(["git", "add", str(ps)], cwd=wt, check=True)
    ps.write_text(FM + "ok\nmore\n")
    p = subprocess.run(["git", "-c", "core.hooksPath=.githooks", "-c", "user.name=T", "-c", "user.email=t@example.com", "commit", "-qm", "t"],
                       cwd=wt, capture_output=True, text=True, env=ENV)
    assert p.returncode != 0 and "작업 트리" in p.stderr, p.stderr
    subprocess.run(["git", "reset", "-q", "--", str(ps)], cwd=wt)
    ps.unlink()
    # 커밋 메시지의 가운뎃점은 막는다. -m의 # 줄도 커밋에 남으므로 검사한다
    assert commit(wt, str(skill), msg="A\u00b7B")[0] != 0
    assert commit(wt, str(skill), msg="t\n\n#1 A\u00b7B")[0] != 0
    # auto-learn 게시 형태: add 뒤 수정하고 commit --only로 그 경로만 커밋하면 통과한다
    a = wt / "tech/Publish-Shape-Selftest.md"
    a.write_text(FM + "one\n")
    subprocess.run(["git", "add", "--all", "--", str(a)], cwd=wt, check=True)
    a.write_text(FM + "one\ntwo\n")
    p = subprocess.run(["git", "-c", "core.hooksPath=.githooks", "-c", "user.name=T", "-c", "user.email=t@example.com",
                        "commit", "-q", "--only", "-m", "t", "--", str(a)], cwd=wt, capture_output=True, text=True, env=ENV)
    assert p.returncode == 0, p.stderr
    # 다른 Markdown만 작업 트리에서 바뀐 상태로 한 파일을 커밋하면 통과한다
    b = wt / "tech/Other-Dirty-Selftest.md"
    b.write_text(FM + "x\n")
    subprocess.run(["git", "add", str(b)], cwd=wt, check=True)
    subprocess.run(["git", "-c", "core.hooksPath=.githooks", "-c", "user.name=T", "-c", "user.email=t@example.com",
                    "commit", "-qm", "t"], cwd=wt, check=True, env=ENV)
    b.write_text(FM + "x\ny\n")
    a.write_text(FM + "one\ntwo\nthree\n")
    assert commit(wt, str(a))[0] == 0
    assert commit(wt, str(skill))[0] == 0
finally:
    subprocess.run(["git", "worktree", "remove", "--force", str(wt)], cwd=SRC, capture_output=True)
print("ok")
