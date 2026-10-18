---
tags: [palantir, aip, logic]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Logic branch, 로그와 사용량

## Branch 배포

Logic을 branch에서 수정/저장하면 branch resource로 포함된다. Publish한 버전은 Branched pre-release로 표시되고 그 branch의 Workshop/Action 등에서 쓸 수 있다. 다른 branch와 main에서는 사용할 수 없다.

배포 전에 main과 동기화하고 branch publish, 오류 없음과 승인 완료를 충족한다. 보호된 main은 직접 편집을 막고 proposal을 통해 review/merge한다. Project 기본 protection은 새 Logic file에도 적용할 수 있다.

Branch는 main에서만 만들 수 있고 API name은 branch 간 공통이라 branch에서 바꿀 수 없다. Publish한 Logic은 branch에서 삭제할 수 없다. Rebase conflict는 split view에서 수동으로 main 변경을 반영한다. Remove from branch와 자원 자체 삭제는 다른 작업이다.

## 실행 주체와 로그

기본 user-scoped는 호출 사용자 권한으로 실행하며 본인 로그만 24시간 볼 수 있다. Project-scoped는 project 권한으로 실행하고 project 접근자에게 로그를 공개한다. 사용하는 자원은 같은 project에 import해야 하고 사용자에게 관련 markings 접근도 필요하다.

Project-scoped run-history dataset은 최근 10,000회를 보존한다. 이 보존과 Workflow Lineage의 7일 실행 이력, 30일 success/failure/P95 metric은 서로 다른 창이다. Metrics는 Logic resource Viewer가 볼 수 있으며 FTS 기반 near-real-time이라는 설명을 즉시 일관성 보장으로 해석하지 않는다.

## Compute의 분해

검증일 usage 문서는 LLM block 실행 최소 4 compute-seconds와 LLM tool 실행 8 compute-seconds를 제시한다. 두 LLM block 중 하나가 tool을 한 번 부르는 예는 기본 2*4+8=16이며 두 번 실행하면 32다. 여기에 model token과 query/function/action의 별도 compute가 더해질 수 있다. Enterprise 계약은 별도 기준을 확인한다.

Deterministic action/function/transform block 자체에는 이 LLM block charge가 없지만 호출된 시스템의 비용이 없다는 뜻은 아니다. 불필요한 block, 반복/재시도와 큰 tool response를 함께 줄인다. Block을 합쳐도 context와 품질이 나빠지면 전체 cost는 증가할 수 있다.

## 출처

- [Palantir Foundry, branching-logic](https://www.palantir.com/docs/foundry/logic/branching-logic/)
- [Palantir Foundry, compute-usage](https://www.palantir.com/docs/foundry/logic/compute-usage/)
- [Palantir Foundry, execution-mode-settings](https://www.palantir.com/docs/foundry/logic/execution-mode-settings/)
- [Palantir Foundry, logic-metrics](https://www.palantir.com/docs/foundry/logic/logic-metrics/)

## 관련 문서

- [[Palantir-Foundry-Logic]]
- [[Palantir-AIP-Logic-and-Evaluation]]
