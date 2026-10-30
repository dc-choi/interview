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

Export retention 최대 730일은 event time이 아닌 transaction이 추가된 시각 기준이다. 삭제 표시 후 transaction 제거는 최대 7일이 걸릴 수 있다. 역사 자료를 새로 export한 경우 retention이 언제부터 세는지 확인한다.

Audit infrastructure는 append-only로 설계되지만 법적 remediation을 위한 Support redaction 경로가 있다. Log 부재, Org attribution/coverage, 지연과 migration gap을 검토한 뒤 증거의 범위를 판단한다. 실제 SIEM ingest, 탐지와 retention 삭제를 실행하지 않았다.

## Audit Explorer의 조회와 감사 증거

2026-10-30 공식 문서 기준, Audit Explorer는 beta이며 enrollment별 가용성이 다를 수 있다. `audit.3` export가 기록하는 Iceberg table을 사용하고 조회자의 table 읽기 권한과 Marking을 따른다. 앱 접근 허용은 table 접근 권한을 추가하지 않는다. 조회 결과에는 table에 도착한 로그만 포함되므로 최근 구간의 빈 결과만으로 활동 부재를 확정하지 않는다.

검색 감사 이벤트 `AUDIT_EXPLORER.QUERY_SUBMIT`은 `dataSearch` category로 table, 필터, 검색어와 시간 범위를 기록한다. **이 이벤트의 `SUCCESS`는 검색이 기록됐다는 뜻**이며 검색 완료나 결과 존재를 보증하지 않는다. SQL, 결과, 열어 본 로그와 완료 여부도 기록하지 않는다. `dataSearch`만 필터링하면 다른 앱의 검색도 포함되므로 이벤트 이름과 table RID로 범위를 좁힌다.

결과 수, 차트와 session의 Events에는 중복 행이 포함된다. 정확한 집계에는 `logEntryId` 중복 제거가 필요하다. 화면의 시간과 입력은 브라우저 현지 시간이고, raw 값과 **Copy timestamp**는 UTC다. Log frequency 구간도 UTC 경계를 사용하므로 현지 날짜와 구간 경계를 혼동하지 않는다.

조회 기간과 감사 목적을 좁혀 필요한 정보만 확인한다. 열린 검색 탭은 60초마다, 브라우저 창으로 돌아올 때도 최신 로그를 확인하므로 작업 뒤 닫는다. 이 절만 추가 대조했으며 기존 schema, 전달 지연과 보존 조건의 검증일은 유지한다. 실제 조회 비용과 배포 환경은 시험하지 않았다.

## 출처

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
