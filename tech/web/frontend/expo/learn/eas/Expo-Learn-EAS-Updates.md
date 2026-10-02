---
tags: [expo, react-native, eas]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update로 팀 preview 전달"]
---

# EAS Update로 팀 preview 전달

## Binary와 update의 compatibility

EAS Update는 JS/styles/images 같은 non-native 변경을 native runtime 위에 전달한다. native library나 native configuration 변경은 새 build를 요구한다. expo-updates 설치 뒤 이전 binary에 그 native module이 없으면 반드시 rebuild/install한다.

```sh
npx expo install expo-updates
eas update:configure
```

static config는 CLI가 updates URL/runtimeVersion과 eas.json channel을 기록할 수 있다. dynamic app.config.js는 제시된 값을 직접 복사하고 config가 실제 반환하도록 확인한다. simulator profile이 development를 extends하면 동일 channel을 상속할 수 있으므로 중복 channel을 별도로 둘 필요가 없다.

channel은 build를 update delivery 대상으로 묶는다. Android/iOS production builds가 production channel을 공유할 수 있다. channel이 branch로 매핑되고 branch에 update groups가 publish된다. 같은 channel 이름만으로 모든 native build가 무조건 호환되지는 않는다. platform/runtimeVersion이 일치하는 update가 대상이다.

## Publish와 확인

```sh
eas update --channel development --environment development --message "Change first button label"
eas update --channel preview --environment preview --message "Change first button label"
```

development build launcher는 account 로그인 후 Extensions/EAS Update의 branch를 선택해 preview한다. non-development preview/production은 configured startup check/download strategy에 따라 update를 받는다. 원문은 두 번 force close/reopen으로 download와 적용을 확인하는 기본 예시를 든다. 첫 launch에서 즉시 새 JS가 보인다고 보장하지 않는다.

update dashboard의 group/platform/runtime metadata와 실제 app UI를 확인한다. label change 같은 native 변경 없는 작은 예제로 먼저 delivery를 검증한다. APP_VARIANT와 build env, publish env도 맞춰 preview code가 production 설정을 실수로 포함하지 않도록 한다.

## 출처

- [Expo Documentation, Share previews with your team](https://docs.expo.dev/tutorial/eas/team-development)

- [Expo Documentation, Using environment variables](https://docs.expo.dev/eas/environment-variables/usage)

## 관련 문서

- [[Expo-Learn-EAS-Variants]]
- [[Expo-Home-Release-Updates]]
