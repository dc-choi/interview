---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Space, Retention과 플랫폼 설정의 관리 경계

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## Space와 Project 설정

- 2월 enrollment administrator의 self-service Space 생성은 sandbox/production 또는 여러 Org의 공유 경계를 설정하게 했다. 대부분 Org에는 하나의 Space로 충분하다는 당시 가이드와 별도 분리 필요를 비교한다.
- Space 접근은 지정 Org 중 하나의 요구를 만족하는 OR 조건이었다. 삭제는 지정 Org가 모두 삭제된 뒤의 last-out 의미다.
- file system은 생성 후 바꿀 수 없고 usage account는 Project별 override가 가능했다. resource queue와 allowed role set은 Space의 별도 설정이다. custom role set을 쓰면 Space role을 Project에 그대로 상속하지 않는 조건이 있었다.
- 생성 불가 사유에는 enrollment 적합성과 quota가 포함됐다. 2월 Linter configuration/Project templates는 별도 settings로 이동하고 Spaces 탭은 Space management가 됐다.
- 3월 data integration application 접근은 Build schedules/Builds/Code templates/Repositories/Lineage/Preview/Pipeline Builder/Restricted Views별로 나뉘고 기존 설정을 자동 migration했다.

## 설정 변경의 수명과 복원

- 2월 custom retention policy delete는 상세 화면으로 옮겨졌고 disable/enable은 policy 삭제/재생성 없이 일시 중지하는 경로가 됐다. 3월 여러 branch의 transaction을 한 policy 대상으로 정할 수 있었다.
- 3월 self-service domain/certificate 베타는 2025년 2월 이전에 지원팀이 설정한 custom domain에는 적용되지 않아 변경/갱신을 Support에 요청해야 했다.
- 1월 CSP workflow와 3월 raw config import/export는 embedding 등 use case별 보안 header 설정을 돕는다. 1월 Workshop allowed URI/scheme와 같은 정책은 아니다.
- 4월 stable/beta/prior platform UI 선택은 backend/data rollback이 아니다. 변경 저장과 rollout 중 버전 전환의 범위를 따로 확인한다.
- 6월 Organization rename은 enrollment administrator가 수행하며 RID는 유지된다. display name 기반 외부 참조는 rename 영향을 받는다.
- 10월 outdated browser warning은 주기적으로 다시 보일 수 있는 dismissible 안내였다. 지원 browser 정책과 경고 표시를 구분한다.

## Upgrade Assistant와 Audit

3월 maintenance operator Admin view는 resource별 assignment/status와 Org별 조회를 확대했다. 7월 intervention은 Admin Action/Model Migration/Platform Change/Remediation/Security/Version Update 등 유형으로 구분됐다. 9월 PR/mergeability와 Python 3.9 campaign, 10월/12월 audit v3 migration 및 GA는 각각 다른 관리 작업이다. Audit migration 개선 공지는 event schema 변경을 자동 의미하지 않는다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [April 17, 2025, Allow users to switch platform version from the Account menu [Beta] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#23c22381-b22e-4e3b-9ac1-70bbdcc601bf)
- [August 28, 2025, Configure Palantir for consumer mode and build external-facing applications — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#567c384f-fe39-4a7b-8384-ea9583db4b5b)
- [February 18, 2025, Streamlined space settings management in Control Panel — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#75b770c2-2075-4276-86a8-de1065e97d6e)
- [November 18, 2025, Track and analyze Foundry logs in real time with streaming datasets — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#a7a9c294d66ab2283d44e2c82622eedf2d6ebb3109fe9f946013c7bd5dc34dd5)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
