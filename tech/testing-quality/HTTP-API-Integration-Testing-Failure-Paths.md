---
tags: [testing, integration-test, http-api, error-handling, nestjs, supertest]
status: done
verified_at: 2026-09-30
category: "테스트&품질(Testing&Quality)"
aliases: ["HTTP API Failure Path Testing", "HTTP API 실패 경로 테스트", "실패 테스트 판정 순서"]
---

# HTTP API 실패 경로 테스트

[[HTTP-API-Integration-Testing|HTTP API 통합 테스트]]의 CRUD 계약 행렬이 요청별 실패 상태를 정한다면, 이 문서는 그 실패를 테스트로 고정하는 방법을 다룬다. 실패 테스트는 기대한 상태 코드가 나왔는지뿐 아니라 기대한 이유로 실패했는지까지 확인해야 한다. 프레임워크 동작은 NestJS 12.1과 Express 5.2(finalhandler 2.1) 기준으로 2026-09-30에 확인했다.

## 실패 테스트는 한 규칙만 위반한다

실패 테스트의 요청은 목표 규칙 하나만 어기고 나머지 입력은 모두 유효하게 채운다. 없는 사용자에게 404를 기대하는 수정 테스트가 필수 필드 `name`까지 빠뜨리면, 존재 확인보다 먼저 도는 본문 검증이 400을 돌려 테스트가 엉뚱한 이유로 실패한다. 이때 고칠 곳은 구현이 아니라 테스트 요청이다.

- 유효한 기본 요청을 fixture로 두고 실패 테스트마다 필드 하나만 덮어쓴다.
- 응답의 오류 코드나 필드 경로까지 단언하면 어느 규칙이 걸렸는지 드러난다.

## 판정 순서를 계약으로 둔다

여러 위반이 한 요청에 겹치면 어떤 상태 코드가 이기는지는 검사 순서가 정한다. 수정 API의 전형적인 순서는 다음과 같다.

1. 경로 식별자 형식 오류: 400
2. 본문 검증 오류: 400
3. 대상 없음: 404
4. 현재 상태와 충돌(이름 중복 등): 409

NestJS에서는 요청이 middleware, Guard, Interceptor, Pipe, handler 순서로 흐른다. 그래서 인증 실패(401, 403)가 `ParseIntPipe`나 `ValidationPipe`의 400보다 먼저 정해지고, 404와 409는 handler나 서비스가 조회하고 저장한 뒤에 정해진다. 순서를 클라이언트에 약속한다면 API 문서에 적고 복합 위반 요청을 별도 테스트로 고정한다. 약속하지 않는다면 복합 위반의 결과를 단언하지 않는다.

## 값 없음과 형식 오류를 먼저 구분한다

목록 API의 `limit` 같은 선택 입력은 값이 없을 때(기본값 적용)와 값은 있지만 형식이 틀렸을 때(400)를 변환과 검증 전에 나눠야 한다. 문자열을 `parseInt`로 바꾼 뒤 `NaN`이면 400을 주도록 고치면, `limit`을 보내지 않은 요청도 `parseInt(undefined)`가 `NaN`이 되어 400으로 바뀌는 회귀가 생긴다. 기본값을 먼저 적용한 뒤 형식을 검사한다.

NestJS의 `Parse*` Pipe는 기본적으로 `null`이나 `undefined`를 받으면 예외를 던진다. 공식 문서처럼 `@Query('limit', new DefaultValuePipe(10), ParseIntPipe)`로 `DefaultValuePipe`를 앞에 둔다. 테스트는 값 없음, 정상 값, 형식 오류, 범위 밖 값을 하나씩 둔다.

## 라우팅 404와 리소스 없음 404를 구분한다

프레임워크는 등록되지 않은 경로에도 404를 돌려준다. Express는 어떤 라우트도 응답하지 않으면 기본 처리기가 `Cannot GET /users/1` 형태의 HTML 404를 보내고, NestJS는 매칭되는 라우트가 없으면 같은 형태의 메시지로 `NotFoundException`을 던진다. 그래서 없는 리소스에 404를 기대하며 상태 코드만 단언하는 테스트는 라우트가 없거나 테스트 경로에 오타가 있어도 통과한다.

- 같은 경로의 성공 테스트를 먼저 통과시켜 라우트가 있다는 사실을 고정한다.
- 404 테스트는 업무 오류 코드처럼 라우팅 404와 구분되는 본문 필드도 단언한다.
- 구현 전에 쓴 404 테스트가 처음부터 통과했다면 Red를 확인하지 못한 것이다. 기대한 분기가 없어서 다른 결과가 나오는지 먼저 본다.

## 오류 본문도 계약이다

- 오류 응답에도 `content-type`을 단언한다. 사용자 오류 처리기로 가지 못하고 프레임워크 기본 응답으로 떨어진 경우가 첫 단언에서 드러난다. Express 기본 처리기가 HTML을 보내 `response.body`가 비어 보이는 사례는 [[Jest-Express-Testing#오류 경로 HTTP 테스트|Jest와 Express 컨트롤러 테스트]]에 있다.
- 안정된 오류 코드와 필드 경로를 응답 계약으로 두고 그것을 단언한다. ORM이나 검증 라이브러리가 만든 메시지 원문을 통째로 비교하면 라이브러리 메시지 형식이 바뀔 때 깨진다. 메시지 문자열로 분기하지 않는 이유와 같다([[Error-Handling-Strategy|에러 처리 전략]]).
- 클라이언트 입력 오류를 500으로 단언하지 않는다. 필수 필드 누락은 400이고, 예상하지 못한 내부 오류만 5xx다.

## 출처

- [NestJS 공식 문서, Pipes (Providing defaults)](https://docs.nestjs.com/pipes)
- [NestJS 공식 문서, Request lifecycle](https://docs.nestjs.com/faq/request-lifecycle)
- [NestJS 공식 저장소, routes-resolver.ts](https://github.com/nestjs/nest/blob/master/packages/core/router/routes-resolver.ts)
- [Express 공식 문서, FAQ (How do I handle 404 responses?)](https://expressjs.com/en/starter/faq.html)
- [finalhandler 공식 저장소, index.js](https://github.com/pillarjs/finalhandler/blob/master/index.js)
- [인프런, 김정환, 사용자 목록 조회 API 테스트 코드 만들기 2](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6204)
- [인프런, 김정환, 사용자 조회 API 성공시](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6205)
- [인프런, 김정환, 사용자 조회 API 실패시](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6206)
- [인프런, 김정환, 사용자 삭제 API 성공시](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6207)
- [인프런, 김정환, 사용자 수정 API 실패시](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6213)

## 관련 문서

- [[HTTP-API-Integration-Testing|HTTP API 통합 테스트]]
- [[Jest-Express-Testing|Jest와 Express 컨트롤러 테스트]]
- [[HTTP-Status-Code|HTTP 상태 코드]]
- [[Error-Handling-Strategy|에러 처리 전략]]
- [[NestJS-Testing|NestJS Testing]]
