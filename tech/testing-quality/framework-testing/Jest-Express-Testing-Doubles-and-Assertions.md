---
tags: [testing, jest, express, mock, node-mocks-http, matcher]
status: done
verified_at: 2026-10-01
category: "테스트&품질(Testing&Quality)"
aliases: ["Jest Express Doubles and Assertions", "Express 컨트롤러 대역과 단언", "Jest matcher 선택"]
---

# Jest와 Express 테스트: 대역 교체와 단언

[[Jest-Express-Testing|Jest와 Express 컨트롤러 테스트]]에서 컨트롤러 단위 테스트의 대역 교체, 응답 검증, mock 정리와 matcher 선택을 떼어 낸 문서다. 버전에 민감한 내용은 Jest 30.5, node-mocks-http 1.18.1, Mongoose 9.10 기준으로 2026-09-30에 공식 문서와 소스를 확인했다.

## 저장소를 주입받는 컨트롤러

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

## import한 Model을 대역으로 바꿀 때

컨트롤러가 Model을 직접 `require`하고 주입받지 않으면 테스트가 같은 Model 객체의 정적 메서드를 대역으로 바꾼다. 한 테스트 파일 안에서 같은 경로의 `require`는 Jest 모듈 레지스트리에 캐시된 같은 객체를 돌려주므로, 테스트에서 바꾼 메서드를 컨트롤러도 호출한다.

```js
const httpMocks = require('node-mocks-http');
const productModel = require('../models/Product');
const { getProductById } = require('../controller/products');
const product = require('./data/product.json');

let req, res, next;
beforeEach(() => {
  req = httpMocks.createRequest({ params: { productId: 'p1' } });
  res = httpMocks.createResponse();
  next = jest.fn();
});
afterEach(() => jest.restoreAllMocks());

it('상품을 200으로 응답한다', async () => {
  jest.spyOn(productModel, 'findById').mockResolvedValue(product);

  await getProductById(req, res, next);

  expect(productModel.findById).toHaveBeenCalledWith('p1');
  expect(res.statusCode).toBe(200);
  expect(res._isEndCalled()).toBe(true);
  expect(res._getJSONData()).toStrictEqual(product);
});
```

- 교체를 빠뜨리면 구현을 넣어도 잘못된 이유로 Red가 된다. `toHaveBeenCalledWith`에 진짜 메서드를 넘기면 mock이나 spy가 아니라는 matcher 오류가 난다.
- DB 연결이 없는 단위 테스트에서 진짜 Mongoose 메서드가 호출되면 Mongoose는 명령을 버퍼링하고 `bufferTimeoutMS`(기본 10초)까지 기다린다. Jest `testTimeout` 기본값 5초가 먼저 끝나 timeout 실패로 보일 수 있다. 구현을 넣었는데도 실패하면 로직보다 하네스를 먼저 확인한다.
- `productModel.find = jest.fn()`처럼 직접 대입한 대역은 원본으로 되돌릴 수 없다. 원본 구현이 필요한 테스트가 같은 파일에 섞이면 `jest.spyOn`으로 만들고 `restoreAllMocks`로 복구한다.

### 결과 시나리오별 대역 설정

| 시나리오 | 대역 설정 | 컨트롤러 경로 | 단언 |
|---|---|---|---|
| 성공 | `mockResolvedValue(fixture)` | 조회 결과를 응답 | `statusCode`, `_getJSONData()` |
| 대상 없음 | `mockResolvedValue(null)` | `null`이면 404 응답 | `statusCode` 404, `_isEndCalled()` |
| 저장소 실패 | `mockRejectedValue(error)` | `catch`에서 `next(error)` | `expect(next).toHaveBeenCalledWith(error)` |

- 저장소 호출은 비동기이므로 실패도 거부된 Promise로 흉내 낸다. 일반 값을 반환하게 하면 `await`가 던지지 않아 `catch` 경로를 타지 않는다.
- `mockRejectedValue(value)`는 `mockImplementation(() => Promise.reject(value))`의 축약이라 호출될 때 거부 Promise를 만든다. `mockReturnValue(Promise.reject(error))`처럼 미리 만든 거부 Promise는 대역이 호출되지 않으면 처리되지 않은 거부로 남을 수 있다.
- Express 5에서 컨트롤러가 `catch` 없이 반환한 Promise로 오류를 넘기면, 단위 테스트의 단언은 `next` 호출 대신 `await expect(...).rejects`가 된다([[Jest-Express-Testing#비동기 오류와 Express 버전 경계|비동기 오류와 Express 버전 경계]]).

## node-mocks-http로 응답 상태 검증

`httpMocks.createRequest({ body, params })`로 입력을 만들고, 컨트롤러가 끝난 뒤 응답 객체의 최종 상태를 읽는다. 아래 동작은 node-mocks-http 1.18.1 소스 기준이다.

| 검사 | 의미 | 잡는 결함 |
|---|---|---|
| `res.statusCode` | `status(code)`가 바꾼 상태 코드 | 잘못된 상태 선택 |
| `res._isEndCalled()` | `end()` 호출 여부. `send()`, `json()`이 내부에서 `end()`를 부른다 | 상태만 정하고 응답을 보내지 않는 버그. 실서버라면 클라이언트가 응답을 기다리며 멈춘다 |
| `res._getJSONData()` | `json()`이 쓴 문자열을 `JSON.parse`한 값 | 본문 누락, 필드 오류 |
| `res._getData()` | 가공하지 않은 본문 | `send(객체)`처럼 문자열이 아닌 본문 |

- `status(code)`는 상태 코드만 바꾸고 응답을 끝내지 않는다. 상태 코드와 `_isEndCalled()`를 함께 본다.
- `_getJSONData()`는 JSON 왕복 결과다. `Date`, `ObjectId`, 클래스 인스턴스가 든 기대값과는 타입이 달라 `toStrictEqual`이 실패하므로 평범한 JSON fixture나 직렬화한 기대값과 비교한다.
- `send(객체)`는 객체를 문자열로 바꾸지 않고 보관하므로 `_getJSONData()`가 파싱에 실패한다. 이때는 `_getData()`로 본다.
- 위의 수제 `res` 대역은 구현이 부르는 응답 메서드를 모두 흉내 내야 하고 단언도 그 호출에 묶인다. node-mocks-http는 상태 코드, 종료 여부, 본문 같은 최종 상태를 본다. 대신 `_`로 시작하는 검사 API는 이 라이브러리 전용이다.

## mock 정리와 복구

| API | 호출 기록 | 설정한 구현과 반환값 | 원본 구현 |
|---|---|---|---|
| `mockClear()`, `jest.clearAllMocks()` | 지운다 | 남긴다 | 그대로 |
| `mockReset()`, `jest.resetAllMocks()` | 지운다 | 지우고 `undefined`를 반환하게 한다 | 되돌리지 않는다 |
| `mockRestore()` | 지운다 | 지운다 | 되돌린다. `jest.spyOn`으로 만든 대상만 |
| `jest.restoreAllMocks()` | 남긴다 | 남긴다 | 되돌린다. `jest.spyOn`, `jest.replaceProperty`로 바꾼 대상만 |

- 공식 문서는 `jest.restoreAllMocks()`가 모든 mock에 `mockRestore()`를 부르는 것과 같다고 설명하지만 실제 동작은 표와 같다. 상태까지 지우게 한 29.4.3의 변경이 29.6.3에서 되돌려졌고, Jest 30.5.2 소스와 실행에서도 원본만 복구했다(2026-10-01 확인).
- 직접 대입한 `jest.fn()`은 restore 대상이 아니다. 원본이 필요하면 직접 다시 대입해야 한다.
- 404 테스트의 `mockResolvedValue(null)` 설정은 `clear`로도 `restoreAllMocks`로도 지워지지 않는다. 직접 대입한 `jest.fn()`이면 각 테스트가 자기 결과를 설정하거나 `mockReset()`, `resetMocks`로 지운다. `jest.spyOn`으로 만들고 `restoreAllMocks`로 복구했다면 다음 테스트가 `spyOn`을 다시 불러 새 spy를 만들므로 이전 설정이 이어지지 않는다.
- 설정의 `clearMocks`, `resetMocks`, `restoreMocks`(모두 기본값 `false`)는 매 테스트 전에 각각 `clearAllMocks`, `resetAllMocks`, `restoreAllMocks`를 부른다. 그래서 `restoreMocks`만 켜면 직접 대입한 mock의 설정과 호출 기록이 다음 테스트로 이어진다.

## matcher 선택

| matcher | 비교 방식 | 쓰는 곳 | 함정 |
|---|---|---|---|
| `toBe` | `Object.is` | 상태 코드, 원시값, 같은 참조 | 내용이 같은 다른 객체는 실패 |
| `toEqual` | 재귀 비교. `undefined` 속성, `undefined` 배열 원소, 배열 희소성, 객체 타입 차이는 무시 | 값 비교 | `{ a: undefined, b: 2 }`와 `{ b: 2 }`가 같다 |
| `toStrictEqual` | 위 네 가지까지 검사 | 응답 전체 계약 | 클래스 인스턴스와 같은 필드의 리터럴 객체는 다르다 |
| `toMatchObject` | 기대 객체가 부분 집합인지 | 관심 필드 확인 | 기대에 없는 필드가 있어도 통과 |
| `toHaveBeenCalledWith` | 인자를 `toEqual`과 같은 알고리즘으로 비교 | 협력 계약 | mock이나 spy에만 쓸 수 있다 |
| `toBeDefined`, `toBeTruthy` | `undefined`가 아님, truthy | 존재 확인의 보조 | 값이 틀려도 통과 |

- 응답에 없어야 하는 필드(비밀번호 해시, 내부 식별자)가 계약이면 `toMatchObject`로는 부족하다. `expect(body).not.toHaveProperty('password')`처럼 부재를 따로 단언하거나 `toStrictEqual`로 전체를 고정한다.
- 목록 응답을 배열인지와 첫 원소 필드의 `toBeDefined`로만 확인하면, 목록이 비었을 때는 첫 원소 접근에서 TypeError로 깨지고 값이나 개수가 틀려도 통과한다. 준비한 fixture의 식별자, 값, 개수를 기대값으로 둔다.
- `toBeDefined`와 `toBeTruthy`는 값 단언을 보조할 때만 쓴다.

## 출처

- [Jest 공식 문서, Mock Functions](https://jestjs.io/docs/mock-function-api)
- [Jest 공식 문서, The Jest Object](https://jestjs.io/docs/jest-object)
- [Jest 공식 문서, Expect](https://jestjs.io/docs/expect)
- [Jest 공식 문서, Configuring Jest](https://jestjs.io/docs/configuration)
- [Jest 공식 저장소, jest-mock 30.5.2 restoreAllMocks](https://github.com/jestjs/jest/blob/v30.5.2/packages/jest-mock/src/index.ts#L1596-L1599)
- [Jest 공식 저장소, CHANGELOG_PRE_v30.md](https://github.com/jestjs/jest/blob/v30.5.2/CHANGELOG_PRE_v30.md)
- [node-mocks-http 공식 저장소, mockResponse.js](https://github.com/eugef/node-mocks-http/blob/master/lib/mockResponse.js)
- [Mongoose 공식 문서, Schemas (bufferTimeoutMS)](https://mongoosejs.com/docs/guide.html#bufferTimeoutMS)
- [인프런, John Ahn, Jest 파일 구조 및 사용법](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56450)
- [인프런, John Ahn, jest.fn()](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56451)
- [인프런, John Ahn, Create Method로 데이터 저장하기](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56454)
- [인프런, John Ahn, node-mocks-http](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56456)
- [인프런, John Ahn, beforeEach](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56457)
- [인프런, John Ahn, 상태 값 전달](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56458)
- [인프런, John Ahn, 결과 값 전달](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56459)
- [인프런, John Ahn, 에러 처리를 위한 단위 테스트 작성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56464)
- [인프런, John Ahn, getProducts 단위 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56489)
- [인프런, John Ahn, getProducts 에러 처리 단위 테스트 작성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56491)
- [인프런, John Ahn, getProducts 통합 테스트 작성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56492)
- [인프런, John Ahn, getProductById 단위 테스트 작성 (2)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56494)
- [인프런, John Ahn, getProductById 통합 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56496)
- [인프런, John Ahn, updateProduct 단위 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56502)

## 관련 문서

- [[Jest-Express-Testing|Jest와 Express 컨트롤러 테스트]]
- [[HTTP-API-Integration-Testing|HTTP API 통합 테스트]]
- [[Test-Isolation|Test Isolation]]
- [[Classicist-vs-Mockist-Testing|Classicist vs Mockist]]
