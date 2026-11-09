---
tags: [ai, mcp, typescript, sdk, upgrade, json-schema]
status: done
verified_at: 2026-11-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["MCP TypeScript SDK Upgrade", "MCP TypeScript SDK 업그레이드 점검"]
---

# MCP TypeScript SDK 업그레이드 점검

MCP SDK를 올릴 때는 새 기능을 쓰지 않는 서버도 기존 도구 정의가 그대로 동작하는지 먼저 확인한다. 스키마 검증 라이브러리, 프로토콜 버전별 직렬화와 헤더 규칙이 함께 바뀌기 때문이다. 아래는 `@modelcontextprotocol/server` 2.4.0(2026-10-23 npm 게시) 릴리스 노트 기준이다.

## 점검 순서

새 기능 도입보다 기존 도구의 회귀를 먼저 본다. 헤더와 결과 직렬화 변경은 서버 기동 오류가 아니라 특정 도구의 호출 실패, 클라이언트 목록의 누락이나 읽기 위치 변화로 나타나기 때문이다.

1. 도구 스키마의 `$id`, `$ref` 식별자
2. `x-mcp-header`를 붙인 인자의 타입
3. `outputSchema`가 `$ref` 루트인 도구의 `structuredContent` 읽기 위치
4. 그 뒤에 Skills 확장 도입 여부

## 1. 스키마 식별자의 URI 검증

서버와 클라이언트 2.4.0에 들어간 Ajv 검증기가 fast-uri 3.1.0 대신 3.1.8로 빌드됐다. 3.1.6 이후 fast-uri는 다음 식별자를 거부한다.

| 식별자 | 결과 |
|---|---|
| `my_tool:output` | 거부. 콜론 앞부분이 유효하지 않은 URI scheme으로 해석된다 |
| `urn:my_tool:output` | 거부. URN namespace가 유효하지 않다 |
| `my_tool_output` | 영향 없음 |
| `#/$defs/...`, `#/definitions/...` 내부 참조 | 영향 없음 |

이런 `$id`나 `$ref`를 가진 스키마는 컴파일되지 않고, 그 스키마를 쓰는 도구는 invalid-schema 오류로 실패한다. 거부 기준은 콜론이나 `urn:` 접두사 자체가 아니라 콜론 앞의 scheme이나 URN namespace에 URI 문법이 허용하지 않는 문자(밑줄 등)가 있는지다. 그래서 snake_case 도구 이름을 그대로 식별자에 쓰고 콜론으로 구분한 코드가 주 점검 대상이고, 앞에 `urn:`만 붙이는 수정도 같은 이유로 실패한다. 밑줄 식별자나 내부 참조로 바꾼다.

릴리스 노트는 서버에서 이 오류가 언제 나는지 설명하지 않는다. 클라이언트도 같은 검증기를 쓰므로 서버를 올리지 않아도 2.4.0 클라이언트에서 그 도구 호출이 실패할 수 있다는 점을 함께 본다.

## 2. `x-mcp-header`의 number 인자

2026-07-28 명세는 `x-mcp-header`로 헤더에 복제하는 인자에 string, integer, boolean만 허용하고 number를 금지한다. Streamable HTTP 클라이언트는 규칙을 어긴 도구를 `tools/list`에서 빼야(MUST) 하고, stdio 같은 다른 전송의 클라이언트는 이 표시를 무시할 수 있다(MAY). 헤더 복제 규칙 자체는 [[MCP-Security-Boundaries|MCP 보안 경계]]의 헤더 미러링 절에 정리했다.

TypeScript SDK 2.4.0의 동작은 다음과 같다.

- 2026-07-28 연결에서 stdio가 아닌 클라이언트는 number 인자에 `x-mcp-header`가 붙은 도구를 목록에 넣지 않고, 그 도구에 `Mcp-Param-*` 헤더도 보내지 않는다.
- 서버는 `tools/call`에서 `Mcp-Param-*` 헤더 검사를 계속한다. 본문에 선언한 인자의 값이 있는데 헤더가 없거나 다르면 400과 `-32020`으로 거절한다. 클라이언트가 그 도구에 헤더를 보내지 않으므로, 목록 밖에서 그 인자 값을 담아 호출해도 같은 오류가 난다. 인자를 생략한 호출에는 헤더를 기대하지 않는다.
- `registerTool`은 이런 도구로 예외를 던지지 않는다. 업그레이드 뒤 서버 기동이 멈추지 않게 하려는 선택이며(PR #2960), 대신 서버는 도구 목록을 낼 때마다 경고 로그를 남긴다.

수정은 실제 값이 정수면 `z.int()`로 타입을 좁히고, 소수가 필요하면 헤더 표시를 뺀다. 도구 등록 때 잘못된 표시를 `InvalidSignature`로 거부하는 Python SDK 2.3.0과 시행 지점이 다르다([[MCP-Security-Boundaries|MCP 보안 경계]]의 Python SDK 2.3.0 절). TypeScript 서버는 기동과 등록이 정상이어도 클라이언트의 실제 `tools/list` 결과와 서버 경고 로그를 함께 확인해야 누락을 찾는다.

## 3. `$ref` 루트 outputSchema의 결과 위치

zod의 `z.object({...}).meta({ id })`는 루트가 `$defs`나 `definitions`의 `type: "object"` 항목을 가리키는 `$ref`인 스키마를 만든다. 2.4.0부터 SDK는 이런 루트와 그런 참조들의 union을 객체 스키마로 취급한다.

- 2025-11-25 같은 2025 계열 연결에서 이 스키마와 `structuredContent`가 더는 `{ result }`로 감싸지지 않는다. 클라이언트는 `structuredContent.result` 대신 `structuredContent`를 읽는다.
- 모든 프로토콜 계열에서 광고하는 스키마의 루트에 `type: "object"`가 붙는다.

결과를 소비하는 클라이언트 코드, 응답 스냅샷 테스트와 출력 스키마를 비교하는 계약 테스트가 깨질 수 있다. 클라이언트를 직접 관리하면 SDK 업그레이드와 클라이언트 읽기 경로 변경을 같은 배포 단위로 묶을 수 있다. 다른 호스트처럼 관리하지 않는 클라이언트가 있으면 전환 기간 동안 두 형태(`structuredContent.result`와 `structuredContent`)를 모두 읽게 하거나 변경을 미리 알리는 방법을 검토한다. 이 배포 순서는 릴리스 노트가 아니라 변경 내용에서 도출한 운영 제안이다.

## 4. Skills 확장

2.4.0은 Skills over MCP(SEP-2640)를 서버의 `@modelcontextprotocol/server/ext/skills`(Node용 `ext/skills/node` 포함), 클라이언트와 core의 `ext/skills` 하위 경로로 추가했다. 2025-11-25와 2026-07-28 연결에서 동작한다. 확장을 서버에 연결하는 `SkillsExtension.attach`만 `@experimental`이라 minor 릴리스에서 연결 방식이 바뀔 수 있고, 나머지 Skills API는 안정으로 표시됐다. 도입은 위 세 가지 회귀를 정리한 뒤에 한다.

## 트레이드오프

- 스키마 검증기가 의존하는 URI 라이브러리의 패치 버전 변경도 도구 정의 실패로 이어질 수 있다. 도구별 스키마 컴파일을 확인하는 테스트가 있으면 회귀가 배포 전에 드러난다.
- 클라이언트 쪽 제외 규칙은 한 도구의 잘못된 정의가 다른 도구를 막지 않게 하지만, 서버 운영자에게는 오류가 아니라 누락으로 보인다. 서버 경고 로그를 수집하지 않으면 늦게 발견된다.

## 면접 체크포인트

- 새 기능을 쓰지 않아도 SDK 업그레이드에서 확인할 회귀의 종류(스키마 식별자, 헤더 인자 타입, 결과 직렬화)
- `x-mcp-header` 위반이 TypeScript SDK에서는 등록 오류가 아니라 목록 누락과 경고 로그로 나타나는 이유
- 출력 스키마 표현이 바뀔 때 서버와 클라이언트의 배포 순서와 호환성을 어떻게 맞출지

## 출처

- [Releases — GitHub, modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk/releases)
- [modelcontextprotocol/server 2.4.0 릴리스 — GitHub, modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/%40modelcontextprotocol%2Fserver%402.4.0)
- [Don't throw at registration for invalid x-mcp-header (PR #2960) — GitHub, modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk/pull/2960)
- [Model Context Protocol, Streamable HTTP (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)

## 관련 문서

- [[MCP|MCP (Model Context Protocol)]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[LLM-API-Version-Migration|LLM API 버전 마이그레이션]]
