---
tags: [nestjs, spring, framework, comparison]
status: index
category: "OS - Runtime - NestJS"
aliases: ["NestJS vs Spring", "Spring vs NestJS"]
---

# NestJS vs Spring (vs-spring 인덱스)

두 프레임워크는 **모듈 기반 구조, DI, 데코레이터(어노테이션) 중심 컴포넌트 조립**이라는 설계 철학을 공유한다. 실제로 NestJS는 Spring, Angular의 설계를 TypeScript/Node.js로 옮긴 것에 가까워 개념 매핑은 대부분 1:1로 성립하지만, **런타임 모델, DI 해석 시점, 생태계 성숙도**에서 분명한 차이가 있다. 축별 심화는 아래 문서로 분리.

- [[NestJS-vs-Spring-Runtime-DI|런타임과 DI — 동시성 모델, DI 해석 시점, 모듈 구조, 데코레이터 vs 어노테이션]]
- [[NestJS-vs-Spring-Pipeline-AOP|요청 파이프라인과 AOP — 컴포넌트 대응, 트랜잭션, 검증, 예외 처리]]
- [[NestJS-vs-Spring-Ecosystem-Practice|생태계와 실무 체감 — 성숙도, 선택 가이드, 면접 체크포인트]]

## 출처

- [Techeer — NestJS 프로젝트로 살펴본 Spring과의 비교](https://blog.techeer.net/nestjs-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8%EB%A1%9C-%EC%82%B4%ED%8E%B4%EB%B3%B8-spring%EA%B3%BC%EC%9D%98-%EB%B9%84%EA%B5%90-3ff0d50ff0ee)
- [velog @shin6949 — NodeJS NestJS를 쓰며 느낀 점 vs Java Spring](https://velog.io/@shin6949/NodeJS-NestJS%EB%A5%BC-%EC%93%B0%EB%A9%B0-%EB%8A%90%EB%82%80-%EC%A0%90-vs-Java-Spring)
- [Front-IT — NestJS와 Spring Framework 비교 분석](https://front-it.tistory.com/68)
- [researchwithme — NestJS Spring 비교](https://researchwithme.tistory.com/9)

## 관련 문서

- [[NestJS|NestJS Overview]]
- [[Clean-Architecture-NestJS|NestJS Clean Architecture]]
- [[Spring|Spring Overview]]
- [[Spring-Request-Lifecycle|Spring 요청 처리 흐름]]
- [[Spring-Transactional|Spring @Transactional]]
- [[Servlet-vs-Spring-Container|Servlet vs Spring Container]]
