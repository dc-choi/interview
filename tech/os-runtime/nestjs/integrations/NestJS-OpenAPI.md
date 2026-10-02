---
tags: [nestjs, openapi, swagger, api-contract]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
aliases: ["NestJS Swagger", "NestJS OpenAPI 계약"]
---

# NestJS OpenAPI

`@nestjs/swagger`는 controller와 DTO의 metadata로 OpenAPI 문서를 생성한다. 문서에 선언한 인증, 응답 코드, required 조건은 실제 인증이나 validation을 실행하는 설정과 구분한다.

## 생성과 공개 범위

- `DocumentBuilder`로 문서 정보와 security scheme을 정의하고 `SwaggerModule.createDocument(app, config)`로 생성한다. `SwaggerModule.setup()`에 document factory를 전달하면 필요할 때 생성할 수 있다.
- 문서를 eager 생성할 때 versioned route가 필요하면 `enableVersioning()`을 먼저 실행한다. 생성 후 versioning을 켜도 이미 만든 문서는 바뀌지 않는다.
- UI와 raw JSON/YAML 노출은 별도 옵션이다. UI만 숨겨도 문서 데이터는 공개될 수 있으므로 모두 차단하려면 `ui: false`, `raw: false`를 함께 지정한다. 실제 접근 제어는 middleware나 배포 계층에서 적용한다.
- 기본 문서는 전체 module을 포함한다. `include: [Module]`로 범위를 좁히고 `deepScanRoutes`로 imported module route까지 탐색할지 정한다. 여러 API 문서에 같은 decorator를 재사용할 수 있다.
- Swagger UI의 header 기억 기능과 외부 validator URL은 인증정보나 내부 계약의 외부 노출 여부를 검토한 뒤 사용한다.

## DTO와 스키마의 계약

TypeScript interface, generic, union은 런타임 reflection만으로 완전히 복원되지 않는다. DTO class와 `@ApiProperty`, CLI plugin 또는 명시적인 schema를 사용한다.

| 표현 | 선언과 주의점 |
|---|---|
| 선택적 property | `@ApiPropertyOptional()` 또는 `required: false`. TS의 `?`와 runtime validator는 별도다 |
| 배열 | element type을 명시하거나 raw `items` schema를 쓴다 |
| 순환 참조 | `type: () => RelatedDto`처럼 lazy factory를 쓴다 |
| 재사용 enum | `enum`과 `enumName`을 함께 주어 component schema로 만든다. client 코드의 같은 enum 중복 생성을 줄인다 |
| generic 응답 | `@ApiExtraModels()`/`extraModels`, `getSchemaPath()`와 raw schema를 조합한다. generic 타입 인자 자동 추론에 의존하지 않는다 |
| 조합 schema | `oneOf`는 하나만, `anyOf`는 하나 이상, `allOf`는 모든 schema 조건을 만족한다. 응답 구현도 같은 계약을 따라야 한다 |
| 파일 | multipart `@ApiConsumes`, `@ApiBody`의 `type: 'string', format: 'binary'`. 복수 파일은 해당 schema의 배열 |

`PartialType`, `PickType`, `OmitType`, `IntersectionType`은 OpenAPI DTO에서 `@nestjs/swagger`의 구현을 사용한다. GraphQL이나 일반 mapped-types의 import를 그대로 사용하면 필요한 API metadata가 누락될 수 있다. optional 문서 표기는 `class-validator`의 검증을 대신하지 않는다.

## Standard Schema 통합

NestJS v12의 schema 기반 DTO를 OpenAPI에 연결하려면 입력과 출력의 JSON Schema 계약을 나눠 생각한다. coercion이나 transform이 있으면 요청의 입력 타입과 응답의 출력 타입이 다를 수 있다.

- Standard Schema의 `~standard.jsonSchema`를 지원하는 라이브러리는 변환기를 사용할 수 있다. 공식 예시는 Zod v4.2 이상을 사용한다.
- 별도의 라이브러리 변환이 필요하면 converter를 지정한다. 사용자 converter가 먼저 처리하고 `undefined`를 반환하면 기본 변환기로 넘기므로, 지원하는 vendor/schema만 처리한다.
- schema decorator와 JSON Schema 생성만으로 validation은 실행되지 않는다. `StandardSchemaValidationPipe`와 필요하면 `StandardSchemaSerializerInterceptor`를 실제 pipeline에 등록한다.
- 변환할 수 없는 schema를 임의로 정확한 OpenAPI 계약처럼 게시하지 않는다. custom type이나 transform은 생성 결과와 실제 request/response를 대조한다.

## Operation과 인증 metadata

`@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiQuery`, `@ApiHeader`는 설명과 계약을 보완한다. `@ApiResponse({ status: 201 })`를 붙여도 실제 status는 바뀌지 않으며 `@HttpCode()`와 controller 동작을 따로 맞춘다.

Security decorator의 이름은 `DocumentBuilder.addBearerAuth`, `addApiKey`, `addOAuth2` 등에 등록한 scheme 이름과 일치해야 한다. `@ApiBearerAuth()`는 Guard를 설치하지 않는다. 보호된 API는 실제 Guard와 인증 구현이 필요하다.

`@ApiTags()`는 operation을 묶는다. OpenAPI 3.2의 tag `parent`, `kind` 같은 기능을 쓰려면 문서 spec version을 3.2로 지정하고 소비 도구의 지원도 확인한다. tag를 붙이는 것만으로 계층 구조가 생기지는 않는다.

## CLI plugin과 빌드의 경계

- CLI plugin은 opt-in AST 변환이다. 기본 `.dto.ts`, `.entity.ts` suffix를 분석하며 `dtoFileNameSuffix`로 조정한다. `?`, 타입, validation decorator와 comment를 바탕으로 metadata를 보완하고 명시한 API decorator가 우선한다.
- `introspectComments`는 설명과 예시를 생성한다. comment의 `@param` 이름은 TS method parameter의 변수 이름을 따르므로 실제 wire parameter 이름과 혼동하지 않는다.
- plugin은 빌드 시 metadata를 추가할 뿐 runtime validation 규칙을 대신하지 않는다. 보안, serializer, custom transform으로 바뀌는 결과도 별도로 기술한다.
- SWC 빌드는 type checking과 plugin metadata 생성 경로를 함께 설정하고 `SwaggerModule.loadPluginMetadata()`를 문서 생성 전에 호출한다.
- Jest의 ts-jest 변환은 Nest CLI plugin 설정을 자동 적용하지 않는다. 필요하면 별도 AST transformer를 설정하고 plugin 옵션 변경 시 변환 cache를 정리한다.

## 문서 생성의 선택과 크기 제한

`onlyIncludeDecoratedEndpoints: true`는 `@ApiIncludeEndpoint()`가 붙은 route만 명세에 넣는다. endpoint의 실제 노출을 차단하는 옵션은 아니다. `excludeDynamicDefaults`는 Date나 class instance 같은 non-plain 기본값을 명세에서 제외해 재시작마다 생기는 diff를 줄인다. 문서 옵션과 property의 `exampleMaxDepth`는 example만 줄이며 `$ref`, properties/items의 schema graph는 그대로 둔다.

`DeepPartialType`은 중첩 DTO까지 optional로 만드는 계약으로, 최상위 field만 optional로 만드는 `PartialType`과 다르다. API 스키마와 validation의 null/undefined 처리도 생성된 DTO에서 확인한다.

`@ApiWebhook()`은 OpenAPI 3.1 이상의 `document.webhooks`에 등록하는 문서화 기능이다. 수신 controller route나 [[NestJS-Webhooks|실제 webhook 발송과 검증]]을 설치하지 않는다. `patchDocumentOnRequest`는 document 또는 Promise를 반환할 수 있어 tenant별 계약을 바꿀 수 있지만, 인가된 요청의 tenant로 범위를 정하고 캐시가 서로 다른 tenant 문서를 섞지 않게 한다.

공식 Swagger sample은 문서 JSON/UI 테스트와 입력 validation 테스트를 별도로 둔다. sample main의 Swagger 등록만 따라 하고 테스트에만 ValidationPipe를 켜면 운영 validation은 다르다. 문서의 bearer scheme 선언도 실제 Guard를 대신하지 않는다.

## 관련 문서

- [[Controller|Controller]], [[Validation|Validation]]
- [[NestJS-GraphQL-Schema-Mapping|GraphQL 스키마와 타입 매핑]]
- [[NestJS-Serialization|응답 직렬화]], [[NestJS-File-Upload|파일 업로드]]

## 출처

- [NestJS Documentation, OpenAPI Introduction](https://docs.nestjs.com/openapi/introduction)
- [NestJS Documentation, Types and parameters](https://docs.nestjs.com/openapi/types-and-parameters)
- [NestJS Documentation, Operations](https://docs.nestjs.com/openapi/operations)
- [NestJS Documentation, Security](https://docs.nestjs.com/openapi/security)
- [NestJS Documentation, Mapped types](https://docs.nestjs.com/openapi/mapped-types)
- [NestJS Documentation, Decorators](https://docs.nestjs.com/openapi/decorators)
- [NestJS Documentation, CLI plugin](https://docs.nestjs.com/openapi/cli-plugin)
- [NestJS Documentation, Other features](https://docs.nestjs.com/openapi/other-features)
- [NestJS API, SwaggerDocumentOptions](https://api-references-nestjs.netlify.app/api/swagger/SwaggerDocumentOptions)
- [NestJS API, SwaggerCustomOptions](https://api-references-nestjs.netlify.app/api/swagger/SwaggerCustomOptions)
- [NestJS API, ApiWebhook](https://api-references-nestjs.netlify.app/api/swagger/ApiWebhook)
- [NestJS API, DeepPartialType](https://api-references-nestjs.netlify.app/api/swagger/DeepPartialType)
- [NestJS sample, Swagger bootstrap](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/11-swagger/src/main.ts)
