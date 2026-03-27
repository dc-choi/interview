---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["Middleware 패턴이란?"]
---

# Middleware 패턴이란?
여러 개의 처리 함수를 체인 형태로 연결하여 요청을 순차적으로 처리하는 패턴. Chain of Responsibility의 Node.js 구현이다.

## 왜 쓸까?

### 관심사 분리
인증, 로깅, 검증 등을 독립 모듈로 분리한다.

### 조합 가능
미들웨어를 자유롭게 추가/제거/재배치할 수 있다.

### 재사용
같은 미들웨어를 다른 라우트에 적용할 수 있다.

### 에러 처리 통합
체인 중 에러 발생 시 즉시 중단하고 에러 핸들러로 전달한다.

## 핵심 개념

### Express 스타일
```typescript
function middleware(req: any, res: any, next: (err?: Error) => void) {
  // 처리 로직
  next() // 다음 미들웨어로
}
```
- next()를 호출해야 다음 미들웨어로 진행
- next(err)로 에러를 전달하면 에러 핸들링 미들웨어로 이동
- 에러 핸들러: (err, req, res, next) 4개 파라미터

### Koa 스타일 (Onion Model)
```typescript
async function middleware(ctx: any, next: () => Promise<void>) {
  // 요청 처리 (downstream)
  await next()
  // 응답 처리 (upstream) — 다음 미들웨어 실행 후 돌아옴
}
```
- async/await 기반
- next() 전후로 로직 분리 가능 (양파 모델)
- try-catch로 하위 미들웨어 에러 포착

### NestJS 미들웨어 체계
| 단계 | 역할 | 실행 시점 |
|------|------|----------|
| Middleware | 요청 전처리 | 라우트 핸들러 전 |
| Guard | 인증/인가 | 미들웨어 후, 인터셉터 전 |
| Interceptor | 요청/응답 변환 | 가드 후, 파이프 전/핸들러 후 |
| Pipe | 데이터 변환/검증 | 핸들러 직전 |
| ExceptionFilter | 에러 처리 | 예외 발생 시 |

### 5가지 미들웨어 예시 (Express)
1. Logging: 요청 경로와 소요 시간 기록
2. Auth: Authorization 헤더 확인, 사용자 ID 부여
3. Permission: 역할 기반 접근 제어 (RBAC)
4. Data: 응답 데이터 구조화
5. Response: 최종 응답 포맷팅

## 실 사용 사례
1. Express/Koa: HTTP 요청 처리 파이프라인
2. NestJS: Guards, Interceptors, Pipes, Filters
3. Redux: 액션 처리 미들웨어 (thunk, saga)
4. Axios: 요청/응답 인터셉터
