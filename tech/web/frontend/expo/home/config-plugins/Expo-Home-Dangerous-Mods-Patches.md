---
tags: [expo, react-native, config-plugins]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo dangerous mod와 native patch 보존"]
---

# Expo dangerous mod와 native patch 보존

## Escape hatch 선택

dangerous mod는 native filesystem을 직접 읽고 string/regex로 변경한다. 구조화 wrapper로 표현할 수 없는 변경이나 legacy template 대응에서 사용한다. 일반 mods가 있는 파일을 직접 쓰면 다른 mod와 read/write 책임이 겹친다. Podfile 변경에도 먼저 `withPodfile`/properties와 autolinking을 검토한다.

동일 source anchor를 다른 plugin도 바꾸면 실행 순서에 따라 실패하거나 중복될 수 있다. repeated execution idempotency와 SDK template 변화에 대한 안정성을 별도로 검증한다. dangerous mods는 다른 mods보다 먼저 실행되므로 임의 plugin array 순서만으로 file 변경 순서를 보장하지 않는다.

## withDangerousMod 계약

```ts
import { type ConfigPlugin, withDangerousMod } from 'expo/config-plugins';
import fs from 'fs/promises';
import path from 'path';

const withCustomFile: ConfigPlugin = (config) => withDangerousMod(config, [
  'ios',
  async (modConfig) => {
    if (modConfig.modRequest.introspect) return modConfig;
    const target = path.join(modConfig.modRequest.platformProjectRoot, 'custom-settings.json');
    await fs.writeFile(target, JSON.stringify({ enabled: true }));
    return modConfig;
  },
]);
export default withCustomFile;
```

platform은 `ios`/`android`, action은 file access가 가능한 async function이다. target은 platform root 또는 project root에서 명시적으로 계산하고 existence, expected format와 replacement 성공 여부를 검사한다. 필수 변경 실패를 warning으로 삼킨 채 성공 build로 이어가지 않는다. 추가/move/delete file은 dangerous mod에서만 수행해 introspection의 write-free 계약을 보존한다.

regex에 project name을 사용하면 metacharacters escaping과 anchor 개수를 검사한다. 이미 같은 변경이 있으면 no-op, 기대 anchor가 없으면 구체적인 오류가 안전하다. 예제의 단순 includes guard만으로 모든 idempotency/충돌이 해결되는 것은 아니다.

## patch-project 흐름

`patch-project`는 config plugin과 CLI를 통해 manual native 변경을 diff로 보존한다. 복잡한 기존 React Native 앱의 CNG 전환이나 config plugin 작성 전 prototype에서 유용하다.

```sh
npx expo install patch-project
npx patch-project
npx patch-project --platform android
```

설치 시 app config에 plugin이 추가되는지 확인한다. native customization에서 생성된 patch는 `cng-patches/android+<checksum>.patch`, `ios+<checksum>.patch`에 저장된다. 이후 prebuild에 plugin이 patch를 적용한다. npm dependency를 수정하는 patch-package와 native generation 보존 목적이 다르다.

## 한계와 재검증

SDK upgrade로 template/files가 바뀌면 patch anchor가 깨질 수 있다. 다른 plugin이 같은 Activity/Application/Podfile을 바꾸면 conflict가 생긴다. Xcode `.pbxproj`의 UUID는 clean regeneration에서 달라질 수 있어 widget/target 변경 patch는 특히 취약하다.

각 SDK upgrade 뒤 patch를 재생성/검토하고 필요한 hunk만 유지한다. patch가 적용되었다는 사실과 native build/동작 성공을 따로 확인한다. 반복적/공유 가능한 설정은 충분히 검증된 config plugin이나 native hook으로 옮기는 편이 유지 비용을 줄일 수 있다.

## 출처

- [Expo Documentation, Using a dangerous mod](https://docs.expo.dev/config-plugins/dangerous-mods)
- [Expo Documentation, Using patch-project](https://docs.expo.dev/config-plugins/patch-project)

## 관련 문서

- [[Expo-Home-Config-Mods]]
- [[Expo-Home-Config-Plugin-Libraries]]
