---
tags: [web, http, api, documentation]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["API Documentation", "API 문서화"]
---

# API 문서화

API는 **서비스의 계약**. 문서화가 구린 API는 소비자(프론트·모바일·외부 파트너)가 실제로 쓸 수 없다. 도구 선택보다 더 중요한 건 **"스펙이 진실과 일치하는가"** — 코드와 동기화 실패가 가장 흔한 실무 함정.

## 문서화 방식 비교

| 방식 | 강점 | 약점 |
|---|---|---|
| **OpenAPI/Swagger** | **표준**, Swagger UI·Codegen·Postman 호환 | YAML/JSON 길어짐, 수기 관리 비용 |
| **Blueprint** | 마크다운 기반, 읽기 좋음 | 생태계 축소, Dredd 같은 도구 제한적 |
| **GraphQL Schema** | **스키마 자체가 문서** | GraphQL 프로젝트에 한정 |
| **ReadMe / GitBook** | UI 훌륭, 비개발자 공유 쉬움 | 코드 동기화 어려움 |
| **Postman Collection** | 즉시 테스트 가능 | 문서 목적으론 제한적 |
| **Slate / ReDoc / Swagger UI** | 정적 사이트로 배포, 예쁨 | 입력은 OpenAPI·markdown |

## 오늘날 기본값: OpenAPI 3.x

- **업계 표준** — 거의 모든 언어·프레임워크에 generator 존재
- **스펙 파일 → UI 자동 생성** (Swagger UI, ReDoc)
- **스펙 파일 → 클라이언트 SDK 자동 생성** (openapi-generator)
- **스펙 파일 → 목(mock) 서버** (Prism, Stoplight)
- 포맷: YAML (사람이 쓰기 편함) 또는 JSON

## 코드와 스펙의 동기화 전략

문서가 거짓말이 되지 않게 하는 게 진짜 과제. 세 접근:

### 1. Code-First (코드 → 스펙 생성)
코드에 애노테이션·데코레이터로 메타데이터 추가 → 빌드 시 OpenAPI 생성.

예시:
- Spring: **springdoc-openapi** (`@Operation`·`@Parameter`) 
- NestJS: **`@nestjs/swagger`** (`@ApiOperation`·`@ApiProperty`)
- Express: tsoa·express-openapi
- FastAPI: **자동 생성** (타입 힌트 기반, 가장 우아)
- Django: drf-spectacular

**장점**: 코드와 스펙이 자동 동기화, 개발자가 문서를 "잊기" 어려움.
**단점**: 애노테이션 보일러플레이트, 코드에 문서화 관심사 섞임.

### 2. Spec-First (스펙 → 코드 생성)
OpenAPI 스펙 먼저 작성 → Controller 인터페이스·클라이언트 SDK 자동 생성.

**장점**: API 설계를 코드보다 먼저 검토·합의, 프론트가 mock으로 병렬 개발.
**단점**: 스펙과 구현이 어긋나면 잡기 어려움, 생성된 코드 수정 시 덮어쓰기 충돌.

### 3. Manual (수기 관리)
GitBook, Slate, ReadMe, Confluence, 심지어 Excel.

**장점**: 처음엔 빠름, UI 풍부.
**단점**: **거의 무조건 쓸모없어짐** — 코드 바뀌면 문서 안 바뀜. 비개발자 소비자용 제한적 OK.

## 실무 선택 가이드

- **REST API + 내부·외부 소비자** → **OpenAPI Code-First**가 기본. Spring/NestJS/FastAPI 모두 지원
- **GraphQL** → 스키마 + GraphiQL·Apollo Studio
- **gRPC** → `.proto` 파일이 곧 문서, `buf` 같은 도구로 HTML 생성
- **비개발자도 보는 공개 API** → OpenAPI + ReDoc으로 정적 사이트 배포

Code-First + 자동 생성된 UI 배포가 가장 일반적.

## 좋은 API 문서의 요건

### 필수
- **엔드포인트 경로·메서드**
- **요청**: 경로/쿼리/헤더/바디 파라미터, 각 타입·제약(필수 여부, 범위)
- **응답**: 상태 코드별 바디 스키마, 에러 형식
- **인증 방식** (Bearer·Cookie·API Key)
- **예시 요청·응답** (curl, JSON)

### 권장
- **에러 코드 사전** — `ERR_INVALID_EMAIL` 같은 애플리케이션 레벨 코드와 설명
- **Rate Limit** 정책
- **Pagination·Filtering·Sorting** 컨벤션
- **Versioning** 정책
- **Changelog** — 최근 변경 사항
- **Try it out** 버튼 — 실제 호출 가능 (Swagger UI)

### 있으면 좋음
- **의사결정 맥락** — 왜 이 API가 존재하는가 (도메인 배경)
- **Use case별 예시** — "회원가입 플로우" 전체 시퀀스
- **Deprecated API** 명시 + 마이그레이션 가이드

## 리뷰 문화

API 문서는 **"올려놓고 읽어봐 주세요"만으로 안 된다**. 프론트·모바일·QA와 **대면 리뷰**가 효과적:
- 소비자 관점에서 "이 필드는 왜 옵션인가?" 같은 질문으로 설계 결함 발견
- 인증·에러 처리가 일관성 있는지 확인
- 문서화 누락 감지

## 흔한 실수

- **이메일·비밀번호 예시를 실제 값으로** → 보안 사고
- **성공 응답만 있고 에러 응답 누락** → 소비자가 장애 처리 못 함
- **Authentication 설명 모호** → 프론트 개발 시간 2배
- **버저닝 전략 없음** → v1 파괴적 변경 시 모든 클라이언트 깨짐
- **자동 생성인데 예시·설명 비어있음** → 타입만 있고 맥락 없음

## 면접 체크포인트

- Code-First vs Spec-First 트레이드오프
- OpenAPI가 표준인 이유
- 좋은 API 문서의 필수 요소 5가지
- 수기 문서가 쓸모없어지는 메커니즘
- 문서 리뷰가 코드 리뷰만큼 중요한 이유

## 출처
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 6-1. API 스펙 설계](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-6.-API-%EC%8A%A4%ED%8E%99-%EC%84%A4%EA%B3%84%EC%99%80-%EB%AC%B8%EC%84%9C%ED%99%94-%EB%B0%A9%EC%8B%9D-%EA%B2%B0%EC%A0%95-1)
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 6-2. API 문서화 방식](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-6.-API-%EC%8A%A4%ED%8E%99-%EC%84%A4%EA%B3%84%EC%99%80-%EB%AC%B8%EC%84%9C%ED%99%94-%EB%B0%A9%EC%8B%9D-%EA%B2%B0%EC%A0%95-2)

## 관련 문서
- [[REST|REST API]]
- [[API-Comparison|REST vs GraphQL vs gRPC]]
- [[API-Conventions|API 컨벤션 (네이밍·날짜·에러)]]
