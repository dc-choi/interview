---
tags: [expo, react-native, cicd]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Maestro cloud E2E의 artifact와 flow"]
---

# Maestro cloud E2E의 artifact와 flow

## Test binary와 flow

Maestro는 Android emulator/iOS simulator에서 tap/type/assert/navigation을 수행한다. Workflows maestro job은 원문 기준 alpha다. tutorial 제목/prose는 development build라고 부르지만 제시된 e2e-test profile에는 developmentClient true가 없다. 이를 dev-client 연결 test로 가정하지 않고 embedded app을 실행하는 test artifact 설정을 확인한다.

```json
{"build":{"e2e-test":{
  "withoutCredentials":true,
  "android":{"buildType":"apk","image":"latest"},
  "ios":{"simulator":true,"image":"latest"}
}}}
```

Android unsigned APK와 iOS Simulator artifact로 store signing을 피한다. latest image는 예시이며 SDK57 build toolchain 적합성과 reproducibility를 확인한다. `.maestro/`의 appId는 variant 포함 실제 android.package/ios.bundleIdentifier와 같아야 한다.

```yaml
appId: com.example.stickersmash
---
- launchApp
- assertVisible: 'Welcome'
- tapOn: 'Settings'
- assertVisible: 'Settings'
```

UI text/selectors가 실제 app에 존재하도록 변경한다. sample Welcome/Settings assert를 그대로 복사하면 tutorial app과 맞지 않을 수 있다. launch/navigation뿐 아니라 주요 실패 조건과 permission dialog를 대상 OS별로 확인한다.

```yaml
test_android:
  needs: [build_android]
  type: maestro
  params:
    build_id: ${{ needs.build_android.outputs.build_id }}
    flow_path: ['.maestro/home.yml', '.maestro/navigate.yml']
```

iOS도 build_ios output과 같은 flow list로 연결한다. platform build jobs가 parallel이고 각각 완료되면 해당 Maestro job이 실행된다. build_id는 이번 graph의 artifact를 지목하므로 다른 profile의 store artifact를 전달하지 않는다.

manual eas workflow:run으로 검증 후 pull_request branches trigger 또는 pull_request_labeled labels:['test']로 선택 실행한다. flow 통과는 그 simulator/emulator와 입력 경로의 증거이며 physical device gestures/performance/store installation까지 보장하지 않는다.

## 출처

- [Expo Documentation, Run E2E tests with Maestro on EAS Workflows](https://docs.expo.dev/tutorial/cicd/e2e-tests)

## 관련 문서

- [[Expo-Learn-CICD-Workflow]]
- [[Expo-Learn-CICD-Release]]
