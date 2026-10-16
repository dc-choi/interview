---
tags: [ai, agent, instructions, agents-md, interoperability]
status: done
verified_at: 2026-10-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["AGENTS.md 호스트별 동작", "AGENTS.md Discovery and Compatibility"]
---

# AGENTS.md 호스트별 발견과 적용

2026-10-09 공식 문서 대조 기준이다. 형식은 [[Agent-Repository-Instructions|공통 작성법]]에서 설명한다. 여기의 지원은 문서에 명시된 범위이며 이 장비의 설치 버전, 활성 설정이나 실제 준수율을 검증한 결과가 아니다.

## 먼저 구분할 질문

| 단계 | 확인할 것 |
| --- | --- |
| 발견 | 어떤 이름과 경로를 언제 검색하는가 |
| 선택 | 같은 경로의 파일 중 하나를 고르는가, 모두 읽는가 |
| 조합 | 부모와 자식, 다른 지침 유형을 어떤 순서로 넣는가 |
| 예산 | 지침 크기 제한과 잘리는 조건이 있는가 |
| 갱신 | 파일이나 설정 변경을 언제 다시 읽는가 |
| 실행 | 로드된 지침대로 행동했고 검사가 실제 통과했는가 |

## Codex

OpenAI의 상세 AGENTS 가이드가 설명하는 초기 발견 순서는 다음과 같다.

1. `$CODEX_HOME`(기본 `~/.codex`)에서 비어 있지 않은 `AGENTS.override.md`, 다음 `AGENTS.md` 중 하나를 고른다.
2. 프로젝트 루트, 보통 Git 루트부터 cwd까지 내려간다. 루트를 찾지 못하면 cwd를 확인한다.
3. 각 디렉터리에서 `AGENTS.override.md`, `AGENTS.md`, `project_doc_fallback_filenames` 순서로 최대 하나를 고른다.
4. 루트부터 합쳐 더 가까운 경로의 지침을 뒤에 둔다. 초기 검색은 cwd에서 멈춘다.

따라서 루트에서 시작했다고 모든 하위 지침이 시작 시 자동 로드되는 것은 아니다. 대상 패키지의 지침을 확인하는 절차와 작업 위치를 함께 설계한다. `.override`는 그 위치에서 일반 파일보다 먼저 선택하는 이름이며, 파일 이름만으로 시스템 정책까지 덮어쓰지는 않는다.

상세 가이드는 `project_doc_max_bytes` 기본 32 KiB를 결합 지침의 상한으로 설명한다. Advanced Configuration의 짧은 설명은 파일별 읽기 크기처럼 표현하므로, 경계 동작은 대상 버전에서 별도 확인한다. 파일 크기 제한과 실제 모델 컨텍스트 예산도 다르다.

새 실행에서 체인을 다시 구성하며 TUI의 변경 반영은 재시작을 확인한다. 설정한 값만 보고 이미 실행 중인 세션에 반영됐다고 판단하지 않는다.

## Cursor

공식 Rules 문서는 루트와 중첩 `AGENTS.md`를 지원한다고 설명한다. 해당 디렉터리와 자손의 작업에 부모 지침을 함께 적용하고 더 구체적인 지침을 우선한다.

`AGENTS.md`는 단순 Markdown이고 `.cursor/rules/*.mdc`는 별도의 구조화된 규칙 체계다. Codex의 `.override`와 fallback 이름, Claude의 import 문법까지 공통으로 지원한다고 추정하지 않는다. Rules 안내를 Cursor Tab 등 모든 AI 기능의 지원으로 확대하지 않는다.

## GitHub Copilot

가까운 `AGENTS.md`를 우선하는 규칙 외에도 **제품 표면과 다른 지침 유형의 우선순위**를 확인한다.

| 표면 | 공식 지원 표에서 확인한 Agent instructions |
| --- | --- |
| GitHub.com cloud agent, code review | 지원 |
| GitHub.com 일반 Copilot Chat | 해당 유형이 지원 목록에 없음 |
| VS Code Copilot Chat | `AGENTS.md` 지원 |
| VS Code code review | 지원 표에는 repository-wide 지침만 명시 |
| Copilot CLI | 지원 |
| JetBrains 일반 Chat | 해당 유형이 지원 목록에 없음, cloud agent와 구분 |

공식 우선순위 안내는 개인 지침, 경로별 `.instructions.md`, 저장소 전체 `.github/copilot-instructions.md`, `AGENTS.md` 같은 Agent instructions, 조직 지침 순이다. 가까운 AGENTS라는 이유로 이 다른 유형을 모두 이긴다고 보지 않는다. 여러 지침은 모두 제공될 수 있으므로 상충 내용을 제거한다.

저장소 안내는 루트의 단일 `CLAUDE.md` 또는 `GEMINI.md`도 대안으로 설명한다. 이것을 각 원래 호스트의 import와 중첩 의미까지 구현한다는 뜻으로 확대하지 않는다.

## Claude Code

직접 지원은 v2.1.277 이상이다. 기본 `claude-md-or-agents-md`는 cwd와 상위에 자체 `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`가 없을 때 AGENTS를 읽는다. 전역/managed CLAUDE와 `.claude/rules`는 이 fallback 판정에서 제외된다.

- 시작: cwd와 상위의 `AGENTS.md`, `.claude/AGENTS.md`.
- 하위: Read로 파일을 열 때 해당 경로의 CLAUDE 지침 존재 여부와 모드에 따라 로드.
- 제외: `AGENTS.local.md`, `AGENTS.override.md`, `.agents/` 안의 지침 파일.
- `@path` import와 제외 설정을 지원하며 기존 `@AGENTS.md` 브리지의 중복을 피한다.
- 직접 AGENTS 로드는 `InstructionsLoaded` 훅과 `--add-dir`의 AGENTS 읽기를 지원하지 않는다.

| Project instructions 모드 | 선택 |
| --- | --- |
| `claude-md-or-agents-md` | CLAUDE 우선, 없으면 AGENTS |
| `claude-md-and-agents-md` | 양쪽 사용 |
| `claude-md` | CLAUDE 사용 |
| `managed-only` | 시작 시 project/local/user 지침 제외. managed 지침, 메모와 on-demand 하위 CLAUDE/rules는 별도 |

v2.1.285부터 built-in plugin ID는 `cc-plugin-agents-md@builtin`이고 구 ID도 읽는다. Project instructions 변경은 다음 메시지와 새 세션에 적용된다. 일반 파일 재로딩, 다른 설정의 반영 시점과 혼동하지 않는다.

이 Vault의 `CLAUDE.md` 브리지 유지 규칙은 프로젝트의 운영 선택이다. 제품이 직접 지원한다는 이유만으로 기존 브리지를 제거하거나 메모리 설정을 바꾸지 않는다.

## 명시적 설정이 필요한 예

공식 AGENTS 사이트는 Aider와 Gemini CLI에 다음 설정을 안내한다. 사용법 예시이며 이 장비에 적용하지 않았다.

```yaml
# .aider.conf.yml
read: AGENTS.md
```

```json
{
  "context": {
    "fileName": "AGENTS.md"
  }
}
```

두 번째는 Gemini CLI의 `.gemini/settings.json` 예시다. 이처럼 지원 목록 등재와 무설정 자동 발견은 같은 의미가 아니다.

## 호환 목록의 읽는 법

2026-10-09 공식 사이트 구현의 목록은 Codex, Amp, Jules, Cursor, Factory, RooCode, Aider, Gemini CLI, goose, Kilo Code, opencode, Phoenix, Zed, Semgrep, Warp, GitHub Copilot Coding agent, VS Code, Ona, Devin, Windsurf, UiPath Autopilot & Coded Agents, Augment Code, Junie다.

이는 23개 제품의 모든 버전과 화면을 실행 검증한 표가 아니다. Claude Code처럼 공식 제품 문서에서 지원이 확인되지만 사이트 목록에는 없는 경우도 있으므로 목록 누락을 미지원으로 단정하지 않는다.

## 적용 점검

- root와 하위 cwd에서 어떤 파일이 선택되는지 확인한다.
- 충돌하는 상위/하위 규칙과 호스트별 파일을 작은 예제로 점검한다.
- 수정 후 새 세션 또는 해당 호스트의 갱신 절차를 거친다.
- 파일이 로드됐다는 표시와 실제 작업 결과를 대조한다.
- 에이전트가 설명한 우선순위만 믿지 않고 도구 기록과 검사 결과를 확인한다.

## 출처

- [AGENTS.md — Agentic AI Foundation](https://agents.md/)
- [호환 목록 구현 — agentsmd/agents.md](https://github.com/agentsmd/agents.md/blob/main/components/CompatibilitySection.tsx)
- [OpenAI, Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [OpenAI, Advanced Configuration](https://learn.chatgpt.com/docs/config-file/config-advanced#project-instructions-discovery)
- [Cursor, Rules](https://cursor.com/docs/rules)
- [GitHub Docs, Adding repository custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
- [GitHub Docs, Support for different types of custom instructions](https://docs.github.com/en/copilot/reference/custom-instructions-support)
- [GitHub Docs, About customizing GitHub Copilot responses](https://docs.github.com/en/copilot/concepts/prompting/response-customization?tool=webui)
- [Anthropic, How Claude remembers your project](https://code.claude.com/docs/en/memory)

## 관련 문서

- [[Agent-Repository-Instructions|공통 형식과 작성법]]
- [[Codex-CLI|Codex CLI]]
- [[Claude-Code-Config-Permissions|Claude Code 설정과 권한]]
- [[Agent-Instruction-Design|에이전트 지시 설계]]
