---
tags: [testing, jest, express, supertest, tdd, nodejs]
status: done
verified_at: 2026-08-04
category: "테스트&품질(Testing&Quality)"
aliases: ["Jest Express Testing", "Express 컨트롤러 테스트"]
---

# Jest와 Express 컨트롤러 테스트

Express API 테스트는 컨트롤러 함수, HTTP 어댑터, 실제 저장소 중 어디까지 통과하는지 먼저 정해야 한다. 같은 CRUD 시나리오도 경계에 따라 발견하는 결함과 대역의 범위가 달라진다.

## 테스트 경계

| 종류 | 통과하는 경계 | 대역 | 확인하는 것 |
|---|---|---|---|
| 컨트롤러 단위 | 핸들러 함수 | 저장소, `req`, `res`, `next` | 분기, 저장소 호출, 응답 선택 |
| HTTP 통합 | 라우팅, JSON 파싱, 미들웨어, 핸들러 | 외부 API, 필요시 저장소 | 경로, 입력, 상태, 헤더, 본문 |
| 저장소 포함 통합 | HTTP부터 실제 DB까지 | 서비스 밖 외부 시스템 | 스키마, 쿼리, 제약 조건, 최종 상태 |

`node-mocks-http`는 단위 테스트 준비를 줄이는 도구다. 이를 썼다는 사실만으로 라우팅이나 실제 HTTP 계약을 검증한 것은 아니다.

## CRUD를 작은 TDD 사이클로 진행한다

1. 요청과 관찰 가능한 결과 하나를 테스트 이름으로 적는다.
2. 의도한 기능이 없어서 실패하는지 확인한다.
3. 통과하는 가장 작은 구현을 만든다.
4. 관련 테스트가 Green일 때 중복과 책임을 정리한다.
5. 성공, 없음, 잘못된 입력, 의존성 실패를 다음 사이클로 추가한다.

함수 존재 여부보다 입력에 따른 상태, 본문, 저장 효과를 먼저 고정한다. 구현 메서드 호출 검증은 중요한 협력 계약일 때만 사용한다.

## 현재 Jest 기준선

현재 Jest의 기본 `testEnvironment`는 `node`다. 백엔드 프로젝트에서 설정에 `testEnvironment: 'node'`를 명시하면 의도는 선명해지지만 예전 JSDOM 기본값을 교정하기 위한 필수 설정은 아니다.

- 기본 탐색은 `__tests__`와 `.test`, `.spec` 파일을 포함한다.
- `jest.fn()`은 호출 인자와 결과를 기록하며, 구현이 없으면 `undefined`를 반환한다.
- 비동기 대역은 `mockResolvedValue`와 `mockRejectedValue`로 성공과 실패를 분리한다.
- `beforeEach`는 해당 범위의 매 테스트 전에 실행되고 반환한 Promise도 기다린다. 호출 기록 제거와 구현 초기화가 필요한지 구분한다.

## 컨트롤러 단위 테스트 패턴

저장소를 주입하면 모듈 전역을 통째로 mock하지 않고 협력 계약만 대체할 수 있다.

```js
describe('createProduct', () => {
  const repository = { create: jest.fn() };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('persists input and returns 201', async () => {
    const saved = { id: 'p1', name: 'keyboard' };
    repository.create.mockResolvedValue(saved);
    const handler = makeProductHandlers(repository);

    await handler.create({ body: { name: 'keyboard' } }, res, next);

    expect(repository.create).toHaveBeenCalledWith({ name: 'keyboard' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(saved);
    expect(next).not.toHaveBeenCalled();
  });
});
```

- 요청의 관심 필드만 준비하고 결과 객체 전체를 과도하게 복제하지 않는다.
- `beforeEach`에서 공유 상태와 호출 기록을 초기화해 실행 순서를 제거한다.
- 성공 테스트와 오류 테스트가 같은 fixture를 변형해 공유하지 않게 한다.
- `toHaveBeenCalledWith`와 응답 단언을 함께 써도 하나의 생성 동작을 설명한다면 한 테스트에 둘 수 있다.

## 비동기 오류와 Express 버전 경계

Jest 테스트는 Promise를 반환하거나 `await`해야 완료를 기다린다. 거부를 기대할 때는 `await expect(promise).rejects...`를 사용하면 오류가 발생하지 않은 경우도 실패한다.

```js
repository.findAll.mockRejectedValue(new Error('storage unavailable'));
await expect(handler.list(req, res)).rejects.toThrow('storage unavailable');
```

Express 5는 반환된 Promise가 거부되거나 `async` 핸들러가 던지면 자동으로 오류 처리기로 전달한다. Express 4 예제의 `catch(next)`를 옮길 때는 런타임 버전을 확인한다. 콜백 API 오류는 현재도 직접 `next(error)`로 넘겨야 한다.

## Supertest로 HTTP 계약 확인

```js
const response = await request(app)
  .post('/products')
  .send({ name: 'keyboard' })
  .expect('content-type', /json/)
  .expect(201);

expect(response.body).toMatchObject({ name: 'keyboard' });
```

- Supertest는 Express 함수나 `http.Server`를 받아 임시 포트에 연결할 수 있다.
- 요청을 `await`하거나 반환한다. 콜백 방식이면 assertion 오류를 `done(error)`로 전달한다.
- 실제 DB 통합이 목표라면 저장소를 mock하지 않고 응답이 가리키는 ID로 저장 상태까지 확인한다.

## CRUD 동작 행렬

| 동작 | 성공 계약 | 실패 계약 |
|---|---|---|
| Create | 201, 생성 표현, 저장 상태 | 입력 오류 4xx, 충돌 정책 |
| List | 200, 빈 목록, 정렬과 필터 | 잘못된 쿼리 400 |
| Read | 200과 같은 식별자 | 잘못된 ID 400, 없음 404 |
| Update | 200 또는 204, 변경 반영 | 잘못된 입력 400, 없음 404 |
| Delete | 204 또는 문서화된 응답, 실제 삭제 | 없음에 대한 404 또는 멱등 정책 |

## 오래된 예제를 현재 스택으로 번역하기

| 과거 예제 | 현재 해석 |
|---|---|
| JSDOM 경고 때문에 `testEnvironment: node` 추가 | 현재 Jest 기본값이 `node`다 |
| 별도 `body-parser` 설치 | Express 4.16 이상은 `express.json()`을 제공한다 |
| 모든 `async` 핸들러에서 `catch(next)` | Express 5는 반환된 Promise 거부를 자동 전달한다 |
| 필수 필드 누락을 500으로 단언 | 클라이언트 입력 오류는 4xx, 예상 못 한 내부 오류는 5xx로 분리한다 |
| mock `req`, `res`를 통합 테스트로 부름 | 컨트롤러 단위 테스트이며 HTTP 계약은 Supertest로 확인한다 |
| DB의 기존 ID를 하드코딩 | 테스트마다 fixture를 만들고 반환된 ID를 사용한다 |
| Jest가 Node.js의 유일한 선택 | `node:test`도 Node.js 20부터 stable이며 요구 기능과 생태계로 선택한다 |
| Express 핸들러를 NestJS로 그대로 이식 | 단위는 `TestingModule`과 provider override, E2E는 `app.getHttpServer()`와 Supertest를 사용한다 |

## 관련 문서

- [[TDD-BDD|TDD, BDD]]
- [[HTTP-API-Integration-Testing|HTTP API 통합 테스트]]
- [[Test-Isolation|Test Isolation]]
- [[Test-Fixture|Test Fixture 전략]]
- [[NestJS-Testing|NestJS Testing]]

## 출처

- [Jest 공식 문서, Configuring Jest](https://jestjs.io/docs/configuration)
- [Jest 공식 문서, Mock Functions](https://jestjs.io/docs/mock-function-api)
- [Jest 공식 문서, Globals](https://jestjs.io/docs/api)
- [Express 공식 문서, Error Handling](https://expressjs.com/en/guide/error-handling/)
- [Express 공식 문서, Using middleware](https://expressjs.com/en/guide/using-middleware/)
- [Supertest 공식 저장소](https://github.com/forwardemail/supertest)
- [Node.js 공식 문서, Test runner](https://nodejs.org/api/test.html)
- [NestJS 공식 문서, Testing](https://docs.nestjs.com/fundamentals/testing)

John Ahn 강사의 인프런 강좌 `따라하며 배우는 TDD 개발 [2023.11 업데이트]`에서 MCP로 본문을 확인한 46개 unit이다. 커리큘럼의 PDF unit `59948`과 소스 코드 unit `56514`는 `not_found`라 내용 근거로 사용하지 않았다.

- [강의 도표 자료](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56513)
- [강의 소개](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56407)
- [Node.js 설치하기](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56441)
- [package.json 파일 작성하기](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56442)
- [server.js 파일 작성하기](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56443)
- [express.json()](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56444)
- [route, controller 생성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56445)
- [MongoDB 클러스터 생성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56446)
- [몽구스 Model, Schema 생성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56447)
- [단위 테스트란 ?](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56448)
- [Jest란 ?](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56449)
- [Jest 파일 구조 및 사용법](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56450)
- [jest.fn()](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56451)
- [Create Product 함수 생성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56453)
- [Create Method로 데이터 저장하기](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56454)
- [Node.js 앱을 테스트하기 위한 Jest 설정](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56455)
- [node-mocks-http](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56456)
- [beforeEach](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56457)
- [상태 값 전달](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56458)
- [결과 값 전달](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56459)
- [포스트맨 설치하기](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56461)
- [임의로 데이터를 저장할 때 만나는 문제점](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56462)
- [async await](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56463)
- [에러 처리를 위한 단위 테스트 작성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56464)
- [통합 테스트란 ?](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56466)
- [통합 테스트 작성하기](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56467)
- [에러 처리를 위한 통합 테스트 작성하기](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56468)
- [Express.js 에러 처리에 대해서](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56469)
- [Read 시작](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56495)
- [getProducts 단위 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56489)
- [getProducts 단위 테스트 작성 (2)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56490)
- [getProducts 에러 처리 단위 테스트 작성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56491)
- [getProducts 통합 테스트 작성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56492)
- [getProductById 단위 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56493)
- [getProductById 단위 테스트 작성 (2)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56494)
- [getProductById 통합 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56496)
- [getProductById 통합 테스트 작성 (2)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56497)
- [Update 시작](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56501)
- [updateProduct 단위 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56502)
- [updateProduct 단위 테스트 작성 (2)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56503)
- [updateProduct 통합 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56504)
- [updateProduct 통합 테스트 작성 (2)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56505)
- [Delete 시작](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56509)
- [deleteProduct 단위 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56510)
- [deleteProduct 단위 테스트 작성 (2)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56511)
- [deleteProduct 통합 테스트 작성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56512)
