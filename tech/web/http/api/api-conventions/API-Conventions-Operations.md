---
tags: [web, http, api, convention]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["API 버저닝과 인증 헤더", "API 운영 컨벤션"]
---

# API 컨벤션 — 버저닝, 메서드, 인증, 운영

## Versioning

세 전략:
1. **URL 경로**: `/v1/users` — **가장 흔함**, 명시적
2. **헤더**: `Accept: application/vnd.api.v1+json` — RESTful하지만 소비자 실수 빈발
3. **쿼리스트링**: `?version=1` — 비권장, 캐시, 분석 어지럽힘

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

- **`Authorization` 헤더**가 표준 — 쿠키, body, 쿼리 대신
- **Bearer 스키마** — JWT, Access Token 전송
- HTTPS 필수 (평문 노출 방지)

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
- camelCase가 JSON 키의 실질 표준인 이유
- Offset vs Cursor 페이지네이션 선택 기준
- Envelope 응답 구조의 장점
- URL 버저닝이 헤더 버저닝보다 실무에서 편한 이유
- Authorization 헤더가 쿠키, 쿼리보다 나은 이유
