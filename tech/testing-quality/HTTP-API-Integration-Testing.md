---
tags: [testing, integration-test, e2e, http-api, nestjs, typeorm, supertest]
status: done
verified_at: 2026-08-04
category: "테스트&품질(Testing&Quality)"
aliases: ["HTTP API Integration Testing", "API 계약 테스트", "Supertest API 테스트"]
---

# HTTP API 통합 테스트

HTTP API 통합 테스트는 요청을 실제 HTTP 어댑터에 넣고 상태 코드, 헤더, 본문과 저장소의 최종 상태를 함께 검증한다. 컨트롤러 함수를 직접 호출하는 테스트보다 느리지만 라우팅, 역직렬화, 검증, Guard, Pipe, Filter와 응답 직렬화 사이의 계약을 확인할 수 있다.

Supertest는 이 범위를 실행하는 클라이언트일 뿐 테스트 전략 자체는 아니다. NestJS는 특정 테스트 러너를 강제하지 않으므로 Jest, Vitest 또는 다른 러너에서도 같은 계약을 검증할 수 있다.

## 먼저 검증 범위를 정한다

| 범위 | 실제로 통과하는 경계 | 대체 가능한 것 | 주로 잡는 결함 |
|---|---|---|---|
| 컨트롤러 단위 | 컨트롤러 메서드 | 서비스, 저장소 | 분기와 매핑 |
| HTTP 슬라이스 | HTTP 어댑터, 라우팅, 검증, 컨트롤러 | 저장소, 외부 API | 경로, DTO, 상태와 본문 계약 |
| API 통합 | HTTP 경계부터 실제 DB까지 | 결제, 메일 같은 외부 시스템 | ORM 쿼리, 제약 조건, 트랜잭션 |
| 배포 E2E | 배포된 서비스와 의존 시스템 | 최소화 | 네트워크, 설정, 배포 결함 |

한 테스트가 어느 범위인지 이름과 셋업으로 드러내야 한다. Supertest를 사용해도 저장소를 mock했다면 실제 DB 통합 테스트는 아니다.

## API를 한 동작씩 TDD한다

1. 요청, 사전 상태와 관찰 가능한 결과를 한 문장으로 정의한다.
2. 그 동작을 표현하는 테스트 하나를 작성한다.
3. 테스트가 의도한 이유로 실패하는지 확인한다. 경로 오타나 fixture 누락으로 실패하면 Red 단계가 아니다.
4. 테스트를 통과시키는 가장 작은 구현을 만든다.
5. 전체 관련 테스트가 Green인 상태에서 중복, 책임과 이름을 정리한다.
6. 다음 성공 또는 실패 동작으로 이동한다.

TDD는 유지보수 비용을 자동으로 줄이지 않는다. 외부 동작에 맞춘 테스트와 Refactor 단계가 있어야 변경 안전망이 된다. 구현 상세와 파일 배치에 묶인 테스트는 오히려 구조 개선을 방해한다.

## CRUD 계약 행렬

| 요청 | 성공 계약 | 대표 실패 계약 |
|---|---|---|
| `GET /users?limit=...` | 기본값, 경계값, 정렬과 결과 개수 | 형식 오류와 허용 범위 밖 값은 400 |
| `GET /users/:id` | 식별자가 같은 표현 반환 | 잘못된 식별자는 400, 없는 리소스는 404 |
| `POST /users` | 201, 생성 표현, 정책에 따라 `Location` | 필수 필드와 형식은 400, 현재 상태와 충돌하면 409 |
| `PUT /users/:id` | 전체 표현 교체 후 200 또는 204 | 400, 404, 409를 구분 |
| `PATCH /users/:id` | 지정 필드만 변경 | 변경 문서 오류와 불변식 위반 |
| `DELETE /users/:id` | 본문 없는 204를 선택할 수 있음 | 잘못된 식별자와 이미 없는 리소스 정책을 명시 |

`PUT`은 전체 표현 교체 의미다. 이름 하나만 바꾸는 API라면 `PATCH`가 더 정확할 수 있다. 삭제 성공을 204로 정했다면 응답 본문이 비었는지도 검증한다. 상태 코드만 맞아도 잘못된 데이터가 저장될 수 있으므로 생성, 수정과 삭제 후 실제 DB 상태까지 확인한다.

## NestJS와 Supertest 기준 골격

프로덕션과 테스트가 같은 HTTP 설정 함수를 호출하게 한다. `main.ts`에만 전역 Pipe, prefix와 Filter를 등록하면 `TestingModule`이 그 설정을 자동으로 재현하지 않는다.

```ts
describe('Users API', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureHttp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
  });

  it('creates a user', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Ada' })
      .expect('content-type', /json/)
      .expect(201);

    expect(response.headers.location).toBe(`/users/${response.body.id}`);
    expect(await dataSource.getRepository(User).findOneBy({
      id: response.body.id,
    })).toMatchObject({ name: 'Ada' });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

Supertest는 `http.Server`가 아직 수신 중이 아니면 임시 포트에 바인딩할 수 있다. 테스트가 고정 포트의 `listen()`을 직접 호출할 필요는 없다. 요청은 `await`하거나 Promise를 반환한다. 콜백 방식을 쓴다면 실패를 `done(error)`로 전달하고 Promise 방식과 섞지 않는다.

## DB가 포함되면 검증할 것

- 운영과 같은 엔진에 운영 migration을 적용한다. `synchronize: true`나 `force` 기반 스키마 재생성은 migration 경로를 검증하지 못한다.
- Unique 제약은 애플리케이션 배열 검색이 아니라 DB 제약으로 보장하고, 알려진 충돌만 안정된 애플리케이션 오류와 409로 변환한다.
- 예상하지 못한 DB 오류는 409로 뭉개지 않는다. 내부 정보는 숨기고 5xx로 전달하면서 원인은 로그와 추적 시스템에 남긴다.
- 생성된 식별자를 타임스탬프로 추측하지 않는다. 응답이나 fixture가 반환한 ID를 다음 검증에 사용한다.
- 목록의 `limit`, `offset`은 문자열을 숫자로 바꾸는 데서 끝내지 않고 정수 여부, 최소값, 최대값과 overflow 정책까지 검증한다.

## 테스트 격리

비싼 애플리케이션과 컨테이너 수명주기는 `beforeAll`에서 공유할 수 있지만 각 테스트의 데이터는 `beforeEach`에서 준비한다.

- 앞선 DELETE 테스트가 지운 데이터를 뒤의 중복 생성 테스트가 기대하게 두지 않는다.
- 하나의 요청 결과를 `beforeAll` 변수에 저장해 여러 테스트가 나눠 검증하면 실패 원인이 분산된다. 한 동작의 관련 단언은 한 테스트에 모은다.
- 테스트 이름만 보고 필요한 fixture를 알 수 있게 하고 실행 순서에 의존하지 않는다.
- 병렬 실행 시 worker별 database, schema 또는 container로 namespace를 나눈다. 순차 실행은 격리 설계의 대체물이 아니다.
- 정리는 FK 순서를 고려한 TRUNCATE, database/schema 재생성 또는 검증된 fixture 전략을 사용한다. 테스트 대상 트랜잭션을 바깥 롤백으로 감싸면 실제 commit 동작을 가릴 수 있다.

## 오래된 예제를 현재 스택으로 번역하기

| 예제의 표현 | 현재 NestJS, TypeORM 해석 |
|---|---|
| Mocha와 should.js | 러너와 assertion은 교체 가능하다. 저장소 표준을 따른다 |
| Express 앱 직접 export | `INestApplication`과 `app.getHttpServer()`를 사용한다 |
| 별도 `body-parser` | HTTP 어댑터의 파싱 뒤 DTO와 `ValidationPipe`로 입력 계약을 검증한다 |
| Router와 controller 파일 분리 | Controller는 전송, use case는 애플리케이션 규칙, Repository는 저장 책임을 맡는다 |
| Sequelize `sync({ force: true })` | TypeORM migration으로 스키마를 만들고 데이터만 명시적으로 초기화한다 |
| 메모리 배열 fixture | 테스트별 DB fixture와 실제 제약 조건을 사용한다 |

리팩터링의 성공 기준은 파일 수가 아니라 외부 계약이 유지되고 책임 경계가 선명해졌는지다.

## 면접 체크포인트

- Supertest를 썼다는 사실과 실제 DB까지 검증했다는 사실을 구분할 수 있는가?
- Red 단계에서 실패 원인이 요구사항 불충족인지 확인하는 방법은 무엇인가?
- 400, 404와 409를 어떤 조건으로 나누는가?
- 프로덕션과 테스트의 전역 Pipe, Filter 설정 드리프트를 어떻게 막는가?
- 테스트 간 DB 상태와 병렬 worker의 namespace를 각각 어떻게 격리하는가?
- ORM 자동 동기화 대신 migration을 테스트에 적용하는 이유는 무엇인가?

## 관련 문서

- [[TDD-BDD|TDD, BDD]]
- [[NestJS-Testing|NestJS Testing]]
- [[Test-Isolation|Test Isolation]]
- [[Test-Fixture|Test Fixture 전략]]
- [[Migration-Backed-Test-Database|마이그레이션 기반 테스트 데이터베이스]]
- [[API-Conventions|API 컨벤션]]
- [[HTTP-Status-Code|HTTP 상태 코드]]

## 출처

- [NestJS 공식 문서, Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest 공식 저장소, README](https://github.com/forwardemail/supertest)
- [TypeORM 공식 문서, Migration setup](https://typeorm.io/docs/migrations/setup/)
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [김정환 강사, 테스트 주도 개발이란?](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6194)
- [김정환 강사, Supertest로 HTTP 통합 테스트](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6199)
- [김정환 강사, Supertest 비동기 요청](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6200)
- [김정환 강사, 목록 조회의 limit 검증](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6204)
- [김정환 강사, 조회 실패의 400과 404](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6206)
- [김정환 강사, 삭제 성공의 204](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6207)
- [김정환 강사, 생성 성공의 201](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6209)
- [김정환 강사, 요청 본문 파싱](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6210)
- [김정환 강사, 생성 실패의 400과 409](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6211)
- [김정환 강사, 수정 실패 계약](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6213)
- [김정환 강사, Router와 controller 책임 분리](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6215)
- [김정환 강사, 리팩터링 뒤 회귀 테스트](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6216)
- [김정환 강사, 테스트와 서버 구동 분리](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6218)
- [김정환 강사, ORM 스키마 동기화 예제](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6224)
- [김정환 강사, DB fixture와 목록 통합 테스트](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6226)
- [김정환 강사, DB unique 제약과 409](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6229)
- [김정환 강사, 수정과 unique 제약](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6230)
- [김정환 강사, 테스트 DB 초기화와 데이터 유지](https://www.inflearn.com/courses/lecture?courseId=40164&unitId=6232)
