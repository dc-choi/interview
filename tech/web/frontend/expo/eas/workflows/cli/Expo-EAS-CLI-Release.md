---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS CLI Update와 Hosting 제어"]
---

# EAS CLI Update와 Hosting 제어

## Update publish

update는 branch 또는 channel, message/platform, environment, input-dir와 rollout-percentage를 받는다. SDK 55 이상에서는 environment가 필수다. --auto는 Git branch/commit message를 쓰는 옵션일 뿐 환경 선택을 대신하지 않는다.

```sh
eas update --channel preview --environment preview --message '검토용 변경'
```

--skip-bundler는 기존 export를 그대로 사용하므로 오래된 bundle/환경을 배포하지 않게 한다. --emit-metadata는 bundle 폴더에 eas-update-metadata.json을 남긴다. Signed Update의 private-key-path는 비밀 파일이며 소스와 별도로 관리한다.

CLI 24.8 reference의 rollout-percentage는 정수1~100이다. Workflow 상세표의0~100과 차이가 있으므로 0으로 publication을 시도하는 예시를 일반화하지 않는다. 생략은100이며 대상 밖 사용자는 branch의 이전 latest update를 받는다.

## 조회와 복구

update:list/view/insights는 group/platform/runtime과 기간을 좁혀 확인한다. update:edit는 rollout 비율, update:delete는 group 전체를 삭제한다. 삭제는 이미 설치된 클라이언트의 복구와 다르다.

update:republish는 기존 group을 다시 최신으로 publish한다. update:revert-update-rollout은 진행 중 rollout을 되돌리고 update:roll-back-to-embedded는 특정 runtime에 내장 update 복귀 지시를 publish한다. update:rollback GROUPID는 branch/runtime의 latest group만 대상으로 이전 update를 재발행하거나 없으면 embedded 복귀를 만든다.

update:embedded:upload는 native build에 포함된 JS bundle과 app.manifest를 platform/channel과 등록해 bsdiff 기준으로 사용한다. embedded:list/view/delete는 이 등록 자료를 관리한다. 내장 바이너리 자체를 서버 명령으로 수정하는 동작이 아니다.

## Branch와 channel

branch:create/list/view/rename/delete는 Update branch를 관리한다. channel:create/list/view/edit/delete는 channel과 branch 연결을 관리한다. pause/resume는 update 제공을 중단/재개하며 protect/unprotect는 account admin만 publish하도록 제한한다.

channel:rollout은 새 branch를 channel에 점진 연결하는 create/edit/end/view 동작이다. Update group rollout과 구분하고 runtime/percent/종료 outcome(republish-and-revert 또는 revert)을 확인한다. channel:insights는 channel과 runtime이 필수다.

## Hosting

deploy는 export-dir(기본 dist), environment, alias/prod/id를 받는다. --dry-run은 업로드 대신 tarball을 생성한다. 첫 preview domain을 비대화형으로 정하려면 dev-domain을 지정한다.

deploy:alias 또는 deploy:promote --prod는 기존 deployment를 production으로 승격한다. deploy:alias:delete는 alias, deploy:delete는 deployment를 제거한다. worker:alias/alias:delete/delete와 worker:deploy는 관련 alias다. 같은 파일을 다시 export하는 것과 기존 deployment의 alias 이동을 구분한다.

## 출처

- [Expo Documentation, EAS CLI reference](https://docs.expo.dev/eas/cli)

## 관련 문서

- [[Expo-EAS-CLI-Reference]]

- [[Expo]]
