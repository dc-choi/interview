---
tags: [cs, typescript, decorator, metadata]
status: done
verified_at: 2026-08-04
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

Decorator factory는 설정을 받아 실제 decorator를 반환한다. 적용 순서는 factory 평가와 decorator 호출을 구분해 확인하며, 여러 decorator가 상태와 descriptor를 바꾸면 합성 순서에 의존할 수 있다.

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
- yongsoocho, [decorator 개요](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138452)
- yongsoocho, [class decorator](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138763)
- yongsoocho, [property decorator](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=140809)
- yongsoocho, [method decorator](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=138765)
