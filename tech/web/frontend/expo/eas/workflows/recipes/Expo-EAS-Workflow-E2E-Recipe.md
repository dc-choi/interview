---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Maestro E2E workflow 구성"]
---

# Maestro E2E workflow 구성

## 설치 가능한 테스트 build

Android APK와 iOS Simulator .app를 만드는 e2e-test profile을 준비한다. `ios.simulator:true`, `android.buildType:apk`를 사용한다. withoutCredentials=true는 credential 요구를 줄이는 설정이며 실제 Android release signing 구성을 자동 완성하지는 않는다.

Development client를 넣으면 dev server 접속 화면이 테스트에 나타날 수 있다. Standalone UI를 테스트하려면 self-contained bundle을 가진 테스트 artifact를 사용한다. 원문의 e2e-test profile은 developmentClient를 켜지 않는다.

## Flow와 job

Maestro flow의 appId는 실제 variant의 package/bundle ID와 맞춘다. launchApp 뒤 화면의 의미 있는 text/testID를 assert하고 현재 템플릿의 안내 문구가 제품에도 있을 것으로 가정하지 않는다.

```yaml
jobs:
  build_android:
    type: build
    params:
      platform: android
      profile: e2e-test
  test_android:
    needs: [build_android]
    type: maestro
    environment: preview
    runs_on: linux-medium-nested-virtualization
    params:
      build_id: ${{ needs.build_android.outputs.build_id }}
      flow_path: ['.maestro/login.yml']
```

iOS는 ios platform과 Simulator profile, macOS runner를 사용한다. Pull request trigger를 붙이면 연결된 저장소 PR에서 자동 실행하며 fork 제외 조건이 있다. 수동 workflow:run으로도 실행할 수 있다.

## 실패를 해석한다

Build 실패와 테스트 assertion 실패를 구분한다. Screenshot/recording, junit report와 처음 실패한 flow를 확인한다. retry나 shard는 불안정한 테스트를 숨기는 대신 재현과 원인 분석에 사용한다. Maestro Cloud async upload 성공을 테스트 통과로 취급하지 않는다.

## 출처

- [Expo Documentation, Run E2E tests on EAS Workflows with Maestro](https://docs.expo.dev/eas/workflows/examples/e2e-tests)

## 관련 문서

- [[Expo-EAS-Workflow-Examples]]

- [[Expo]]
