---
tags: [fit, interview, tossplace, assignment-defense, drill]
status: active
category: "Interview - Fit"
aliases: ["TossPlace Assignment Defense", "토스플레이스 과제 디펜스"]
---

# 토스플레이스 직무 면접 — 과제 디펜스 시트 (3뎁스)

> **포지션**: Node.js Developer (TypeScript). 지인 추천. 사전 과제(회의실 예약 시스템, NestJS + MikroORM + SQLite) 통과 → 직무 면접.
> ⚠️ **저작권**: 과제는 비바리퍼블리카 소유, 유출 금지. 이 문서는 토스 스펙/코드 복제가 아니라 **본인 설계 답변**만 담음. 공개 저장소 푸시 금지.
> **사용법**: `→` 뒤 답변을 가리고 소리 내어. 면접관은 코드 보며 D3까지 파고듦. 약점은 의도적 미구현(트레이드오프 선긋기)과 진짜 누락(솔직 인정)을 구분해 답한다.
> 반복 리뷰 추가 발굴: [[Interview-Prep-TossPlace-1st-Deep-Review|심화 리뷰 누적]]

## 0. 종합 전략

**밀고 갈 강점 3 카드**
1. **ReservationSlot 도메인 객체** — 대기열 승격을 DB 무관 순수 객체로 분리. 까다로운 부분 케이스를 정확히 구현.
2. **동시성 설계 서사** — SQLite 단일 writer라 트랜잭션 경계로 충분, RDB였다면 비관적 락 + PG EXCLUDE 제약. (본인 마스터 DB Lock 카드와 직결)
3. **테스트** — 실 SQLite 통합 테스트 + EventEmitter spy + EXPLAIN으로 실행계획 고정.

**약점 2분류**
- 의도적 미구현(분산 락, scope enforcement): 과제 범위와 단일 인스턴스 전제로 선긋기 + 프로덕션 확장안 제시
- 진짜 누락(과거 시각 검증, SMS 렌더링, search throttle): 솔직 인정 + 고칠 방법

## 1. ISSUE 예약 대기 알고리즘 (ReservationSlot — 핵심)

**Q. 대기 예약 확정 로직을 설명해보세요.** → 확정과 겹치면 PENDING으로 생성(거부 X), 기존 확정이 취소되면 그 슬롯의 대기들을 승격
- D2. 대기 순서와 부분 충돌은? → createdAt FIFO(동률은 id로 결정적 정렬), 단일 패스로 돌며 확정과 안 겹치는 후보만 승격, 막힌 선두는 건너뛰고 뒤를 확정(가동률 우선)
- D3. 한 번 패스로 충분한 근거는? → 승격은 확정 집합을 늘리기만 하지 다른 대기를 풀어주지 않음. 방금 승격한 예약도 confirmed에 즉시 넣어 이후 후보 충돌 검사에 포함 → 확정끼리 안 겹치는 불변식을 단일 패스에서 유지

**Q. 09:30~10:30 대기가 A(09~10), B(10~11) 둘 다 취소돼야 확정되는 건 어떻게 보장?** → 승격 시 confirmed 전체와 overlap 검사라 A만 취소되면 B와 겹쳐 여전히 blocked
- D2. 그런데 같은 시점 D(09~10) 대기는 A 취소 즉시 확정돼야 하는데? → D는 confirmed 어디와도 안 겹치니 같은 패스에서 통과, C는 skip. 선두 막힘이 뒤를 막지 않는 구조라 자연 해결
- D3. 반열림 구간 처리는? → `[start, end)` 반열림이라 10:00 끝과 10:00 시작은 안 겹침. overlapsWith를 엔티티 메서드로 둬 경계 규칙을 한 곳에서

**Q. 이 로직을 왜 서비스가 아니라 별도 도메인 객체로?** → 슬롯 단위 룰(겹침 검사, 승격)은 메모리 상태만으로 결정되지 DB 어댑터 책임이 아님
- D2. 그럼 슬롯 동일성(같은 room, date)은 누가 보장? → 호출자가 EntityManager 쿼리로 보장, 슬롯 객체는 입력 컬렉션을 신뢰하고 그 안에서만 일관성
- D3. 테스트 이점은? → DB 없이 배열만 넣어 승격 알고리즘을 단위 테스트, 엣지 케이스를 빠르게 검증

## 2. 동시성 / 트랜잭션 (가장 강한 카드)

**Q. 동시에 같은 방, 같은 시간을 예약하면 둘 다 확정되지 않나?** → 임계구역(확정 읽기 → 상태 결정/승격 → 쓰기)을 하나의 em.transactional로 묶음
- D2. 락도 없이 어떻게 직렬화되나? → 현재 DB가 SQLite better-sqlite3라 동기 단일 writer, 쓰기가 DB 레벨에서 직렬화됨. row lock 자체가 없어 트랜잭션 경계만으로 충분
- D3. MySQL/PostgreSQL이면? → 다중 커넥션 경합이라 슬롯 단위 비관적 락 필요. 트랜잭션 직후 Room 행을 PESSIMISTIC_WRITE(FOR UPDATE)로 잡아 같은 회의실 트랜잭션을 직렬화, 또는 (room,date) advisory lock. 승격 알고리즘은 그대로 재사용

**Q. 락만으로 충분한가? DB가 불변식을 강제할 수단은?** → PG면 btree_gist EXCLUDE 제약이 정석
- D2. 어떻게 표현? → `EXCLUDE USING gist (room_id WITH =, tsrange(start,end) WITH &&) WHERE (status='CONFIRMED')`. 반열림 구간과 대기는 겹쳐도 됨까지 그대로 표현, 동시 확정 시 한쪽이 제약 위반 → 재시도
- D3. MySQL은? → exclusion 제약이 없어 DB로 못 막으니 비관적 락에 더 의존. SERIALIZABLE로 가면 40001 재시도 루프가 번거로워 이 도메인엔 비관적 락이 더 단순하고 예측 가능

**Q. 데드락 위험은?** → 락 획득 순서를 (room, date) 사전순으로 통일해 회피
- D2. 트랜잭션 범위는? → 조회와 검증을 최소화하고 임계구역만 트랜잭션에 둠
- D3. 승격 전 flush 이유는? → 취소의 nativeDelete가 DB에 반영돼야 비워진 자리가 보이므로, 승격 재조회 전에 flush로 변경분을 반영

## 3. ISSUE 알림 (이벤트 + 전략 패턴 + 스케줄러)

**Q. 알림 구조를 확장 가능하게 어떻게 짰나?** → 3층 분리. WHAT(알림 타입) / 내용(MessageBuilder, 채널 무관) / HOW(Sender 전략, EMAIL/SMS), 디스패처가 채널→sender 레지스트리로 라우팅
- D2. 카톡 추가하면 뭘 바꾸나? → 채널 유니온에 KAKAO 추가, KakaoSender 구현, 모듈 providers 등록. 디스패처와 빌더, 예약 UC는 무수정(OCP)
- D3. 예약 모듈이 알림 모듈을 직접 호출 안 하는 이유는? → 도메인 이벤트만 발행하고 리스너가 구독. 결합 분리이자 나중에 큐로 빼는 seam

**Q. 트랜잭션과 알림 발송의 경계는?** → 알림 페이로드는 트랜잭션 안에서 스냅샷(값 객체)으로 만들고, 실제 emit은 커밋 후 fire-and-forget
- D2. 왜 엔티티가 아니라 스냅샷? → 취소처럼 곧 삭제될 예약도 안전하게 알림 내용을 보존
- D3. 한 수신자 발송이 실패하면? → 수신자별 try/catch로 격리해 로깅만, 다른 수신자와 예약 트랜잭션을 막지 않음

**Q. 10분 전 리마인더는 어떻게?** → @Cron 매분이 타이밍 트리거, 도메인 룰은 CollectDueReminders UC로 분리
- D2. 중복 발송은? → reminderSentAt 컬럼 가드. 윈도우 안에서 매분 호출돼도 null인 것만 후보, 찍으면 제외. 수집과 마킹이 한 트랜잭션이라 원자적
- D3. 누락과 효율은? → 후보를 status=CONFIRMED, reminderSentAt=null, date in [오늘,내일 KST]로 좁힘(자정 경계 포함), now 주입으로 테스트에서 시점 고정

## 4. ISSUE API Key 인증

**Q. API Key를 어떻게 저장하나?** → 평문은 발급 응답 1회만, DB엔 표시용 keyPrefix와 SHA-256 hashedKey만
- D2. 검증 흐름은? → prefix로 단건 인덱스 조회(O(1)) → 상수시간 해시 비교 → 활성(revoke/expiry) 확인 → lastUsedAt 갱신
- D3. 왜 비번은 scrypt인데 키는 SHA-256? → 비번은 사람이 만든 저엔트로피라 느린 해시로 brute-force 방어가 필요, 키는 48hex(192bit) 고엔트로피 랜덤이라 brute-force가 무의미하고 인증 경로는 저지연이 중요

**Q. 키가 유출되면?** → revoke로 무효화, 삭제가 아니라 revokedAt soft-revoke로 감사 추적
- D2. 남의 키 존재를 노출하지 않나? → 비소유자 요청은 404로 통일해 키 존재 여부를 숨김
- D3. 키로 또 키를 발급하는 권한 상승은? → 발급 엔드포인트는 쿠키 세션만 허용, API Key로는 발급 불가 + 분당 throttle

**Q. scope는 왜 정규화 테이블까지?** → 다음 요구가 권한 상세화라 명시돼 있어 미래 확장 비용을 낮추려 스키마를 선제 분리, default는 와일드카드
- D2. (압박) 그런데 가드가 scope를 검증 안 하잖아요? → 이번 범위는 인증 확장이고 인가 enforcement는 다음 단계. 다만 정직하게, 지금은 모든 키가 전권이라 enforcement 한 줄을 가드에 넣는 게 맞다 (→ 약점 정면돌파 2번)
- D3. 그럼 과설계 아닌가? → 스키마와 카탈로그만 두고 가드 훅은 비워둔 건 의도적, 실제 검증 로직 없이 구조만 만든 건 인정하고 우선순위 판단이었다

## 5. ISSUE 검색 개선 + 권한/검증

**Q. like 검색을 어떻게 개선했나?** → username을 좌측 앵커 prefix 검색하되 NOCASE 콜레이션 인덱스를 추가
- D2. 왜 인덱스가 안 걸렸었나? → SQLite 기본 LIKE는 case-insensitive인데 BINARY 인덱스로는 LIKE 최적화가 안 돼 풀스캔, collate nocase 인덱스를 raw로 선언해 SEARCH USING INDEX로 전환
- D3. 검증은? → 테스트에서 EXPLAIN QUERY PLAN으로 실행계획을 고정해 풀스캔 회귀를 막음. 한계는 좌측 앵커만 인덱스를 타고 중간 검색은 못 함(의식적 트레이드오프)

**Q. 예약 수정/취소 권한은 어디서 막나?** → 인증(401)은 가드, 인가(403)는 도메인 UC에서 isOrganizedBy로
- D2. 목록 조회 IDOR는? → 메모리 필터가 아니라 WHERE절($or organizer, invited)로 DB에서 걸러 부하와 정보 누출을 동시 해결
- D3. 잘못된 날짜는? → 2층. @IsCalendarDate로 그레고리력 실제 존재(2099-02-30, 13월 거름) + isPastDate(KST)로 과거 차단

## 6. 아키텍처 / 테스트

**Q. 왜 use-case per file로 쪼갰나?** → 컨트롤러는 1 엔드포인트 1 UC의 HTTP 어댑터, 비즈니스는 UC, 슬롯 룰은 1급 도메인 객체. 한 서비스에 다 있던 걸 책임별로 분리
- D2. 도메인 로직은 어디에? → 엔티티 메서드(overlapsWith, isOrganizedBy, isInPast)로 풍부하게, anemic model 회피
- D3. KST wall-clock 설계 근거는? → 회의실은 한국 빌딩의 물리 공간이라 점유는 KST wall-clock으로 정의, 고정 오프셋으로 일관 처리

**Q. 테스트 전략은?** → unit은 DI 없이 순수 로직(슬롯 승격, 디스패처 격리, 토큰), integration은 실 SQLite로 supertest
- D2. 모킹은? → 통합은 실 DB(:memory:)라 모킹 최소화, Sender만 no-op으로 override해 10% 랜덤 실패의 플래키를 제거
- D3. 알림 검증은? → EventEmitter spy로 올바른 이벤트와 수신자가 발행되는지, 격리는 beforeEach dropSchema+seed

## 7. 약점 정면돌파 (먼저 인정하거나 트레이드오프로 선긋기)

1. **리마인더 분산 환경** (의도적+트레이드오프) → 단일 인스턴스와 SQLite 전제라 안전. 다중 인스턴스면 @Cron 중복 실행이라 리더 선출이나 분산 락, 전용 워커가 필요. 또 reminderSentAt을 발송 전에 찍어 실패 시 유실(at-most-once)인데, 중요 알림이면 발송 후 멱등키로 at-least-once가 맞다고 인정
2. **scope enforcement 부재** (인정) → 정규화 구조만 있고 가드가 검증 안 함, default 와일드카드라 전권. 가드에 scope 체크 한 줄 추가가 맞다
3. **user search throttle/길이/페이지네이션 없음** (인정) → reservation엔 페이지네이션이 있는데 user search엔 없는 비대칭. min length + throttle + 커서 페이지네이션 추가
4. **과거 검증이 날짜 단위만** (인정 또는 해석) → 요구가 지난 날짜라 date 단위로 해석했으나, 오늘의 지난 시각도 막으려면 time까지 봐야 함
5. **SMS 렌더링 미분화 + lastUsedAt 매 인증 write** (인정) → MessageBuilder를 채널별로 분기하거나 sender가 렌더링 책임을 갖는 게 맞다. lastUsedAt은 고QPS면 비동기 배치 업데이트로

## 8. 토스플레이스 도메인 매핑 + 역질문

**매핑** (결제 도메인은 정합성/멱등성이 생명 → 본인 강점과 직결): 회의실 동시 예약 직렬화 = 결제/정산 동시성, 리마인더 멱등(reminderSentAt) = 중복 결제 방지 멱등키, EXCLUDE 제약 = 결제 불변식 DB 강제.

**역질문 풀**:
- 토스플레이스 결제 트랜잭션에서 정합성을 DB 제약으로 강제하는 부분이 있나요, 아니면 애플리케이션 락 위주인가요?
- 단말과 서버 간 통신에서 멱등성은 어떤 키로 보장하나요(중복 결제 방지)?
- Node.js로 결제 같은 고신뢰 도메인을 다룰 때 팀이 가장 신경 쓰는 운영 지표나 장애 패턴은?
- 이 과제에서 제가 더 팠으면 좋았을 부분을 피드백 주실 수 있을까요?
