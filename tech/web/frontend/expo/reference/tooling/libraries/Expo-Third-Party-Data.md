---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 외부 라이브러리와 데이터 접근"]
---

# Expo 외부 라이브러리와 데이터 접근

## 지원 범위와 설치

Expo Go에 들어 있는 외부 라이브러리는 SDK와 함께 호환성을 확인한 묶음이다. 이 목록이 development build에서 사용할 수 있는 라이브러리 전체를 제한하지 않는다. 선택한 패키지는 `npx expo install <package>`로 SDK에 맞는 버전을 설치한다. 기존 React Native 앱에서는 먼저 Expo Modules 구성을 갖추고 해당 패키지의 네이티브 설치 지침도 따른다.

## AsyncStorage

`@react-native-async-storage/async-storage`는 Android, iOS, macOS, tvOS, 웹에서 비동기 키-값 저장소를 제공한다. Expo Go에도 포함된다. 저장 내용은 암호화하지 않는다. 앱 재시작 뒤 유지할 일반 설정이나 캐시와 보안 저장이 필요한 토큰을 구분한다.

```sh
npx expo install @react-native-async-storage/async-storage
```

Expo reference는 설치와 지원 플랫폼을 정의하고 상세 API는 패키지 문서로 연결한다. 키별 읽기, 쓰기와 직렬화 방식은 선택한 패키지 버전의 API를 확인한다. 비동기 저장 완료 전에 화면을 닫는 경우를 성공으로 처리하지 않는 등 실패 처리도 앱의 책임이다.

## NetInfo

`@react-native-community/netinfo`는 Android, iOS, tvOS, 웹과 Expo Go에서 연결 유형과 연결 상태를 읽는다. `fetch()`는 현재 상태의 Promise, `addEventListener()`는 이후 변경 구독과 해제 함수를 제공한다.

```ts
import NetInfo from '@react-native-community/netinfo';

const state = await NetInfo.fetch();
console.log(state.type, state.isConnected);
const unsubscribe = NetInfo.addEventListener((next) => {
  console.log(next.type, next.isConnected);
});
// 컴포넌트나 서비스 종료 시 호출한다.
unsubscribe();
```

Wi-Fi SSID는 `state.details.ssid`로 읽지만 위치 권한과 플랫폼 제약이 적용된다. iOS에서는 `ios.entitlements`의 `com.apple.developer.networking.wifi-info: true`와 Apple App Identifier의 Access WiFi Information capability를 구성하고 바이너리를 다시 빌드해야 한다. 위치 권한은 실제 기능이 요구하는 범위로 요청한다.

연결됨 상태만으로 특정 API 서버에 요청이 성공한다고 판단할 수 없다. 네트워크 표시와 요청 자체의 timeout, 재시도를 별도로 설계한다.

## 출처

- [Expo Documentation, Third-party libraries supported in Expo Go](https://docs.expo.dev/versions/latest/sdk/third-party-overview)
- [Expo Documentation, @react-native-async-storage/async-storage](https://docs.expo.dev/versions/latest/sdk/async-storage)
- [Expo Documentation, @react-native-community/netinfo](https://docs.expo.dev/versions/latest/sdk/netinfo)

## 관련 문서

- [[Expo-Third-Party-Libraries]]

- [[Expo]]
