---
tags: [palantir, foundry, api, sql, asynchronous]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 SQL 쿼리 API"]
---

# 데이터셋 SQL 실행과 결과 수신

SQL Query API의 데이터셋 질의는 실행, 상태 조회, 결과 수신과 취소를 분리한다. 같은 API 그룹의 Ontology SQL은 동기 Arrow 응답이므로 이 수명주기를 그대로 적용하지 않는다. Ontology 경로와 object set 입력은 [[Palantir-Ontology-SQL-API]]에서 다룬다.

## SELECT 실행과 브랜치

`POST /api/v2/sqlQueries/execute`의 body에는 `query`가 필수다. Spark SQL dialect의 SELECT만 지원한다. 데이터셋은 경로나 RID로 참조한다. 이 API를 DDL/DML 실행용 일반 데이터베이스 연결로 취급하지 않는다.

`fallbackBranchIds`는 브랜치 이름 목록이다. SQL에 브랜치를 명시하지 않은 리소스는 제공된 fallback 중 존재하는 첫 브랜치를 사용하며, 목록이 없으면 기본 브랜치를 쓴다. 명세는 대부분의 enrollment에서 `master`라고 설명하므로 `main`으로 고정하면 안 된다. 필드명에 Ids가 있어도 branch RID 목록으로 바꾸지 않는다.

`serializationFormat`은 `ARROW` 기본값 또는 `CSV`다. 기본 결과 제한은 100만 행이다. 이 상한 증가는 별도 협의 대상으로 설명된다. 요청에 행 제한 인자가 없다고 무제한이라고 판단하지 않는다.

execute와 cancel의 OAuth2 scope는 `api:sql-queries-execute`, status/results 조회는 `api:sql-queries-read`다. 쿼리 입력 자료에 대한 권한도 필요하며, 실행을 시작한 사용자만 해당 쿼리를 조작할 수 있다. 실행 ID를 받은 다른 사용자의 token으로 넘겨 이어받는 방식을 전제하지 않는다.

## 상태와 결과는 다른 응답이다

| 동작 | endpoint |
|---|---|
| 실행 | `POST /api/v2/sqlQueries/execute` |
| 상태 | `GET /api/v2/sqlQueries/{sqlQueryId}/getStatus` |
| 결과 | `GET /api/v2/sqlQueries/{sqlQueryId}/getResults` |
| 취소 | `POST /api/v2/sqlQueries/{sqlQueryId}/cancel` |

execute/status의 `QueryStatus`는 `running`, `canceled`, `failed`, `succeeded` tagged union이다. running/succeeded에는 queryId, failed에는 errorMessage가 있다. HTTP 성공만 보고 SQL 결과가 성공했다고 처리하지 않는다.

`sqlQueryId`는 URL-safe하지 않을 수 있어 path에 넣기 전에 URL 인코딩해야 한다. 예제 ID가 안전해 보이는지와 관계없이 적용할 계약이다.

getResults는 실행 때 지정한 형식의 binary body를 돌려준다. 공통 JSON decoder로 강제 파싱하지 않는다. long polling 요청은 1분 뒤 timeout할 수 있으며, 쿼리가 계속 실행 중이면 안전하게 재시도할 수 있다고 명시한다. 이 재시도 보장은 결과 조회에 해당한다. 신규 execute를 재호출해 같은 실행이 중복 생성되지 않는다는 보장으로 확대하지 않는다.

이 명세에는 결과 페이지 token이나 결과 분할 cursor가 없다. 같은 getResults를 일반 목록 paging처럼 연결하지 않는다. cancel은 더 이상 running 상태가 아니면 실질적으로 no-op이다.

## 실패 원인을 구분한다

`QueryParseError`는 SQL 문법/파싱, `ColumnTypesNotSupported`는 선택한 직렬화 형식으로 표현할 수 없는 column type이다. `ReadQueryInputsPermissionDenied`는 입력 RID 권한, `QueryPermissionDenied`는 쿼리 접근 권한이다. `QueryFailed`는 errorMessage를 제공한다.

`QueryRunning`, `QueryCanceled`도 명시된 오류 이름이다. 실행 중 결과 미준비, 취소 종료와 내부 실패를 하나의 성공/실패 boolean으로 합치지 않는다. endpoint별 execute/getStatus/getResults/cancel permission 오류와 공통 HTTP 오류도 함께 처리한다.

명세 검토 결과이며 실제 enrollment에서 SQL 실행, timeout, 취소나 결과 크기 상향을 시험하지 않았다. [[Palantir-API-Client-Contract]]의 공통 안정성, 권한과 요청 제한을 함께 적용한다.

## 출처

- [Palantir, SQL Query basics](https://www.palantir.com/docs/foundry/api/sql-queries-v2-resources/sql-queries/sql-query-basics)
- [Palantir, Execute SQL Query](https://www.palantir.com/docs/foundry/api/sql-queries-v2-resources/sql-queries/execute-sql-query)
- [Palantir, Get Status SQL Query](https://www.palantir.com/docs/foundry/api/sql-queries-v2-resources/sql-queries/get-status-sql-query)
- [Palantir, Get Results SQL Query](https://www.palantir.com/docs/foundry/api/sql-queries-v2-resources/sql-queries/get-results-sql-query)
- [Palantir, Cancel SQL Query](https://www.palantir.com/docs/foundry/api/sql-queries-v2-resources/sql-queries/cancel-sql-query)

## 관련 문서

- [[Palantir-Dataset-V2-API]]
- [[Palantir-Ontology-SQL-API]]
