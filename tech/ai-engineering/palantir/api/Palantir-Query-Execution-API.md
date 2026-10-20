---
tags: [palantir, foundry, api, query, function, streaming, schema]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Query 실행 API"]
---

# Query 메타데이터, 버전 선택과 SSE 실행

Query API는 함수의 입력/출력 명세를 읽는 작업과 실행을 나눈다. 확인일의 `/api/v2/functions/queries` 계열 다섯 endpoint는 모두 Preview이며 `preview=true`를 요구한다. 운영 안정성과 호환성은 [[Palantir-API-Client-Contract]]의 stable 계약으로 확대하지 않는다.

## 조회와 실행의 표면

| 작업 | Method와 경로 | OAuth2 operation scope |
|---|---|---|
| API name으로 metadata 조회 | GET `/api/v2/functions/queries/{queryApiName}` | `api:functions-read` |
| RID로 metadata 조회 | GET `/api/v2/functions/queries/getByRid` | `api:functions-read` |
| RID 목록 metadata 조회 | POST `/api/v2/functions/queries/getByRidBatch` | `api:functions-read` |
| 단일 JSON 결과 실행 | POST `/api/v2/functions/queries/{queryApiName}/execute` | `api:functions-execute` |
| SSE 결과 실행 | POST `/api/v2/functions/queries/{queryApiName}/streamingExecute` | `api:functions-execute` |

metadata 읽기 권한과 실행 권한은 다르다. QueryNotFound와 GetByRid/ExecuteQuery/StreamingExecuteQuery의 PermissionDenied를 구분한다. batch 응답은 존재하지 않거나 권한이 없는 Query를 제외하므로 반환 목록 길이를 요청 성공 여부와 일대일 대응시키지 않는다. batch 최대 크기는 100이다.

## 최신 버전은 최신 발행 시각과 다르다

API name으로 조회/실행할 때 기본은 prerelease를 제외한 가장 높은 semantic version이다. `latestVersionResolution=PUBLISH_TIME`이면 가장 최근 발행된 버전을 선택하며 기본적으로 prerelease도 고려한다. 늦게 발행한 낮은 버전과 이전에 발행한 높은 버전이 있으면 두 선택이 달라질 수 있다.

실행 body에는 `version`, `branch`, `latestVersionResolution`과 `includePrerelease`를 지정할 수 있다. branch만 지정하면 해당 branch의 latest를 선택하고 version도 지정하면 그 버전이 branch에 존재해야 한다. branch를 생략하면 default branch를 사용한다. `includePrerelease`는 명시 version과 함께 사용할 수 없다. 기본값은 false이나 PUBLISH_TIME 선택에서는 다르다.

RID 조회와 batch element는 RID, 선택적 version과 includePrerelease를 받는다. API name 조회의 latestVersionResolution 인자가 모든 metadata endpoint에도 있다고 추정하지 않는다. batch는 각 요청 element의 version 선택을 개별로 다룬다.

이 계약은 해당 global Query API의 선택 기능이다. Ontology API나 다른 함수 호출 경로의 최신 tagged version 규칙과 하나로 합치지 않는다.

### Metadata 요청과 실행 요청을 따로 구성한다

Get Query의 query parameter는 `version`, `latestVersionResolution`, `includePrerelease`, `preview`이며 `branch`는 이 endpoint의 인자로 정의돼 있지 않다. 실행 body의 branch 옵션을 metadata 조회에도 그대로 복사하지 않는다. `latestVersionResolution`은 `version`을 생략했을 때 적용된다.

응답의 `version`은 실제 조회된 버전이다. 운영 제안으로, metadata를 이용해 입력 폼이나 검증기를 만들 때는 응답의 `rid`와 `version`을 함께 보관하고 후속 실행의 버전 선택과 대조한다. 두 호출에서 각각 latest를 다시 해석하면 그 사이 발행된 버전 때문에 입력 명세가 달라질 수 있다. 2026-10-20 Get Query 명세로 이 절을 대조했으며 실제 호출은 시험하지 않았다.

### RID는 경로 조각이 아니라 query parameter다

Get By Rid는 `GET /api/v2/functions/queries/getByRid`에 필수 query parameter `rid`를 전달한다. RID를 `{queryApiName}` 자리에 넣는 요청과 구분한다. 선택 인자는 `version`, `includePrerelease`, `preview`이며 `branch`와 `latestVersionResolution`은 이 endpoint의 인자로 정의돼 있지 않다.

`version`을 생략했을 때 `includePrerelease=true`를 주면 최신 버전 선택에 prerelease를 포함한다. 기본값은 false다. `preview`는 schema에서 선택 인자로 표시되지만 endpoint 사용 안내는 `preview=true`를 요구한다. 생성된 타입의 선택 표시만으로 운영 호출에서 생략해도 된다고 판단하지 않는다.

2026-10-20 Get By Rid 명세의 요청 인자와 응답, 오류를 대조했다. 응답은 입력 명세를 포함한 Query metadata이며 함수 실행 결과가 아니다. 명시된 권한 오류는 HTTP 403의 `GetByRidPermissionDenied`다. 실제 인증과 API 호출은 시험하지 않았다.

### Batch 입력은 배열이고 결과의 data는 선택 필드다

Get By Rid Queries Batch의 JSON body는 `{data: [...]}` 같은 wrapper가 아니라 요청 element의 배열이다. 각 element에는 필수 `rid`와 선택적 `version`, `includePrerelease`가 들어간다. `preview=true`는 body가 아니라 query parameter에 둔다.

응답은 객체이며 `data`는 선택적인 Query 배열이다. 없는 Query와 토큰에 권한이 없는 Query가 결과에서 빠지므로, 누락만으로 리소스가 삭제됐다고 판정할 수 없다. 이 명세에는 요청 순서 보장이나 항목별 실패 사유가 정의돼 있지 않다.

클라이언트 설계에서는 요청과 결과를 배열 위치로 맞추지 않고 반환된 `rid`와 `version`을 대조한다. 요청 목록에 같은 RID의 서로 다른 버전을 넣는 경우도 고려해 RID 하나를 키로 삼아 결과를 덮어쓰지 않는다. `data`가 없거나 요청 항목이 빠지면 미확인으로 남기는 처리는 운영 제안이며 API가 원인을 알려 준다는 뜻은 아니다.

2026-10-20 공식 Batch 명세의 요청, 응답과 예제를 대조했다. 검증 범위는 이 절의 계약이며 실제 호출과 권한별 응답은 시험하지 않았다.

## Global 함수와 Ontology-scoped 함수를 구분한다

일반 execute endpoint는 global Query용이다. Ontology-scoped 함수의 단일 결과 실행은 `/api/v2/ontologies/{ontology}/queries/{queryApiName}/execute` 경로를 사용한다.

반면 streamingExecute는 모든 Query 함수를 지원하고 body의 선택적 `ontology`에 RID 또는 API name을 넣으면 Ontology-scoped 실행, 생략하면 global 실행이다. non-streaming 함수도 이 endpoint에서 실행할 수 있다.

두 실행 endpoint의 query parameter `transactionId`는 읽을 transaction을 지정하는 실험적 기능이며 모든 workflow 지원을 보장하지 않는다. transaction ID를 받는다는 이유만으로 읽기/쓰기 원자성이나 임의의 transaction 조합을 보장한다고 해석하지 않는다.

## Metadata의 schema와 값의 encoding

Query 응답은 필수 apiName, RID, version과 output type, 선택적 description/displayName, parameters와 typeReferences를 담는다. parameter는 description, dataType과 required 여부를 가진다. 예제의 데이터값과 schema의 타입 정의는 다른 층이다.

QueryDataType은 scalar 외에 struct, set/array, union, null, void, attachment, mediaReference, 2차원/3차원 집계, valueTypeReference와 typeReference를 표현한다. unsupported 타입도 metadata에서 나타날 수 있어 명세가 반환되었다는 사실만으로 모든 타입의 실행/SDK 지원을 결론내리지 않는다.

- struct는 이름이 있는 field와 fieldType을 가진다.
- array와 set은 subType을 가진다. union은 unionTypes를 담는다.
- valueTypeReference는 Ontology에 등록한 value type의 RID와 versionId를 지정한다.
- typeReference의 typeId는 같은 Query 응답의 typeReferences map을 참조한다. 자기 자신을 참조하는 재귀 타입도 표현할 수 있다.
- 집계 key는 date, boolean, string, double, integer, timestamp와 range를 표현한다. range subtype은 date/double/integer/timestamp다. 집계 value와 중첩 집계의 형식도 해당 metadata에서 확인한다.

실행 parameters는 parameter ID에서 DataValue로 매핑한다. 일반 JSON이라고 해서 모든 수치가 number는 아니다. Decimal과 Long은 문자열이며 timestamp는 UTC offset date-time 문자열, date는 local date 문자열이다. Array/Set은 배열, Struct는 객체, attachment는 RID 문자열로 표현한다. 집계는 groups/key/value 구조의 객체이며 nested 값도 허용한다.

## SSE는 HTTP 성공 이후에도 실패할 수 있다

일반 execute는 단일 JSON 객체의 `value`를 반환한다. streamingExecute는 `text/event-stream`이며 각 event의 data는 JSON으로 encoding한 `StreamingExecuteQueryResponse`다. event는 빈 줄로 구분한다.

- `type: data`는 하나 이상의 결과를 담는 batch다.
- non-streaming 함수는 전체 결과를 담은 data event 하나를 보낸다.
- streaming 함수는 결과가 준비될 때마다 batch event를 보낸다.
- 실행에 실패하면 종료 전에 `type: error` event가 전달될 수 있다.

error event에는 필수 errorCode, errorName, errorInstanceId와 선택적 errorDescription/parameters가 있다. 따라서 처음 HTTP 응답을 받았거나 일부 data batch를 읽은 상태를 전체 실행 성공으로 기록하지 않는다. 정상 종료와 stream 안의 error를 함께 처리한다. 재개 cursor나 수신 batch의 exactly-once 보장은 이 명세에 없으므로 별도 보장으로 전제하지 않는다.

이 문서는 다섯 endpoint의 전체 schema, 반복 타입 정의와 예제의 동일성을 대조한 결과다. 실제 Query 실행, branch/version 선택과 SSE 단절/오류 처리는 시험하지 않았다.

## 출처

- [Palantir, query-basics](https://www.palantir.com/docs/foundry/api/functions-v2-resources/queries/query-basics)

- [Palantir, Get Query](https://www.palantir.com/docs/foundry/api/functions-v2-resources/queries/get-query)
- [Palantir, Get By Rid](https://www.palantir.com/docs/foundry/api/functions-v2-resources/queries/get-by-rid)
- [Palantir, Get By Rid Queries Batch](https://www.palantir.com/docs/foundry/api/functions-v2-resources/queries/get-by-rid-queries-batch)
- [Palantir, Execute Query](https://www.palantir.com/docs/foundry/api/functions-v2-resources/queries/execute-query)
- [Palantir, Streaming Execute Query](https://www.palantir.com/docs/foundry/api/functions-v2-resources/queries/streaming-execute-query)

## 관련 문서

- [[Palantir-API]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-Actions-and-Functions]]
