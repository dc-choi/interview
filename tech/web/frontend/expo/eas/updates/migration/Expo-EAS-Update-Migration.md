---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["CodePush와 Classic Updates에서 EAS Update로 전환"]
---

# CodePush와 Classic Updates에서 EAS Update로 전환

업데이트 공급자를 바꾸는 native 변경에는 rebuild와 store 재제출이 필요하다. 기존 binary가 자동으로 새 library를 받는 migration은 아니다. 사용 중인 Expo SDK와 지원 RN을 맞추고 다른 OTA library가 동시에 bundle을 선택하지 않도록 제거한다.

## CodePush 제거와 개념 대응

react-native-code-push package뿐 아니라 JS wrapper와 Android/iOS loader 등 모든 연결을 제거하고 debug/release가 정상인지 확인한다. app.json에 expo 객체를 두고 [[Expo-EAS-Update-Setup]]의 Metro, library와 native 설정을 적용한다. brownfield는 [[Expo-EAS-Update-Native-Integration]]을 따른다.

CodePush deployment stream은 기본 client target 선택이고 EAS는 build channel→server branch pointer→최신 compatible update로 선택한다. 같은 native binary에서 channel surfing으로 preview할 수 있으며 URL override는 anti-bricking 해제 위험을 가진 별도 기능이다. migration FAQ의 URL override만 사용하라는 오래된 방향보다 header-only surfing을 먼저 검토한다.

CodePush --mandatory에 대응하는 first-class EAS flag는 없고 앱 정책을 구현한다. CLI --message는 Dashboard 운영 설명이며 사용자에게 보여줄 description은 app config.extra 등 앱이 읽을 metadata로 설계한다. channels/branches, rollouts, rollback, check/fetch/reload와 signing은 각 reference를 연결한다. fingerprint:compare는 native 변경 원인을 확인하고 runtime bump 판단에 도움을 주지만 자동 호환성 증명은 아니다.

## Classic Updates 역사와 SDK57 migration

Classic은 deprecated이며 SDK49가 마지막 지원이다. 원문의 useClassicUpdates와 최소 SDK45/CLI0.50/expo-updates0.13은 역사적인 migration 범위이고 SDK57 권장 설정이 아니다. 새 expo publish는 제공되지 않으며 기존 활성 Classic update 수신과 EAS 지원을 구분한다.

update:configure로 updates.url/runtimeVersion/projectId를 설정하고 이전 expo.sdkVersion 필드를 제거한다. eas.json releaseChannel을 channel로, Updates.releaseChannel을 Updates.channel로 바꾼다. Constants.manifest 대신 Constants.expoConfig를 검토한다. scripts의 expo publish는 eas update --channel <name> --environment <env>로 전환한다. 변경은 native layer에 영향을 주므로 새 preview/production build와 업데이트 경로를 검증한다.

## 출처

- [Expo Documentation, Migrate from CodePush](https://docs.expo.dev/eas-update/codepush)
- [Expo Documentation, Migrate from Classic Updates](https://docs.expo.dev/eas-update/migrate-from-classic-updates)

## 관련 문서

- [[Expo-EAS-Update-Setup]]
- [[Expo-EAS-Update-Native-Integration]]
- [[Expo-EAS-Update-Channel-Surfing]]
