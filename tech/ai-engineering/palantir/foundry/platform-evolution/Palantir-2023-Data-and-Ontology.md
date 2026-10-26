---
tags: [palantir, foundry, releases]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-26
---

# 2023 데이터 파이프라인과 Ontology의 변화

2023년 공식 변경 기록을 기준으로 기능이 도입되거나 수정된 시점을 정리한다. 아래의 당시 제약과 버전은 현재 지원표가 아니다. 2026-10-26에는 객체 저장과 Ontology migration 관련 추가 내용을 수집된 2023 변경 기록 및 현재 공식 문서와 부분 대조했다. 적용 전 현재 제품 문서와 enrollment 구성을 대조한다.

## 파이프라인 실행 단위

Pipeline Builder는 1월 changelog 출력, 2월 logical type과 time series 출력, 3월 다중 column 적용/집계와 geospatial preview, 4월 incremental 처리와 input sampling을 추가했다. Preview sampling은 미리보기만 줄이며 실제 build는 전체 input을 계산한다. Incremental 도입을 모든 변환의 증분 호환성 보장으로 읽으면 안 된다.

5월 job grouping은 batch에서 output별로 독립적인 기본 job을 묶고, streaming에서 하나의 Flink job에 묶인 output을 나누는 기능이었다. 같은 job의 실패 범위와 compute profile을 함께 설계한다. Batch checkpoint는 여러 output이 공유하는 중간 결과를 다음 build에서 한 번 계산하도록 저장한다. 보안 justification checkpoint와는 다른 개념이다.

6월 streaming left lookup join 변경은 첫 일치 행 하나에서 모든 matching row 출력으로 바뀌었다. 기존 pipeline과 비교할 때 처리량뿐 아니라 row cardinality를 검증한다. 7월 Ontology type/link 직접 출력, 9월 versioned Java UDF, 10월 output schedule 편집이 추가됐다. 당시 고급 schedule 설정은 Data Lineage에서만 수정할 수 있었다.

## 객체 저장, schema와 조회

7월 OSv1에서 OSv2로 기존 user edit가 있는 object/many-to-many link의 migration을 지원했고, 10월에는 새 type의 기본 저장소가 OSv2가 됐다. 6월에는 migration 화면에 soak period 종료 예정 시점을 표시하며 그 뒤에는 되돌리기가 훨씬 어려워진다고 경고했다. 5월 datasource rollback/실패 changelog 수정 이력도 함께 읽는다. 2023년 release notes의 저장소 전환 기록은 새 type의 기본값 변경까지다. 2026-10-26 대조한 현행 migration 문서는 모든 object type의 OSv2 이전이 필수라고 밝히고, soak 종료 뒤에는 OSv1로 rollback할 수 없다고 적는다. 현행 절차와 보존 범위는 [[Palantir-Object-Storage-Migration|OSv1에서 OSv2로의 migration]]에서 확인한다.

OSv1(Phonograph) 쪽은 오류, 색인과 등록 상태의 안내를 보완했다. 8월에는 Phonograph `IllegalObjectTypeDataInputChange` 오류에 사용자가 직접 해결하도록 안내하는 전용 메시지를 붙였다. 9월에는 Phonograph 영역에서 object type과 many-to-many link type의 쓰이지 않는 table이 자동 deindex되기까지 남은 시간을 countdown으로 보여 주었고, usage metadata가 없으면 등록된 type도 미등록으로 표시하던 문제를 고쳐 metadata 부재와 미등록을 구분했다. 현행 usage 지표가 비어 있을 때도 미사용으로 단정하지 않는다([[Palantir-Ontology-Manager-Operations#Usage가 없다는 표시의 한계|Usage 표시의 한계]]). 2026-10-26 대조한 현행 OSv1, Cleanup과 Edit object types 문서에서 자동 deindex의 조건, countdown과 이 오류명은 확인하지 못했다. Cleanup은 Phonograph deindexed flag를 OSv1 object type에만 적용하고 OSv2에는 같은 검사가 없다고 적는다. 현재 OSv1 문서는 2026-06-30 이후 사용할 수 없다고 안내한다. 남아 있는 legacy 설명을 현재 사용 가능하다는 증거로 보지 않는다. 과거 등록과 reindex 동작은 [[Palantir-Object-Storage-Legacy|Legacy Phonograph 등록과 재색인]]에서 확인한다.

9월 edit-only property는 원천 column 없이 Action으로만 값을 받는 방식으로 소개됐다. 11월에는 user edit가 있는 OSv2 type의 primary key 변경을 차단했다. Required mapping, 변경 validation, history 복구가 모두 user edit와 조건부 서식까지 복원한다는 뜻은 아니다. 1월 기록은 삭제 property 복구에 conditional-format rule이 돌아오지 않는다고 명시한다.

11월에는 OSv2의 breaking schema change에 쓰는 schema migration UI를 다시 설계해 제안된 migration 묶음을 적용할 수 있게 했고, Ontology 버전을 다룰 때 성공한 schema migration이 삭제되지 않도록 했다. 2026-10-26 대조한 현행 Manage schema changes 문서는 변경 유형별로 미리 정의된 migration 중에서 고르게 한다고 설명하며, 제안 묶음을 적용하는 방식과 migration 보존 기간은 적지 않는다. 현행 instruction과 한도는 [[Palantir-Object-Edit-Migrations|객체 편집 Schema migration]]에서 확인한다.

3월 namespace와 Ontology 1:1 자동 생성, object type group, 충돌 없는 변경의 merge 생략 저장이 추가됐다. 7월 RV-backed type 생성은 원천 dataset 접근이 없어도 metadata를 만들되 column description은 복사하지 않도록 고쳤다. 사용자가 볼 수 있는 schema와 원천 설명의 전파를 구분한다.

Ontology migration도 바뀌었다. 1월에는 resource를 다른 Ontology로 옮기는 중 Ontology 변경이 저장되면 migration dialog가 닫혀 진행 중 작업을 잃던 문제를 고쳤다. 5월에는 Ontology entity를 다른 Ontology로 옮길 때 선택한 Organization에 속한 entity를 모두 옮기는 Migrate organization 모드를 추가했고, 9월에는 private Ontology migration 뒤 OSv1 object/link type을 자동 갱신하게 했다. 2026-10-26 대조한 현행 Migrating between ontologies 문서에서는 Organization 단위 모드와 OSv1 처리를 확인하지 못했으므로 현재 사용 가능 여부를 단정하지 않는다. 현재 이동 조건은 [[Palantir-Ontology-Resource-Permissions#Ontology 사이의 이동|Ontology 사이의 이동]]에서 확인한다.

11월 semantic search GA는 고정 dimension의 float-array vector property와 similarity function, KNN Functions 조합이었다. 9월 relevance ordering은 token match 결과 정렬 기능이다. 두 기능을 같은 검색 모델로 혼동하지 않는다. 당시 AIP/OSDK 기능 범위와 현재 언어별 지원은 별도 확인한다.

## 연결과 개발 환경

S3-compatible dataset API는 3월 beta에서 9월 GA로 바뀌며 temporary/static credentials를 지원했다. Cloud identity의 S3 인증과 관리도 9월 도입 기록에 있다. Data Connection exports는 7월 S3/Kafka부터 시작하고 10월 SharePoint로 확대됐다. Replay 시 외부 export 동작은 별도 설정이며 중복 전달 가능성을 확인한다.

Code Repositories는 Python external transform, model adapter와 training 통합 template, branch별 preview input strategy 저장을 확장했다. Training template의 build dependency 자동 포함은 inference 환경 재현을 돕는 기능이다. 7월 이후 새 repository의 merged source branch 자동 삭제 기본값은 기존 repository에 소급되지 않았다.

3월 JDBC Java 11+, 5월 ODBC 64-bit-only, 12월 Spark 3.4와 모듈 버전 기준은 당시 migration 조건이다. 이를 2026년의 최소/최대 지원 버전으로 재사용하지 않는다. 11월 input dataset job-spec restriction 강화는 잘못 참조한 transform을 실패시키는 보안 변경이다. 실패 메시지를 제거할 문제가 아니라 project reference와 권한을 바로잡을 문제로 본다.

## 출처

- [Palantir, 2023 release notes](https://www.palantir.com/docs/foundry/release-notes/2023)
- [Palantir, 2023 announcements release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2023)
- [Palantir, Migrate from OSv1 to OSv2](https://www.palantir.com/docs/foundry/object-backend/osv1-osv2-migration)
- [Palantir, Object Storage v1 (Phonograph)](https://www.palantir.com/docs/foundry/object-databases/object-storage-v1)
- [Palantir, Ontology cleanup](https://www.palantir.com/docs/foundry/ontology-manager/cleanup)
- [Palantir, Edit object types](https://www.palantir.com/docs/foundry/object-link-types/edit-object-type)
- [Palantir, Manage schema changes](https://www.palantir.com/docs/foundry/object-edits/schema-migrations)
- [Palantir, Migrating between ontologies](https://www.palantir.com/docs/foundry/ontologies/ontology-migration)

## 관련 문서

- [[Palantir-Platform-Evolution-2023]]
- [[Palantir-Foundry]]
- [[Palantir-Object-Storage-Migration]]
- [[Palantir-Object-Storage-Legacy]]
- [[Palantir-Ontology-Manager-Operations]]
- [[Palantir-Object-Edit-Migrations]]
- [[Palantir-Ontology-Resource-Permissions]]
