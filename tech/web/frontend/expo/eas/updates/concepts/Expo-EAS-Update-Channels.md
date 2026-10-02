---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update CLI, pause와 resume"]
---

# EAS Update CLI, pause와 resume

channel은 binary에 포함되는 이름이며 branch는 update history다. CLI 조회 결과로 실제 연결을 확인한 뒤 publish/pointer 변경을 한다. --auto는 현재 Git branch와 마지막 commit message를 채우며 review할 update content와 environment까지 검증하는 기능은 아니다.

## 조회와 변경 명령

| 목적 | CLI |
| --- | --- |
| Channels 조회/상세/생성 | eas channel:list / channel:view <name> / channel:create <name> |
| Branches 조회/상세 | eas branch:list / branch:view <name> |
| Group 조회 | eas update:view <groupId> |
| Branch publish | eas update --branch <name> --message <message> --environment <env> |
| Git 정보 사용 | eas update --auto --environment <env> |
| Branch 삭제 | eas branch:delete <name> |
| Branch 개명 | eas branch:rename --from <old> --to <new> |
| Group/branch republish | eas update:republish --group <id> 또는 --branch <name> |

branch를 개명해도 channel 연결은 유지된다. republish는 선택한 이전 내용을 history의 새 최신 update로 올리는 방식이며 delete처럼 history를 되돌리는 작업이 아니다. branch 옵션은 최근 group을 보여주고 선택한다.

## Channel pause와 resume

eas channel:pause production은 해당 channel의 update 제공을 멈춘다. client는 여전히 검사하고 보통 body 없는204를 받으며 이미 다운로드한 최신/embedded update를 계속 실행한다. 서버에 새 update를 publish할 수 있고 다른 channel은 영향을 받지 않는다. 다운로드가 없으므로 새 billed MAU가 늘지 않지만 기존 billing 수가 삭제되는 것은 아니다.

eas channel:resume production은 연결된 branch의 호환 최신 update 제공과 진행 중 rollout을 재개한다. view/list의 Paused 상태로 확인한다. CI는 이름+--non-interactive 또는 --json(비대화형 포함)을 사용한다.

pause는 현재 코드 유지, rollback/republish는 이전 내용을 새 최신 update로 제공, rollback-to-embedded는 binary bundle로 돌아가라는 directive다. pause만으로 이미 받은 문제 코드를 제거하지는 않는다.

## 출처

- [Expo Documentation, Manage branches and channels with EAS CLI](https://docs.expo.dev/eas-update/eas-cli)

## 관련 문서

- [[Expo-EAS-Update-Selection]]
- [[Expo-EAS-Update-Rollbacks]]
