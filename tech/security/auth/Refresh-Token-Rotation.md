---
tags: [security, jwt, auth]
status: done
category: "보안(Security)"
aliases: ["Refresh Token Rotation", "RTR", "리프레시 토큰 로테이션"]
---

# Refresh Token Rotation (RTR)

Refresh Token을 사용할 때마다 새로운 토큰으로 교체하는 보안 패턴이다. 토큰 탈취 시 피해를 최소화한다.

## 왜 필요한가

일반적인 Refresh Token 방식의 문제:
- Refresh Token이 탈취되면 공격자가 무한히 Access Token을 발급받을 수 있음
- Refresh Token의 수명이 길어 (보통 14일) 탈취 시 피해 범위가 큼
- 토큰이 재사용되어도 서버가 감지할 수 없음

RTR은 **한 번 사용된 Refresh Token을 즉시 폐기**하여 이 문제를 해결한다.

## 동작 흐름

1. **로그인** — Access Token + Refresh Token 발급. RT는 해시하여 DB에 저장, familyId 부여
2. **토큰 갱신 요청** — 클라이언트가 RT를 쿠키로 전송
3. **검증** — RT를 해시하여 DB에서 조회
4. **회전** — 기존 RT 삭제 + 새 RT 생성 (같은 familyId 유지)
5. **응답** — 새 Access Token + 새 RT를 쿠키에 설정

## Family ID를 활용한 탈취 감지

**familyId**는 같은 세션에서 발급된 RT들을 묶는 식별자이다.

탈취 시나리오:
1. 공격자가 RT-1을 탈취
2. 정상 사용자가 RT-1로 갱신 → RT-2 발급 (RT-1 삭제)
3. 공격자가 RT-1로 갱신 시도 → DB에 없음 → **탈취 감지**
4. 해당 familyId의 모든 RT를 삭제하여 세션 무효화

## 구현 핵심

**토큰 생성:**
- `crypto.randomBytes(32).toString('hex')` — 256bit 랜덤 토큰
- `crypto.createHash('sha256')` — 해시하여 DB에 저장 (원문 저장 금지)
- `uuid.v4()` — familyId 생성

**쿠키 보안 설정:**
- `httpOnly: true` — JavaScript 접근 차단 (XSS 방어)
- `secure: true` — HTTPS에서만 전송
- `sameSite: 'lax'` — CSRF 방어
- `path: '/trpc'` — API 경로에서만 전송

**트랜잭션 처리:**
- RT 삭제와 새 RT 생성을 하나의 트랜잭션으로 묶어 원자성 보장
- 만료된 RT 정리도 같은 트랜잭션에서 처리

## 만료 관리

- RT 만료 기간은 환경변수로 설정 (기본 14일)
- `d/h/m/s` 단위 지원 (예: `14d`, `24h`)
- 갱신 시 해당 계정의 만료된 RT를 함께 정리

## Session vs RTR 비교

| 구분 | 서버 세션 | RTR |
|---|---|---|
| 상태 관리 | 서버 메모리/Redis | DB에 RT 해시만 저장 |
| 확장성 | 세션 공유 필요 | Stateless (JWT) + 최소 DB 조회 |
| 탈취 감지 | 동시 세션 제한 | familyId 기반 감지 |
| 강제 로그아웃 | 세션 삭제 | familyId 전체 삭제 |

## 면접 포인트

Q. Refresh Token은 어떻게 관리하는가?
- RTR 패턴으로 사용할 때마다 회전, familyId로 탈취 감지
- RT는 해시하여 DB 저장, httpOnly 쿠키로 전달
- 트랜잭션으로 삭제/생성 원자성 보장

Q. Access Token이 탈취되면?
- 짧은 만료 시간(15분 등)으로 피해 범위 제한
- Refresh Token과 달리 서버에서 즉시 무효화하기 어려우므로 만료 시간이 핵심 방어선

## 관련 문서
- [[JWT]]
- [[Session]]
- [[CSRF|CSRF Protection]]
