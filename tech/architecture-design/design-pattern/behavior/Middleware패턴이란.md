---
tags: [architecture, design-pattern]
status: done
verified_at: 2026-09-28
category: "Architecture & Design"
aliases: ["Middleware 패턴이란?"]
---

# Middleware 패턴이란?
여러 처리 함수를 순서대로 연결해 요청을 처리하는 파이프라인 패턴이다. 다음 처리자에게 제어를 넘긴다는 점은 Chain of Responsibility와 비슷하지만, 미들웨어는 요청과 응답을 가공한 뒤 다음 미들웨어로 계속 넘기는 흐름이 기본이고 Koa처럼 다음 미들웨어가 끝난 뒤 돌아와 후처리하기도 한다. 처리하거나 넘기는 둘 중 하나를 고르는 GoF [[ChainOfResponsibility패턴이란|Chain of Responsibility]]와 같은 것으로 보지 않는다.

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

## Express의 실행 순서와 실패 경계

미들웨어는 등록 순서에 따라 실행된다. `app.use()`와 Router의 마운트 경로는 적용 범위를 정하고, 본문 파서는 본문을 읽는 핸들러 앞에 둔다. 응답을 끝내지도 않고 `next()`도 호출하지 않으면 요청이 대기한다. 응답을 보낸 뒤 무조건 `next()`를 호출하면 뒤의 핸들러가 다시 응답하려 할 수 있다.

Express 5는 핸들러가 반환한 Promise의 거부를 오류 처리로 전달한다. Express 4에서는 직접 `.catch(next)` 같은 연결이 필요하다. 어느 버전이든 반환하지 않은 비동기 작업, 별도 타이머와 콜백의 오류가 자동으로 같은 경계에 포함되지는 않는다.

오류 미들웨어는 일반 라우트 뒤에 등록하고 `(err, req, res, next)`의 네 매개변수를 유지한다. 이미 헤더를 보냈다면 새 JSON을 쓰지 말고 `next(err)`로 위임한다. 그렇지 않으면 적절한 상태 코드와 공개 가능한 오류만 응답한다. 내부 스택이나 비밀값을 클라이언트에 노출하지 않는다.

확인: 2026-10-01, [Express 오류 처리](https://expressjs.com/en/guide/error-handling/), [미들웨어 사용](https://expressjs.com/en/guide/using-middleware/).

## 출처

- [임의로 데이터를 저장할 때 만나는 문제점](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56462)
- [에러 처리를 위한 단위 테스트 작성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56464)
- [Express.js 에러 처리에 대해서](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56469)
- [getProducts 통합 테스트 작성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56492)
- [express 미들웨어 이해하기](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83532)
- [고양이 데이터 Create Read API 개발](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83529)
- [고양이 route 분리, 모듈화](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83530)
- [express + ts 개발 환경 셋업 & hello world!](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83516)
- [express 싱글톤 패턴, 서비스 패턴](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83533)
- [미들웨어 실행 순서](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6180)
- [에러 미들웨어](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6182)

- [Design Patterns: Elements of Reusable Object-Oriented Software (1994) — Gamma, Helm, Johnson, Vlissides](https://www.informit.com/store/design-patterns-elements-of-reusable-object-oriented-9780201633610)
- [Express 공식 문서, Writing middleware for use in Express apps](https://expressjs.com/en/guide/writing-middleware/)
- [Koa 공식 문서, Cascading](https://koajs.com/#cascading)
