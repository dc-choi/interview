---
tags: [palantir, foundry, api, security, sensitive-data, scan]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 민감 데이터 스캔 API"]
---

# 민감 데이터 Scan Record의 상태와 판정 범위

Scan Record는 특정 ScanConfiguration으로 특정 자원을 스캔한 한 번의 실행 기록이다. configuration은 반복 실행이나 일회성 실행을 가리킬 수 있다. 실행의 성공/실패, 검사 범위와 개별 match condition의 결과를 함께 읽어야 한다.

## 조회와 필터

`GET /api/v2/sds/scanConfigurations/{scanConfigurationId}/records`는 `api:sds-records-read` scope와 `preview=true`를 요구한다. path의 configuration ID와 query의 scopeRid가 필수다. scopeRid는 검사 대상 자원들이 있는 Space를 지정한다.

scanRecordIsActiveFilter는 ALL_SCANS, ACTIVE_SCANS, COMPLETED_SCANS 중 하나다. 생략하면 active와 completed를 모두 반환한다. scanResultStatusFilter를 생략하면 결과 상태와 무관하게 조회한다. pageSize/pageToken과 nextPageToken으로 순회한다.

## 결과 상태를 탐지 없음과 구분한다

| 상태 | 해석할 때의 경계 |
|---|---|
| RUNNING | 검사 진행 중 |
| FAILED | 검사 실패 |
| SUCCEEDED_WITH_MATCHES | 성공했고 match 있음 |
| SUCCEEDED_WITHOUT_MATCHES | 성공했고 match 없음 |
| CANCELLED | 취소 |
| UNPROCESSABLE_SKIPPED | 처리할 수 없어 생략 |
| NO_PERMISSION_SKIPPED | 권한 문제로 생략 |
| NO_NEW_DATA_SKIPPED | 새 데이터가 없어 생략 |

권한이 없어 생략한 자원을 민감 데이터가 없다고 분류하지 않는다. 취소/실패/진행 중 상태도 성공한 no-match와 별도다. NO_NEW_DATA_SKIPPED의 의미를 보관된 데이터 전체를 다시 검사한 결과로 확대하지 않는다.

## 검사 대상과 개별 condition을 추적한다

record는 ID, scanConfigurationId, scannedResource, branchId, startTime과 status를 가진다. completedTime, transactionRid, buildRid와 조건/작업 RID 목록은 선택적이다. 같은 자원이라도 어떤 branch/transaction 범위를 검사했는지를 구분한다.

scanResult는 matchConditionRid별 outcome이다. numberOfScannedRows와 함께 다음 union을 제공한다.

- noMatch: 해당 조건이 검사 데이터에서 탐지되지 않음
- datasetMatch: matchedColumns의 columnName과 numberOfMatchedRows
- mediasetMatch: numberOfMatchedMediaItems와 예시 mediaItemRid

총 결과 상태가 match 있음이어도 모든 조건/column에서 match가 있다는 뜻은 아니다. 반대로 일부 조건의 noMatch를 전체 자원의 민감 데이터 부재로 일반화하지 않는다. 이는 condition별 결과와 검사 범위에서 도출한 해석 원칙이다.

row/media count의 schema는 Long을 문자열 형식으로 명시하지만 같은 페이지 JSON 예제에는 숫자가 포함된다. 실제 wire encoding을 이 예제만으로 단정하지 않으며 SDK 타입/실제 응답을 확인한다. 큰 값을 일반 JavaScript number로 무조건 변환해 정확도를 잃지 않도록 한다.

ScanConfigurationNotFound는 configuration ID 문맥을 제공한다. 일반 인증/권한/제한 오류도 처리하며 errorResponses에 특정 오류만 나열되었다고 다른 실패 가능성이 없다고 보지 않는다.

공식 schema를 대조했으며 실제 검사 실행, match 정확도, 전체 데이터의 민감 정보 유무나 enrollment별 보안 정책을 검증한 기록은 아니다.

## 출처

- [Palantir, Scan Record basics](https://www.palantir.com/docs/foundry/api/sds-v2-resources/scan-records/scan-record-basics)
- [Palantir, List Scan Records](https://www.palantir.com/docs/foundry/api/sds-v2-resources/scan-records/list-scan-records)

## 관련 문서

- [[Palantir-API-Operations]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-Security-and-Governance]]
