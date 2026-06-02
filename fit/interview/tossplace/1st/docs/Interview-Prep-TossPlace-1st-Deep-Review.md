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
> **진행**: Pass 1~10 완료(전 영역). 루프 종료. 아래 Pass 10이 실전용 종합.

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

### 날카로운 질문 3뎁스 드릴 (이 8개만 입에 붙이면 됨)

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

### 리허설 원칙
- 약점은 의도적(트레이드오프 선긋기) vs 진짜 누락(인정 + 수정안) 구분. 처리된 항목을 약점이라 자폭하지 말 것.
- 막히면 화면 공유의 장점 — 해당 파일/주석을 띄워 같이 추론.
