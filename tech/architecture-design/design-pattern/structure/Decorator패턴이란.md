---
tags: [architecture, design-pattern, structural, decorator]
status: done
verified_at: 2026-09-27
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

## 구조와 참여자

- Component: 원본과 Decorator가 함께 지키는 계약이다. 예시의 `OrderReader`다.
- ConcreteComponent: 책임을 덧붙일 원래 객체다.
- Decorator: Component 참조를 보관하고 Component와 같은 인터페이스로 요청을 그 대상에 전달한다.
- ConcreteDecorator: 전달 전후에 책임을 덧붙인다. 예시의 `CachedOrderReader`가 여기에 해당하지만, 캐시 적중 때는 대상에 전달하지 않고 바로 응답하므로 접근 제어 의도로 보면 Caching Proxy로도 분류된다(아래 Proxy와 구분 참고).

덧붙일 책임이 하나뿐이면 예시처럼 기반 Decorator 없이 ConcreteDecorator가 전달까지 맡는다. 감쌀 대상 필드는 예시의 `target: OrderReader`처럼 구체 클래스가 아니라 Component 타입으로 선언한다. 그래야 원본과 다른 Decorator를 모두 받아 Decorator를 재귀적으로 겹칠 수 있다. 자식이 하나뿐인 [[Composite패턴이란|Composite]]로 볼 수도 있지만, 목적은 객체를 모으는 것이 아니라 책임을 덧붙이는 것이다.

### 기반 Decorator의 기본 위임

Component 계약에 메서드가 여러 개이면 기반 Decorator가 모든 메서드를 기본 위임으로 구현할지 먼저 정한다. 기본 위임을 두면 ConcreteDecorator는 바꿀 메서드만 재정의하면 된다. 대신 함께 바꿔야 할 메서드를 빠뜨려도 컴파일 오류 없이 원본 동작이 나간다. `OrderReader`에 `findAll`이 추가됐는데 캐시 Decorator가 기본 위임을 상속하고 `find`만 재정의하면 목록 조회만 조용히 캐시를 우회한다.

재정의 메서드에 `override`를 붙이면 기반 클래스에 같은 이름의 메서드가 없을 때 컴파일 오류가 나므로, 계약의 이름이 바뀌어 재정의가 끊기는 경우를 잡는다. `noImplicitOverride`는 `override` 없는 재정의를 오류로 만들어 이 표시를 강제하며, `strict`에 포함되지 않으므로 따로 켠다.

기반 Decorator에서 Component의 메서드를 추상 멤버로 남기면 ConcreteDecorator마다 모든 메서드를 직접 구현해야 한다. 단순 위임 코드가 반복되지만 하나라도 빠뜨리면 컴파일 오류로 드러난다. 텍스트에 테두리를 두르는 Decorator가 줄 수, 너비와 각 줄 문자열을 함께 바꿔야 하는 것처럼 메서드들이 서로 맞물린 값을 돌려주는 계약이면 누락 검사를 컴파일러에 맡기는 편이 낫다.

### Component의 공통 연산은 위임하지 않는다

Component를 추상 클래스로 두고 원시 연산(줄 수, 각 줄 문자열)을 조합하는 공통 연산(전체 출력)까지 구현했다면, ConcreteDecorator는 원시 연산만 재정의하고 공통 연산은 상속한 구현을 그대로 쓴다. 가장 바깥 Decorator에서 공통 연산을 호출하면 `this`가 그 Decorator를 가리키므로 원시 연산 호출이 바깥에서 안쪽으로 이어지며 모든 장식이 반영된다. 공통 연산까지 `this.inner.render()`처럼 안쪽 객체에 위임하면 안쪽 객체의 원시 연산으로 출력하므로 바깥 장식이 빠진다. 공통 연산의 골격을 기반 클래스에 두고 단계만 하위 클래스가 바꾸는 이 구조는 [[TemplateMethod패턴이란|Template Method 패턴]]과 같다. 다만 공통 연산은 원시 연산을 조합하는 얇은 골격으로 두고, 상태나 부가 기능은 Component에 올리지 않는다. Component가 무거워지면 Decorator를 여러 겹 쓰기 부담스러워지고, 구체 하위 클래스는 쓰지 않는 기능의 비용까지 떠안는다.

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
- 원본과 Decorator는 같은 Component 타입으로 다룰 뿐 같은 객체가 아니다. 감싼 뒤에는 `===` 비교, 구체 클래스에 대한 `instanceof` 검사와 원본을 키로 쓴 `Map`이나 `WeakMap` 조회가 원본과 다른 결과를 낸다. 객체 동일성이나 구체 타입 판별에 기대는 코드가 있으면 감싸기 전에 확인한다.

## 출처

- 얄팍한 코딩사전, [Decorator 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=244724)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [TypeScript 공식 문서, Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 8. Decorator](https://www.youtube.com/watch?v=nND1rvT-PtQ)
- [TypeScript 공식 문서, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript 공식 문서, TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
- [TypeScript 4.3 릴리스 노트 — TypeScript](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-3.html)
- [MDN, Strict equality (===)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality)
- [MDN, instanceof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof)
- [MDN, Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)

## 관련 문서

- [[Proxy패턴이란|Proxy 패턴]]
- [[Adapter패턴이란|Adapter 패턴]]
- [[Middleware패턴이란|Middleware 패턴]]
- [[Composite패턴이란|Composite 패턴]]
