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
COPY = [".claude/hooks/vault_guard.py", ".claude/skills/auto-learn/scripts/vault_learn.py", ".githooks/pre-commit", ".githooks/commit-msg",
        *(p.relative_to(SRC).as_posix() for p in (SRC / "ontology/src").glob("*.mjs"))]
ENV = os.environ | {"CLAUDE_HARNESS_STATE": tempfile.mkdtemp()}
# node가 없는 환경: git과 python만 남긴 PATH, ~/.local/bin/node가 없는 HOME
NO_NODE = ENV | {"PATH": "/usr/bin:/bin", "HOME": tempfile.mkdtemp()}


def hook_commit(repo, env):
    """git commit 없이 pre-commit 검사만 부른다(staged 상태는 호출 전에 만든다)."""
    p = subprocess.run([sys.executable, str(repo / ".claude/hooks/vault_guard.py"), "commit"], capture_output=True, text=True, env=env, cwd=repo)
    return p.returncode, p.stderr


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
    (wt / "ontology/node_modules").symlink_to(SRC / "ontology/node_modules")

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
    # 이름이 -로 시작하는 루트 문서도 VL check가 옵션으로 읽지 않는다(커밋 검사와 편집 뒤 검사)
    dash = wt / "-Plain-Selftest.md"
    dash.write_text(FM + "# 일반\n")
    subprocess.run(["git", "add", "--", dash.name], cwd=wt, check=True)
    assert hook_commit(wt, NO_NODE) == (0, ""), hook_commit(wt, NO_NODE)
    assert run(wt, "post", edit(dash)) == (0, ""), run(wt, "post", edit(dash))
    subprocess.run(["git", "reset", "-q", "--", dash.name], cwd=wt, check=True)
    dash.unlink()

    # 온톨로지: 선언(frontmatter 키, 선언 폴더)이 없는 커밋은 node 없이도 통과하고, 있으면 node 22 이상을 요구한다
    onto = wt / "tech/Ontology-Guard-Selftest.md"
    onto.write_text(FM + "# 문제\n본문\n")
    subprocess.run(["git", "add", str(onto)], cwd=wt, check=True)
    assert hook_commit(wt, NO_NODE) == (0, ""), hook_commit(wt, NO_NODE)
    # 본문 코드 블록 안의 키 줄은 예시일 뿐 선언이 아니다
    onto.write_text(FM + "# 문제\n```yaml\nontology_concepts:\n  - {id: example}\nontology_relations: []\n```\n")
    subprocess.run(["git", "add", str(onto)], cwd=wt, check=True)
    assert hook_commit(wt, NO_NODE) == (0, ""), hook_commit(wt, NO_NODE)
    onto.write_text("---\nstatus: done\nontology_concepts:\n"
                    "  - {id: selftest-problem-zzz, type: Problem, label: Selftest Problem Zzz, evidence: \"[[#문제]]\"}\n"
                    "ontology_relations:\n"
                    "  - {subject: \"concept:selftest-problem-zzz\", predicate: addresses, target: \"concept:selftest-problem-zzz\", evidence: \"[[#문제]]\"}\n"
                    "---\n# 문제\n본문\n")
    subprocess.run(["git", "add", str(onto)], cwd=wt, check=True)
    code, err = hook_commit(wt, NO_NODE)
    assert code != 0 and "Node.js 22" in err, err
    subprocess.run(["git", "reset", "-q", "--", str(onto)], cwd=wt)
    # 새 위반(Problem이 addresses의 주어)은 사유와 frontmatter 항목을 보여 주며 막는다
    code, err = commit(wt, str(onto))
    assert code != 0 and "domain_violation" in err and "ontology_relations[0]" in err and "validate --staged" in err, err
    # auto-learn 게시 형태(commit --only)는 임시 index를 검증한다: index에는 올바른 판, 작업 트리에는 위반 판을 둔다
    invalid = onto.read_text()
    onto.write_text(FM + "# 문제\n본문\n")
    subprocess.run(["git", "add", "--all", "--", str(onto)], cwd=wt, check=True)
    onto.write_text(invalid)
    p = subprocess.run(["git", "-c", "core.hooksPath=.githooks", "-c", "user.name=T", "-c", "user.email=t@example.com",
                        "commit", "-q", "--only", "-m", "t", "--", str(onto)], cwd=wt, capture_output=True, text=True, env=ENV)
    assert p.returncode != 0 and "domain_violation" in p.stderr, p.stderr
    subprocess.run(["git", "reset", "-q", "--", str(onto)], cwd=wt)
    onto.unlink()
    # ontology/instances 아래 경로는 내용과 상관없이 검증한다
    inst = wt / "ontology/instances/Selftest-Instances-Zzz.md"
    inst.parent.mkdir(parents=True, exist_ok=True)
    inst.write_text(FM + "# Selftest instances\n")
    subprocess.run(["git", "add", str(inst)], cwd=wt, check=True)
    code, err = hook_commit(wt, NO_NODE)
    assert code != 0 and "Node.js 22" in err, err
    # 패키지가 없으면 검증을 실행하지 않고 npm ci를 안내한다
    (wt / "ontology/node_modules").unlink()
    code, err = hook_commit(wt, ENV)
    (wt / "ontology/node_modules").symlink_to(SRC / "ontology/node_modules")
    assert code != 0 and "npm ci --ignore-scripts" in err, err
    # 검증이 죽으면 스택의 끝이 아니라 원인 줄을 보여 준다
    validate_src = wt / "ontology/src/validate.mjs"
    validate_src.write_text("export const = ;\n")
    code, err = hook_commit(wt, ENV)
    shutil.copy2(SRC / "ontology/src/validate.mjs", validate_src)
    assert code != 0 and "SyntaxError: Unexpected token" in err and "Node.js v" not in err, err
    subprocess.run(["git", "reset", "-q", "--", str(inst)], cwd=wt)
    inst.unlink()
    # 어휘 경로와 지식 문서 frontmatter의 올바른 선언은 검증을 거쳐 통과한다
    vocab = wt / "ontology/vocabulary/Selftest-Vocabulary-Zzz.md"
    vocab.parent.mkdir(parents=True, exist_ok=True)
    vocab.write_text("---\ntags: [ontology]\nstatus: vocabulary\nontology_concepts:\n"
                     "  - {id: selftest-topic-zzz, type: Topic, label: Selftest Topic Zzz}\n---\n# Selftest vocabulary\n")
    decl = wt / "tech/Ontology-Declaring-Selftest.md"
    decl.write_text("---\nstatus: done\nontology_concepts:\n"
                    "  - {id: selftest-declared-zzz, type: Topic, label: Selftest Declared Zzz}\n---\n# 선언\n")
    code, err = commit(wt, str(vocab), str(decl))
    assert code == 0, err
    # 선언 문서의 삭제와 키 제거는 staged 판에 키가 없어도 HEAD 판의 frontmatter로 잡는다
    subprocess.run(["git", "rm", "-q", "--", str(decl)], cwd=wt, check=True)
    code, err = hook_commit(wt, NO_NODE)
    assert code != 0 and "Node.js 22" in err, err
    subprocess.run(["git", "checkout", "-q", "HEAD", "--", str(decl)], cwd=wt, check=True)
    decl.write_text(FM + "# 선언\n")
    subprocess.run(["git", "add", str(decl)], cwd=wt, check=True)
    code, err = hook_commit(wt, NO_NODE)
    assert code != 0 and "Node.js 22" in err, err
    subprocess.run(["git", "checkout", "-q", "HEAD", "--", str(decl)], cwd=wt, check=True)
    renamed = wt / "tech/Ontology-Declaring-Renamed-Selftest.md"
    subprocess.run(["git", "mv", "--", str(decl), str(renamed)], cwd=wt, check=True)
    code, err = hook_commit(wt, NO_NODE)
    assert code != 0 and "Node.js 22" in err, err  # 이름 변경도 선언 변경이다
    subprocess.run(["git", "mv", "--", str(renamed), str(decl)], cwd=wt, check=True)

    # 감지는 색인이 YAML로 읽는 철자를 모두 잡고, 실패한 git을 선언 없음으로 읽지 않는다.
    # node가 없는 환경에서 Node.js 안내로 막히면 hook이 validate --staged를 실행하려 했다는 뜻이다.
    shim = wt.parent / "git-shim"
    shim.mkdir()
    (shim / "git").write_text(f'#!/bin/sh\ncase " $* " in *" grep "*) echo "fatal: simulated" >&2; exit 128;; esac\n'
                              f'exec "{shutil.which("git")}" "$@"\n')
    (shim / "git").chmod(0o755)
    broken_grep = NO_NODE | {"PATH": f"{shim}:{NO_NODE['PATH']}"}
    color = NO_NODE | {"GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": "color.ui", "GIT_CONFIG_VALUE_0": "always"}

    def validates(name, body, env=NO_NODE):
        """name에 body를 새로 쓰고 stage했을 때 hook이 검증을 실행하려 하는가. 어떤 경우에도 예외로 끝나면 안 된다."""
        path = wt / name
        path.write_bytes(body if isinstance(body, bytes) else body.encode())
        subprocess.run(["git", "-c", "core.autocrlf=false", "add", "--", name], cwd=wt, check=True)
        code, err = hook_commit(wt, env)
        subprocess.run(["git", "reset", "-q", "--", name], cwd=wt, check=True)
        path.unlink()
        assert "Traceback" not in err, err
        return "Node.js 22" in err

    concept = "  - {id: selftest-edge-zzz, type: Topic, label: Selftest Edge Zzz}\n"
    declared = "---\nstatus: done\nontology_concepts:\n" + concept + "---\n# 선언\n"
    cases = [
        ("tech/온톨로지-선언-검사.md", declared, NO_NODE, True),
        ("tech/Space Name Selftest.md", declared, NO_NODE, True),
        ("tech/Paren (Selftest).md", declared, NO_NODE, True),
        ("-Dash-Selftest.md", declared, NO_NODE, True),
        ("tech/Quoted-Key-Selftest.md", declared.replace("ontology_concepts:", '"ontology_concepts":'), NO_NODE, True),
        # 큰따옴표 안 escape는 키 이름을 글자 그대로 적지 않고도 같은 키가 된다
        ("tech/Escaped-Key-Selftest.md", declared.replace("ontology_concepts:", '"ontology\\x5fconcepts":'), NO_NODE, True),
        ("tech/Continued-Key-Selftest.md", declared.replace("ontology_concepts:\n", '? "ontology_\\\n  concepts"\n:\n'), NO_NODE, True),
        # 큰따옴표 안 backslash는 key 자리가 아니어도 검증한다. anchor로 escape 값을 key로 쓰는 경우를 놓치지 않기 위한 대가다.
        ("tech/Escaped-Value-Selftest.md", '---\nstatus: done\ntitle: "C:\\\\temp"\nnote: "a \\"b\\": c"\n---\n# 일반\n', NO_NODE, True),
        ("tech/Anchored-Key-Selftest.md", declared.replace("ontology_concepts:", 'x: &k "ontology\\x5fconcepts"\n*k :'), NO_NODE, True),
        ("tech/Plain-Quote-Selftest.md", '---\nstatus: done\ntitle: "plain"\n---\n# 일반\n', NO_NODE, False),
        ("tech/Spaced-Colon-Selftest.md", declared.replace("ontology_concepts:", "ontology_concepts :"), NO_NODE, True),
        ("tech/Flow-Selftest.md", "---\n{status: done, ontology_concepts: [{id: selftest-edge-zzz, type: Topic, label: Z}]}\n---\n# 선언\n",
         NO_NODE, True),
        ("tech/Crlf-Selftest.md", declared.replace("\n", "\r\n").encode(), NO_NODE, True),
        # 닫는 줄이 없으면 색인은 파일 끝까지를 frontmatter로 읽고 선언을 잃는다(MalformedFrontmatter)
        ("tech/Unclosed-Selftest.md", "---\nstatus: done\nontology_concepts:\n" + concept + "# 선언\n", NO_NODE, True),
        ("tech/Latin1-Declared-Selftest.md", b"---\nstatus: done\nontology_concepts:\n" + concept.encode() + b"---\n# caf\xe9\n", NO_NODE, True),
        ("tech/Latin1-Plain-Selftest.md", b"---\nstatus: done\n---\n# caf\xe9\n", NO_NODE, False),
        ("tech/Body-Mention-Selftest.md", FM + "# 문제\n본문의 `ontology_relations` 설명\n", NO_NODE, False),
        ("tech/Crlf-Fence-Selftest.md", (FM + "# 문제\n```yaml\nontology_concepts:\n  - {id: example}\n```\n").replace("\n", "\r\n").encode(),
         NO_NODE, False),
        ("tech/Color-Selftest.md", declared, color, True),  # color.ui=always는 git grep 출력의 경로에 색 코드를 넣는다
        ("tech/Grep-Failure-Selftest.md", FM + "# 일반\n", broken_grep, False),  # 감지 실패는 기록만 남기고 검증 없이 통과한다
    ]
    wrong = [name for name, body, env, want in cases if validates(name, body, env) != want]
    assert not wrong, wrong
    # git 실패로는 막지 않는다: 검증 없이 통과하고 실패는 안내와 장부에 남긴다
    plain = wt / "tech/Git-Failure-Selftest.md"
    plain.write_text(FM + "# 일반\n")
    subprocess.run(["git", "add", str(plain)], cwd=wt, check=True)
    code, err = hook_commit(wt, ENV | {"PATH": f"{shim}:{ENV['PATH']}"})
    assert code == 0 and "simulated" in err, err
    assert "ontology detect-failed" in (Path(ENV["CLAUDE_HARNESS_STATE"]) / "events.jsonl").read_text(encoding="utf-8")
    subprocess.run(["git", "reset", "-q", "--", str(plain)], cwd=wt)
    plain.unlink()
finally:
    subprocess.run(["git", "worktree", "remove", "--force", str(wt)], cwd=SRC, capture_output=True)
print("ok")
