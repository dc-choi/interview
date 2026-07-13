---
tags: [web, http, api, convention]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["API 에러 응답과 페이지네이션", "Envelope 응답 구조"]
---

# API 컨벤션 — 에러 응답, 페이지네이션, Envelope

## 에러 응답

### 표준 구조 (RFC 9457 Problem Details)

> RFC 9457이 기존 RFC 7807을 대체(obsolete)한 최신 표준이다. 필드 구조는 동일하고, 9457은 여러 문제를 한 응답에 담는 확장 등을 명확히 했다. 문서나 라이브러리가 7807을 참조하면 9457로 읽으면 된다.

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

### 사용자 노출 에러 메시지 원칙

에러 메시지의 목표는 세 가지 — 문제를 명확하고 간단하게 설명, 프로세스를 완료할 해결책 제시, 부정적 경험의 긍정 전환. 최고의 에러 메시지는 보이지 않는 것(에러 예방 설계)이지만, 보여야 한다면:

| 원칙 | 반례 |
|---|---|
| 원인을 명시한다 | 알 수 없는 오류가 발생했습니다 |
| 해결책(다음 행동)을 제시한다 | 불가능합니다로 끝 — 어디에 문의하라는 건지 없음 |
| 1~2문장으로 간결하게 | 장문의 설명 |
| 전문 용어, 코드 노출 금지 | 서버 에러 코드, 쿼리 문자열 노출 |
| 사용자를 탓하지 않는다 | 잘못 입력했습니다 (객관적 정책 설명으로 대체) |
| 부정 단어 최소화 | 불가능, 안 됩니다 대신 조건 제시 (구매 후 작성 가능) |
| 유머는 서비스 톤과 맞을 때만 | 금융 서비스의 농담 |
| 사과는 진짜 장애에만 | 모든 검증 실패에 죄송합니다 |
| 서비스 톤 유지 | 금융앱의 과한 친근감 |

백엔드 관점 두 가지:

- 사용자 문구는 클라이언트 i18n 카탈로그가 담당하지만, **그 카탈로그의 분기 키가 애플리케이션 에러 코드다** — 코드 설계의 해상도가 사용자 메시지의 해상도를 결정한다. `UNKNOWN_ERROR` 하나로 뭉개면 클라이언트도 알 수 없는 오류밖에 쓸 수 없다.
- 스택 트레이스, 쿼리, 내부 코드의 사용자 노출은 UX 문제이자 **보안 문제(정보 노출)** 다 — 프로덕션 에러 응답은 항상 정제 레이어를 거친다.

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

## 출처
- [알잘딱깔센 에러 메시지 쓰는 방법 — 쪼렙 서비스기획자 (Brunch)](https://brunch.co.kr/@b30afb04c9f54dc/27)
