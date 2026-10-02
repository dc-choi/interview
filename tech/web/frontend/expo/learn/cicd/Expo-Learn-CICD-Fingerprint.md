---
tags: [expo, react-native, cicd]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Fingerprint로 development build 재사용"]
---

# Fingerprint로 development build 재사용

## Native compatibility를 hash로 조회

Native dependencies, permissions/config, SDK 변경은 새 native binary를 요구한다. JS UI/text 수정은 기존 compatible development build를 사용할 수 있다. Expo Fingerprint는 dependencies/native files/config 같은 native characteristics를 hash로 만들고 get-build는 hash/profile에 맞는 기존 build ID를 찾는다. hash 비교는 테스트 성공이나 release 배포 상태를 증명하지 않는다.

```yaml
jobs:
  run_tests:
    steps:
      - uses: eas/checkout
      - uses: eas/install_node_modules
      - run: npx jest --ci
  fingerprint:
    needs: [run_tests]
    type: fingerprint
    environment: development
  get_android_build:
    needs: [fingerprint]
    type: get-build
    params:
      fingerprint_hash: ${{ needs.fingerprint.outputs.android_fingerprint_hash }}
      profile: development
  build_android:
    needs: [get_android_build]
    if: ${{ !needs.get_android_build.outputs.build_id }}
    type: build
    params:
      platform: android
      profile: development
```

iOS는 ios_fingerprint_hash와 platform ios로 같은 graph를 구성한다. fingerprint job의 outputs는 platform별 hash 두 개다. get-build가 찾으면 build_id가 있고 못 찾으면 empty다. negation 조건이 새 build를 선택한다. 처음 build의 credentials prompt는 workflow 이전 `eas build --profile development --platform all` 같은 수동 준비로 해결한다.

profile은 eas.json build 구성, environment는 EAS env variable set이다. 이름이 같아도 서로 다른 객체이며 native config 평가에 영향을 주는 env가 fingerprint/build와 같아야 한다. trigger를 main push로 추가하면 compatible runtime을 팀이 미리 설치할 수 있다. `eas build:dev`는 compatible existing build를 download/install하는 개발 도구 경로다.

## Unit tests gate

custom job VM에는 checkout 전 source가 없다. eas/checkout으로 가져오고 install_node_modules로 lockfile/package manager에 맞는 dependencies를 준비한다. `npx jest --ci`는 watch 없이 종료하는 test 실행이다. fingerprint needs run_tests로 모든 build lookup 전에 test 통과를 요구한다.

JS-only commit이면 builds skip 후 existing dev client가 Metro의 최신 JS를 실행한다. dashboard에 build skip이 보인 것만으로 최신 UI나 native compatibility를 device에서 확인한 것으로 간주하지 않는다. 새 native module 추가 case와 JS-only case를 각각 관찰하면 conditional graph가 의도대로 동작하는지 검증할 수 있다.

## 출처

- [Expo Documentation, Automate development builds with EAS Workflows](https://docs.expo.dev/tutorial/cicd/development-builds)

## 관련 문서

- [[Expo-Learn-CICD-Workflow]]
- [[Expo-Home-Unit-Testing]]
