---
tags: [security, jwt, auth]
status: done
verified_at: 2026-07-21
category: "보안(Security)"
aliases: ["Refresh Token Rotation", "RTR", "리프레시 토큰 로테이션"]
---

# Refresh Token Rotation (RTR)

Refresh Token을 사용할 때마다 새로운 토큰으로 교체하는 보안 패턴이다. 토큰 탈취 시 피해를 최소화한다.

## 왜 필요한가

일반적인 Refresh Token 방식의 문제:
- 정적 Refresh Token이 탈취되면 만료되거나 서버에서 폐기할 때까지 공격자가 Access Token 발급을 반복할 수 있음
- Refresh Token은 Access Token보다 길게 설정하는 경우가 많아 탈취 시 피해 기간이 커질 수 있음
- 토큰이 재사용되어도 서버가 감지할 수 없음

RTR은 **한 번 사용된 Refresh Token을 즉시 폐기**하여 이 문제를 해결한다.

## 동작 흐름

1. **로그인** — Access Token + Refresh Token 발급. RT는 해시하여 DB에 저장, familyId 부여
2. **토큰 갱신 요청** — 클라이언트가 RT를 쿠키로 전송
3. **검증** — RT를 해시하여 DB에서 조회
4. **회전** — 기존 RT를 `used` 상태로 전이하고 새 RT 생성 (같은 familyId 유지)
5. **응답** — 새 Access Token + 새 RT를 쿠키에 설정

## Family ID를 활용한 탈취 감지

**familyId**는 같은 세션에서 발급된 RT들을 묶는 식별자이다.

탈취 시나리오:
1. 공격자가 RT-1을 탈취
2. 정상 사용자가 RT-1로 갱신 → RT-1은 사용 완료 tombstone으로 보존하고 RT-2 발급
3. 공격자가 RT-1로 갱신 시도 → RT-1의 해시와 familyId는 남아 있고 상태가 `used`이므로 **재사용 감지**
4. 해당 family의 활성 RT를 폐기하고 재인증 요구

사용된 토큰 행을 즉시 삭제하면 나중에 제시된 RT-1을 단순한 알 수 없는 토큰과 구별할 수 없어 familyId를 찾을 수 없다. 따라서 최소한 family 만료 시점까지 `tokenHash`, `familyId`, `status`, `usedAt` 또는 `revokedAt`, `replacedBy`를 tombstone으로 보존한다. 로그에는 원문 토큰을 남기지 않는다.

## 구현 핵심

**토큰 생성:**
- `crypto.randomBytes(32).toString('hex')` — 256bit 랜덤 토큰
- `crypto.createHash('sha256')` — 해시하여 DB에 저장 (원문 저장 금지)
- `uuid.v4()` — familyId 생성

**쿠키 보안 설정:**
- `httpOnly: true` — JavaScript 접근 차단 (XSS 방어)
- `secure: true` — HTTPS에서만 전송
- `sameSite: 'lax'` 또는 요구에 맞는 더 엄격한 값 — 교차 사이트 전송을 줄이지만 모든 CSRF를 단독 차단하지는 않으므로 Origin 검증이나 CSRF token도 위협 모델에 따라 적용
- `path`는 실제 refresh 엔드포인트가 포함되는 최소 범위로 제한

**트랜잭션 처리:**
- 제출된 RT 행을 잠그고 `active`인지 확인한다.
- `active → used` 상태 전이와 새 RT 생성을 하나의 트랜잭션으로 묶는다. 조건부 UPDATE의 영향 행 수가 0이면 동시 회전 또는 재사용으로 처리한다.
- 이미 `used` 또는 `revoked`인 토큰이면 같은 트랜잭션에서 family의 활성 토큰을 폐기한다.
- 만료 tombstone은 family의 최대 수명과 재사용 탐지 보존 기간이 지난 뒤 별도 작업으로 정리한다.

## 만료 관리

- RT 만료 기간은 환경변수나 중앙 설정으로 관리한다. 14일 같은 값은 예시일 뿐 서비스의 보안, 재인증 UX와 family 절대 만료 정책에 맞춰 정한다.
- `d/h/m/s` 단위 지원 (예: `14d`, `24h`)
- 개별 RT뿐 아니라 family의 절대 만료 시점을 둔다. 사용 완료 tombstone은 탐지 기간이 끝나기 전에 삭제하지 않는다.

## Session vs RTR 비교

| 구분 | 서버 세션 | RTR |
|---|---|---|
| 상태 관리 | 서버 메모리/Redis | DB에 RT 해시와 family 상태 저장 |
| 확장성 | 세션 저장소 공유 필요 | Access Token은 자체 검증 가능, 회전에는 공유 DB 조회 필요 |
| 탈취 감지 | 동시 세션 제한 | familyId 기반 감지 |
| 강제 로그아웃 | 세션 삭제 | family의 활성 토큰을 `revoked`로 전이하고 tombstone 보존 |

## 면접 포인트

Q. Refresh Token은 어떻게 관리하는가?
- RTR 패턴으로 사용할 때마다 회전, familyId로 탈취 감지
- RT는 해시하여 DB 저장, httpOnly 쿠키로 전달
- 트랜잭션으로 기존 토큰의 `used` 전이와 새 토큰 생성을 원자적으로 처리

Q. Access Token이 탈취되면?
- 짧은 만료 시간(15분 등)으로 피해 범위 제한
- 자체 검증 Access Token은 중앙 조회 없이 즉시 무효화하기 어렵다. 짧은 만료를 기본 방어선으로 두고 고위험 서비스는 denylist, token version, introspection 같은 서버 상태 기반 폐기도 검토한다.

## 프론트엔드 중복 재발급 요청 처리

서버 측 RTR 설계 외에, **클라이언트 측 동시 401 처리**도 중요. 한 페이지가 여러 API를 병렬 호출했는데 전부 401이 떨어지면 **같은 Refresh Token으로 동시 재발급 요청 N개** 발생.

### 문제
```
API A → 401 → refresh 요청 (1)
API B → 401 → refresh 요청 (2)   ← 중복
API C → 401 → refresh 요청 (3)   ← 중복
```

RTR이면 요청 (1)이 성공하는 순간 원래 RT 무효 → (2), (3) 실패 → 가족 감지 로직이 오인해 **가족 전체 강제 로그아웃** 트리거.

### 해결: Single-flight 패턴

첫 401이 refresh를 시작하면 나머지는 같은 Promise를 공유한다. 성공하면 모든 대기 요청이 새 토큰을 받고, 실패하면 모두 같은 오류로 reject되어 로그인 화면 전환 같은 공통 실패 처리를 할 수 있어야 한다.

```
class TokenRefreshSingleFlight {
  private inFlight: Promise<string> | null = null;

  getToken(): Promise<string> {
    if (!this.inFlight) {
      this.inFlight = Promise.resolve()
        .then(() => fetchRefresh())
        .finally(() => {
          this.inFlight = null;
        });
    }

    return this.inFlight;
  }
}
```

직접 resolver 큐를 구현한다면 `{ resolve, reject }`를 함께 저장하고 refresh 성공과 실패 양쪽에서 전체 대기자를 settle한 뒤 큐를 비워야 한다. 그렇지 않으면 실패 시 일부 요청이 영원히 pending 상태로 남는다.

### 대안: 검증된 라이브러리
- **`axios-auth-refresh`**: Axios 인터셉터 형태. 대기열, 재시도 내장
- Apollo Client `errorLink`, **`@tanstack/query`** 커스텀 retry

자체 구현은 학습용엔 좋지만 **실전은 검증된 라이브러리** 권장. 엣지 케이스(refresh 자체 실패, 네트워크 오류, 동시 로그아웃) 모두 처리.

### 백엔드, 프론트 협업
- 백엔드: RTR로 탈취 감지
- 프론트: 큐 패턴으로 중복 요청 제거
- 둘 중 하나만 있으면 **"정상 사용자인데 강제 로그아웃"** 오탐 발생

## 출처
- [RFC 9700, OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700.html)
- [velog @miinhho — 중복 토큰 재발급 요청으로 백엔드에 부담을 줘볼까요](https://velog.io/@miinhho/%EC%A4%91%EB%B3%B5-%ED%86%A0%ED%81%B0-%EC%9E%AC%EB%B0%9C%EA%B8%89-%EC%9A%94%EC%B2%AD%EC%9C%BC%EB%A1%9C-%EB%B0%B1%EC%97%94%EB%93%9C%EC%97%90-%EB%B6%80%EB%8B%B4%EC%9D%84-%EC%A4%98%EB%B3%BC%EA%B9%8C%EC%9A%94)

## 관련 문서
- [[JWT]]
- [[Session]]
- [[CSRF|CSRF Protection]]
- [[Race-Condition-Patterns|Race Condition 패턴 (async-mutex)]]
