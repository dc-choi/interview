---
tags: [palantir, foundry, data-pipeline, incremental, data-quality]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 데이터 파이프라인 운영", "Foundry Incremental Pipelines"]
---

# Palantir 데이터 파이프라인 운영

파이프라인 운영은 원천 변경을 수집하고, 정해진 데이터 계약으로 변환하며, 어떤 입력과 코드가 결과를 만들었는지 추적하는 일이다. 수집 방식, transaction, 품질 검사와 배포를 함께 설계해야 최신 데이터가 올바른 업무 객체로 이어진다.

2026-10-16 공개 공식 문서의 해당 절을 대조했다. 실제 Foundry 연결, 장애 복구나 처리량을 시험한 기록은 아니다. 통합 구조는 [[Palantir-Data-and-Model-Integration]], 객체 색인의 후속 경계는 [[Palantir-Object-Backend]]에서 다룬다.

## Dataset transaction은 파일 집합의 변경이다

Dataset의 현재 view는 transaction들을 적용한 유효 파일 집합이다. Transaction은 `OPEN`에서 파일을 쓰고, `COMMITTED`가 되면 view에 반영된다. `ABORTED`의 파일은 무시된다. 여기의 `UPDATE`를 업무 row의 SQL UPDATE와 같게 해석하면 안 된다. ([Datasets](https://www.palantir.com/docs/foundry/data-integration/datasets))

| Transaction | 현재 view에 미치는 영향 | 운영에서 확인할 것 |
|---|---|---|
| `SNAPSHOT` | 새 파일 집합으로 교체 | 전체 재계산 비용과 downstream 영향 |
| `APPEND` | 새 파일 추가, 기존 파일 덮어쓰기 금지 | 원천이 기존 파일을 수정하는지 |
| `UPDATE` | 새 파일 추가 또는 기존 파일 교체 | 기존 파일 교체가 incremental 조건을 깨는지 |
| `DELETE` | 파일 참조 제거 | 물리 삭제와 retention을 별도로 처리하는지 |

기존 파일을 덮어쓰지 않는 `UPDATE`는 incrementality를 유지할 수 있다. 반면 기존 파일을 바꾸면 downstream이 snapshot 처리로 돌아갈 수 있다. `DELETE` transaction만으로 backing filesystem의 파일 자체가 삭제되는 것은 아니다. ([Datasets](https://www.palantir.com/docs/foundry/data-integration/datasets))

## 수집이 incremental이어도 downstream은 아닐 수 있다

일반적인 end-to-end incremental 경로는 새 데이터만 수집하고 변환한다. 원천을 매번 snapshot으로 읽은 뒤 차이를 계산하는 것도 가능하지만 원천 부하와 전체 재처리를 줄이는 이점이 작아진다. ([Creating incremental syncs](https://www.palantir.com/docs/foundry/building-pipelines/create-incremental-syncs))

File-based sync는 transaction과 필터를 함께 설정한다. ([File-based syncs](https://www.palantir.com/docs/foundry/data-connection/file-based-syncs))

- Batch mirror: `SNAPSHOT`으로 매번 전체 파일을 수집한다.
- Incremental mirror: `APPEND`와 이미 수집한 파일 제외를 조합해 경로 기준 새 파일만 수집한다.
- 수정 파일 수집: `UPDATE`와 수정 시각/크기 비교를 사용한다. 원천 수정은 따라가지만 기존 파일 교체가 downstream incremental 처리를 방해한다.
- Trailing window: `SNAPSHOT`과 이미 수집한 파일 제외를 조합하면 이번에 새로 발견한 파일만 현재 view에 남는다. 누적 보관과 의미가 다르다.

같은 incremental이라는 이름보다 파일 식별 키, 수정 감지와 삭제 반영 계약을 먼저 본다. 이 표의 파일 수집 동작을 모든 DB 커넥터나 CDC의 전달 보장으로 일반화하지 않는다.

## 변환은 snapshot으로 다시 실행되어도 맞아야 한다

`@incremental()`은 이전 build를 참고해 실제 실행 모드를 정한다. Decorator를 붙였다는 사실만으로 매번 incremental 실행이 보장되지는 않는다. 입력 snapshot 등으로 전체 재계산이 필요할 수 있다. ([Incremental pipelines](https://www.palantir.com/docs/foundry/building-pipelines/incremental-overview))

Python transform의 기본 입력 read mode인 `added`는 incremental 실행에서 새 row, non-incremental 실행에서 전체 입력을 읽는다. 기본 output mode도 각각 `modify`와 `replace`로 바뀐다. 따라서 단순 필터는 같은 로직으로 두 모드를 다룰 수 있지만, 누적 집계와 상태 결합은 별도 검증이 필요하다. ([Incremental usage guide](https://www.palantir.com/docs/foundry/transforms-python/incremental-usage))

- `semantic_version`을 바꾸면 다음 실행을 non-incremental로 강제할 수 있다.
- `require_incremental=True`도 첫 output build와 semantic version 변경 시에는 snapshot을 허용한다.
- 추가 입력과 이전 output을 결합하는 로직은 최초 실행, 재실행과 snapshot 전환에서 결과가 맞는지 확인한다.

마지막 항목은 운영 설계 점검이다. 파일 transaction의 원자성과 업무 키 중복 제거, 외부 시스템의 exactly-once 전달은 서로 다른 계약이다.

## 원자성은 실행 경로와 단위를 확인한다

Foundry build system의 Iceberg job은 그 job의 여러 write를 함께 commit하거나 버리고, repeatable read와 multi-table snapshot isolation을 제공한다. 같은 job 안에서는 자신의 write를 다시 읽을 수 있지만 외부에는 commit 전까지 보이지 않는다. ([Iceberg transactions](https://www.palantir.com/docs/foundry/iceberg/transactions))

이 보장은 외부 Iceberg client로 쓰는 경로에는 적용되지 않는다. 또한 여러 job으로 이루어진 pipeline 전체나 외부 API 호출까지 하나의 transaction으로 묶는다는 뜻도 아니다. Compaction과 충돌해 commit이 실패하면 build system이 job을 재시도할 수 있으므로 재계산 비용도 관찰한다.

## Schema는 소비자에게 제공하는 계약이다

Dataset schema는 파일 해석 방법과 column 이름/타입을 정의하는 메타데이터다. 파일이 선언한 schema를 실제로 따르는지는 별도다. ([Datasets](https://www.palantir.com/docs/foundry/data-integration/datasets))

CSV/JSON의 schema 추론은 데이터 일부를 기준으로 한다. 매 build마다 추론하면 비용이 들고 batch별 타입 추론이 달라질 수 있어, 안정된 입력에는 명시적 schema가 유리하다. ([Infer a schema](https://www.palantir.com/docs/foundry/building-pipelines/infer-schema))

Column 삭제, 개명과 타입 변경은 downstream 소비자를 깨뜨릴 수 있다. 새 column을 추가하고 기존 column의 폐기와 소비자 전환을 관리하는 방식이 권장된다. Sample preview는 join의 모든 경우나 실제 build 산출물을 검증하지 못하므로 branch에서 실제 output도 확인한다. ([Branching and release process](https://www.palantir.com/docs/foundry/building-pipelines/branching-release-process))

## Schedule 성공과 데이터 최신성은 다르다

Schedule은 시각, 데이터 변경과 로직 변경을 trigger로 조합하고, 단일 dataset 또는 의존 관계를 포함한 build 범위를 정한다. Trigger 조건과 build 대상 범위를 구분해야 한다. ([Scheduling](https://www.palantir.com/docs/foundry/building-pipelines/scheduling-overview))

| 검사 | 답하는 질문 | 놓칠 수 있는 것 |
|---|---|---|
| Job status | 해당 transform이 성공했는가? | downstream 실패, upstream 실패로 인한 취소 |
| Schedule status/duration | 지정 schedule의 build가 성공했고 제때 끝났는가? | 실제 업무 데이터가 최신인가 |
| Time since last updated | 마지막 commit이 언제인가? | 빈 transaction도 갱신으로 계산 |
| Data freshness | commit 시각과 데이터 timestamp 최댓값의 차이는? | commit이 없으면 해당 검사가 다시 실행되지 않음 |
| Sync freshness | 최신 sync 시각과 데이터 timestamp 최댓값의 차이는? | 업무상 timestamp 정의의 적절성 |

검사별 시간 기준은 [Types of checks](https://www.palantir.com/docs/foundry/health-checks/check-types)를 따른다. 자동 시간 검사는 갱신과 임계 시각에, 수동 schedule 검사는 정해진 주기에 평가된다. 데이터 build 주기와 검사 평가 주기는 별도다. ([Check evaluation](https://www.palantir.com/docs/foundry/health-checks/check-evaluation))

Data expectation은 `FAIL`이면 job 중단, `WARN`이면 경고 후 진행하도록 정할 수 있다. 단, single-node transform의 virtual table output은 `FAIL`을 지원하지 않는다. 품질 규칙을 만들었다는 사실과 불량 데이터의 게시를 막는다는 사실을 구분한다. ([Data expectations](https://www.palantir.com/docs/foundry/transforms-python/data-expectations-getting-started))

## 장기 운영에서는 파일 수와 재처리 비용을 본다

작은 append가 누적되면 파일과 transaction 수 때문에 읽기, view 해석과 pre-compute가 느려질 수 있다. 정기 snapshot은 이를 줄이지만 비용과 downstream 재계산, 갱신 중단 시간을 늘릴 수 있다. Dataset projection은 정본을 바꾸지 않고 별도 읽기 표현을 compact하지만 추가 저장과 retention 연계를 검토해야 한다. 이 설명은 catalog dataset 경로이며 Iceberg maintenance와 동일시하지 않는다. ([Maintaining high performance](https://www.palantir.com/docs/foundry/building-pipelines/maintaining-incremental-performance))

Lineage는 ancestor/descendant, schema, 마지막 build와 생성 코드를 연결해 변경 영향을 조사하는 수단이다. Lineage 화면이 있다는 사실만으로 원천 내용의 정확성이 입증되지는 않는다. ([Data Lineage](https://www.palantir.com/docs/foundry/data-lineage/overview))

### Transaction batching과 rollback의 범위를 확인한다

2025년 7월 input `transaction_limit` 도입은 한 job이 누적 미처리 transaction 전체를 읽다가 실패하는 비용을 줄였다. Input마다 다른 limit을 둘 수 있지만 당시 `v2_semantics=True`, Python transforms 3.25.0 이후, non-lightweight와 transactional non-snapshot input을 요구했다. Current view는 첫 SNAPSHOT 이후 APPEND만 가능했다. Job별 range와 `added/current/previous` 의미를 확인하고 backlog가 남으면 후속 build schedule로 계속 처리한다. ([July 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-07))

같은 달 pipeline rollback beta는 upstream transaction의 provenance로 downstream의 대응 transaction을 제안하고 incremental state도 맞추는 경로였다. 선택 branch와 preview한 최종 상태, 제외 dataset을 확인한다. Stream/media/Restricted View와 Edit 권한이 없는 transactional dataset은 unsupported로 표시됐다. Code rollback, object edit 취소와 외부 export 보상을 한 번에 수행하는 기능으로 확대하지 않는다.

## Branch merge와 데이터 배포를 분리한다

Code Repositories의 release 가이드는 여러 repository를 하나의 product로 보고 branch 이름과 fallback 입력을 맞추도록 권장한다. 운영 Ontology에 노출하는 schema를 안정되게 유지하고 원천 schema 변경을 변환 계층에서 흡수하는 것이 목적이다. 구체적인 GitFlow 구성은 권장 예시이며 제품의 강제 규칙은 아니다. ([Branching and release process](https://www.palantir.com/docs/foundry/building-pipelines/branching-release-process))

Global Branching에서는 proposal의 check와 approval을 통과한 뒤 merge한다. Merge 시 전체 영향 자원 build, 수정 자원만 build와 build 생략을 고를 수 있어 merge 완료가 데이터 재생성 완료를 뜻하지 않는다. 일부 자원만 merge된 실패 상태는 자동 전체 rollback으로 처리되지 않으며 오류를 해결해 재시도해야 한다. ([Global Branching core concepts](https://www.palantir.com/docs/foundry/global-branching/core-concepts))

또한 일반 Foundry resource의 branch상 생성/삭제는 `main`에 영향을 준다. Ontology entity의 branch상 생성/수정/삭제와 격리 범위가 다르므로 모든 작업을 완전한 복제 환경으로 생각하지 않는다.

## 개인 지식 시스템에 적용할 원리

다음은 제품 기능을 이 Vault에 적용하는 설계 해석이며 현재 구현 확인 결과가 아니다.

1. 원문 변경, 수집, 해석, 색인과 검색 반영의 시각/버전을 각각 추적한다.
2. 수집 성공, 본문 학습 완료와 검증 완료를 별도 상태로 둔다.
3. 원문 교체/삭제가 발생하면 추가 문서만 처리하는 경로의 결과와 전체 재색인 결과를 비교한다.
4. Schema 변경은 검색 소비자와 추출기를 함께 확인하고, 배포 후 실제 색인 갱신 여부까지 검증한다.

## 출처

- [Palantir, Datasets](https://www.palantir.com/docs/foundry/data-integration/datasets)
- [Palantir, Incremental pipelines](https://www.palantir.com/docs/foundry/building-pipelines/incremental-overview)
- [Palantir, Creating incremental syncs](https://www.palantir.com/docs/foundry/building-pipelines/create-incremental-syncs)
- [Palantir, File-based syncs](https://www.palantir.com/docs/foundry/data-connection/file-based-syncs)
- [Palantir, Incremental usage guide](https://www.palantir.com/docs/foundry/transforms-python/incremental-usage)
- [Palantir, Iceberg transactions](https://www.palantir.com/docs/foundry/iceberg/transactions)
- [Palantir, Infer a schema for CSV or JSON files](https://www.palantir.com/docs/foundry/building-pipelines/infer-schema)
- [Palantir, Scheduling](https://www.palantir.com/docs/foundry/building-pipelines/scheduling-overview)
- [Palantir, Types of checks](https://www.palantir.com/docs/foundry/health-checks/check-types)
- [Palantir, Check evaluation](https://www.palantir.com/docs/foundry/health-checks/check-evaluation)
- [Palantir, Data expectations, Getting started](https://www.palantir.com/docs/foundry/transforms-python/data-expectations-getting-started)
- [Palantir, Maintaining high performance](https://www.palantir.com/docs/foundry/building-pipelines/maintaining-incremental-performance)
- [Palantir, Data Lineage](https://www.palantir.com/docs/foundry/data-lineage/overview)
- [Palantir, Branching and release process](https://www.palantir.com/docs/foundry/building-pipelines/branching-release-process)
- [Palantir, Global Branching, Core concepts](https://www.palantir.com/docs/foundry/global-branching/core-concepts)
- [Palantir, July 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-07)

## 관련 문서

- [[Palantir-Data-and-Model-Integration|데이터와 모델 통합]]
- [[Palantir-Object-Backend|객체 색인과 저장]]
- [[Palantir-Security-and-Governance|보안과 거버넌스]]
- [[Development-Ontology|개인 지식 온톨로지]]
