---
tags: [security, cors, browser, web]
status: done
category: "Security"
aliases: ["CORS", "Cross-Origin Resource Sharing"]
---

# CORS (Cross-Origin Resource Sharing)

브라우저의 **Same-Origin Policy(SOP)** 가 기본으로 차단하는 교차 출처 요청을 **서버가 명시적으로 허용**하도록 확장한 메커니즘. "보안을 풀어주는 것"이 아니라 **"어느 출처에 한해 SOP를 완화할지 서버가 선언**"하는 것.

## Origin 정의

`scheme + host + port` 세 가지가 모두 같아야 Same-Origin.

```
https://a.com         ≠  http://a.com       (scheme 다름)
https://a.com         ≠  https://b.com      (host 다름)
https://a.com:443     ≠  https://a.com:8443 (port 다름)
https://a.com/page1   =  https://a.com/page2 (path는 상관없음)
```

## SOP가 막는 것

브라우저 발단의 JavaScript에서 **다른 출처의 응답을 읽는 것**. SOP 없으면:
- 악성 사이트가 내 세션 쿠키를 이용해 은행 API 호출 → 잔액, 이체 정보 탈취 (CSRF와 유사 공격)
- 다른 도메인의 민감 페이지를 iframe으로 로드해 내용 읽기

**요청 전송 자체는 막지 못함**. 응답을 JavaScript에서 못 읽게 할 뿐. 이 차이가 CSRF 공격이 여전히 가능한 이유.

## CORS는 브라우저가 강제하는 정책

출처 비교와 응답 차단 로직은 **서버가 아니라 브라우저에 구현**되어 있다. 그래서:

- 서버는 CORS 위반 요청에도 **정상적으로 응답**을 내려준다. 그 응답을 분석해 위반이라 판단하고 **버리는 주체는 브라우저**다. 콘솔엔 빨간 에러가 떠도 **서버 로그엔 정상 응답으로 남아** 에러 트레이싱이 헷갈릴 수 있다.
- 브라우저를 거치지 않는 **서버 간 통신(server-to-server)에는 CORS가 적용되지 않는다**. 백엔드가 다른 API를 호출할 땐 출처 제약이 없다.
- preflight 응답 상태 코드가 200이 아니어도, 핵심은 상태 코드가 아니라 **응답 헤더에 유효한 `Access-Control-Allow-Origin`이 있는가**이다.

## 3가지 요청 타입

### 1. Simple Request
브라우저가 **Preflight 없이** 바로 요청 보냄. 조건:
- 메서드: `GET`, `HEAD`, `POST`
- 헤더: `Accept`, `Content-Type`, `Content-Language`만 (사용자 정의 헤더 없음)
- Content-Type이 `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`만

이 조건 만족하면:
```
요청:
  Origin: https://app.com

응답:
  Access-Control-Allow-Origin: https://app.com
```

서버가 `Access-Control-Allow-Origin`에 요청 Origin을 반환하거나 `*`을 반환해야 통과.

### 2. Preflight Request
Simple 조건 벗어나면 (PUT, DELETE, 커스텀 헤더, JSON Content-Type 등) 브라우저가 **본 요청 전에 OPTIONS 요청** 먼저 전송해 확인.

```
Preflight 요청 (OPTIONS):
  Access-Control-Request-Method: PUT
  Access-Control-Request-Headers: Content-Type, Authorization

Preflight 응답:
  Access-Control-Allow-Origin: https://app.com
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE
  Access-Control-Allow-Headers: Content-Type, Authorization
  Access-Control-Max-Age: 600   ← 이 시간 동안 preflight 재요청 안 함
```

그 다음에 본 요청이 나감. **왕복 2번** 발생 → 성능 비용.

완화: `Access-Control-Max-Age`로 preflight 결과 캐시 (보통 600초~1시간).

### 3. Credential Request
쿠키, Authorization 헤더 같은 **인증 정보 포함** 요청. `fetch`, `XMLHttpRequest`는 기본적으로 인증 정보를 싣지 않으며 `credentials` 옵션으로 제어한다.

| 값 | 동작 |
|---|---|
| `same-origin` (기본값) | 같은 출처 요청에만 인증 정보 첨부 |
| `include` | 모든 교차 출처 요청에도 인증 정보 첨부 |
| `omit` | 어떤 요청에도 인증 정보 미첨부 |

```
요청 (JS):
  fetch(url, { credentials: 'include' })
  → Cookie: session=xxx

응답:
  Access-Control-Allow-Origin: https://app.com   ← 반드시 구체 Origin
  Access-Control-Allow-Credentials: true
```

**보안상 `Access-Control-Allow-Origin: *` + Credentials는 금지**. 와일드카드는 인증 있는 요청에서 막힘. 구체 Origin 명시 필수.

## 응답 헤더 정리

| 헤더 | 역할 |
|---|---|
| `Access-Control-Allow-Origin` | 허용할 Origin (`*` 또는 구체 Origin) |
| `Access-Control-Allow-Methods` | 허용 메서드 (preflight 응답) |
| `Access-Control-Allow-Headers` | 허용 요청 헤더 (preflight 응답) |
| `Access-Control-Allow-Credentials` | 쿠키, 인증 정보 포함 허용 여부 |
| `Access-Control-Max-Age` | Preflight 결과 캐시 시간 |
| `Access-Control-Expose-Headers` | JS에서 접근 가능한 응답 헤더 (기본은 제한적) |

## 흔한 함정

### 서버 쪽 설정
- `Access-Control-Allow-Origin: *`만 보내고 쿠키를 기대 → 크레덴셜 요청 실패
- OPTIONS 메서드를 404로 처리 → 모든 preflight 실패 → 본 요청도 실패
- 특정 Origin 화이트리스트 — 정규표현식, 동적 매칭 시 **버그로 `null`, `*` 반환하면 대형 사고**

### 클라이언트 쪽
- `credentials` 기본값(`same-origin`)은 교차 출처에 쿠키를 안 보내는데, 이를 모르고 "로그인 안 됨" 디버깅에 시간 낭비
- 커스텀 헤더 추가했는데 preflight 허용 헤더에 없어서 실패

### Reverse Proxy 상황
- Nginx, Spring Filter에서 CORS 헤더 **이중 설정** → 응답 헤더 중복 → 브라우저 거부
- 애플리케이션에서만 처리하거나 프록시에서만 처리하거나 — 한 군데로 통일

## CORS와 CSRF의 관계

- **CORS는 CSRF를 막지 못함** — CSRF는 브라우저가 자동으로 쿠키 첨부해 요청을 보내는 걸 이용. 응답을 읽을 필요 없음
- CSRF 방어는 **CSRF 토큰**이나 **SameSite 쿠키**가 맡음 ([[CSRF]] 참고)
- CORS는 **"응답 읽기 허용 여부"** 만 제어

## 해결, 우회 방법

- **서버에서 `Access-Control-Allow-Origin` 명시** — 정석. 와일드카드 `*`는 정체 모를 출처까지 허용하므로 구체 Origin을 박는다. Nginx, Apache 설정보다 Spring, Express, Django 등의 **CORS 미들웨어**로 처리하는 편이 관리가 쉽다(이중 설정 주의는 위 함정 참고).
- **로컬 개발 서버 리버스 프록싱** — 프론트 dev-server(webpack-dev-server, Vite 등)의 proxy 기능으로 `/api`를 실제 API 서버로 프록시하면 브라우저는 같은 출처 요청으로 인식해 CORS를 우회한다. 단 dev-server가 떠 있는 **로컬에서만** 통하고, 프로덕션에서 정적 자원 출처와 API 출처가 다르면 프록시가 없어 깨진다 — 정적 자원과 API를 같은 출처로 서빙할 때만 안전 ([[Reverse-Proxy|리버스 프록시]]).
- **img/script 태그(no-cors)는 우회가 아니다** — SOP 예외(스크립트, 이미지, 스타일시트)라 요청 자체는 나가지만(`Sec-Fetch-Mode: no-cors`), 브라우저가 그 응답을 JS에 넘기지 않아 **코드 레벨에서 내용을 읽을 수 없다**. 데이터를 받아 쓰는 용도로는 못 쓴다.

## 면접 체크포인트

- Same-Origin을 구성하는 3요소
- SOP가 요청을 막는가 응답을 막는가
- CORS가 브라우저 구현 스펙이라 서버 로그엔 정상 응답으로 남는 점(디버깅 함정), 서버 간 통신엔 미적용
- Simple vs Preflight 구분 조건
- `Access-Control-Allow-Origin: *`이 인증 요청에서 안 되는 이유, `credentials` 기본값
- Preflight 성능 비용과 Max-Age로 줄이는 방법
- 로컬 dev-server 프록시 우회가 프로덕션에서 깨지는 이유
- CORS가 CSRF를 막지 못하는 이유

## 출처
- [매일메일 — CORS 질문 78](https://www.maeil-mail.kr/question/78)
- [매일메일 — CORS 심화 질문 96](https://www.maeil-mail.kr/question/96)

## 관련 문서
- [[CSRF|CSRF]]
- [[XSS|XSS]]
- [[Security-Headers|보안 헤더]]
- [[Session|Session]]
- [[REST|REST API]]
- [[Reverse-Proxy|리버스 프록시]] — dev-server 프록시 우회
