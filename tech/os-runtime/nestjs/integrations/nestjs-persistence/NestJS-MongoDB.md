---
tags: [nestjs, mongodb, mongoose, schema, transaction]
status: done
verified_at: 2026-09-30
category: "OS & Runtime - NestJS"
aliases: ["NestJS MongoDB", "@nestjs/mongoose", "MongooseModule"]
---

# NestJS MongoDB — @nestjs/mongoose

Mongoose는 Schema → Model 순으로 파생된다. `@nestjs/mongoose`는 데코레이터로 스키마 보일러플레이트를 줄이고, Model을 DI 토큰으로 주입한다.

## 스키마 정의와 Model 주입

- `@Schema()` 클래스 데코레이터 — 클래스명 + s 복수형이 컬렉션명(`Cat` → `cats`). 인자는 mongoose.Schema 생성자의 옵션 객체.
- `@Prop()` — 타입은 TS 메타데이터로 자동 추론. 배열, 중첩 객체는 추론이 안 되므로 명시(`@Prop([String])`). 옵션 객체로 `required`, `default`, `immutable` 등.
- `SchemaFactory.createForClass(Cat)`로 스키마 생성. 데코레이터로 표현하기 어려운 엣지는 `DefinitionsFactory`로 raw 정의를 뽑아 수동 수정.
- `MongooseModule.forFeature([{ name: Cat.name, schema: CatSchema }])` 등록 → `@InjectModel(Cat.name)`으로 Model 주입. `forFeature`는 현재 module 범위에만 Model을 등록하므로, 다른 module에서 쓰려면 `MongooseModule`을 `exports`에 올리고 그 module을 import한다. `useFactory`의 `inject`에서는 `getModelToken(Cat.name)`이 같은 token이다.
- **관계 참조**: populate 예정이면 `@Prop({ type: ObjectId, ref: 'Owner' })`. 항상 populate하지 않을 필드는 타입을 `mongoose.Types.ObjectId`로 둬서 populated 참조와 혼동을 막는다.

## Model CRUD 결과 계약

Mongoose 9.10.3 API 기준으로 조회, 수정, 삭제 메서드는 대상이 없을 때 예외 대신 빈 결과를 돌려준다. 404 변환은 호출부 책임이다.

| 호출 | 대상이 없을 때 | 주의 |
|---|---|---|
| `find({})` | 빈 배열 | 조건 없는 전체 조회. 목록 API는 `[]`를 정상 결과로 둔다 |
| `findById(id)` | `null` | `null`이면 404 |
| `findByIdAndUpdate(id, update, options)` | `null` | 기본 반환은 수정 **전** 문서. `returnDocument: 'after'` 또는 `new: true`를 줘야 수정 후 문서를 받는다 |
| `findByIdAndDelete(id)` | `null` | 삭제된 문서를 돌려준다 |

- 수정 후 옵션을 빠뜨리면 DB는 바뀌어도 응답은 옛 값이다. 단위 테스트는 옵션 인자까지 `toHaveBeenCalledWith`로 확인하고, 통합 테스트는 응답 본문이 보낸 값으로 바뀌었는지 확인한다.
- update validator는 기본으로 꺼져 있다. `findByIdAndUpdate(id, body)`는 `runValidators: true` 없이는 `required` 같은 스키마 검증을 돌리지 않는다. 켜도 update 연산에 대한 제한된 검증이므로, 전체 검증이 필요하면 문서를 읽어 바꾼 뒤 `save()`한다. `create()`는 `save()`를 거쳐 스키마 검증을 실행한다.

## CastError와 ValidationError는 400으로 번역한다

- Mongoose는 query를 보내기 전에 filter 값을 스키마 타입으로 cast한다. `findById('abc')`처럼 ObjectId로 바꿀 수 없는 값은 query를 `await`하거나 `exec()`할 때 `CastError`(`Cast to ObjectId failed for value "abc" (type string) at path "_id" for model ...`)로 거부된다. DB 서버가 아니라 Mongoose client의 casting 단계다.
- `create()`에서 `required` 필드가 빠지면 `ValidationError`(`err.name === 'ValidationError'`)로 거부된다. casting이 validation보다 먼저 돌고, casting이 실패하면 validation은 돌지 않는다.
- 두 오류 모두 `HttpException`이 아니라서 Nest 내장 필터는 500으로 응답한다([[NestJS-Exception-Filter-Basics]]). 형식 오류는 400, 형식은 맞지만 없는 문서는 404로 나눈다. 경로 파라미터 pipe로 먼저 거르거나 예외 필터에서 두 오류를 400으로 매핑한다.
- `@nestjs/mongoose` 11.0.2부터 `ParseObjectIdPipe`(ObjectId로 변환)와 `IsObjectIdPipe`(문자열 유지)가 잘못된 값을 `BadRequestException`으로 바꾼다. 두 pipe는 `Types.ObjectId.isValid()`로 판정한다.
- `mongoose.isValidObjectId()`와 `isObjectIdOrHexString()`의 차이는 버전을 탄다. Mongoose API 문서 예시는 전자가 12자 문자열과 숫자도 true라고 설명하지만, 2026-09-30에 실행해 보면 Mongoose 9.10.3(bson 7.3.3)은 두 함수 모두 문자열은 24자리 hex만 통과시켰고 숫자 6도 false였다. Mongoose 8.24.4(bson 6.10.4)에서는 12자 문자열은 둘 다 false, 숫자 6은 `isValidObjectId()`만 true였다. 버전과 무관하게 24자리 hex만 받으려면 `isObjectIdOrHexString()`을 쓴다.
- 404 테스트용 ID는 `new Types.ObjectId()`로 만든다. 형식은 유효하고 존재하지 않으므로 fixture와 실행 순서에 의존하지 않는다. 기존 ID의 길이나 문자를 깨뜨린 값은 404가 아니라 CastError 경로를 시험하게 된다([[HTTP-API-Integration-Testing]]).

## unique는 validator가 아니다

- `@Prop({ unique: true })`는 MongoDB unique index를 만드는 편의 옵션이다. 중복 저장은 `ValidationError`가 아니라 MongoDB duplicate key 오류(E11000, code 11000)로 실패한다.
- index가 만들어지기 전의 쓰기에는 중복이 들어갈 수 있다. 테스트에서 DB를 비웠다면 `Model.init()`으로 index 생성을 기다린 뒤 쓴다.
- `exists()`로 확인한 뒤 `create()`하는 흐름은 경쟁 조건이다. 두 요청이 동시에 확인을 통과하면 둘 다 삽입을 시도한다. 사전 조회는 친절한 메시지용으로만 두고, 유일성은 unique index로 강제하며, code 11000을 Repository나 예외 필터에서 409 Conflict 같은 업무 오류로 바꾼다. 이미 있는 리소스와의 충돌은 권한 문제가 아니므로 403보다 409가 의미에 맞는다([[REST]]). annotation 기반 uniqueness 검사가 race를 막지 못하는 것도 같은 원리다([[Spring-MVC-Bean-Validation]]).
- Mongoose는 기본으로 기동 때 스키마의 index마다 `createIndex`를 호출한다. 공식 가이드는 index 생성의 성능 영향 때문에 운영에서 이 동작(`autoIndex`)을 끄라고 권한다. 끄면 unique index를 migration이나 배포 절차에서 명시적으로 만들고 존재를 확인해야 unique가 실제로 적용된다.
- 오래된 예제의 `useNewUrlParser`, `useUnifiedTopology`, `useCreateIndex`, `useFindAndModify`는 Mongoose 6부터 지원하지 않는 옵션이다. 6 이상은 앞의 셋이 true, `useFindAndModify`가 false인 것처럼 동작하므로 제거한다.

Mongoose 자체도 선택 사항이다. MongoDB는 BSON으로 저장하고 공식 Node.js 드라이버가 JavaScript 객체와 변환하므로, Mongoose가 데이터 형식 호환을 해결하는 것은 아니다. Mongoose가 더하는 것은 스키마, 기본값, casting, validation, middleware, populate 같은 ODM 기능이다.

## 트랜잭션 — 세션

`mongoose.startSession()` 직접 호출 대신 `@InjectConnection()`으로 커넥션을 주입받아 `connection.startSession()` → `session.startTransaction()` — NestJS 커넥션 관리와 통합된다. 커밋/중단은 로직에서 명시.

## Hooks(pre/post)와 플러그인 — forFeatureAsync

**모델 컴파일 후에는 `pre()`/`post()` 등록이 동작하지 않는다** (Mongoose 규칙). 훅, 플러그인은 모델 등록 전에 걸어야 하므로 `forFeatureAsync` + `useFactory`에서 스키마에 등록하고 반환한다. 팩토리는 async 가능, `inject`로 다른 프로바이더(ConfigService 등) 사용 가능.

## Discriminator

같은 컬렉션 위에 겹치는 스키마의 모델 여러 개를 두는 상속 메커니즘. `forFeature`/`forFeatureAsync`의 `discriminators: [...]` 옵션으로 등록.

## Virtual

DB에 저장되지 않고 접근 시 계산되는 파생 속성 — `@Virtual({ get() { ... } })` 데코레이터 (fullName 같은 조합 필드).

## Virtual populate와 응답 경계

`populate()`는 `ref`가 가리키는 다른 collection을 조회해 ObjectId 경로를 document로 치환한다. SQL JOIN과 동일한 단일 query라고 가정하지 말고 query 수, projection과 반환 크기를 확인한다.

- 1:N에서 parent document에 child ID 배열을 중복 저장하지 않고 N쪽에 parent reference를 둔다. 반대 방향 탐색이 필요하면 `localField`와 `foreignField`를 지정한 virtual populate를 사용할 수 있다.
- `populate({ path, select })`로 필요한 field만 가져온다. `match`는 child 결과를 거를 뿐 parent document 자체를 거르지 않는다.
- `perDocumentLimit`는 parent별 정확한 제한을 주지만 parent마다 별도 query를 실행할 수 있으므로 목록 API에서 비용을 측정한다.

Virtual이나 TypeScript의 `Readonly<T>`는 민감 field를 숨기는 보안 경계가 아니다. password는 `@Prop({ select: false })` 같은 기본 projection과 명시적 query projection으로 조회부터 제한하고, 최종 응답 DTO 또는 [[NestJS-Serialization|직렬화 계층]]에서도 허용 field만 내보낸다.

## 다중 데이터베이스와 테스트

- `forRoot({ ..., connectionName: 'cats' })` — 커넥션마다 이름 지정, 주입 시 `@InjectModel(Cat.name, 'cats')`.
- 단위 테스트: `getModelToken(Cat.name)`(다중 커넥션이면 두 번째 인자로 커넥션명)을 provide 토큰으로 mock Model 바인딩 — useValue/useClass/useFactory 전부 가능.
- 비동기 설정: `forRootAsync({ useFactory, inject })` — 다른 모듈과 동일한 패턴.

## 관련 문서

- [[NoSQL-Overview|NoSQL 개요]]
- [[MongoDB-Schema-Design|MongoDB 스키마 설계 (embed vs reference)]]
- [[NestJS-Database|NestJS Database (@nestjs/typeorm — RDB 쪽 대응 문서)]]
- [[NestJS-Testing|NestJS Testing (토큰 기반 mock)]]

## 출처
- [NestJS — Mongo](https://docs.nestjs.com/techniques/mongodb)
- [Mongoose — Populate](https://mongoosejs.com/docs/populate.html)
- [Mongoose — Virtuals](https://mongoosejs.com/docs/tutorials/virtuals.html)
- [Mongoose — SchemaType options](https://mongoosejs.com/docs/schematypes.html#schematype-options)
- [Mongoose — Model API](https://mongoosejs.com/docs/api/model.html) (`findByIdAndUpdate`의 `returnDocument`, `new` 기본값, `runValidators`)
- [Mongoose — Validation](https://mongoosejs.com/docs/validation.html) (update validator 기본 off, casting 선행, unique는 validator 아님)
- [Mongoose — Query Casting](https://mongoosejs.com/docs/tutorials/query_casting.html)
- [Mongoose — Mongoose API](https://mongoosejs.com/docs/api/mongoose.html) (`isValidObjectId`, `isObjectIdOrHexString`)
- [Mongoose — FAQ](https://mongoosejs.com/docs/faq.html#unique-doesnt-work) (`Model.init()`과 unique index)
- [Mongoose — Schemas, Indexes](https://mongoosejs.com/docs/guide.html#indexes) (운영에서 autoIndex 비활성 권고)
- [Mongoose — Migrating to 6](https://mongoosejs.com/docs/migrating_to_6.html#no-more-deprecation-warning-options)
- [MongoDB Manual — Error Codes](https://www.mongodb.com/docs/manual/reference/error-codes/) (11000 DuplicateKey)
- [@nestjs/mongoose — pipes](https://github.com/nestjs/mongoose/tree/master/lib/pipes)
- 강의: [회원가입과 Virtual Field](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83830), [Passport와 field projection](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83833), [댓글과 Virtual Populate](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=87810), [DB 스키마, Controller 설계 & validation](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83829), [NestJS와 DB 연결하기, 환경 변수 설정](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83828), [DB 연결 및 서비스 로직 마무리](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=87598)
- 강의(John Ahn): [몽구스 Model, Schema 생성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56447), [getProducts 단위 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56489), [getProductById 단위 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56493), [getProductById 단위 테스트 작성 (2)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56494), [getProductById 통합 테스트 작성 (2)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56497), [updateProduct 단위 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56502), [updateProduct 단위 테스트 작성 (2)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56503), [updateProduct 통합 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56504), [updateProduct 통합 테스트 작성 (2)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56505), [deleteProduct 단위 테스트 작성 (1)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56510), [deleteProduct 단위 테스트 작성 (2)](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56511), [deleteProduct 통합 테스트 작성](https://www.inflearn.com/courses/lecture?courseId=326029&unitId=56512)
