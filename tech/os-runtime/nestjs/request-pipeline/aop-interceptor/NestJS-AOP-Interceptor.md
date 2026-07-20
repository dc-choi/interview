---
tags: [nestjs, aop, interceptor, observable, rxjs]
status: index
category: "OS & Runtime - NestJS"
aliases: ["NestJS AOP Interceptor", "Observable AOP"]
---

# NestJS Interceptor — Observable 기반 AOP 설계

NestJS가 Interceptor 반환값으로 **Promise가 아닌 `Observable`** 을 요구하는 건 의도된 설계다. "RxJS를 싫어하는 팀"에 불편이지만, **AOP 관점에서 Observable은 Promise로 못 하는 일을 한다**. 이 문서는 왜 그런 설계가 나왔는지와, AOP 도구로 활용하는 실전 패턴.

- [[NestJS-AOP-Interceptor-Observable-Design|Promise vs Observable 비교, AOP Join Point, Observable 대체 옵션]]
- [[NestJS-AOP-Interceptor-Patterns|응답 envelope, 캐싱, 조건부 재시도 패턴과 Prisma 에러 중앙 처리]]
- [[NestJS-AOP-Interceptor-Pitfalls|Exception Filter와의 구분, 흔한 실수, 면접 체크포인트]]

## 출처
- [NestJS — Interceptors](https://docs.nestjs.com/interceptors)
- [velog @miinhho — NestJS Interceptor가 Observable을 강제하는 AOP 설계 철학](https://velog.io/@miinhho/NestJS-Interceptor%EA%B0%80-Observable%EC%9D%84-%EA%B0%95%EC%A0%9C%ED%95%98%EB%8A%94-AOP-%EC%84%A4%EA%B3%84-%EC%B2%A0%ED%95%99)
- [velog @miinhho — NestJS AOP를 활용한 Prisma 에러 처리 리팩토링](https://velog.io/@miinhho/NestJS-AOP%EB%A5%BC-%ED%99%9C%EC%9A%A9%ED%95%9C-Prisma-%EC%97%90%EB%9F%AC-%EC%B2%98%EB%A6%AC-%EB%A6%AC%ED%8C%A9%ED%86%A0%EB%A7%81)

## 관련 문서
- [[NestJS|NestJS 개요, 요청 파이프라인]]
- [[NestJS-vs-Spring|NestJS vs Spring (AOP 비교)]]
- [[NestJS-Custom-Decorator|NestJS 커스텀 데코레이터]]
- [[Spring-Exception-Handling|Spring Exception Handling]]
