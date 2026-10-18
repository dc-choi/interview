---
tags: [palantir, data-health, schema, data-quality]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Health check 내용과 schema"]
---

# Health check 내용과 schema

검사마다 대상 resource와 계산 범위를 확인한다. Checks reference에서는 status/job/last updated/primary key/column/schema 중 일부를 Iceberg/Virtual table에도 지원하지만 size/content의 많은 검사는 dataset만 대상으로 한다. 일반 dataset에서 되는 검사를 모든 table에 그대로 적용하지 않는다.

## 크기와 내용 검사 선택

| 검사 | 판단 대상 |
|---|---|
| Dataset file count | 최신 view의 전체 file 수 |
| Transaction file count/size | 한 transaction에 committed된 file, log file 제외 |
| Row count | dataset 전체 row 수, last successful 기준이면 failed result를 baseline에 포함하지 않음 |
| Dataset partition | 50 file 미만이면 통과. 50 이상이면 90% 이상 file이 96MB 초과인지 확인 |
| Allowed values/regex | 허용 value 목록 또는 column pattern |
| Date/numeric range | 허용 범위 |
| Null percentage | null 비율, 절대 threshold 또는 median deviation |
| Numeric mean/median | 중심값 threshold 또는 이전 결과 차이 |
| Approximate unique percentage | 근사 distinct 비율 |
| Approximate column relation | 두 dataset column의 근사 일치 비율 |
| Primary key | 100% unique와 non-null |

Approximate unique를 primary-key 검증에 사용하지 않는다. 정확한 cross-column relation이 필요하면 data expectation으로 검증한다. Dataset partition 규칙은 file 구성의 경험적 지표이며 모든 workload에서 최적 partition을 보장하지 않는다.

Numeric median의 configuration 표에 이전 mean이라는 표현이 섞여 있으므로 실제 check type과 report가 median을 비교하는지 확인한다. Transaction file count 표의 File size label도 file count와 혼동하지 않는다. UI label의 불일치만으로 계산 동작을 확정하지 않는다.

## Schema 허용 방향을 명시한다

Column check는 존재와 type, column count는 수만 확인한다. 같은 column 수가 같은 schema를 의미하지 않는다. 전체 schema check는 다음 정책을 사용한다.

| 정책 | 허용 변화 |
|---|---|
| EXACT_MATCH_ORDERED_COLUMNS | 이름/type/수/order 모두 일치 |
| EXACT_MATCH_UNORDERED_COLUMNS | 이름/type/수 일치, order 무관 |
| COLUMN_ADDITIONS_ALLOWED | 원래 column 이름/type 유지, 추가 허용 |
| COLUMN_ADDITIONS_ALLOWED_STRICT | 추가된 column을 check에 포함해 이후 삭제도 차단 |

STRICT는 새 column을 승인 없이 무조건 막는 정책이 아니라 추가된 column을 앞으로의 필수 baseline으로 편입한다. 배포 후 rollback이나 schema 제거 계획과 함께 선택한다.

## 통계 threshold의 의미

Approximate standard deviation은 실제 standard deviation이 아니라 `median(abs(x - median(x))) * 1.4826`이다. Outlier에 덜 민감한 MAD 기반 추정이며 어떤 최근 build window를 쓰는지 확인한다. 계절성, volume 변화와 초기 sample 부족을 검토하고 통과를 data correctness 전체의 증거로 삼지 않는다.

## Marketplace 전달 경계

Dataset transformation 또는 Pipeline Builder output의 check를 Suggestions에서 package할 수 있다. Secondary dataset/path validation과 자동 issue 생성 설정은 configuration validation 지원에 예외가 있다. Monitoring view/check group은 input으로 추가되어 설치 시 연결하며 data expectation check는 transform logic에 포함되어 자동 생성된다. Packager가 그 check만 별도로 추가/제거할 수는 없다.

## 출처

- [Palantir, Checks reference](https://www.palantir.com/docs/foundry/data-health/checks-reference)
- [Palantir, Add health checks to a Marketplace product](https://www.palantir.com/docs/foundry/data-health/marketplace-data-health)

## 관련 문서

- [[Palantir-Health-Check-Evaluation-and-Freshness|평가 시점]]
- [[Palantir-Health-Alerts-and-Incident-Context|실패 대응]]
