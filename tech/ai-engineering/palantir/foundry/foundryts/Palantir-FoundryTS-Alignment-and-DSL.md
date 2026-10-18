---
tags: [palantir, foundry, foundryts]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 보간, DSL와 UDF의 서로 다른 실행 위치

interpolate는 여러 series의 timestamp를 정렬하고 input별 column을 만든다. frequency를 주면 원본 timestamp union이 아니라 지정 grid로 완전히 resample한다. 보간값을 실제 측정값으로 취급하지 않는다.

## 보간의 기본값

interpolate의 before/internal/after 기본은 모두 NONE이다. internal은 LINEAR/NEAREST/PREVIOUS/NEXT/NONE,범위밖은 NEAREST/NONE을 지원한다. NONE은 결측을 null로 두고 enum에 LINEAR를 쓰면 실패한다. series별 strategy list는 input 순서와 맞춰야 한다.

rename_columns_by는 metadata key/callable로 column을 정하며 static_column_name은 이를 덮어쓴다. 결과가 multi-series DataFrame이면 single-value series만 받는 후속함수에 그대로 넘길 수 없다.

## DSL

dsl(program)은 각 timestamp에 unary/binary/n-ary formula를 적용하고 label 기본a,b,...,aa,ab로 input을 참조한다. conditional/skip/isnan/isfinite/변수 assignment를 조합할 수 있다. deprecated return_type은 새 코드의 필수조건으로 보지 않는다.

DSL의 default interpolation은 before/after NEAREST,internal은 numeric LINEAR/enum PREVIOUS다. interpolate의 NONE 기본과 다르다. 양쪽 series가 동시에 관측되지 않아도 계산값이 생길 수 있으므로 explicit strategy와 domain 의미를 확인한다. inf/NaN은 별도처리하지 않으면 전파될 수 있다.

## UDF

udf(func,columns,types)는 최종 query DataFrame에 custom Python 함수를 적용한다. backend DSL과 같은 execution location/분산 최적화 계약을 가정하지 않는다. DataFrame을 반환하면 output column/type을 명시하거나 원본 schema를 유지한다. 임의 Any 결과도 가능하므로 후속 pipeline이 기대하는 형태를 확인한다.

## 출처

- [Palantir, functions-interpolate](https://www.palantir.com/docs/foundry/foundryts/functions-interpolate)
- [Palantir, functions-dsl](https://www.palantir.com/docs/foundry/foundryts/functions-dsl)
- [Palantir, functions-udf](https://www.palantir.com/docs/foundry/foundryts/functions-udf)

## 관련 문서

- [[Palantir-FoundryTS-Aggregation-Windows]]
- [[Palantir-FoundryTS-Collections-and-Intervals]]
