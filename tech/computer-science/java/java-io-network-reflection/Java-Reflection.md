---
tags: [java, reflection, metadata, module, framework]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Reflection", "Java 리플렉션"]
---

# Java reflection

reflection은 loaded class의 field, method, constructor와 annotation metadata를 runtime에 읽고 제한된 범위에서 호출하거나 값을 접근하는 API다. framework, serializer, test tool과 dependency injection container의 일반화된 infrastructure에는 유용하지만, compile-time type safety와 encapsulation을 약하게 만든다.

## `Class<?>`가 진입점이다

```java
Class<?> type = instance.getClass();
Method method = type.getDeclaredMethod("handle", Request.class);
Object result = method.invoke(instance, request);
```

class literal, instance의 `getClass()`, `Class.forName()` 등으로 metadata에 접근할 수 있다. `Class.forName()`은 name typo를 compile time에 잡지 못하고 class loading/initialization side effect를 가질 수 있으므로 plugin boundary처럼 필요한 곳에 제한한다.

## public view와 declared view

| API 계열 | 보는 범위 |
|---|---|
| `getMethods`, `getFields`, `getConstructors` | 접근 가능한 public member, inherited public member 포함 가능 |
| `getDeclaredMethods`, `getDeclaredFields`, `getDeclaredConstructors` | 해당 class가 직접 선언한 member, 접근 수준 전체 |

declared member 조회가 곧 접근 권한 획득은 아니다. 탐색 범위와 실제 access check를 분리한다.

## invocation failure를 unwrap한다

`Method.invoke()`는 다음 실패를 구분한다.

- method 이름 또는 parameter type을 잘못 찾음
- target instance와 argument type 불일치
- Java access 또는 module 경계 위반
- 호출된 method 자체가 던진 exception, `InvocationTargetException`의 cause로 전달

framework boundary에서 reflection exception을 그대로 business layer에 노출하지 말고 startup configuration error, client input error와 target execution error로 변환한다.

## private access에는 module 경계가 있다

`setAccessible(true)`는 모든 encapsulation을 무조건 해제하지 않는다. Java Platform Module System에서 caller module에 package가 열려 있지 않으면 `InaccessibleObjectException`이 발생할 수 있다. `trySetAccessible()`은 가능한지 boolean으로 확인하는 선택지를 제공한다.

- public API나 명시적으로 열린 package를 우선한다.
- `--add-opens`를 무심코 전역 적용하지 말고 필요한 module/package와 운영 위험을 기록한다.
- framework upgrade 때 internal field name에 의존한 reflection이 깨질 수 있음을 test한다.

## metadata를 startup에 compile한다

매 request에 class를 전부 scan하지 않는다.

```text
startup scan -> validate -> immutable metadata cache -> request lookup/invoke
```

cache의 목표는 단순 성능뿐 아니라 duplicate mapping, 잘못된 signature와 접근 실패를 traffic 전에 발견하는 것이다. 다만 dynamic class loading과 hot reload가 있으면 cache invalidation contract가 필요하다.

## 적합한 곳과 피할 곳

| 적합한 경계 | 피해야 할 징후 |
|---|---|
| framework extension, mapper, serializer, test tooling | 일반 business rule의 method 이름을 문자열로 조립 |
| annotation 기반 registry | private field를 무차별 수정해 invariant 우회 |
| plugin discovery | compile error로 잡을 문제를 runtime까지 미룸 |

null field를 일괄 변경하는 generic utility는 간단해 보여도 immutable object, record, validation과 domain invariant를 깨뜨릴 수 있다. 명시적 mapper나 constructor가 더 적합한지 먼저 검토한다.

## NestJS와 TypeScript로 옮길 때

TypeScript type은 대부분 runtime에 지워지고 decorator metadata도 compiler/runtime 설정과 library에 의존한다. NestJS는 decorator와 provider token metadata를 framework가 읽지만 Java reflection만큼 모든 static type 정보를 보존하지 않는다. runtime schema, explicit token과 validation metadata를 별도로 설계한다.

## 점검 질문

- reflection이 infrastructure의 반복을 줄이는가, business 흐름을 숨기는가?
- startup에 signature와 duplicate metadata를 검증하는가?
- `InvocationTargetException`의 target cause를 보존하는가?
- module access를 공식 API 대신 억지로 열고 있지 않은가?
- metadata cache와 class lifecycle이 일치하는가?

## 출처

- [Java SE 26, java.lang.reflect](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/reflect/package-summary.html)
- [Java SE 26, AccessibleObject](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/reflect/AccessibleObject.html)
- 김영한 강사, [reflection이 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244495), [class와 metadata](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244496), [method 탐색과 호출](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244497), [field 탐색과 변경](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244498)
- 김영한 강사, [reflection 활용](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244499), [constructor와 객체 생성](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244500), [reflection servlet](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244501), [정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244502)

## 관련 문서

- [[Java-Annotations|Java annotation]]
- [[Spring-IoC-DI-and-Bean-Lifecycle|Spring IoC, DI와 Bean 생명주기]]
- [[Spring-AOP-Proxy-Factory|Spring AOP Proxy Factory]]
- [[Java-HTTP-Server-From-Socket-to-Routing|Java HTTP server 내부]]
