---
tags: [jpa, spring-data-jpa, repository]
status: index
category: "OS & Runtime"
aliases: ["Spring Data JPA", "Spring Data JPA Essentials"]
---

# Spring Data JPA

Spring Data JPA는 Jakarta Persistence 위에서 repository 구현, 쿼리 조립, 페이징과 감사 같은 반복 작업을 줄인다. 추상화가 영속성 컨텍스트, 트랜잭션, SQL 비용을 없애지는 않으므로 생성 쿼리와 실행 계획까지 함께 검증한다.

## 학습 순서

- [[Spring-Data-JPA-Repository-Abstraction|Repository 추상화와 설정]]
- [[Spring-Data-JPA-Entity-Persistence|엔티티 저장과 신규 판별]]
- [[Spring-Data-JPA-Query-Methods|쿼리 메서드, 벌크, fetch plan과 lock]]
- [[Spring-Data-JPA-Paging-and-Web|페이징과 웹 경계]]
- [[Spring-Data-JPA-Custom-Repositories|사용자 정의 repository fragment]]
- [[Spring-Data-JPA-Auditing|Auditing]]
- [[Spring-Data-JPA-Projections-and-Native-Queries|Projection과 native query]]
- [[Spring-Data-JPA-Specification-and-QBE|Specification과 Query by Example]]
- [[Querydsl|Querydsl]]: Type-safe 동적 query, DTO projection과 repository 결합

## 선행 지식

- [[JPA-Persistence-Context|영속성 컨텍스트]]
- [[JPA-JPQL|JPQL과 HQL]]
- [[Spring-Transactional|Spring 트랜잭션]]
