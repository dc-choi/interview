---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update per-update와 branch rollout"]
---

# EAS Update per-update와 branch rollout

rollout은 일부 사용자에 먼저 변경을 제공해 문제를 발견한다. runtime 호환성을 대신하지 않으며 오류와 adoption을 확인하며 확대한다. per-update는 하나의 update, branch-based는 update stream인 branch 전환을 대상으로 한다.

## Per-update lifecycle

```sh
eas update --channel production --environment production --rollout-percentage 10
eas update:edit
eas update:revert-update-rollout
```

첫 명령은10% 대상 publish, edit은 group 선택과 비율 변경, revert는 이전 상태 복귀다. 100%로 늘리면 완전 배포다. branch에 동시 rollout 하나만 가능하며 같은 runtime의 새 update publish 전에 완료/복귀하여 진행 중 rollout을 덮지 않는다. update:list/view로 상태를 확인한다.

기존 control update가 있으면 revert는 그 update를 republish해 이미 새 update를 받은 client도 복귀시킨다. 이전 update가 없는 branch의 첫 rollout을 복귀하면 rollback-to-embedded directive를 만든다. 이미 실행된 코드의 데이터 변경까지 자동 복원하지는 않는다.

## Branch-based lifecycle

eas channel:rollout의 interactive guide에서 channel, 새 branch와 비율을 선택한다. Edit으로 늘리거나 줄이고 End에서 Republish and revert 또는 Revert를 선택한다. 전자는 검증한 새 branch의 latest update를 기존 branch에 republish하고 모두 기존 branch로 연결한다. 후자는 새 내용을 버리고 기존 branch로 돌린다.

channel당 동시 branch rollout은 하나다. 진행 중 두 branch에 --branch로 update를 publish할 수 있지만 --channel은 어느 branch인지 결정할 수 없어 사용할 수 없다. channel:rollout으로 상태를 본다. 두 방식의 종료 의미와 pointer/content 변경을 구분한다.

## 출처

- [Expo Documentation, Rollouts](https://docs.expo.dev/eas-update/rollouts)

## 관련 문서

- [[Expo-EAS-Update-Rollbacks]]
- [[Expo-EAS-Update-Channels]]
