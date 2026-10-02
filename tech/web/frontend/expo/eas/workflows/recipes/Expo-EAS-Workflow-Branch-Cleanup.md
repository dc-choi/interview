---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Git branch 삭제와 Update branch 정리"]
---

# Git branch 삭제와 Update branch 정리

## 두 branch는 별개다

GitHub branch를 삭제해도 같은 이름의 EAS Update branch는 남는다. branch별 preview를 운영한다면 ref_delete event에서 해당 Update branch를 정리할 수 있다. EAS 프로젝트의 GitHub 연결과 default branch에 있는 workflow 파일이 필요하다.

```yaml
on:
  ref_delete:
    branches: ['feature/**', '!main', '!release/**']
jobs:
  cleanup_preview:
    type: branch-delete
    params:
      branch_name: ${{ github.ref_name }}
      fail_on_missing: false
```

예시는 preview용 feature branch만 대상으로 좁힌다. 실제로 삭제하면 그 branch의 updates도 제거된다. 문서의 job ID에 hyphen이 있는 예시 대신 schema가 허용한 underscore를 사용했다.

## 보존 조건

운영 channel이 연결된 branch는 삭제가 막힌다. 장애를 없애려고 channel 연결을 무조건 해제하지 말고 그 branch가 현재 사용자 배포에 쓰이는지 확인한다. fail_on_missing=false는 이미 없거나 처음부터 없는 branch도 성공으로 처리한다.

ref_delete의 github.sha는 default branch 기준이다. 삭제된 branch 마지막 commit으로 기록하지 않는다. 실행 파일도 삭제된 ref가 아닌 default branch HEAD에서 읽는다.

## 출처

- [Expo Documentation, Clean up EAS Update branches with EAS Workflows](https://docs.expo.dev/eas/workflows/examples/branch-cleanup)

## 관련 문서

- [[Expo-EAS-Workflow-Examples]]

- [[Expo]]
