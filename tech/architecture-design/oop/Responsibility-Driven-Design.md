---
tags: [architecture, oop, rdd, grasp, responsibility]
status: done
category: "Architecture - OOP"
aliases: ["Responsibility-Driven Design", "책임 주도 설계", "GRASP"]
---

# 책임 주도 설계와 GRASP

조영호 강사의 오브젝트 기초편을 바탕으로, 객체를 데이터 묶음이 아니라 협력 안에서 책임을 수행하는 존재로 설계하는 절차를 정리한다. 책임 주도 설계(Responsibility-Driven Design, RDD)는 클래스 목록보다 시스템이 주고받을 메시지에서 출발한다.

## 데이터보다 행동에서 시작한다

절차적인 설계는 중앙 서비스가 데이터를 꺼내 판단하고 갱신한다. 책임 주도 설계는 같은 기능을 다음 순서로 재구성한다.

1. 사용 사례에서 시스템이 수행할 책임을 찾는다.
2. 그 책임을 더 작은 메시지로 나눈다.
3. 메시지를 책임질 객체를 선택한다.
4. 객체가 책임을 수행하는 데 필요한 협력자를 찾는다.
5. 협력을 만족하는 상태와 메서드를 마지막에 구체화한다.

따라서 `Movie` 클래스를 먼저 만들고 필드를 채우는 것이 아니라, `예매하라`, `요금을 계산하라`, `할인 여부를 판단하라`라는 메시지를 먼저 찾는다. 메시지는 수신자가 무엇을 해야 하는지를 표현하고, 메서드는 수신자가 그 메시지를 처리하는 구체적인 방법이다. 둘을 분리해야 같은 메시지를 서로 다른 구현이 처리하는 다형성이 생긴다.

## 도메인 모델과 표현적 차이

도메인 모델은 현실을 그대로 복사한 그림이 아니다. 현재 소프트웨어가 풀 문제에 필요한 개념, 관계, 책임을 선별한 모델이다. 코드의 이름과 협력이 도메인 모델을 닮을수록 사용자 언어와 구현 사이의 표현적 차이(Representational Gap)가 줄어든다.

CRC 카드(Class, Responsibility, Collaborator)는 이 협력을 가볍게 탐색하는 도구다. 카드마다 후보 객체의 이름, 책임, 협력자를 적고 실제 메시지 흐름을 역할극하듯 검토한다. 클래스 확정 문서가 아니라 책임 이동과 대안을 빠르게 시험하는 수단으로 사용한다.

## GRASP로 책임을 할당한다

GRASP는 함께 고려할 설계 판단 기준이다. 어느 하나가 항상 우선하는 규칙은 아니다.

| 패턴 | 판단 질문 |
|---|---|
| Information Expert | 책임 수행에 필요한 정보를 가장 잘 아는 객체는 누구인가? |
| Creator | 생성할 객체를 포함, 기록, 사용하거나 초기화 정보를 가진 객체는 누구인가? |
| Low Coupling | 이 할당이 불필요한 의존성과 변경 전파를 늘리는가? |
| High Cohesion | 서로 관련된 책임이 한 객체에 모이고, 다른 이유로 바뀌는 책임은 분리되는가? |
| Polymorphism | 타입에 따른 행동 차이를 같은 메시지의 구현으로 바꿀 수 있는가? |
| Protected Variations | 변할 가능성이 높은 지점을 안정된 역할 뒤에 감출 수 있는가? |
| Indirection | 직접 결합을 중간 객체가 끊는 편이 나은가? |
| Pure Fabrication | 도메인 객체에 두기 어색한 기술 책임을 별도 객체가 맡아야 하는가? |
| Controller | 시스템 이벤트를 받아 도메인 협력을 시작할 비 UI 객체는 누구인가? |

정보 전문가는 데이터를 밖으로 꺼내 계산하라는 뜻이 아니다. 정보를 가진 객체에게 계산을 요청해 상태와 규칙을 함께 캡슐화하라는 뜻이다. Creator도 단독 정답이 아니다. 생성 책임을 주면 결합도가 지나치게 커지는 경우 Factory나 애플리케이션 조립 객체가 더 나을 수 있다.

## TypeScript 예시

```typescript
interface DiscountPolicy {
  discount(screening: Screening, audienceCount: number): Money
}

class Movie {
  constructor(
    private readonly fee: Money,
    private readonly policy: DiscountPolicy,
  ) {}

  calculateFee(screening: Screening, audienceCount: number): Money {
    return this.fee
      .times(audienceCount)
      .minus(this.policy.discount(screening, audienceCount))
  }
}

class Screening {
  constructor(
    private readonly movie: Movie,
    readonly sequence: number,
  ) {}

  reserve(customerId: string, audienceCount: number): Reservation {
    const fee = this.movie.calculateFee(this, audienceCount)
    return new Reservation(customerId, this, audienceCount, fee)
  }
}
```

- `Screening`은 예매에 필요한 영화와 순번을 알고 있어 `Reservation` 생성 책임을 맡는다.
- `Movie`는 기본 요금과 할인 정책을 알고 있어 요금 계산 책임을 맡는다.
- `DiscountPolicy`는 할인 방식의 변화를 보호하고 타입 조건문을 다형적인 메시지로 바꾼다.

이 배치는 정답이 아니라 현재 변경 방향에 대한 선택이다. 예매 생성 규칙이 복잡해져 `Screening`의 응집도가 낮아지면 별도 Factory로 책임을 이동할 수 있다.

## 애플리케이션 객체와 NestJS 경계

Controller가 도메인 규칙까지 계산하면 다시 중앙 집중식 절차가 된다. 애플리케이션 서비스는 트랜잭션 경계를 열고 객체를 조회한 뒤 도메인 메시지를 보내고 저장하는 흐름을 조정한다. 할인 계산과 불변조건은 도메인 객체에 남긴다.

TypeScript의 `interface`는 런타임에 사라지므로 NestJS DI 토큰으로 직접 쓸 수 없다. 역할을 주입하려면 `Symbol`이나 문자열 토큰, 또는 런타임에 남는 abstract class를 사용한다. 이는 역할과 구현을 분리하는 언어 및 프레임워크상의 구현 세부다.

## 설계 검토 질문

- 클래스 이름보다 메시지와 협력을 먼저 설명할 수 있는가?
- 호출자가 객체의 상태를 꺼내 대신 판단하고 있지 않은가?
- 타입을 검사하는 조건문을 같은 메시지의 다형적 구현으로 바꿀 수 있는가?
- 한 책임을 옮겼을 때 응집도와 결합도가 각각 어떻게 변하는가?
- 도메인 책임과 DB, 네트워크, 프레임워크 책임이 섞이지 않았는가?
- 새 요구사항이 들어왔을 때 기존 협력을 깨지 않고 역할을 추가할 수 있는가?

## 출처

- 조영호 강사, [책임 주도 설계](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234571)
- 조영호 강사, [표현적 차이 줄이기](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234572)
- 조영호 강사, [정보와 책임 할당, 정보 전문가](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234574)
- 조영호 강사, [설계 트레이드오프, 창조자와 낮은 결합도](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234575)
- 조영호 강사, [설계 트레이드오프, 높은 응집도](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234576)
- 조영호 강사, [유연한 설계, 다형성](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234577)
- 조영호 강사, [결합도 낮추기, 변경 보호](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234578)
- 조영호 강사, [애플리케이션 객체 추가하기](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234584)
- [NestJS 공식 문서, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)

## 관련 문서

- [[OOP|객체지향 기본]]
- [[Object-Design-Principles|객체 설계 원칙과 리팩터링]]
- [[Cohesion-Coupling|응집도와 결합도]]
- [[App-Architecture-OOP|애플리케이션 아키텍처와 객체지향]]
