---
tags: [ai, claude-code, customization, voice, remote]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Code Customization", "클로드 코드 커스터마이즈", "Voice Mode", "원격 제어", "Remote Control"]
verified_at: 2026-10-12
---

# Claude Code 커스터마이즈 — 환경 설정, 음성, 원격 제어

에이전트의 표시, 입력, 실행 위치를 사용자 환경에 맞춘다. 관통하는 패턴은 설정 파일을 직접 편집하기보다 **자연어로 Claude에게 설정을 시키는 것**이다.

## 환경 설정

- **스피너 문구, 테마, 색상**: `~/.claude/settings.json`의 `spinnerVerbs`(로딩 문구), `/theme`, `/color blue`(프로젝트별 터미널 창 구분)
- **출력 스타일**: `/config` > Output style (Default / Explanatory 이유 설명 / Learning). 커스텀은 `~/.claude/output-styles/*.md`
- **상태표시줄**: `/statusline 모델 이름과 컨텍스트 퍼센트 보여줘` — `model.display_name`, `context_window.used_percentage`, `cost.total_cost_usd` 필드 참조. **로컬 실행이라 토큰 소모 없음**
- **완료 알림**: Stop 훅으로 작업 완료 시 소리/알림, Notification 훅으로 권한 대기 알림. 둘을 병행하면 완료와 승인 대기를 모두 놓치지 않는다

## Voice Mode — 음성 입력

- `/voice`로 활성화, 스페이스바 홀드 → 녹음 → 손 떼면 텍스트 삽입. 타이핑과 혼합 가능
- **전략**: 긴 지시는 음성, 파일 경로 같은 정확한 식별자(`@src/auth.ts`)는 타이핑. 인식은 코딩 어휘에 맞춰져 있고 현재 프로젝트 이름과 git 브랜치 이름이 자동으로 인식 힌트에 들어가지만, 경로와 기호는 타이핑이 확실하다(제안)
- 다국어: settings.json `"language": "korean"` (20개 언어, 미지원은 영어 폴백)
- 제약: claude.ai 계정 로그인 전용(Anthropic API 키 직접 사용, Bedrock, Google Cloud Agent Platform, Microsoft Foundry 미지원), 로컬 마이크가 필요해 SSH와 클라우드 세션에서는 동작하지 않음

## 원격 제어 — 실행 위치 분리

폰, 데스크톱, 클라우드에 세션을 흩어 둔다.

| 방식 | 특징 | 제약 |
|---|---|---|
| Remote Control: `claude remote-control`(서버 모드), `claude --remote-control`, 세션 안 `/remote-control`(`/rc`) | 세션 URL, QR 코드나 세션 목록으로 Claude 앱 또는 claude.ai/code에서 로컬 세션을 이어 감. 실행과 파일 접근은 내 컴퓨터에 남고 폰과 브라우저는 그 세션을 보는 창. 폰에서 첨부한 사진은 Claude가 메시지의 일부로 바로 보고 다른 파일은 내 컴퓨터로 내려받아 `@` 참조로 넘김. 노트북이 잠들거나 네트워크가 끊겨도 다시 온라인이 되면 자동 재연결. 연결된 동안 메시지, 응답과 도구 활동을 담은 대화 기록은 기기 간 동기화와 재연결을 위해 Anthropic 서버에 저장 | 컴퓨터가 켜져 있고 `claude` 프로세스가 돌아야 함(터미널을 닫으면 되살릴 때까지 오프라인). 서버 모드 밖에서는 프로세스당 원격 세션 1개(서버 모드는 여러 세션 동시). 깨어 있는데 네트워크만 오래 끊기면 서버 모드는 약 10분 뒤 종료하고 대화형 세션은 복구될 때까지 재시도. Pro, Max, Team, Enterprise의 claude.ai 로그인 필요(API 키 불가, Team과 Enterprise는 Owner가 먼저 켬). Bedrock, Google Cloud Agent Platform, Microsoft Foundry, api.anthropic.com이 아닌 `ANTHROPIC_BASE_URL`(게이트웨이, 프록시), `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`이나 `DISABLE_GROWTHBOOK` 설정, 엔터프라이즈 Claude apps gateway 로그인, ZDR이나 HIPAA 구성 조직, `claude setup-token` 장기 토큰에서는 쓸 수 없음 |
| Dispatch (Desktop, 터미널 불필요) | 폰 앱에서 데스크톱으로 작업 전송 | 데스크톱 켜짐 + 앱 실행 필수, 단일 스레드, Pro나 Max 플랜 필요(Team, Enterprise 불가, Desktop 문서 기준) |
| Cowork 탭 | 클라우드 VM 실행, 컴퓨터 꺼도 진행(Team, Enterprise에서는 클라우드 실행이 베타, 2026-10-12 도움말 기준) | 로컬 파일, 브라우저와 컴퓨터 사용 기능은 데스크톱 앱이 열려 연결돼 있어야 함. 이때 승인한 로컬 폴더를 직접 읽고 쓸 수 있음 |
| `claude --cloud` / `--teleport`(`/tp`) | 웹 세션 병렬 생성 후 로컬로 가져오기 | `--remote`는 폐기된 `--cloud` 별칭, teleport는 단방향(웹→터미널) |

선택 기준: 로컬 파일이 필요하면 Desktop 계열, 무중단이 필요하면 클라우드 계열.

## 플러그인 — 확장을 묶어 설치하는 단위

플러그인은 스킬, 서브에이전트, 훅, MCP와 LSP 서버 같은 구성요소를 한 단위로 설치하고 불러오는 디렉터리다(매니페스트는 `.claude-plugin/plugin.json`). 마켓플레이스는 플러그인 카탈로그다. Anthropic 공식 마켓(`claude-plugins-official`)은 첫 인터랙티브 세션에서 자동 등록되고, 다른 마켓은 `/plugin marketplace add <owner>/<repo>`로 먼저 추가한 뒤 `/plugin install <이름>@<마켓>`으로 설치한다(공식 문서 확인 2026-09-29).

- **보안 경계**: 플러그인의 훅과 MCP 서버 프로세스는 사용자 권한으로 샌드박스 밖에서 실행되고, 스킬, 명령과 에이전트는 지시로 컨텍스트에 들어간다. 마켓 이름은 카탈로그 발행자를 알려 줄 뿐 개별 플러그인을 보증하지 않으므로 설치 전에 구성요소를 읽는다. 자동 업데이트가 켜져 있으면 검토한 파일이 나중에 바뀔 수 있다
- **탐색**: 터미널에서 `/plugin`(v2.1.285 기준 별칭 `/plugins`, `/marketplace`)을 이름 없이 열면 추가한 모든 마켓의 플러그인을 보여 주는 Discover 탭이 뜨고, Installed, Marketplaces, Errors 탭이 이어진다(VS Code 확장에서는 `/plugins`가 Manage plugins 패널을 연다). 공식 마켓에는 `frontend-design`, `code-review`, `commit-commands` 같은 플러그인이 있다(2026-09-30 확인)
- **컨텍스트 비용**: 공식 마켓 플러그인은 설치 패널에서 매 턴 추가되는 토큰과 호출 시 추가되는 토큰의 추정치를 보여 준다. 설치 뒤에는 `claude plugin details <이름>`의 Always-on 토큰, Installed 탭의 Not used recently 묶음, `/skill-doctor`(v2.1.252+)의 스킬별 비용과 호출 빈도로 안 쓰는 것을 걷어낸다
- **설치 위치가 곧 사용 범위**: claude.ai 계정에서 켠 플러그인과 스킬은 claude.ai 계정으로 로그인한 터미널 세션에 한 방향으로 동기화된다(v2.1.273+, 플러그인은 `<이름>@synced`, 스킬은 `claude.ai sync`로 표시). `/plugin`으로 설치한 플러그인은 claude.ai 계정에 올라가지 않는다. 이 플러그인과 `~/.claude/skills/`의 스킬은 Cowork와 클라우드 세션에서 쓰이지 않고, Cowork는 계정에서 켠 플러그인과 스킬을 세션 시작 때 받으므로 Cowork에서 쓰려면 Customize에서 계정에 추가한다. 다만 데스크톱 Cowork도 일반 파일인 `~/.claude/CLAUDE.md`는 읽는다(파일 자체가 링크면 건너뛰고, 작업 디렉터리 밖을 가리키는 import는 빼고 읽는다). 같은 컴퓨터의 터미널, Desktop Code 탭 로컬 세션, VS Code 확장은 같은 설정 파일을 읽으므로 사용자 범위 설치가 셋에 공통으로 적용된다

커뮤니티 워크플로 플러그인은 역할이 서로 겹친다. 아래는 공개 저장소 설명과 사용 후기를 요약한 것이며 기능과 효과는 각 저장소와 사용자의 주장이다(저장소 상태 2026-09-29 확인).

| 플러그인 | 주 역할 | 비고 |
|---|---|---|
| Superpowers | 요구사항 질문, 계획 작성과 실행, TDD 흐름 | 공식 마켓 등록 확인. brainstorming 단계가 스펙 수준 산출물을 내지만 선택지 밖 질문에 답할 개발자 판단이 필요하다는 후기 |
| gstack | 대표, QA 같은 관점의 의사결정 검토, 브라우저 자동화 | 개인 설정 공개 저장소 |
| oh-my-claudecode | 다중 에이전트 병렬 오케스트레이션 | |
| GSD (Get Shit Done) | 긴 작업의 context rot 방지, 스펙 기반 단계 계획, 세션 재개 | 원 저장소는 보관 처리되고 GSD Core로 이전 안내 |

- **역할별 조합 제안**: 의사결정은 gstack, 실행은 Superpowers, 긴 작업의 안정화는 GSD, 대규모 병렬이 필요하면 oh-my-claudecode를 더하는 3층 구성이 제안된다. 디자인 시스템의 토큰과 컴포넌트를 조합해 주는 것처럼 특정 산출물용 도메인 플러그인도 있으며, 개인이 만든 플러그인은 유지보수 주체와 갱신 빈도를 먼저 본다
- **하나로 시작**: 여러 개를 한 번에 설치하지 않는다. 비슷한 역할의 스킬과 훅이 겹치면 어느 흐름이 발동할지 예측하기 어렵고 매 턴 컨텍스트 비용이 쌓인다. 하나로 시작해 실제로 쓰는 스킬만 남기거나 필요한 스킬만 `.claude/skills/`로 흡수하고, 플러그인은 프로젝트 범위로 골라 설치한다

## Mods: 프로세스 내부 확장과 UI

Mod는 Claude Code 프로세스 안에서 실행되는 JavaScript/TypeScript 이벤트 핸들러를 포함한 플러그인이다. 프롬프트, 도구 호출과 UI 렌더링 이벤트를 관찰하거나 수정하고, 직접 처리해 기본 동작을 대체할 수 있다. 설정 파일의 훅도 도구 호출을 차단하거나 인자를 바꿀 수 있으므로, 이벤트 수정 자체가 Mod만의 기능은 아니다. UI 패널과 입력창 위 영역을 그리거나 여러 이벤트 사이에 상태를 공유해야 할 때 Mod를 검토한다.

- **실행과 표시를 구분**: 플러그인을 불러오는 세션에서 핸들러가 실행된다. 터미널과 Desktop Code 탭은 Mod UI를 표시하지만, Desktop의 WSL 세션은 플러그인을 지원하지 않아 핸들러와 UI 모두 실행되지 않는다. Desktop에서도 terminal-only로 표시된 UI 요소는 지원하지 않는다. VS Code 채팅 패널과 `claude -p`는 핸들러가 실행돼도 Mod UI를 표시하지 않는다. 설치 여부만으로 모든 화면에서 같은 기능이 보인다고 가정하지 않는다.
- **권한과 비용**: Mod는 사용자 권한으로 파일과 네트워크에 접근하고 프로세스를 실행할 수 있으며 샌드박스로 격리되지 않는다. 프롬프트나 도구 호출을 바꾸고 모델을 호출해 구독 또는 API 사용량을 소비할 수도 있다. 화면을 꾸미는 기능이어도 실행 코드를 확인한다.
- **설치 전 확인**: `claude plugin validate <플러그인 디렉터리>`로 코드를 실행하지 않고 `hooks:`와 `calls:` 목록을 확인한다. 이 목록은 검토 자료이며 안전성 보증이 아니다. 기존 훅, 스킬이나 상태표시줄로 목적을 달성하면 그 구성을 유지한다.

2026-10-13 공식 Mods overview의 실행 경계와 표시 조건을 대조했다. 이 절은 다른 환경 설정과 원격 기능을 전부 재검증한 기록이 아니다.

## 체크포인트

- 설정을 파일 직접 편집 대신 자연어로 시키는가
- 상태표시줄, 훅 같은 로컬 기능이 토큰 비용이 없다는 점을 아는가
- 음성은 긴 지시, 타이핑은 정확한 식별자로 나누는가
- 작업 성격(로컬 파일 vs 무중단)에 따라 원격 실행 방식을 고르는가
- 플러그인을 설치하기 전에 훅과 MCP 서버를 읽었는가, 역할이 겹치는 플러그인을 한꺼번에 깔지 않았는가

## 출처

- [Claude Code — Mods overview](https://code.claude.com/docs/en/plugins/mods/overview)
- [Claude Code — CLI reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Code — Continue local sessions from any device with Remote Control](https://code.claude.com/docs/en/remote-control)
- [Claude Code — Voice dictation](https://code.claude.com/docs/en/voice-dictation)
- [Claude Code — Desktop application](https://code.claude.com/docs/en/desktop)
- [Claude Cowork 시작하기](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)
- [Claude — Cowork overview](https://claude.com/docs/cowork/overview)
- [Claude Code — How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [클로드 코드 가이드 (커스터마이즈 파트) — WikiDocs](https://wikidocs.net/book/19104)
- [Claude Code — Plugins overview](https://code.claude.com/docs/en/plugins)
- [Claude Code — Discover and install plugins](https://code.claude.com/docs/en/discover-plugins)
- [Claude Code — Plugin security and trust](https://code.claude.com/docs/en/plugins/security)
- [Superpowers — GitHub, obra](https://github.com/obra/superpowers)
- [gstack — GitHub, garrytan](https://github.com/garrytan/gstack)
- [oh-my-claudecode — GitHub, Yeachan-Heo](https://github.com/Yeachan-Heo/oh-my-claudecode)
- [get-shit-done (보관됨) — GitHub, gsd-build](https://github.com/gsd-build/get-shit-done)
- [Claude Code 플러그인 4대장 — Threads, elephant_coding](https://www.threads.com/@elephant_coding/post/DYRyBRdCWwf)
- [디자인 시스템 조합 플러그인 소개 — Threads, jobs._._lab](https://www.threads.com/@jobs._._lab/post/DaoW3M_krGe)
- [Claude Code와 superpowers로 스펙 작성 — Threads, sunghyoukbae](https://www.threads.com/@sunghyoukbae/post/DWEUHfJEnoY)
- [Claude Code — Extend Claude with skills](https://code.claude.com/docs/en/skills)
- [claude-plugins-official — GitHub, anthropics](https://github.com/anthropics/claude-plugins-official)
- [인프런, 널널한 개발자, 스킬과 플러그인](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498598)
- [Claude Code 2026 — YouTube, 토비의 스프링](https://www.youtube.com/watch?v=Y2mEVnN-FKY) — 2026-10-11, 2026년 변경을 소개하는 TTS 내레이션 영상. Remote Control과 `/voice` 항목의 단서로만 쓰고 내용은 공식 문서로 대조

## 관련 문서

- [[Claude-Code-Fundamentals|Claude Code 기초]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우]]
- [[Claude-Code-Business-Automation|Claude Code 비즈니스 자동화]]
- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘]]
- [[Agent-Skills|에이전트 스킬 (SKILL.md 포맷)]]
