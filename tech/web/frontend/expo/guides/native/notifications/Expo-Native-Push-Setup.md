---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Push permission과 project token 등록"]
---

# Push permission과 project token 등록

## 준비와 native 설정

`npx expo install expo-notifications expo-constants`와 app config `plugins: ["expo-notifications"]`을 설정한다. plugin 설정과 credentials를 native binary에 반영한 development build가 필요하다.

현재 setup guide는 physical Android/iOS, Google Play services가 있는 Android Emulator, Xcode14+/macOS13+/iOS16+ 조합의 push 지원 iOS Simulator 테스트를 설명한다. 오래된 physical-only 제한을 모든 환경의 규칙으로 반복하지 않는다. 실제 simulator/provider 지원은 platform 조건을 확인한다.

## Registration 순서

Android는 notification channel을 먼저 만든다. Android13 notification permission prompt와 token registration 흐름에 영향을 주므로 channel을 token 요청 이후로 미루지 않는다. getPermissionsAsync로 기존 상태를 확인하고 필요한 경우 requestPermissionsAsync를 호출한다. denied를 정상 상태로 처리하고 사용자 허용 전에는 token 등록을 성공으로 기록하지 않는다.

```ts
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
const projectId = Constants.expoConfig?.extra?.eas?.projectId
  ?? Constants.easConfig?.projectId;
if (!projectId) throw new Error('Missing projectId');
const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
```

projectId는 EAS project UUID다. token을 해당 project에 귀속하면 account rename/transfer에 영향을 덜 받는다. runtime에서 명시적으로 전달하는 방식이 권장된다. projectId를 app slug나 Android package ID로 대체하지 않는다.

## Handler와 listener

foreground 표시를 원하면 setNotificationHandler에서 shouldPlaySound, shouldSetBadge, shouldShowBanner, shouldShowList를 반환한다. received listener는 수신 payload, response listener는 사용자 action을 받는다. subscription은 remove로 정리한다.

등록 오류 문자열을 token state에 넣은 tutorial UI는 오류 표시 예제이며 해당 문자열을 backend token으로 전송하지 않는다. token acquisition은 network/provider 문제로 reject하거나 지연될 수 있다. app의 전체 시작을 token 성공에 묶지 말고 push 의존 기능만 비활성화/재시도한다.

## Credentials와 확인

Android는 FCM V1 service account와 google-services.json이 필요하다. iOS는 Apple Developer 자격, APNs key와 앱 entitlement/provisioning을 맞춘다. EAS 첫 development build는 push setup/key 생성을 안내한다. EAS 없이 build할 때도 credentials와 native capability는 직접 준비한다.

development build 설치, Metro 실행, token 생성 후 Expo notifications test tool로 전송해 확인할 수 있다. device의 실제 수신, foreground/background behavior와 server receipts를 각각 확인한다. 앱 내 test send 함수는 검증용이며 production server의 권한/recipient 관리를 대신하지 않는다.

## 출처

- [Expo Documentation, Expo push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
