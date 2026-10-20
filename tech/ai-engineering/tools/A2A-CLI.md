---
tags: [ai, agent, a2a, cli, testing, automation]
status: done
verified_at: 2026-10-20
category: "AI엔지니어링(AIEngineering)"
aliases: ["A2A CLI", "a2a-cli", "A2A 명령줄 클라이언트"]
---

# A2A CLI — 터미널과 CI에서 A2A 에이전트 다루기

A2A CLI(`a2a`)는 A2A 프로토콜 v1.0을 기준으로 만든 공식 명령줄 클라이언트로, Agent Card를 조회하고, 메시지를 보내고, 작업을 추적한다. 릴리스 v0.3.1 소스는 v0.3 형식의 Agent Card도 해석하고, `--a2a-version`을 지정하지 않으면 v0.3 호환 REST, JSON-RPC, gRPC 전송도 함께 등록한다. A2A 계층이 없는 스크립트, CI 작업이나 코딩 에이전트도 이 명령 하나로 원격 A2A 에이전트에 일을 맡길 수 있다. 언어별 SDK와 커뮤니티 CLI마다 달랐던 명령 이름, 플래그, 출력 형태와 전송 처리를 하나로 맞추려는 프로젝트이며 A2A Go SDK의 CLI를 바탕으로 한다. 아래 내용은 2026-10-20 기준 저장소 main 브랜치 문서와 릴리스 v0.3.1(2026-10-16)로 확인했다. 명령 레퍼런스는 첫머리에서 저장소가 알파 단계라고 경고하고, 명세도 구현을 안정성 보장 없는 초기 알파로 낼 수 있다고 적는다. CI에서는 명령, 플래그와 출력 형식이 바뀔 수 있다고 보고 확인한 버전을 고정해 쓴다(적용 제안).

## 설치와 기본 명령

Homebrew(`brew tap a2aproject/a2a-cli https://github.com/a2aproject/a2a-cli` 후 `brew install a2a`), WinGet(`winget install a2aproject.a2acli`), `go install github.com/a2aproject/a2a-cli@latest`, 릴리스의 미리 빌드한 바이너리로 설치한다. `go install`은 바이너리 이름을 `a2a-cli`로 만들므로 `a2a`로 바꿔야 하고, 릴리스에서 아카이브(tar.gz, zip)를 내려받았으면 압축을 풀기 전에 그 아카이브의 SHA-256 값을 같은 릴리스의 `checksums.txt`와 대조한다.

```bash
a2a card get https://agent.example.com                       # Agent Card 조회
a2a send -a https://agent.example.com "Hello, what can you do?"   # 완료까지 대기
a2a send -a https://agent.example.com --stream "Summarize this"   # 이벤트 스트리밍
a2a send -a https://agent.example.com --async "Start a long analysis"  # 완료를 기다리지 않고 바로 반환(작업이 생기면 작업 ID, 컨텍스트 ID와 현재 상태 출력)
a2a task get -a https://agent.example.com <task-id> --wait --poll-interval 2s --timeout 60s
```

| 명령 | 역할 |
|---|---|
| `card get` | Agent Card를 조회한다. 인증된 확장 카드는 `--extended`와 인증 정보로 받는다 |
| `send` | 메시지를 보낸다. 기본은 종료나 중단 상태까지 대기(blocking `SendMessage` 호출 한 번이며 기본값 30s인 `--timeout`을 넘기면 시간 초과 오류), `--stream`은 `SendStreamingMessage`(서버가 지원하지 않으면 폴링으로 대체), `--async`는 즉시 반환 |
| `task get` | 작업 상태와 산출물을 본다. `--wait`는 종료 상태까지 폴링하고, 입력이나 인증이 필요한 중단 상태에서는 일찍 반환한다 |
| `task list`, `task cancel`, `task subscribe` | 작업 목록 조회, 취소, 이벤트 구독 |
| `server` | 로컬 A2A 서버를 띄운다. `--echo`와 `--exec`는 학습, 데모와 테스트용이고, `--proxy`는 상위 에이전트 앞에서 디버깅과 인증 헤더 주입에 쓴다(아래 절) |

대상 에이전트는 `-a, --agent-card`(호스트, 카드 URL 또는 로컬 파일을 받아 카드를 해석하고 전송을 협상)나 `-e, --endpoint`(카드 해석 없이 직접 연결하며 `--transport`를 정확히 하나 지정)로 고른다. 내장 전송은 JSON-RPC, REST, gRPC이고(`--transport`가 없으면 카드가 선언한 인터페이스 가운데 지원하는 것을 고른다), `PATH`에 `a2a-transport-<name>` 바이너리를 두면 다시 빌드하지 않고 사용자 정의 전송을 `--transport <name>`으로 쓸 수 있다. `-a`로 카드를 해석할 때는 `--transport`가 없어도 카드가 광고한 `protocolBinding`과 이름이 같은 플러그인을 등록하고, 그 인터페이스가 선택되면 실행한다. 명령 플러그인(`a2a-<name>`)과 달리 따로 켜는 단계가 없고 CLI는 플러그인을 하위 프로세스로 띄울 뿐 샌드박스로 격리하지 않으므로, 신뢰하는 바이너리만 `PATH`에 두고 설치된 플러그인은 `a2a transport list`로 확인한다. 이 플러그인은 표준 바인딩을 말하는 로컬 프록시로 동작하므로, 사용자 정의 바인딩의 동작 계약은 여전히 따로 명세해야 한다([[A2A-Kafka-Transport|A2A와 Kafka 전송]]).

## 자동화에서는 도구 성공과 작업 결과를 따로 읽는다

명령의 성공 여부와 에이전트가 내린 결과는 다른 신호로 나온다. `SPEC.md`(v0.2, Review 상태)는 이를 설계 원칙으로 둔다. 명세는 Review 단계에서 규범 요구사항이 버전 변경 없이 바뀔 수 있다고 밝히고, 구현 저장소는 명령 참조 문서에서 alpha 단계라고 경고한다. v0.3.1 구현의 종료 코드와 JSON 출력도 명세와 일부 다르므로, CI에서는 CLI 버전을 고정하고 업그레이드할 때 종료 코드와 출력 형태를 다시 확인한다(적용 제안).

| 신호 | 담는 것 |
|---|---|
| 종료 코드 | CLI가 요청을 수행하고 결과를 보고했는지. 0 성공, 1 실패, 2 사용법 오류가 필수이고 3(에이전트나 카드에 닿지 못함), 4(인증 실패), 5(시간 초과)는 예약 코드다. 예약 코드를 구현하지 않은 도구는 1을 보고한다 |
| 작업 상태와 출력 | 에이전트의 판단. 작업이 `FAILED`나 `REJECTED`로 끝나거나 `INPUT_REQUIRED`, `AUTH_REQUIRED`에서 멈춰도 CLI가 그 결과를 제대로 받아 보고했다면 종료 코드는 0이다 |

따라서 CI에서 `a2a send`의 종료 코드만 보고 에이전트 작업이 성공했다고 판정하지 않는다. `-o json`(들여쓴 JSON)이나 `-o jsonl`(한 줄에 객체 하나, 스트리밍에 적합)로 받은 프로토콜 객체에서 작업 상태를 따로 검사한다. v0.3.1의 `send`와 `task get`은 결과를 `task`나 `message` 필드로 감싸 내고(명세 부록 B는 `task get`이 감싸지 않은 `Task`를 내도록 정한다), 상태 값은 위 표처럼 줄여 쓴 `FAILED`가 아니라 `TASK_STATE_FAILED` 같은 wire 값이다. 스크립트는 `.task.status.state`가 `TASK_STATE_COMPLETED`인지 확인하고, 작업 없이 `message`만 온 응답과 실패 시 stdout에 올 수 있는 `error` 객체도 따로 처리한다. `-o json --stream`은 명세 §11.3과 달리 이벤트마다 들여쓴 JSON을 이어 쓰므로 줄 단위로 읽으려면 `-o jsonl`을 쓴다. 명세는 기계 판독 형식에서 stdout에는 구조화된 결과만, 진단과 로그는 stderr로 보내도록 요구한다. v0.3.1 소스(`internal/clierr/clierr.go`)에서 종료 코드 4는 명세의 인증 실패 대신 카드 해석이 전송 오류 외의 이유(404 같은 200이 아닌 응답이나 잘못된 본문 등)로 실패했을 때 나오고, 에이전트 호출에서 인증이 거절되면 1로 끝난다(바이너리 실행으로는 확인하지 않음). 따라서 스크립트는 0이 아닌 값 전체를 실패로 다루고, 원인은 JSON 출력 오류 객체의 `error.code`와 `error.a2aCode`로 구분하는 쪽이 안전하다(적용 제안).

설정은 플래그, `A2ACLI_` 접두사 환경 변수(예: `A2ACLI_TIMEOUT`), `--config` 파일이나 가장 가까운 `.env`, 사용자 `config.yaml`, 전역 `.env`, 기본값 순으로 앞선 것이 이긴다. `--stream`은 설정 파일이나 환경 변수에서 읽지 않으므로 매번 명시한다. 반면 `send`의 `--async` 같은 명령별 플래그는 `A2ACLI_ASYNC` 환경 변수나 작업 디렉터리에서 위로 올라가며 찾은 `.env`에서도 읽히므로, 이 값이 켜진 환경에서는 `send`가 완료되지 않은 작업을 받은 채 종료 코드 0을 낼 수 있다. 인증 토큰을 `.env`에 둘 수 있지만 문서는 비밀 값을 비공개로 유지하는 파일에만 두라고 안내하므로 저장소에 커밋하지 않는다. 적용된 값과 출처는 `a2a config show`로 확인한다. 다만 v0.3.1의 `config show`는 전역 플래그만 나열해 `--async`는 보이지 않고, 자격 증명은 `--auth`와 `Authorization` 서비스 파라미터만 가린다. 따라서 완료를 기다려야 하는 CI 호출에는 `--async=false`를 명시하고, `X-API-Key` 같은 다른 자격 증명을 `--svc-param`으로 환경 변수나 설정 파일에 두었다면 `config show` 출력을 로그에 남기지 않는다(적용 제안).

## 스크립트를 테스트용 A2A 에이전트로 감싸기

`a2a server`는 SDK 없이 A2A 서버를 띄운다. 기본 주소는 `127.0.0.1:8080`이다. v0.3.1 구현은 들어오는 요청을 인증하지 않으므로, `--host`로 루프백 밖에 열면 접근할 수 있는 누구나 `--exec`로 감싼 명령을 원하는 입력으로 실행하거나 `--proxy`에 주입한 인증 정보로 상위 에이전트를 호출할 수 있다. 시험 서버는 루프백에만 연다(적용 제안).

- **`--echo`:** 받은 메시지를 그대로 돌려준다. 연결 확인과 클라이언트 개발용이다.
- **`--exec "<명령>"`:** 들어온 메시지를 프로세스의 stdin으로 주고 stdout을 응답 산출물로 돌려준다. 명령 참조 문서는 첫 텍스트 파트를 넘긴다고 적지만 v0.3.1 구현은 모든 파트를 공백으로 이어 넘기고, 파일 파트는 내용 대신 이름, 형식과 크기(URL 파트는 URL)를 적은 설명으로, 데이터 파트는 JSON 문자열로 바꾼다. 종료 코드 0은 작업 `completed`, 0이 아니면 `failed`이고 stderr는 실패 상태 메시지에 붙는다. `--chunk=$'\n'`처럼 구분자를 주면 출력을 나눠 산출물 조각 이벤트로 스트리밍하므로 클라이언트의 스트리밍 처리를 시험할 수 있다. 파이썬 스크립트는 `python3 -u`로 출력 버퍼링을 끄거나 출력마다 flush해야 조각이 즉시 나간다(공식 예제는 둘 다 쓴다).
- **`--proxy`:** 상위 에이전트로 요청을 전달하며 트래픽을 stderr에 기록한다. 상호작용 디버깅이나 인증 헤더 주입에 쓴다.

`--protocol 0.3`과 `--card-compat`으로 v0.3 클라이언트와의 호환도 시험할 수 있다. 공식 소개 글은 `--echo`와 `--exec`를 학습, 데모와 테스트용으로 안내하며 운영 서버의 대체로 쓰지 않는다.

`--exec`로 감싼 스크립트가 실패하면 서버 쪽 작업은 `failed`가 되지만, 이를 호출한 `a2a send`는 결과를 정상 수신하면 작업 상태를 검사하지 않고 종료 코드 0을 낸다(v0.3.1 소스 기준). 앞 절의 두 신호를 함께 확인하는 연습으로 쓰기 좋다.

## 코딩 에이전트에 연결하기

저장소는 Claude Code, Cursor, Codex 같은 하네스가 `a2a`를 호출하도록 가르치는 Agent Skill(`npx skills add https://github.com/a2aproject/a2a-cli --skill a2a-cli`)과 같은 스킬을 묶은 Agent Plugin을 함께 배포한다. 스킬은 `a2a` 바이너리를 호출하므로 CLI를 먼저 설치한다. 스킬은 에이전트가 셸에서 `a2a`를 실행해 외부 에이전트에 작업을 보내게 하므로, 호출할 에이전트 주소는 MCP 도구 권한이 아니라 하네스의 셸 명령 허용 규칙으로 제한하고, `A2ACLI_*` 환경 변수나 설정 파일(작업 디렉터리에서 위로 찾는 `.env` 포함)에 둔 인증 정보는 대상 에이전트와 관계없이 모든 요청에 붙으므로 그곳에 둘 자격 증명의 범위도 함께 정한다(적용 제안, [[MCP#통제와 보안: 권한이 생긴 만큼|도구 권한 통제]]). 로컬에서 여러 코딩 에이전트를 함께 돌리는 제품 기능과 A2A 프로토콜로 독립된 에이전트에 작업을 맡기는 일은 다르다([[MCP#A2A와의 경계 — 도구 연결과 에이전트 협업|MCP와 A2A의 경계]]).

## 점검

- `send`가 종료 코드 0을 냈는데 작업이 `FAILED`일 수 있는 이유를 설명할 수 있는가?
- CI 스크립트가 작업 상태를 JSON 출력에서 따로 확인하는가?
- `--endpoint`로 직접 연결할 때 왜 `--transport`가 하나 필요한가?
- `--exec`로 감싼 스크립트의 스트리밍이 한꺼번에 도착한다면 스크립트의 출력 버퍼링, 서버의 `--chunk` 설정과 클라이언트의 `--stream` 지정을 확인했는가?
- 코딩 에이전트에 스킬을 설치하기 전에 호출 가능한 외부 에이전트와 자격 증명 범위를 정했는가?

## 출처

- [Meet the A2A CLI: discover, message, and manage agents from your terminal — A2A Protocol](https://a2a-protocol.org/latest/blog/2026/10/01/introducing-a2a-cli/) — 2026-10-01 공개
- [a2a-cli — a2aproject](https://github.com/a2aproject/a2a-cli) — 2026-10-20 main 브랜치 README, 릴리스 v0.3.1
- [a2aproject, a2a-cli Command Reference](https://github.com/a2aproject/a2a-cli/blob/main/internal/README.md) — 전역 플래그, 설정 우선순위, 서버 모드, 출력 형식
- [a2aproject, a2a-cli Specification](https://github.com/a2aproject/a2a-cli/blob/main/specification/SPEC.md) — v0.2(Review, 2026-08-17 갱신), 설계 원칙과 종료 코드
- [A2A Protocol, v1.0.0 Specification](https://a2a-protocol.org/v1.0.0/specification/)

## 관련 문서

- [[A2A-Kafka-Transport|A2A와 Kafka 전송]] — 표준 바인딩과 사용자 정의 바인딩의 책임
- [[MCP#A2A와의 경계 — 도구 연결과 에이전트 협업|MCP와 A2A의 경계]] — 도구 연결과 에이전트 협업의 구분
- [[MCP-Security-Boundaries|MCP 보안 경계]] — 에이전트에 외부 호출 권한을 줄 때의 기준
