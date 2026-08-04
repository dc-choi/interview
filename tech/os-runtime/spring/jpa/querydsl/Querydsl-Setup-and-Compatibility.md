---
tags: [querydsl, jpa, annotation-processing, jakarta-persistence]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Querydsl Setup", "Querydsl 설정", "Querydsl Q Type"]
---

# Querydsl 설정과 버전 호환성

Querydsl 설정의 핵심은 runtime library와 annotation processor를 같은 artifact 계열로 맞추고, 현재 `jakarta.persistence` entity에서 Q type을 재현 가능하게 생성하는 것이다. 오래된 Spring Boot 2와 `javax.persistence` 설정을 그대로 복사하면 compile classpath가 섞인다.

## Project 계보와 선택

2026-08-04 기준 원본 `querydsl/querydsl`의 최신 release는 5.1.0이며 maintenance가 느려졌다. 활성 community fork인 OpenFeign Querydsl의 최신 release는 7.5다. Spring Data JPA 4.1은 OpenFeign fork를 best-effort로 지원한다.

두 계열은 group ID와 classifier 규칙이 다르다. 한 project 안에서 runtime과 APT artifact 계열을 섞지 않고, Spring Boot, Hibernate, Jakarta Persistence, Java version 조합을 integration test로 고정한다.

| 계열 | JPA runtime | APT |
|---|---|---|
| OpenFeign | `io.github.openfeign.querydsl:querydsl-jpa` | `io.github.openfeign.querydsl:querydsl-apt:jpa` |
| 원본 5.1 | `com.querydsl:querydsl-jpa:jakarta` | `com.querydsl:querydsl-apt:jakarta` |

OpenFeign fork도 Java package는 호환성을 위해 `com.querydsl.*`를 사용한다. 바뀌는 것은 dependency group ID와 classifier 조합이지 application import prefix가 아니다.

OpenFeign 계열의 최소 Gradle 예시는 다음과 같다. Version은 dependency catalog나 project property 한 곳에서 관리한다.

```groovy
dependencies {
    implementation "io.github.openfeign.querydsl:querydsl-jpa:${querydslVersion}"
    annotationProcessor "io.github.openfeign.querydsl:querydsl-apt:${querydslVersion}:jpa"
    annotationProcessor "jakarta.persistence:jakarta.persistence-api"

    testAnnotationProcessor "io.github.openfeign.querydsl:querydsl-apt:${querydslVersion}:jpa"
    testAnnotationProcessor "jakarta.persistence:jakarta.persistence-api"
}
```

원본 5.1 계열을 유지한다면 runtime과 APT 모두 `jakarta` classifier를 사용한다. Java 22 이상은 annotation processor 자동 탐색에 기대지 말고 processor path를 명시한다.

## Q type 생성과 수명주기

APT는 entity의 type과 property path를 표현하는 `QMember`, `QTeam` 같은 source를 build generated-sources directory에 만든다. Q type은 schema migration 결과가 아니라 Java mapping의 파생물이다.

- Generated directory를 IDE source root로 인식시킨다.
- Clean build와 CI compile에서 Q type이 다시 생성되는지 검증한다.
- 일반적으로 generated source는 commit하지 않는다.
- Entity field를 바꾼 뒤 stale Q type을 수동 수정하지 말고 clean regenerate한다.
- Main과 test entity를 처리해야 하면 test annotation processor도 명시한다.

```java
QMember member = QMember.member;
QMember memberSub = new QMember("memberSub");
```

기본 instance나 static import는 짧은 query에 편리하다. 같은 entity가 outer query와 subquery에 함께 나오면 alias가 다른 Q instance를 만든다.

## Spring 구성

```java
@Configuration
class QuerydslConfig {
    @Bean
    JPAQueryFactory jpaQueryFactory(EntityManager entityManager) {
        return new JPAQueryFactory(entityManager);
    }
}
```

Spring이 주입하는 shared `EntityManager` proxy는 현재 transaction에 연결된 실제 manager로 위임한다. `JPAQueryFactory`는 호출마다 새 query object를 만들므로 이 정상 구성에서는 singleton bean으로 사용할 수 있다. 실제 `EntityManager`를 thread 사이에 직접 공유하거나 query instance를 재사용하는 것은 안전하지 않다.

## 개발 환경의 역할

H2 memory 또는 file DB, `ddl-auto=create`, SQL formatting, P6Spy는 local 실습과 query 관찰에 유용하다. 운영 schema는 migration으로 관리하고, bind value logging은 개인정보와 credential을 노출할 수 있으므로 환경별로 제한한다. Member와 Team 같은 작은 relation model도 양방향 편의 method보다 FK owner, lazy loading과 transaction 경계를 먼저 검증한다.

## 설정 검증 순서

1. Clean compile에서 Q type이 생성된다.
2. Test와 application runtime classpath에 같은 Querydsl 계열이 있다.
3. `jakarta.persistence` entity를 processor가 인식한다.
4. 간단한 `JPAQueryFactory.selectFrom(QMember.member)` query가 실행된다.
5. JPQL, bind value와 최종 SQL을 필요한 환경에서 관찰한다.

## 출처

- [Spring Data JPA 4.1, Querydsl extension and annotation processing](https://docs.spring.io/spring-data/jpa/reference/repositories/core-extensions.html)
- [OpenFeign Querydsl 7.5 release](https://github.com/OpenFeign/querydsl/releases/tag/7.5)
- [Original Querydsl releases](https://github.com/querydsl/querydsl/releases)
- [OpenFeign Querydsl JPA tutorial](https://openfeign.github.io/querydsl/tutorials/jpa/)
- [소개](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=27939)
- [강의 자료](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30112)
- [프로젝트 생성](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30114)
- [Querydsl 설정과 검증](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30115)
- [라이브러리 살펴보기](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30116)
- [H2 데이터베이스 설치](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30117)
- [스프링 부트 설정, JPA와 DB](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30118)
- [예제 domain model과 동작 확인](https://www.inflearn.com/courses/lecture?courseId=324476&unitId=30120)
- [Querydsl 설정](https://www.inflearn.com/courses/lecture?courseId=328990&unitId=114669)

## 관련 문서

- [[JPA-Ecosystem-and-Version-Migration|JPA 생태계와 버전 전환]]
- [[JPA-Entity-Mapping|JPA entity mapping]]
- [[Querydsl-Repository-and-Paging|Querydsl repository 구성]]
