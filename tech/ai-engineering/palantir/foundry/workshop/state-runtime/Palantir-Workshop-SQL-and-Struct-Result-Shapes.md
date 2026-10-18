---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop SQL 변수와 struct 결과 형태"]
---

# Workshop SQL 변수와 struct 결과 형태

SQL query variable은 module 안의 Ontology SQL SELECT 하나를 실행한다. Module-specific logic에 적합하며 공유 logic은 SQL function, 더 넓은 code capability는 TypeScript/Python function과 구분한다. Query input은 object/interface set table과 parameter로 명시한다.

## Binding과 row shape

Table/parameter alias는 @alias로 참조하고 table에는 사용하는 property column을 최소 하나 선택해야 한다. Alias는 letter/underscore로 시작하는 alphanumeric/underscore다. date 같은 column은 backtick escape한다. Join은 foreign key↔primary key 관계만 지원하며 ON column도 binding에 선택해야 한다. Many-to-many join-table 관계는 미지원이다.

| 변수 | 요구 결과 |
| --- | --- |
| scalar(String/Numeric/Boolean/Date/Timestamp) | 정확히1row1column |
| primitive array |1column,10,000미만 rows |
| struct | 정확히1row, 각 column이field |
| struct array |10,000미만rows, 각 row가struct |

10,000row 이상은 truncate가 아니라 LIMIT 요청 오류다. Query preview는 최대50row의 raw 결과를 보여 주므로 preview에 보인다고 variable shape가 valid한 것은 아니다. Object set/geopoint/geoshape는 SQL-backed variable 미지원이다.

Array cell의 element는 flatten되며 row/element null은 skip된다. Empty result는 empty array다. Struct의 no-row는 unset, null cell은 field 존재+값 없음이다. ORDER BY 없이는 원하는 순서를 보장하지 않는다. RANK=1 예시는 tie가 여러 개면 scalar 요구에 어긋날 수 있다.

## Struct schema

SQL column은 unique plain identifier여야 하며 computed column은 alias를 준다. Struct/map/binary 및 array-of-struct field는 미지원이고 primitive array는 가능하다. Object struct property는 @table.property.*로 펼친다. Nested struct는 지원하지 않는다.

Save and run은 성공한 query와 derived field를 함께 저장한다. 실패하면 draft는 남고 이전 저장 query/fields가 유지된다. 성공 때 field 추가/삭제/type 변경은 widget binding을 깨뜨릴 수 있어 검토한다. Published runtime도 saved field를 검증한다.

일반 struct는 static/object property/function CustomType에서도 만들 수 있고 미지원 field type은 omit될 수 있다. Concepts Variables의 function-only 설명보다 상세 struct 문서는 지원 초기화 경로가 넓다. Widget에 전체 struct를 넘기기보다 field extract를 하고 함수 input schema와 대조한다. 실제 SQL은 실행하지 않았다.

## 출처

- [Palantir Workshop, sql-query-variables](https://www.palantir.com/docs/foundry/workshop/sql-query-variables)
- [Palantir Workshop, struct-variables](https://www.palantir.com/docs/foundry/workshop/struct-variables)

## 관련 문서

- [[Palantir-Workshop]]
