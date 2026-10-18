---
tags: [palantir, foundry, insight]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Insight의 표, 집계와 SQL 결과

Charts는 property별 분포/통계로 분석 데이터를 요약하며 선택은 path filter로 반영된다. String은 histogram/count, numeric은 distribution/aggregate, date/time은 distribution을 지원한다. Geo는 Map, media는 Table에서 보고 struct/array-of-struct는 chart 미지원이다. Map의 circle/polygon 선택은 path에 기록되며 geo filter는 Map에서 설정한다.

## 집합과 집계

Union은 여러 타입의 객체를 합칠 수 있다. 원문의 full outer join 비유는 여러 타입 속성을 함께 보여준다는 설명이며 임의 row-key join이나 객체 복제를 의미하지 않는다. Intersect/subtract는 단일 object type으로 제한된다. Group by table이나 property chart 선택은 원천을 수정하지 않고 필터를 적용한다.

Vega chart는 SQL sandbox output만 사용할 수 있다. SQL은 path가 단일 타입일 때만 가능하지만 별도 object type과 Ontology link 없이 join할 수 있다. Path는 SQL step 직전까지의 필터 결과다.

SQL sandbox는 materialization에서 계산한 비온톨로지 결과를 별도 preview/CSV로 낸다. 결과가 뒤 path의 입력으로 바뀌지 않는다. 예를 들어 SQL COUNT가1을 보여도 뒤 Filter는 SQL 전의10객체를 대상으로 할 수 있다. Materialization 최신성과 user edit 반영도 별도로 확인한다.

## 표와 변경 작업

Derived property는 query time에 계산한다. 표의 빠른 property 검색은 이미 표시한 column만 검색하고, 숨긴 property는 configuration에서 찾는다. 여러 타입은 table header로 켜고 끈다.

Create/edit/Actions는 configured Ontology 동작을 실행한다. 문서는 object type edit, datasource write, 해당 project 권한을 요구하며 실제 Action submission criteria와 backend edit 정책도 확인한다. Bulk edit는 변경한 property만 수정한다.

Header checkbox는 화면에 보이는 행 선택처럼 설명된 부분도 있으나, pagination이 있으면 적용된 filter에 일치하는 전체 객체를 선택한다고 명시한다. 대량 Action 전에 selection count와 scope를 확인해야 한다.

## 출처

- [Palantir, charts-insight](https://www.palantir.com/docs/foundry/insight/charts-insight)
- [Palantir, map-insight](https://www.palantir.com/docs/foundry/insight/map-insight)
- [Palantir, table-insight](https://www.palantir.com/docs/foundry/insight/table-insight)
- [Palantir, transform-card](https://www.palantir.com/docs/foundry/insight/transform-card)

## 관련 문서

- [[Palantir-Insight]]
- [[Palantir-SQL-Warehousing]]
