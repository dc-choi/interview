---
tags: [palantir, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Branch와 제품 배포 호환성

아래는 2026년 하반기 릴리스 당시 변경을 합성한 기록이다. 실제 enrollment 적용과 현재 지원 범위는 해당 기능 문서로 확인한다.

## Functions와 SDK의 branch 지원

2026-10-13 TypeScript v2/Python functions의 Global Branching이 GA로 발표됐다. Local Ontology SDK로 repository를 이전하면 branch의 Ontology entity를 import하고 live preview, branch-isolated pre-release를 사용해 Workshop/Logic/Action에서 시험할 수 있다. 이전 overview의 비지원 설명을 영구 제약으로 사용하지 않는다.

10월15일 Developer Console은 app, source code와 Ontology를 같은 global branch에서 개발/리뷰하도록 확장됐다. 당시 지원은 npm으로 설치하는 TypeScript SDK에 한정됐다. 정의나 SDK 포함 자원이 달라지면 새 branch SDK를 생성하고, 단순 branch data 읽기에는 호환 SDK를 재사용할 수 있다.

OAuth restrictions는 branch 전체에서 공유돼 main에도 영향을 준다. Branch에서는 release tag와 production website publish가 불가하며 publish check 후 PR preview로 공유한다. Branch object indexing을 기다린 뒤 실제 branch data로 검증한다.

## 탐색과 검토 상태

Workflow Lineage URL은 선택 branch를 포함해 공유하며 merge된 branch의 지원 resource는 main에서 연다. Merge error의 view/copy 동작이 section 접힘을 바꾸던 문제도 수정됐다. 오류를 열었다는 사실과 merge 자체 성공은 별개다.

## Marketplace와 installation job

Installation job의 모든 product는 같은 build setting을 사용해야 한다. 10월에는 draft Settings에서 공통 값을 골라 packaged setting 충돌을 해결하거나 기존 값을 override할 수 있게 됐다. Product가 동의하는 default도 job 수준에서 바꿀 수 있으므로 draft 검토에 포함한다.

Packaged interface의 schema migration banner는 편집 권한자에게만 보이고 migration 활성화 후 사라진다. 단일 product이면 해당 product link도 제공한다. DevOps의 새 draft 이름은 생성 전 지정할 수 있다. 이 편의 기능은 schema 호환성과 release 승인 검증을 대신하지 않는다.

## 9월 review, fork와 고정된 구성

9월 Global Branching의 Changes tab은 여러 resource의 diff/check/approval을 모으지만 당시 Workshop/Pipeline Builder/Logic의 change viewer는 제외됐다. Workshop은 별도 visual rebase에서 충돌 없는 main 변경을 기본 수용하고 같은 field/variable/layout의 충돌만 사람이 해결한다. Main/branch preview와 Current session 결합을 구분하고 Reject all changes from main은 전체 incoming 변경을 버리는 선택임을 확인한다.

Branch-local SDK가 없는 상태에서 main fallback을 최신으로 오인해 generate prompt를 숨기던 문제가 Developer Console/Workspace에서 수정됐다. Local code의 미저장 상태, commit/sync 상태와 branch SDK schema는 별도 증거다. Code viewer는 committed code만 보며 exact commit/line permalink로 안정적인 근거를 공유한다. VS Code 배경 시작은 VS Code workspace에 한하고 다른 IDE에는 같은 자동 시작을 전제하지 않는다.

VS Code functions lifecycle, upgrade 상태 목록과 최근 branch PR 배너는 개발 흐름을 지원한다. Public Applications와 Public React template은 9월 기본 가용성으로 확장됐지만 SDK 호환 조건과 실제 공개 권한을 확인한다. OSDK React components beta는 table/filter/action/media UI와 data cache/state를 제공하나 API가 바뀔 수 있다.

Shared installation draft fork는 그 시점의 version/input/attached output/Ontology override snapshot을 복사한다. 복사자 권한으로 validation을 다시 계산하고 auto-submit은 상속하지 않는다. 모든 installation Edit 권한이 필요하며 두 draft가 같은 installation을 겨냥하므로 한쪽 제출 뒤 다른 쪽은 refresh해야 한다.

Keep current API names on updates는 기존 API name 보존을 기본으로 하며 해제하면 packaged source와 prefix에서 재생성한다. 삭제 시 project/output 보존, input override 정리, table schedule 표시, parameterized schedule/Iceberg packaging 지원도 추가됐다. Remote product는 Marketplace, local product는 DevOps에서 연다.

Product group은 여러 store 제품과 기존 설치의 dependency를 모델링하고 missing input/duplicate output/cycle/version mismatch를 deployment 전에 검사한다. Immutable snapshot은 정확한 member version과 validation 결과를 보존하되 이후 runtime 정상 동작까지 보장하지 않는다.

## 8월 소유권과 통합 배포

SuperRepo beta는 Ontology-as-code,functions와 React를 하나의 versioned monorepo로 묶고 local embedded Ontology/SDK 재생성을 통해 preview한다. Seed는 local server 시작 때 새 DB에 적용하므로 production 상태와 구분한다. 기존 UI 제작 entity도 import할 수 있어 별도 Ontology를 강제하지 않는다.

CLI의 deployment input mapping과 env.yml을 platform tag/CI 또는 외부 CI가 공유하고 signed Marketplace bundle로 배포한다. 발표 당시 Python functions,Agent engine/SDK,external sources,Automate와 data pipelines는 아직 예정이었으므로 monorepo의 모든 도구 지원을 가정하지 않는다.

Marketplace detach는 후속 edit/upgrade에 새 RID 자원을 만들게 한다. 대규모 installation 목록의 filter/dependency graph와 다중 upgrade job은 관리 편의이며 설치 원자성/호환성을 자동 증명하지 않는다. Merged proposal description은 Edit 권한자가 수정할 수 있게 됐어도 과거 실제 변경 내용 자체를 수정한 것은 아니다.

Branch entity 탐색은 main이 아니라 실제 owning branch로 이동하도록 수정됐다. Branch indexing 요청 후에는 Ontology Manager에서 완료 상태를 확인해야 action을 적용할 준비가 된다.

## 7월 branch 실행과 배포 결과

Automate Global Branching은 edit/execution isolation,protection,rebase와 project approval policy를 연결한다. Paused automation은 scheduled/live trigger만 멈추고 Run Now/Retry는 허용한다. Expired/trashed/disabled는 수동 실행도 막으므로 pause를 전체 실행 차단으로 쓰지 않는다.

Function-backed automation bulk upgrade는 All or nothing과 Partial을 구분해 후자는 호환 가능한 대상만 바꾸고 나머지를 남긴다. Summary의 개별 성공/실패를 확인한다. 이를 모든 외부 효과의 분산 트랜잭션 보장으로 확장하지 않는다.

Restricted view policy/marking을 branch에서 시험할 수 있으나 backing dataset의 main/branch markings가 다르면 이전 제한 데이터가 노출될 수 있다. 공유 전 marking을 검토하고 branching 미지원 dataset 하류는 branch build가 안 될 수 있다.

SQL Studio query→Pipeline Builder export도 선택 global branch를 따른다. Marketplace 다중 product install/upgrade와 linked output의 자동 input fulfillment,versioned object-set packaging은 자동 mapping 결과와 version 호환성을 다시 확인한다.

Function repository AGENTS.md/README와 live object-set preview는 개발 문맥을 제공한다. Preview는 최대500 object만 보여 주므로 전체 결과 검증은 이어 간다. Registered model node는 lineage에 표시돼도 source/target 중 registered가 있으면 bulk model replacement는 당시 미지원이었다.

## 출처

- [Palantir Foundry, Release notes 2026](https://www.palantir.com/docs/foundry/announcements/release-notes/2026/)

## 관련 문서

- [[Palantir-2026-H2-Platform-Evolution]]
