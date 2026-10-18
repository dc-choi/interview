---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Global branch에서 deployment와 Function을 검증하는 흐름

main에 direct deployment가 있는 상태에서 global branch에 model을 build하고 같은 branch의 Live deployment를 열면 main configuration을 복사한 disabled branch deployment를 만든다. 설정을 바꾸고 Start deployment해야 실제 test가 가능하다.

## 고립과 proposal

branch의 runtime/Function 설정은 merge 전 main과 다른 branch에 전파되지 않는다. modified resource panel의 Remove from branch는 configuration을 proposal에서 제거한다. resource protection을 켜면 main 수정은 branch/proposal로 진행한다.

branch-local Function version은 -branch-YYYYMMDD-HHMMSS suffix를 가지며 같은 global branch의 지원 app에서만 쓴다. main/다른 branch에서는 못 쓰며 global branch가 아닌 model-only branch에서는 이를 publish하지 못한다.

## Merge 조건과 rebase

required approval,main과 최신 configuration,branch model build가 필요하다. Function의 target stable version이 main에 이미 publish됐으면 rebase가 필요하다. reviewer는 runtime과 Function 설정 diff를 보고 approve/reject한다.

rebase는 main 또는 현재 branch의 완전한 configuration 하나를 고른다. field별 merge를 지원하지 않는다. 실행 중 branch에서 main의 source 변경을 채택하면 Restart and rebase로 source를 갱신한다.

merge는 selected config를 main에 적용하고 branch Function을 stable version으로 publish한다. main에 direct deployment가 없던 경우 disabled 상태로 만들므로 merge 성공을 serving 시작으로 보고하지 않는다.

## 출처

- [Palantir, branching-direct-model-deployments](https://www.palantir.com/docs/foundry/manage-models/branching-direct-model-deployments)

## 관련 문서

- [[Palantir-Direct-Model-Deployment]]
- [[Palantir-Model-Objective-Governance]]
