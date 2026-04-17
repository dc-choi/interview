---
tags: [security, auth, selection]
status: done
category: "Security - 인증"
aliases: ["Auth Method Selection", "인증 방식 선택"]
---

# 인증 방식 선택

HTTP는 Stateless. **매 요청마다 자격증명을 함께 보내야** 서버가 신원을 확인. 무엇을·어디에 실어 보낼지 = 인증 방식 선택.

## 2차원 결정

1. **자격증명을 어디에 실을까** — Header·Body·Cookie·Query
2. **어떤 스키마로** — Basic·Bearer·API Key·OAuth2

## 자격증명 위치

| 위치 | 특징 |
|---|---|
| **Authorization 헤더** | **권장 기본값** — 메타데이터라는 의미 명확, 캐시에 영향 없음, 표준 스키마(Bearer·Basic) |
| **Cookie** | 브라우저가 자동 첨부 → CSRF 위험 (SameSite로 완화), 동일 도메인 제약 |
| **쿼리스트링** | **금지에 가까움** — URL이 로그·리퍼러·히스토리에 남음 |
| **Request Body** | POST만 가능, 일관성 없음, 비권장 |

**결론**: 기본은 `Authorization` 헤더. 브라우저 기반 웹앱이 쿠키 세션이 필요한 경우에만 쿠키.

## 스키마 비교

### HTTP Basic
```
Authorization: Basic base64(username:password)
```
- **가역 base64 인코딩** → 평문과 다름없음. HTTPS 필수, 그래도 비권장
- 매 요청마다 비밀번호 전송 → 로그·캐시 유출 위험
- **사용처**: 내부 관리 도구, 사내 사이트 정도

### Bearer Token (JWT·Opaque Token)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiI...
```
- 토큰 자체가 **자격증명** — 발급 시 1회 인증 후 유효기간 내 재사용
- **JWT**: self-contained, 서버 상태 불필요. 검증은 서명만으로
- **Opaque Token**: 랜덤 문자열, 서버에서 조회 필요 → 취소 가능
- **사용처**: 대부분의 모던 API

### API Key
```
Authorization: Bearer <api-key>
  또는
X-API-Key: <api-key>
```
- 서비스간·파트너 API에 주로 사용
- 사용자 단위보다 **클라이언트(앱·조직) 단위**
- **사용처**: 외부 파트너, B2B API, 레이트 리밋 키

### OAuth 2.0
- 실제 인증이 아니라 **인가(authorization)** 프레임워크
- **Authorization Code** 플로우: 서드파티 로그인(Google·Kakao·GitHub 로그인)
- **Client Credentials**: 서비스 간 인증
- JWT·Opaque Token을 발급하는 **상위 프로토콜** — Bearer와 함께 쓰는 게 일반적
- **사용처**: "Google로 로그인", 기업 통합 인증

### Session Cookie
```
Cookie: session=abc123
```
- 서버가 세션 ID를 쿠키로 발급, 세션 저장소(Redis·DB)에서 조회
- **서버가 세션 상태 유지** — 취소·만료 제어 쉬움
- **CSRF 방어 필요** (SameSite=Strict·Lax, CSRF 토큰)
- **사용처**: 전통 웹사이트, 관리자 페이지

## 선택 가이드

### 웹 브라우저 + 자체 백엔드
**세션 쿠키 + SameSite=Lax**가 가장 단순·안전.
- 토큰을 LocalStorage에 넣지 않음 → XSS에서 탈취 방지
- CSRF는 SameSite로 대부분 방어

### 모바일 앱 + 자체 백엔드
**JWT Bearer**. 모바일은 CSRF 무관, SecureStorage에 토큰 저장.

### SPA (React·Vue) + 자체 백엔드
두 선택:
- **HttpOnly 쿠키 + JWT** — JS가 토큰 접근 불가 (XSS 안전) + CSRF 방어 필요
- **JWT in Memory** — 페이지 리프레시마다 refresh token으로 재발급

### 서드파티 로그인 (Google·Kakao)
**OAuth 2.0 Authorization Code** 플로우. PKCE 확장으로 SPA에서도 안전.

### 서비스 간 통신 (MSA·서버→서버)
- 내부: **mTLS** 또는 **JWT (Client Credentials)**
- 외부 파트너: **API Key**

### 공개 API + 많은 클라이언트
**API Key** + per-key 레이트 리밋 + 사용량 추적.

## JWT의 함정

- **민감 정보 싣지 말 것** — JWT는 base64 인코딩이지 암호화 아님
- **서명 검증 잊지 말 것** — `alg: none` 공격·서명 검증 누락
- **만료 시간 짧게** — 15분~1시간, Refresh Token으로 갱신
- **취소 어려움** — self-contained라 서버에서 "이 JWT 취소"가 불가 → 블랙리스트·짧은 수명으로 완화
- **크기** — 쿠키 4KB 한계와 경쟁

자세히는 [[JWT]] 참고.

## Refresh Token Rotation

Access Token(짧은 수명) + Refresh Token(긴 수명) 조합. Refresh 시 **새 refresh token 발급 + 이전 것 즉시 무효**.

- 탈취된 refresh token 재사용 감지 가능
- "로그인 7일 유지" 같은 UX 지원하면서 탈취 리스크 완화

상세는 [[Refresh-Token-Rotation]].

## 비밀번호 저장

절대 평문 금지. 해시도 단순 SHA 금지.

**올바른 방식**: argon2 (권장), scrypt, bcrypt + **고유 Salt**.

상세는 [[Password-Hashing]].

## HTTPS 필수

어떤 방식이든 **HTTPS 아니면 무용**. 네트워크상에서 평문 헤더 노출 = 모든 인증 무력화. Let's Encrypt로 무료 인증서 발급 가능하므로 HTTPS 미도입은 변명 불가.

## 흔한 실수

- **비밀번호를 쿼리스트링에** → 로그·리퍼러 유출
- **JWT에 민감 정보 담기** → base64 디코딩으로 그대로 보임
- **알고리즘 검증 없이 JWT 수락** → `alg: none` 취약점
- **세션을 in-memory에만** → 서버 재시작 시 전원 로그아웃
- **HTTPS 미적용** → 나머지 모든 방어 무의미

## 면접 체크포인트

- Authorization 헤더가 쿠키·쿼리보다 기본값인 이유
- Basic vs Bearer 차이와 Basic이 비권장인 이유
- 세션 vs JWT 선택 기준 (쿠키·서버 상태·취소 가능성)
- OAuth 2.0이 "인증"이 아니라 "인가" 프레임워크인 이유
- JWT의 한계 4가지 (암호화 아님·취소 어려움·크기·서명 검증)

## 출처
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 5. 사용자 인증 방식 결정](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-5.-%EC%82%AC%EC%9A%A9%EC%9E%90-%EC%9D%B8%EC%A6%9D-%EB%B0%A9%EC%8B%9D-%EA%B2%B0%EC%A0%95)

## 관련 문서
- [[Session|Session]]
- [[JWT|JWT]]
- [[OAuth2|OAuth2]]
- [[Refresh-Token-Rotation|Refresh Token Rotation]]
- [[Password-Hashing|Password Hashing]]
