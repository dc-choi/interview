---
tags: [palantir, foundry, api, observability, trace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 실행 관측 API"]
---

# Resource 실행 요약의 시간 범위와 필터

Observability Resource는 Function이나 Automation처럼 telemetry를 만드는 Foundry 자원이며 RID로 식별한다. 실행 목록은 이 자원에서 끝난 작업의 요약을 조회하는 표면이다. 실행 중인 작업 목록이나 상세 로그 본문과는 범위가 다르다.

## 조회 범위와 페이지

`POST /api/v2/observability/resources/{resourceRid}/listExecutions`는 `api:observability-read` scope와 `preview=true`를 요구한다. HTTP method가 POST여도 이 endpoint의 계약은 목록 조회다.

요청 body의 startTime은 실행이 시작한 시각의 포함 하한, endTime은 배타적 상한이다. 기본은 24시간 전부터 현재까지며 둘 다 생략하면 최근 24시간의 실행을 반환한다. 완료한 실행만 최신순으로 정렬된다.

pageSize의 최대는 100이고 pageToken/nextPageToken으로 순회한다. 반환 목록에 작업이 없다는 사실만으로 그 자원에서 현재 실행 중인 작업도 없다고 판단하지 않는다. 오래된 작업을 찾을 때는 기본 시간 창에 의존하지 않고 범위를 지정한다.

## Filter는 operator와 field의 허용 조합이다

where는 eq, in, gte, lte, isNull을 discriminator로 사용하고 field와 value를 결합한다. and/or/not으로 조합할 수 있다. 임의의 field에 모든 operator를 적용할 수 있는 generic query language는 아니다.

| field | 허용 operator |
|---|---|
| status | eq, in |
| duration | gte, lte |
| userId, callerRid | eq, in, isNull |
| resourceVersion, failureReason, foundryTraceId, traceOwningRid | eq, in |

status 값은 SUCCEEDED와 FAILED다. duration 경계는 포함 비교이며 음수는 거부된다. 범용 Duration enum에 DAYS/WEEKS/MONTHS/YEARS가 노출되어도 이 필터의 설명은 MILLISECONDS/SECONDS/MINUTES/HOURS만 허용한다고 명시한다. schema의 공통 enum과 해당 field의 제약을 함께 따른다.

isNull은 optional field의 부재를 찾는다. callerRid가 없는 호출이나 system-triggered 실행의 userId 부재를 확인하는 데 사용할 수 있다. 잘못된 operator/field 조합이나 malformed filter는 InvalidExecutionFilter가 될 수 있다.

## Summary에서 상세 로그로 연결한다

실행 요약은 resourceRid, 당시 resourceVersion, status, startTime, duration과 Foundry trace 정보를 담는다. callerRid와 failureReason은 optional이다. failureReason은 timeout, invalid_parameter 같은 분류 문자열이며 자유 텍스트 오류 메시지가 아니다.

상세 로그를 찾으려면 **foundryTraceId와 traceOwningRid를 함께** 사용한다. trace ID 하나가 유일하더라도 그것만으로 로그 조회에 충분하지 않다고 명시된다. 실행한 resourceRid와 trace를 소유한 자원의 RID도 구분한다.

필터에 userId가 있다고 해서 반환 Execution schema에 동일 field가 포함된다고 전제하지 않는다. client는 실제 응답의 지원 field를 기준으로 관측 데이터를 구성한다.

## 오류와 검증 범위

ResourceNotFound와 두 종류의 ListExecutions PermissionDenied는 대상 RID 문맥을 확인한다. InvalidExecutionFilter는 입력 계약을 고쳐야 하는 문제이며 재시도만으로 해결하는 서버 장애가 아니다. 공통 오류와 rate limit은 [[Palantir-API-Client-Contract]]를 따른다.

공식 전체 schema를 대조했으며 실제 실행 검색, 시간대 경계, 필터와 trace 로그 조회는 시험하지 않았다.

## 출처

- [Palantir, Resource basics](https://www.palantir.com/docs/foundry/api/observability-v2-resources/resources/resource-basics)
- [Palantir, List Executions Resource](https://www.palantir.com/docs/foundry/api/observability-v2-resources/resources/list-executions-resource)

## 관련 문서

- [[Palantir-API-Operations]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-LLM-Proxy-API]]
