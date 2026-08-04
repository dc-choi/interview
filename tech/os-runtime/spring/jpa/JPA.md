---
tags: [jpa, jakarta-persistence, hibernate, orm]
status: index
category: "OS & Runtime"
aliases: ["JPA", "Jakarta Persistence", "JPA Hub"]
---

# JPA와 Jakarta Persistence

JPA는 객체 그래프와 관계형 스키마 사이의 반복 매핑을 줄이는 표준이다. 현재 표준명은 Jakarta Persistence이며, Hibernate는 대표 구현체, Spring Data JPA는 그 위의 repository 추상화다. 생산성은 SQL을 몰라도 된다는 뜻이 아니라, 매핑과 단위 작업을 선언하고 생성 SQL, 제약, 실행 계획을 검증하는 데서 나온다.

## 학습 순서

- [[JPA-Ecosystem-and-Version-Migration|생태계와 버전 전환]]: 표준, 구현체, Spring Data JPA, `javax`에서 `jakarta`로의 전환
- [[JPA-Persistence-Context|영속성 컨텍스트]]: 상태, 1차 캐시, 쓰기 지연, 변경 감지, flush와 detach
- [[JPA-Entity-Mapping|엔티티 매핑]]: entity 요건, schema 생성, field, identifier와 상속
- [[JPA-Relationship-Mapping|연관관계 매핑]]: FK 소유, 방향, 다중성과 관계 entity
- [[JPA-Loading-and-Cascade|로딩과 생명주기 전파]]: proxy, fetch plan, N+1, cascade와 orphan removal
- [[JPA-Value-Types|값 타입]]: embeddable, 불변성, equality와 element collection
- [[JPA-JPQL|JPQL과 HQL]]: projection, join, subquery, fetch join, named query와 bulk DML
- [[JPA-Aggregate-Collection-Mapping|애그리거트 컬렉션 매핑]]: root가 통제하는 자식, 순서와 조회 계획
- [[Spring-Data-JPA-Essentials|Spring Data JPA]]: repository, 저장, query, paging과 확장 기능
- [[Querydsl|Querydsl]]: Q type, 동적 predicate, projection과 query repository
- [[JPA-API-Performance|API 조회 성능]]: DTO 경계, fetch join, 컬렉션 조회, paging과 OSIV

## 함께 볼 문서

- [[ORM|ORM과 NestJS 영속성 선택]]
- [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
- [[Relational-Relationship-Modeling|관계형 연관관계 모델링]]
- [[Primary-Key-Strategy|기본 키 전략]]
