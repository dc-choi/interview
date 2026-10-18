---
tags: [palantir, foundry, governance, privacy]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["보존 정책과 transaction 삭제 계약"]
---

# 보존 정책과 transaction 삭제 계약

Retention은 dataset transaction을 policy로 선택해 접근 불가 상태로 표시한 다음 영구 삭제한다. UI의 Recommended(platform-managed), Custom(space-managed), deprecated Legacy(repository YAML) 정책은 별도로 존재한다. 한 정책의 제외 설정이 다른 정책의 삭제를 막지 않는다.

## 선택과 정책의 결합

Space마다 policy가 독립적으로 실행되고 순서는 정해져 있지 않다. Custom은 최대 50개다. Dataset selector는 기본적으로 아무것도 선택하지 않으며 최소 한 Select가 필요하다. Select/Exclude 제약은 교집합으로 범위를 좁히고 순서와 무관하다. RID 기반 지정은 rename에도 유지되며 folder 지정은 미래에 생성되는 dataset도 포함한다.

Derived selector는 master branch JobSpec과 nonzero dataset input을 요구한다. Transform-type/alias selector는 worker-type selector와 다르다. Raw ingest와 master에서 build하지 않은 dataset을 단순히 derived로 가정하지 않는다.

Transaction selector는 기본적으로 모든 branch의 closed transaction을 대상으로 좁혀 간다. OPEN은 일반 selector에서 제외한다. Count/view-count는 지울 개수가 아니라 남길 개수다. Count는 committed non-DELETE transaction을 세고 SNAPSHOT/APPEND/UPDATE를 구분하지 않으므로 증분 파이프라인에서는 view count의 의미를 확인한다.

Only-in-branch는 해당 branch에만 존재하는 transaction이고 Not-in-branch는 해당 branch에 존재하지 않는 transaction이다. 다른 branch와 공유한 history를 branch 이름만으로 삭제 대상이라고 보지 않는다. Has-been-projected는 모든 projection에 반영된 transaction을 선택한다.

## View와 최신 데이터 보호

첫 transaction이 view를 시작하며 다음 SNAPSHOT이 새 view를 연다. APPEND를 계속하면 모든 데이터가 하나의 최신 view에 남을 수 있다. 마지막 3 view 밖이면서 30일 초과 같은 정책은 오래된 APPEND 데이터를 전혀 삭제하지 않을 수도 있다.

기본적으로 어느 branch에서든 최신 view에 속한 transaction은 보호한다. 다른 branch에서는 오래된 transaction이어도 한 branch의 최신 view에 남아 있으면 보호된다. Allow deletion from latest view는 현재 사용 중인 데이터도 삭제할 수 있으며 결과를 나타내는 DELETE transaction이 추가될 수 있다. Abort open transactions는 별도 고급 옵션이다.

Python 증분 transform의 allow_retention=True는 input retention 삭제가 snapshot run을 유발하는 것을 막기 위한 설정이다. 삭제된 input history를 복구하거나 downstream의 업무 의미까지 자동 유지하지는 않는다.

No-files-in-active-view는 최신 view 밖 transaction과 active file이 새 file로 모두 대체된 transaction을 선택한다. Ignore hidden files는 이름이 `.`으로 시작하거나 `=` 없이 `_`로 시작하는 비데이터 file을 판단에서 제외한다. Latest-view override와 조합해야 그 view 안의 superseded transaction도 삭제할 수 있다.

Only-present-in-views-older-than의 age는 view의 마지막 transaction close time 기준이다. View에 open transaction이 있으면 해당 view를 지우지 않는다. 단순 file timestamp 또는 첫 transaction age와 혼동하지 않는다.

## Mark, sweep과 되돌리기의 한계

환경 전체를 순회하는 평가 loop는 며칠 걸릴 수 있다. Mark된 transaction은 더 이상 읽지 않아야 하며 일반적으로 7일 뒤 sweep하지만 기간은 달라질 수 있다. Sweep 뒤에는 복구할 수 없다. Policy 철회는 이미 적용한 변경을 자동 복구하지 않는다. 잘못된 policy를 먼저 고친 뒤 sweep 전 unmark 지원이 필요하다.

Recommended policy는 관리자가 직접 편집하지 못하고 예외는 Support 경로를 쓴다. Policy 변경은 approval request를 만들 수 있고 권한/환경에 따라 자동 invoke될 수도 있다. 모든 변경에 다른 사람의 승인이 항상 필요한 것은 아니다.

## Branch lifecycle과 출처 한계

전체 branch/JobSpec 삭제는 transaction policy UI와 별도 infrastructure 동작이다. 대응 repository에 같은 branch가 없고 최근 7일의 생성/committed/open transaction/JobSpec 조건을 만족하는 branch를 정리한다고 설명한다. JobSpec이 없어 repository provenance를 찾을 수 없는 API-created branch는 recovered 안내상 이 조건을 만족하지 않는다.

Branch-deletion 독립 페이지는 AIP가 번역한 정확성 미검증 중국어 역사 자료다. 현재 영어 managing 페이지와 함께 읽었으며 일부 2021년 이전 환경에서는 기능 enablement 확인이 필요하다는 범위를 유지한다. 실제 삭제, 복구나 증분 build는 실행하지 않았다.

## 출처

- [Palantir retention, retention](https://www.palantir.com/docs/foundry/retention)
- [Palantir retention, branch-deletion](https://palantir.com/docs/zh/foundry/retention/branch-deletion/)
- [Palantir retention, dataset-selectors](https://www.palantir.com/docs/foundry/retention/dataset-selectors)
- [Palantir retention, manage-retention-policies](https://www.palantir.com/docs/foundry/retention/manage-retention-policies)
- [Palantir retention, navigation](https://www.palantir.com/docs/foundry/retention/navigation)
- [Palantir retention, overview](https://www.palantir.com/docs/foundry/retention/overview)
- [Palantir retention, policy-execution](https://www.palantir.com/docs/foundry/retention/policy-execution)
- [Palantir retention, transaction-selectors](https://www.palantir.com/docs/foundry/retention/transaction-selectors)

## 관련 문서

- [[Palantir-Data-Governance]]
- [[Palantir-Security-Governance]]
