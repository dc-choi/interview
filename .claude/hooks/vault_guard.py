#!/usr/bin/env python3
"""Vault 규칙을 지침 대신 시스템으로 강제한다. 판정 가능한 규칙만 여기에 두고 AGENTS.md에는 판단 규칙만 남긴다.

pre    Claude Write/Edit 전: 저장소 안 CLAUDE.md와 auto memory를 차단한다(가운뎃점 사전 차단은 PC 하네스가 맡는다).
post   Claude Write/Edit 뒤: VL check(가운뎃점, frontmatter, 깨진 위키링크, 연락처, 비밀 값, 동명 파일)로 막고
       200줄 초과와 폴더 과밀은 세션마다 파일당 한 번 분할 절차를 안내한다.
commit git pre-commit: staged Markdown을 같은 검사로 막는다. 검사는 작업 트리를 읽으므로 부분 stage는 막는다.
       온톨로지 선언(선언 폴더의 경로, staged나 HEAD 판 frontmatter 안의 키 이름)이 바뀔 때와 그 감지가 실패할 때만
       validate --staged로 새 위반을 막는다.
msg    git commit-msg: 커밋 메시지의 가운뎃점을 막는다. core.hooksPath=.githooks가 설정된 클론의 커밋에만 걸린다.
위협 모델: 잊는 에이전트의 표류를 막을 뿐 일부러 우회하는 경우는 막지 못한다.
자체 검사: python3 .claude/hooks/test_vault_guard.py
"""
import json
import os
import re
import shutil
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
ONTOLOGY_KEYS = ("ontology_concepts", "ontology_relations")
# markdown.mjs readFrontmatter와 같은 경계: 첫 줄의 ---부터 처음 나오는 --- 또는 ... 줄까지. 닫는 줄이 없으면 색인처럼 파일 끝까지 읽는다.
FRONTMATTER = re.compile(r"\A\ufeff?---[\t ]*\r?\n(.*?)(?:^(?:---|\.\.\.)[\t ]*\r?$|\Z)", re.S | re.M)
DECLARING = ("ontology/vocabulary/", "ontology/instances/")
# 큰따옴표 key의 escape("ontology\x5fconcepts", 줄 끝 \로 이은 key)는 key 이름을 글자 그대로 적지 않아도 같은 key가 된다.
# backslash가 든 큰따옴표 key는 모두 선언 후보로 본다. 2026-11-21 저장소 Markdown 5,372개의 frontmatter에는 backslash가 하나도 없다.
# key 자리만 고르면 anchor로 쓴 escape 값이나 주석 뒤의 ':'를 놓치므로, git grep 후보와 같은 줄 단위 기준을 쓴다.
ESCAPED = re.compile(r'"[^"\n]*\\')
VALIDATE_TIMEOUT = 100  # 무인 auto-learn은 120초에 git을 끊으므로 그 전에 끝낸다
NODE = ("온톨로지 선언(ontology/vocabulary, ontology/instances, frontmatter의 ontology_concepts나 ontology_relations)이 "
        "바뀐 커밋은 Node.js 22 이상으로 `node ontology/src/cli.mjs validate --staged`를 실행해 검사한다. "
        "node를 찾지 못했거나 22 미만이다. Node.js 22 이상을 PATH(launchd라면 /opt/homebrew/bin) 또는 ~/.local/bin/node에 두고 다시 커밋한다.")
NPM = ("온톨로지 검증에 필요한 패키지(ontology/node_modules/yaml)가 없다. "
       "`ontology/`에서 `npm ci --ignore-scripts`를 실행해 설치한 뒤 다시 커밋한다.")
TIMEOUT = (f"온톨로지 검증(validate --staged)이 {VALIDATE_TIMEOUT}초 안에 끝나지 않아 커밋을 막았다. 무인 커밋은 120초에 "
           "git을 끊으므로 그 전에 멈췄다. `node ontology/src/cli.mjs validate --staged`를 직접 실행해 걸리는 곳을 확인한다.")
ONTOLOGY = ("온톨로지 검증(validate --staged)이 이번 staged 변경으로 생긴 위반을 찾았다. 줄마다 파일, 사유, "
            "frontmatter 항목(괄호 안 evidence_unit_id의 ontology_concepts[n] 또는 ontology_relations[n])을 고쳐 다시 stage한다. "
            "HEAD에 이미 있던 위반과 Category 선언을 바꾸지 않은 커밋의 새 undeclared_category는 경고로만 알린다.")
# 기존 gap 형식을 바꾸지 않으려고 unresolved_relation에는 message가 없다. 사람이 읽을 설명은 여기서 붙인다.
UNRESOLVED = "subject나 target이 색인된 entity ID, concept:<slug>, 위키링크 어느 것으로도 해석되지 않는다(broader는 선언된 slug여야 한다)."
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


def git(*args, ok=None):
    """ok에 허용할 종료 코드를 주면 그 밖의 코드에서 예외를 낸다. 실패한 git의 빈 출력을 결과 없음으로 읽지 않기 위해서다."""
    p = subprocess.run(["git", "-c", "core.quotePath=false", *args], cwd=REPO, capture_output=True, text=True, errors="replace")
    if ok is not None and p.returncode not in ok:
        command = next((a for a in args if not a.startswith("-")), "")
        raise RuntimeError(f"git {command} 종료 코드 {p.returncode}: {p.stderr.strip()[-200:]}")
    return p


def rel(path):
    try:
        return Path(path).resolve().relative_to(REPO).as_posix()
    except (ValueError, OSError):
        return None


def vl_check(files):
    # argparse는 -로 시작하는 경로를 옵션으로 읽고 --files 뒤의 --도 받지 않으므로 ./를 붙인다. VL은 경로를 정규화해 ./를 지운다.
    files = [f"./{f}" if f.startswith("-") else f for f in files]
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


def declares(rev, path):
    """rev(빈 문자열이면 index) 판의 frontmatter 안 어디든 온톨로지 키 이름이나 backslash가 든 큰따옴표 key가 있는가. 색인은
    YAML을 해석하므로 따옴표 친 키, 콜론 앞 공백, flow 형식과 escape도 선언이 되어 줄 맨 앞만 보지 않는다. 본문 코드 블록의 예시는 세지 않는다."""
    front = FRONTMATTER.match(git("show", "--no-color", f"{rev}:{path}", ok=(0,)).stdout)
    return bool(front and (any(key in front.group(1) for key in ONTOLOGY_KEYS) or ESCAPED.search(front.group(1))))


def declaring():
    """선언 폴더 경로가 어떤 상태로든 staged이거나, staged Markdown의 index 판 또는 HEAD 판 frontmatter에 키 이름이 있는가.
    HEAD 판까지 보므로 선언 문서의 삭제, 개명과 키 제거도 잡는다. git grep은 후보만 고르고 frontmatter 여부는 파일마다 확인한다.
    근거로만 쓰인 문서의 편집은 잡지 않는다(heading을 바꾸면 다음 build의 missing_evidence로 드러난다). git이 실패하면 예외를 낸다."""
    changed = [p for p in git("diff", "--cached", "--name-only", "-z", "--no-renames", ok=(0,)).stdout.split("\0") if p]
    if any(p.startswith(DECLARING) for p in changed):
        return True
    md = [p for p in changed if p.endswith(".md")]
    if not md:
        return False
    # 확장 정규식: 키 이름 둘과, 큰따옴표 뒤에 backslash가 오는 줄(escape로 적은 key의 후보)
    keys = [arg for key in (*ONTOLOGY_KEYS, r'"[^"]*\\') for arg in ("-e", key)]
    for rev, where in (("", "--cached"), ("HEAD", "HEAD")):  # -e 뒤라 --cached도 옵션으로 읽힌다. HEAD 쪽 출력은 HEAD:<경로>
        # --no-color: color.ui나 color.grep이 always면 파이프에도 경로에 색 코드가 붙는다. 1은 일치 없음이다.
        found = git("--literal-pathspecs", "grep", "--no-color", "-l", "-z", "-E", *keys, where, "--", *md, ok=(0, 1)).stdout.split("\0")
        if any(declares(rev, p.split(":", 1)[1] if rev else p) for p in found if p):
            return True
    return False


def cause(text):
    """Node 오류 출력에서 원인 줄을 고른다. 소스 발췌와 스택 줄은 건너뛰고 `SyntaxError: ...`, `Error [ERR_...]: ...` 줄을,
    없으면 첫 줄(CLI가 잡은 오류는 `code: message` 한 줄)을 쓴다."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return next((line for line in lines if re.match(r"\w*Error(?: \[\w+\])?: ", line)), lines[0] if lines else "출력 없음")


def ontology():
    """온톨로지 선언이 바뀐 커밋만 검증한다(약 10초). 그 밖의 커밋(무인 auto-learn 포함)은 git 호출 셋을 더 쓰고,
    키 이름이 본문에라도 든 파일은 판마다 git show를 하나씩 더 쓴다. 감지가 실패하면 기록과 안내를 남기고 검증 없이
    통과시킨다. 검증으로 넘기면 Node 부재, 시간 초과나 근거 문서 편집의 위반이 선언과 무관한 무인 커밋을 막는다. (사유 목록, 출력 줄)"""
    try:
        needed = declaring()
    except Exception as e:  # git 실패, git 실행 실패(인자 길이 초과 등)와 예상하지 못한 출력
        # 무인 커밋을 막지 않는 쪽을 택한다. 선언을 바꾼 커밋이었다면 다음 validate(일일 다이제스트 포함)가 위반을 드러낸다.
        log("commit ontology detect-failed", str(e))
        print(f"온톨로지 선언 감지가 실패해 이 커밋의 선언 검증을 건너뛴다: {e}\n"
              "선언을 바꿨다면 커밋 뒤 `node ontology/src/cli.mjs validate`로 확인한다.", file=sys.stderr)
        needed = False
    if not needed:
        return [], []
    node = shutil.which("node") or str(Path.home() / ".local/bin/node")
    try:
        version = subprocess.run([node, "--version"], capture_output=True, text=True, timeout=10).stdout
    except (OSError, subprocess.SubprocessError):
        version = ""
    major = re.match(r"v(\d+)\.", version)
    if not major or int(major.group(1)) < 22:
        return ["node"], [NODE]
    if not (REPO / "ontology/node_modules/yaml").exists():
        return ["npm"], [NPM]
    p = None
    try:
        p = subprocess.run([node, str(REPO / "ontology/src/cli.mjs"), "validate", "--staged", "--repo", str(REPO)],
                           cwd=REPO, capture_output=True, text=True, timeout=VALIDATE_TIMEOUT)
        report = json.loads(p.stdout)
    except subprocess.TimeoutExpired:
        return ["timeout"], [TIMEOUT]
    except (OSError, subprocess.SubprocessError, ValueError) as e:
        detail = cause((p.stderr or p.stdout) if p else str(e))
        return ["error"], [f"온톨로지 검증을 실행하지 못했다: {detail}\n`node ontology/src/cli.mjs validate --staged`로 원인을 확인한다."]
    if report.get("warnings"):
        print(f"온톨로지 경고 {len(report['warnings'])}건은 커밋을 막지 않는다. HEAD에 이미 있던 위반이거나, Category 선언을 "
              "바꾸지 않은 커밋의 새 undeclared_category다. `node ontology/src/cli.mjs validate --staged`로 목록을 확인한다.", file=sys.stderr)
    if report.get("ok"):
        return [], []
    found = report.get("violations", [])
    lines = [f"- {v.get('source_uri')}: {v.get('reason')}: "
             f"{v.get('message') or (UNRESOLVED if v.get('reason') == 'unresolved_relation' else '')} ({v.get('evidence_unit_id', '')})"
             for v in found[:30]]
    more = [f"- 그 밖에 {len(found) - 30}건"] if len(found) > 30 else []
    return sorted({v.get("reason", "") for v in found}), [ONTOLOGY, *lines, *more]


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
    try:
        reasons, onto = ontology()
    except Exception as e:  # 검증 단계의 예상하지 못한 예외(형식이 다른 출력 등)도 traceback 대신 사유를 남기고 막는다
        reasons, onto = ["error"], [f"온톨로지 검사가 예외로 끝났다: {e!r}\n`node ontology/src/cli.mjs validate --staged`로 원인을 확인한다."]
    if problems or onto:
        for k in kinds(problems) + [f"ontology {r}" for r in reasons]:
            log(f"commit {k}")
        print("\n".join(["vault 규칙 위반으로 커밋을 막았다."] + ([explain(problems)] if problems else []) + onto),
              file=sys.stderr)
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
