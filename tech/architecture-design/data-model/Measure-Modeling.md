---
tags: [architecture, modeling, value-object, measure, money, quantity]
status: done
verified_at: 2026-10-01
category: "Architecture - 데이터 모델"
aliases: ["Measure Modeling", "측도 모델링", "Quantity Pattern", "수량 패턴", "단위와 단위계"]
---

# 측도 모델링: 값, 단위, 변환

측도(measure)는 양이나 크기를 정량적으로 표현하는 방법이다. 마리, 권, 다스 같은 수량, cm, kg, mL 같은 물리 단위, 달러와 원 같은 화폐, 바퀴나 번 같은 횟수가 모두 측도다. 가격과 수량, 다국 통화, 단위 변환, 세금과 수수료 계산처럼 비즈니스 규칙의 상당수가 측도 위에서 돈다. [[Software-Modeling|소프트웨어 모델링]]의 대표적인 적용이다.

## 원시 타입 대신 값 객체

`weight: number = 100`의 100은 무게인지 길이인지 알 수 없어 변수명에 의미를 기대게 되고, 아무 숫자나 들어갈 수 있어 단위를 섞는 실수를 막지 못한다. 측도를 값 객체로 감싸면 타입이 의미를 드러내고, 생성 시점에 불변식(음수 불가 등)을 검사하며, 도메인 연산을 한곳에 모은다. 값 객체의 일반 성질은 [[VO-DTO]]에 있다.

## 값, 단위, 단위계

모든 측도는 값과 단위의 조합이다. 5kg은 값 5와 단위 kg이다. 서로 변환 가능한 단위의 모음을 단위계로 두면 변환과 비교가 일반화된다.

| 구성 요소 | 책임 |
|---|---|
| Measure | 값과 단위를 갖고, 같은 종류의 측도끼리 더하기, 빼기, 스칼라 곱과 나누기, 비교, 단위 변환을 제공한다 |
| Unit | 기호, 이름, 기본 단위에 대한 변환 규칙. 값에서 측도를 생성한다 |
| UnitSystem | 기본 단위와 사용 가능한 단위 집합을 관리하고 기호나 이름으로 단위를 찾는다 |

- **같은 종류끼리만 연산**: 무게에 길이를 더할 수 없어야 한다. Kotlin, Java는 자기 타입을 제네릭 경계로 받는 F-bounded 다형성(`Measure<T extends Measure<T>>`)으로 `Weight.add`가 `Weight`만 받게 만든다. TypeScript는 연산자 오버로딩이 없으므로 메서드로 연산을 제공하고, 구조적 타입이라 모양이 같은 클래스끼리 섞일 수 있으니 브랜드 필드로 구분한다.
- **비교와 동등성은 기본 단위로 환산해서**: 1kg과 1000g은 같은 무게다. 동등성을 환산 값으로 정의하면 해시 값도 같은 기준으로 계산해야 한다.
- **선형 단위의 변환**: 기본 단위에 대한 변환 계수만 있으면 된다. g은 kg의 0.001, lb는 0.45359237kg이다. 변환은 `값 x 원단위 계수 / 대상 단위 계수`다.

```ts
/** 기본 단위에 대한 변환 계수로 정의되는 선형 단위다. */
interface LinearUnit<K extends string> {
  readonly kind: K; // 측도 종류 브랜드
  readonly symbol: string;
  readonly factor: Decimal; // 기본 단위로 바꿀 때 곱하는 값
}

class Quantity<K extends string> {
  private constructor(readonly value: Decimal, readonly unit: LinearUnit<K>) {}

  static of<K extends string>(value: Decimal, unit: LinearUnit<K>): Quantity<K> {
    if (value.isNegative()) throw new NegativeQuantityError(unit.symbol);
    return new Quantity(value, unit);
  }

  convertTo(target: LinearUnit<K>): Quantity<K> {
    return new Quantity(this.value.mul(this.unit.factor).div(target.factor), target);
  }

  add(other: Quantity<K>): Quantity<K> {
    return Quantity.of(this.value.add(other.convertTo(this.unit).value), this.unit);
  }
}
```

`Decimal`은 decimal.js 같은 십진 라이브러리를 가정한다. 정밀도와 반올림 방식은 라이브러리 전역 설정이나 연산 인자로 명시한다.

## 구현 함정

- **이진 부동소수점으로 계수를 만들지 않는다**: Java의 `new BigDecimal(0.001)`은 0.001이 아니라 double의 근삿값을 그대로 담는다. 문자열 생성자나 `BigDecimal.valueOf(double)`을 쓴다. JavaScript도 계수를 문자열로 십진 타입에 넘긴다.
- **나눗셈에는 정밀도와 반올림을 준다**: Java `BigDecimal.divide(divisor)`는 몫이 무한소수면 `ArithmeticException`을 던진다. lb처럼 계수가 나누어떨어지지 않는 단위 변환은 스케일과 `RoundingMode` 또는 `MathContext`를 지정한다.
- **스케일이 다른 같은 값**: Java `BigDecimal`의 `equals`는 2.0과 2.00을 다르게 보고 `compareTo`는 같게 본다. 측도의 동등성과 해시를 어느 기준으로 둘지 정한다.
- **확정 반올림은 도메인 정책이다**: 계산 중 정밀도와 확정 자릿수, 반올림 시점은 별개다. 금액의 반올림과 배분 잔여 처리는 [[Commerce-Change-Propagation-and-Money-Invariants#Decimal과 반올림 정책은 별개다|Decimal과 반올림 정책]]을 따른다.

### BigDecimal을 컬렉션 키로 쓸 때

Java SE 26 API 기준으로 2026-10-07에 대조한 범위다. `equals`는 값과 scale을 함께 비교하고 `hashCode`도 scale을 반영한다. `compareTo`는 수치만 비교한다. 이 차이는 BigDecimal의 해시 계약 위반이 아니라 자연 순서와 `equals`의 불일치다.

- `HashMap`에 `new BigDecimal("1.0")`을 키로 넣고 `new BigDecimal("1.00")`으로 조회하면 같은 키로 찾지 못한다. 호출부에서 `compareTo`를 사용해도 해시 컬렉션의 키 비교 방식은 바뀌지 않는다.
- 수치만으로 같은 값인지 판단하는 도메인은 키를 저장할 때와 조회할 때 같은 정규화 정책을 적용한다. 통화나 단위가 다르면 정규화한 숫자만으로 같은 측도라고 판단하지 않는다.
- 고정 자릿수가 계약이면 `setScale(2, RoundingMode.UNNECESSARY)`처럼 값 변경 없이 맞춘다. 2는 소수 둘째 자리까지 허용하는 도메인의 예시다. `1.230`은 `1.23`이 되지만 `1.231`은 반올림이 필요하므로 `ArithmeticException`이 난다. 원본을 바꾸는 메서드가 아니므로 반환값을 사용한다.
- 자릿수 자체가 의미 없으면 `stripTrailingZeros()`를 검토한다. `1000.00`이 `1E+3`처럼 음수 scale로 바뀔 수 있으므로 화면 표시와 저장 형식은 별도로 정한다. 입력 정밀도를 보존해야 하는 측정값에는 무조건 적용하지 않는다.
- 키를 같게 만들려고 `HALF_UP`으로 반올림하면 서로 다른 수치를 합칠 수 있다. 반올림은 금액 확정 정책이 허용하는 경계에서 수행하고, 표현 통일과 값 변경을 구분한다.

## 화폐는 선형 수량이 아니다

화폐는 값과 단위(통화)의 조합이지만 물리 수량과 다른 점이 있다.

- **환율은 시간에 따라 바뀐다**: 통화 단위에 가변 환율을 넣고 전역 단위계에서 갱신하면, 같은 계산이 호출 시점마다 다른 결과를 낸다. 환산은 출발 통화, 도착 통화, 비율, 기준 시각을 가진 환율 값 객체를 명시적으로 받아 수행하고, 원금액과 원통화, 적용 환율과 기준 시각을 함께 보존한다. 기준 통화 하나에 대한 환율만 관리하고 교차 환산을 경유로 계산하는 방식은 관리할 환율 수를 줄이지만, 실제 거래 환율과 차이가 날 수 있다.
- **다른 통화끼리는 암묵적으로 더하거나 비교하지 않는다**: 50EUR과 54.5USD를 현재 환율로 같다고 보는 동등성은 시점에 따라 결과가 바뀐다. 통화가 다르면 연산을 거부하고 환산을 호출부에 드러낸다.
- **통화마다 최소 단위가 다르다**: ISO 4217 기준으로 USD는 소수 둘째 자리까지, KRW와 JPY는 소수 자릿수가 0이다. 확정 금액은 통화의 최소 단위에 맞춘다.
- **표시 형식은 지역에 따라 다르다**: 같은 50EUR도 미국 형식은 €50.00, 독일 형식은 50,00 €다. 표시는 `Intl.NumberFormat` 같은 지역화 도구에 맡긴다.
- **비율 연산**: 세금, 할인, 이자처럼 퍼센트를 적용하는 연산을 Money에 두면 호출부가 단순해진다. 여러 항목으로 나누는 배분은 합이 원금액과 같아야 한다.

## 선형이 아닌 측도

| 측도 | 수량 모델로 부족한 이유 |
|---|---|
| 온도 | 섭씨와 화씨는 곱셈만이 아니라 오프셋이 있는 변환(°F = °C x 9/5 + 32)이다. 절대 온도끼리 더하는 것은 의미가 없고, 온도 차이와 절대 온도를 구분해야 한다 |
| 데이터 크기 | kB(1000바이트)와 KiB(1024바이트)처럼 SI 접두어와 IEC 이진 접두어가 다르고, kilo를 1024로 쓰는 관행이 혼동을 만든다. 어느 체계인지 단위에 드러낸다 |
| 시간 | 달과 해는 길이가 고정되지 않아 단순 계수로 환산할 수 없다 |
| 화폐 | 변환 비율이 시간에 따라 바뀐다 |

이런 측도는 변환 규칙이 다르거나, 연산의 의미가 다르거나, 도메인 로직이 필요하거나, 지역별 표현이 다르므로 별도 모델을 둔다.

## 수학적 측도, 복합 측도, 파생 측도

- **비율(Ratio)**: 두 측도의 관계다. 소수, 퍼센트, 퍼밀, 분수를 단위로 두고 변환한다. 같은 종류 측도의 비율은 단위가 없는 값이 되고, 이자율 5%를 금액에 적용하는 것처럼 다른 측도에 곱하는 연산을 제공한다.
- **복합 측도**: 속도(거리/시간, km/h), 밀도(질량/부피)처럼 기본 측도를 조합한다. 단위도 거리 단위와 시간 단위의 조합으로 두고, 변환은 거리 계수를 시간 계수로 나눠 계산한다. 60km/h를 m/s로 바꾸면 거리는 1000배, 시간은 3600배라 약 16.67m/s다.
- **파생 측도**: 길이 x 길이 = 면적처럼 연산 결과로 다른 종류의 측도가 나온다. m끼리 곱하면 m²이 되고, 면적 단위의 변환 계수는 길이 계수의 제곱이다.

측도끼리의 관계를 타입으로 정의하면 차원이 맞지 않는 계산을 컴파일 단계나 생성 시점에 막을 수 있다.

## 설계 기준

- 도메인이 실제로 쓰는 측도만 모델링한다. 모든 단위계를 미리 만들 필요는 없다.
- 선형 단위는 계수 하나로 일반화하고, 화폐와 온도처럼 규칙이 다른 측도는 별도 모델로 둔다.
- 영속화할 때는 값과 단위를 함께 저장하고, 기본 단위로 정규화해 저장할지 입력 단위를 보존할지 정한다.

## 체크포인트

- 원시 타입 대신 측도 값 객체를 쓰는 이유
- 값, 단위, 단위계의 책임과 같은 종류끼리만 연산하게 만드는 방법
- 십진 타입을 쓸 때 생성자, 나눗셈, 동등성에서 생기는 함정
- 화폐를 물리 수량처럼 다루면 생기는 문제와 환율, 최소 단위 처리
- 온도, 데이터 크기처럼 선형 계수로 표현되지 않는 측도

## 출처

- [모델링 시리즈: 측도 — kciter.so, kciter](https://kciter.so/posts/modeling-series-measure/)
- [Java SE 21 API, BigDecimal](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/math/BigDecimal.html)
- [Java SE 26 API, BigDecimal](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/math/BigDecimal.html) — 컬렉션 키의 동등성과 scale 정규화
- [SIX, ISO 4217 Current currency & funds code list](https://www.six-group.com/en/products-services/financial-information/data-standards.html)
- [NIST, Prefixes for binary multiples](https://physics.nist.gov/cuu/Units/binary.html)

## 관련 문서

- [[Software-Modeling|소프트웨어 모델링과 좋은 모델의 기준]]
- [[VO-DTO|VO와 DTO]]
- [[Commerce-Change-Propagation-and-Money-Invariants|커머스 변경 전파와 금액 불변식]]
- [[View-Model-Design|뷰모델 설계와 Server Driven UI]]
- [[Temporal-Modeling|시간 모델링 (선형이 아닌 시간 단위)]]
- [[Type-Driven-Development|타입 주도 개발 (팬텀 타입으로 단위 구분)]]
