---
tags: [architecture, design-pattern, structural, adapter]
status: done
category: "Architecture & Design"
aliases: ["Adapter Pattern", "어댑터 패턴"]
---

# Adapter 패턴이란?

Adapter는 클라이언트가 기대하는 Target 계약과 호환되지 않는 Adaptee의 인터페이스를 변환하는 구조 패턴이다. 외부 SDK나 레거시 시스템의 세부를 애플리케이션 경계 뒤에 격리할 때 유용하다.

## NestJS 예시

```typescript
interface PaymentGateway {
  charge(command: ChargeCommand): Promise<PaymentResult>
}

@Injectable()
class VendorPaymentAdapter implements PaymentGateway {
  constructor(private readonly client: VendorClient) {}

  async charge(command: ChargeCommand): Promise<PaymentResult> {
    try {
      const response = await this.client.request({
        price: command.amount.toNumber(),
        key: command.idempotencyKey,
      })
      return PaymentResult.approved(response.transactionId)
    } catch (error) {
      throw mapVendorError(error)
    }
  }
}
```

Adapter는 메서드 이름만 바꾸지 않는다. DTO, 단위, 오류, 동기와 비동기 방식, 타임아웃과 재시도 의미까지 내부 계약으로 변환한다. 의미가 근본적으로 다른 두 시스템을 억지로 같은 인터페이스에 넣으면 차이를 숨길 뿐 제거하지 못한다.

## 적용 체크포인트

- 외부 타입이 도메인과 애플리케이션 내부로 새지 않는가?
- 외부 오류가 안정된 내부 오류 분류로 변환되는가?
- 금액, 시간대, 식별자와 nullable 의미가 보존되는가?
- 재시도 가능한 실패와 영구 실패를 구분하는가?
- 계약 테스트로 실제 Adaptee와의 호환성을 검증하는가?

## 다른 패턴과 구분

- Facade는 복잡한 서브시스템에 단순한 고수준 진입점을 제공한다.
- Bridge는 설계 시점부터 독립적인 두 변화 축을 분리한다.
- Decorator는 같은 Component 계약을 유지하면서 책임을 겹쳐 붙인다.

## 출처

- 얄팍한 코딩사전, [Adapter 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=242783)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- yongsoocho, [TypeScript로 구현하는 Adapter](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=150430)

## 관련 문서

- [[Facade패턴이란|Facade 패턴]]
- [[Bridge패턴이란|Bridge 패턴]]
- [[Hexagonal-In-Practice|헥사고날 아키텍처 실전]]
