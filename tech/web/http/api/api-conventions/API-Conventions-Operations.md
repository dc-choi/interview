---
tags: [web, http, api, convention]
status: done
verified_at: 2026-08-04
category: "웹&네트워크(Web&Network)"
aliases: ["API 버저닝과 인증 헤더", "API 운영 컨벤션"]
---

# API 컨벤션 — 버저닝, 메서드, 인증, 운영

## Versioning

세 전략:
1. **URL 경로**: `/v1/users` — 눈에 잘 보이고 Routing과 운영이 단순함
2. **Media Type**: `Accept: application/vnd.example.v1+json` — Representation 협상에 포함되지만 관측과 Client 설정이 복잡함
3. **Query**: `?version=1` — Target URI에 드러나지만 다른 조회 조건과 섞이고 운영 규칙이 복잡해질 수 있음

어느 방식도 HTTP나 REST의 유일한 정답은 아니다. 팀이 Cache key, Routing, 문서화와 폐기 정책을 함께 정한다. Breaking change는 호환 Version으로 분리하고 non-breaking change는 기존 계약 안에서 진화시킨다.

## HTTP 메서드 의미 엄수

| 메서드 | 의미 | 멱등 | 바디 |
|---|---|---|---|
| GET | 선택된 표현 조회 | ✅ | 일반 의미가 없어 명시적 지원 없이는 보내지 않음 |
| POST | 대상 Resource에 content 처리 요청 | ✗ | 계약에 따른 content |
| PUT | 대상 Resource의 상태 생성 또는 전체 교체 | ✅ | 원하는 전체 표현 |
| PATCH | 부분 수정 | 상황에 따라 | 계약한 patch media type |
| DELETE | 삭제 | ✅ | 보통 없음 |

`POST /users/getList` 같은 안티패턴 금지. 자세히는 [[Idempotency]].

POST가 항상 생성인 것은 아니다. 결제 실행, 이벤트 제출과 Batch 처리처럼 대상 Resource가 요청 content를 자체 의미에 따라 처리할 때도 사용한다. PATCH는 media type에 정의된 변경 연산에 따라 멱등 여부가 달라질 수 있다.

## 인증 전달 방식

```
Authorization: Bearer <token>
```

- API Client가 자격증명을 명시적으로 보낼 때는 `Authorization`을 사용한다.
- Bearer는 JWT 형식만을 뜻하지 않으며 opaque Access Token도 전달할 수 있다.
- Browser의 Server Session은 `HttpOnly`, `Secure`, `SameSite` Cookie가 자연스러운 선택일 수 있다. Cookie 인증은 CSRF 방어를 함께 설계한다.
- URL Query에는 로그, 기록과 `Referer` 노출 때문에 자격증명을 넣지 않는다. Request body에 임의 인증 체계를 만들지 않는다.
- 모든 자격증명 전송 구간에 HTTPS를 적용한다.

## 헬스 체크

```
GET /health             ← liveness (살아있나)
GET /health/ready       ← readiness (트래픽 받을 준비)
GET /health/detail      ← 의존성(DB, Redis) 상세
```

k8s, LB가 호출. `200 OK` + `{"status": "UP"}`가 관례.

## 흔한 실수

- **날짜를 숫자로** — 타임존, 밀리초 애매
- **키 네이밍 혼재** — 어떤 필드는 snake, 어떤 건 camel → 프론트 지옥
- **에러를 200으로** — 모니터링, 재시도 로직 혼란
- **페이지네이션 없이 전체 반환** — 데이터 증가 시 OOM
- **버저닝 없이 breaking change** — 클라이언트 전멸

## 면접 체크포인트

- UTC + ISO 8601을 저장, 전송 표준으로 쓰는 이유
- JSON key naming을 한 계약 안에서 일관되게 유지해야 하는 이유
- Offset vs Cursor 페이지네이션 선택 기준
- Envelope 응답 구조의 장점
- URL 버저닝이 헤더 버저닝보다 실무에서 편한 이유
- Authorization 기반 API 인증과 Cookie 기반 Browser Session의 선택 기준

## 출처

- 김영한 강사, [HTTP 메서드, GET과 POST](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61365)
- 김영한 강사, [HTTP 메서드, PUT과 PATCH와 DELETE](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61366)
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 5789, PATCH Method for HTTP](https://www.rfc-editor.org/rfc/rfc5789.html)
- [RFC 6265, HTTP State Management Mechanism](https://www.rfc-editor.org/rfc/rfc6265.html)
