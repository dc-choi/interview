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

## 프론트엔드 중복 재발급 요청 처리

서버 측 RTR 설계 외에, **클라이언트 측 동시 401 처리**도 중요. 한 페이지가 여러 API를 병렬 호출했는데 전부 401이 떨어지면 **같은 Refresh Token으로 동시 재발급 요청 N개** 발생.

### 문제
```
API A → 401 → refresh 요청 (1)
API B → 401 → refresh 요청 (2)   ← 중복
API C → 401 → refresh 요청 (3)   ← 중복
```

RTR이면 요청 (1)이 성공하는 순간 원래 RT 무효 → (2)·(3) 실패 → 가족 감지 로직이 오인해 **가족 전체 강제 로그아웃** 트리거.

### 해결: 큐·Mutex 패턴

첫 401이 refresh 시작하면 나머지는 **대기열**에 추가. refresh 완료 후 큐의 모든 요청을 새 토큰으로 재시도.

```
class TokenRefreshQueue {
  private isRefreshing = false;
  private queue: Array<(token: string) => void> = [];

  async getToken(): Promise<string> {
    if (this.isRefreshing) {
      // 대기열에 추가
      return new Promise(resolve => this.queue.push(resolve));
    }

    this.isRefreshing = true;
    try {
      const newToken = await fetchRefresh();
      this.queue.forEach(fn => fn(newToken));
      this.queue = [];
      return newToken;
    } finally {
      this.isRefreshing = false;
    }
  }
}
```

### 대안: 검증된 라이브러리
- **`axios-auth-refresh`**: Axios 인터셉터 형태. 대기열·재시도 내장
- Apollo Client `errorLink`·**`@tanstack/query`** 커스텀 retry

자체 구현은 학습용엔 좋지만 **실전은 검증된 라이브러리** 권장. 엣지 케이스(refresh 자체 실패·네트워크 오류·동시 로그아웃) 모두 처리.

### 백엔드·프론트 협업
- 백엔드: RTR로 탈취 감지
- 프론트: 큐 패턴으로 중복 요청 제거
- 둘 중 하나만 있으면 **"정상 사용자인데 강제 로그아웃"** 오탐 발생

## 출처
- [velog @miinhho — 중복 토큰 재발급 요청으로 백엔드에 부담을 줘볼까요](https://velog.io/@miinhho/%EC%A4%91%EB%B3%B5-%ED%86%A0%ED%81%B0-%EC%9E%AC%EB%B0%9C%EA%B8%89-%EC%9A%94%EC%B2%AD%EC%9C%BC%EB%A1%9C-%EB%B0%B1%EC%97%94%EB%93%9C%EC%97%90-%EB%B6%80%EB%8B%B4%EC%9D%84-%EC%A4%98%EB%B3%BC%EA%B9%8C%EC%9A%94)

## 관련 문서
- [[JWT]]
- [[Session]]
- [[CSRF|CSRF Protection]]
- [[Race-Condition-Patterns|Race Condition 패턴 (async-mutex)]]
