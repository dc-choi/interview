---
tags: [runtime, nestjs, validation, dto, class-validator]
status: done
category: "OS & Runtime"
aliases: ["Validation", "ValidationPipe 딥다이브", "Mapped Types"]
---

# Validation — ValidationPipe 딥다이브

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

## 전송층 무관

ValidationPipe는 HTTP뿐 아니라 WebSocket, 마이크로서비스 컨텍스트에서도 동일하게 동작한다.

## 관련 문서

- [[NestJS-Pipes|Pipes (ValidationPipe 옵션 표, DTO 패턴, Zod 대안)]]
- [[DTO-Layering|DTO 레이어링]]
- [[NestJS-Custom-Decorator-Patterns|커스텀 데코레이터 (validateCustomDecorators)]]

## 출처
- [NestJS — Validation](https://docs.nestjs.com/techniques/validation)
- [NestJS — OpenAPI Mapped types](https://docs.nestjs.com/openapi/mapped-types)
