---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Ontology schema, 식별자와 권한 모델의 변화

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## Schema와 식별자의 호환 경계

- 2월 struct GA는 여러 원천 field라도 Ontology에 정의하기 전에 하나의 struct dataset column으로 합치도록 설명했다. 1월 DATE/TIMESTAMP struct field가 Date 객체로 변환되도록 수정됐고 Workshop struct array도 추가됐다.
- 2월 Pipeline Builder array foreign key는 many 쪽 배열이 one 쪽 primary key 여러 개를 가리키게 했다. UI의 one-to-many 이름만으로 단일 연결을 가정하지 않는다.
- 3월 OSv2는 incremental View와 Projection dataset indexing을 추가했다. projection compaction은 incremental 파일 처리 성능을 위한 수단이다.
- 4월 OSv2 Decimal은 38자리 precision을 소개했다. media reference icon, geometry preview 후 저장, interface constraint와 공유 property 구성 등 schema 편집 기능도 확대됐다.
- **5월 OSv2 RID v4는 object type locator를 포함**했다. 기존 RID와 새 RID는 함께 지원되고 기존 object RID는 유지됐다. RID 문자열 구조를 파싱해 domain 식별자로 쓰지 않는다.
- 6월 16일 OSv1→OSv2 migration에서 edit history 보존이 opt-in으로 추가됐다. 저장소 migration이 과거 edit history를 자동 보존한다는 뜻은 아니다.
- 8월 table-backed object와 virtual update detection, 11월 invalid stream record log와 deployability 오류 분류, 12월 near-real-time Function 지표와 7일 run history가 확대됐다.

## 관리 단위와 접근 권한

- 1월 object type group role은 group의 이름/설명/icon 변경 권한이며 object 추가나 내부 object type 권한을 제어하지 않는다고 명확히 했다.
- 3월 point of contact는 datasource Project별 개인/그룹을 지정하고 proposal/intervention reviewer로 추천한다. 여러 datasource Project가 있으면 여러 담당자를 둘 수 있다. 추천 reviewer가 실제 승인 권한을 자동 얻는 것은 아니다.
- 4월 Mandatory Control Properties GA는 같은 datasource의 marking/classification/Organization 속성으로 보안 값을 구성했다. classification 활성화, 허용 marking/max class, export 및 form picker의 범위를 별도 확인한다. 분리된 datasource의 secondary property 보안은 다른 축이다.
- 12월 Project-based Ontology permissions 베타는 owner가 opt-in하며 기존 권한을 자동 migration하지 않는다. specific object 접근에는 type와 datasource Project Viewer가, migration에는 Owner와 Project Editor 등이 필요했다. default Ontology와 CBAC는 당시 제외됐다.
- 10월 Project 정책의 Ontology branch protection은 이 permission 모델로 migration한 범위에만 적용되는 제약이 있었다.

## 사용성 수정의 해석

API name의 괄호 처리, 많은 column의 type 생성, interface icon/selector/count, FK 자동 매칭과 join wizard, geometry style와 object view 편집 개선은 설계 오류를 찾기 쉽게 했다. 편집기 오류가 수정됐다는 공지와 기존 데이터/schema가 자동 정합해진다는 주장은 구분한다. display name과 API name, RID를 각기 다른 식별 계층으로 유지한다.

## 출처

- [June 16, 2025, Preserve edit history when migrating object types to Object Storage V2 — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#7b73b6f9-27f7-4e6b-a750-c77a9137ed5c)

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [April 29, 2025, Introducing mandatory control properties for securing data in objects [GA] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#d9c55dab-91db-4e36-b4f0-becc9d096afa)
- [March 4, 2025, Add a point of contact for your object types — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#c1b3fcb9-c2ec-4322-9ec7-45813947f421)
- [December 2, 2025, Manage ontology resource permissions through projects in the Compass filesystem — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#7d36c13a-fa1c-4315-b783-02c6c47c7b5d)
- [July 31, 2025, New configuration options for deployed Python functions and consolidated settings — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#c5f48aa083b796e1fc624b89c796a24606b566f4776fbe02cab3c9a3f90dc61e)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
