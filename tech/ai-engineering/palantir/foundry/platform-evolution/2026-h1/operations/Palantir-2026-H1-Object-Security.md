---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 Object 보안과 Project 권한 전환

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## Policy의 설정과 시험

4월 object/property security policy GA는 batch/stream object type에서 row/column, 결합하면 cell 접근을 구성했다. granular policy와 mandatory control을 사용하고 datasource marking/Org/classification은 기본 상속하되 추가/제거를 구성할 수 있다. property policy는 object policy를 만든 뒤 **primary key를 제외한 property**에 둔다.

Ontology 밖에서 쓰지 않는 Restricted View는 migration 후보지만 모든 RV를 즉시 제거하는 지침은 아니다. 별도 policy가 있어도 object/type/datasource와 Project 권한의 적용 범위를 확인한다.

6월 Test policies는 사용자/객체의 property visibility를 시험하지만 derived property는 source object visibility가 필요해 시험하지 못한다. tester가 policy의 Org member/admin이 아니면 guest/secondary membership을 반영하지 못하고 warning으로 해당 Org를 표시한다. 테스트 통과가 모든 사용자의 실제 가시성을 증명하지 않는다.

## CBAC와 Project

5월 CBAC Ontology-in-Projects는 owner 활성화 후 location으로 view/edit/manage를 제어했다. 신규 Ontology는 기본, 기존은 migration 대상이다. **object instance는 type와 datasource permission을 계속 요구**하고 migration으로 datasource 접근자가 바뀌지 않는다. file classification은 Project maximum 이하로 지정해야 하며 누락하면 object materialization이 실패한다.

Space inherited role grant는 모든 Project의 필수 역할을 유지하고 regular/locked Marketplace Project의 role set을 따로 설정한다. marking 요건을 우회하지 않는다. 2월 promoted file은 기본 Editor, Space별 제한 시 Editor와 Resource Curator를 모두 요구했다. promotion은 발견성 상태이며 정확성 인증이 아니다.

- interface single-cardinality constraint는 4월 여러 implementing link를 허용하지만 실제 여러 linked object가 나오면 consumer 오류가 날 수 있다고 경고했다.
- classification link inheritance 수정, marking 긴 이름 표시와 Create 대 Edit/Delete permission card는 각각 설정/설명 개선이다.
- 6월 Code Scanning Project override는 repo별 관리에서 Project 포함/제외로 확대됐다. scanner 설정과 배포 차단 정책을 별도로 확인한다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [May 21, 2026, CBAC enrollments can now store ontology resources in Compass projects — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#2d3f3238-25dc-4ab3-a724-f58a20b5c857)
- [February 26, 2026, New files landing page and the ability to promote files — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#70512eb6-65bd-4170-8035-d307e78c32d8)
- [May 21, 2026, Apply inherited role grants to all projects in a space — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#3402d24c-6795-49fc-aae9-b815eae87bce)
- [April 23, 2026, Object and property security policies are now generally available  — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#8a6bf324-be57-4270-9cc8-9c0c47ac0ef4)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
