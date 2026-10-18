---
tags: [palantir, foundry, api, oauth, pagination, reliability]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 API 클라이언트 계약"]
---

# Foundry API 클라이언트의 공통 계약

Foundry Platform API는 enrollment hostname의 HTTPS endpoint를 호출하는 REST 인터페이스다. 대체로 JSON request/response를 사용하며 Ontology 외의 관리, 데이터와 운영 자원도 다룬다. 대량 외부 반출이 목적이면 단건 API 반복 외에 Data Connection export가 더 적합한지 검토한다.

공식 공통 계약을 확인한 기록이며 실제 enrollment의 인증, 부하와 endpoint 호출을 시험한 결과는 아니다. endpoint별 제한은 공통 계약에 추가로 적용한다.

## 인증, scope와 자원 권한

API 요청은 `Authorization: Bearer <token>`을 전달한다. 개발용 사용자 token은 발급한 사용자의 권한을 가지며 폐기/만료를 관리한다. 운영 애플리케이션에 사용하거나 공유 저장소에 넣지 않는다.

운영 OAuth2의 authorization code grant는 사용자를 대신하고 client credentials grant는 service user로 동작한다. client credentials의 secret은 서버에서 보호한다. 시작 예제의 Node.js 코드는 서버에서 실행하는 예시이며 service user token을 browser로 보내는 패턴이 아니다.

실효 권한은 요청한 scope와 사용자/service user의 기존 Foundry 권한의 교집합이다. Developer Console에서 앱이 요청할 수 있는 scope도 제한할 수 있다. read scope가 write 권한을 포함한다고 가정하지 않으며 endpoint의 필요한 operation scope를 확인한다.

scope는 문서의 endpoint 이름 목록 자체가 아니라 permission 집합으로 평가된다. 확인일의 문서는 같은 permission으로 문서에 나열되지 않은 underlying service endpoint를 호출할 수도 있고 이 동작이 바뀔 수 있다고 명시한다. 따라서 scope만을 문서 URL allowlist와 같은 보안 경계로 이해하지 않는다. 앱의 자원/작업 제한과 함께 검토한다.

## Platform SDK와 OSDK 선택

Platform SDK는 enrollment에 종속된 업무 타입 없이 API를 다루는 generic library다. 관리/거버넌스 자동화나 서로 무관한 enrollment 사이에 옮겨 사용할 앱에 맞는다. 확인일 문서는 Python, TypeScript와 Java를 안내한다.

OSDK는 해당 enrollment의 Ontology에서 생성한 업무 객체/Action 코드를 제공한다. 필요한 작업이 자신의 Ontology 읽기/쓰기라면 생성 타입과 편의 API를 활용한다. SDK 선택이 사용자의 자원 권한이나 서버 실행 인가를 대신하지 않는다.

### API 참조에서 라이브러리의 용도를 먼저 구분한다

공식 API reference는 REST API와 SDK뿐 아니라 Transforms, Functions와 Widgets의 라이브러리도 함께 안내한다. 같은 참조 목록에 있다는 이유로 모두 REST 클라이언트용 패키지라고 취급하지 않는다.

| 필요한 작업 | 확인할 참조 |
|---|---|
| Foundry/AIP REST 호출 | REST API, Python/TypeScript Platform SDK |
| Ontology 기반 앱 개발 | Ontology에서 자동 생성한 SDK |
| S3 도구로 dataset 파일 접근 | S3-compatible API, 지원 operation과 별도 인증 설정 |
| 데이터 변환 코드 작성 | Transforms의 Python, Java, R 라이브러리 |
| 재사용 함수 작성 | Functions의 TypeScript v1/v2, Python 참조 |
| Widget set에서 OSDK 사용 | `@custom-widget/sdk` |

S3 호환 API는 AWS CLI와 AWS SDK 같은 클라이언트를 사용할 수 있지만 S3 API의 일부만 구현한다. Dataset 생성/삭제와 명시적인 branch/transaction 관리는 별도 Foundry API를 확인한다. 설정과 자동 transaction의 상세는 [[Palantir-Dataset-S3-Compatible-Access|S3 호환 접근 계약]]을 따른다.

2026-10-18 검증은 이 절의 참조 분류와 S3 호환 범위에 한정한다. 아래 REST 호출률, 오류와 버전 정책의 기존 확인일은 frontmatter의 날짜로 유지한다.

## 페이지 수가 데이터 전체를 뜻하지 않는다

다음 페이지는 응답의 `nextPageToken`으로 판단하고 같은 조회 조건에 `pageToken`을 넣어 이어간다. token은 단기간에 순서대로 소비하도록 설계되었으므로 장기 checkpoint로 저장해 나중에 재개할 수 있다고 전제하지 않는다. `nextPageToken`이 없거나 null이면 종료한다.

`pageSize`는 요청값이며 정확한 반환 건수의 보장이 아니다. 실제 결과가 더 적거나 많을 수 있다. 응답 수가 요청값보다 작다는 이유만으로 순회를 끝내지 않는다. 기본 page size가 대개 최대값이며 그보다 큰 요청은 최대값으로 줄인다. 세부 endpoint가 다르게 명시하면 그 값을 따른다.

한 페이지 크기와 페이지 전체에 걸친 조회 상한은 다르다. 공통 문서는 list objects가 한 쿼리에서 전체 10,000개까지 반환하고 초과 순회는 오류가 될 수 있음을 예로 든다. 여러 페이지를 요청한다는 사실만으로 대량 추출 범위를 보장하지 않는다.

### 최신성과 일관성 중 무엇이 필요한가

기본 paging은 각 요청 시 최신 결과를 반환한다. 페이지 사이의 데이터 변경으로 중복이나 누락이 생길 수 있다. 이 결과를 snapshot과 같은 일관성으로 다루지 않는다.

snapshot paging은 순회 시작 시점의 데이터로 고정하므로 순회 중 중복/누락을 방지하지만 결과가 오래될 수 있다. 확인일 공통 문서가 `snapshot` 인자를 제공한다고 명시한 범위는 다음 세 endpoint다.

- Load Object Set
- Load Object Set Multiple Object Types
- Load Object Set Objects Or Interfaces

이를 다른 list/search endpoint의 암묵적 기능으로 확장하지 않는다. 필요한 전체성, 신선도와 query 상한을 함께 확인한다.

## 호출률과 동시 실행 수를 따로 제한한다

확인일의 공통 제한은 사용자별 전체 endpoint를 합쳐 분당 10,000 request, 서버에서 동시에 처리 중인 request 800개다. 개별 endpoint와 내부 Ontology, Function, Agent 서비스는 더 엄격한 한도를 적용할 수 있다.

동시성은 네트워크 왕복 전체의 in-flight 개수와 같지 않고 서버의 active processing 기준이다. 클라이언트에 열려 있는 요청 수로 정확한 서버 여유를 계산할 수 없다. 실제 응답의 429/503과 endpoint별 제한을 관측한다.

제한 초과 시 429 또는 503이 올 수 있으며 exponential backoff로 재시도한다. 읽기와 변경 요청의 재실행 안전성은 별도로 확인해야 한다. 이 마지막 조건은 재시도 설계의 점검이며 API 전체가 idempotency를 보장한다는 뜻이 아니다. burst와 대규모 SDK 사용은 실제 부하 시험이 필요하다.

## 오류는 상태 코드, errorName과 문맥을 함께 읽는다

일반 오류 body는 `errorCode`, `errorName`, `errorInstanceId`, `parameters`를 제공한다. 지원 요청에는 instance ID가 유용하다. endpoint, 자원/transaction/branch ID와 함께 추적하되 민감한 파라미터 값과 stacktrace를 무분별하게 외부 로그로 내보내지 않는다.

| 상황 | 처리 방향 |
|---|---|
| 401, MissingCredentials/Unauthorized | 누락/유효하지 않은 인증 header 확인 |
| 403, ApiUsageDenied/PermissionDenied | scope와 관련 자원/원천 데이터 권한 확인 |
| 404, Object/Type/Action/Dataset 등 NotFound | 부재뿐 아니라 token의 접근 불가 가능성도 확인 |
| InvalidArgument/InvalidParameterCombination | 타입, 값, 인자 조합과 지원 기능 수정 |
| InvalidPageSize/InvalidPageToken | 양수 page size와 token의 조회 문맥 확인 |
| 414/431 | URL 또는 header 길이와 endpoint의 대체 요청 방식 확인 |
| 429/503 | 요청률/동시성 조절과 backoff |
| 500/Internal | 일시 실패 재시도, 지속되면 instance ID와 지원 요청 |

일부 오류는 body 없이 HTTP status만 올 수 있고 문서에 없는 오류도 발생할 수 있다. JSON 파싱 실패로 원래 status와 응답을 잃지 않도록 한다. `errorCode` 이름에서 HTTP status를 역산하지 않는다. 예를 들어 공통 표에는 LinkAlreadyExists가 CONFLICT/400, QueryMemoryExceededLimit가 TIMEOUT/400, FileAlreadyExists가 NOT_FOUND/404로 기재된다. 실제 status와 endpoint별 계약을 그대로 다룬다.

### Ontology 오류의 구분

ActionValidationFailed는 validateAction으로 세부 원인을 확인한다. parameter ID, parameter type/value, 누락한 property, 지원하지 않는 composite primary key는 입력/모델 계약 문제다. submission 조건 실패를 단순 서버 장애와 같은 자동 재시도로 묶지 않는다.

검색/정렬 오류는 해당 속성의 Searchable/Sortable 설정과 API name을 확인한다. 집계 group 수 초과는 `maxGroupCount`, 더 넓은 interval이나 필터로 줄인다. ObjectsExceededLimit와 OntologyEditsExceededLimit는 조회량/편집량 한도를 넘은 상태다. attachment 업로드는 Content-Length, 추론 가능한 Content-Type과 확인일 표의 200 MB 상한을 확인한다.

OntologySyncing은 변경 반영 중이므로 잠시 기다린 후 재시도할 수 있지만 ObjectTypeNotSynced는 Ontology Manager 재색인 점검이 필요하다. Function/Query의 사용자 오류, 잘못된 입력, runtime 오류, 시간과 메모리 제한도 각각 분리한다. 사용자 노출 메시지와 stacktrace의 용도는 다르다.

### Dataset과 filesystem 오류의 구분

dataset branch 하나에는 open transaction 하나만 있을 수 있다. 이미 열린 transaction이 있거나 commit/abort할 transaction이 open이 아니면 같은 요청을 반복하기 전에 상태를 다시 확인한다. 테이블 읽기는 committed 상태와 schema를 요구할 수 있다. transaction 종류는 SNAPSHOT, UPDATE, APPEND와 DELETE다.

branch ID는 빈 문자열, RID나 UUID 형태를 사용할 수 없다. upload/branch 생성/삭제/transaction 생성/commit/abort 권한은 각각 따로 거부될 수 있다. 파일 경로의 존재 충돌과 같은 이름의 filesystem 자원 충돌은 새로운 시도마다 임의 이름을 만드는 방식으로 덮지 말고 의도한 자원과 쓰기 계약을 확인한다.

## 버전과 Preview 수명주기

API는 URL의 major version을 사용한다. endpoint/field 제거, 필수 request parameter 추가와 기존 field 타입 변경은 major 변경 대상이다. optional request parameter, response field, endpoint와 enum value 추가는 같은 major 안에서 생길 수 있다.

클라이언트는 알 수 없는 response field를 무시하고 신규 enum value를 처리할 경로를 둔다. 문서화되지 않은 내부 동작에 의존하지 않는다. API의 버전 번호와 SDK package 버전을 같은 값으로 취급하지 않는다.

확인일의 stable endpoint 교체/제거 정책은 최소 12개월 전 안내와 그 기간의 지원/SLA 유지를 명시한다. 다만 심각한 보안 취약점이나 안정성 문제는 더 짧은 예고의 emergency change 예외가 있다. 공지, Upgrade Assistant와 endpoint banner를 함께 확인한다.

Public Preview는 비운영 실험/개발 단계이며 `preview=true`로 opt-in한다. 사전 안내 없이 변경/삭제될 수 있다. stable의 호환성/폐기 예고 정책을 Preview에 그대로 적용하지 않는다.

## 출처

- [Palantir, Developer libraries & API reference](https://www.palantir.com/docs/foundry/api-reference)
- [Palantir, S3-compatible API for Foundry datasets](https://www.palantir.com/docs/foundry/data-integration/foundry-s3-api)
- [Palantir, API introduction](https://www.palantir.com/docs/foundry/api/general/overview/introduction)
- [Palantir, API authentication](https://www.palantir.com/docs/foundry/api/general/overview/authentication)
- [Palantir, API getting started](https://www.palantir.com/docs/foundry/api/general/overview/getting-started)
- [Palantir, API SDKs](https://www.palantir.com/docs/foundry/api/general/overview/sdks)
- [Palantir, API paging](https://www.palantir.com/docs/foundry/api/general/overview/paging)
- [Palantir, API limits](https://www.palantir.com/docs/foundry/api/general/overview/limits)
- [Palantir, API errors](https://www.palantir.com/docs/foundry/api/general/overview/errors)
- [Palantir, API versioning](https://www.palantir.com/docs/foundry/api/general/overview/versioning)

## 관련 문서

- [[Palantir-API]]
- [[Palantir-SDK-and-Agent-Tools]]
- [[Palantir-Actions-and-Functions]]
