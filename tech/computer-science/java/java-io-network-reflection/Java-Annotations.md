---
tags: [java, annotation, metadata, reflection, validation]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Annotations", "Java 애노테이션"]
---

# Java annotation

annotation은 program element에 구조화된 metadata를 붙이는 언어 기능이다. 그 자체로 동작을 수행하지 않으며 compiler, annotation processor 또는 runtime reflection consumer가 읽을 때 의미가 생긴다.

## annotation type과 element

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Route {
    String value();
    String method() default "GET";
}
```

element type에는 primitive, `String`, `Class`, enum, annotation과 이들의 1차원 array처럼 Java Language Specification이 허용한 값만 쓸 수 있다. `value` 하나만 지정할 때 이름을 생략할 수 있지만 여러 element를 쓰면 의도를 명확히 적는 편이 안전하다.

## retention은 consumer 시점을 결정한다

| 정책 | 보존 범위 | 대표 consumer |
|---|---|---|
| `SOURCE` | source에서만 존재 | compiler lint, source tool |
| `CLASS` | class file에 기록, runtime 보존 의무 없음 | bytecode tool |
| `RUNTIME` | VM runtime까지 보존 | reflection framework |

`@Retention`을 생략하면 기본은 `CLASS`다. runtime router나 validator가 reflection으로 읽어야 하면 `RUNTIME`을 명시한다.

## target을 좁혀 잘못된 사용을 막는다

`@Target`은 type, field, method, parameter, constructor, type use 등 허용 위치를 제한한다. annotation consumer가 method만 처리한다면 `METHOD`로 좁혀 compiler가 오용을 잡게 한다.

`@Documented`는 API documentation contract에 포함할 metadata를 표시한다. `@Repeatable`은 같은 annotation을 여러 번 붙일 container 관계를 정의한다.

## `@Inherited`의 좁은 의미

`@Inherited`는 class declaration의 annotation을 subclass 조회에서 상속된 것처럼 보이게 하는 규칙이다.

- interface의 annotation이 implementing class로 전달되는 규칙이 아니다.
- method, field와 constructor annotation을 상속시키지 않는다.
- declared annotation API와 inherited lookup API의 결과가 다르다.
- framework는 자체 hierarchy 탐색과 meta-annotation 규칙을 구현할 수 있으므로 Java 기본 규칙과 구분한다.

## reflection 기반 validation의 경계

`@NotEmpty`, `@Range` 같은 metadata와 validator를 연결하면 반복 검증을 줄일 수 있다. 하지만 annotation 하나로 validation 전체를 표현하려고 하면 cross-field rule, database state와 authorization이 숨는다.

- startup에 지원 field type과 annotation 조합을 검증한다.
- validation failure를 field path와 stable error code로 반환한다.
- reflection으로 private final field를 수정하지 않는다.
- input shape 검증과 domain invariant를 분리한다.
- 이미 검증된 object라는 보장을 type 또는 constructor boundary로 전달한다.

## route metadata 설계

annotation route는 method 이름 convention보다 refactor에 강하지만 다음 startup validation이 필요하다.

- duplicate HTTP method/path
- 지원하지 않는 parameter type
- inaccessible method
- ambiguous route ordering
- missing content type와 authentication policy

metadata scan 결과를 immutable route table로 만든 뒤 request path에서는 lookup만 수행한다.

## NestJS decorator와 비교

NestJS decorator도 class와 method metadata를 framework scanner가 읽는 방식이다. TypeScript의 static type 전체가 runtime에 남는 것은 아니므로 DTO validation에는 explicit decorator/schema와 transformation policy가 필요하다. custom decorator는 metadata를 붙이는 일과 guard/interceptor가 실제 정책을 실행하는 일을 분리한다.

## 점검 질문

- annotation consumer가 compiler, processor, runtime 중 누구인가?
- retention과 target이 consumer 요구만큼 좁은가?
- Java `@Inherited`와 framework의 hierarchy 탐색을 구분했는가?
- validation metadata가 domain invariant와 authorization을 대신하지 않는가?
- route metadata 오류를 startup에 검출하는가?

## 출처

- [Java SE 26, java.lang.annotation](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/annotation/package-summary.html)
- [Java SE 26, RetentionPolicy](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/annotation/RetentionPolicy.html)
- [Java Language Specification 26, Annotation Interfaces](https://docs.oracle.com/javase/specs/jls/se26/html/jls-9.html#jls-9.6)
- 김영한 강사, [annotation이 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244504), [annotation 정의](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244505), [meta-annotation](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244506), [annotation inheritance](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244507)
- 김영한 강사, [annotation validator](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244508), [Java 기본 annotation](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244509), [정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244510)

## 관련 문서

- [[Java-Reflection|Java reflection]]
- [[Java-HTTP-Server-From-Socket-to-Routing|Java HTTP server 내부]]
- [[NestJS-vs-Spring-Pipeline-AOP|NestJS와 Spring pipeline]]
