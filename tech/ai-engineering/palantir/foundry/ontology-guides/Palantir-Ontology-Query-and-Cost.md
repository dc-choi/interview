---
tags: [palantir, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology query의 규모, 검색 문법과 비용

OSS는 indexed storage pushdown, in-memory 실행과 Spark fallback을 조합한다. 한 query에서도 단계별로 다른 전략을 사용할 수 있다. 반환 row 수만으로 실행 비용을 추정하면 중간 계산을 놓친다.

## 규모와 pagination

OSv2의 기본 in-memory 전환 기준은 100,000객체다. Search Around와 derived property는 이를 넘거나 내부 data loading이 25page를 넘으면 Spark로 전환할 수 있다. Search Around의 개별 leaf 결과는 1,000만, 실행 중 모든 dataset에서 읽는 전체 객체는 3,000만 제한이다. 이는 출발 객체 수가 아니라 연결된 distinct 결과의 제한이며 left-semi join으로 설명된다.

`.all()`/`.allAsync()`의 100,000개 제한은 결과를 memory로 적재하는 API의 제한이다. Pagination API의 처리 범위와 혼동하지 않는다. 함수 로직이 복잡하면 10,000개 이하에서도 실행 시간을 확인해야 한다. 추정 크기가 제한의 두 배를 크게 넘으면 정확한 count 이전에 query가 실패할 수 있다.

Page가 요청한 크기보다 짧아도 끝이 아니다. 반환 page token이 없어질 때까지 이어간다. Deprecated `loadObjects`는 부분 반환을 못 하므로 memory 제한을 넘으면 `ObjectSet:ResultSizeLimitExceeded`가 발생한다. Paging과 `StaticObjectSetV2` 경로로 이동한다.

OSv1은 Spark fallback이 없고 100,000개 제한을 갖는 과거 backend다. 문서는 2026-06-30 종료 예정이라고 표기하며 실제 enrollment 제거 여부는 이 자료로 확인하지 않았다.

## Pushdown과 문서의 일반화 한계

초기에 필터를 적용하고 date의 월/년 계산 대신 범위 조건을 검토한다. 월 전체라면 시작 이상, 다음 달 시작 미만이 일반적인 경계다. 원문의 예시 `>`를 그대로 쓰면 시작 시각이 빠질 수 있다.

OSS 안내는 derived property filter/sort를 색인 활용 불가로 묶지만 derived property reference는 Collect list/set 검색의 pushdown 가능성을 명시한다. 실제 query와 aggregation 종류를 확인하고 모든 파생값이 항상 full evaluation된다고 일반화하지 않는다.

## Ontology regex는 전체 값에 매칭한다

String property의 Enable regex queries 색인이 필요하다. `cat`은 정확히 cat만 매칭하고 부분 문자열은 `.*cat.*`로 표현한다. `^`/`$` anchor는 지원하지 않는다. 이 문법은 cleanup 도구의 JavaScript regex와 다른 경로다.

`.`, `?`, `+`, `*`, `{n,m}`, `|`, group, character class와 범위를 지원한다. `[^0-9]`의 부정 class는 지원하므로 anchor 금지와 혼동하지 않는다. 인용된 문자열은 literal이고 backslash escape 및 `\d/\D`, `\s/\S`, `\w/\W`를 지원한다. 문서의 word class는 영문자, 숫자와 underscore이며 Unicode 단어 전체로 확대하지 않는다.

## Query 비용: 2026 모델과 legacy 분리

2026-01-01 적용 모델의 query당 최소 compute-seconds는 base 2, Search Around 5, aggregation 5, Ontology SQL 5, advanced 10, derived property 10, Action 18이다. Action은 첫 객체 이후 편집 객체당 1을 추가한다. 실제 query complexity와 규모에 따라 더 증가할 수 있다. OSv1 legacy 최소값은 16이다.

과거 OSv2 최소 4와 Functions on Objects 4라는 표는 legacy 절에 있다. 이를 현재 모든 함수 가격으로 단정하지 않는다. Compute-second는 초 단위 latency나 화폐 가격과 다르며 enterprise 계약은 별도 확인한다.

사용량은 보통 query를 시작한 Workshop, Quiver, Slate, Automate, AIP Logic, SQL worksheet와 등록 OSDK 앱 같은 resource에 귀속한다. 연결된 saved resource가 없는 Object Explorer/API 경로는 조회한 object type에 귀속하며 여러 type이면 나눈다. 등록 앱과 일반 OSDK API 호출을 구분한다.

## Indexing 비용과 volume

Indexing은 driver/executor의 resource와 실행 시간에 따른 Spark compute다. 원문의 예시는 각 역할에 `max(vCPU, GiB/7.5) × duration × count`를 적용한다. Row 수, property 개수/크기와 upstream 갱신 주기를 줄이면 반복 indexing 작업을 줄일 수 있다. Changelog 전략은 update 계약을 지킬 때 변경분 처리에 유리하다. Ontology edits를 dataset에 내보내는 작업도 별도 compute다.

Volume은 객체 속성과 join table link index의 크기다. 빠른 조회용 추가 저장 때문에 dataset 크기보다 커질 수 있다. 시간별 측정의 월 평균은 GB-Month이며 순간 GB와 구분한다. 1:1 row 설명은 기본 dataset 매핑의 설명이다. Action 생성/삭제나 복합 원천을 고려하지 않은 보편적인 객체 수 계산식으로 쓰지 않는다.

## 출처

- [Palantir, compute-usage](https://www.palantir.com/docs/foundry/ontologies/compute-usage)
- [Palantir, oss-limitations](https://www.palantir.com/docs/foundry/ontologies/oss-limitations)
- [Palantir, query-compute-usage](https://www.palantir.com/docs/foundry/ontologies/query-compute-usage)
- [Palantir, volume-usage](https://www.palantir.com/docs/foundry/ontologies/volume-usage)
- [Palantir, search-syntax](https://www.palantir.com/docs/foundry/ontology/search-syntax)

## 관련 문서

- [[Palantir-Ontology-Guides|Ontology 설계와 개발]]

공식 본문을 대조한 지식이며 실제 Foundry 환경에서 실행 검증하지 않았다.
