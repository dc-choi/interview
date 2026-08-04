---
tags: [nestjs, mongodb, mongoose, schema, transaction]
status: done
verified_at: 2026-08-04
category: "OS & Runtime - NestJS"
aliases: ["NestJS MongoDB", "@nestjs/mongoose", "MongooseModule"]
---

# NestJS MongoDB — @nestjs/mongoose

Mongoose는 Schema → Model 순으로 파생된다. `@nestjs/mongoose`는 데코레이터로 스키마 보일러플레이트를 줄이고, Model을 DI 토큰으로 주입한다.

## 스키마 정의와 Model 주입

- `@Schema()` 클래스 데코레이터 — 클래스명 + s 복수형이 컬렉션명(`Cat` → `cats`). 인자는 mongoose.Schema 생성자의 옵션 객체.
- `@Prop()` — 타입은 TS 메타데이터로 자동 추론. 배열, 중첩 객체는 추론이 안 되므로 명시(`@Prop([String])`). 옵션 객체로 `required`, `default`, `immutable` 등.
- `SchemaFactory.createForClass(Cat)`로 스키마 생성. 데코레이터로 표현하기 어려운 엣지는 `DefinitionsFactory`로 raw 정의를 뽑아 수동 수정.
- `MongooseModule.forFeature([{ name: Cat.name, schema: CatSchema }])` 등록 → `@InjectModel(Cat.name)`으로 Model 주입.
- **관계 참조**: populate 예정이면 `@Prop({ type: ObjectId, ref: 'Owner' })`. 항상 populate하지 않을 필드는 타입을 `mongoose.Types.ObjectId`로 둬서 populated 참조와 혼동을 막는다.

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
- 강의: [회원가입과 Virtual Field](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83830), [Passport와 field projection](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=83833), [댓글과 Virtual Populate](https://www.inflearn.com/courses/lecture?courseId=327273&unitId=87810)
