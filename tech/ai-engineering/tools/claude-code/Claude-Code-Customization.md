---
tags: [ai, claude-code, customization, voice, remote]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Code Customization", "클로드 코드 커스터마이즈", "Voice Mode", "원격 제어"]
verified_at: 2026-09-29
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
- **전략**: 긴 지시는 음성, 정확한 식별자(`@src/auth.ts`, 브랜치명)는 타이핑 — 음성 인식이 코딩 어휘를 흘릴 수 있어서
- 다국어: settings.json `"language": "korean"` (20개 언어, 미지원은 영어 폴백)
- 제약: API 키 전용/Bedrock/Vertex 미지원, SSH나 클라우드 원격은 마이크 접근 불가

## 원격 제어 — 실행 위치 분리

폰, 데스크톱, 클라우드에 세션을 흩어 둔다.

| 방식 | 특징 | 제약 |
|---|---|---|
| `claude remote-control` (`/rc`) | QR/URL로 폰 접속해 로컬 세션 제어 | 터미널 닫으면 종료, 10분 단절 시 타임아웃, 인스턴스당 1개 |
| Dispatch (Desktop, 터미널 불필요) | 폰 앱에서 데스크톱으로 작업 전송 | 데스크톱 켜짐 + 앱 실행 필수, 단일 스레드 |
| Cowork 탭 | 클라우드 VM 실행, 컴퓨터 꺼도 진행 | 로컬 파일, 브라우저와 컴퓨터 사용 기능은 데스크톱 앱이 열려 연결돼 있어야 함. 이때 승인한 로컬 폴더를 직접 읽고 쓸 수 있음 |
| `claude --cloud` / `--teleport`(`/tp`) | 웹 세션 병렬 생성 후 로컬로 가져오기 | `--remote`는 폐기된 `--cloud` 별칭, teleport는 단방향(웹→터미널) |

선택 기준: 로컬 파일이 필요하면 Desktop 계열, 무중단이 필요하면 클라우드 계열.

## 플러그인 — 확장을 묶어 설치하는 단위

플러그인은 스킬, 서브에이전트, 훅, MCP와 LSP 서버 같은 구성요소를 한 단위로 설치하고 불러오는 디렉터리다(매니페스트는 `.claude-plugin/plugin.json`). 마켓플레이스는 플러그인 카탈로그다. Anthropic 공식 마켓(`claude-plugins-official`)은 첫 인터랙티브 세션에서 자동 등록되고, 다른 마켓은 `/plugin marketplace add <owner>/<repo>`로 먼저 추가한 뒤 `/plugin install <이름>@<마켓>`으로 설치한다(공식 문서 확인 2026-09-29).

- **보안 경계**: 플러그인의 훅과 MCP 서버 프로세스는 사용자 권한으로 샌드박스 밖에서 실행되고, 스킬, 명령과 에이전트는 지시로 컨텍스트에 들어간다. 마켓 이름은 카탈로그 발행자를 알려 줄 뿐 개별 플러그인을 보증하지 않으므로 설치 전에 구성요소를 읽는다. 자동 업데이트가 켜져 있으면 검토한 파일이 나중에 바뀔 수 있다
- **컨텍스트 비용**: 공식 마켓 플러그인은 설치 패널에서 매 턴 추가되는 토큰과 호출 시 추가되는 토큰의 추정치를 보여 준다

커뮤니티 워크플로 플러그인은 역할이 서로 겹친다. 아래는 공개 저장소 설명과 사용 후기를 요약한 것이며 기능과 효과는 각 저장소와 사용자의 주장이다(저장소 상태 2026-09-29 확인).

| 플러그인 | 주 역할 | 비고 |
|---|---|---|
| Superpowers | 요구사항 질문, 계획 작성과 실행, TDD 흐름 | 공식 마켓 등록 확인. brainstorming 단계가 스펙 수준 산출물을 내지만 선택지 밖 질문에 답할 개발자 판단이 필요하다는 후기 |
| gstack | 대표, QA 같은 관점의 의사결정 검토, 브라우저 자동화 | 개인 설정 공개 저장소 |
| oh-my-claudecode | 다중 에이전트 병렬 오케스트레이션 | |
| GSD (Get Shit Done) | 긴 작업의 context rot 방지, 스펙 기반 단계 계획, 세션 재개 | 원 저장소는 보관 처리되고 GSD Core로 이전 안내 |

- **역할별 조합 제안**: 의사결정은 gstack, 실행은 Superpowers, 긴 작업의 안정화는 GSD, 대규모 병렬이 필요하면 oh-my-claudecode를 더하는 3층 구성이 제안된다. 디자인 시스템의 토큰과 컴포넌트를 조합해 주는 것처럼 특정 산출물용 도메인 플러그인도 있으며, 개인이 만든 플러그인은 유지보수 주체와 갱신 빈도를 먼저 본다
- **하나로 시작**: 여러 개를 한 번에 설치하지 않는다. 비슷한 역할의 스킬과 훅이 겹치면 어느 흐름이 발동할지 예측하기 어렵고 매 턴 컨텍스트 비용이 쌓인다. 하나로 시작해 실제로 쓰는 스킬만 남기거나 필요한 스킬만 `.claude/skills/`로 흡수하고, 플러그인은 프로젝트 범위로 골라 설치한다

## 체크포인트

- 설정을 파일 직접 편집 대신 자연어로 시키는가
- 상태표시줄, 훅 같은 로컬 기능이 토큰 비용이 없다는 점을 아는가
- 음성은 긴 지시, 타이핑은 정확한 식별자로 나누는가
- 작업 성격(로컬 파일 vs 무중단)에 따라 원격 실행 방식을 고르는가
- 플러그인을 설치하기 전에 훅과 MCP 서버를 읽었는가, 역할이 겹치는 플러그인을 한꺼번에 깔지 않았는가

## 출처

- [Claude Code — CLI reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Cowork 시작하기](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork)
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

## 관련 문서

- [[Claude-Code-Fundamentals|Claude Code 기초]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우]]
- [[Claude-Code-Business-Automation|Claude Code 비즈니스 자동화]]
- [[Claude-Code-Extension-Reference|Claude Code 확장 메커니즘]]
- [[Agent-Skills|에이전트 스킬 (SKILL.md 포맷)]]
