---
tags: [web, http, api, convention]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["API 에러 응답과 페이지네이션", "Envelope 응답 구조"]
---

# API 컨벤션 — 에러 응답, 페이지네이션, Envelope

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

- **애플리케이션 에러 코드**(`EMAIL_ALREADY_EXISTS`)를 HTTP 상태 코드와 별개로 제공 → 클라이언트가 i18n, 분기 처리 쉬움
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
- **단점**: 깊은 페이지에서 느려짐(DB offset 비용), **새 데이터 삽입 시 중복, 누락**

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

## 필터링, 정렬, 검색

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
- **단점**: 메타데이터(페이지, 에러) 넣을 곳 없음

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
- **장점**: 일관성, 페이지네이션, 에러를 같은 구조에
- **단점**: 약간의 중첩 비용

대부분 실무는 envelope 채택.
