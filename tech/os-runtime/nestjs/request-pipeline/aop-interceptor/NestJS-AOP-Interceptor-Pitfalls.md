---
tags: [nestjs, aop, interceptor, observable, rxjs]
status: done
category: "OS & Runtime - NestJS"
aliases: ["Interceptor vs Exception Filter", "NestJS Interceptor 흔한 실수"]
---

# NestJS AOP Interceptor — Exception Filter 구분, 흔한 실수, 면접 체크포인트

## Interceptor vs Exception Filter

| 축 | Interceptor | Exception Filter |
|---|---|---|
| 목적 | 횡단 관심사 (로깅, 캐싱, 변환) | 예외 → HTTP 응답 변환 |
| 적용 시점 | 요청 → 응답 전체 라이프사이클 | 예외 발생 시만 |
| 여러 개 중첩 | ✅ 순차 체이닝 | 예외 타입별 match |
| 응답 가로채기 | ✅ `map`, `tap` | 예외만 처리 |

**보완 관계**. Prisma 에러 변환은 Interceptor가 적합 (비즈니스 로직에서 발생한 정상 흐름도 같이 처리 가능). 순수 "예외 → 응답" 매핑은 Exception Filter.

## 흔한 실수

- **Interceptor에서 `await`로 Observable 소비** → 스트리밍 깨짐. `.pipe()` 체이닝 유지
- **`tap` vs `map` 혼동** — `tap`은 부수 효과, `map`은 값 변환
- **Observable 에러를 `try-catch`로** → 안 잡힘. `catchError` 연산자로
- **모든 것에 Interceptor** → 경로마다 가로채기 누적. 적용 범위 의식

## 면접 체크포인트

- Interceptor가 `Observable`을 반환해야 하는 설계 의도
- Promise로 불가능한 AOP 케이스 4가지 (스트리밍, 취소, 재시도, finalize)
- `tap`, `map`, `catchError`, `finalize` 각각의 AOP 역할
- Interceptor vs Exception Filter 구분
- 메타데이터 + Reflector로 메서드별 설정 구현
- Prisma 같은 라이브러리 에러를 AOP로 중앙화하는 이점

## 관련 문서
- [[NestJS-AOP-Interceptor|NestJS AOP Interceptor (TOC)]]
