---
tags: [fit, interview, tossplace]
status: active
category: "Interview - Fit"
aliases: ["TossPlace 실전 정리", "토스플레이스 1차 실전 정리"]
---

# 토스플레이스 직무 면접 — 실전 정리 (이것만 보면 됨)

> 6/9(화) 11:00 화상. 과제를 화면 공유로 직접 보여주며 디펜스. AI 도구 OFF.
> **이 문서 + [[Interview-Prep-TossPlace-1st-Code-Tour|코드 투어 동선]] 2장이면 충분.** 상세 근거는 `docs/` 백업(디펜스 시트, 모범답변, 10패스 심화 리뷰).
> ⚠️ 토스 저작권. 공개 저장소 푸시 금지.

## 먼저 인정할 진짜 약점 5 (자발적으로 꺼내면 신뢰 신호)
1. **주최자가 알림 수신자에서 제외** — 대기 예약이 확정돼도 그 자리를 기다린 주최자가 통보를 못 받음. 가장 실질적 버그.
2. **없는 roomId/inviteeId로 예약 생성 가능** — FK 비활성 + 존재 검증 없음.
3. **update 과거 시각 검증 구멍** (time만 과거로 이동) + **새 참석자 invited 알림 누락**.
4. **분산 환경 미대응** — 리마인더 스케줄러 중복/유실, throttler in-memory. 단 운영 체크리스트로 인지함 → 의도적 미적용으로 선긋기.
5. **scope enforcement 부재** — 정규화 구조만, 가드 미검증.

추가 (D-4 코드 재검증 = Pass 11):
6. **자정 넘는 예약은 충돌 검사 회피** — duration 상한 없음 + overlapsWith가 날짜 다르면 즉시 false + 슬롯 date 단위. 23:30+60분이 익일 예약과 안 겹친다고 판정. 대응: duration 상한 + 같은 날 종료.
7. **JWT 검증 하드닝 2개 (만료 외 미처리)** — `jwt.verify` 알고리즘 핀(HS256) 없음 + 실패 시 `error.message`(jwt expired 등)를 401 본문에 그대로 노출. 2줄 수정. (보안 파고들 때만 정직하게)
8. **단독 예약 알림 0명 / update 새 초대자는 'invited' 아닌 'changed' 수신** — 주최자 제외 버그의 확장.

## 먼저 꺼내지 말 것 (실제로는 처리/인지됨 — 자폭 금지)
- CSRF → 쿠키 sameSite strict + httpOnly로 방어. **JWT 만료 → 7일(무기한 아님)**. 레이트리밋 프록시/IPv6/분산 → 운영 체크리스트 주석. 출력 누출 → toResponseDto whitelist. 불가능 날짜 → 그레고리력 validator. **물으면 답하되 먼저 약점이라 말하지 말 것.**
- ⚠️ 단 JWT는 **만료만** 처리됨. 알고리즘 핀과 에러 제네릭화는 미처리(위 7번) — "처리됨"으로 착각해 "JWT 다 됐습니다"라 답하지 말 것. 물으면 인정.

## 리드할 강점 5 (화면 공유로 코드/주석 띄우기)
1. **동시성 설계 서사** — 트랜잭션 경계 + SQLite vs MySQL/PG 비관적 락 + PG EXCLUDE 제약 + 데드락 사전순 락. create UC 헤더 주석이 그대로 답변.
2. **ReservationSlot 1급 도메인 객체** — 대기 승격 단일 패스, 부분 충돌, FIFO.
3. **테스트** — 실 SQLite 통합 + 과제 핵심 케이스 1:1 + 알고리즘 단위 + 격리 진화 경로 문서.
4. **보안 설계** — scrypt PHC 인코딩, API Key SHA-256 상수시간, soft-revoke, 쿠키 플래그.
5. **운영 인식** — helmet/CORS/ValidationPipe/throttler + 운영 배포 전 체크리스트 주석.

## 날카로운 질문 3뎁스 드릴 8개 (이것만 입에 붙이면 됨)

**Q1. 대기 예약 확정 로직을 설명해보세요.** → 확정과 겹치면 PENDING 생성(거부 X), 확정이 비면 그 슬롯 대기들을 promotePending으로 승격
- D2. 부분 충돌은? C가 09:30~10:30 대기인데 A(09~10)만 취소하면? → confirmed 전체와 겹침 검사라 B(10~11)가 막아 여전히 대기, A와 B 둘 다 취소돼야 확정
- D3. 같은 시점 D(09~10)는? → A 취소 즉시 확정 집합과 안 겹쳐 같은 패스에서 확정. 선두(C) 막힘이 뒤(D)를 안 막는 가동률 우선

**Q2. 동시 요청 둘이 같은 빈 슬롯을 예약하면 둘 다 확정되나요?** → 임계구역(확정 읽기 → 상태 결정 → 쓰기)을 한 트랜잭션에. SQLite 단일 writer라 직렬화돼 안전
- D2. MySQL이면 어디서 깨지나? → 다중 커넥션이 서로 변경 못 본 채 각자 대기를 확정 → 확정끼리 겹침 불변식 붕괴
- D3. 어떻게 고치나? → Room 행 PESSIMISTIC_WRITE(FOR UPDATE)나 (room,date) advisory lock, PG면 btree_gist EXCLUDE 제약. 데드락은 room,date 사전순 락

**Q3. 대기 예약이 확정되면 누가 알림을 받나요?** → 솔직히 지금은 초대받은 사람만 받고 주최자는 못 받습니다. 대기 걸어둔 주최자가 정작 확정 통보를 못 받는 버그입니다
- D2. 왜 그렇게 됐나? → factory의 recipients가 invitations.invited만 모아서, 주최자를 빠뜨렸습니다
- D3. 어떻게 고치나? → recipients에 organizer 포함, 최소한 confirmed는 주최자에게도. 요구의 참석자에 주최자 포함 해석

**Q4. 없는 방이나 사용자로 예약하면 어떻게 되나요?** → 통과합니다. DTO는 @IsInt만, getReference는 존재를 검증 안 하고 FK 제약도 꺼놨습니다
- D2. 그럼 결과는? → 댕글링 참조로 persist되고 이후 populate에서 깨집니다
- D3. 고치려면? → 서비스에서 findOne으로 존재 확인, 프로덕션 RDB면 FK 제약 + ON DELETE를 안전망으로

**Q5. 리마인더 스케줄러를 2대 띄우면?** → 둘 다 매분 크론을 돌려 중복 발송 가능. 단일 인스턴스 전제라 SQLite로 우연히 안전했고 분산 락이 없습니다
- D2. create엔 동시성 주석을 길게 달면서 여긴 왜 안 달았나? → 비대칭 인정. 스케줄러는 단일 인스턴스 가정에 머물렀습니다
- D3. 고치려면? → 리더 선출이나 분산 락(Redis), 전용 워커. throttler in-memory도 같은 한계라 Redis storage로(체크리스트에 정리해둠)

**Q6. scope 정규화 테이블까지 만들고 가드는 왜 검증을 안 하나요?** → 이번 범위가 인증 확장이고 인가 enforcement는 다음 단계로 봤습니다. 지금은 키가 와일드카드라 전권입니다
- D2. 그럼 과설계 아닌가? → 스키마와 카탈로그만 선제, 가드 훅은 비워둔 의도적 선택. 검증 로직 없이 구조만 둔 건 인정
- D3. 어떻게 채우나? → 가드에서 req.apiKey.scopes를 핸들러 @RequireScope 메타데이터와 대조해 403. 한 줄 추가로 동작

**Q7. 비밀번호는 scrypt인데 API Key는 SHA-256인 이유는?** → 성격이 다릅니다. 비번은 저엔트로피라 느린 KDF가 필요하고, 키는 192bit 고엔트로피 랜덤이라 빠른 해시로 충분합니다
- D2. 나중에 해시 cost를 올리려면? → 비번을 scrypt$N=..,r=..,p=..$salt$hash PHC 형식으로 저장해 파라미터를 보존하니 기존 해시도 그대로 검증됩니다
- D3. 키 비교 타이밍은? → hex를 timingSafeEqual 상수시간 비교. 다만 없는 prefix는 즉시 return이라 미세 누수는 있고(prefix 2^48이라 영향 낮음)

**Q8. 테스트 격리는 어떻게 했고 다른 RDBMS로 가면?** → 인메모리 SQLite라 매 테스트 DROP+CREATE+시드가 가장 단순하면서 빠릅니다(DDL이 ms)
- D2. MySQL/PG면? → DDL 비용이 수백 ms~수 초라 TRUNCATE+재시드로, PG는 savepoint 롤백으로 한 단계 더
- D3. savepoint 롤백의 함정은? → NestJS RequestContext가 EM을 fork하니 픽스처 EM과 요청 EM이 같은 트랜잭션을 공유하게 해야 합니다. 커넥션 풀 1 강제 + RequestContext 조정

## 리허설 원칙
- 약점은 **의도적(트레이드오프 선긋기) vs 진짜 누락(인정 + 수정안)** 구분. 처리된 항목을 약점이라 자폭하지 말 것.
- 막히면 화면 공유의 장점 — 해당 파일/주석을 띄워 같이 추론.

## FIT / 도메인 (과제 외 — 오프닝·클로징·동기)
- [[Interview-Prep-TossPlace-1st-FIT-QA|FIT 답변·예상 Q&A·역질문]] — 자기소개, 왜 이 직무, 이직 사유, 사이드 프로젝트
- [[Interview-Prep-TossPlace-Domain|도메인 브리프]] — 직무 정의(Operations 물류/단말/자동화), 매핑, 도메인 역질문

## 백업 (상세 근거, 평소엔 안 봐도 됨)
- [[Interview-Prep-TossPlace-1st-Assignment-Defense|디펜스 시트]] — 이슈별 3뎁스 드릴 + §8 직무 매핑 표
- [[Interview-Prep-TossPlace-1st-Model-Answers|모범답변]] — 구어체 통문장
- [[Interview-Prep-TossPlace-1st-Deep-Review|심화 리뷰]] — 10패스 + Pass 11 코드 재검증
