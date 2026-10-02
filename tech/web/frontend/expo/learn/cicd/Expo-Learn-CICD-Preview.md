---
tags: [expo, react-native, cicd]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Preview build, PR update와 알림 workflow"]
---

# Preview build, PR update와 알림 workflow

## Preview runtime 준비

reviewer가 branch checkout/Metro 없이 변경을 보려면 preview internal binary를 설치한다. expo-updates, update URL/runtimeVersion/channel이 binary에 들어 있어야 하므로 package 설치와 update:configure 후 새 preview build를 먼저 생성한다. native change는 compatible new binary를 요구하고 PR update만으로 해결되지 않는다.

preview fingerprint/get-build/build graph는 development와 동일하며 profile/environment를 preview로 바꾼다. first build는 생성되고 JS-only 재실행은 reuse한다. tutorial preview.yml은 manual trigger로 시작하므로 main push 자동화를 원하면 on.push를 실제로 추가해야 한다. prose의 push 설명만으로 trigger가 생기지 않는다.

## Completion 알림

```yaml
notify:
  after: [build_android, build_ios]
  type: slack
  environment: preview
  params:
    webhook_url: ${{ env.SLACK_WEBHOOK_URL }}
    message: 'Android: ${{ after.build_android.status }}, iOS: ${{ after.build_ios.status }}'
```

Slack incoming webhook을 EAS preview secret variable로 두고 job environment를 명시한다. job 기본 environment는 production이므로 omitted environment는 preview secret을 제공하지 않을 수 있다. message 대신 payload로 rich Block Kit formatting을 제공할 수 있다. after는 success/failure/skipped 모두 completion 뒤 알림을 허용한다. 이 문서의 설정 예시는 외부 message를 실제로 보내는 작업이 아니다.

## PR OTA preview

```yaml
on:
  pull_request:
    branches: ['*']
jobs:
  publish_preview:
    type: update
    environment: preview
    params:
      channel: preview
  comment:
    needs: [publish_preview]
    type: github-comment
```

workflow를 default branch에 먼저 넣는다. PR source code의 visible JS 변경을 publish하고 github-comment가 link/QR을 PR에 남긴다. reviewer는 compatible preview runtime에서 link를 열어 확인한다. 하나의 preview channel을 여러 PR이 publish하면 channel의 latest update와 PR별 link가 가리키는 update를 구분해야 한다. native dependencies가 바뀐 PR은 별도의 build workflow와 compatibility 검증을 추가한다.

update 성공 뒤만 comment가 실행되게 needs로 연결한다. build status notification, PR comment, app UI 검증은 서로 다른 결과이며 graph/logs와 실제 device test를 함께 본다.

## 출처

- [Expo Documentation, Create preview builds for pull requests with EAS Workflows](https://docs.expo.dev/tutorial/cicd/preview-builds)

## 관련 문서

- [[Expo-Learn-EAS-Updates]]
- [[Expo-Learn-CICD-Fingerprint]]
