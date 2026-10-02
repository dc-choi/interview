---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Fingerprint로 native build와 Update 분기"]
---

# Fingerprint로 native build와 Update 분기

## 분기의 전제

Build/Submit/Update와 스토어 credential을 먼저 준비한다. Fingerprint job은 현재 CNG 전제이며 environment는 production build와 같게 한다. Android/iOS hash를 각각 계산해 해당 platform/profile/distribution/channel의 기존 build를 검색한다.

Build ID가 없으면 full native build 후 submit한다. 호환 build가 있으면 해당 platform의 Update를 publish한다. 첫 Git tag나 처음 실행한 workflow라도 이미 맞는 build가 있으면 Update 경로일 수 있다. 실행 순번으로 분기를 판단하지 않는다.

## 검색을 좁힌다

```yaml
jobs:
  fingerprint:
    type: fingerprint
    environment: production
  find_android:
    needs: [fingerprint]
    type: get-build
    params:
      platform: android
      profile: production
      distribution: store
      channel: production
      fingerprint_hash: ${{ needs.fingerprint.outputs.android_fingerprint_hash }}
```

이후 build job은 `!needs.find_android.outputs.build_id`, update job은 그 값의 존재를 조건으로 삼는다. Update의 environment와 branch/channel 연결을 확인한다. Fingerprint 일치만으로 기존 build가 사용자에게 설치됐다고 가정하지 않는다.

## Release 품질

공식 단순 예시는 main push에서 곧바로 제출/publish한다. 실제 정책에 따라 테스트와 승인 gate를 선행시킨다. Main push는 merge만 뜻하지 않는다. Submit은 업로드이며 store review/rollout은 별도다.

Native와 OTA 경로가 나뉘므로 최종 알림은 skipped 분기를 고려해 after로 합류한다. 성공한 분기의 artifact/update ID를 확인하고 after 목록의 값을 needs context로 잘못 읽지 않는다.

## 출처

- [Expo Documentation, Deploy to production with EAS Workflows](https://docs.expo.dev/eas/workflows/examples/deploy-to-production)

## 관련 문서

- [[Expo-EAS-Workflow-Examples]]

- [[Expo]]
