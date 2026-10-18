---
tags: [palantir, foundry, python, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Python data expectations의 범위와 null 계약"]
---

# Python data expectations의 범위와 null 계약

transforms-expectations의 Expectation은 조건, Check는 이름과 실패 정책을 붙여 Data Health에 등록하는 단위다. Check 이름은 같은 transform의 모든 input/output에서 유일해야 한다. 기본 FAIL은 build를 막고 WARN은 계속 실행해 결과를 기록한다. Single-node virtual-table output의 FAIL check는 미지원이라고 안내한다.

## 평가 단위와 신호

E.all/E.any/negate로 조건을 조합하되 column의 any는 여러 row 중 하나가 아니라 같은 row의 여러 조건을 결합한다. 여러 규칙을 하나의 Check에 묶으면 하나의 monitoring 신호가 되므로 각각의 경보가 필요하면 별도 Check로 나눈다. Check는 선언된 input 또는 output별로 적용한다.

Type/schema check는 single-node에서 Polars type, Spark에서 Spark SQL type을 사용한다. Schema contains는 필수 subset, equals는 정확한 일치, is_subset_of는 허용한 column 집합 내에 있는지를 검사한다. Primary key는 각 key non-null과 결합 uniqueness를 함께 요구하며 group uniqueness만으로 non-null이 보장되지는 않는다.

## Null과 통계

비교 gt/gte/lt/lte/equals/not_equals와 rlike 등은 null을 무시하고 통과시키는 규칙이 있어 non_null check를 따로 둔다. is_in은 None을 허용 목록에 넣지 않으면 null을 실패시킨다. Array is_in은 각 element가 허용된 값인지, array_contains는 특정 element 존재 여부인지 구분하고 size 제약도 별도다.

Null percentage는0~1 fraction으로0.1이10%다. Count/distinct/sum/stddev의 평가 단위와 sample/population 의미를 고정한다. Approximate distinct의5% RSD는 모든 실행에서 오차가5% 이내라는 결정적 상한이 아니다. Empty input과 null-only 통계의 실제 engine 결과를 별도 확인한다.

## Timestamp

Timestamp expectation은 Date가 아닌 Timestamp를 요구하며 timezone-aware 값을 권한다. Relative check는 실행 시각을 기준으로 하고 몇 분 수준의 불정확성이 있을 수 있다. offset_from_current_time은 value-now, offset_to_current_time은 now-value 방향으로 생각하며 양수 offset만 지원하므로 미래/과거 조건의 방향을 확인한다.

다른 column과의 비교는 first_column OP (second_column + offset_seconds)다. 고정 날짜와 relative now를 혼동하지 않는다. 원문에는 now() 미지원 설명과 naive datetime 예시가 함께 있고 timedelta(months=2)처럼 Python에서 유효하지 않은 예제도 있어 그대로 실행 가능하다고 보장하지 않는다.

## Conditional과 dataset 간 검증

when/then/otherwise는 row별 조건부 규칙이다. 생략 branch의 true/false 기본값 때문에 의도치 않은 통과가 생기지 않게 확인한다. Experimental foreign-value expectation은 join 비용을 가질 수 있다. E.dataset_ref에는 resource RID/path/display name이 아니라 transform input parameter name을 넣고 reference dataset도 input으로 선언한다. 외래값 null의 무시 여부와 별도 non-null 검증을 구분한다.

Cross-dataset row-count 비교도 input parameter name을 사용한다. Check 통과는 정의된 predicate에 대한 결과이며 business 의미, 전체 데이터 정확성이나 upstream source의 완전성을 증명하지 않는다. 실제 check job은 실행하지 않았다.

## 출처

- [Palantir Python transforms, data-expectations-getting-started](https://www.palantir.com/docs/foundry/transforms-python/data-expectations-getting-started)
- [Palantir Python transforms, data-expectations-reference](https://www.palantir.com/docs/foundry/transforms-python/data-expectations-reference)

## 관련 문서

- [[Palantir-Python-Transforms]]
- [[Palantir-Code-Transforms]]
- [[Palantir-Python-Spark-Incremental-Batches]]
- [[Palantir-Python-Incremental-Media-Contracts]]
