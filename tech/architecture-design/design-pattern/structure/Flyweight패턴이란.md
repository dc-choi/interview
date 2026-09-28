---
tags: [architecture, design-pattern, structural, flyweight]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Flyweight Pattern", "플라이웨이트 패턴"]
---

# Flyweight 패턴이란?

Flyweight는 많은 객체가 공유할 수 있는 불변 상태를 재사용하고, 객체마다 다른 상태는 외부에서 전달해 메모리 사용을 줄이는 구조 패턴이다.

## 상태를 나누는 기준

- 내재 상태: 여러 객체가 공유해도 되는 값이다. Flyweight 내부에 둔다.
- 외재 상태: 위치, 사용자, 요청처럼 사용 맥락마다 달라지는 값이다. 호출 시 전달한다.

```typescript
type TextStyle = Readonly<{
  font: string
  size: number
  color: string
}>

class TextStyleFactory {
  private readonly cache = new Map<string, TextStyle>()

  get(font: string, size: number, color: string): TextStyle {
    const key = `${font}:${size}:${color}`
    const cached = this.cache.get(key)
    if (cached) return cached

    const style = Object.freeze({ font, size, color })
    this.cache.set(key, style)
    return style
  }
}
```

문자마다 스타일 객체를 새로 만들지 않고 같은 스타일을 공유한다. 문자의 값과 위치는 외재 상태로 별도 보관한다.

## 참여 객체와 공유 강제

- Flyweight: 외재 상태를 인자로 받아 동작하는 공유 객체의 인터페이스다.
- ConcreteFlyweight: 내재 상태만 저장하는 공유 구현이다.
- UnsharedConcreteFlyweight: 같은 인터페이스를 구현하지만 공유하지 않는다. 인터페이스는 공유를 가능하게 할 뿐 강제하지 않는다.
- FlyweightFactory: 공유 객체를 만들고 보관하며, 같은 키를 요청받으면 이미 만든 인스턴스를 돌려준다.
- Client: Flyweight 참조를 가지고 외재 상태를 저장하거나 계산해 호출할 때 넘긴다.

클라이언트가 ConcreteFlyweight를 직접 생성하면 팩토리를 거치지 않은 사본이 생겨 공유가 깨지므로 공유 객체는 팩토리로만 얻게 한다. TypeScript의 멤버 접근 제한자(`public`, `protected`, `private`)에는 같은 모듈의 팩토리에만 생성자를 여는 수준이 없다. 대신 구현 클래스를 export하지 않고 인터페이스와 팩토리만 export하면 다른 모듈에서 구현 클래스를 import할 때 컴파일 오류가 난다.

```typescript
/** Flyweight: 사용처마다 다른 금액은 인자로 받는다 */
export interface PriceFormatter {
  format(amount: number): string
}

// ConcreteFlyweight: export하지 않아 다른 모듈은 팩토리를 거쳐야 얻는다
class IntlPriceFormatter implements PriceFormatter {
  private readonly formatter: Intl.NumberFormat

  constructor(locale: string, currency: string) {
    this.formatter = new Intl.NumberFormat(locale, { style: 'currency', currency })
  }

  format(amount: number): string {
    return this.formatter.format(amount)
  }
}

// FlyweightFactory
export class PriceFormatterFactory {
  private readonly formatters = new Map<string, PriceFormatter>()

  /**
   * 로케일과 통화가 같으면 이미 만든 인스턴스를 반환한다.
   * @param locale 내재 상태인 로케일
   * @param currency 내재 상태인 통화 코드
   * @returns 공유되는 PriceFormatter
   */
  get(locale: string, currency: string): PriceFormatter {
    const key = `${locale}:${currency}`
    const cached = this.formatters.get(key)
    if (cached) return cached

    const formatter = new IntlPriceFormatter(locale, currency)
    this.formatters.set(key, formatter)
    return formatter
  }
}

const factory = new PriceFormatterFactory()
const krw = factory.get('ko-KR', 'KRW')
console.log(krw.format(12000)) // ₩12,000
console.log(factory.get('ko-KR', 'KRW') === krw) // true
```

같은 인자로 `toLocaleString()`을 반복 호출하기보다 `Intl.NumberFormat` 인스턴스를 만들어 `format()`을 재사용하는 편이 낫다. 인스턴스가 인자를 기억하고 지역화 데이터 일부를 캐시할 수 있기 때문이다. 로케일과 통화는 내재 상태로 공유하고 금액은 `format()`의 인자인 외재 상태로 넘긴다. export하지 않은 구현 클래스를 import하는 코드는 타입 검사 없이 실행해도 Node.js나 브라우저가 ESM으로 직접 로드하면 모듈 링크 단계에서 `SyntaxError`가 난다. CommonJS로 변환해 실행하면 로드할 때는 오류가 없고, 가져온 값이 `undefined`여서 구현 클래스를 쓰는 지점에서 `TypeError`로 실패한다. webpack처럼 import를 빌드 때 연결하는 번들러는 모듈 유형과 `exportsPresence` 설정에 따라 빌드 오류나 경고를 내거나 아무것도 알리지 않으며, 번들이 만들어지면 구현 클래스를 쓰는 지점에서 `TypeError`로 실패한다. 다만 팩토리가 돌려준 인스턴스의 `constructor` 속성으로 구현 클래스에 닿아 팩토리를 거치지 않은 인스턴스를 만들 수 있으므로 보안 경계로 쓰지 않는다.

NestJS에서는 팩토리를 기본 스코프 provider로 등록하고, 요청마다 다른 값은 팩토리에 주입하지 않고 메서드 인자로 넘긴다. 팩토리가 durable이 아닌 REQUEST 스코프 provider에 의존하면 스코프가 주입 체인을 따라 전파돼 팩토리도 요청마다 새로 만들어지고, 보관하던 공유 인스턴스도 요청과 함께 사라진다([[Injection-Scopes|NestJS 주입 스코프]]).

내재 상태를 네트워크나 파일에서 읽어 와야 할 때 `constructor`는 `async`일 수 없어 생성자 안에서 로딩을 기다릴 수 없다. 팩토리가 완성된 객체 대신 준비 중인 `Promise`를 키별로 보관하면 로딩이 끝나기 전에 들어온 호출도 같은 로딩을 기다린다. 거부된 `Promise`는 항목에서 지워 다음 호출이 다시 시도하게 한다. 대상 하나에 같은 기법을 쓰는 예는 [[Proxy패턴이란#Virtual Proxy의 생성 책임과 시점|Virtual Proxy의 지연 생성]]에 있다. 동시 호출을 합치는 원리는 [[Cache-Stampede|Single-Flight]]와 같지만, Single-Flight는 완료 뒤 진행 중 항목을 지우고 이 팩토리는 이행된 `Promise`를 공유 인스턴스로 계속 보관한다.

## 적용 판단

다음 조건이 모두 맞을 때 유용하며, 메모리 조건은 측정으로 확인한다.

- 같은 값 객체가 매우 많이 중복된다.
- 공유 대상이 사실상 불변이다.
- 객체 수나 중복 데이터가 실제 메모리 병목이다.
- 애플리케이션이 객체 동일성에 의존하지 않는다. 개념상 다른 사용처가 같은 인스턴스를 받으므로 `===` 비교가 참이 되고, Flyweight를 `Map`이나 `WeakMap`의 키로 삼아 사용처별 정보를 붙이면 여러 사용처의 정보가 한 항목에 섞인다.

캐시 키 생성, 조회와 수명 관리 비용이 추가된다. 공유 객체가 가변이면 한 사용자의 변경이 다른 사용자에게 전파되는 심각한 버그가 생긴다. 일반 캐시는 계산 결과의 재사용이 목적일 수 있지만 Flyweight는 객체의 공유 표현 자체가 핵심이다.

공유 객체를 언제 회수할지도 정한다. ASCII 문자 집합처럼 키 공간이 작고 고정되면 한 번 만든 인스턴스를 계속 보관해도 된다. 키가 사용자 입력이나 요청 값에서 오면 `Map`은 항목을 지우기 전까지 참조를 유지하므로 메모리를 줄이려던 팩토리가 계속 커진다. 문자열 키는 `WeakMap`에 쓸 수 없고, `WeakMap`은 키가 도달 불가능해질 때 항목을 놓을 뿐 값을 쓰는 곳이 남았는지는 보지 않는다. 값을 `WeakRef`로 감싸 `Map`에 두고 빈 항목을 `FinalizationRegistry`로 지우는 조합([[JavaScript-Keyed-Collections-and-Weak-References#WeakRef와 FinalizationRegistry|WeakRef와 FinalizationRegistry]])도 있지만 회수 여부와 시점을 엔진이 정하므로, 보통은 허용 키를 제한하거나 항목 수 상한과 제거 정책을 둔다.

Object Pool과도 구분한다. 커넥션 풀은 객체를 한 사용자에게 빌려주고 반납받아 한 시점에 한 곳에서만 쓰게 하므로 빌린 동안에는 풀 객체가 세션 같은 가변 상태를 가져도 된다. 다만 반납 뒤에도 남는 세션 설정은 같은 연결을 받는 다음 사용자에게 이어지므로 반납 전에 되돌리거나 연결을 폐기한다(node-postgres는 `client.release(true)`). Flyweight는 여러 사용처가 같은 인스턴스를 동시에 참조하므로 공유 부분이 불변이어야 하고 반납 절차가 없다. Singleton이 정해진 범위에서 인스턴스를 하나로 제한한다면 Flyweight 팩토리는 내재 상태의 키마다 인스턴스를 하나씩 둔다.

## 출처

- 얄팍한 코딩사전, [Flyweight 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=243749)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 10. Flyweight](https://www.youtube.com/watch?v=RnDC9QRGyck)
- [TypeScript Handbook, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript Handbook, Modules](https://www.typescriptlang.org/docs/handbook/2/modules.html)
- [TypeScript Handbook, Modules - Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [MDN, Number.prototype.toLocaleString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString)
- [MDN, Object.prototype.constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/constructor)
- [MDN, constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/constructor)
- [MDN, Strict equality (===)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality)
- [webpack, module.parser.javascript.exportsPresence](https://webpack.js.org/configuration/module/#moduleparserjavascriptexportspresence)
- [MDN, WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
- [MDN, WeakRef](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef)
- [MDN, FinalizationRegistry](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry)
- [ECMAScript 명세, InitializeEnvironment](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-source-text-module-record-initialize-environment)
- [NestJS, Injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [node-postgres, pg.Pool](https://node-postgres.com/apis/pool)
- [PostgreSQL, SET](https://www.postgresql.org/docs/current/sql-set.html)

## 관련 문서

- [[Defensive-Copy-Immutable-Practice|방어적 복사와 불변 객체]]
- [[Singleton패턴이란|Singleton 패턴]]
- [[Prototype패턴이란|Prototype 패턴]]
- [[State패턴이란#구조와 협력|State 패턴의 공유 상태 객체]]
- [[Connection-Pool|DB 커넥션 풀]]
- [[Injection-Scopes|NestJS 주입 스코프]]
