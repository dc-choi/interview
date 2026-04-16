---
tags: [runtime, nestjs]
status: done
category: "OS & Runtime"
aliases: ["NestJS"]
---

# NestJS
Node.js의 프레임워크이다.

내부적으로 Express를 사용하며, 선택적으로 Fastify도 사용할 수 있음.

### 특징
1. TypeScript를 기본적으로 지원하여 타입 안정성 보장
2. 모듈화된 구조로 코드의 재사용성과 유지보수성 향상
3. Dependency Injection을 통한 느슨한 결합도
4. 데코레이터를 활용한 선언적 프로그래밍

## DI (Dependency Injection)

### IoC 컨테이너
- NestJS가 Provider의 **생성 · 주입 · 생명주기**를 관리
- `@Injectable()` 데코레이터로 Provider 등록 → constructor에서 **타입 기반 자동 주입**
- 개발자는 의존성을 직접 생성하지 않고, 컨테이너에 "무엇이 필요한지"만 선언

### Provider Scope

| Scope | 생명주기 | 사용 시점 |
|-------|---------|----------|
| **DEFAULT** | 싱글톤 (앱 전체에서 1개) | 대부분의 경우. 상태를 갖지 않는 서비스 |
| **REQUEST** | 요청마다 새 인스턴스 | 테넌트별 컨텍스트, 요청별 상태가 필요할 때 |
| **TRANSIENT** | 주입마다 새 인스턴스 | 주입받는 곳마다 독립 인스턴스가 필요할 때 |

- REQUEST/TRANSIENT scope는 **성능 비용**이 있으므로 필요한 경우에만 사용
- REQUEST scope Provider를 주입받으면 주입하는 쪽도 REQUEST scope가 됨 (scope 전파)

## 모듈 시스템

- `@Module()` 데코레이터로 관련 Provider/Controller를 논리적 단위로 묶음
- `imports`: 다른 모듈의 exported Provider를 가져옴
- `exports`: 이 모듈의 Provider를 외부에 공개
- `providers`: 이 모듈 내부에서 사용할 Provider
- `controllers`: 이 모듈의 HTTP 엔드포인트
- **순환 참조**: `forwardRef()`로 해결 가능하지만, 근본적으로는 모듈 의존 방향을 **단방향**으로 설계하는 것이 중요

## 요청 처리 파이프라인

```
Request → Middleware → Guard → Interceptor(pre) → Pipe → Handler → Interceptor(post) → Response
```

| 계층 | 역할 | 반환 |
|------|------|------|
| **Middleware** | 요청 전처리 (Express 호환, 로깅, CORS) | `next()` 호출 |
| **Guard** | 인가/인증 체크 | `true/false` (false면 403) |
| **Interceptor** | 요청·응답 양쪽 변환 (로깅, 캐싱, 응답 포맷) | `Observable` |
| **Pipe** | 데이터 변환/유효성 검증 | 변환된 값 or 예외 |
| **ExceptionFilter** | 예외를 HTTP 응답으로 변환 | 에러 응답 |

## 클린 아키텍처 적용

```
Controller (Interface Adapters)
  → UseCase (Application Core)
    → DomainService (핵심 비즈니스)
      → Repository Interface → Prisma Client (External Infrastructure)
```

- UseCase별로 사용자 의도를 분리 (JSON 응답용 vs 엑셀 다운로드용)
- 핵심 비즈니스 로직이 변경되어도 UseCase별 영향 최소화
- 고객사별 커스텀 요구를 UseCase 레벨에서만 분기해서 해결

자세한 NestJS 매핑(포트 인터페이스·Symbol 토큰·테스트 교체 전략): [[Clean-Architecture-NestJS|NestJS Clean Architecture 실전]]

### [[Controller]]

### [[Provider]]

### [[Request-Lifecycle|요청 라이프사이클]]

### 현장사례
- [[TS-Backend-Meetup-3#NestJS DI Deep Dive|DI Deep Dive]] — 메타데이터, 프로바이더 토큰, 의존성 처리 과정
