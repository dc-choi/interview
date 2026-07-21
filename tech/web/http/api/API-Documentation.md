---
tags: [web, http, api, documentation]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["API Documentation", "API 문서화"]
verified_at: 2026-07-21
---

# API 문서화

API는 **서비스의 계약**. 문서화가 구린 API는 소비자(프론트, 모바일, 외부 파트너)가 실제로 쓸 수 없다. 도구 선택보다 더 중요한 건 **"스펙이 진실과 일치하는가"** — 코드와 동기화 실패가 가장 흔한 실무 함정.

## 문서화 방식 비교

| 방식 | 강점 | 약점 |
|---|---|---|
| **OpenAPI/Swagger** | **표준**, Swagger UI, Codegen, Postman 호환 | YAML/JSON 길어짐, 수기 관리 비용 |
| **Blueprint** | 마크다운 기반, 읽기 좋음 | 생태계 축소, Dredd 같은 도구 제한적 |
| **GraphQL Schema** | 타입과 operation 계약을 introspection 가능 | 사용 사례, 인증, 오류와 운영 의미는 별도 설명 필요, GraphQL에 한정 |
| **ReadMe / GitBook** | UI 훌륭, 비개발자 공유 쉬움 | 코드 동기화 어려움 |
| **Postman Collection** | 즉시 테스트 가능 | 문서 목적으론 제한적 |
| **Slate / ReDoc / Swagger UI** | 정적 사이트로 배포, 예쁨 | 입력은 OpenAPI, markdown |

## 오늘날 기본값: OpenAPI 3.x

- HTTP API 명세에 널리 쓰이는 표준이며 주요 언어와 프레임워크에 generator와 도구가 존재
- **스펙 파일 → UI 자동 생성** (Swagger UI, ReDoc)
- **스펙 파일 → 클라이언트 SDK 자동 생성** (openapi-generator)
- **스펙 파일 → 목(mock) 서버** (Prism, Stoplight)
- 포맷: YAML (사람이 쓰기 편함) 또는 JSON

## 코드와 스펙의 동기화 전략

문서가 거짓말이 되지 않게 하는 게 진짜 과제. 세 접근:

### 1. Code-First (코드 → 스펙 생성)
코드에 애노테이션, 데코레이터로 메타데이터 추가 → 빌드 시 OpenAPI 생성.

예시:
- Spring: **springdoc-openapi** (`@Operation`, `@Parameter`) 
- NestJS: **`@nestjs/swagger`** (`@ApiOperation`, `@ApiProperty`) — `SwaggerModule.createDocument()`가 만드는 문서는 OpenAPI 스펙을 따르는 **직렬화 가능 객체**라, Swagger UI 서빙 외에 JSON/YAML 파일로 저장해 codegen이나 CI 산출물로 쓸 수 있다. `SwaggerModule.setup('api', ...)`처럼 UI path가 `/api`일 때 raw JSON 기본값은 `/api-json`이며, 실제 path에 따라 파생되거나 `jsonDocumentUrl`/`yamlDocumentUrl`로 변경할 수 있다.
- Express: tsoa, express-openapi
- FastAPI: 타입 힌트와 라우트 선언을 바탕으로 자동 생성
- Django: drf-spectacular

**장점**: 라우트와 타입에서 스펙을 생성해 구조적 drift를 줄이고, 생성 결과를 CI에서 검증하기 쉬움. 설명, 예시와 런타임 동작까지 자동으로 정확해지는 것은 아님.
**단점**: 애노테이션 보일러플레이트, 코드에 문서화 관심사 섞임. NestJS는 이 보일러플레이트를 Swagger CLI 플러그인으로 줄인다 — DTO 프로퍼티는 TS 리플렉션에 안 잡혀 기본적으로 `@ApiProperty` 명시가 필요한데, 플러그인이 컴파일 시 자동 부착한다 (GraphQL CLI 플러그인과 같은 계열). `?`로 required 추론, 기본값/enum 반영에 더해 **classValidatorShim이 class-validator 데코레이터를 스웨거 검증 규칙으로도 반영**해 검증과 문서가 한 소스에서 나온다 (런타임 검증 자체는 여전히 class-validator 몫). 분석 대상은 `.dto.ts`/`.entity.ts` 서픽스 파일만(`dtoFileNameSuffix`로 조정), 주석은 `introspectComments`로 description/example이 된다. `createDocument`의 `include` 옵션으로 모듈 서브셋별 스펙을 여러 개 만들어 **공개 API 문서와 내부 API 문서를 분리**할 수도 있다.

### 2. Spec-First (스펙 → 코드 생성)
OpenAPI 스펙 먼저 작성 → Controller 인터페이스, 클라이언트 SDK 자동 생성.

**장점**: API 설계를 코드보다 먼저 검토, 합의, 프론트가 mock으로 병렬 개발.
**단점**: 생성된 경계 밖의 구현이 스펙과 어긋날 수 있어 contract test가 필요하고, 생성된 코드를 직접 수정하면 재생성 때 충돌하거나 덮어쓸 수 있음.

### 3. Manual (수기 관리)
GitBook, Slate, ReadMe, Confluence, 심지어 Excel.

**장점**: 처음엔 빠름, UI 풍부.
**단점**: 변경 책임자와 리뷰 절차가 없으면 코드 변경 뒤 쉽게 낡는다. 비개발자 설명과 사용 사례 문서에는 유용할 수 있지만 명세의 정본과 동기화 규칙이 필요하다.

## 실무 선택 가이드

- **REST API + 내부, 외부 소비자** → OpenAPI Code-First가 유력한 선택지. 계약을 먼저 합의해야 하거나 SDK 생성이 중심이면 Spec-First도 비교
- **GraphQL** → 스키마 + GraphiQL, Apollo Studio
- **gRPC** → `.proto`가 인터페이스 계약이며, 사람이 읽을 설명과 예시는 주석이나 별도 가이드로 보완. `buf` 같은 도구로 검사와 문서 생성 가능
- **비개발자도 보는 공개 API** → OpenAPI + ReDoc으로 정적 사이트 배포

Code-First와 자동 생성 UI는 흔한 조합이지만 조직의 계약 소유 방식과 소비자에 따라 Spec-First나 혼합 방식을 선택할 수 있다.

## 명세 서빙 토폴로지 — 서비스 내장 vs 중앙 수집

- **서비스 내장**: 각 서비스가 자체 Swagger UI를 띄운다 (NestJS의 SwaggerModule.setup 등). 팀과 서비스가 많아지면 전체 API 탐색성이 떨어질 수 있고, 서비스마다 문서 생성과 접근 제어를 운영해야 한다.
- **중앙 수집형**: 각 서비스가 배포 시점에 명세 파일(YAML/JSON)을 아티팩트로 생성해 명세 저장소에 모으고, 중앙 문서 서버가 이를 동적으로 리소스 등록해 **하나의 UI 드롭다운**으로 서빙한다. 서비스에 문서 라이브러리를 직접 적용할 수 없는 환경 제약이 있거나 전사 API 가시성이 필요할 때 유효한 구조.
  - 배포 파이프라인에서 코드 어노테이션 분석 → 요청/응답 모델 순회 → 명세 생성이 자동으로 돌므로, 수기 문서 대비 누락과 최신화 지연이 줄어든다 (Code-First의 이점을 중앙 서빙과 결합).
  - 함정: 명세를 문자열 조립으로 생성하면 구조가 복잡해질수록 누락, 들여쓰기 오류가 난다. YAML 직렬화 라이브러리나 OpenAPI 모델 객체로 생성한다. 파일 위치는 환경별 절대 경로로 하드코딩하지 말고 설정값이나 알려진 workspace root를 기준으로 일관되게 resolve한다.
  - NestJS 대응: `SwaggerModule.createDocument()` 결과를 파일로 내보내면 같은 수집 구조에 태울 수 있다.

## 좋은 API 문서의 요건

### 필수
- **엔드포인트 경로, 메서드**
- **요청**: 경로/쿼리/헤더/바디 파라미터, 각 타입, 제약(필수 여부, 범위)
- **응답**: 상태 코드별 바디 스키마, 에러 형식
- **인증 방식** (Bearer, Cookie, API Key)
- **예시 요청, 응답** (curl, JSON)

### 권장
- **에러 코드 사전** — `ERR_INVALID_EMAIL` 같은 애플리케이션 레벨 코드와 설명
- **Rate Limit** 정책
- **Pagination, Filtering, Sorting** 컨벤션
- **Versioning** 정책
- **Changelog** — 최근 변경 사항
- **Try it out** 버튼 — 실제 호출 가능 (Swagger UI)

### 있으면 좋음
- **의사결정 맥락** — 왜 이 API가 존재하는가 (도메인 배경)
- **Use case별 예시** — "회원가입 플로우" 전체 시퀀스
- **Deprecated API** 명시 + 마이그레이션 가이드

## 리뷰 문화

API 소비자인 프론트, 모바일, QA가 리뷰에 참여해야 한다. 복잡한 변경은 동기 회의가 유용하고, 명확한 diff와 예시가 있으면 비동기 리뷰도 가능하다.
- 소비자 관점에서 "이 필드는 왜 옵션인가?" 같은 질문으로 설계 결함 발견
- 인증, 에러 처리가 일관성 있는지 확인
- 문서화 누락 감지

## 흔한 실수

- **실제 사용자 이메일, credential이나 token을 예시로 사용** → 개인정보 또는 secret 노출 사고
- **성공 응답만 있고 에러 응답 누락** → 소비자가 장애 처리 못 함
- **Authentication 설명 모호** → 소비자가 시행착오를 겪고 통합 시간이 늘어남
- **버저닝과 호환성 전략 없음** → 파괴적 변경 시 영향을 받는 클라이언트가 동시에 깨질 수 있음
- **자동 생성인데 예시, 설명 비어있음** → 타입만 있고 맥락 없음

## 면접 체크포인트

- Code-First vs Spec-First 트레이드오프
- OpenAPI가 표준인 이유
- 좋은 API 문서의 필수 요소 5가지
- 수기 문서가 정본과 달라지는 drift 위험과 방지책
- 문서 리뷰가 코드 리뷰만큼 중요한 이유

## 출처
- [OpenAPI Specification 3.2.0](https://spec.openapis.org/oas/v3.2.0.html)
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 6-1. API 스펙 설계](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-6.-API-%EC%8A%A4%ED%8E%99-%EC%84%A4%EA%B3%84%EC%99%80-%EB%AC%B8%EC%84%9C%ED%99%94-%EB%B0%A9%EC%8B%9D-%EA%B2%B0%EC%A0%95-1)
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 6-2. API 문서화 방식](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-6.-API-%EC%8A%A4%ED%8E%99-%EC%84%A4%EA%B3%84%EC%99%80-%EB%AC%B8%EC%84%9C%ED%99%94-%EB%B0%A9%EC%8B%9D-%EA%B2%B0%EC%A0%95-2)
- [NestJS — OpenAPI Introduction](https://docs.nestjs.com/openapi/introduction)
- [NestJS — OpenAPI Types and parameters](https://docs.nestjs.com/openapi/types-and-parameters)
- [NestJS — OpenAPI Operations](https://docs.nestjs.com/openapi/operations)
- [NestJS — OpenAPI Security](https://docs.nestjs.com/openapi/security)
- [NestJS — OpenAPI CLI Plugin](https://docs.nestjs.com/openapi/cli-plugin)
- [NestJS — OpenAPI Other features](https://docs.nestjs.com/openapi/other-features)
- [Swagger 기반 API 명세 자동화 PoC — Nextree](https://www.nextree.io/swagger-giban-api-myeongse-jadonghwa-poc/)

## 관련 문서
- [[REST|REST API]]
- [[API-Comparison|REST vs GraphQL vs gRPC]]
- [[API-Conventions|API 컨벤션 (네이밍, 날짜, 에러)]]
