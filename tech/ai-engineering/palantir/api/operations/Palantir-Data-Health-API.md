---
tags: [palantir, foundry, api, data-health, quality, monitoring]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Data Health API"]
---

# Data Health Check 정의와 Report 해석

Check는 검증 대상/조건의 정의, CheckReport는 한 번 실행한 결과다. Report에는 실행 당시의 check configuration snapshot이 들어가며 나중에 Check를 바꾸어도 이 snapshot은 바뀌지 않는다. 현재 정의와 과거 결과의 기준을 분리해 원인을 추적한다.

## 정의 관리와 결과 조회

공통 prefix는 `/api/v2/dataHealth/checks`다. 확인일의 여섯 endpoint 모두 Preview이며 `preview=true`를 요구한다.

| 작업 | Method와 경로 | scope |
|---|---|---|
| 생성 | POST prefix | `api:data-health-write` |
| 조회 | GET `/{checkRid}` | `api:data-health-read` |
| 교체 | PUT `/{checkRid}` | `api:data-health-write` |
| 삭제 | DELETE `/{checkRid}` | `api:data-health-write` |
| 특정 Report 조회 | GET `/{checkRid}/checkReports/{checkReportRid}` | `api:data-health-read` |
| 최근 Report 조회 | GET `/{checkRid}/checkReports/getLatest` | `api:data-health-read` |

최근 Report는 최신순이며 limit 기본 10, 최대 100이다. 이 endpoint에는 pageToken 계약이 없으므로 임의의 반복 호출로 전체 이력을 순회할 수 있다고 전제하지 않는다. 특정 report RID 조회와 최근 제한 목록의 용도를 구분한다.

create의 config는 필수, intent는 선택적이다. 같은 subject의 같은 check type이 이미 있으면 CheckAlreadyExists conflict가 발생하며 조회 권한이 있을 때만 conflictingCheck를 알려준다. 응답이 충돌 정보를 생략했다고 기존 check가 없다고 판단하지 않는다.

replace는 생성 후 check type 변경을 지원하지 않는다. create와 replace의 config schema는 다르며 대상 subject/column을 다시 보내는 것과 변경 가능한 threshold를 보내는 것을 구분한다. 타입을 바꾸려면 기존 RID를 유지하는 replace로 해결된다고 가정하지 않는다.

## 검사 유형별 대상과 의미

| 범주 | 지원되는 검사 |
|---|---|
| 상태 | 최근 job, build, schedule의 상태 |
| 소요 시간 | job, build, schedule의 완료 소요 시간 |
| 신선도 | dataset이 마지막으로 갱신된 뒤 지난 시간 |
| 수치 column | 값의 범위, mean, median |
| 비율 | null percentage, approximate unique percentage |
| schema | column 존재/타입, 전체 column 수, 예상 schema와 비교 |
| 값/키 | 허용 값 집합과 null 허용, 하나 이상 column의 primary key 검증 |

Dataset 기반 subject는 datasetRid와 branchId를, schedule 기반은 scheduleRid를 지정한다. primaryKey는 column의 유일성과 non-null을 검사한다. 이 검사가 데이터베이스처럼 쓰기 시점에 모든 위반 입력을 차단한다는 보장과는 구별한다. approximate unique percentage를 정확한 uniqueness 검사의 대체로 취급하지 않는다.

columnType 검사는 column의 존재를 확인하며 expectedType은 선택적이다. 타입을 주지 않았는데 특정 타입 일치까지 검증했다고 해석하지 않는다. allowedColumnValues는 date/boolean/string/numeric tagged 값을 받고 allowNull을 따로 구성한다.

## Threshold와 trend의 조건부 필수값

severity는 MODERATE 또는 CRITICAL이다. 검사 종류에 따라 absolute bound, 과거 추세와 median deviation을 선택한다.

- NumericColumnCheckConfig는 numericBounds 또는 trend 하나 이상이 필요하며 둘 다 지정할 수도 있다.
- TrendConfig는 trendType 또는 differenceBounds 하나 이상이 필요하다.
- TimeCheckConfig/TransactionTimeCheckConfig는 timeBounds 또는 medianDeviation 하나 이상이 필요하다.
- PercentageCheckConfig는 percentageBounds 또는 medianDeviation 하나 이상이 필요하다.

각 field의 required flag가 false여도 조합 전체가 비어 있으면 안 된다. API는 InvalidNumericColumnCheckConfig, InvalidTrendConfig, InvalidTimeCheckConfig, InvalidTransactionTimeCheckConfig와 InvalidPercentageCheckConfig로 이런 조건을 구분한다.

trendType은 증가하지 않음, 감소하지 않음, 엄격한 증가, 엄격한 감소와 상수 유지다. differenceBounds로 변화량을 제한할 수 있다. NumericBounds의 lower/upper와 percentage bound는 별도 형식이며 percentage는 0~100 범위다.

median deviation은 dataPoints, deviationThreshold와 선택적 LOWER_BOUND/UPPER_BOUND/TWO_TAILED를 사용한다. 이 schema만으로 통계 계산식이나 초기 데이터 부족 시 판정 알고리즘을 추정하지 않는다. 절대 시간 bound의 단위는 second다.

상태 검사에는 정해진 실패 횟수, 선택적 시간 간격 이후 severity를 CRITICAL로 올리는 escalationConfig가 있다. 개별 실패와 누적 악화 기준을 구분한다.

## 신선도는 빈 transaction과 실제 데이터 변경을 구분한다

timeSinceLastUpdated의 ignoreEmptyTransactions 기본값은 true다. 이 경우 실제 데이터 변경이 있는 transaction만 갱신으로 계산한다. 빈 작업이 주기적으로 성공했다는 사실을 새 데이터가 들어왔다는 신호로 사용하지 않는다.

## Schema 비교의 네 정책

| 정책 | 허용하는 차이 |
|---|---|
| EXACT_MATCH_ORDERED_COLUMNS | column과 순서 모두 일치 |
| EXACT_MATCH_UNORDERED_COLUMNS | column은 일치, 순서는 무관 |
| COLUMN_ADDITIONS_ALLOWED | 예상 column을 포함하고 추가 column 허용, 누락한 type은 무시 |
| COLUMN_ADDITIONS_ALLOWED_STRICT | 추가 column 허용, 예상/실제 type 모두 있어야 하고 정확히 일치 |

expectedSchema의 각 column은 이름과 선택적 type을 가진다. schema의 additive 변경을 허용할지와 type 누락을 무시할지는 서로 다른 판단이다. 운영 소비자가 열 순서에 의존한다면 unordered 정책의 통과만으로 호환성을 보장할 수 없다.

## Report status는 boolean이 아니다

결과 status는 PASSED, FAILED, WARNING, ERROR, NOT_APPLICABLE과 NOT_COMPUTABLE이며 선택적 message가 추가된다. 계산 불가나 적용 불가를 검사 통과와 합치지 않는다. Report의 createdTime과 고정된 check snapshot을 함께 확인한다.

CheckTypeNotSupported는 요청한 check 종류를 현재 Platform API가 아직 지원하지 않는 경우다. UI의 기능 존재나 metadata 타입 나열만으로 모든 check를 API에서 조작할 수 있다고 판단하지 않는다. NotFound, type 변경 불가와 작업별 PermissionDenied도 따로 처리한다.

공식 전체 config/result schema를 대조했으며 실제 검사 생성/실행, 통계 판정과 delete의 영향을 시험하지 않았다.

## 출처

- [Palantir, Check basics](https://www.palantir.com/docs/foundry/api/data-health-v2-resources/checks/check-basics)
- [Palantir, Check Report basics](https://www.palantir.com/docs/foundry/api/data-health-v2-resources/check-reports/check-report-basics)
- [Palantir, Create Check](https://www.palantir.com/docs/foundry/api/data-health-v2-resources/checks/create-check)
- [Palantir, Get Check](https://www.palantir.com/docs/foundry/api/data-health-v2-resources/checks/get-check)
- [Palantir, Replace Check](https://www.palantir.com/docs/foundry/api/data-health-v2-resources/checks/replace-check)
- [Palantir, Delete Check](https://www.palantir.com/docs/foundry/api/data-health-v2-resources/checks/delete-check)
- [Palantir, Get Check Report](https://www.palantir.com/docs/foundry/api/data-health-v2-resources/check-reports/get-check-report)
- [Palantir, Get Latest Check Reports](https://www.palantir.com/docs/foundry/api/data-health-v2-resources/check-reports/get-latest-check-reports)

## 관련 문서

- [[Palantir-API-Operations]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-Python-Transform-Definition]]
