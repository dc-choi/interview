---
tags: [fit, interview, tossplace, code-tour, screen-share]
status: active
category: "Interview - Fit"
aliases: ["TossPlace Code Tour", "토스플레이스 코드 투어 동선"]
---

# 토스플레이스 직무 면접 — 코드 투어 동선 (화면 공유)

> 6/9(화) 11:00 화상. **과제를 화면 공유로 직접 보여주며 설명.** AI 도구 끄고 진행.
> 이 문서는 *무슨 답*(디펜스 시트)이 아니라 *화면에서 어떻게 보여줄지*. 경로는 `packages/server/` 기준.
> ⚠️ 토스 저작권. 공개 저장소 푸시 금지.

## 0. 시작 전 세팅 (전날 + 5분 전)

- [ ] **코파일럿/커서 에이전트 끄기** (잊기 쉬움, 화면에 자동완성 뜨면 감점)
- [ ] 프로젝트 열고 **파일 트리 펼쳐두기**, 에디터 폰트 키우기(화면 공유 가독성)
- [ ] 터미널 준비 — `pnpm test`, `pnpm dev` 바로 칠 수 있게
- [ ] `db.sqlite`는 seed 상태 확인(데모 시 로그인 정보: seed-data 참고)
- [ ] 불필요한 탭/알림/메신저 닫기 (화면 공유에 다 보임)
- [ ] Meet 링크 5분 전 접속, 마이크/화면 공유 권한 미리 테스트

## 1. 주도형 투어 동선 (플로어 잡으면 이 순서로)

> 면접관이 "과제 설명해주세요" 하면 끌려가지 말고 본인이 구조부터. "먼저 전체 구조를 보여드리고, 까다로웠던 부분 위주로 들어가겠습니다."

**① 폴더 구조로 아키텍처 (2분)** — `src/` 트리
- domain/{reservation, api-key, ...}/{application, presentation, core, dto} + infrastructure + common
- 한 줄: "컨트롤러에 다 있던 걸 책임별로 분리. 컨트롤러는 HTTP 어댑터, 비즈니스는 use-case, 슬롯 룰은 1급 도메인 객체."

**② ISSUE 예약 대기 — 핵심 (8분)**
- `domain/reservation/core/reservation-slot.ts` → `promotePending()` 띄우고 FIFO + 단일 패스 + 가동률 우선 설명. 부분 충돌(C 09:30~10:30 vs D 09:00~10:00) 케이스
- `domain/reservation/core/entities/reservation.entity.ts` → `overlapsWith`(반열림 구간), `confirm/markPending`
- `domain/reservation/application/create-reservation.use-case.ts` → 확정 겹치면 PENDING, 비면 confirm
- `domain/reservation/application/remove-reservation.use-case.ts` → 취소 시 flush 후 재조회 → promotePending

**③ 동시성 — 강한 카드 (5분)**
- `create-reservation.use-case.ts` **헤더 주석** 그대로 띄우기. 이게 곧 답변임 — SQLite 단일 writer / MySQL이면 PESSIMISTIC_WRITE(FOR UPDATE) / PG면 btree_gist EXCLUDE 제약 / 데드락은 room,date 사전순 락
- 천천히 짚으며 읽어주기. "이 부분은 주석에 트레이드오프를 정리해뒀습니다."

**④ ISSUE 알림 (5분)**
- `infrastructure/notifications/senders/` → email/sms sender(전략), `notification-channel.ts`
- `infrastructure/notifications/reservation-notification.listener.ts` → 이벤트 구독(결합 분리)
- `domain/reservation/application/collect-due-reminders.use-case.ts` + `presentation/reservation-reminder.scheduler.ts` → 매분 크론 + reminderSentAt 멱등 가드

**⑤ ISSUE API Key (5분)**
- `domain/api-key/core/api-key.token.ts` → 형식, SHA-256 해시, 상수시간 비교
- `domain/api-key/core/api-key.scopes.ts` → 정규화(미래 확장)
- `domain/api-key/application/authenticate-api-key.use-case.ts` → prefix 조회 → 해시 검증 → 활성/만료
- `common/guards/auth-or-api-key.guard.ts` → JWT 쿠키와 통합

**⑥ ISSUE 검색 + 권한/검증 (4분)**
- `domain/user/application/search-users-by-prefix.use-case.ts` → NOCASE 인덱스
- `common/validators/is-calendar-date.validator.ts` → 그레고리력 실제 존재 검증
- 권한: use-case의 `isOrganizedBy`(403) vs 가드(401)

**⑦ 테스트로 마무리 — 신뢰 카드 (3분)**
- 터미널에서 `pnpm test` 라이브 실행 → 통과 보여주기
- `test/integration/reservation/reservation-waiting.test.ts` 열어 대기 승격 시나리오 검증을 보여주기
- "실 SQLite로 통합 테스트, 검색은 EXPLAIN QUERY PLAN으로 실행계획까지 고정했습니다."

## 2. 리액티브 맵 (면접관이 물으면 → 즉시 이 파일)

| 질문 | 열 파일 | 짚을 포인트 |
|---|---|---|
| 대기 확정 순서/알고리즘 | `reservation/core/reservation-slot.ts` | promotePending, FIFO+id, 단일 패스 |
| 동시 예약 정합성 | `reservation/application/create-reservation.use-case.ts` 헤더 | 트랜잭션 경계, SQLite vs RDB 락 |
| 취소 시 승격이 어떻게 | `reservation/application/remove-reservation.use-case.ts` | flush 후 재조회, wasConfirmed 가드 |
| 겹침 판정/반열림 | `reservation/core/entities/reservation.entity.ts` | overlapsWith |
| 알림 확장(카톡 추가) | `infrastructure/notifications/senders/` | NotificationSender 전략, 레지스트리 |
| 리마인더 중복/누락 | `reservation/application/collect-due-reminders.use-case.ts` | reminderSentAt, 트랜잭션 원자성, 후보 범위 |
| API Key 저장/검증 | `api-key/core/api-key.token.ts` | SHA-256, 상수시간 비교 |
| scope 권한 | `api-key/core/api-key.scopes.ts` | 정규화, default 와일드카드(enforcement는 다음) |
| 두 인증 통합 | `common/guards/auth-or-api-key.guard.ts` | Bearer면 키, 없으면 쿠키 |
| 검색 최적화 | `user/application/search-users-by-prefix.use-case.ts` | NOCASE 인덱스, EXPLAIN 고정 |
| 날짜 검증 | `common/validators/is-calendar-date.validator.ts` | 그레고리력 실제 존재 |
| 권한 401 vs 403 | `reservation/application/remove-reservation.use-case.ts` | isOrganizedBy(403), 가드는 401 |
| 테스트 전략 | `test/integration/`, `test/unit/` | 실 SQLite, EventEmitter spy, 드롭+시드 |

## 3. 화면 공유 진행 팁

- **주도권**: "이 부분은 코드로 보여드릴게요" 하고 본인이 파일을 연다. 말로만 설명하다 막히면 바로 해당 코드를 띄워 짚기 — 화면 공유의 최대 장점
- **주석 활용**: 본인이 단 설계 주석(동시성, ReservationSlot 헤더)이 곧 답변. 천천히 짚으며 읽어주기
- **약점 질문**: 디펜스 시트 §7대로 — 의도적 미구현은 트레이드오프로 선긋고(scope, 분산 락), 진짜 누락은 인정(과거 시각, SMS 렌더링). 화면에서 "여기 보시면 이 부분은 일부러 비워뒀습니다"로 정직하게
- **모르는 질문**: 추측 금지. "이 부분은 지금 확신이 없는데, 코드를 보면서 짚어보겠습니다" 하고 관련 파일 열어 같이 추론
- **속도**: 면접관이 특정 이슈만 깊게 파면 동선을 버리고 따라가되, 안 본 강점(동시성·테스트)은 끝에 "한 가지만 더 보여드려도 될까요"로 챙기기

## 관련
- [[Interview-Prep-TossPlace-1st-Assignment-Defense|디펜스 시트 (3뎁스 드릴)]]
- [[Interview-Prep-TossPlace-1st-Model-Answers|모범답변 스크립트]]
