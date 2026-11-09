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

## 컨텍스트의 계정 정보가 외부 요청에 실릴 때

모델 컨텍스트에 들어간 값은 모델이 직접 작성한 명령을 거쳐 밖으로 나갈 수 있다. 프롬프트 인젝션이 없어도 사이트의 자동화 클라이언트 정책을 따르려는 모델의 판단만으로 생긴다. 2026-11-09 Claude Code CHANGELOG, 공식 저장소의 privacy mod README, GitHub 이슈 #107757과 Claude Code 팀원의 Hacker News 댓글을 대조했다.

- **경위:** 계정 정보가 없으면 `@author` 태그 같은 곳에 이름을 지어낸다는 보고가 있어 로그인 사용자의 계정 이메일을 모델 컨텍스트에 넣었다(팀원 설명). 이후 웹 조사 중 모델이 직접 쓴 curl 호출의 User-Agent에 이 주소를 연락처로 넣어 제3자 사이트로 보낸 사례가 2.1.318에서 신고됐다. Wikimedia의 User-Agent 정책은 스크립트에 연락처(이메일, 웹사이트나 위키 사용자)를 담은 User-Agent를 쓰라고 하고 따르지 않으면 예고 없이 차단될 수 있다고 적는다.
- **지시, 검사, 제거는 다른 층이다:** 2.1.234 변경 기록은 계정 이메일을 사용자 식별에만 쓰고 요청 없이 무관한 서비스로 보내지 말라는 지시를 더했지만 이 지시로 막지 못했다. 2.1.317은 기본으로 켜진 내장 mod `cc-plugin-privacy`를 더했고, 변경 기록은 이를 웹이나 셸 도구 호출이 계정 이메일을 보내기 전에 묻는 검사로 적는다. 반면 2026-11-09 main 브랜치의 README는 Bash, PowerShell, Monitor 호출 입력에 계정 주소와 User-Agent 지정이 함께 있으면 확인 없이 거부한다고 설명하고, WebFetch, WebSearch와 MCP 호출, 스크립트 파일이나 변수에 담긴 주소, User-Agent가 아닌 헤더와 URL은 검사하지 않는다며 스스로를 경계가 아닌 배려라고 부른다. 설명이 서로 다르므로 설치한 버전에서 동작을 확인한다. 팀원은 당시 stable 채널이 이 mod가 없는 2.1.311이라고 적었다.
- **근본 조치는 예고 단계다:** 팀원은 2026-11-06 계정 이메일을 컨텍스트에서 빼는 변경을 다음 릴리스에 넣겠다고 밝혔다. 2026-11-09 확인한 변경 기록(2.1.319까지)에서는 그 반영을 찾지 못했다. 이슈에는 2.1.317과 2.1.318에서 mod가 로드됐는데도 거부되지 않았다는 사용자 재현 보고가 있으나 검증하지 않았다.
- **근거가 되는 원칙:** RFC 9110은 사용자 에이전트가 사용자의 명시적 설정 없이 이메일 주소를 담은 From 헤더를 보내지 말라고 하고(SHOULD NOT), 그 값이 요청을 받거나 관찰하는 누구에게나 보이며 로그에 남는다고 적는다. User-Agent에 넣은 주소도 같은 노출을 겪는다고 본다(해석). 같은 절은 로봇형 사용자 에이전트라면 과도하거나 잘못된 요청 등으로 서버에 문제가 생겼을 때 로봇을 운영하는 사람에게 연락할 수 있도록 유효한 From 헤더를 보내라고 한다(SHOULD). 따라서 쟁점은 연락처를 주는 일 자체가 아니라 사용자가 설정하지 않은 계정 주소를 모델이 골라 넣은 데 있다(해석).

점검 제안: 컨텍스트에 넣는 식별 정보를 작업에 필요한 범위로 줄이고, 출력 검사는 알려진 모양만 막는 보조 장치로 둔다. 연락처를 요구하는 사이트에 쓸 값(프로젝트 URL이나 전용 주소)을 지침에 미리 정한다. 외부 요청은 샌드박스 네트워크 허용 목록과 기록으로 함께 통제하고, 평문 로컬 트랜스크립트에서 외부 요청에 실린 개인정보를 주기적으로 찾아본다. 모델 밖 강제의 원칙은 [[Agent-Execution-Isolation|에이전트 실행 격리]], mod의 실행 위치는 [[Claude-Code-Extension-Reference#Mod — Claude Code 안에서 도는 함수 훅|확장 메커니즘의 Mod]]에 있다.

## 보조 출처가 제안한 자기 리뷰 3계층

WikiDocs가 소개한 per-edit 정규식 검사, end-of-turn diff review, commit-push 심층 review는 방어 계층을 나누는 설계 예시다. 현재 Claude Code의 공식 built-in 보안 보장으로 보지는 않으며, 차단이 필요한 규칙은 permission과 hook 같은 결정론적 경계에서 강제한다.

## 체크포인트

- 클라우드 실행에서 토큰 탈취를 구조로 막는 방법 (스코프 제한 자격 증명 + 프록시 변환)
- 네트워크를 차단해도 데이터가 VM을 벗어날 수 있는 경로와 그 함의
- 다층 방어 5겹을 순서대로 — 각 겹이 어떤 공격면을 맡는가
- 프롬프트 인젝션 방어에서 격리 컨텍스트와 fail-closed의 역할
- ZDR이 무엇을 포기하게 하는가 (서버 보관 기능)
- 컨텍스트에 넣은 값이 모델이 쓴 명령으로 나가는 경로와, 지시, 출력 검사, 컨텍스트 제거가 각각 막는 범위

## 출처

- [Anthropic, Work with Claude Tag](https://claude.com/docs/claude-tag/overview)
- [Anthropic, Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web)
- [Anthropic, Data usage](https://code.claude.com/docs/en/data-usage)
- [Anthropic, Zero data retention](https://code.claude.com/docs/en/zero-data-retention)
- [Anthropic, Configure the sandboxed Bash tool](https://code.claude.com/docs/en/sandboxing)
- [클로드 코드 가이드 (레퍼런스 20 클라우드 실행, 21 보안과 프라이버시) — WikiDocs](https://wikidocs.net/book/19104)
- [Claude Code CHANGELOG — GitHub, anthropics/claude-code](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) — 2026-11-09 2.1.234와 2.1.317 항목, 2.1.319까지 컨텍스트 제거 미반영 확인
- [privacy mod README — GitHub, anthropics/claude-code](https://github.com/anthropics/claude-code/blob/main/mods/privacy/README.md) — 2026-11-09 main 브랜치 기준 검사 대상, 검사하지 않는 경로와 끄는 방법
- [Bug Report: Privacy violation in User-Agent header — GitHub, anthropics/claude-code #107757](https://github.com/anthropics/claude-code/issues/107757) — 2026-11-05 신고, 2026-11-09 열린 상태, 공식 댓글과 사용자 재현 보고 확인
- [Claude Code sends your email address to websites — Hacker News](https://news.ycombinator.com/item?id=50385272) — 2026-11-05~06 Claude Code 팀원 댓글의 경위, 임시 mod, stable 채널 버전과 컨텍스트 제거 예고
- [IETF, RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.1.2) — 10.1.2 From
- [Wikimedia Foundation, User-Agent Policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy)

## 관련 문서

- [[Claude-Code-Config-Permissions|Claude Code 설정과 권한 (샌드박싱)]]
- [[LLM-Application-Security|LLM 애플리케이션 보안 (OWASP LLM Top 10, 프롬프트 인젝션)]]
- [[Claude-Code-Workflows|Claude Code 개발 워크플로우 (CI 연동)]]
- [[Production-Agent-Architecture-Guardrails|프로덕션 에이전트 아키텍처 (Defense in Depth)]]
