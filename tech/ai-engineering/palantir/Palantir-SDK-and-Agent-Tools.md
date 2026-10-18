---
tags: [palantir, ontology, osdk, mcp, agent, api, oauth]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir SDK and Agent Tools", "팔란티어 SDK와 에이전트 도구"]
---

# Palantir OSDK와 에이전트 도구 연결

업무 데이터 모델을 만들었다면 다음 경계는 애플리케이션과 에이전트가 어떤 인터페이스로 무엇을 실행할 수 있는가다. OSDK는 Ontology에서 생성한 타입으로 개발 코드를 연결하고, Ontology MCP는 선택한 자원을 에이전트 도구로 노출한다. Chatbot Studio의 tools는 챗봇이 조회와 실행을 선택하는 제품 내 인터페이스다. 세 경로를 함께 사용해도 호출 주체, 자원 범위와 실행 결과를 각각 확인해야 한다. [OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/overview), [Ontology MCP](https://www.palantir.com/docs/foundry/ontology-mcp), [Chatbot Studio tools](https://www.palantir.com/docs/foundry/chatbot-studio/tools)

일반 온톨로지와 지식 그래프의 정의는 [[Ontology-Knowledge-Graph]]에 둔다. 이 문서의 SDK 생성, OAuth와 MCP 자원 노출은 Palantir 제품 계약이다. 공식 문서를 대조했으며 계정 생성, SDK 설치, 인증과 실데이터 호출은 수행하지 않았다.

## 인터페이스별 책임

| 표면 | 주 소비자 | 제공하는 것 | 혼동하기 쉬운 경계 |
|---|---|---|---|
| Ontology SDK, OSDK | 애플리케이션 개발 코드 | 선택한 Ontology 타입과 작업의 생성 바인딩 | 타입 생성이 접근 권한을 부여하지 않음 |
| Platform API와 SDK | 플랫폼 연동 코드 | 플랫폼 자원을 다루는 API | 업무 Ontology용 생성 SDK와 제품 역할 구분 |
| Chatbot Studio tools | Foundry 챗봇 | 객체 조회, Action, Function과 앱 동작 | 모델 선택과 서버 실행 인가를 구분 |
| Ontology MCP, OMCP | Ontology를 소비하는 외부 에이전트 | 데이터 조회와 미리 정의한 Action 실행 | 노출 자원과 호출 주체의 권한에 제한 |
| Palantir MCP, PMCP | Ontology와 앱을 만드는 개발자 에이전트 | 타입 등 구조와 개발 자원 조작 | OMCP의 실데이터 편집 경로와 구분 |

개발자 포털은 OSDK, Python/TypeScript platform SDK, Platform APIs, 데이터 처리와 개발 환경을 따로 안내한다. 하나의 SDK가 모든 개발과 운영 표면을 대체한다고 전제하지 않는다. [Developer resources](https://www.palantir.com/docs/foundry/developers)

## OSDK: 스키마를 개발 계약으로 생성한다

OSDK는 TypeScript의 npm, Python의 pip/Conda, Java의 Maven을 지원하고 다른 언어를 위한 OpenAPI 사양을 제공한다. 생성 대상은 애플리케이션에 필요한 Ontology 부분집합이며 이름과 설명 같은 메타데이터도 개발 환경에서 활용한다. Developer Console에서 앱과 자원을 관리한다. [OSDK overview](https://www.palantir.com/docs/foundry/ontology-sdk/overview)

개발 순서는 다음과 같이 이해할 수 있다.

1. 애플리케이션이 사용할 객체, 링크, Action과 함수를 정한다.
2. Developer Console의 자원과 작업 제한을 구성한다.
3. 언어별 SDK를 생성해 조회와 실행 코드를 작성한다.
4. 실제 사용자 또는 service user로 인증하고 권한을 시험한다.
5. 스키마, 생성 결과와 호출부 변경을 함께 검토한다.

이 순서는 제품 기능을 적용하기 위한 설계 정리다. 생성된 타입과 코드 검사가 서버 상태, 권한이나 업무 결과의 정확성까지 대신 증명하지는 않는다. Ontology와 앱을 함께 코드로 관리하는 SuperRepo 경로도 있지만 모든 OSDK 앱의 필수 구성은 아니다. [OSDK overview](https://www.palantir.com/docs/foundry/ontology-sdk/overview)

### 생성 가능성과 데이터 완전성은 다르다

미지원 타입의 객체 속성은 생성 과정에서 생략되고 오류가 기록될 수 있다. 미지원 Action 파라미터나 함수 입력, 출력 타입은 패키지 생성을 실패시킬 수 있다. 따라서 생성 성공 여부와 필요한 속성의 실제 포함 여부를 별도로 점검한다. OAuth 2.0 인증 webhook을 포함한 Action도 SDK 사용 제한이 있다. 언어별 전체 제한 목록은 [Unsupported types](https://www.palantir.com/docs/foundry/ontology-sdk/unsupported-types)에서 확인한다.

설계 적용 시에는 생성 로그, 앱이 읽는 필수 필드와 Action 입력의 대응을 확인한다. 문법상 타입이 맞더라도 SDK에서 빠진 데이터가 있거나 런타임 접근이 거부될 수 있다.

### Major 이전은 generator와 호출부를 함께 옮긴다

2024년 TypeScript OSDK는 1.1에서 기존 문법의 deprecated 항목을 먼저 표시하고 1.2에서 새 문법, 2.0에서 신규 primitive와 구형 항목 제거를 계획했다. 역사적 bridge 사례의 주요 변경은 다음과 같다. 현재 프로젝트의 실제 generated API를 먼저 확인한다. ([April 2024](https://www.palantir.com/docs/foundry/announcements/2024-04))

| 구형 항목 | Bridge의 대체 계약 |
|---|---|
| `page()` | `fetchPageWithErrors()`는 Result wrapper, `fetchPage()`는 예외를 던지는 경로 |
| `__apiName`, `__primaryKey`, `__rid` | `$apiName`, `$primaryKey`, `$rid` |
| `all()` | `asyncIter()`로 전체 결과를 순회 |
| `bulkActions` | `batchActions` |
| `searchAround{linkApiName}` | `pivotTo(linkApiName)` |

Generator 선택, SDK package 생성과 app dependency upgrade는 다른 단계다. 같은 이름 변경이라도 Result/throw와 iterator 반환의 오류 처리, pagination과 memory 사용을 함께 검토한다. Slate OSDK도 Ontology 변경 후 package 갱신이 필요하며 앱 화면에 자원을 추가한 것만으로 기존 binding이 새로 생성되지는 않는다. ([June 2024](https://www.palantir.com/docs/foundry/announcements/2024-06))

2024년 10월 TypeScript OSDK 2.0 GA는 신규 앱의 generator 기본값을 바꿨고 기존 앱의 즉시 이전은 강제하지 않았다. 당시 최소 1년 legacy 지원 안내는 현재 지원 기간의 무기한 연장이 아니다. Java GA도 Maven group ID와 generated package를 요구하고 interface casting 등은 별도 roadmap이었다. ([October 2024](https://www.palantir.com/docs/foundry/announcements/2024-10))

2024년 12월 chatbot의 외부 앱 호출은 agent project와 필요한 Ontology resource를 앱 제한에 넣고 Agents API operation을 허용하는 구성이었다. Generated OSDK resource와 Platform SDK/API operation의 권한 범위를 함께 확인한다. Session 생성/갱신 권한을 부여한 것만으로 agent가 쓰는 모든 데이터 권한이 생기지는 않는다. ([December 2024](https://www.palantir.com/docs/foundry/announcements/2024-12))

## 인증 주체와 허용 범위를 함께 본다

Foundry API의 운영 앱 인증에는 OAuth2를 사용한다. 사용자 대신 동작하는 authorization code grant와 service user로 동작하는 client credentials grant를 구별한다. 후자는 client secret을 안전하게 보관할 수 있어야 한다. 개인이 만든 임시 API token은 그 사용자의 권한을 가지므로 운영 앱이나 저장소에 넣는 자격 증명으로 사용하지 않는다. [API authentication](https://www.palantir.com/docs/foundry/api/v2/general/overview/authentication)

실효 접근 범위는 다음 요소를 함께 통과해야 한다.

- 호출 사용자 또는 service user의 실제 자원 권한
- 애플리케이션의 resource restrictions
- 애플리케이션의 operation restrictions와 인증 시 요청한 scope
- 수행할 Action의 submission criteria 등 실행별 조건

앱 제한은 사용자의 권한을 확대하는 기능이 아니다. Restricted app에 Ontology 자원을 추가하면 접근 가능 자원과 이후 생성할 SDK에 함께 반영된다. Unrestricted 전환은 기존 제한 구성을 제거하며, 다시 restricted로 전환하면 필요한 자원과 작업을 구성해야 앱이 계속 동작할 수 있다. [Application restrictions](https://www.palantir.com/docs/foundry/developer-console/application-restrictions), [Action 조건](https://www.palantir.com/docs/foundry/action-types/submission-criteria)

2025년 6월의 Platform SDK Resources 개편은 project 범위와 client-allowed endpoint operation을 별도로 관리했다. 새 scoped app은 예전 namespace가 주던 다른 namespace의 dependent endpoint까지 자동 허용하지 않는다. Legacy app은 migration이 필요했다. Operation 변경은 기존 SDK version에도 적용되고 재생성이 필요 없으므로 package hash가 같아도 유효 인가가 바뀔 수 있다. ([June 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-06))

행과 열 보안은 OSDK 조회 시 읽을 수 있는 데이터를 필터링하지만, 응답 payload와 그 이후 애플리케이션의 데이터 사용까지 통제하는 계약은 아니다. 반환 데이터를 외부 모델, 로그나 다른 저장소로 넘기는 경계는 별도로 보호한다. [OSDK overview](https://www.palantir.com/docs/foundry/ontology-sdk/overview)

## Chatbot Studio: 도구 선택과 변경 승인을 분리한다

2026년 2월 unscoped Developer Console app은 standalone OAuth client의 대체 경로로 OSDK/docs/hosting/Marketplace/metrics를 유지하면서 app scope를 전환하도록 했다. Default는 scoped다. 당시 Control Panel의 third-party **project access/marking restriction**은 Developer Console app과 호환되지 않아 unrestricted로 두고 Developer Console에서 client restriction을 관리하도록 안내했다. 이는 사용자의 원천 data permission 제거와 다른 설정이며 marking restriction의 Console 지원은 당시 roadmap이었다.

같은 달 새 Developer Console app의 Compass 관리 rollout은 생성 위치의 role/org/marking을 상속하고 move/share/trash를 표준화했다. 기존 앱의 migration은 별도다. Application 자체의 관리 권한과 OAuth client가 호출하는 자원의 scope/data permission을 구분한다.

확인일의 [Tools](https://www.palantir.com/docs/foundry/chatbot-studio/tools)는 다음 기능을 제공한다.

| 도구 | 용도 |
|---|---|
| Action | Ontology 편집, 자동 실행 또는 사용자 확인 후 실행 구성 |
| Object query | 지정한 객체와 속성의 필터, 집계, 조회와 링크 탐색 |
| Function | Foundry 함수와 공개한 AIP Logic 호출, 최신 또는 특정 published version 선택 |
| Update application variable | 구성한 앱 상태 변경 |
| Command | 다른 Palantir 앱 동작 연결 |
| Request clarification | 실행을 멈추고 사용자에게 부족한 정보 확인 |

Prompted tool calling은 한 번에 하나의 도구를 호출한다. Native tool calling은 병렬 호출을 지원하지만 지원 모델과 도구가 제한되므로 필요한 조합을 확인한다. Legacy Ontology semantic search tool은 인용과 입출력 변수 등이 제한된 구형 경로다.

설계 점검에서는 조회한 결과, 모델이 제안한 인자, 사용자의 승인과 실제 변경 결과를 나눈다. 도구를 병렬 호출할 수 있다는 사실이 서로 의존하는 변경을 병렬로 실행해도 된다는 뜻은 아니다. 실행 권한과 트랜잭션은 [[Palantir-Actions-and-Functions]]의 계약을 따른다.

## OMCP: 애플리케이션의 업무 자원을 외부 에이전트에 노출한다

OMCP를 켜면 Developer Console 애플리케이션이 MCP server가 되고 외부 에이전트가 client로 연결한다. 데이터 조회와 미리 정한 Action 실행이 목적이다. 반면 PMCP는 타입과 개발 자원 변경을 위한 경로이며 OMCP 개요에서는 실제 Ontology 데이터 쓰기를 제공하지 않는 것으로 구분한다. 외부 LLM을 연결하면 Foundry 데이터가 외부 client에 전달된다는 점도 함께 고려한다. [Ontology MCP overview](https://www.palantir.com/docs/foundry/ontology-mcp)

[Sample architecture](https://www.palantir.com/docs/foundry/ontology-mcp/sample-architecture)의 자원 매핑은 다음과 같다.

- 앱에 포함한 object type은 SQL tool을 통한 데이터 조회 대상으로 노출한다.
- Action type은 개별 도구가 되어 미리 정의한 변경을 실행한다.
- Query function은 별도 도구로 노출할 수 있다.
- AIP Logic이나 챗봇을 함수로 저장해 다른 에이전트가 호출하는 도구로 연결할 수 있다.

이는 표준 MCP 자체가 업무 인가나 Ontology 의미를 자동 생성한다는 뜻이 아니다. 어느 자원을 노출할지와 어떤 변경을 허용할지는 앱과 Action 정의가 결정한다.

### OAuth 구성은 기존 앱과 공유한다

OMCP는 Developer Console 앱의 OAuth client와 authorization server, 자원 제한과 권한을 사용한다. 사용자 로그인은 authorization code, 비대화형 service-to-service 호출은 client credentials라는 주체 구분을 유지한다. MCP 연결만 별도의 권한 우회 경로로 취급하지 않는다. [OMCP authentication and authorization](https://www.palantir.com/docs/foundry/ontology-mcp/authentication-and-authorization)

특정 client의 grant 지원은 별도 확인이 필요하다. 확인일에 인증 문서는 Microsoft Copilot Studio를 client credentials 예시로 들지만, [MCP tools and agent configuration](https://www.palantir.com/docs/foundry/ontology-mcp/mcp-tools-and-agent-configuration)은 Copilot Studio가 Confidential Client의 authorization code만 지원한다고 적는다. 이 상충은 해소하지 못했으므로 해당 제품의 연결 설정을 확정하지 않는다.

### 도구 설명은 행동 안내이며 무결성 제약은 아니다

Action의 Agent tool description에는 호출 목적, 필요한 식별자를 구하는 방법 등을 적을 수 있다. 공식 설정 예시는 task를 먼저 검색하고 없으면 만드는 skill을 보여 준다. [MCP tools and agent configuration](https://www.palantir.com/docs/foundry/ontology-mcp/mcp-tools-and-agent-configuration)

설계상 검색 후 생성 절차만으로 동시 요청의 중복 생성까지 막을 수는 없다. 두 요청이 같은 부재를 읽고 각각 생성할 수 있기 때문이다. 중복 방지가 중요한 업무는 서버의 식별자, 변경 조건과 동시성 계약으로 보강한다. 이는 예시 절차에 대한 분석이며 OMCP의 중복 생성 결함을 재현했다는 보고가 아니다.

## 검증 범위를 나눈다

2026년 5월 standalone OAuth migration은 location/최대 classification/user permission을 정해 full Console app으로 옮기되 기존 client workflow를 유지하도록 안내했다. MCP Hub의 서버 발견은 configured tool/resource를 검토하는 관리 경로이고 tool별 편집/pro-code standalone 지원은 당시 계획이었다. 서버가 검색된다는 사실과 외부 client에 데이터를 제공할 인가는 별도다.

Copilot Studio OMCP integration의 2026년 3월 안내는 Backend service, User's permissions와 confidential client의 authorization-code grant를 요구했다. Client credential의 독립 service 권한 흐름으로 바꾸지 않는다. Adaptive Card의 `response_semantics`는 tool output을 표시하는 mapping이며 버튼/URL dialog의 실제 데이터 접근과 Action 인가는 별도다.

Palantir MCP의 `view-osdk-definition`은 생성 SDK의 resource/입출력 구조를 읽고 `generate-sdk-version`은 SDK 정의를 바꿔 새 버전을 만든다. 2025년 10월 추가된 repository connection과 Platform SDK endpoint/context discovery도 각각 읽기와 변경을 구분한다. 새 SDK 생성, repository package 설치, code 반영과 check 통과는 서로 다른 완료 조건이며 generated context가 실제 data permission을 부여하지 않는다.

TypeScript OSDK의 `@osdk/unit-testing/experimental`은 Foundry 요청 없이 client와 객체, object set 등을 mock하는 도구다. 확인일 기준 experimental API다. 이를 사용한 테스트는 코드의 입력과 결과를 확인하지만 실제 인증, 서버 권한과 업무 데이터 반영을 시험한 것으로 볼 수 없다. [Unit testing TypeScript OSDK code](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-testing)

적용 시 검증 대상을 다음처럼 분리한다.

1. **계약:** 필요한 객체 속성과 Action, 함수가 생성 결과에 포함되는가?
2. **인가:** 허용한 사용자와 거부해야 할 사용자로 같은 호출을 시험했는가?
3. **실행:** Action 결과를 원본 객체와 외부 시스템에서 각각 확인했는가?
4. **에이전트:** 잘못된 도구 선택, 인자 누락, 사용자 거부와 재시도를 처리하는가?
5. **운영:** SDK, 함수 버전과 실제 호출 구성이 대응하는가?

제품 문서의 개발 가속이나 보안 관련 소개는 이 검증을 대신하는 성능, 보안 보증으로 사용하지 않는다. 이 문서의 확인은 공개 문서 수준이며 연결 가용성, 지연, 비용과 조직별 정책 적용은 미시험이다.

## 출처

- [Palantir, Developer resources](https://www.palantir.com/docs/foundry/developers)
- [Palantir, Ontology SDK overview](https://www.palantir.com/docs/foundry/ontology-sdk/overview)
- [Palantir, Unsupported types for OSDK](https://www.palantir.com/docs/foundry/ontology-sdk/unsupported-types)
- [Palantir, Application restrictions](https://www.palantir.com/docs/foundry/developer-console/application-restrictions)
- [Palantir, API authentication](https://www.palantir.com/docs/foundry/api/v2/general/overview/authentication)
- [Palantir, AIP Chatbot Studio tools](https://www.palantir.com/docs/foundry/chatbot-studio/tools)
- [Palantir, Ontology MCP overview](https://www.palantir.com/docs/foundry/ontology-mcp) — 입력 주소의 `/overview`는 열기 실패, canonical 경로의 본문으로 확인했다.
- [Palantir, Ontology MCP sample architecture](https://www.palantir.com/docs/foundry/ontology-mcp/sample-architecture)
- [Palantir, Ontology MCP authentication and authorization](https://www.palantir.com/docs/foundry/ontology-mcp/authentication-and-authorization)
- [Palantir, MCP tools and agent configuration](https://www.palantir.com/docs/foundry/ontology-mcp/mcp-tools-and-agent-configuration)
- [Palantir, Unit testing TypeScript OSDK code](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-testing)
- [Palantir, Submission criteria](https://www.palantir.com/docs/foundry/action-types/submission-criteria)
- [Palantir, April 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-04)
- [Palantir, June 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-06)
- [Palantir, October 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-10)
- [Palantir, December 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-12)
- [Palantir, June 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-06)
- [Palantir, October 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-10)
- [Palantir, February 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-02)
- [Palantir, March 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-03)
- [Palantir, May 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-05)

## 관련 문서

- [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]]
- [[Palantir-Actions-and-Functions|Action과 Function 실행 계약]]
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]]
- [[MCP|Model Context Protocol]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[Palantir-Foundry-Agents|Pro-code agent와 AI FDE의 실행 계약]]
