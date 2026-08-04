---
tags: [architecture, design-pattern, structural, decorator]
status: done
verified_at: 2026-08-04
category: "Architecture & Design"
aliases: ["Decorator Pattern", "데코레이터 패턴"]
---

# Decorator 패턴이란?

GoF Decorator는 같은 Component 계약을 구현하는 Wrapper를 겹쳐 객체의 책임을 동적으로 추가하는 구조 패턴이다. 원본과 Decorator가 같은 계약을 지키므로 클라이언트는 어느 조합인지 몰라도 사용할 수 있다.

## 예시

```typescript
interface OrderReader {
  find(id: OrderId): Promise<Order>
}

class CachedOrderReader implements OrderReader {
  constructor(
    private readonly target: OrderReader,
    private readonly cache: OrderCache,
  ) {}

  async find(id: OrderId): Promise<Order> {
    const cached = await this.cache.get(id)
    if (cached) return cached

    const order = await this.target.find(id)
    await this.cache.set(id, order)
    return order
  }
}
```

로깅, 메트릭과 캐시 Decorator를 원하는 순서로 감쌀 수 있다. 실행 순서가 결과, 오류 처리와 관측 범위에 영향을 주므로 구성 코드에서 명시하고 통합 테스트한다.

## Proxy와 구분

두 패턴 모두 같은 인터페이스로 대상을 감쌀 수 있다.

- Decorator의 주된 의도는 책임을 조합해 추가하는 것이다.
- Proxy의 주된 의도는 실제 대상에 대한 접근, 위치나 수명을 제어하는 것이다.

구조만으로 완전히 구분되지 않으며 설계 의도를 봐야 한다.

## TypeScript/NestJS 데코레이터와 구분

`@Injectable()`, `@Controller()` 같은 언어 및 프레임워크 데코레이터는 선언에 메타데이터나 변환 동작을 연결하는 메타프로그래밍 기능이다. 객체를 같은 Component로 감싸는 GoF Decorator와 이름은 같지만 자동으로 같은 패턴이 되지는 않는다. Monkey Patching도 원본을 직접 바꾸므로 전형적인 GoF Decorator가 아니다.

## 비용

- 작은 Wrapper가 많아지면 런타임 호출 경로와 디버깅이 어려워진다.
- 순서 의존과 중복 적용을 관리해야 한다.
- 새 메서드를 추가해 계약을 넓히는 것이 목적이라면 Decorator의 대체 가능성이 깨진다.

## 출처

- 얄팍한 코딩사전, [Decorator 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=244724)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [TypeScript 공식 문서, Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)

## 관련 문서

- [[Proxy패턴이란|Proxy 패턴]]
- [[Adapter패턴이란|Adapter 패턴]]
- [[Middleware패턴이란|Middleware 패턴]]
