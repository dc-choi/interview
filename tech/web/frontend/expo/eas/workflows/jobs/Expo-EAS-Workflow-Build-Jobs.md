---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow Build Fingerprint Get Build"]
---

# Workflow Build Fingerprint Get Build

## Build job

Build에는 platform(android/ios)이 필수이고 profile 기본은 production이다. eas.json에 해당 profile과 credential이 있어야 한다. message로 실행 설명을 남기고 managed ad hoc iOS profile 갱신은 refresh_ad_hoc_provisioning_profile=true로 요청한다.

출력 build_id를 submit/test에 전달한다. app_identifier, app_version/app_build_version, channel, distribution, fingerprint_hash, git_commit_hash, platform/profile/runtime_version/sdk_version도 확인할 수 있다. 일부 metadata는 null일 수 있고 simulator는 문자열 true/false로 보고된다.

## Fingerprint

Fingerprint job은 android_fingerprint_hash/ios_fingerprint_hash를 만든다. 현재 이 job의 지원 범위는 CNG이며 native 폴더를 commit하는 프로젝트는 기본 검사를 통과하지 못한다. unstable_skip_cng_check는 검사를 끄는 실험 옵션이지 native 호환성을 증명하는 옵션이 아니다.

Build/fingerprint/update의 environment와 inline env를 같게 유지한다. 같은 코드여도 app.config를 바꾸는 환경 값이 다르면 비교가 달라질 수 있다. Fingerprint 일치는 앱의 기능 테스트 통과와 별개다.

## 기존 build 검색

get-build에는 platform/profile/distribution/channel/app_identifier, app_build_version/app_version, git_commit_hash, fingerprint_hash/sdk_version/runtime_version과 simulator filter가 있다. 목적에 맞게 좁혀 다른 앱 variant나 기기 종류가 섞이지 않게 한다.

wait_for_in_progress 기본 false다. true일 때도 성공 build가 있으면 바로 사용한다. 성공 결과가 없고 진행 중인 build가 있으면 기다린다. 기다린 build가 실패하면 get-build job은 성공하되 outputs가 비어 있는 상태로 끝난다. 따라서 job success만 보고 build_id 존재를 가정하면 안 된다.

## 최소 연결

```yaml
jobs:
  build_android:
    type: build
    params:
      platform: android
      profile: production
  submit_android:
    needs: [build_android]
    type: submit
    params:
      build_id: ${{ needs.build_android.outputs.build_id }}
```

위 예시는 스토어 업로드까지 수행하는 구성이다. 읽기용 조회와 release 동작을 구분하고 실제 프로젝트에 적용할 때 credential/track을 먼저 맞춘다.

## 출처

- [Expo Documentation, Pre-packaged jobs in EAS Workflows](https://docs.expo.dev/eas/workflows/pre-packaged-jobs)

## 관련 문서

- [[Expo-EAS-Workflow-Jobs]]

- [[Expo]]
