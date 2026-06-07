---
tags: [fit, interview, tossplace, deep-review, loop]
status: active
category: "Interview - Fit"
aliases: ["TossPlace Deep Review", "토스플레이스 심화 리뷰 누적"]
---

# 토스플레이스 과제 — 심화 리뷰 누적 (반복 루프)

> [[Interview-Prep-TossPlace-1st-Assignment-Defense|디펜스 시트]]에 없던 추가 발굴을 회차별로 누적. 각 발견 = 심각도 + 내용 + 면접 대응.
> 심각도: 🔴 실제 버그/누락 · 🟡 트레이드오프/사소 · 🟢 강점 확인. ⚠️ 토스 저작권, 공개 푸시 금지.
>
> **진행**: Pass 1~10(스냅샷 기반) + Pass 11(D-4 실제 소스 재검증). 아래 Pass 10이 실전용 종합, Pass 11이 코드로 검증한 교정.

## Pass 1 — update UC, 엔티티, 리마인더 스케줄러

- 🔴 **update의 과거 시각 검증 구멍** — update는 dto.date가 있을 때만 isPastDate를 검사한다. 날짜를 안 바꾸고 time만 과거로 옮기면 과거 검증이 아예 안 걸린다. create도 date 단위라 오늘의 지난 시각은 통과. 디펜스 §7-4의 강한 버전.
  - 대응: 인정. 과거 판정을 date가 아니라 startAt(date+time) 기준으로 통일해야 한다. "지난 날짜"로 요구를 해석했는데 시각까지 봤어야 합니다.
- 🔴 **update 시 새 참석자에게 초대 알림 누락** — syncInvitations가 새 초대를 persist하지만, update는 주최자 기준 changed 알림만 발행한다. 새로 추가된 참석자에게 첫 invited 알림이 안 간다.
  - 대응: 인정. 추가된 초대 대상에게는 invited를, 기존 참석자에게는 changed를 구분해 발행해야 맞습니다. 알림 요구의 부분 미충족.
- 🟡 **리마인더 유실 (시작 시각 경과)** — 발송 윈도우는 시작 10분 전부터 시작 직전까지인데, 그 사이 크론이 누락되면(배포, GC, 다운) 시작 시각을 지난 뒤엔 영영 안 보낸다. reminderSentAt을 발송 전에 찍어 at-most-once.
  - 대응: 트레이드오프. 중요 알림이면 발송 후 멱등 마킹 + 시작 직후 짧은 캐치업 윈도우가 맞습니다.
- 🟡 **리마인더 매분 쿼리 인덱스 부재** — 후보를 status=CONFIRMED, reminderSentAt=null, date in [오늘,내일]로 좁히지만 (status, date, reminderSentAt) 복합 인덱스가 없다. status와 date 단일 인덱스만 있어 확정 예약이 누적되면 매분 비효율.
  - 대응: 운영 규모면 부분 인덱스(reminderSentAt IS NULL) 또는 복합 인덱스로 매분 스캔을 줄입니다.
- 🟡 **scheduleChanged의 falsy 의존** — Boolean(dto.date or dto.time or dto.duration or dto.roomId). duration이 0이면 falsy라 변경 감지를 놓칠 수 있는데, DTO @IsPositive가 막아 우연히 안전. 견고성은 명시적 undefined 비교가 맞다.
- 🟡 **엔티티 도메인 방어 부재** — duration 음수/0, title 길이 같은 불변식을 엔티티가 직접 막지 않고 DTO 검증에 의존한다. changeSchedule도 검증 없음. 도메인 객체가 스스로를 못 지키는 anemic 방어 갭.
- 🟢 **이중 슬롯 승격 + 락 순서 주석 (강점)** — update가 옮기기 전 슬롯과 옮긴 뒤 슬롯 양쪽을 promotePending으로 재평가하고, 데드락 회피로 (room_id, date) 사전순 락을 주석에 명시. 면접관이 "두 슬롯을 동시에 만지면 데드락은?" 치면 이 주석을 띄우면 그대로 답.
- 🟢 **(room, date) 복합 인덱스 + status 인덱스 (강점)** — 가장 hot한 슬롯 조회를 단일 seek로. 엔티티 주석에 인덱스 선택 근거까지 적혀 있음.

## Pass 2 — 보안 (API Key 토큰, JWT, 가드)

- 🟡 **JWT verify에 algorithms 미지정** — `jwt.verify(token, JWT_SECRET)`에 `algorithms` 옵션이 없다. 문자열 시크릿이라 RS to HS 혼동 공격은 직접 노출은 아니지만, 알고리즘을 핀하지 않는 건 하드닝 갭.
  - 대응: `{ algorithms: ['HS256'] }` 명시. 면접관이 보안 물으면 먼저 짚으면 가점.
- 🟡 **JWT 에러 메시지 클라이언트 노출** — 검증 실패 시 `Unauthorized access: ${error.message}`로 jwt 내부 메시지(jwt expired, invalid signature)를 그대로 응답에 실음. 정보 누출.
  - 대응: 내부 로깅 + 제네릭 401 메시지.
- 🟡 **JWT 페이로드 런타임 검증 부재 + 만료 확인 필요** — verifyJwtCookie가 서명만 보고 payload를 `as User`로 캐스팅. signin이 exp를 안 넣으면 세션 무기한(signin.use-case 확인 필요).
- 🟡 **CSRF 노출 가능 (확인 필요)** — 쿠키 기반 인증인데 상태 변경(POST/PATCH/DELETE 예약)에 CSRF 토큰이나 SameSite 쿠키 보호가 있는지 확인 필요. Bearer 경로는 안전하나 브라우저는 쿠키 사용.
- 🟡 **lastUsedAt 매 인증 write** — 모든 API Key 인증이 lastUsedAt을 flush(쓰기). 읽기 경로가 쓰기 경로가 되어 SQLite 단일 writer 직렬화, RDB면 키 행 락 경합. 고QPS에서 병목.
  - 대응: best-effort 비동기 또는 N분당 1회로 쓰기 빈도 제한.
- 🟡 **키 존재 타이밍 누수** — 없는 prefix는 해시 비교 전 즉시 return이라 응답 시간으로 prefix 존재 여부 추정 가능. prefix 공간이 2^48이라 영향은 낮음.
- 🟡 **throttler 프록시 뒤 IP 키잉 (확인 필요)** — 전역 레이트리밋이 IP 기준인데 프록시 뒤면 trust proxy 설정이 없으면 모두 한 버킷이거나 프록시 IP로 묶임(throttler.config 확인 필요).
- 🟢 **API Key 설계 (강점 재확인)** — CSPRNG 192bit secret, SHA-256 해시만 저장, 상수시간 비교, soft-revoke, hidden+lazy 컬럼. 발급은 세션 전용이라 키로 키를 못 만듦(권한 상승 차단). 주석에 보안 설계 근거 명시.
- 🟢 **helmet + throttler 기본기 (강점)** — 보안 헤더와 레이트리밋을 baseline으로 적용.

## Pass 3 — 성능/쿼리 (조회 use-case, ORM 설정)

- 🔴 **user search에 limit/최소 길이 없음** — `find({ username: $like prefix% })`에 limit도 min length도 없다. 빈 prefix면 `%`로 전체 사용자 덤프. reservation 조회는 페이지네이션(기본 50, 최대 200)이 있는데 user search만 0. 비대칭 + 사용자 열거 가능.
  - 대응: 인정. min length 2 이상 + limit + (대규모면) 커서. reservation 쪽과 일관성 맞춰야.
- 🟡 **$or + invitations 조인 + limit/offset 정확성** — 권한 필터가 invitations를 to-many 조인하는데, 조인 결과에 limit/offset을 걸면 행 중복이나 페이지 누락이 생길 수 있다. MikroORM이 서브쿼리로 안전하게 처리하는지 확인 필요.
  - 대응: distinct 또는 분리 서브쿼리로 페이지네이션 정확성 보장.
- 🟡 **populate 전체 그래프** — 목록 조회가 room, organizer, invitations, invited, inviter를 다 로드. inviter는 응답에 불필요할 수 있음. select-in 전략이라 N+1은 아니나 라운드트립이 여럿.
  - 대응: 필요한 관계만 부분 로드(필드 셀렉션), 또는 JOIN 전략 선택.
- 🟡 **FK 제약 비활성 (disableForeignKeys, createForeignKeyConstraints false)** — DB에 외래키 제약이 없어 참조 무결성이 앱 책임이다. 취소 시 invitations를 수동 nativeDelete로 지우지만, 어느 경로가 빠뜨리면 고아 레코드.
  - 대응: 프로덕션 RDB면 FK 제약 + ON DELETE CASCADE를 안전망으로. 지금은 SQLite/MikroORM 관행으로 앱에서 관리.
- 🟡 **프로덕션 쿼리 로깅 오버헤드** — `debug: !isTest`라 비테스트에서 모든 쿼리를 sql-formatter + highlight로 포매팅해 출력. 프로덕션이면 쿼리당 포매팅 비용 + 로그 노이즈.
  - 대응: 프로덕션은 debug off 또는 슬로우 쿼리 샘플링만.
- 🟢 **권한 필터를 WHERE로 (강점)** — 메모리 필터가 아니라 `$or: [organizer, invitations.invited]`를 DB WHERE로 밀어 부하와 정보 누출을 동시 해결. 주석에 이전 구현(전체 fetch 후 메모리 필터) 대비 개선 서사.
- 🟢 **조회 범위 기본 제한 + 결정적 정렬 (강점)** — by-user 기본 최근 30일, by-date 50/200 페이지네이션, (time asc, id asc) 안정 정렬로 응답 폭증과 비결정성 방지.

## Pass 4 — 테스트 누락/품질

- 🟡 **동시성 레이스 테스트 부재** — 대기열 테스트가 전부 순차(예약 → 취소 → 확인)다. 두 요청이 동시에 같은 슬롯을 다투는 실제 동시성 테스트는 없다. 동시성을 설계와 주석으로 강조했는데 검증은 순차.
  - 대응: 인정. SQLite 단일 writer라 진짜 레이스 재현은 어렵지만, Promise.all로 동시 POST를 던져 "정확히 하나만 확정, 나머지 대기" 불변식을 검증하는 테스트가 있으면 더 강했다.
- 🟡 **버그 영역 미커버** — update로 time만 과거 이동(Pass1 F1), update로 새 참석자 추가 시 invited 알림(Pass1 F2)을 검증하는 테스트가 없을 가능성. 있었으면 그 누락이 드러났을 것.
  - 대응: 그 두 케이스 테스트를 추가하면 버그도 같이 잡힌다.
- 🟡 **리마인더 윈도우/중복방지 테스트 확인 필요** — CollectDueReminders가 now 주입형으로 테스트 가능하게 설계됐는데, 10분 전 윈도우와 reminderSentAt 중복 방지가 실제 테스트로 잡혀 있는지 확인 필요.
- 🟢 **대기열 핵심 케이스 1:1 커버 (강점)** — 과제 스펙의 까다로운 케이스(D 먼저 C, C는 A와 B 둘 다 취소돼야, 이동/취소/단축으로 인한 승격)를 통합 테스트로 그대로 검증. 요구사항 추적성 최상.
- 🟢 **알고리즘 단위 테스트 + 결정성 (강점)** — ReservationSlot을 DB 없이 메모리로 FIFO, id 타이브레이크, 단일 패스 누적 충돌까지 망라. 빠르고 결정적.
- 🟢 **플래키 통제 + 격리 전략 문서화 (강점)** — sender no-op override로 10% 랜덤 실패 제거, now 주입으로 시간 고정, 통합 묶음 30초 미만. test-app에 RDBMS 전환 시 격리 진화 경로(TRUNCATE → savepoint 롤백 → testcontainers)까지 적어둠. 테스트 전략 질문의 강한 탄약.

## Pass 5 — 에러처리/예외/입력검증

- 🔴 **없는 roomId / inviteeId로 예약·초대 생성 가능** — DTO는 @IsInt만 보고, 서비스는 em.getReference로 lazy 참조라 존재를 검증하지 않으며, FK 제약도 비활성(Pass 3). 없는 방이나 사용자로 예약이 persist되고 이후 populate에서 깨진다.
  - 대응: 인정. roomId/inviteeId 존재를 서비스에서 findOne으로 확인하거나, 프로덕션 RDB면 FK 제약으로 막아야 한다. Pass 3 FK 발견과 결합되는 실질 버그.
- 🟡 **title/description 길이 상한 미검증** — title은 MinLength(1)만, description은 @IsString만. 엔티티는 title 255/description text라 255 초과 title이면 DB 레벨 실패나 절삭. MaxLength 추가가 맞다.
- 🟡 **duration 상한 없음 + 자정 넘는 예약** — @IsPositive만이라 거대한 duration이 가능하고, 자정을 넘기면 endAt이 다음 날인데 슬롯이 date 단위라 다음 날 예약과 충돌 검사가 안 된다.
  - 대응: duration 상한 + 같은 날 종료 제약, 또는 멀티데이 예약을 별도 모델링.
- 🟡 **중복 inviteeIds / 빈 업데이트** — create는 inviteeIds 중복을 제거하지 않아 중복 초대 레코드가 생길 수 있고(update의 syncInvitations는 dedup하는 비대칭), 빈 body update도 changed 알림을 발송.
- 🟢 **전역 예외 마스킹 (강점)** — HttpException은 그대로, 그 외 SQL/ORM 예외는 500 일반 메시지로 내부 구조(UNIQUE constraint failed 등) 누출 차단, stack은 서버 로그만. (단 JWT 에러는 의도적 HttpException이라 메시지가 노출 — Pass 2와 연결, 거기만 제네릭화 필요)
- 🟢 **그레고리력 날짜 검증 + 페이지네이션 DTO (강점)** — 커스텀 validator로 13월, 평년 2-29 같은 불가능 날짜 차단. 쿼리 페이지네이션은 Min/Max/default + Type 변환으로 일관.

## Pass 6 — 데이터 모델/마이그레이션/시드

- 🟡 **invitation.startAt 비정규화 → 예약 이동 시 stale** — Invitation이 reservation.startAt을 자기 컬럼(인덱스)으로 복제하는데, 예약을 다른 시간으로 옮겨도 기존 초대의 startAt은 갱신되지 않아 낡은 값이 남는다. 로직엔 거의 안 쓰이는 듯하나(리마인더는 Reservation 조회) 데이터 정합성 갭.
  - 대응: 안 쓸 비정규화면 제거, 쓸 거면 예약 이동 시 동기화. 면접관이 "왜 중복 저장, 시간 바뀌면?" 칠 지점.
- 🟡 **중복 초대 방지 제약 부재** — Invitation에 unique(reservation, invited)가 없어 같은 사람을 한 예약에 여러 번 초대 가능(Pass 5 create dedup 부재와 결합). ApiKeyScope는 unique를 거는데 비대칭.
  - 대응: unique(reservation, invited) 추가.
- 🟡 **username 비유니크 + 상태 enum 케이싱 불일치** — username 중복 허용(이메일만 unique), Invitation status는 소문자인데 Reservation status는 대문자라 일관성 약함. 사소.
- 🟢 **scrypt 비밀번호 + PHC 인코딩 (강점)** — algo/params/salt를 함께 저장(scrypt$N=..,r=..,p=..$salt$hash)해 미래 cost 상향에도 기존 해시 검증 가능, 랜덤 salt, timing-safe 비교. "왜 비번은 scrypt, 키는 SHA-256"의 완벽한 근거(Pass 2 보강).
- 🟢 **scope 정규화 + unique + cascade (강점)** — 권한을 별도 행으로 정규화, unique(apiKey, scope), deleteRule cascade. 추후 권한 단위 쿼리/회수에 자연스러운 스키마.
- 🟢 **시드 KST 날짜 + 멱등 가드 (강점)** — 어제/오늘/내일을 KST로 생성, isDatabaseEmpty로 빈 DB일 때만 시드. NOCASE 인덱스를 raw expression으로 선언(테이블명 하드코딩은 주석에 인정).

## Pass 7 — API 설계/일관성

- 🟡 **경로 date 파라미터 미검증** — GET /reservations/:date의 date를 IsCalendarDate로 검증하지 않아 잘못된 날짜(/reservations/abc)도 400이 아니라 빈 결과를 준다. POST body의 date는 검증하는데 경로는 안 하는 비대칭.
  - 대응: 경로에도 날짜 검증 파이프 추가.
- 🟡 **DELETE 응답 일관성** — DELETE가 200 + `{ message }` 리터럴을 toResponseDto/MessageResponseDto 없이 직접 반환. 204 No Content 관례와 다르고 직렬화 경로도 다른 엔드포인트와 미세하게 비대칭. 사소.
- 🟡 **응답 DTO room/invitations 타입 불일치** — swagger는 required:false인데 TS 타입은 non-optional. 미populate 시 undefined. 사소.
- 🟢 **1:1 UC 매핑 + 라우트 순서 인지 (강점)** — 컨트롤러는 HTTP 어댑터, 엔드포인트당 UC 하나. /reservations를 /:date보다 먼저 선언하는 Express 매칭까지 주석.
- 🟢 **출력 whitelist 직렬화 (강점)** — toResponseDto의 excludeExtraneousValues + @Expose로 입력 whitelist와 대칭. 엔티티 새 필드가 응답에 안 샌다. 오버로드 순서 주석에 TS 깊이.
- 🟢 **단일 응답 계약 (강점)** — 생성/수정/조회/목록/초대 응답이 모두 같은 ReservationResponseDto. 일관된 클라이언트 계약.

## Pass 8 — 알림 심화

- 🔴 **주최자가 알림 수신자에서 제외 (confirmed 누락)** — factory의 recipients가 invitations.invited(초대받은 사람)만이라 예약 주최자는 어떤 알림도 못 받는다. 특히 대기 예약이 확정될 때(confirmed) 정작 그 자리를 기다리던 주최자가 통보를 못 받는다.
  - 대응: 인정. recipients에 organizer를 포함하거나, 최소한 confirmed는 주최자에게도 보내야 한다. 요구의 "참석자"에 주최자 포함 해석.
- 🟡 **채널별 렌더링 미분화** — MessageBuilder가 채널 무관이라 SMS도 이메일용 멀티라인 body(회의실/시간/참석자 3줄)를 그대로 받는다. SMS엔 너무 길고 포맷 부적합.
  - 대응: 채널별 렌더링 분기 또는 sender가 렌더링 책임. (채널 무관 설계 자체는 OCP 장점)
- 🟡 **SMS 선호인데 phone null** — factory가 phone 없는 SMS 수신자를 거르지 않아 undefined로 발송 시도. 스텁이라 안 터질 수 있으나 실제면 검증 필요.
- 🟡 **transport 스텁의 PII 로깅** — 주어진 베이스라인이 email/phone을 console.log로 찍는다. 실제 구현이면 마스킹 필요(주어진 스텁이라 우선순위 낮음).
- 🟢 **실패 격리 + 전략 레지스트리 (강점)** — 수신자별 try/catch, senders Map 라우팅, 한 명 실패가 다른 발송이나 예약 트랜잭션을 안 막음.
- 🟢 **스냅샷 + 이벤트 디커플링 (강점)** — factory가 채널 무관 스냅샷 생성(취소돼도 안전), 리스너가 이벤트 구독해 디스패치. 큐로 바꾸면 발행측 무변경, emit은 커밋 후 fire-and-forget.
- 🟢 **메시지 빌더 exhaustive switch (강점)** — 타입별 분기, 새 타입 누락 시 TS 컴파일 에러로 강제.

## Pass 9 — 확장성/운영 (config, bootstrap, throttler, signin)

- 🟢 **Pass 2 보안 우려 해소 (중요 — 약점으로 먼저 꺼내지 말 것)** — signin이 JWT를 expiresIn 7d로 발급(무기한 아님), 쿠키는 httpOnly + secure(prod) + sameSite strict + maxAge 7d로 XSS/CSRF 방어, set/clear 옵션 동일. 레이트리밋은 trust proxy/IPv6 /64/분산 Redis storage/429 헤더까지 "운영 배포 전 체크리스트"로 주석화. → Pass 2의 CSRF, JWT 만료, throttler 프록시는 실제로는 처리/인지된 항목이다.
- 🟡 **graceful shutdown 부재** — enableShutdownHooks/SIGTERM 처리가 없어 @Cron 스케줄러와 in-flight 요청이 종료 시 안전하게 드레인되지 않는다. 대응: enableShutdownHooks + 진행 요청 완료 대기.
- 🟡 **signin 타이밍 사용자 열거** — 없는 이메일은 scrypt를 안 돌려 빠르게 응답하므로 응답 시간으로 이메일 존재를 추정할 수 있다. signin 10/min throttle로 완화되나, dummy scrypt를 항상 수행하면 더 안전.
- 🟡 **중앙 설정 모듈 부재 + main().catch 부재** — env가 app.config/index/throttler에 분산되고 부팅 시 스키마 검증(@nestjs/config + Joi/zod)이 없다(PORT/JWT_SECRET fail-fast는 있음). bootstrap main()에 .catch가 없어 부팅 실패 시 unhandled rejection.
- 🟡 **observability 미비** — Nest Logger console만, 메트릭/트레이싱/APM 없음. 과제 범위론 합리적이나 프로덕션이면 추가 필요(본인 마스터 관측 카드와 연결해 답하면 강함).
- 🟢 **운영 안전망 + 체크리스트 문서화 (강점, 매우 강함)** — helmet, CORS 명시 화이트리스트(credentials, 와일드카드 금지), forbidNonWhitelisted ValidationPipe, JWT_SECRET 프로덕션 fail-fast, 레이트리밋(전역 100 + signin/발급 10/min). 프록시/IPv6/분산 storage를 운영 체크리스트로 정리한 시니어급 운영 인식.
- 🟢 **JWT_SECRET fail-fast (강점)** — 프로덕션에서 미설정 시 부팅 즉시 실패, dev는 약한 기본값 허용으로 운영 유출 방지.

## Pass 10 — 종합 (실전 우선순위)

### 먼저 인정할 진짜 약점 5 (자발적으로 꺼내면 신뢰 신호)
1. **주최자가 알림 수신자에서 제외** — 대기 예약이 확정돼도 그 자리를 기다린 주최자가 통보를 못 받음(Pass 8). 가장 실질적 버그.
2. **없는 roomId/inviteeId로 예약 생성 가능** — FK 비활성 + 존재 검증 없음(Pass 3, 5).
3. **update 과거 시각 검증 구멍 + 새 참석자 invited 알림 누락**(Pass 1).
4. **분산 환경 미대응** — 리마인더 스케줄러 중복/유실, throttler in-memory(Pass 1, 9). 단 운영 체크리스트로 인지함 → 의도적 미적용으로 선긋기.
5. **scope enforcement 부재** — 정규화 구조만, 가드 미검증(Pass 2).

### 먼저 꺼내지 말 것 (실제로는 처리/인지된 것 — 자폭 금지)
- CSRF → 쿠키 sameSite strict + httpOnly로 방어(Pass 9). JWT → 7일 만료(무기한 아님). 레이트리밋 프록시/IPv6/분산 → 운영 체크리스트 주석. 출력 누출 → toResponseDto whitelist. 불가능 날짜 → 그레고리력 validator. 물으면 답하되 먼저 약점이라 말하지 말 것.

### 리드할 강점 5 (화면 공유로 코드/주석 띄우기)
1. **동시성 설계 서사** — 트랜잭션 경계 + SQLite vs MySQL/PG 비관적 락 + PG EXCLUDE 제약 + 데드락 사전순 락. create UC 헤더 주석이 그대로 답변.
2. **ReservationSlot 1급 도메인 객체** — 대기 승격 단일 패스, 부분 충돌, FIFO.
3. **테스트** — 실 SQLite 통합 + 과제 핵심 케이스 1:1 + 알고리즘 단위 + 격리 진화 경로 문서.
4. **보안 설계** — scrypt PHC 인코딩, API Key SHA-256 상수시간, soft-revoke, 쿠키 플래그.
5. **운영 인식** — helmet/CORS/ValidationPipe/throttler + 운영 배포 전 체크리스트 주석.

### 날카로운 질문 3뎁스 드릴 (8개)

→ 본문은 [[Interview-Prep-TossPlace-1st|실전 정리]]에 단일 소스로 유지(중복 제거). 여기 Pass 11이 그 8개에 더해 실제 코드 재검증으로 잡은 항목.

### 리허설 원칙
- 약점은 의도적(트레이드오프 선긋기) vs 진짜 누락(인정 + 수정안) 구분. 처리된 항목을 약점이라 자폭하지 말 것.
- 막히면 화면 공유의 장점 — 해당 파일/주석을 띄워 같이 추론.

## Pass 11 — 실제 소스 재검증 (D-4, 11th)

> 10패스는 스냅샷/기억 기반이었다. 이번은 실제 소스 16개 파일을 다시 열어 "확인 필요"로 남긴 항목을 검증하고 새로 잡은 것. 결론: 강점은 전부 코드로 사실 확인. 다만 진짜 약점 1종(JWT 하드닝 2개)이 "처리됨"으로 잘못 분류돼 있어 교정한다.

### 코드로 사실 확인된 것 (안심하고 밀어도 됨)

- 🟢 동시성 서사 = create/update/remove UC 헤더 주석 그대로. ReservationSlot 단일 패스(`promotePending`), EXCLUDE 설계, 데드락 사전순 락까지 코드에 존재. 주석이 곧 답변.
- 🟢 쿠키 플래그(httpOnly + secure(prod) + sameSite strict + maxAge 7d, set/clear 동일), signin 7d 만료, throttler 운영 체크리스트(trust proxy/IPv6 /64/Redis storage/429 헤더) 전부 코드와 주석에 확인. → 약점으로 먼저 꺼내지 말 것 유지.
- 🔴 주최자 알림 제외 확정 — `factory.recipients = invitations.invited`만. populate도 room/invitations.invited만, organizer 없음.
- 🔴 없는 roomId/inviteeId 통과 확정 — `em.getReference` + FK 비활성 + 존재 검증 없음.
- 🟡 과거 검증 날짜 단위 확정 — create의 `isInPast()`도 결국 `isPastDate`(날짜만), update는 `dto.date`가 있을 때만 검사. "create는 시각까지 본다"는 오해 금지, 둘 다 날짜 단위이며 update만 date 미전송 시 검사 자체를 건너뜀.
- 🟡 reminder `reminderSentAt = now`를 발송 전(수집 트랜잭션)에 찍음 = at-most-once, 윈도우(`start-10m <= now < start`) 경과 시 영영 유실, (status,date,reminderSentAt) 복합 인덱스 부재 확정.
- 🟡 API Key: 없는 prefix는 해시 비교 전 즉시 return(타이밍 누수, prefix 2^48이라 영향 낮음), `lastUsedAt = now`를 매 인증마다 write 확정. `safeEqualHex`는 timingSafeEqual 상수시간 확정.
- 🟡 search-users: `find({ username: $like prefix% })`에 limit도 min length도 전무 확정. 빈 prefix는 의도적으로 전체 반환(정규화) — 즉 사용자 전체 덤프 가능.
- 🟡 `disableForeignKeys: true` + `createForeignKeyConstraints: false`, `debug: !isTest` 확정(프로덕션 쿼리 포매팅 오버헤드).

### 새로 잡은 것 / 분류 교정

- 🟡 **JWT 쿠키 검증 하드닝 2개 — "처리됨"이 아니라 미처리 (교정 포인트)**: `verifyJwtCookie`가 (a) `jwt.verify(token, JWT_SECRET)`에 `algorithms` 미지정(HS256 핀 없음), (b) 실패 시 `Unauthorized access: ${error.message}`로 jwt expired/invalid signature를 그대로 401 본문에 실음. AllExceptionFilter가 HttpException 본문을 passthrough라 실제로 클라이언트까지 샌다. 실전 정리의 "JWT는 처리됨"은 만료(7d)만 가리킨 것 — 알고리즘 핀과 에러 제네릭화는 안 됐다. 둘 다 2줄 수정(`{ algorithms: ['HS256'] }`, 제네릭 401 + 내부 로깅). 자발적으로 먼저 꺼낼 필요는 없지만 보안 파고들면 정직하게 인정.
- 🔴 **자정 넘는 예약은 충돌 검사를 통째로 회피 (구체 버그 체인)**: duration 상한 없음(@IsPositive만) + `overlapsWith`가 `this.date !== other.date`면 즉시 false + 슬롯이 date 단위 조회. 23:30 + 60분(익일 00:30)은 익일 00:00 예약과 실제로 겹치지만 date 문자열이 달라 미검출되고, 익일 슬롯에서도 안 보인다. 대응: duration 상한 + 같은 날 종료 강제, 또는 멀티데이 예약 별도 모델링.
- 🟡 **참석자 없는 단독 예약은 어떤 알림도 못 받음**: recipients가 비어 confirmed/reminder/changed 전부 수신자 0명. 주최자 제외 버그의 극단 버전 — 주최자가 초대 없이 혼자 잡은 예약은 리마인더조차 안 온다.
- 🟡 **update 새 초대자는 'invited'가 아니라 'changed'를 받음**: 누락이 아니라 타입 오류. 처음 초대된 사람이 첫 알림으로 "일정이 변경되었습니다"를 받는다. 반대로 제거된 초대자는 알림이 없다(스냅샷이 제거 후 목록 기준).
- ⏳ **find-by-date의 $or to-many + limit/offset 정확성 — 미확정**: `$or: [organizer, invitations.invited]` + limit/offset. MikroORM이 to-many 조인에 DISTINCT를 붙이긴 하나, WHERE의 to-many 필터와 limit가 페이지 경계에서 정확한지는 빌드/실행 SQL로 검증 권장. 단언 금지 — 물으면 "정확성을 보장하려면 루트 ID 서브쿼리 분리가 안전" 선에서.
