---
tags: [expo, expo-sdk, communication]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK 네트워크 상태"]
---

# Expo SDK 네트워크 상태

expo-network는 Android/iOS/tvOS/web의 연결 상태와 IP를 제공한다. npx expo install expo-network, import * as Network from 'expo-network'. Android ACCESS_NETWORK_STATE/ACCESS_WIFI_STATE는 자동 추가된다.

useNetworkState()는 state 변경을 구독하고 자동 cleanup한다. getNetworkStateAsync():Promise<NetworkState>와 addNetworkStateListener(callback)의 remove 가능한 subscription을 imperative 코드에서 사용한다. state의 type/isConnected/isInternetReachable은 optional이다. type은 NONE/UNKNOWN/CELLULAR/WIFI/BLUETOOTH/ETHERNET/WIMAX/VPN/OTHER다. web connection type을 알 수 없으면 연결 중에도 UNKNOWN일 수 있으므로 enum만으로 online 여부를 단정하지 않는다.

```ts
const state = await Network.getNetworkStateAsync();
if (state.isInternetReachable === false) showOfflineState();
```

Android internet reachability는 INTERNET+VALIDATED capability 등 usable network 조건을 확인한다. iOS는 isConnected와 같아 특정 backend까지 도달함을 보장하지 않는다. web도 브라우저 상태와 실제 API 응답을 별도로 다룬다. isAirplaneModeEnabledAsync는 Android airplane mode를 조회한다.

getIpAddressAsync():Promise<string>은 native에서 main interface IPv4 또는 0.0.0.0, web은 ipify 외부 요청을 통한 public IP다. local IP와 public IP를 혼동하지 않으며 web 호출은 제 3자 네트워크 요청이다. source의 MAC 주소 소개와 ERR_NETWORK_UNDEFINED_INTERFACE/getMacAddressAsync 관련 historical error는 현재 method 목록에 MAC API가 없으므로 새 사용 예제로 복제하지 않는다. IP 조회는 interface/socket/permission failure로 reject할 수 있다.

## 출처

- [Expo Documentation, Network](https://docs.expo.dev/versions/latest/sdk/network)

## 관련 문서

- [[Expo-SDK-B]]
