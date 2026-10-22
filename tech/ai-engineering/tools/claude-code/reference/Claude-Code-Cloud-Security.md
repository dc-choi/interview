---
tags: [ai, claude-code, cloud, security, privacy, sandbox]
status: done
verified_at: 2026-08-28
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Code Cloud Security", "클로드 코드 클라우드 실행", "클로드 코드 보안"]
---

# Claude Code 클라우드 실행과 보안 — 격리 VM, 다층 방어, 데이터 정책

AI 에이전트에게 자율을 줄수록 격리가 그 대가다. 클라우드 실행은 격리 VM과 자격 증명 프록시로, 로컬 실행은 다층 방어로 이 문제를 푼다. 에이전트 인프라 보안 설계의 레퍼런스 사례.

## 클라우드 실행 아키텍처

- 흐름: Anthropic-hosted cloud session은 격리된 관리형 VM에서 저장소를 clone하거나 bundle로 받아 setup script와 network policy를 적용해 작업한다. 브라우저를 닫아도 session은 계속된다. Self-hosted environment의 격리는 조직이 책임진다.
- 설치 도구와 VM resource는 바뀔 수 있으므로 현재 공식 installed-tools 문서를 기준으로 확인한다.
- **자격 증명 설계가 핵심**: Anthropic-hosted environment에서는 Git credential과 signing key를 sandbox에 넣지 않고 scoped credential과 secure proxy로 처리한다. 연결 계정이 볼 수 있는 repository 범위는 GitHub 쪽 권한으로 제한해야 한다.
- Network access는 cloud environment에서 관리하며 기본적으로 제한할 수 있고 끌 수도 있다. 차단해도 Anthropic API 통신은 가능하므로 data가 VM 밖으로 나갈 수 있다는 전제로 민감도를 판단한다.
- 터미널에서 새 cloud session을 시작하는 현재 flag는 `--cloud`이고 `--remote`는 deprecated alias다. `--teleport`는 cloud session의 branch와 대화를 터미널로 가져온다.

### Slack에서 맡기는 작업의 실행 위치와 접근 범위

2026-10-23 Claude Tag 공식 개요를 부분 대조했다. Claude Tag는 Slack 채널과 스레드에서 요청을 받고 결과를 돌려주는 별도 제품이며, Anthropic의 직접 제공 서비스에서 Team과 Enterprise 플랜에 제공된다. 개인 Free, Pro, Max 플랜이나 제3자 배포에는 제공되지 않는다. Slack으로 로컬 CLI를 호출하는 자체 구성과 같은 제품으로 취급하지 않는다.

작업은 사용자 컴퓨터가 아니라 대화 시작 때 생성되는 임시 샌드박스에서 실행되며, 대화가 비활성화되면 샌드박스가 폐기된다. 외부 시스템 접근은 관리자 연결 설정과 저장소 권한 등으로 정한다. 채널의 기본 설정과 사용자가 자신의 요청에 허용한 개인 커넥터도 구분한다. Slack에서 요청할 수 있다는 사실만으로 모든 서비스의 데이터나 작업 권한을 얻는 것은 아니다.

운영 점검 제안: 요청에 목표, 완료 기준과 결과 증거를 적고, 채널 참여자에게 공개해도 되는 자료인지 확인한다. 결과 메시지만으로 코드 변경이나 배포 성공을 판단하지 않고 diff와 검사 결과를 대조한다. 실제 Slack 연결, 권한 차단과 샌드박스 수명은 시험하지 않았으며, 기존 클라우드 실행과 데이터 보존 정책 전체를 재검증한 것은 아니므로 `verified_at`은 유지한다.

## 로컬 보안 — 다층 방어 5겹

1. **로컬 실행 모델**: 실행은 로컬에서 하지만 model inference에 필요한 prompt, context와 tool output은 provider로 전송된다. 코드 전체가 항상 로컬에만 남는다고 가정하지 않는다.
2. **권한 아키텍처**: 기본 읽기 전용, 묻고 행동 ([[Claude-Code-Config-Permissions|규칙 엔진]])
3. **샌드박스**: macOS Seatbelt, Linux와 WSL2 bubblewrap로 Bash command와 child process의 filesystem, network 접근을 격리한다. Built-in Read, Edit, Write와 computer use에는 이 경계가 적용되지 않는다.
4. **프롬프트 인젝션 방어**: 외부 content는 신뢰하지 않고 permission, 최소 domain allowlist와 변경 review를 함께 사용한다. Sandbox만으로 prompt injection을 제거했다고 보지 않는다.
5. **관리 설정과 훅**: 조직 정책의 물리적 강제

## 데이터 보존과 텔레메트리

- 보존 정량: 소비자 플랜은 model 개선을 허용하면 5년, 허용하지 않으면 30일이다. 상업용 Team, Enterprise와 API의 표준은 30일이고 별도 opt-in이 없으면 model 학습에 쓰지 않는다. ZDR은 자격이 확인된 Enterprise 조직에 별도로 적용되며 모든 product와 data를 포괄하지 않는다.
- 로컬에는 트랜스크립트가 `~/.claude/projects/` 아래 평문으로 기본 30일 저장된다. `cleanupPeriodDays`로 기간을 조정할 수 있다.
- Usage metric은 code, prompt, file path를 포함하지 않는다. Error report는 stack trace를 전송하기 전에 알려진 secret과 개인 정보 pattern을 redact한다. 각각 끄거나 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`으로 비필수 traffic을 함께 끌 수 있다.
- ZDR에서는 Claude Code on the Web, cloud session, Claude Tag, Artifact, feedback 제출과 Remote Control처럼 server storage가 필요한 기능이 차단된다. 제3자 integration과 관리 metadata는 ZDR 범위 밖이며, 법적 의무나 Usage Policy 위반 대응을 위한 보존 예외와 사용할 수 없는 model이 있다.

## 보조 출처가 제안한 자기 리뷰 3계층

WikiDocs가 소개한 per-edit 정규식 검사, end-of-turn diff review, commit-push 심층 review는 방어 계층을 나누는 설계 예시다. 현재 Claude Code의 공식 built-in 보안 보장으로 보지는 않으며, 차단이 필요한 규칙은 permission과 hook 같은 결정론적 경계에서 강제한다.

## 체크포인트

- 클라우드 실행에서 토큰 탈취를 구조로 막는 방법 (스코프 제한 자격 증명 + 프록시 변환)
- 네트워크를 차단해도 데이터가 VM을 벗어날 수 있는 경로와 그 함의
- 다층 방어 5겹을 순서대로 — 각 겹이 어떤 공격면을 맡는가
- 프롬프트 인젝션 방어에서 격리 컨텍스트와 fail-closed의 역할
- ZDR이 무엇을 포기하게 하는가 (서버 보관 기능)

## 출처

- [Anthropic, Work with Claude Tag](https://claude.com/docs/claude-tag/overview)
- [Anthropic, Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web)
- [Anthropic, Data usage](https://code.claude.com/docs/en/data-usage)
- [Anthropic, Zero data retention](https://code.claude.com/docs/en/zero-data-retention)
- [Anthropic, Configure the sandboxed Bash tool](https://code.claude.com/docs/en/sandboxing)
- [클로드 코드 가이드 (레퍼런스 20 클라우드 실행, 21 보안과 프라이버시) — WikiDocs](https://wikidocs.net/book/19104)

## 관련 문서

- [[Claude-Code-Config-Permissions|Claude Code 설정과 권한 (샌드박싱)]]
- [[LLM-Application-Security|LLM 애플리케이션 보안 (OWASP LLM Top 10, 프롬프트 인젝션)]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우 (CI 연동)]]
- [[Production-Agent-Architecture-Guardrails|프로덕션 에이전트 아키텍처 (Defense in Depth)]]
