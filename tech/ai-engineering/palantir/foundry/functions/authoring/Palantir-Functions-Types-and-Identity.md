---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 함수 타입, 객체 식별자와 집계 반환 형태

## 언어 타입과 registry 타입

입출력은 지원되는 registry 타입으로 명시한다. Python의 `int`는 기본 Integer, `float`는 기본 Float이므로 Long/Double이 필요한 계약은 `functions.api` 별칭을 쓴다. TypeScript의 일반 `number` 대신 지원되는 수치 별칭을 사용한다.

| 계약 | TypeScript v1 | TypeScript v2 | Python |
|---|---|---|---|
| Long의 언어 표현 | number | string | int |
| 날짜/시각 | LocalDate/Timestamp | ISO 문자열 | date/datetime |
| 객체 키 map | FunctionsMap | Record<ObjectSpecifier, V> | 객체 키 dict |
| 범위 필드 | min/max | startValue/endValue | min/max |
| 2차원 집계 | buckets wrapper | bucket 배열 | TwoDimensionalAggregation |
| 3차원 집계 | buckets 안 value 배열 | 배열 안 groups 배열 | NestedBucket/SingleBucket |

Long 문서는 브라우저 정밀도 보호를 위해 ±(2^53-1) 경계를 설명한다. v2가 string을 쓴다는 사실만으로 모든 함수 경계에서 임의 정밀도 정수를 허용한다고 확대하지 않는다. Optional은 값 부재와 타입을 함께 선언하며 `!`는 런타임 검사가 아니다. 0, 빈 문자열과 `undefined`를 truthiness 하나로 합치지 않는다.

## 객체와 복합 타입

객체의 JavaScript 참조 동일성은 업무 객체 동일성이 아니다. v1은 typeId와 primaryKey를 함께 비교한다. v2는 `$objectSpecifier`를 쓰고 `$rid`는 `$includeRid: true`인 조회에서만 기대한다. 새 객체는 RID가 아직 없을 수 있다.

함수 signature의 custom struct와 Ontology struct property의 생성 클래스는 다르다. Python custom type에는 필드 타입과 일치하는 named initializer가 필요하며 dataclass를 사용할 수 있다. Ontology struct 편집에는 생성 클래스를 사용한다. v2만 interface와 interface object set을 함수 입력/출력으로 지원한다고 타입 표는 명시한다.

GeoJSON 좌표는 경도, 위도 순서다. v1 GeoShape 변환에는 파싱한 geometry, Python 구체 geometry 클래스에는 JSON 문자열을 넘긴다. v2는 Geometry 객체다. 형변환 표기만으로 입력 JSON의 유효성 검사를 대신하지 않는다.

한국어 `input-output-types`는 이전 문서로, TypeScript 중심 설명과 외부 연동 미지원 서술을 현재 전체 Functions 제약으로 적용하지 않는다. 최신 타입 reference와 상세 기능을 우선 대조한다.

## 출처

- [Palantir, types-reference](https://www.palantir.com/docs/foundry/functions/types-reference)
- [Palantir, python-function-types](https://www.palantir.com/docs/foundry/functions/python-function-types)
- [Palantir, input-output-types](https://palantir.com/docs/kr/foundry/functions/input-output-types/)
- [Palantir, object-identifiers](https://www.palantir.com/docs/foundry/functions/object-identifiers)
- [Palantir, undefined-values](https://www.palantir.com/docs/foundry/functions/undefined-values)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
