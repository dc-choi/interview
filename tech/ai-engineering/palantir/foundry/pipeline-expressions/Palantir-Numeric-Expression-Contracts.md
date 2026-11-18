---
tags: [palantir, pipeline-builder, numeric, "null", reproducibility]
status: done
verified_at: 2026-10-26
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 수치 연산 계약"]
---

# Pipeline Builder 수치 연산 계약

수치 함수는 계산식뿐 아니라 입력 타입, 출력 타입, null과 경계값, 지원 실행 모드까지 계약에 포함한다. 2026-10-26 공개 레퍼런스 대조 기준이며 실제 엔진에서 예제를 실행하지 않았다.

## 행 단위 연산과 집계를 구별한다

`addV2`와 `multiplyV2`는 한 행의 여러 표현식을 더하거나 곱한다. `subtractManyV1`은 기준 값에서 목록의 값을 차례로 뺀다. 반면 `sumV1`, `productV1`, `meanV1`, `minV1`과 `maxV1`은 그룹의 여러 행을 집계한다. `productV1`의 짧은 설명은 여러 column을 언급하지만 인자와 예제는 한 column의 행 집계를 보여준다.

곱셈 표현식은 입력 하나가 null이면 null인 반면, product 집계 예제는 null을 제외한다. 같은 곱셈이라는 이유로 동일한 결측 정책을 적용하지 않는다. `greatestV1`도 여러 입력 중 null을 건너뛰며 모두 null일 때만 null을 반환한다.

## 타입과 계산 결과

| 함수군 | 계약에서 확인할 차이 |
|---|---|
| abs/negate | 수치 타입을 유지하거나 Numeric 반환. 정수 최솟값의 반전은 경계 조건 |
| add/multiply/subtract | Numeric 입력과 출력, 행 단위 조합 |
| divide | Decimal 또는 Double 출력. 정수끼리 나눠도 정수 결과로 제한하지 않음 |
| ceil/floor | Decimal, Double, Float만 입력, Decimal 또는 Long 출력. 10.123은 11과 10, null은 null. 두 출력 타입이 갈리는 조건과 음수 예제는 레퍼런스에 없음 |
| round | Decimal/Double/Float, 기본 scale 0, 음수 scale도 허용 |
| power/sqrt/exp/log | Double 출력, 로그의 밑은 별도 literal 인자 |
| sin/cos/tan/sec와 역삼각 함수 | degree/radian 단위 선택과 Double 결과 |
| 거리/무게 변환 | 원래 단위와 목표 단위를 명시하고 Double 반환 |
| hex | Binary, Byte, Integer, Long, Short, String 입력, String 출력. 12345는 3039, -12345는 FFFFFFFFFFFFCFC7, 문자열 hello는 68656C6C6F, null은 null. -12345의 출력은 64-bit 2의 보수 표기와, hello의 출력은 h, e, l, l, o의 byte 값을 이은 16진 표기와 일치함(해석) |
| octal | Integer, Long, Short만 입력, String 출력. 12345는 30071, null은 null |
| unhex | 16진 문자열을 Binary로 변환. UTF-8 문자열 변환 함수와 별도 |

타입 이름이 Numeric이라고 모든 크기에서 오버플로가 없다는 뜻은 아니다. Abs 예제의 ANSI mode on 조건에서는 정수 최솟값에 null을 돌려준다. 이 예제를 모든 엔진과 모든 타입의 일반적인 ANSI 동작으로 확대하지 않는다.

`roundV1`은 음수 scale로 십의 자리 이상을 반올림할 수 있다. 레퍼런스가 제시하지 않은 정확한 중간값 반올림 규칙은 함수 이름만으로 확정하지 않는다. 90도의 tan/sec 예제도 무한대 대신 큰 유한값을 보여주므로 특이점 근처의 부동소수점 결과를 업무상 유효한 값으로 바로 사용하지 않는다.

## 각도 단위, 정의역과 인자 형태

`sineV1`, `cosineV1`, `tangentV1`, `secantV1`은 `Enum<Degrees, Radians>` 단위와 DefiniteNumeric 각도를 받는다. `arccosV1`, `arcsinV1`, `arctanV1`은 Double/Float 값을 받고 단위 인자는 출력 각도의 단위다. `arctan2V1`은 X, Y(Double/Float)로 (-π, π] 범위의 각도를 반환하며 degrees 예제에서 원점은 0.0, (x, y)=(-1, 0)은 180.0이다. 각 함수의 null 예제는 null을 반환한다.

arccos/arcsin의 [-1, 1] 밖 입력, 0 이하 값의 로그와 음수의 제곱근은 공개 예제가 없다. 결과가 null, NaN, 오류 중 무엇인지 가정하지 말고 입력 범위를 먼저 검증한다(설계 제안). 같은 90도에서 cos는 0.0으로 표시되지만 sec는 약 1.633E16이므로 표시된 0.0을 정확한 0으로 단정하지 않는다(해석). 삼각 함수 결과는 0과 정확히 비교하지 말고 허용 오차를 둔다(설계 제안).

`hyperbolicCosineV1`(Hyperbolic cosine)은 이름은 삼각 함수와 비슷하지만 단위 enum 없이 `Expression<Numeric>` 값 하나만 받아 Double을 반환한다. 쌍곡선 함수의 인자는 원의 각도가 아닌 실수(쌍곡각)이므로 degree/radian 선택이 없다는 점과 맞는다(해석). 예제는 1.0에서 1.543080634815244, null에서 null이며 Batch/Faster/Streaming을 표시한다(2026-11-17 수집한 공개 레퍼런스 기준). 1.0의 결과는 정의식 (e + e⁻¹)/2의 값 약 1.5431과 일치한다(해석). cosh는 입력 절댓값이 커지면 지수적으로 커지므로 큰 입력에서 Double 범위를 넘을 때의 결과는 공개 예제가 없어 확정하지 않는다.

`hyperbolicSineV1`(Hyperbolic sine)과 `hyperbolicTangentV1`(Hyperbolic tangent)도 같은 계약이다. 단위 enum 없이 `Expression<Numeric>` 값 하나를 받아 Double을 반환하고, null에서 null이며 Batch/Faster/Streaming을 표시한다(2026-11-17 수집한 공개 레퍼런스 기준). 예제는 1.0에서 sinh가 1.1752011936438014, tanh가 0.7615941559557649다. 두 값은 정의식 (e - e⁻¹)/2 약 1.1752와 sinh/cosh 약 0.7616과 일치한다(해석). sinh는 입력 절댓값이 커지면 결과의 절댓값이 지수적으로 커지고 부호는 입력을 따르며, Double 범위를 넘을 때의 결과는 cosh와 마찬가지로 공개 예제가 없어 확정하지 않는다. tanh의 수학적 범위는 (-1, 1)이고 큰 입력에서 ±1로 포화한다(해석). Double 결과는 포화 구간에서 정확히 ±1.0으로 반올림될 수 있지만 큰 입력의 공개 예제가 없어 확정하지 않는다. 포화 구간에서는 입력 차이가 출력에 거의 드러나지 않으므로, tanh 결과로 순위나 임계값을 정할 때는 입력 범위를 먼저 확인하고 1과의 엄격 비교나 결과를 다시 역함수나 log(1 - tanh)에 넣는 계산을 피한다(설계 제안).

`exponentialV1`, `logV1`, `sqrtV1`은 `Expression<Numeric>`을 받아 Double을 반환한다(e^2.0은 7.38905609893, 16.3216의 제곱근은 4.04). `logNV1`의 Base는 `Literal<Double>`, Expression은 `Expression<Numeric>`이다(밑 2.0에서 8의 로그는 3.0). 밑이 literal이라 행마다 다른 밑 column을 넘기는 용도로 보기 어렵고(해석), 행별 밑이 필요하면 `logV1` 두 결과의 비율을 검토한다(설계 제안).

거리와 무게 변환은 `Expression<DefiniteNumeric>` 양과 현재 단위, 목표 단위 enum을 받는다. 1 kilometer는 1000.0 meter, 5 kilogram은 5000.0 gram이며 null은 null이다. 공개 페이지의 단위 enum은 일부만 나열된다.

`subtractV1`은 Left - Right다(32와 4는 28, -5와 -3은 -2). `negateV1`은 Numeric 입출력으로 선언되며 decimal, double, int, long, short의 부호 반전 예제만 있고 null과 정수 최솟값 예제는 없다.

## 나머지와 null의 경계

`moduloV1`의 분모 0 예제는 null이다. `positiveModuloV1`도 분모 0에 null을 반환하지만 이름과 달리 모든 부호 조합에서 양수를 보장하지 않는다. 예제에서 -10을 -3으로 나눈 결과는 -1이고, -10을 3으로 나누면 2다. 양의 인덱스가 필요하면 제수의 조건까지 고정해야 한다.

`positiveModuloV1`의 두 인자는 Byte, Integer, Long, Short만 받고 출력은 분자 타입(T1)이다. `moduloV1`은 DefiniteNumeric을 받으며 10.123을 4로 나눈 나머지로 2.123을 반환한다. 소수 나머지가 필요하면 `moduloV1`을 쓴다(설계 제안). `moduloV1`에는 음수 피연산자 예제가 없다.

`powerOfV1`은 인자 하나라도 null이면 null이다. 입력 null, 연산 불가능과 유효한 결과가 같은 null로 표현될 수 있으므로 원인 구분이 필요한 파이프라인은 입력 상태와 계산 결과를 함께 보존한다. 이 보존 방식은 설계 제안이다.

## 난수 seed는 행별 재현성을 보장하지 않는다

Natural random은 하한을 포함하고 상한을 제외한다. Normal random은 평균 0과 분산 1, uniform random은 0과 1 사이의 분포를 설명한다.

세 함수 모두 seed를 고정해도 분산 실행에서 행이 난수열을 소비하는 순서가 보장되지 않아 빌드마다 같은 행에 같은 값이 배정되지 않을 수 있다. 같은 seed를 썼다는 이유로 학습/검증 분할이나 실험군 배정이 재현된다고 판단하지 않는다. 안정적인 행 식별자와 결정적인 배정 방식을 별도로 선택해야 한다.

## 실행 모드와 분류 이름을 확인한다

대부분의 기본 수치 함수는 Batch/Faster/Streaming을 표시하지만 `positiveModuloV1`, `UnhexV1`, median과 standardDeviation은 Batch/Faster, product는 Batch만 표시한다. 2026-10-26 index 대조 기준 삼각과 역삼각, 지수와 로그, 제곱근, 거리/무게 단위 변환, hex/octal, ceil/floor, subtract와 negate는 모두 Batch/Faster/Streaming이고, 2026-10-24 index 수집본의 Numeric expression 분류 전체로는 `convertBaseV1`(Batch/Streaming)과 `similarityScoreV1`(Batch)도 위 목록 밖의 예외다. 같은 범주의 함수가 같은 엔진에서 모두 지원된다고 가정하지 않는다.

## Bitwise and, or, not, xor는 Binary 분류의 정수 계약이다

`bitwiseAndV1`(Bitwise and)은 두 정수 값에서 공통으로 켜진 bit만 남긴다. 분류는 Numeric이 아니라 Binary이고 Batch/Faster만 표시하므로 Streaming pipeline에서 쓸 수 있다고 가정하지 않는다(2026-11-17 수집한 공개 레퍼런스 기준). Left와 Right는 각각 Byte, Integer, Long, Short만 받고 출력도 이 네 정수 타입 중 하나다. Decimal, Double, Float는 받지 않는다. 소수 값을 정수로 바꾸면 소수부가 사라질 수 있으므로 bit 의미가 있는 정수 column에만 쓴다(설계 제안). 같은 Binary 분류의 shift 함수는 [[Palantir-Type-and-Encoding-Contracts|타입과 인코딩 계약]]에 있으며 실행 모드 표시가 Batch/Streaming이라 Bitwise and와 다르다. Mask와 shift를 한 pipeline에서 함께 쓰면 두 함수의 공통 실행 모드가 Batch뿐인지 먼저 확인한다(해석).

예제에서 12와 10은 8(1100과 1010의 공통 bit 1000), -1과 255는 255다. -1은 2의 보수 표기에서 모든 bit가 1이라 255의 bit를 그대로 남긴다는 해석과 일치한다. 한쪽이 null이면 null을 반환한다. 두 입력의 타입이 다르면 좁은 타입을 넓은 타입으로 넓힌다고 설명하지만, 해당 예제의 인자 값이 기본 예제와 같은 12와 10이라 실제 출력 타입이 어떻게 정해지는지는 예제로 확인할 수 없다. Flag column을 mask로 검사할 때는 결과를 0과 비교하기 전에 null을 별도로 처리한다(설계 제안).

`bitwiseOrV1`(Bitwise or)은 두 정수 중 어느 한쪽에라도 켜진 bit를 남긴다. 분류, Batch/Faster 표시, Left와 Right의 타입 범위(Byte, Integer, Long, Short), 출력 타입, 한쪽 null이면 null, 좁은 타입을 넓힌다는 설명은 Bitwise and와 같다(2026-11-17 수집한 공개 레퍼런스 기준). 예제에서 12와 10은 14(1100과 1010의 합집합 1110), -16과 3은 -13이다. -16은 하위 4bit가 0이고 나머지가 모두 1이므로 3의 하위 2bit를 켜면 -13이 된다는 해석과 일치한다. 넓히기 예제도 12와 10이라 출력 타입 결정 규칙은 예제로 확인할 수 없다. Flag를 켜는 용도로 쓸 때 null 입력은 기존 flag까지 null로 만들므로 결측 flag를 0으로 볼지 먼저 정한다(설계 제안).

`bitwiseNotV1`(Bitwise not)은 인자 하나(Expression)의 모든 bit를 뒤집는다. 같은 Binary 분류, Batch/Faster 표시, 네 정수 타입 입력과 출력, null 입력에 null 반환이다(2026-11-17 수집한 공개 레퍼런스 기준). 예제는 5에서 -6, 12345678910에서 -12345678911, -1에서 0, 0에서 -1이다. 네 수치 예제는 2의 보수에서 not x가 -x-1이라는 관계와 일치하고, 12345678910은 32bit 정수 범위를 넘으므로 Long 입력 예제로 보인다(해석). Byte나 Short 입력의 결과 타입과 부호를 보여 주는 예제는 없으므로 좁은 정수 column에서 not을 mask 생성에 쓸 때는 결과 타입을 실제 pipeline에서 확인한다(설계 제안).

`bitwiseXorV1`(Bitwise xor)은 두 정수 중 정확히 한쪽에만 켜진 bit를 남긴다. 분류, Batch/Faster 표시, Left와 Right의 타입 범위(Byte, Integer, Long, Short), 출력 타입, 한쪽 null이면 null, 좁은 타입을 넓힌다는 설명은 Bitwise and, or와 같다(2026-11-17 수집한 공개 레퍼런스 기준). 예제에서 12와 10은 6(1100과 1010에서 한쪽에만 있는 bit 0110), -1과 5는 -6이다. -1은 모든 bit가 1이라 xor가 5의 bit를 모두 뒤집으므로 not 5와 같은 -6이 된다는 해석과 일치한다. 넓히기 예제도 12와 10이라 출력 타입 결정 규칙은 예제로 확인할 수 없다. Xor로 두 flag 값의 차이를 찾을 때 결과가 0이 아니면 다른 bit가 있다는 뜻이지만, null 입력은 차이 여부와 무관하게 null이므로 비교 전에 결측을 따로 처리한다(설계 제안).

## 분류 이름과 실제 타입

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
- [Palantir, Convert from hexadecimal to string](https://www.palantir.com/docs/foundry/pb-functions-expression/UnhexToStringV1)
- [Palantir, Substring](https://www.palantir.com/docs/foundry/pb-functions-expression/substringV1)
- [Palantir, Subtract numbers](https://www.palantir.com/docs/foundry/pb-functions-expression/subtractV1)
- [Palantir, Negate](https://www.palantir.com/docs/foundry/pb-functions-expression/negateV1)
- [Palantir, Ceil](https://www.palantir.com/docs/foundry/pb-functions-expression/ceilV1)
- [Palantir, Floor](https://www.palantir.com/docs/foundry/pb-functions-expression/floorV1)
- [Palantir, Exponential](https://www.palantir.com/docs/foundry/pb-functions-expression/exponentialV1)
- [Palantir, Logarithm](https://www.palantir.com/docs/foundry/pb-functions-expression/logV1)
- [Palantir, Logarithm with base](https://www.palantir.com/docs/foundry/pb-functions-expression/logNV1)
- [Palantir, Square root](https://www.palantir.com/docs/foundry/pb-functions-expression/sqrtV1)
- [Palantir, Sine](https://www.palantir.com/docs/foundry/pb-functions-expression/sineV1)
- [Palantir, Cosine](https://www.palantir.com/docs/foundry/pb-functions-expression/cosineV1)
- [Palantir, Secant](https://www.palantir.com/docs/foundry/pb-functions-expression/secantV1)
- [Palantir, Arccos](https://www.palantir.com/docs/foundry/pb-functions-expression/arccosV1)
- [Palantir, Arcsin](https://www.palantir.com/docs/foundry/pb-functions-expression/arcsinV1)
- [Palantir, Arctan](https://www.palantir.com/docs/foundry/pb-functions-expression/arctanV1)
- [Palantir, Arctan2](https://www.palantir.com/docs/foundry/pb-functions-expression/arctan2V1)
- [Palantir, Convert between distance units](https://www.palantir.com/docs/foundry/pb-functions-expression/convertDistanceV1)
- [Palantir, Convert between weight units](https://www.palantir.com/docs/foundry/pb-functions-expression/convertWeightV1)
- [Palantir, Convert to hexadecimal](https://www.palantir.com/docs/foundry/pb-functions-expression/HexV1)
- [Palantir, Convert to octal](https://www.palantir.com/docs/foundry/pb-functions-expression/octalV1)
- [Palantir, Bitwise and](https://www.palantir.com/docs/foundry/pb-functions-expression/bitwiseAndV1)
- [Palantir, Bitwise or](https://www.palantir.com/docs/foundry/pb-functions-expression/bitwiseOrV1)
- [Palantir, Bitwise not](https://www.palantir.com/docs/foundry/pb-functions-expression/bitwiseNotV1)
- [Palantir, Bitwise xor](https://www.palantir.com/docs/foundry/pb-functions-expression/bitwiseXorV1)
- [Palantir, Hyperbolic cosine](https://www.palantir.com/docs/foundry/pb-functions-expression/hyperbolicCosineV1)
- [Palantir, Hyperbolic sine](https://www.palantir.com/docs/foundry/pb-functions-expression/hyperbolicSineV1)
- [Palantir, Hyperbolic tangent](https://www.palantir.com/docs/foundry/pb-functions-expression/hyperbolicTangentV1)
- [Palantir, Functions index](https://www.palantir.com/docs/foundry/pipeline-builder/functions-index)

## 관련 문서

- [[Palantir-Aggregation-and-Window-Contracts|집계와 window의 결과 의미]]
- [[Palantir-Data-Pipeline-Operations|파이프라인 실행과 변경 관리]]
- [[Palantir-Type-and-Encoding-Contracts|타입과 인코딩 계약]]
