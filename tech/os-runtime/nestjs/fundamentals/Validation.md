---
tags: [runtime, nestjs, validation, dto, class-validator]
status: done
verified_at: 2026-10-02
category: "OS & Runtime"
aliases: ["Validation", "ValidationPipe 딥다이브", "Mapped Types"]
---

# Validation — 클래스 DTO와 Standard Schema

전역에 `app.useGlobalPipes(new ValidationPipe())`를 바인딩하면 class-validator 데코레이터가 붙은 DTO를 쓰는 모든 라우트가 자동 검증되고, 위반 시 400과 메시지 배열로 응답한다. **옵션 표(whitelist, transform 등)와 DTO 작성 패턴은 [[NestJS-Pipes]]가 정본** — 이 문서는 그 밖의 변환 시맨틱, 타입 유틸, 배열 검증을 다룬다.

## DTO는 구체 클래스여야 한다

- TS는 **제네릭과 인터페이스의 메타데이터를 저장하지 않으므로** DTO에 쓰면 ValidationPipe가 검증하지 못한다 — 구체 클래스로 정의.
- DTO를 `import type`으로 가져오면 런타임에 지워져 동작하지 않는다 — 값 import 필수.

## transform과 원시 타입 변환

- `transform: true`는 평문 객체를 DTO 인스턴스로 바꾸는 것에 더해 **원시 타입 변환**도 수행한다. 경로/쿼리 파라미터는 전부 string으로 오는데, 시그니처가 `@Param('id') id: number`면 number로 자동 변환.
- transform 없이 명시 변환하려면 `ParseIntPipe`, `ParseBoolPipe`를 파라미터에 직접 (`ParseStringPipe`는 없다 — 원래 string으로 오기 때문).

## Mapped Types — CRUD 변형 DTO

`@nestjs/mapped-types`의 타입 변환 유틸로 create/update 변형 보일러플레이트를 제거한다.

| 유틸 | 결과 |
|------|------|
| `PartialType(CreateCatDto)` | 전 필드 optional — update DTO 표준 |
| `PickType(CreateCatDto, ['age'] as const)` | 지정 필드만 뽑은 타입 |
| `OmitType(CreateCatDto, ['name'] as const)` | 지정 필드를 제외한 타입 |
| `IntersectionType(A, B)` | 두 타입을 결합한 타입 |

- **import 출처 경고**: Swagger 앱은 `@nestjs/swagger`, GraphQL 앱은 `@nestjs/graphql`의 동명 유틸을 써야 한다. 이들 대신 `@nestjs/mapped-types`를 쓰면 문서화되지 않은 사이드이펙트가 날 수 있다 (두 패키지가 타입 메타데이터에 강하게 의존).

## 배열 검증 — ParseArrayPipe

- 최상위가 배열(`@Body() dtos: CreateUserDto[]`)이면 제네릭 메타데이터 소실로 검증되지 않는다. 배열을 감싸는 전용 클래스를 만들거나 `@Body(new ParseArrayPipe({ items: CreateUserDto }))`.
- 쿼리스트링의 comma 구분 리스트 파싱: `new ParseArrayPipe({ items: Number, separator: ',' })`.

## v12의 Standard Schema 검증

`StandardSchemaValidationPipe`는 Zod, Valibot, ArkType 등 Standard Schema schema의 `~standard.validate()`를 사용한다. handler의 `@Body({ schema })`, `@Param('id', { schema })`, `@Query({ schema })`는 metadata만 저장하므로 pipe를 실제로 등록해야 한다. schema가 없는 인자는 그대로 통과한다. 클래스 기반 ValidationPipe와 함께 점진적으로 도입할 수 있다.

- 기본 `transform: true`는 schema의 **출력**을 handler에 전달해 coercion, default, transform을 적용한다. false면 검증 뒤 원래 입력을 넘기므로 TS 타입도 `z.input` 등 입력 타입을 따른다.
- 알 수 없는 key의 처리 방식은 pipe의 whitelist 옵션이 아니라 schema가 정한다. Zod의 `object`는 제거, `strictObject`는 거부, `looseObject`는 유지한다.
- schema의 array는 element까지 검증한다. 클래스 배열의 metadata 소실과 구분한다. 에러 path에는 array index도 포함된다.
- custom param decorator의 검증은 `validateCustomDecorators: true`로 활성화한다. `validateOptions`는 라이브러리 검증 옵션, `exceptionFactory`는 검증 issue를 해당 transport의 예외로 변환한다.
- 클래스 ValidationPipe의 v12 `errorFormat`은 기본 list 또는 property path별 grouped 형식이다. validation error에 target/value를 담는 옵션은 민감 입력의 노출 여부를 확인한다.

## 전송층 무관

ValidationPipe와 StandardSchemaValidationPipe는 HTTP, WebSocket, 마이크로서비스에서 사용할 수 있다. 기본 실패 예외는 HTTP용이므로 `exceptionFactory`에서 WS는 `WsException`, RPC는 `RpcException`으로 바꾼다. HTTP exception을 다른 transport에 그대로 던지면 원하는 오류 계약이 되지 않는다.

## 타입 선언과 실제 pipeline을 함께 확인

공식 Zod sample은 `z.infer<typeof Schema>`로 TS DTO를 만들고 `@Body({ schema: Schema })`와 global StandardSchemaValidationPipe를 함께 등록한다. DTO 타입만 정의하거나 schema metadata만 붙인 상태는 validation 완료가 아니다. 유효 입력, 잘못된 타입과 필수 field 누락을 실제 HTTP 요청으로 확인한다.

커스텀 pipe의 계약은 `transform(value, ArgumentMetadata)`의 **반환값**이 handler 인자가 된다는 것이다. `ArgumentMetadata.schema`는 schema metadata이며 metatype과 다른 필드다. 숫자 parsing 예제의 `parseInt`를 검증 정책으로 그대로 쓰면 `12x` 같은 입력이 12로 수용될 수 있다. 정수 전체 문자열 계약이 필요하면 built-in ParseIntPipe 또는 해당 schema의 명시적인 규칙을 쓴다.

## 관련 문서

- [[NestJS-Pipes|Pipes (ValidationPipe 옵션 표, DTO 패턴, Zod 대안)]]
- [[DTO-Layering|DTO 레이어링]]
- [[NestJS-Custom-Decorator-Patterns|커스텀 데코레이터 (validateCustomDecorators)]]

## 출처
- [NestJS — Validation](https://docs.nestjs.com/application/validation)
- [NestJS — OpenAPI Mapped types](https://docs.nestjs.com/openapi/mapped-types)
- [NestJS API, ArgumentMetadata](https://api-references-nestjs.netlify.app/api/common/ArgumentMetadata)
- [NestJS API, PipeTransform](https://api-references-nestjs.netlify.app/api/common/PipeTransform)
- [NestJS sample, Standard Schema input](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/35-zod-validation/src/cats/cats.controller.ts)
