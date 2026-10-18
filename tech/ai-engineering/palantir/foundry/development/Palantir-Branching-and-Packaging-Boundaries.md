---
tags: [palantir, branching, marketplace, deployment]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry branch와 package의 격리 경계"]
---

# Branch와 package의 격리 경계

여러 앱을 한 branch에서 수정해도 모든 embed와 외부 시스템이 격리되는 것은 아니다. Source 변경, data build, Action edit와 package 설치는 별도의 반영 단위다. 아래 beta 지원 목록은 2025년 도입 당시 조건이며 현재 지원은 전용 integration 문서와 대조한다.

## Global branch는 지원 integration을 따른다

2025년 4월 Branching beta는 Pipeline Builder, Ontology, Workshop과 transforms repository를 한 proposal로 연결했다. Main과 분리해 Action을 실행하지만 Main 기존 edit 가져오기, branch Restricted View build와 TypeScript function repository 지원에는 제한/roadmap이 있었다.

Workshop의 Quiver embed 등 다른 Ontology consumer는 Main 데이터를 읽고 branch에서 편집할 수 없었다. Taskbar만 보고 전 화면의 격리를 판단하지 않는다. External webhook은 별도 실행 안전 계약이다.

Merge의 **all affected resource build**와 **modified resource only**를 나눈다. 후자는 수정하지 않은 dependent resource를 수동 build해야 할 수 있다. Proposal merge, build 완료와 조회 반영은 다른 시점이다.

2025년 7월 resource main protection은 Workshop부터 시작했고 approval policy는 project별 eligible reviewer, 필요한 수와 contributor 자기승인 허용을 정했다. Contributor는 branch 전체가 아닌 해당 resource를 수정한 사용자 기준이었다. Builder 자체 branch protection과 모든 resource에 동일하게 적용되는 기능으로 혼동하지 않는다.

## Application package와 bootstrap template

2025년 9월 TypeScript v1 function branch 지원은 branch에서만 소비할 prerelease를 publish하고 Action/Workshop에 연결하는 방식이었다. Merge하면 Main의 stable version으로 소비 참조가 전환됐다. 다른 code repository가 branched prerelease를 dependency로 쓰는 경로는 당시 지원하지 않았다. 초기 beta의 TS 미지원 상태와 이후 지원 범위를 구분한다.

2025년 4월 Developer Console/Marketplace integration은 resource/scope, OAuth client/grant/redirect와 website asset/CSP를 담고 install 때 client ID/Foundry URL을 교체했다. 신규 in-platform app, CLI `@osdk/create-app` 2.1.3 이후 bootstrap과 기존 앱 config 이전을 구분했다.

Website가 있으면 hosting domain을 지정/승인해야 한다. 설치 성공과 사용자 접근은 별도다. API name이 target의 기존 resource와 충돌해 바뀌면 shipped website가 참조에 실패할 수 있었다. 당시 automatic API-name mapping은 roadmap이므로 환경값 치환과 Ontology 식별자 치환을 같은 보장으로 읽지 않는다.

이전 OSDK bootstrap template은 code placeholder와 shared Ontology input을 사용했다. 전체 app deploy와 새 개발 저장소 생성의 목적을 구분한다. Product sidebar는 input/contained resource, overlap과 dependency의 단서이며 모든 동적 코드 참조를 보증하지 않는다.

## Frontend version은 상태 rollback이 아니다

Ontology rebase는 Main의 최신 변경을 작업 branch로 가져오고 양쪽 변경을 보며 conflict 선택 또는 직접 resource 편집으로 해결한다. 2025년 11월 개선은 proposal 생성 전에도 rebase할 수 있었지만 복잡한 schema migration/datasource replacement는 제외했다. Conflict 화면의 해소가 모든 데이터 migration의 성공을 뜻하지 않는다.

Widget set은 Workshop module의 dependency로 Marketplace에 자동 포함하거나 독립 packaging할 수 있다. 원본에서 Ontology API access를 켰어도 설치한 widget set은 기본 disabled여서 target에서 별도로 허용해야 한다. Monitoring view도 모든 check와 target input을 담되 설치 후 target scope와 subscription을 조정할 수 있었다. Locked install이 모든 운영 설정을 고정하는 것은 아니다.

2025년 10월 Ontology resource protection은 project permission으로 이전한 resource에 적용되는 조건이었다. File system에서 개별/bulk로 보호하고 project policy의 eligible reviewer/필요 승인 수를 따른다. Ontology metadata가 있다는 것만으로 모든 resource가 새 protection 계약을 따르는 것은 아니다.

Stable/Beta/Prior UI 선택은 frontend를 바꾸지만 저장한 변경은 유지된다. Prior UI가 새 설정을 표시하지 못해도 backend가 돌아간 것은 아니다. Frontend PR preview도 backend data branch를 자동 격리하지 않는다.

2026년 1월 Object View branch는 tab/visibility 구조와 embedded Workshop 내용을 나눠 versioning하고 Workshop/Ontology Manager에서 함께 시험했다. 당시 모든 object-view 변경은 auto-approved이며 legacy tab branch 편집은 미지원이었다. Workshop/Ontology 보호 정책을 object view에 이미 적용했다고 추정하지 않는다.

DevOps folder tracking은 release마다 지정 folder/project의 자원을 포함하고 설정으로 관련 health check/function을 추적한다. Ignore subfolder와 manual output을 함께 쓸 수 있다. 기존 product 이전 preview에서 새로 추적할 자원과 manual로 남을 자원을 확인한다. Folder 경로에 추가된 실험 자원이 의도치 않게 release되는지 검토하며 disable로 manual 관리로 돌아갈 수 있다.

Branch security는 role과 organization을 함께 검사한다. 2026년 3월 owner는 metadata/role/merge를 관리하고 다른 user/group에 owner를 줄 수 있으며 space administrator도 같은 관리 권한을 가졌다. Branch organization 중 하나에 속해야 branch를 볼 수 있어도 개별 resource permission은 그대로다. Branch 공유를 내부 데이터 전체 공유로 해석하지 않는다.

2026년 5월 Global Branching GA는 별도 merge role 요구를 없애 proposal을 볼 수 있는 사용자가 checks/approvals 후 merge하도록 바꿨다. Owner의 Do not merge로 막을 수 있다. 3월 branch owner의 merge 설명을 현재 독점 권한으로 유지하지 않는다. Restricted View/Automate는 당시 beta이며 approval/remove-from-branch 등 일부 GA 기능이 없었다. TSv2/Python/Developer Console 확대도 당시 계획이었다.

Data Lineage saved graph는 branch context를 보존하지만 그 graph 자체는 branch resource가 아니어서 Main으로 merge할 수 없다. Workflow Lineage의 bulk function/criteria/delete는 branch 자원을 바꾸고 graph 배치는 별도다. 지원하지 않는 node는 해당 앱으로 넘어가며 화면의 branch tag만으로 모든 자원의 편집 격리를 보장하지 않는다.

2026년 6월 branch lifecycle은 Active/Inactive/Merged/Archived를 나눴고 inactive는 자동, archive는 수동이다. Inactive/archived는 Ontology de-index와 기간 후 branch-only data 삭제, build 즉시 실패를 적용하고 metadata/logic은 보존한다. 당시 기본 inactivity 35일/data deletion 7일은 Control Panel에서 바꿀 수 있다. Release 이후 archive한 branch만 restore 지원한 조건도 있으므로 복원 가능성과 data 재build를 구분한다.

DevOps draft group의 다중 product publish는 dependency 순서로 package/release하고 product 간 input/output 이동을 제공한다. 2026년 6월의 자동 순서 보장이 target installation 전체의 atomic upgrade를 뜻하지 않는다. Broken linked-product warning과 설치별 mapping/version을 확인한다.

2026년 7월 Automate는 modify/remove/merge/rebase/protection/project approval을 갖추도록 확장됐다. Restricted View도 owner가 branch policy/marking을 바꾸고 build/rebase/protect할 수 있지만 backing dataset이 branch를 지원하지 않으면 build할 수 없다. Main과 branch backing dataset의 marking 차이가 이전에 제한한 데이터를 노출할 수 있어 branch 공유 전 확인한다.

Insight의 branch-scoped session은 해당 데이터와 Action을 사용하지만 workbook 자체는 branchable resource가 아니다. 당시 save/layout/published set/list/Excel export/비지원 앱 열기는 막고 autosave는 작업 중 상태를 유지했다. Session의 branch scoping과 workbook을 Main에 merge하는 기능을 구분한다.

Marketplace의 7월 bulk install/upgrade는 같은 job의 linked product output으로 downstream input을 자동 충족한다. 새 linked product를 설치할지 external reference로 둘지 정하고 같은 타입 input의 bulk mapping을 검토한다. 일괄 job 생성이 잘못된 의미의 source mapping까지 검증하는 것은 아니다.

DevOps product group은 여러 store의 product/기설치 dependency를 구성해 missing input/duplicate output/cycle/version incompatibility를 배포 전에 검증한다. 2026년 9월 immutable snapshot은 exact member version과 validation result를 보존했다. Latest/channel tracking의 변동 상태와 특정 snapshot의 검증 범위, 실제 runtime compatibility를 분리한다.

Proposal Changes tab은 2026년 9월 Workshop/Builder/Logic을 제외한 지원 자원의 diff/check/approval을 한 화면에 모았다. Workshop visual rebase는 non-conflicting Main 변경을 자동 받아들이고 field 충돌을 선택/조합한다. Reject all은 Main 변경 전체를 버리고 merge 때 branch configuration으로 덮는 선택이다. Layout shift/module-level 확대는 당시 후속 계획이므로 시각 diff만으로 모든 변경을 확인했다고 단정하지 않는다.

2026년 10월 Developer Console branch는 동일 Ontology의 source/app/Ontology를 같은 global branch에 두고 TypeScript npm SDK를 생성/preview하는 경로로 확대됐다. Schema/resource가 안 바뀌면 기존 호환 SDK로 branch data를 읽을 수 있지만 바뀌면 새 SDK가 필요하다. Index 완료와 app publish check 후 PR preview로 공유한다. **OAuth restriction은 모든 branch와 Main이 공유**하며 branch의 release tag/production website publish는 막는다. Preview의 격리를 OAuth 설정에까지 확대하지 않는다.

같은 달 TSv2/Python function branch는 local Ontology SDK migration을 전제로 branched prerelease를 publish해 Workshop/Logic/Action에서 시험한다. 5월의 미지원 목록은 도입 당시 범위다. Repository branch, SDK schema와 function release의 branch를 함께 맞춘다.

## 출처

- [Palantir, April 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-04)
- [Palantir, February 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-02)
- [Palantir, January 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-01)
- [Palantir, July 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-07)
- [Palantir, September 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-09)
- [Palantir, October 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-10)
- [Palantir, November 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-11)
- [Palantir, January 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-01)
- [Palantir, March 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-03)
- [Palantir, May 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-05)
- [Palantir, June 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-06)
- [Palantir, July 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-07)
- [Palantir, September 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-09)
- [Palantir, October 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-10)

## 관련 문서

- [[Palantir-Pipeline-Execution-and-Review|실행과 검토]]
- [[Palantir-Action-External-Effects|Branch 외부 효과]]
- [[Palantir-SDK-and-Agent-Tools|SDK와 자원 계약]]
