---
tags: [nestjs, aop, interceptor, observable, rxjs]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS AOP Interceptor", "Observable AOP"]
---

# NestJS Interceptor — Observable 기반 AOP 설계

NestJS가 Interceptor 반환값으로 **Promise가 아닌 `Observable`** 을 요구하는 건 의도된 설계다. "RxJS를 싫어하는 팀"에 불편이지만, **AOP 관점에서 Observable은 Promise로 못 하는 일을 한다**. 이 문서는 왜 그런 설계가 나왔는지와, AOP 도구로 활용하는 실전 패턴.

## Promise vs Observable — AOP 관점 비교

| 능력 | Promise | Observable |
|---|---|---|
| 최종 결과 하나 전달 | ✅ | ✅ |
| **여러 값 emit** (스트리밍·SSE) | ✗ | ✅ |
| **취소(unsubscribe)** | ✗ | ✅ |
| **연산자 체이닝** (map·tap·retry·timeout) | 제한적 | ✅ 수십 종 |
| **라이프사이클 훅** (시작·진행·완료·에러) | 일부 | ✅ 전부 |
| **재시도 로직** | 수동 구현 | `retry(N)` 한 줄 |
| **다수 관찰자** | 불가 | ✅ multicast |

AOP는 **"원본 코드를 손대지 않고 횡단 관심사를 끼워 넣는" 기술**. 로깅·캐싱·재시도·모니터링·권한 체크 — 이 모든 게 **함수의 시작·진행·완료·에러·취소 지점**에 개입이 필요. Promise는 **완료 시점 하나**만 잡을 수 있어 AOP 도구로 부족.

## Observable이 여는 AOP Join Point

### 시작 전 (before)
```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('before handler');
    return next.handle().pipe(
      tap(() => console.log('after success')),
      catchError(err => { console.error('on error', err); throw err; }),
      finalize(() => console.log('always, even on cancel')),
    );
  }
}
```

- **before**: `intercept()` 진입 시점
- **tap (after success)**: 스트림에 값 도착 시
- **catchError**: 에러 발생 시 가로채기·변환
- **finalize**: 성공·실패·취소 구분 없이 종료 시 (정리 로직)

Promise 기반으로는 `catchError` 후 `finalize`를 깔끔히 조합 못 함.

### 변환 (transform)
```ts
return next.handle().pipe(
  map(data => ({ success: true, data, timestamp: Date.now() })),
);
```
모든 응답에 envelope 씌우기 — 핸들러는 몰라도 됨.

### 재시도 (retry)
```ts
return next.handle().pipe(
  retry({ count: 3, delay: 1000 }),
);
```
외부 서비스 호출 Interceptor에 붙이면 실패 시 자동 재시도.

### 타임아웃
```ts
return next.handle().pipe(
  timeout(5000),
);
```

### 스트리밍 응답 (SSE·LLM)
```ts
// Controller에서
@Sse('stream')
stream(): Observable<MessageEvent> { ... }

// Interceptor에서 각 emit 가로채기 가능
return next.handle().pipe(
  tap(chunk => log(chunk)),   // 청크마다 로깅
);
```
Promise였으면 **첫 chunk만** 처리 가능. Observable은 **모든 chunk** 라이프사이클 관리.

## 실전 패턴: Prisma 에러 중앙 처리

Prisma 쿼리 에러(`PrismaClientKnownRequestError` 등)를 각 Service에서 try-catch하는 건 중복. AOP Interceptor로 **중앙 처리 + 메서드별 커스텀 메시지**.

### 구조
```ts
// 1. 메타데이터 데코레이터
export const PrismaErrorHandler = (messages?: Record<string, string>) =>
  applyDecorators(
    UseInterceptors(PrismaErrorInterceptor),
    SetMetadata('prisma-error-messages', messages),
  );

// 2. Interceptor
@Injectable()
export class PrismaErrorInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const messages = this.reflector.get('prisma-error-messages', ctx.getHandler());

    return next.handle().pipe(
      catchError(err => {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          throw mapPrismaError(err, messages);   // 코드별 HttpException
        }
        throw err;
      }),
    );
  }
}

// 3. Service 사용
@PrismaErrorHandler({ P2002: '이미 존재하는 이메일입니다' })
async createUser(dto) {
  return this.prisma.user.create({ data: dto });
  // try-catch 없음. Interceptor가 처리
}
```

### 효과
- Service 메서드는 **순수 비즈니스 로직**만
- 에러 코드 매핑(P2002 → 409 Conflict 등)은 한 곳에서 유지
- 메서드별 메시지 커스터마이징은 메타데이터로
- 로깅·모니터링 추가도 Interceptor만 수정

## Interceptor vs Exception Filter

| 축 | Interceptor | Exception Filter |
|---|---|---|
| 목적 | 횡단 관심사 (로깅·캐싱·변환) | 예외 → HTTP 응답 변환 |
| 적용 시점 | 요청 → 응답 전체 라이프사이클 | 예외 발생 시만 |
| 여러 개 중첩 | ✅ 순차 체이닝 | 예외 타입별 match |
| 응답 가로채기 | ✅ `map`·`tap` | 예외만 처리 |

**보완 관계**. Prisma 에러 변환은 Interceptor가 적합 (비즈니스 로직에서 발생한 정상 흐름도 같이 처리 가능). 순수 "예외 → 응답" 매핑은 Exception Filter.

## Observable이 싫다면

RxJS 학습 곡선·팀 익숙도 이유로 피하고 싶으면:
- **Middleware**로 일부 대체 (단, DI 토큰·Guard·Pipe 등 NestJS 컨텍스트 접근 약함)
- **Exception Filter + Guard + Pipe** 조합으로 Interceptor 없이 가기
- `firstValueFrom()`·`lastValueFrom()`으로 Observable → Promise 변환

하지만 **재시도·스트리밍·취소·라이프사이클 finalize**를 제대로 쓰려면 Observable이 정답. Promise만 고집하면 NestJS의 AOP 의도 절반도 못 씀.

## 흔한 실수

- **Interceptor에서 `await`**로 Observable 소비 → 스트리밍 깨짐. `.pipe()` 체이닝 유지
- **`tap` vs `map` 혼동**: `tap`은 부수 효과만, `map`은 값 변환. 값 안 바꾸는데 `map` 쓰면 혼란
- **모든 것에 Interceptor** → 요청 경로마다 가로채기가 쌓여 성능 저하. 전역 vs 컨트롤러별 vs 메서드별 범위 의식
- **Observable 에러를 Promise처럼 `try-catch`** → 안 잡힘. `catchError` 연산자로

## 면접 체크포인트

- Interceptor가 `Observable`을 반환해야 하는 설계 의도
- Promise로 불가능한 AOP 케이스 4가지 (스트리밍·취소·재시도·finalize)
- `tap`·`map`·`catchError`·`finalize` 각각의 AOP 역할
- Interceptor vs Exception Filter 구분
- 메타데이터 + Reflector로 메서드별 설정 구현
- Prisma 같은 라이브러리 에러를 AOP로 중앙화하는 이점

## 출처
- [velog @miinhho — NestJS Interceptor가 Observable을 강제하는 AOP 설계 철학](https://velog.io/@miinhho/NestJS-Interceptor%EA%B0%80-Observable%EC%9D%84-%EA%B0%95%EC%A0%9C%ED%95%98%EB%8A%94-AOP-%EC%84%A4%EA%B3%84-%EC%B2%A0%ED%95%99)
- [velog @miinhho — NestJS AOP를 활용한 Prisma 에러 처리 리팩토링](https://velog.io/@miinhho/NestJS-AOP%EB%A5%BC-%ED%99%9C%EC%9A%A9%ED%95%9C-Prisma-%EC%97%90%EB%9F%AC-%EC%B2%98%EB%A6%AC-%EB%A6%AC%ED%8C%A9%ED%86%A0%EB%A7%81)

## 관련 문서
- [[NestJS|NestJS 개요 · 요청 파이프라인]]
- [[NestJS-vs-Spring|NestJS vs Spring (AOP 비교)]]
- [[NestJS-Custom-Decorator|NestJS 커스텀 데코레이터]]
- [[Spring-Exception-Handling|Spring Exception Handling]]
