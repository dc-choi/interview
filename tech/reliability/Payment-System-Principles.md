---
tags: [reliability, payment, security, domain]
status: done
category: "Reliability"
aliases: ["Payment System Principles", "결제 시스템 원칙"]
---

# 결제 시스템 5원칙

결제는 **돈·신뢰·법적 책임**이 얽혀 있어 일반 API와 다른 기준이 적용된다. 한 번의 버그가 서비스 생명을 끊을 수 있다는 도메인 특성상, 속도·편의보다 **정확성·보안·추적성**이 우선. 5가지 불변 원칙.

## 원칙 1: PG사 스펙을 한 글자도 틀리지 말 것

결제 제공자(Toss Payments·KakaoPay·PortOne·Stripe)의 스펙 문서는 **수많은 엣지 케이스가 녹아 있는 경험의 결정체**.

- 필드 이름·순서·자료형 그대로
- 서명 검증 알고리즘·인코딩·타임존까지 명시대로
- "이 정도는 유연하게 되겠지" 생각 금지 — PG사가 엄격하게 검증
- 샘플 코드·SDK가 있으면 **그대로 사용**, 임의 변형 금지

이 원칙을 깨면:
- 일부 케이스에서만 실패 → 재현 어려운 버그
- PG사 지원을 받지 못함 ("스펙대로 하셨나요?")
- 보안 검증 우회 → 공격 벡터

## 원칙 2: 숙련 개발자가 설계·구현·리뷰

결제 모듈은 **회사에서 가장 많은 테스트·시간·검토**를 쏟아야 하는 영역. 신입·주니어 단독 설계 금지.

- 설계: 시니어가 주도
- 구현: 중·시니어가 직접 작성
- 리뷰: 최소 2인 이상, PG 경험자 포함
- QA: 전용 테스트 환경 + 샌드박스 + 프로덕션 소액 테스트

**경험 없는 팀이 결제를 독자 구현하지 말 것** — PortOne·Toss Payments 같은 통합 API나 Stripe 같은 글로벌 결제 SDK로 시작.

## 원칙 3: DB의 unique 제약·트랜잭션을 적극 활용

코드 로직만으로 정합성을 지키려 하지 말고 **DB의 원자성 보장 기능**을 최대한 활용.

### Unique Index로 중복 결제 방지
```
CREATE UNIQUE INDEX idx_payments_idempotency ON payments(idempotency_key);
```
같은 idempotency key로 두 번 INSERT 시도 → DB가 거부 → 앱이 예외로 받아 "이미 처리됨" 응답.

### 트랜잭션으로 원자성
```
BEGIN;
INSERT INTO payments (...) VALUES (...);
UPDATE accounts SET balance = balance - ? WHERE user_id = ? AND balance >= ?;
COMMIT;
```
- 잔액 차감과 결제 기록이 **한 덩어리**
- 중간 실패 → 롤백 → 잔액·결제 둘 다 안 변경

### 상태 머신 + FOR UPDATE
```
BEGIN;
SELECT status FROM payments WHERE id = ? FOR UPDATE;
-- pending이 아니면 에러
UPDATE payments SET status = 'PAID' WHERE id = ?;
COMMIT;
```
동시 상태 전이 방지.

### 금전은 정수로 저장
- 원화: 원 단위 `BIGINT`
- 달러: 센트 단위 (예: $10.50 → `1050`)
- `FLOAT`·`DOUBLE` 금지 — 부동소수점 오차로 1원씩 새거나 쌓임

## 원칙 4: 해킹을 상시 대비

결제 시스템은 **가장 많이 공격받는** 영역. 공격자는 "한 번만 뚫리면 무료 재화·포인트"를 얻으므로 집요하게 시도.

### 입력 검증
- 금액·상품 ID·수량 모두 **서버 기준**으로 재계산 (클라이언트 값 무조건 불신)
- 음수·0·매우 큰 값 차단
- SQL Injection·XSS·Type Confusion 방지

### 인증·서명
- PG사 콜백은 **HMAC 서명 검증** — 제3자 위조 방지
- 타임스탬프 검증 — Replay Attack 차단
- IP 화이트리스트 — PG사 공식 IP만 허용

### 레이트 리밋·이상 탐지
- 같은 사용자·IP의 과도한 결제 시도 차단 ([[Rate-Limiting]])
- 비정상 패턴(1초 안에 100번 시도) 자동 블록
- 이상 로그는 **즉시 알림**

### 권한 분리
- 결제 DB 접근 권한 최소화
- 개발자가 운영 DB에서 금액 수정 못 하게
- 감사 로그 불변성 (WORM 스토리지)

## 원칙 5: 결제가 뚫리면 서비스가 끝난다

이 원칙은 **태도·문화에 관한 것**. 위 4가지를 "귀찮다"·"나중에"로 미루지 말라는 경고.

구체적 함의:
- 결제 장애는 **즉시 P1** — 자면서도 깨서 대응해야 하는 수준
- 결제 버그는 **공개적으로 번짐** — 커뮤니티에 "이 서비스 결제 이상해"가 돌면 신뢰 회복 어려움
- **환불·보상은 빠를수록 낫다** — 법적 의무 전에 고객 신뢰 회복
- **사고 후 포스트모템 철저히** — 같은 실수 반복 방지

결제는 "기능 하나"가 아니라 **서비스의 생명줄**이다.

## 추가 실무 패턴

### 멱등 키 (Idempotency Key)
[[Idempotency]] 참고. 결제에선 **모든 쓰기 API에 필수**. 네트워크 불안 → 재시도 → 이중 결제 방지.

### 상태 추적 (Status Machine)
```
PENDING → PAID → REFUND_REQUESTED → REFUNDED
               ↘ FAILED
               ↘ CANCELLED
```
- 각 상태 전이를 **명시적 API로만** 허용
- 비정상 전이(PAID → PENDING) 차단

### 결제 + 비결제 작업 분리
```
1. 결제 (PG 호출) ← 동기
2. 결제 성공 이벤트 발행
3. 이벤트 핸들러가 쿠폰 발급·포인트 적립·메일 발송 ← 비동기
```
- 결제 자체는 짧고 빠르게
- 부수 작업은 이벤트로 분리 → 결제에 실패해도 멱등성 유지
- [[Transactional-Outbox]] 패턴으로 이벤트 유실 방지

### 대사 배치 (Reconciliation)
매일 PG사 거래 내역을 **내 DB와 비교**해서 불일치 감지. 실시간으로 못 잡은 누락·중복을 배치로 보정.

### 테스트 전용 샌드박스
- PG사 제공 샌드박스 키로 통합 테스트
- 프로덕션 배포 전 **실제 돈 1원 결제** 최종 스모크 테스트
- 자동화된 결제 E2E 테스트 주기적 실행

## 흔한 사고 사례

- **클라이언트 금액 그대로 승인** → 0원·음수 금액 결제로 공짜 재화
- **멱등 키 없이 재시도** → 이중 결제 → 민원 폭주
- **서명 검증 누락** → 콜백 위조로 "결제 성공" 조작
- **정수 대신 float** → 원화 소숫점 누적으로 1원씩 잃음
- **트랜잭션 없이 "결제 → 재화 지급" 순차 처리** → 결제 후 지급 실패로 돈만 받음

## 면접 체크포인트

- 결제 시스템이 일반 API와 다른 기준을 요구하는 이유
- Idempotency Key가 결제에 필수인 이유
- Unique Index + 트랜잭션으로 중복 결제 막는 방법
- 금액을 정수로 저장하는 이유
- PG 콜백 서명 검증·Replay 방어
- 결제 + 부수 작업을 분리하는 이벤트 기반 설계

## 출처
- [supims (brunch) — 안정적인 Node.js 기반 백엔드 시스템 7편 (결제 시스템)](https://brunch.co.kr/@supims/128)

## 관련 문서
- [[Idempotency|HTTP 멱등성]]
- [[Idempotency-Key|Idempotency Key 상세]]
- [[External-API-Integration-Patterns|외부 API 연동 패턴 (거래형)]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Rate-Limiting|Rate Limiting]]
- [[Isolation-Level|DB 격리 수준]]
