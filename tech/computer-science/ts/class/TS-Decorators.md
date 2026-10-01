---
tags: [cs, typescript, decorator, metadata]
status: done
verified_at: 2026-10-01
category: "CS - TypeScript"
aliases: ["TypeScript Decorators", "TS 데코레이터"]
---

# TypeScript Decorators

Decorator는 클래스와 멤버 정의 시점에 실행되어 정의를 관찰하거나 교체하는 함수다. TypeScript에는 현재 ECMAScript proposal 방식과 과거의 legacy 방식이 함께 존재한다. 두 방식은 함수 signature, 실행 순서, metadata와 parameter decorator 지원이 다르므로 하나의 문법으로 취급하면 안 된다.

## 표준 proposal 방식

TypeScript 5.0부터 `experimentalDecorators` 없이 proposal decorator를 사용할 수 있다.

```typescript
function logged<This, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This>,
) {
  return function (this: This, ...args: Args): Return {
    console.log(String(context.name));
    return target.call(this, ...args);
  };
}

class Service {
  @logged
  run(value: number) {
    return value * 2;
  }
}
```

Decorator는 class definition이 평가될 때 실행되고, 반환값으로 class나 method를 교체하거나 `context.addInitializer`로 초기화를 예약할 수 있다. property decorator는 instance마다 대입이 일어날 때 호출되는 감시 함수가 아니다. property 접근을 계속 가로채려면 accessor, Proxy 또는 명시적 method가 더 맞다.

## Legacy 방식과 metadata

`experimentalDecorators: true`는 이전 TypeScript decorator 모델을 활성화한다. method decorator는 대략 target, property key, descriptor를 받고, property decorator는 property descriptor나 initializer를 직접 받지 않는다.

```typescript
function Route(path: string): MethodDecorator {
  return (target, key, descriptor) => {
    Reflect.defineMetadata("route:path", path, target, key);
  };
}
```

`emitDecoratorMetadata`는 legacy decorator와 함께 설계된 실험적 metadata emit이다. `design:type`, `design:paramtypes`, `design:returntype` 같은 제한된 런타임 정보를 만들지만 interface, type alias, generic 인수는 소거되며 정교한 TypeScript 타입을 그대로 반사하지 못한다.

NestJS는 legacy decorators와 runtime metadata에 의존한다. 표준 proposal decorators는 `emitDecoratorMetadata`와 호환되지 않고 parameter decorators도 지원하지 않으므로 NestJS 프로젝트에서 flag를 제거하는 단순 migration은 불가능하다.

## 클래스, method와 property의 선택

| 대상 | 적합한 책임 | 경계 |
|---|---|---|
| class | 등록, class 교체, initializer 추가 | 새 class를 반환하면 prototype/static 계약 확인 |
| method | logging, memoization, 호출 전후 정책 | `this`, 인수, 반환 타입 보존 |
| field/accessor | 초기값 조정, get/set wrapping | 단순 field decorator는 지속적 변경 감시가 아님 |
| parameter | legacy framework metadata | proposal 방식에는 없음 |

Decorator factory는 설정을 받아 실제 decorator를 반환한다. factory 평가와 decorator 호출은 순서가 다르므로 아래 절에서 구분한다.

## 적용 순서

같은 대상에 decorator 여러 개를 붙이면 decorator 식(factory 호출)은 위에서 아래로 평가되고, 반환된 decorator 함수는 아래에서 위로 적용된다. `@A @B method`는 B가 원래 메서드를 먼저 감싸고 A가 그 결과를 감싸 `A(B(method))`가 되므로, 호출 시에는 위에 있는 A의 wrapper가 가장 바깥에서 먼저 실행된다. 이 규칙은 두 방식이 같다.

대상이 여러 개일 때의 순서는 두 방식이 다르다. 적용 순서는 표준 방식이 decorator 명세 초안(ecma262 PR #2417), legacy 방식이 TypeScript Handbook에 정해져 있고, 식 평가 순서까지 포함한 아래 표는 6.0.3, 7.0.2 emit에서 확인했다.

| 단계 | 표준 방식 | legacy 방식 |
|---|---|---|
| decorator 식 평가 | 클래스 decorator를 포함한 모든 식을 소스 순서대로 먼저 평가 | 멤버마다 평가와 적용을 끝낸 뒤 클래스 decorator 식, constructor parameter decorator 식 순으로 평가 |
| 멤버 적용 | 멤버 decorator를 모두 먼저 호출. static 메서드, getter/setter, accessor, 그다음 인스턴스 메서드, getter/setter, accessor, 그다음 static 필드, 인스턴스 필드 순 | 인스턴스 멤버 다음 static 멤버, 메서드는 parameter decorator 다음 method decorator |
| 클래스 적용 | 멤버 decorator가 모두 끝난 뒤 마지막 | constructor parameter decorator 다음 마지막 |

factory 안의 등록, 로깅 같은 부수효과 순서는 모델에 따라 달라지므로 의존하지 않고, 서로 다른 멤버 사이의 호출 순서에도 기대지 않는다. 캐시, 로깅, 트랜잭션처럼 감싸는 순서가 의미를 바꾸는 조합은 아래에 둔 decorator가 안쪽 wrapper라는 점을 문서화하고 테스트로 고정한다.

## 필드 decorator로 접근자를 설치할 때

표준 필드 decorator는 `(undefined, context)`를 받고 초기화 함수를 반환할 수 있다. 이 함수의 `this`는 인스턴스, 인자는 필드 초기값이다. 여기서 `Object.defineProperty(this, context.name, { get, set, configurable: true })`로 접근자를 설치해 대입을 로깅하거나 검증하는 방식은 class field 정의 의미론에 좌우된다(6.0.3, 7.0.2에서 확인).

- `useDefineForClassFields: true`: 초기화 함수가 끝난 뒤 필드가 `Object.defineProperty`와 같은 정의(Define 의미론)로 만들어져 방금 설치한 접근자를 데이터 속성으로 덮어쓴다. 이후 대입에서 setter가 한 번도 호출되지 않아 로깅과 검증이 오류 없이 사라진다. `configurable`을 생략해 접근자가 재정의 불가(기본값 `false`)이면 이 정의가 실패해 인스턴스 생성 시 TypeError(Node에서는 Cannot redefine property)가 나므로, 조용히 사라지는 것은 configurable 접근자일 때뿐이다. target이 ES2022 이상이면 이 옵션의 기본값이 `true`이고, 6.0부터 target 기본값이 지원하는 최신 ECMAScript(6.0 발표 기준 es2025)라 target을 생략해도 해당된다.
- `useDefineForClassFields: false`: 필드 초기화가 대입(Set 의미론)이라 setter가 초기값과 이후 대입에서 모두 호출된다.
- legacy property decorator가 prototype에 접근자를 정의하는 방식도 `true`에서는 인스턴스 자체 필드에 가려져 setter가 호출되지 않는다.
- 초기화 함수 안에서 초기값을 검사하는 부분은 두 의미론에서 모두 동작하지만 이후 대입 검사는 보장되지 않는다.

지속적인 검증이 필요하면 `accessor` 키워드(4.9부터)와 auto-accessor decorator를 쓴다. `init`은 초기값을, `set`은 이후 대입을 검사하며 target ES2015, ES2017, ES2022에서 모두 동작했다.

```typescript
function minLength(min: number) {
  return function <This>(
    target: ClassAccessorDecoratorTarget<This, string>,
    context: ClassAccessorDecoratorContext<This, string>,
  ): ClassAccessorDecoratorResult<This, string> {
    const check = (value: string): string => {
      if (value.length < min) throw new Error(`${String(context.name)} too short`);
      return value;
    };
    return {
      init: check,
      set(value) {
        target.set.call(this, check(value));
      },
    };
  };
}

class Profile {
  @minLength(3) accessor nick = "abc";
}
```

NestJS에서 쓰는 class-validator decorator는 접근자를 설치하지 않고 metadata만 등록하며 ValidationPipe가 검증을 명시적으로 호출하므로 이 문제와 무관하다(class-validator 0.15.1 소스 기준).

## 클래스를 교체하는 class decorator

class decorator는 생성자를 받아 하위 클래스를 반환하는 방식으로 클래스를 교체할 수 있다. 인자가 필요하면 factory로 한 번 더 감싼다.

```typescript
function reportable<T extends new (...args: any[]) => object>(Base: T, _context: ClassDecoratorContext) {
  return class extends Base {
    reportingURL = "https://example.com/report";
  };
}

@reportable
class BugReport {
  constructor(public title: string) {}
}
```

- 생성자 제약: 반환 클래스가 `Base`를 확장하려면 제약이 `new (...args: any[]) => object` 형태여야 한다. rest 매개변수를 `unknown[]`로 쓰면 TS2545(A mixin class must have a constructor with a single rest parameter of type 'any[]')가 난다.
- 타입 미반영: decorator는 선언된 클래스의 타입을 바꾸지 않는다. `reportingURL`은 런타임에 있지만 `BugReport` 타입에는 없어 `any`나 단언 없이 쓸 수 없다.
- 이름 손실: 익명 `class extends Base`를 반환하면 `BugReport.name`과 인스턴스의 `constructor.name`이 빈 문자열이 된다(6.0.3, 7.0.2에서 확인). 이름을 로그, 오류 메시지, 이름 기반 등록 키에 쓰는 코드가 깨지므로 `Object.defineProperty(Replaced, "name", { value: Base.name })`로 복원한다.

추가 멤버를 타입에도 드러내야 하면 다음 중 하나를 고른다.

1. 같은 이름 interface 선언 병합: `interface BugReport { reportingURL: string }`을 decorator를 적용한 클래스와 같은 파일에 두고, 런타임 추가와 선언이 어긋나지 않게 함께 고친다.
2. mixin 함수: `class BugReport extends Reportable(Report) {}`처럼 함수가 반환한 클래스를 상속하면 추가 멤버가 타입에 반영되고 클래스 이름도 유지된다. 단일 상속에서 기능을 조합하는 TypeScript 방식이기도 하다.
3. builder 생성처럼 생성 API가 목적이면 decorator 대신 명시적 static factory나 제네릭 builder 함수로 타입을 드러낸다.

## 설계 체크포인트

- decorator 안의 side effect는 class import 시점에 발생할 수 있다.
- 반환한 wrapper가 원래 `this`, 인수, sync/async 반환 계약을 보존하는지 검사한다.
- metadata는 타입 검증이 아니다. 외부 payload는 별도 runtime validator를 거친다.
- 반복되는 횡단 관심사가 아니면 명시적 함수 호출이 제어 흐름과 테스트를 더 잘 드러낼 수 있다.
- library는 legacy/proposal 중 지원하는 모델과 필요한 compiler option을 공개 계약에 적는다.

## 관련 문서

- [[TS-Declaration-Spaces-and-Inference|타입 공간과 값 공간]]
- [[TS-Class-Type-System|TypeScript 클래스 타입 시스템]]
- [[NestJS-Core-Concepts|NestJS 핵심 개념]]
- [[Decorator패턴이란|Decorator 디자인 패턴]]

## 출처

- [TypeScript Handbook, Decorators](https://www.typescriptlang.org/docs/handbook/decorators)
- [TypeScript 5.0, Decorators](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#decorators)
- [TypeScript 4.9, Auto-Accessors in Classes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#auto-accessors-in-classes)
- [TypeScript 3.7, The useDefineForClassFields Flag](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#the-usedefineforclassfields-flag-and-the-declare-property-modifier)
- [TypeScript TSConfig, useDefineForClassFields](https://www.typescriptlang.org/tsconfig/#useDefineForClassFields)
- [TypeScript Handbook, Mixins](https://www.typescriptlang.org/docs/handbook/mixins.html)
- [TC39, proposal-decorators](https://github.com/tc39/proposal-decorators)
- [TC39, ecma262 PR #2417 Add Class and Class Element Decorators and accessor Keyword](https://github.com/tc39/ecma262/pull/2417)
- [ECMAScript Language Specification, DefineField](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-definefield)
- [Announcing TypeScript 6.0 — TypeScript DevBlog](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- yongsoocho, [decorator 개요](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138452)
- yongsoocho, [class decorator](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138763)
- yongsoocho, [property decorator](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=140809)
- yongsoocho, [method decorator](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138765)
- yongsoocho, [builder를 decorator로 구현해보자!](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=150434)
- yongsoocho, [inheritance](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=139590)
