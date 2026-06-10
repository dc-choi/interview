---
tags: [nestjs, aop, interceptor, observable, rxjs]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS Interceptor Observable 설계", "Promise vs Observable AOP"]
---

# NestJS AOP Interceptor — Observable 설계 의도

## Promise vs Observable — AOP 관점 비교

| 능력 | Promise | Observable |
|---|---|---|
| 최종 결과 하나 전달 | ✅ | ✅ |
| **여러 값 emit** (스트리밍, SSE) | ✗ | ✅ |
| **취소(unsubscribe)** | ✗ | ✅ |
| **연산자 체이닝** (map, tap, retry, timeout) | 제한적 | ✅ 수십 종 |
| **라이프사이클 훅** (시작, 진행, 완료, 에러) | 일부 | ✅ 전부 |
| **재시도 로직** | 수동 구현 | `retry(N)` 한 줄 |
| **다수 관찰자** | 불가 | ✅ multicast |

AOP는 **"원본 코드를 손대지 않고 횡단 관심사를 끼워 넣는" 기술**. 로깅, 캐싱, 재시도, 모니터링, 권한 체크 — 이 모든 게 **함수의 시작, 진행, 완료, 에러, 취소 지점**에 개입이 필요. Promise는 **완료 시점 하나**만 잡을 수 있어 AOP 도구로 부족.

## Observable이 여는 AOP Join Point

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

| 연산자 | Join Point | 비고 |
|--------|-----------|------|
| `intercept()` 진입 | before | — |
| `tap` | after success | 부수 효과만 |
| `catchError` | on error | 가로채기, 변환 |
| `finalize` | 성공, 실패, 취소 무관 종료 | 정리 로직 |
| `map` | transform | `{ success, data, timestamp }` envelope |
| `retry({ count, delay })` | 재시도 | 외부 호출 모듈에 |
| `timeout(ms)` | 타임아웃 | 단일 라인 |
| 스트리밍(`@Sse`) | chunk 단위 가로채기 | Promise는 첫 chunk만 가능 |

## Observable이 싫다면

RxJS 학습 곡선이 부담이면 `firstValueFrom()`/`lastValueFrom()`로 Promise 변환, Middleware 대체 가능. 단 **재시도, 스트리밍, 취소, finalize**는 Observable 아니면 제대로 안 됨.

## 관련 문서
- [[NestJS-AOP-Interceptor|NestJS AOP Interceptor (TOC)]]
