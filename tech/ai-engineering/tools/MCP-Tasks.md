---
tags: [ai, mcp, asynchronous, tasks, protocol]
status: done
verified_at: 2026-11-04
category: "AI엔지니어링(AIEngineering)"
aliases: ["MCP Tasks", "MCP 비동기 작업"]
---

# MCP Tasks: 접수와 완료를 분리하는 비동기 작업

MCP Tasks는 오래 걸리는 요청에 최종 결과 대신 작업 식별자를 먼저 반환하고, 이후 상태와 결과를 조회하게 하는 확장이다. 빌드, 일괄 처리와 승인 대기처럼 연결을 계속 열어 두기 어려운 작업에 맞는다. 접수 응답은 작업 완료의 증거가 아니다.

## 현재 확장과 이전 실험 명세를 구분한다

2026-11-04 공식 문서 대조 기준이다. Tasks는 2025-11-25 명세에 실험 기능으로 들어갔고, 현재 문서는 별도 확장으로 안내한다. 두 계약의 필드를 섞지 않는다.

| 구분 | 2025-11-25 실험 명세 | 현재 Tasks 확장 |
|---|---|---|
| 지원 선언 | 초기화의 `tasks` capability, 도구별 `execution.taskSupport` | 요청별 client capability와 `server/discover`의 `io.modelcontextprotocol/tasks` 확장 |
| 작업 생성 | 요청자가 `task` 필드로 요청 | 지원을 선언한 클라이언트의 요청에 서버가 작업 응답 여부를 결정 |
| 결과 회수 | `tasks/get`으로 상태, `tasks/result`로 결과 조회 | `tasks/get`에서 `completed`는 `result`, `failed`는 `error` 포함. `cancelled`에는 둘 다 요구하지 않음 |

현재 확장은 작업을 영속적으로 만든 뒤 `resultType: "task"`와 `taskId`를 반환한다. 클라이언트는 `pollIntervalMs`를 고려해 조회하고, `input_required`이면 `inputRequests`에 대한 응답을 `tasks/update`로 보낸다. `completed`, `failed`, `cancelled`는 종료 상태다. 작업 기록의 TTL과 서버의 실행 수명은 별도로 확인한다.

취소도 요청과 효과를 나눈다. `tasks/cancel` 응답은 취소 의향의 접수이며 실제 중단을 보장하지 않는다. 서버가 작업을 계속해 다른 종료 상태에 이를 수 있다. 이미 발생한 외부 변경의 롤백까지 뜻하지 않는다.

## 호스트의 백그라운드 호출과 서버 작업은 다르다

Claude Code 공식 문서의 2026-11-04 안내 기준, MCP Tasks는 CLI v2.1.304 이상 공개 베타다. 버전 외에도 서버 지원, 프로토콜 2026-07-28 연결, 기능 플래그와 세션 조건을 만족해야 한다. 일반 도구 호출이 오래 걸려 백그라운드로 옮겨지는 것과 구분한다.

- 원격 서버 작업은 클라이언트 종료 뒤에도 실행될 수 있다. 같은 세션을 대화형으로 재개하고 서버가 작업을 보존하고 있어야 다시 추적한다.
- stdio 서버는 Claude Code 종료 때 프로세스가 멈춘다. 별도 실행기로 위임한다는 서버 계약이 없으면 종료 뒤 지속을 가정하지 않는다.
- 새 세션과 일회성 `claude -p` 재개는 기존 작업을 따라가지 않는다. SDK와 stream-json은 별도 조건이 있다.
- 서버가 연결된 상태에서 `/tasks`로 중단하면 추적을 멈추고 서버에 취소를 요청한다. 연결이 끊겼다면 먼저 `/mcp`에서 재연결한다. 재연결 없이 중단하면 취소 요청이 전송되지 않고 Claude Code가 작업을 잊어 다시 추적할 수 없다. 원격 작업은 계속 실행될 수 있으므로 서버의 실제 중단 여부를 별도로 확인한다.

이 내용은 공식 지원 계약의 확인이며, 특정 장비에서 재연결과 취소를 실행해 검증한 결과는 아니다.

## 회귀 테스트에 적용할 점검안

다음은 위 계약을 테스트 서비스에 적용한 설계 예시다.

1. 작업에 테스트 대상 커밋이나 입력 스냅샷을 연결한다. 실행 중 파일이 바뀌면 어느 코드를 검사했는지 불명확해질 수 있다.
2. 접수된 작업 ID, 상태 조회와 실제 테스트 통과를 나눠 기록한다. `completed` 결과에서도 실패 건수와 테스트 로그를 확인한다.
3. 연결이 끊기면 기존 작업 조회를 먼저 시도한다. 새 작업 제출은 중복 실행 가능성을 따로 검토한다.
4. 취소 요청 뒤에는 서버 상태와 생성된 산출물을 확인한다. 취소 확인 전 새 실행이 겹칠 수 있음을 고려한다.

## 출처

- [Model Context Protocol, Tasks extension overview](https://modelcontextprotocol.io/extensions/tasks/overview) — 현재 확장의 협상, 조회, 입력과 취소 계약
- [Model Context Protocol, Tasks extension schema (2026-07-28)](https://github.com/modelcontextprotocol/ext-tasks/blob/main/schema/2026-07-28/schema.ts) — `CompletedTask`, `FailedTask`, `CancelledTask`의 상태별 필드 계약
- [Model Context Protocol, Tasks (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks) — 이전 실험 명세의 생성과 결과 회수 방식
- [Claude Code, Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp#mcp-tasks-that-run-on-the-server) — 지원 조건, stdio 수명, 같은 세션 재개와 취소의 경계

## 관련 문서

- [[MCP|MCP의 역할과 연결 구조]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[Evaluation-Driven-Development|평가 주도 개발]]
