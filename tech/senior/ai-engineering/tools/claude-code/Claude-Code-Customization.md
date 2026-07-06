---
tags: [senior, ai, claude-code, customization, voice, remote]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["Claude Code Customization", "클로드 코드 커스터마이즈", "Voice Mode", "원격 제어"]
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
| Cowork 탭 | 클라우드 VM 실행, 컴퓨터 꺼도 진행 | 로컬 파일 접근 불가 |
| `claude --remote` / `--teleport`(`/tp`) | 웹 세션 병렬 생성 후 로컬로 가져오기 | teleport는 단방향(웹→터미널) |

선택 기준: 로컬 파일이 필요하면 Desktop 계열, 무중단이 필요하면 클라우드 계열.

## 체크포인트

- 설정을 파일 직접 편집 대신 자연어로 시키는가
- 상태표시줄, 훅 같은 로컬 기능이 토큰 비용이 없다는 점을 아는가
- 음성은 긴 지시, 타이핑은 정확한 식별자로 나누는가
- 작업 성격(로컬 파일 vs 무중단)에 따라 원격 실행 방식을 고르는가

## 출처

- [클로드 코드 가이드 (커스터마이즈 파트) — WikiDocs](https://wikidocs.net/book/19104)

## 관련 문서

- [[Claude-Code-Fundamentals|Claude Code 기초]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우]]
- [[Claude-Code-Business-Automation|Claude Code 비즈니스 자동화]]
