---
tags: [nestjs, decorator, metadata, aop]
status: done
category: "OS & Runtime - NestJS"
aliases: ["@toss/nestjs-aop과 흔한 실수", "커스텀 데코레이터 함정과 면접 체크포인트"]
---

# NestJS 커스텀 데코레이터 — 라이브러리와 흔한 실수

## 오픈소스: @toss/nestjs-aop

위의 3단계 구조(마킹, 탐색, 실행)를 라이브러리화한 **`@toss/nestjs-aop`**. 보일러플레이트 크게 감소.

```ts
// 1. Aspect 정의
@Aspect(CacheableSymbol)
export class CacheableAspect implements LazyDecorator<any, CacheOptions> {
  wrap({ method, metadata }: WrapParams<any, CacheOptions>) {
    return async (...args: any[]) => {
      // 캐시 로직
      return method(...args);
    };
  }
}

// 2. Decorator 생성
export const Cacheable = (options: CacheOptions) =>
  createDecorator(CacheableSymbol, options);

// 3. 사용
class UserService {
  @Cacheable({ ttl: 60 })
  getUser(id: string) { ... }
}
```

직접 DiscoveryService, MetadataScanner 다루는 대신 `@Aspect`, `LazyDecorator` 추상화로. 팀 내 AOP 데코레이터가 많아지면 도입 고려.

## 흔한 실수

| 함정 | 증상, 원인 | 대응 |
|------|----------|------|
| 메타데이터 소실 | 래퍼 교체 후 Guard 동작 안 함 — prototype/메타데이터 복사 누락 | `Object.setPrototypeOf` + 메타데이터 키 복사 |
| 순환 의존 | Explorer ↔ 다른 Provider ↔ 커스텀 데코레이터 사용처 | Lazy 주입 또는 별도 초기화 단계 |
| 테스트 어려움 | 래핑된 메서드가 원본과 다르게 동작 | Aspect Mock 교체, 핵심 로직은 데코레이터 없이 호출 |
| 과도한 AOP | 모든 반복을 데코레이터로 → 디버깅, 학습 곡선 폭증 | 진짜 횡단적인 것만(캐싱, 로깅, 권한, 트랜잭션) |

## 면접 체크포인트

- NestJS 커스텀 데코레이터의 3단계 (마킹, 탐색, 실행)
- `SetMetadata` + `Reflector` 조합 원리
- `DiscoveryService`, `MetadataScanner`가 OnModuleInit에서 하는 일
- 메서드 래핑 시 메타데이터 보존 방법
- `createParamDecorator`의 용도와 예시
- `applyDecorators`로 여러 데코레이터를 묶는 이유
- 과도한 AOP, 데코레이터 남용의 폐해

## 출처
- [NestJS — Custom decorators](https://docs.nestjs.com/custom-decorators)
- [Toss Tech — NestJS 환경에 맞는 Custom Decorator 만들기](https://toss.tech/article/nestjs-custom-decorator)

## 관련 문서
- [[NestJS-Custom-Decorator|NestJS 커스텀 데코레이터 (TOC)]]
- [[NestJS-Custom-Decorator-Pipeline|커스텀 데코레이터 3단계 구조]]
- [[NestJS-Custom-Decorator-Patterns|커스텀 데코레이터 활용 패턴]]
