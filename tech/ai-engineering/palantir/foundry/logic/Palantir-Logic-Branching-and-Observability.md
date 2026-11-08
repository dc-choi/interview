---
tags: [palantir, aip, logic]
status: done
verified_at: 2026-11-08
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

검증일 usage 문서는 LLM token과 별도로 Use LLM block 실행마다 고정 4 compute-seconds, 그 block의 LLM이 tool을 부를 때마다 8 compute-seconds를 더한다고 제시한다. 두 charge는 합산되므로 tool을 부르는 block은 둘 다 낸다. 기본식은 `(LLM block 실행 수 * 4) + (tool 호출 수 * 8)`이다.

Tool 호출 횟수는 실행 시점에 LLM이 정하므로 한 block 실행에 여러 번의 호출이 생길 수 있고 각각 과금된다. Loop 안의 Use LLM block은 반복마다 한 번의 block 실행으로 센다. 실제 호출 수는 함수를 테스트하고 Debugger에서 확인한다.

두 LLM block 중 하나가 tool을 한 번 부르는 예는 2*4+8=16이며 두 번 실행하면 32다. 같은 구성에서 tool을 run마다 두 번 부르면 2*4+2*8=24, 두 번 실행하면 48이다. 여기에 model token과 query/function/action의 별도 compute가 더해질 수 있다. Enterprise 계약이면 계산 전에 Palantir 담당자에게 먼저 확인한다.

Action, function과 data transformation block은 그 자체로 compute를 쓰지 않지만, 호출한 Ontology query, function, action은 별도 compute를 쓴다. 공식 문서는 prompt에 넣는 텍스트를 필요한 부분으로 줄이고, 적절한 경우 여러 block을 한 prompt로 합치며, 재시도와 tool 호출 수를 파악하라고 권한다. 운영 판단: block을 합쳐 context와 품질이 나빠지면 재시도가 늘어 전체 cost가 오히려 커질 수 있다.

## 출처

- [Palantir Foundry, branching-logic](https://www.palantir.com/docs/foundry/logic/branching-logic/)
- [Palantir Foundry, compute-usage](https://www.palantir.com/docs/foundry/logic/compute-usage/)
- [Palantir Foundry, execution-mode-settings](https://www.palantir.com/docs/foundry/logic/execution-mode-settings/)
- [Palantir Foundry, logic-metrics](https://www.palantir.com/docs/foundry/logic/logic-metrics/)

## 관련 문서

- [[Palantir-Foundry-Logic]]
- [[Palantir-AIP-Logic-and-Evaluation]]
