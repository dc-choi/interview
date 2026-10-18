---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 monitoring scope와 log 접근의 계약

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## 모니터의 범위는 움직인다

2월 Project scope는 object type/M2M link/Action/Function을 자동 포함/제거하며 Ontology의 Project permission migration이 필요했다. 3월 Workshop/third-party app와 Workflow Lineage dynamic scope도 추가된 Function/Action을 포함하고 **그 범위에서 제거하면 monitoring도 중단**한다.

Workflow monitoring color는 사용자가 접근할 수 있는 alert의 최대 severity다. 다른 권한으로만 보이는 alert가 있을 수 있고 missing monitoring 표시와 실제 healthy는 다르다. last-index status/date와 last-reindexed color는 OSv2 신선도를 드러내되 source event time을 나타내지는 않는다.

3월 fired Function/Action alert debug는 최근 30일 history, firing value/threshold와 severity 조건을 보였다. 4월 monitor alert snooze는 재발화해도 유지돼 만료/manual unsnooze 전 알림이 재개되지 않는다. rule-level snooze는 target별 snooze를 대체하고 scope 전체에 적용한다.

## 실행 로그의 접근 단위

2월 Log search는 **source executor(호출 chain 첫 executable)**에서 시작한 여러 실행의 7일 service log를 모았다. case-sensitive 검색과 * wildcard, JSON detail을 제공했다. resource edit permission이 필요하고 Project log access가 켜져야 전체 실행을 찾으며, 아니면 **자신의 최근 24시간 실행**만 검색한다.

6월 log access overview는 현재/필요 role, Project enablement/resource override, 누락 marking와 적용 기간을 설명하고 ISO가 override를 편집했다. 4~6월 metric chart와 run history의 동일 time range, trace link와 alert-context prefilter는 탐색 편의다. failure alert는 level/time/resource를, P95는 resource를 미리 선택한다.

5월 streaming log export는 user ID를 기본 redaction하고 선택 시 포함했다. export dataset의 새 권한을 설정해야 하며 UI user display 단순화와 export PII는 다른 문제다.

## 비용과 사용량의 해석

Resource queue history는 2월 18일 공지에서 최근 7일 조회를 제공했고, 4월 8일 공지에서 metrics 보존 기간이 30일로 확대됐다. 6월 top resource ranking은 30일 같은 더 넓은 기간이고 표시 사용량은 현재 선택 기간일 수 있다. 5월 object usage attribution은 약 9개월간 일부 Ontology에 귀속되던 값을 datasource Project로 복구해 view의 비용 분포가 바뀔 수 있다고 알렸다. 이 변화만으로 workload 자체가 늘었다고 판단하지 않는다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [February 17, 2026, Monitoring views now support project scopes for ontology resources — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#41190426-1e8e-4ac9-b906-fe6f7d559f5b)
- [May 28, 2026, AIP token usage data now available as an internal dataset export — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#ad5d2fef-a7ff-4265-8262-318e6a3fa970)
- [June 1, 2026, Clarified tooltip for top resources table in Analysis tab — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#ffa8f562b03ab11ad82f0d1d42148c2829340001127a5fafa0a94145276353ab)
- [June 1, 2026, Search logs in Workflow Lineage when debugging alerts — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#d838d8317b27dd5c6e95c25e425f7195ff92ed430a815d8ad8eba80de8c35f27)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
