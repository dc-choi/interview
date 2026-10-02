---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update bundle patch와 embedded base"]
---

# EAS Update bundle patch와 embedded base

bundle diff는 bsdiff로 기존 JS bundle와 새 bundle의 차이를 전달한다. SDK55부터 지원하고 SDK56 이후, SDK57은 enableBsdiffPatchSupport=true가 기본이다. false로 비활성화하며 binary config 변경을 반영한다. patch는 충분히 작고 효율적으로 생성 가능할 때만 제공되고 아니면 full bundle을 받는다.

## Published update와 generation

publish 직후 channel의 두 번째 최신 update를 base로 patch를 미리 계산한다. 다른 base에서 요청하면 처음에는 full bundle을 받고 해당 조합을 on-demand 생성하여 이후 비슷한 요청에 제공한다. 생성은 몇 분 걸릴 수 있고 모든 조합이 즉시 patch를 받지는 않는다.

Dashboard Update Group의 platform details와 Updates.readLogEntriesAsync의 patch 적용 성공 로그로 확인한다. 작은 publish 결과와 실제 device patch 적용을 구분한다.

## Embedded bundle mode

fresh install의 첫 update는 기본 full bundle이다. **실험적 opt-in** EAS_UPDATE_EXPERIMENTAL_UPLOAD_EMBEDDED_BUNDLE=1을 build profile.env에 설정하면 build embedded bundle을 업로드하여 같은 channel의 나중 update base로 사용할 수 있다. flag와 동작은 변경될 수 있다.

```sh
eas update:embedded:upload --platform android --bundle <bundle-path> --manifest <app.manifest-path> --channel production
eas update:embedded:list
eas update:embedded:view <id>
eas update:embedded:delete <id>
```

EAS Build 없이 native build가 생성한 실제 bundle/app.manifest를 upload할 수 있다. list로 ID를 찾고 view/delete한다. delete는 재시도 가능하지만 삭제된 base에 대한 patch 제공은 더 기대하지 않는다. asset 전체 차이 전송과 JS bundle patch를 혼동하지 않는다.

## 출처

- [Expo Documentation, Bundle diffing for EAS Update](https://docs.expo.dev/eas-update/bundle-diffing)

## 관련 문서

- [[Expo-EAS-Update-Assets]]
- [[Expo-EAS-Update-Bandwidth]]
- [[Expo-SDK-Updates-API]]
