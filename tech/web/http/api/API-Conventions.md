---
tags: [web, http, api, convention]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["API Conventions", "API 컨벤션"]
---

# API 실무 컨벤션

설계 원칙([[REST]])과 별개로, **실무에서 매번 결정해야 하는 디테일**. 팀·조직에서 한 번 정해놓지 않으면 매 API마다 다르게 써서 소비자가 혼란.

## 시간 (Timestamp)

### 저장 형식
- **UTC로 저장** — 타임존 혼재의 근원 차단. DB는 `TIMESTAMP WITH TIME ZONE` 또는 UTC `DATETIME` 명시
- 로컬 시간 저장 금지 — 서버 이전·멀티 리전 시 치명적

### API 전송 형식
- **ISO 8601** 권장 — `2026-04-17T17:00:00.000Z`
- `Z`가 UTC임을 명시 → 타임존 문서화 불필요
- 소수점 밀리초 포함 — 정렬·정확성

```
✅ "2026-04-17T17:00:00.000Z"
❌ "2026-04-17 17:00:00"        (타임존 불명)
❌ "1745506800000"               (Unix timestamp — 사람이 못 읽음)
❌ "4/17/2026"                   (로컬 포맷, 모호)
```

### 특수 상황
- **생년월일·공휴일** 같은 "날짜만" 값: `YYYY-MM-DD` (타임존 없음)
- **이벤트 시각 + 사용자 타임존**: UTC + 별도 `timezone` 필드

## JSON 키 네이밍

| 스타일 | 예 | 쓰는 곳 |
|---|---|---|
| **camelCase** | `firstName`, `createdAt` | **권장** — JS·Java·Kotlin·Swift 모두 익숙 |
| snake_case | `first_name`, `created_at` | Python·Ruby 생태계, 일부 구식 API |
| PascalCase | `FirstName` | C# 생태계 일부 |
| kebab-case | `first-name` | JS 변수로 불가 → 헤더·URL에만 |

팀에서 **하나로 통일**. camelCase가 프론트·모바일과 자연스럽게 맞물려 가장 일반적.

## URI 컨벤션 (REST 기반)

```
/users                   ← 컬렉션, 복수형
/users/{id}              ← 개별, 경로 파라미터
/users/{id}/comments     ← 계층 최대 1단계
/users?role=admin        ← 필터는 쿼리스트링
/users?sort=-createdAt   ← 정렬 `-` 접두사로 내림차순
```

세부는 [[REST#URI 설계 규칙|REST URI 설계]] 참고.

## 에러 응답

### 표준 구조 (RFC 7807 Problem Details)
```
{
  "type": "https://api.example.com/errors/email-already-exists",
  "title": "Email already exists",
  "status": 409,
  "detail": "The email 'dc@example.com' is already registered.",
  "instance": "/users/signup"
}
```

### 실무 버전 (단순화)
```
{
  "code": "EMAIL_ALREADY_EXISTS",
  "message": "The email is already registered.",
  "details": {
    "field": "email",
    "value": "dc@example.com"
  }
}
```

- **애플리케이션 에러 코드**(`EMAIL_ALREADY_EXISTS`)를 HTTP 상태 코드와 별개로 제공 → 클라이언트가 i18n·분기 처리 쉬움
- `message`는 **개발자용**, 사용자 표시용은 클라이언트가 i18n
- HTTP 상태 코드 정책 — 200 OK + body에 `success: false` 같은 건 안티패턴 ([[REST#흔한 안티패턴]])

## 페이지네이션

### Offset-based
```
GET /posts?page=2&size=20

Response:
{
  "data": [...],
  "page": 2,
  "size": 20,
  "totalCount": 547,
  "totalPages": 28
}
```

- **장점**: 사용자가 특정 페이지로 점프 가능
- **단점**: 깊은 페이지에서 느려짐(DB offset 비용), **새 데이터 삽입 시 중복·누락**

### Cursor-based
```
GET /posts?cursor=eyJpZCI6MTAwfQ&size=20

Response:
{
  "data": [...],
  "nextCursor": "eyJpZCI6ODB9",
  "hasMore": true
}
```

- **장점**: **안정적**(삽입해도 중복 없음), **빠름** (last-seen id 기반 인덱스 활용)
- **단점**: 특정 페이지 점프 불가, cursor 디코딩 필요

**무한 스크롤 / 피드**: cursor-based.
**관리자 페이지 / 검색 결과**: offset-based.

## 필터링·정렬·검색

```
?role=admin                     ← 필터
?status=active,pending          ← 여러 값 (OR)
?sort=-createdAt,name           ← 여러 정렬
?q=keyword                      ← 자유 검색
?created_gte=2026-01-01         ← 범위 (접미사로 조건)
```

복잡해지면 **POST /search** 같은 별도 엔드포인트로 body에 조건 전달 — RESTful하진 않지만 실무 관용.

## 응답 구조 (Envelope)

### 감싸지 않기
```
[
  { "id": 1, "name": "..." },
  ...
]
```
- **장점**: 단순
- **단점**: 메타데이터(페이지·에러) 넣을 곳 없음

### Envelope (권장)
```
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1
  },
  "links": {
    "next": "..."
  }
}
```
- **장점**: 일관성, 페이지네이션·에러를 같은 구조에
- **단점**: 약간의 중첩 비용

대부분 실무는 envelope 채택.

## Versioning

세 전략:
1. **URL 경로**: `/v1/users` — **가장 흔함**, 명시적
2. **헤더**: `Accept: application/vnd.api.v1+json` — RESTful하지만 소비자 실수 빈발
3. **쿼리스트링**: `?version=1` — 비권장, 캐시·분석 어지럽힘

팀 컨벤션으로 **URL 경로 버저닝**이 무난. Breaking change 시 v2, non-breaking은 v1 유지.

## HTTP 메서드 의미 엄수

| 메서드 | 의미 | 멱등 | 바디 |
|---|---|---|---|
| GET | 조회 | ✅ | 없음 (쿼리스트링으로) |
| POST | 생성, 비멱등 작업 | ✗ | JSON |
| PUT | 전체 교체 | ✅ | JSON (전체 리소스) |
| PATCH | 부분 수정 | 상황에 따라 | JSON (부분 또는 JSON Patch) |
| DELETE | 삭제 | ✅ | 보통 없음 |

`POST /users/getList` 같은 안티패턴 금지. 자세히는 [[Idempotency]].

## 인증 헤더

```
Authorization: Bearer <token>
```

- **`Authorization` 헤더**가 표준 — 쿠키·body·쿼리 대신
- **Bearer 스키마** — JWT·Access Token 전송
- HTTPS 필수 (평문 노출 방지)

## 헬스 체크

```
GET /health             ← liveness (살아있나)
GET /health/ready       ← readiness (트래픽 받을 준비)
GET /health/detail      ← 의존성(DB·Redis) 상세
```

k8s·LB가 호출. `200 OK` + `{"status": "UP"}`가 관례.

## 흔한 실수

- **날짜를 숫자로** — 타임존·밀리초 애매
- **키 네이밍 혼재** — 어떤 필드는 snake, 어떤 건 camel → 프론트 지옥
- **에러를 200으로** — 모니터링·재시도 로직 혼란
- **페이지네이션 없이 전체 반환** — 데이터 증가 시 OOM
- **버저닝 없이 breaking change** — 클라이언트 전멸

## 면접 체크포인트

- UTC + ISO 8601을 저장·전송 표준으로 쓰는 이유
- camelCase가 JSON 키의 실질 표준인 이유
- Offset vs Cursor 페이지네이션 선택 기준
- Envelope 응답 구조의 장점
- URL 버저닝이 헤더 버저닝보다 실무에서 편한 이유
- Authorization 헤더가 쿠키·쿼리보다 나은 이유

## 출처
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 12-2. 어플리케이션 레벨 의사결정 2](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-12.-%EC%96%B4%ED%94%8C%EB%A6%AC%EC%BC%80%EC%9D%B4%EC%85%98-%EB%A0%88%EB%B2%A8-%EC%9D%98%EC%82%AC%EA%B2%B0%EC%A0%95-2)
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 4. API 설계 원칙](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-4.-API-%EC%84%A4%EA%B3%84-%EC%9B%90%EC%B9%99%EA%B3%BC-%EC%A7%81%EB%A0%AC%ED%99%94-%ED%8F%AC%EB%A7%B7-%EA%B2%B0%EC%A0%95)

## 관련 문서
- [[REST|REST · URI 설계]]
- [[API-Documentation|API 문서화]]
- [[Idempotency|HTTP 멱등성]]
- [[HTTP-Status-Code|HTTP Status Code]]
