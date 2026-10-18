---
tags: [palantir, pipeline-builder, numeric, "null", reproducibility]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 수치 연산 계약"]
---

# Pipeline Builder 수치 연산 계약

수치 함수는 계산식뿐 아니라 입력 타입, 출력 타입, null과 경계값, 지원 실행 모드까지 계약에 포함한다. 2026-10-16 공개 레퍼런스 대조 기준이며 실제 엔진에서 예제를 실행하지 않았다.

## 행 단위 연산과 집계를 구별한다

`addV2`와 `multiplyV2`는 한 행의 여러 표현식을 더하거나 곱한다. `subtractManyV1`은 기준 값에서 목록의 값을 차례로 뺀다. 반면 `sumV1`, `productV1`, `meanV1`, `minV1`과 `maxV1`은 그룹의 여러 행을 집계한다. `productV1`의 짧은 설명은 여러 column을 언급하지만 인자와 예제는 한 column의 행 집계를 보여준다.

곱셈 표현식은 입력 하나가 null이면 null인 반면, product 집계 예제는 null을 제외한다. 같은 곱셈이라는 이유로 동일한 결측 정책을 적용하지 않는다. `greatestV1`도 여러 입력 중 null을 건너뛰며 모두 null일 때만 null을 반환한다.

## 타입과 계산 결과

| 함수군 | 계약에서 확인할 차이 |
|---|---|
| abs/negate | 수치 타입을 유지하거나 Numeric 반환. 정수 최솟값의 반전은 경계 조건 |
| add/multiply/subtract | Numeric 입력과 출력, 행 단위 조합 |
| divide | Decimal 또는 Double 출력. 정수끼리 나눠도 정수 결과로 제한하지 않음 |
| ceil/floor | Decimal 또는 Long 출력 |
| round | Decimal/Double/Float, 기본 scale 0, 음수 scale도 허용 |
| power/sqrt/exp/log | Double 출력, 로그의 밑은 별도 literal 인자 |
| sin/cos/tan/sec와 역삼각 함수 | degree/radian 단위 선택과 Double 결과 |
| 거리/무게 변환 | 원래 단위와 목표 단위를 명시하고 Double 반환 |
| hex/octal | 수치를 표현하는 String 결과 |
| unhex | 16진 문자열을 Binary로 변환. UTF-8 문자열 변환 함수와 별도 |

타입 이름이 Numeric이라고 모든 크기에서 오버플로가 없다는 뜻은 아니다. Abs 예제의 ANSI mode on 조건에서는 정수 최솟값에 null을 돌려준다. 이 예제를 모든 엔진과 모든 타입의 일반적인 ANSI 동작으로 확대하지 않는다.

`roundV1`은 음수 scale로 십의 자리 이상을 반올림할 수 있다. 레퍼런스가 제시하지 않은 정확한 중간값 반올림 규칙은 함수 이름만으로 확정하지 않는다. 90도의 tan/sec 예제도 무한대 대신 큰 유한값을 보여주므로 특이점 근처의 부동소수점 결과를 업무상 유효한 값으로 바로 사용하지 않는다.

## 나머지와 null의 경계

`moduloV1`의 분모 0 예제는 null이다. `positiveModuloV1`도 분모 0에 null을 반환하지만 이름과 달리 모든 부호 조합에서 양수를 보장하지 않는다. 예제에서 -10을 -3으로 나눈 결과는 -1이고, -10을 3으로 나누면 2다. 양의 인덱스가 필요하면 제수의 조건까지 고정해야 한다.

`powerOfV1`은 인자 하나라도 null이면 null이다. 입력 null, 연산 불가능과 유효한 결과가 같은 null로 표현될 수 있으므로 원인 구분이 필요한 파이프라인은 입력 상태와 계산 결과를 함께 보존한다. 이 보존 방식은 설계 제안이다.

## 난수 seed는 행별 재현성을 보장하지 않는다

Natural random은 하한을 포함하고 상한을 제외한다. Normal random은 평균 0과 분산 1, uniform random은 0과 1 사이의 분포를 설명한다.

세 함수 모두 seed를 고정해도 분산 실행에서 행이 난수열을 소비하는 순서가 보장되지 않아 빌드마다 같은 행에 같은 값이 배정되지 않을 수 있다. 같은 seed를 썼다는 이유로 학습/검증 분할이나 실험군 배정이 재현된다고 판단하지 않는다. 안정적인 행 식별자와 결정적인 배정 방식을 별도로 선택해야 한다.

## 실행 모드와 분류 이름을 확인한다

대부분의 기본 수치 함수는 Batch/Faster/Streaming을 표시하지만 `positiveModuloV1`, `UnhexV1`, median과 standardDeviation은 Batch/Faster, product는 Batch만 표시한다. 같은 범주의 함수가 같은 엔진에서 모두 지원된다고 가정하지 않는다.

`substringV1`은 Numeric 분류에 있지만 실제 입력과 출력은 문자열이다. 시작 인덱스는 1부터이며 음수는 끝에서 센다. 길이를 생략한 경우와 길이 표현식이 null을 반환하는 경우를 구별한다. 공개 예제는 전자는 나머지 문자열, 후자는 null로 설명한다. 분류명보다 타입과 인자 계약을 우선한다.

## 출처

- [Palantir, Absolute value](https://www.palantir.com/docs/foundry/pb-functions-expression/absV1)
- [Palantir, Add numbers](https://www.palantir.com/docs/foundry/pb-functions-expression/addV2)
- [Palantir, Multiply numbers](https://www.palantir.com/docs/foundry/pb-functions-expression/multiplyV2)
- [Palantir, Subtract multiple expressions](https://www.palantir.com/docs/foundry/pb-functions-expression/subtractManyV1)
- [Palantir, Divide numbers](https://www.palantir.com/docs/foundry/pb-functions-expression/divideV1)
- [Palantir, Greatest](https://www.palantir.com/docs/foundry/pb-functions-expression/greatestV1)
- [Palantir, Product](https://www.palantir.com/docs/foundry/pb-functions-expression/productV1)
- [Palantir, Round number](https://www.palantir.com/docs/foundry/pb-functions-expression/roundV1)
- [Palantir, Positive modulo](https://www.palantir.com/docs/foundry/pb-functions-expression/positiveModuloV1)
- [Palantir, Modulo](https://www.palantir.com/docs/foundry/pb-functions-expression/moduloV1)
- [Palantir, Power of](https://www.palantir.com/docs/foundry/pb-functions-expression/powerOfV1)
- [Palantir, Tangent](https://www.palantir.com/docs/foundry/pb-functions-expression/tangentV1)
- [Palantir, Natural random number](https://www.palantir.com/docs/foundry/pb-functions-expression/naturalRandomV1)
- [Palantir, Normal random number](https://www.palantir.com/docs/foundry/pb-functions-expression/normalRandomV1)
- [Palantir, Uniform random number](https://www.palantir.com/docs/foundry/pb-functions-expression/uniformRandomV1)
- [Palantir, Convert from hexadecimal](https://www.palantir.com/docs/foundry/pb-functions-expression/UnhexV1)
- [Palantir, Substring](https://www.palantir.com/docs/foundry/pb-functions-expression/substringV1)

## 관련 문서

- [[Palantir-Aggregation-and-Window-Contracts|집계와 window의 결과 의미]]
- [[Palantir-Data-Pipeline-Operations|파이프라인 실행과 변경 관리]]
