#!/usr/bin/env python3
"""Vault 규칙을 지침 대신 시스템으로 강제한다. 판정 가능한 규칙만 여기에 두고 AGENTS.md에는 판단 규칙만 남긴다.

pre    Claude Write/Edit 전: 저장소 안 CLAUDE.md와 auto memory를 차단한다(가운뎃점 사전 차단은 PC 하네스가 맡는다).
post   Claude Write/Edit 뒤: VL check(가운뎃점, frontmatter, 깨진 위키링크, 연락처, 비밀 값, 동명 파일)로 막고
       200줄 초과와 폴더 과밀은 세션마다 파일당 한 번 분할 절차를 안내한다.
commit git pre-commit: staged Markdown을 같은 검사로 막는다. 검사는 작업 트리를 읽으므로 부분 stage는 막는다.
msg    git commit-msg: 커밋 메시지의 가운뎃점을 막는다. core.hooksPath=.githooks가 설정된 클론의 커밋에만 걸린다.
위협 모델: 잊는 에이전트의 표류를 막을 뿐 일부러 우회하는 경우는 막지 못한다.
자체 검사: python3 .claude/hooks/test_vault_guard.py
"""
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
VL = REPO / ".claude/skills/auto-learn/scripts/vault_learn.py"
STATE = Path(os.environ.get("CLAUDE_HARNESS_STATE", Path.home() / ".local/state/claude-harness"))
KNOWLEDGE = ("biz/", "econ/", "fit/", "tech/", "ontology/")
BANNED = {"claude.md", "claude.local.md"}
NO_SPLIT = re.compile(r"^(?:status:\s*(?:index|seminar|template)|marp:\s*true)\s*$", re.M)
# auto-learn 전용 규칙(Threads 단서 링크, 로컬 상태 경로)은 VL publish가 검사하므로 수동 편집에서는 보지 않는다.
# 수동 지식 문서는 Threads를 출처로 써 왔다. Instagram 게시글, 스토리와 DM 링크는 계속 막는다.
AUTO_LEARN_ONLY = ("로컬 상태 경로", "Threads 글 링크")

CLAUDE_MD = ("저장소 안에는 CLAUDE.md, CLAUDE.local.md, .claude/CLAUDE.md를 만들지 않는다. 하나라도 생기면 "
             "Claude Code의 AGENTS.md 직접 로딩이 꺼진다. 규칙은 대상 경로의 AGENTS.md에 쓴다.")
MEMORY = ("auto memory는 쓰지도 읽지도 않는다(.claude/settings.json의 autoMemoryEnabled: false 유지). "
          "세션 간 유지할 선호와 피드백은 루트 또는 가장 가까운 도메인 AGENTS.md에 기록한다.")
DOT = "가운뎃점(U+00B7)은 어디에도 쓰지 않는다. 편집으로 손댄 문서의 기존 가운뎃점도 그 자리에서 쉼표나 연결어(~와, ~하고)로 바꾼다."
LINK = ("깨진 위키링크: 아직 없는 문서는 위키링크 대신 인덱스에 `- [ ] 주제 (작성 예정: `파일명`)` 체크박스로 남기거나 "
        "실제 파일을 만들고 frontmatter를 `status: todo`로 둔다. 명세 표기나 예시라면 인라인 코드로 감싼다.")
DUP = "동명 파일 금지: Obsidian은 [[파일명]]을 이름만으로 찾는다. `<주제>-<세부>.md`로 명시 개명한다."
SPLIT = """200줄을 넘었다. 분할을 검토한다. 줄 수는 기준일 뿐이고 주제의 독립성과 가독성으로 정하며, 한 흐름이 명확하면 유지한다. 작은 내용 추가만으로 구조 변경을 강제하지 않는다. 새 문서는 200줄에 가까워질 때 미리 검토한다.
- 전체 분할은 Parent-as-TOC: 1) 원본 파일명은 두고 내용만 30줄 이내 TOC로 교체(frontmatter `status: index`) 2) 섹션은 형제 파일 `<원본>-<주제>.md`(`status: done`) 3) [[원본]] 링크는 유효하다. 대상 카테고리 인덱스 반영은 도메인 규칙을 따르고, 규칙이 없으면 갱신한다.
- 부분 분할은 부모를 TOC로 바꾸지 않고 주제 절만 `<원본>-<주제>.md`로 떼어낸다. 부모에 위임 문장을 남기고 대상 카테고리 인덱스를 갱신한다.
- 분할 제외: `status: index|seminar|template`(로드맵형 학습 지도 인덱스는 200줄을 넘을 수 있다), `marp: true`, 트래커와 그 아카이브, AGENTS.md(전역 규칙은 루트, 경로 규칙은 가까운 AGENTS.md, 반복 절차는 Skill로 옮긴다)."""
FOLDER = """하위 폴더 분할을 검토한다. 파일 수만으로 이동을 강제하지 않고 독립된 주제 묶음이고 탐색이 쉬워질 때 나눈다.
- 같은 접두사 3개 이상이면 접두사 폴더를, 직접 든 파일이 10개를 넘으면 공유 접두사가 없어도 주제 단위 폴더를 검토한다. 부모나 상위 폴더명에 상응하는 접두사(예: `resume/`의 `Resume-*`, `testing-quality/`의 `Test-*`)는 세지 않는다. 템플릿, 세미나 원본과 인덱스(`status: seminar|template|index`)는 분할 대상이 아니다.
- 폴더명은 원래 접두사와 대응하는 kebab-case 소문자. 폴더에는 `status: index` TOC 인덱스를 두고 이름은 `<폴더명>.md` 또는 기존 접두사 대표 파일을 승격한다. 그 이름이 vault의 다른 파일과 동명이거나 일반명사면 대표 접두사형(예: `OpenSearch-Operations.md`)을 쓴다. 기존 `<폴더명>.md` 인덱스는 실제 충돌이 생길 때만 개명한다.
- 이동 뒤 동명 파일이 생기면 `<주제>-<세부>.md`로 개명한다."""


def log(rule, detail=""):
    """PC 하네스(~/.claude/hooks/harness.py report)와 같은 위반 장부에 남긴다."""
    try:
        STATE.mkdir(parents=True, exist_ok=True)
        row = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S"), "rule": f"vault-{rule}", "cwd": str(REPO), "detail": detail[:200]}
        with (STATE / "events.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    except OSError:
        pass


def first_notice(session, key):
    """같은 세션에서 같은 안내를 반복하지 않는다(토큰 절약)."""
    path = STATE / "notices" / f"{session or 'none'}.txt"
    try:
        seen = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
        if key in seen:
            return False
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(key + "\n")
    except OSError:
        pass
    return True


def kinds(problems):
    """장부에 남길 규칙 종류. 경로, 줄 번호와 링크 대상은 빼고 종류만 쓴다."""
    return sorted({re.sub(r"\s*(\[\[|/|[a-z]+/).*", "", p.split(": ", 1)[-1]).strip() for p in problems})


def git(*args):
    return subprocess.run(["git", "-c", "core.quotePath=false", *args], cwd=REPO, capture_output=True, text=True)


def rel(path):
    try:
        return Path(path).resolve().relative_to(REPO).as_posix()
    except (ValueError, OSError):
        return None


def vl_check(files):
    out = subprocess.run([sys.executable, str(VL), "check", "--files", *files], cwd=REPO, capture_output=True, text=True)
    try:
        problems = json.loads(out.stdout)["problems"]
    except (ValueError, KeyError):
        return [f"VL check 실행 실패: {(out.stderr or out.stdout).strip()[-300:]}"]

    def knowledge(p):
        path = p.split(":", 1)[0]
        return path.startswith(KNOWLEDGE) and Path(path).name != "AGENTS.md"
    return [p for p in problems if not any(k in p for k in AUTO_LEARN_ONLY)
            and not (p.endswith(": frontmatter 없음") and not knowledge(p))]


def explain(problems):
    hints = [DOT] if any("U+00B7" in p for p in problems) else []
    hints += [LINK] if any("깨진 위키링크" in p for p in problems) else []
    hints += [DUP] if any("동명 파일" in p for p in problems) else []
    return "\n".join(problems + hints)


def pre(data):
    ti = data.get("tool_input", {})
    path = ti.get("file_path") or ti.get("notebook_path") or ""
    if "/.claude/projects/" in path and "/memory/" in path:
        return MEMORY
    r = rel(path)
    if r and Path(r).name.lower() in BANNED:
        return CLAUDE_MD
    return None


def post(data):
    r = rel(data.get("tool_input", {}).get("file_path", ""))
    path = REPO / r if r else None
    if not r or not r.endswith(".md") or not path.exists():
        return [], []
    problems, notes, session = vl_check([r]), [], data.get("session_id", "")
    text = path.read_text(encoding="utf-8", errors="replace")
    head = git("show", f"HEAD:{r}")
    before = head.stdout.count("\n") if head.returncode == 0 else 0
    front = text.split("\n---", 1)[0] if text.startswith("---") else ""
    exempt = NO_SPLIT.search(front) or path.name == "AGENTS.md" or "Tracker" in path.name
    if text.count("\n") > 200 >= before and not exempt and first_notice(session, f"split {r}"):
        notes.append(f"{r}: {text.count(chr(10))}줄. {SPLIT}")
    new_file = git("ls-files", "--error-unmatch", "--", r).returncode != 0
    if new_file and data.get("tool_name") == "Write" and r.startswith(KNOWLEDGE):
        siblings = [p.name for p in path.parent.glob("*.md")]
        prefix = path.stem.split("-")[0].lower()
        ancestor = any(prefix in part.lower() for part in Path(r).parent.parts)
        same = [n for n in siblings if n.lower().startswith(prefix + "-")]
        crowded = len(siblings) > 10 or (len(same) >= 3 and not ancestor)
        if crowded and first_notice(session, f"folder {Path(r).parent}"):
            notes.append(f"{Path(r).parent}: 파일 {len(siblings)}개, 접두사 `{prefix}-` {len(same)}개. {FOLDER}")
    return problems, notes


def commit():
    staged = [p for p in git("diff", "--cached", "--name-only", "-z", "--diff-filter=ACMR").stdout.split("\0") if p]
    problems = [f"{f}: {CLAUDE_MD}" for f in staged if Path(f).name.lower() in BANNED]
    md = [f for f in staged if f.endswith(".md")]
    unstaged = set(git("diff", "--name-only", "-z").stdout.split("\0"))
    partial = [f for f in md if f in unstaged]
    if partial:  # 검사기는 작업 트리를 읽으므로 커밋될 내용과 다르면 판정을 믿을 수 없다
        print("커밋될 내용과 작업 트리가 다른 Markdown이 있어 검사를 신뢰할 수 없다. 전부 stage하거나 "
              "해당 파일만 `git add -- <파일>`로 다시 stage하거나 `git stash push --keep-index -- <파일>`로 나머지를 치운 뒤 커밋한다. "
              "저장소 전체 stash는 진행 중인 다른 편집까지 숨기므로 쓰지 않는다.\n" + "\n".join(partial), file=sys.stderr)
        log("commit partial-stage")
        return 1
    problems += vl_check(md) if md else []
    if problems:
        for k in kinds(problems):
            log(f"commit {k}")
        print("vault 규칙 위반으로 커밋을 막았다.\n" + explain(problems), file=sys.stderr)
        return 1
    return 0


def commit_msg(path):
    """git은 편집기 없이(-m, -F) 부를 때 GIT_EDITOR=:로 hook을 부르고 이때 # 줄도 커밋에 남는다.
    편집기를 거치면 cleanup 전 파일이 오므로 scissors 아래(-v의 diff)와 # 주석 줄을 빼고 본다."""
    lines = Path(path).read_text(encoding="utf-8", errors="replace").splitlines()
    if os.environ.get("GIT_EDITOR") != ":":
        cut = next((i for i, l in enumerate(lines) if l.startswith("# ") and ">8" in l), len(lines))
        lines = [l for l in lines[:cut] if not l.startswith("#")]
    text = "\n".join(lines)
    if "\u00b7" in text:
        log("commit-msg dot")
        print("커밋 메시지에 " + DOT, file=sys.stderr)
        return 1
    return 0


def main():
    mode = sys.argv[1]
    if mode == "commit":
        return commit()
    if mode == "msg":
        return commit_msg(sys.argv[2])
    data = json.load(sys.stdin)
    if mode == "pre":
        reason = pre(data)
        if reason:
            log("claude-md" if reason == CLAUDE_MD else "memory")
            print(reason, file=sys.stderr)
            return 2
        return 0
    problems, notes = post(data)
    for k in kinds(problems) + [n.split(". ", 1)[1][:20] for n in notes]:
        log(f"edit {k}")
    if problems:
        print("\n".join([explain(problems)] + notes), file=sys.stderr)  # 힌트는 위반 목록에서만 고른다
        return 2
    if notes:
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse",
                                                 "additionalContext": "\n\n".join(notes)}}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
