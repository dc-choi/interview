---
tags: [palantir, foundry, security, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry audit schema, 전달과 증거 해석"]
---

# Foundry audit schema, 전달과 증거 해석

Audit log는 시도한 요청, 실제 결과와 관련 principal을 구분해 읽어야 한다. 모든 행을 사건 하나로 세거나 log category가 없다는 이유만으로 실제 행위가 없었다고 확정하면 감사 결과가 왜곡된다.

## Audit.3와 historical Audit.2

Audit.3는 하나 이상의 category와 그 category의 typed request/result field를 요구한다. Audit.2 category는 optional이고 request/result 구조의 제품 간 보장이 없다. 새로운 분석은 audit.3를 중심으로 구성하되 historical period는 audit.2를 따로 읽는다.

Audit.3는 historical backfill이 없다. 2025-11-24~25 일부 enrollment의 약 3시간 gap과 2025-12-04 이후 분석에 audit.3 migration 권장이 명시되어 있다. Schema transition의 모든 metric을 완전히 연속으로 만들 수 있다고 가정하지 않는다.

`request_params/result_params`에서 `requestFields/resultFields`로 이름만 바꾸는 migration이 아니다. 정보가 request↔result로 옮겨갈 수 있고 event name도 1:1이 아니다. Type별 parser와 category 계약을 대조한다.

## Identity와 결과

| 필드 | 해석 |
|---|---|
| logEntryId | log line 고유 ID. Ingest 중 중복된 같은 ID는 dedup 후보 |
| eventId | 한 auditable event의 여러 line을 묶음. 시작/끝 line이 같은 event일 수 있음 |
| sequenceId | 같은 event의 best-effort order |
| traceId | 여러 backend call을 연결하는 request trace |
| uid/users | downstream caller와 관련 user ID들. On-behalf-of chain도 category로 확인 |
| result | success/error/unauthorized 등 결과. Request 존재와 성공을 구분 |

`origin/origins`는 spoof될 수 있으며 sourceOrigin은 TCP stack에서 얻는 별도 값이다. Non-empty origins는 user-initiated request, empty는 이를 수행하는 service request 구분에 쓰인다. API gateway의 trace와 userAgent/service를 함께 보면 delegation을 추적할 수 있다.

Schema의 ContextualizedUser는 이름/group/realm을 정의하지만 현재 pipeline은 uid만 채우고 groups는 empty다. 현재 directory로 나중에 enrichment한 membership을 사건 당시의 확정된 membership처럼 쓰지 않는다.

## Category의 의미

Data load는 사용자에게 읽힌 데이터, search는 검색 query/결과, export는 platform 밖 전달, promote는 다른 Palantir system으로의 이동이다. Data share 생성과 실제 share 사용, secret load와 secret use, token 생성/접근/취소도 다른 category다.

Ontology metadata/logic/data, application config, monitor, request 승인/실행, infrastructure와 LLM inference/route를 각각 구분한다. 한 event가 여러 category를 가지므로 category별 합계를 전체 event 수로 더하면 중복 집계될 수 있다. LLM inference의 input/output과 감사 자체도 민감한 데이터다.

Request field의 resource와 result field의 resource를 함께 확인한다. 권한 검사 성공 target/실패 target, 요청한 삭제와 실제 반영된 삭제가 같다고 가정하지 않는다. Table의 optional field와 product-specific 구조에 대응하는 parser가 필요하다.

## API 전달과 cursor

Audit.3는 list-log-files/get-log-file-content API로 SIEM에 직접 ingest할 수 있고 대략 15분의 전달 지연을 설명한다. Audit.2는 약 24시간 archive와 export dataset 경로를 사용한다. 수치 설명을 모든 환경의 최대 지연 SLA로 일반화하지 않는다.

List response는 data가 비어도 nextPageToken이 존재한다. 받은 token을 저장해 다음 poll을 이어가며 open-ended ingestion은 endDate를 생략할 수 있다. Durable cursor, retry와 ingest dedup을 별도 설계하고 API 설명만으로 consumer가 exactly-once 저장한다고 보장하지 않는다.

Developer Console audit-read 설정과 `api:audit-read` OAuth scope 외에 해당 조직의 audit dataset 생성 workflow 권한도 필요하다. Client-credentials application이면 generated service user에 Org role을 부여해야 한다. 일반 service user의 log가 Org에 귀속되지 않을 수 있으며 등록 Org 전용 third-party service user는 예외다.

## Export dataset과 보존

Foundry export는 Org별로 구성하며 audit.3 append 한 번에 최대 100GiB/10k file, audit.2는 10GiB를 설명한다. Audit.2 초기 empty append가 backlog 처리일 수 있다. Audit.3 `date`는 Hive partition이라 Spark에서는 date filter를 먼저 활용하고 정확한 time 범위를 함께 제한한다.

Export dataset의 retention 최대 730일은 event time이 아닌 transaction이 추가된 시각 기준이다. 삭제 표시 후 transaction 제거는 최대 7일이 걸릴 수 있다. 역사 자료를 새로 export한 경우 retention이 언제부터 세는지 확인한다. 아래 Audit Explorer의 Iceberg table retention은 별도 기준이므로 이 설명을 그대로 적용하지 않는다.

Audit infrastructure는 append-only로 설계되지만 법적 remediation을 위한 Support redaction 경로가 있다. Log 부재, Org attribution/coverage, 지연과 migration gap을 검토한 뒤 증거의 범위를 판단한다. 실제 SIEM ingest, 탐지와 retention 삭제를 실행하지 않았다.

## Audit Explorer의 조회와 감사 증거

2026-10-30 공식 문서 기준, Audit Explorer는 beta이며 enrollment별 가용성이 다를 수 있다. `audit.3` export가 기록하는 Iceberg table을 사용하고 조회자의 table 읽기 권한과 Marking을 따른다. 앱 접근 허용은 table 접근 권한을 추가하지 않는다. 조회 결과에는 table에 도착한 로그만 포함되므로 최근 구간의 빈 결과만으로 활동 부재를 확정하지 않는다.

검색 감사 이벤트 `AUDIT_EXPLORER.QUERY_SUBMIT`은 `dataSearch` category로 table, 필터, 검색어와 시간 범위를 기록한다. **이 이벤트의 `SUCCESS`는 검색이 기록됐다는 뜻**이며 검색 완료나 결과 존재를 보증하지 않는다. SQL, 결과, 열어 본 로그와 완료 여부도 기록하지 않는다. `dataSearch`만 필터링하면 다른 앱의 검색도 포함되므로 이벤트 이름과 table RID로 범위를 좁힌다.

결과 수, 차트와 session의 Events에는 중복 행이 포함된다. 정확한 집계에는 `logEntryId` 중복 제거가 필요하다. 화면의 시간과 입력은 브라우저 현지 시간이고, raw 값과 **Copy timestamp**는 UTC다. Log frequency 구간도 UTC 경계를 사용하므로 현지 날짜와 구간 경계를 혼동하지 않는다.

조회 기간과 감사 목적을 좁혀 필요한 정보만 확인한다. 열린 검색 탭은 60초마다, 브라우저 창으로 돌아올 때도 최신 로그를 확인하므로 작업 뒤 닫는다. 이 절만 추가 대조했으며 기존 schema, 전달 지연과 보존 조건의 검증일은 유지한다. 실제 조회 비용과 배포 환경은 시험하지 않았다.

### Iceberg export의 준비와 보존 경계

2026-10-30 설정 문서 기준, enrollment에서 Iceberg를 켜고 대상 Project가 Foundry-managed Iceberg storage를 사용해야 한다. 조직의 `audit-export:orchestrate-v3`, 대상 폴더의 리소스 생성 권한, table의 `table:read`와 Marking 충족은 서로 다른 조건이다.

생성 시 시작일은 UTC이며 기본 90일 전이다. 남아 있는 로그만 가져올 수 있다. Iceberg retention은 1~730일(기본 90일)이며 **table의 `date`가 보존 기간보다 오래된 로그를 일일 maintenance에서 삭제**한다. 시작일을 보존 기간보다 이전으로 잡으면 첫 maintenance에서 그 구간이 지워질 수 있다. 기간을 줄여도 다음 maintenance에서 오래된 로그가 영구 삭제된다.

`Pause export`는 현재 build 뒤 새 build를 멈추지만 retention은 계속된다. `Stopped` export는 재개할 수 없어 새 export가 필요하다. 설정 창 접근에는 해당 조직의 관리자 자격이 필요하며, 일시정지/재개, cooldown과 retention 변경 권한은 각각 별도다. 생성 실패 때는 대상 폴더에 table이 이미 생겼는지 먼저 확인한다. `Table created, but setup is incomplete`의 재시도는 새 table을 만들지 않고 cooldown 설정을 마친다.

### 검색의 논리와 누락 해석

2026-10-30 검색 문서 기준, 시간 범위와 서로 다른 필터 카드는 모두 AND로 결합한다. 같은 필드의 대안은 한 카드의 `any of`로 넣고, 목록에 모든 값이 필요한 경우 `includes all of`를 쓴다. 서로 다른 필드의 OR는 지원하지 않으므로 별도 검색 탭으로 나눈다.

**Free text는 저장된 event name만 검색**하며 대소문자를 구분한다. `ACTIONS_SERVICE_APPLY_ACTION_V2`에는 `APPLY_ACTION`이 맞고 `apply action`은 맞지 않는다. 텍스트 `contains`도 대소문자를 구분하며 `%`와 `_`는 와일드카드가 아닌 문자다.

User, Resources 등 별도 제안 방식을 쓰는 필드 외의 값 제안은 선택 기간의 빈도 상위 최대 1,000개이며 다른 필터로 좁혀지지 않는다. 제안에 없다는 사실을 로그 부재로 읽지 않는다. 잘못된 필터가 남으면 검색은 결과를 반환하지 않으므로 빨간 오류를 먼저 해결한다. `Entities` 열이 있어야 Ontology resource 필터를 쓸 수 있고, Functions 필터는 선택한 함수의 모든 버전에 일치한다.

위 두 절은 수집 본문과 공식 페이지의 검색 색인 본문을 대조했다. 공식 URL 직접 열기는 실패했으며 화면, 실제 권한과 삭제 동작은 시험하지 않았다. 기존 schema와 전달 조건 전체를 재검증하지 않아 frontmatter 날짜는 유지한다.

### 결과 건수와 차트의 분모

`All time`에서는 Log frequency가 로그가 있어도 `No log activity in this range`를 표시한다. 시작 시각을 지정해 다시 확인한다. 이 차트가 아직 로드되지 않았거나 실패한 경우와 `All time`의 결과 건수는 **지금까지 로드한 행 수**다. `100+ results`는 전체가 100건이라는 뜻이 아니다.

Event types의 비율은 표시된 상위 10개 event name 안의 비율이며 전체 일치 로그의 비율이 아니다. Log frequency는 빈 구간을 생략하므로 이웃한 막대가 연속된 시간 구간이라고 가정하지 않는다.

기본 Time 내림차순 이외의 정렬은 결과 페이지마다 기간 내 모든 일치 행을 읽는다. 먼저 기간을 좁힌다. `No logs found`, 사용자가 취소한 `Search stopped`, 오류인 `Query failed`는 서로 다른 상태다. 5분을 넘긴 검색은 실패하므로 기간을 줄여 다시 검색한다.

### 표시 요약과 원본 값의 증거 경계

Request와 Result 카드는 각각 `requestFields`, `resultFields`를 읽기 쉽게 보여주며 요약이 일부 세부 값을 생략할 수 있다. **Show raw JSON**으로 기록된 필드를 확인한다. 이름 해석은 조회자 권한을 따르므로 같은 로그도 표시 이름이 다를 수 있다. 잠금 표시만으로 리소스 삭제를 확정하지 않는다.

Categories, Entities, Users, Origins, Environment, Product, Sequence ID와 `productId`, `date`는 상세 패널에 나타나지 않는다. 필요한 열을 Logs table에 추가한다. Action log 카드도 action type이나 action log object를 볼 수 없거나 기록된 값이 없으면 나타나지 않는다. 카드 부재만으로 action 미실행을 확정하지 않는다.

함수 실행의 요청 버전과 실제 해석된 버전이 다르면 두 버전을 함께 확인한다. 감사 검색 자체가 너무 길면 일부 필터나 값이 기록되지 않을 수 있으므로 누락 안내를 확인한다.

2026-10-30 위 결과/상세 절은 수집 본문과 공식 페이지의 검색 색인 본문을 대조했다. 공식 URL 직접 열기는 실패했으며 화면과 실제 조회 동작은 시험하지 않았다. 기존 schema와 전달 조건의 검증일은 유지한다.

### 세션 요약과 실제 활동 범위를 구분한다

Session explorer는 `audit.3`의 같은 `sid`를 가진 로그를 묶는다. **Started/Ended는 필터에 맞는 첫 로그와 마지막 로그의 시각**이며 로그인/로그아웃 시각을 보장하지 않는다. Duration은 두 시각의 차이를 가장 가까운 분으로 반올림한 값이다. 기간 경계나 사용자 필터가 로그 일부를 제외하면 Events는 줄지만 Duration은 줄어들 수도, 그대로일 수도 있다. 예를 들어 같은 세션에 사용자 A의 10:00/10:10 로그와 사용자 B의 10:05 로그가 있으면 A만 선택해도 Duration은 10분이고 Events만 3에서 2로 줄어든다. Events에는 중복 행이 포함될 수 있다.

목록은 최신 1,000개 세션까지 표시한다. `sid`가 없는 로그는 빠지므로 `No sessions found`를 활동 부재로 해석하지 않는다. `sid`는 string형이어야 하며 `time` 열도 필요하다. 한 행은 사용자와 checkpoint interaction을 각각 하나만 보여 주므로 전체 관계는 개별 로그로 확인한다.

**View this session's logs**는 해당 Started/Ended 범위의 검색 탭을 연다. 사용자 필터로 좁혔던 목록과 달리 같은 세션의 다른 사용자 로그가 포함될 수 있어 Events와 건수가 다를 수 있다. 전체 세션을 조사하려면 시간 범위도 넓힌다.

Checkpoint 연결에는 표준 `audit.3`에 없는 `checkpoint_interaction_rid`를 custom transform으로 추가해야 한다. 세션 목록의 checkpoint 필터, 열과 정당화 표시에는 string형이 필요하다. 접근 설정인 scoped session과 감사 로그의 session은 별개다. 정당화 조회 실패도 연결 부재, 앱 미제공과 권한 문제로 나눠 확인한다.

시간/사용자 필터 변경과 Refresh sessions는 검색 감사에 남지만, checkpoint만 보는 필터의 변경은 남지 않는다. 검색 기록에는 session explorer에서 실행했다는 구분도 없다.

2026-10-30 이 절은 수집 본문과 공식 페이지의 검색 색인 본문을 대조했다. 직접 URL 열기와 실제 UI 검증은 하지 못했으며 기존 범위의 frontmatter 검증일은 유지한다.

## 출처

- [Palantir Security, Explore user sessions](https://www.palantir.com/docs/foundry/security/audit-explorer-sessions) — 2026-10-30 세션 집계 범위, 상세 검색 전환과 checkpoint 연결 조건 대조.

- [Palantir Security, Review audit log results](https://www.palantir.com/docs/foundry/security/audit-explorer-review-results) — 2026-10-30 로드된 건수, 차트 분모, 정렬 비용과 검색 상태 대조.
- [Palantir Security, View audit log details](https://www.palantir.com/docs/foundry/security/audit-explorer-log-details) — 2026-10-30 요약/원본 값, 권한별 이름 해석, 패널 누락과 이벤트 요약 조건 대조.

- [Palantir Security, Set up Audit Explorer](https://www.palantir.com/docs/foundry/security/audit-explorer-set-up) — 2026-10-30 생성 권한, Iceberg 보존 기준, export 상태와 실패 복구 대조.
- [Palantir Security, Search and filter audit logs](https://www.palantir.com/docs/foundry/security/audit-explorer-search) — 2026-10-30 필터 결합, 검색 대상, 제안 범위와 오류 조건 대조.
- [Palantir Security, Audit Explorer](https://www.palantir.com/docs/foundry/security/audit-explorer-overview) — 2026-10-30 table 접근, 검색 감사 의미, 중복 집계와 시간대 대조.
- [Palantir Security, audit-log-categories](https://www.palantir.com/docs/foundry/security/audit-log-categories)
- [Palantir Security, audit-logs-overview](https://www.palantir.com/docs/foundry/security/audit-logs-overview)
- [Palantir Security, monitor-audit-logs](https://www.palantir.com/docs/foundry/security/monitor-audit-logs)

## 관련 문서

- [[Palantir-Security-Governance]]
- [[Palantir-Security-Control-Propagation|Foundry 접근 제어의 전파와 읽기 경계]]
- [[Palantir-Security-Projects-Roles-and-Collaboration|Foundry Project, role과 조직 경계]]
- [[Palantir-Security-Privacy-Downloads-and-Justification|Foundry 데이터 최소화, 다운로드와 정당화]]
- [[Palantir-Security-Identity-Resilience-and-Shared-Responsibility|Foundry identity, 복구와 공동 책임]]
- [[Palantir-Security-Code-Scanning-Contracts|Foundry code scanning의 규칙과 검증 범위]]
