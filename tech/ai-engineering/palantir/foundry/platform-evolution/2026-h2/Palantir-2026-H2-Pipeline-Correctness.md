---
tags: [palantir, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 파이프라인 상태와 데이터 정확성

아래는 2026년 하반기 릴리스 당시 변경을 합성한 기록이다. 실제 enrollment 적용과 현재 지원 범위는 해당 기능 문서로 확인한다.

## 상태 변경을 검토하는 근거

2026-10-15 Pipeline Builder는 streaming/incremental deployment를 막는 state break의 이유와 영향을 받는 entity를 그룹으로 표시하도록 바뀌었다. 삭제된 entity는 변경 내역을 볼 수 있지만 graph에서 찾거나 편집할 수 없다. Custom transform/subgraph 안의 break도 가장 깊은 변경 그룹 아래 한 번 표시하도록 수정됐다.

State break 원인을 읽고 변경을 되돌리는 UI는 상태 보존이나 replay 안전성을 자동 보장하지 않는다. 첫 output build에서 incremental checks가 실행되지 않았으면 neutral 상태로 표시하는 변경도 있어, 체크가 없었던 경우와 통과한 경우를 구분한다.

Evaluator form의 여러 metric passing condition은 Apply 때 모두 저장하고 같은 metric의 마지막 변경을 유지하도록 수정됐다. Join match condition은 지원되지 않는 null-safe equality를 non-null-safe label로 바꿔 명시한다. Label 수정 자체는 기존 transform 출력을 바꾸지 않는다.

## Iceberg와 identifier

10월 Faster pipeline은 암호화/비암호화 Iceberg table 읽기/쓰기를 지원하고 snapshot overwrite와 incremental append 출력을 제공한다. 그러나 Faster의 incremental Iceberg input 읽기는 당시 아직 미지원이었다. Output expectation으로 잘못된 결과 publish 전 build를 막을 수 있다.

Identifier changelog reader는 같은 snapshot 안의 중복 identifier를 조용히 한 행으로 줄이던 동작 대신 오류를 낸다. Compound identifier나 net changelog를 선택해야 하며 중복을 허용할지의 업무 의미부터 확인한다.

## 진단과 탐색의 해석

Build search에서 transform type/job type include는 일치 build를 추가하며 다른 filter와 exclude를 계속 적용하도록 수정됐다. 실행 중 개별 job만 취소할 수 있게 됐지만 전체 build 취소와 하류 영향은 다르다. Dataset fallback branch tooltip도 실제 local/global 종류를 구분하도록 수정됐다.

Data Connection source별 sync filter와 collapse 시 sidebar state 유지, Iceberg/virtual table label 구분은 탐색 신뢰성을 높인다. Data Lineage의 unavailable resource는 삭제/권한 부족에 공통 access-request view를 보여 주므로 화면 문구만으로 실제 원인을 구분하지 않는다.

## 9월 처리와 재실행 경계

9월28일 replay tooltip은 지정 시각 뒤 transaction이 없으면 그 시각부터, 있으면 그 시각 직전의 가장 최근 transaction부터 시작한다고 명확히 했다. 단순한 wall-clock 이후 행만 처리하는 필터로 이해하지 않는다.

9월22일 Spark 3.5.5→4.0.1 rollout은 runtime adjudication이 자동 관리하지만 custom dependency와 성능 회귀 가능성은 남긴다. 고위험 작업은 temporary pin으로 rollout을 제어하면서 검증할 수 있다. 자동 platform upgrade와 사용자 코드의 호환성 증명은 다르다.

Iceberg table/catalog GA는 standard enterprise AWS/Azure/GCP 환경과 관리자 enable/configure를 전제로 했다. 관리형/고객 bucket, credential vending, inherited marking 검사와 schema branch isolation, multi-write atomicity가 추가 계약이다. 이를 일반 Iceberg 규격만의 보장이나 외부 side effect의 원자성으로 확대하지 않는다.

Trained model node의 streaming 지원과 unsupported enrollment의 UI 숨김은 따로 변경됐다. Containerized compute 가용성을 먼저 확인한다. Projection badge는 주기적으로 갱신되므로 즉시 최신성을 보장하지 않고 잘못된 permission-denied 표시 수정도 실제 읽기 권한 검사와 구분한다.

LLM evaluation suite는 production pipeline에 영향 없는 test 입력과 별도 result dataset을 사용하고 exact-match/LLM judge 등을 조합한다. Evaluation 생성 위치가 project에서 parent folder로 바로잡혔고 evaluator Configure/추가 scroll UI도 개선됐다. 실행 성공만으로 업무 정답이 검증되지는 않는다.

Resource-backed manual table의 row/schema 수정, union/reusable rebase conflict와 보호된 non-main branch schedule이 diff/검토 화면에 제대로 나타나도록 수정됐다. Table panel close animation과 View on graph의 가시성 수정은 원천 데이터 변경과 구분한다.

Webhook을 reusable function으로 publish해 여러 앱/Action/Automate/Machinery에서 호출할 수 있지만 외부 효과의 재시도/멱등성은 별도로 설계한다.

## 8월 상태, 동시성과 compute

겹치는 schedule run은 기본 차단이며 Allow overlapping runs로 명시적으로 허용한다. 긴 pipeline에서 새 입력 처리를 앞당길 수 있지만 동시 output 변경/재실행/외부 side effect를 별도로 검토한다. Time-series streaming automation replay는 기존 output 유지와 reset을 고를 수 있게 됐으므로 단순 재시작으로 간주하지 않는다.

두 stream의 keyed CoProcess UDF는 두 입력 사이 state를 공유하고 어느 쪽 event에서도 독립적으로 emit한다. 다른 쪽을 반드시 기다리는 표준 join과 의미가 다르다. Rebase의 delete/modify conflict는 조용히 누락하던 동작을 고쳐 base 수정이 기본으로 남으므로 사용자의 최종 결정을 확인한다.

Spark standard batch의 large/extra-large profile은 project import가 필요하며 Project Editor/Owner와 Resource Management admin을 함께 요구한다. 기존 사용 profile은 유지하지만 새 사용은 import 검사를 거친다. Small/medium은 자동 import이고 streaming/Faster에는 이 정책을 확대하지 않는다.

Faster custom profile은 CPU/memory를 독립 설정하고 metadata concurrency,target partitions,soft rows/file,minimum parallel output을 조절한다. 당시 CPU최대32이며 soft row 목표는 정확한 파일 크기 보장이 아니다. Code Workspaces도 이전8CPU/64GB보다 project queue 최대치로 확장했지만 managed profile은 해당 project import 범위로 제한한다.

Single-node Iceberg client-side encryption은 transforms-tables0.1411.0 이상과 non-incremental/append-only incremental을 지원했지만 encrypted read의 filter pushdown은 당시 미지원이었다. Faster output object manual edit와 API name 편집은 별도 기능이며 API name은 Ontology 내 중복/format/100글자 검증을 거친다.

Sync 검색/pagination,Job Tracker object picker,schedule overview 탐색과 Pipeline Builder sandbox의 branch lineage 열기는 운영 탐색을 개선한다. Preparation deprecation banner의 변환 버튼이 schema/로직 호환성 검토를 대신하지 않는다.

## 7월 changelog, fallback과 이력

Direct ChangeLog output은 Spark/stream pipeline에서 key,timestamp,is_deleted와 선택적 effective_at으로 변화 순서/삭제를 제어한다. 기존 ChangeLog comparability 검사는 PK열만 대상으로 수정됐다. Map 등 비PK의 비교 불가능 타입을 이유로 전체 schema를 거부하던 문제와 구분한다.

Empty array/struct/map reusable parameter는 값이 비었더라도 정의에서 inner type을 얻도록 수정돼 Marketplace deploy의 schema 오류를 막는다. Source pipeline 성공과 설치 parameter별 schema 검증은 다른 범위다.

LLM transform fallback은 현재 model이 non-retryable error를 내고 아직 성공 응답이 없을 때만 우선순위의 다음 model로 이동한다. 성공했지만 품질이 낮은 응답을 자동 판정해 대체하는 기능으로 해석하지 않는다.

Time Travel beta의 row 변경은 unique key를 지정하지 않으면 remove+add로 보인다. Bisect는 현재 page에 loaded된 version만 검색하며 retention으로 제거된 data는 조사할 수 없다. Query를 유지한 version 비교와 물리 보존/rollback을 구분한다.

Registered model은 source/Compute Module 모델을 trained transform에 선택하게 됐지만 모든 registered model Marketplace/embedding Ontology 지원은 당시 예정이었다. Trained node packaging은 Include with content로 모델을 포함하고 Model Studio는 producer/content 방식을 구분한다. Failed run schedule trigger는 복구를 연결하되 반복 trigger loop를 검토한다.

Pipeline timestamp preview의 timezone은 같은 session의 dataset/SQL/output preview에 공유된다. Display timezone 변경은 timestamp 원본 값을 고치는 작업이 아니다.

## 출처

- [Palantir Foundry, Release notes 2026](https://www.palantir.com/docs/foundry/announcements/release-notes/2026/)

## 관련 문서

- [[Palantir-2026-H2-Platform-Evolution]]
