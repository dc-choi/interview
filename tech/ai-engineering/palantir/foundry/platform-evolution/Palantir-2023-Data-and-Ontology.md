---
tags: [palantir, foundry, releases]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 2023 데이터 파이프라인과 Ontology의 변화

2023년 공식 변경 기록을 기준으로 기능이 도입되거나 수정된 시점을 정리한다. 아래의 당시 제약과 버전은 현재 지원표가 아니다. 적용 전 현재 제품 문서와 enrollment 구성을 대조한다.

## 파이프라인 실행 단위

Pipeline Builder는 1월 changelog 출력, 2월 logical type과 time series 출력, 3월 다중 column 적용/집계와 geospatial preview, 4월 incremental 처리와 input sampling을 추가했다. Preview sampling은 미리보기만 줄이며 실제 build는 전체 input을 계산한다. Incremental 도입을 모든 변환의 증분 호환성 보장으로 읽으면 안 된다.

5월 job grouping은 batch에서 output별로 독립적인 기본 job을 묶고, streaming에서 하나의 Flink job에 묶인 output을 나누는 기능이었다. 같은 job의 실패 범위와 compute profile을 함께 설계한다. Batch checkpoint는 여러 output이 공유하는 중간 결과를 다음 build에서 한 번 계산하도록 저장한다. 보안 justification checkpoint와는 다른 개념이다.

6월 streaming left lookup join 변경은 첫 일치 행 하나에서 모든 matching row 출력으로 바뀌었다. 기존 pipeline과 비교할 때 처리량뿐 아니라 row cardinality를 검증한다. 7월 Ontology type/link 직접 출력, 9월 versioned Java UDF, 10월 output schedule 편집이 추가됐다. 당시 고급 schedule 설정은 Data Lineage에서만 수정할 수 있었다.

## 객체 저장, schema와 조회

7월 OSv1에서 OSv2로 기존 user edit가 있는 object/many-to-many link의 migration을 지원했고, 10월에는 새 type의 기본 저장소가 OSv2가 됐다. Migration soak period 이후 rollback이 더 어렵다는 6월 경고와 datasource rollback/실패 changelog 수정 이력을 함께 읽는다.

9월 edit-only property는 원천 column 없이 Action으로만 값을 받는 방식으로 소개됐다. 11월에는 user edit가 있는 OSv2 type의 primary key 변경을 차단했다. Required mapping, 변경 validation, history 복구가 모두 user edit와 조건부 서식까지 복원한다는 뜻은 아니다. 1월 기록은 삭제 property 복구에 conditional-format rule이 돌아오지 않는다고 명시한다.

3월 namespace와 Ontology 1:1 자동 생성, object type group, 충돌 없는 변경의 merge 생략 저장이 추가됐다. 7월 RV-backed type 생성은 원천 dataset 접근이 없어도 metadata를 만들되 column description은 복사하지 않도록 고쳤다. 사용자가 볼 수 있는 schema와 원천 설명의 전파를 구분한다.

11월 semantic search GA는 고정 dimension의 float-array vector property와 similarity function, KNN Functions 조합이었다. 9월 relevance ordering은 token match 결과 정렬 기능이다. 두 기능을 같은 검색 모델로 혼동하지 않는다. 당시 AIP/OSDK 기능 범위와 현재 언어별 지원은 별도 확인한다.

## 연결과 개발 환경

S3-compatible dataset API는 3월 beta에서 9월 GA로 바뀌며 temporary/static credentials를 지원했다. Cloud identity의 S3 인증과 관리도 9월 도입 기록에 있다. Data Connection exports는 7월 S3/Kafka부터 시작하고 10월 SharePoint로 확대됐다. Replay 시 외부 export 동작은 별도 설정이며 중복 전달 가능성을 확인한다.

Code Repositories는 Python external transform, model adapter와 training 통합 template, branch별 preview input strategy 저장을 확장했다. Training template의 build dependency 자동 포함은 inference 환경 재현을 돕는 기능이다. 7월 이후 새 repository의 merged source branch 자동 삭제 기본값은 기존 repository에 소급되지 않았다.

3월 JDBC Java 11+, 5월 ODBC 64-bit-only, 12월 Spark 3.4와 모듈 버전 기준은 당시 migration 조건이다. 이를 2026년의 최소/최대 지원 버전으로 재사용하지 않는다. 11월 input dataset job-spec restriction 강화는 잘못 참조한 transform을 실패시키는 보안 변경이다. 실패 메시지를 제거할 문제가 아니라 project reference와 권한을 바로잡을 문제로 본다.

## 출처

- [Palantir, 2023 release notes](https://www.palantir.com/docs/foundry/release-notes/2023)
- [Palantir, 2023 announcements release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2023)

## 관련 문서

- [[Palantir-Platform-Evolution-2023]]
- [[Palantir-Foundry]]
