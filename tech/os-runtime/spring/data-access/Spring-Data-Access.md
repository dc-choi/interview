---
tags: [spring, data-access, jdbc, mybatis, jpa, querydsl]
status: index
category: "OS & Runtime"
aliases: ["Spring Data Access", "Spring 데이터 접근"]
---

# Spring 데이터 접근

SQL mapper, ORM, repository와 transaction을 use case에 맞게 선택하고 같은 resource 경계에서 조합하는 학습 지도다.

## 학습 순서

- [[Spring-Data-Access-Strategy|데이터 접근 기술 선택과 조합]]
- [[Spring-JDBC-Essentials|Spring JDBC와 JdbcTemplate]]
- [[Spring-JDBC-Essentials-JdbcTemplate|JdbcTemplate API 계약 (결과 개수, 변경 행 수, 생성 key, 이름 binding)]]
- [[MyBatis-Spring-Essentials|MyBatis와 Spring]]
- [[JPA|JPA와 Jakarta Persistence]]
- [[Spring-Data-JPA-Essentials|Spring Data JPA]]
- [[Querydsl|Querydsl JPA]]
- [[Spring-Transactional|Spring transaction]]
- [[Spring-Transactional-Propagation|Spring transaction 전파 (전파가 필요한 이유, 물리와 논리 transaction, rollback-only, 부가 작업 분리)]]
- [[Spring-Transactional-Rollback-and-ReadOnly|Spring transaction rollback rule과 readOnly (checked 예외 commit, 업무 예외 설계, rollbackOn, 기술별 readOnly 효과)]]
- [[Spring-Transactional-Verification|Spring transaction 적용 확인 (조용한 미적용, 적용 위치 우선순위, 초기화 시점)]]
- [[Spring-Transaction-Events|Spring 트랜잭션 이벤트 (@TransactionalEventListener 계약, fallbackExecution, 발행 지점 검사)]]
- [[Transactional-Test-Antipattern|Spring database 통합 테스트]]
