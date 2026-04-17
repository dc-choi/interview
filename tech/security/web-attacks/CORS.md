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
- 악성 사이트가 내 세션 쿠키를 이용해 은행 API 호출 → 잔액·이체 정보 탈취 (CSRF와 유사 공격)
- 다른 도메인의 민감 페이지를 iframe으로 로드해 내용 읽기

**요청 전송 자체는 막지 못함**. 응답을 JavaScript에서 못 읽게 할 뿐. 이 차이가 CSRF 공격이 여전히 가능한 이유.

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
Simple 조건 벗어나면 (PUT·DELETE·커스텀 헤더·JSON Content-Type 등) 브라우저가 **본 요청 전에 OPTIONS 요청** 먼저 전송해 확인.

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
쿠키·Authorization 헤더 같은 **인증 정보 포함** 요청.

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
| `Access-Control-Allow-Credentials` | 쿠키·인증 정보 포함 허용 여부 |
| `Access-Control-Max-Age` | Preflight 결과 캐시 시간 |
| `Access-Control-Expose-Headers` | JS에서 접근 가능한 응답 헤더 (기본은 제한적) |

## 흔한 함정

### 서버 쪽 설정
- `Access-Control-Allow-Origin: *`만 보내고 쿠키를 기대 → 크레덴셜 요청 실패
- OPTIONS 메서드를 404로 처리 → 모든 preflight 실패 → 본 요청도 실패
- 특정 Origin 화이트리스트 — 정규표현식·동적 매칭 시 **버그로 `null`·`*` 반환하면 대형 사고**

### 클라이언트 쪽
- `credentials: 'omit'`(기본값)으로 쿠키 안 보내고 "로그인 안 됨" 디버깅 시간 낭비
- 커스텀 헤더 추가했는데 preflight 허용 헤더에 없어서 실패

### Reverse Proxy 상황
- Nginx·Spring Filter에서 CORS 헤더 **이중 설정** → 응답 헤더 중복 → 브라우저 거부
- 애플리케이션에서만 처리하거나 프록시에서만 처리하거나 — 한 군데로 통일

## CORS와 CSRF의 관계

- **CORS는 CSRF를 막지 못함** — CSRF는 브라우저가 자동으로 쿠키 첨부해 요청을 보내는 걸 이용. 응답을 읽을 필요 없음
- CSRF 방어는 **CSRF 토큰**이나 **SameSite 쿠키**가 맡음 ([[CSRF]] 참고)
- CORS는 **"응답 읽기 허용 여부"** 만 제어

## 면접 체크포인트

- Same-Origin을 구성하는 3요소
- SOP가 요청을 막는가 응답을 막는가
- Simple vs Preflight 구분 조건
- `Access-Control-Allow-Origin: *`이 인증 요청에서 안 되는 이유
- Preflight 성능 비용과 Max-Age로 줄이는 방법
- CORS가 CSRF를 막지 못하는 이유

## 출처
- [매일메일 — CORS 질문 78](https://www.maeil-mail.kr/question/78)
- [매일메일 — CORS 심화 질문 96](https://www.maeil-mail.kr/question/96)

## 관련 문서
- [[CSRF|CSRF]]
- [[XSS|XSS]]
- [[Session|Session]]
- [[REST|REST API]]
