---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Cellular carrier와 connection generation"]
---

# Cellular carrier와 connection generation

## 설치와 권한

`npx expo install expo-cellular`, `import * as Cellular from 'expo-cellular'`. Android/iOS/web/Expo Go를 지원하지만 carrier metadata methods는 Android 중심이다. Android READ_PHONE_STATE를 선언하고 getPermissionsAsync/requestPermissionsAsync 또는 usePermissions로 확인한다. READ_PRIVILEGED_PHONE_STATE는 필요하지 않다. iOS는 별도 permission이 없다.

| Method | 결과 |
|---|---|
| getCarrierNameAsync | active SIM carrier name 또는 null, SIM_READY 필요 |
| getIsoCountryCodeAsync | carrier ISO country 또는 null |
| getMobileCountryCodeAsync | MCC string/null |
| getMobileNetworkCodeAsync | MNC string/null |
| getCellularGenerationAsync | UNKNOWN/2G/3G/4G/5G enum |
| allowsVoipAsync | Android SIP VoIP support, deprecated, iOS/web null |

carrier methods는 iOS/web에서 null을 반환한다. 원문의 오래된 iOS SIM 조건 설명을 현재 지원으로 해석하지 않는다. dual SIM에서는 active SIM만 반환하며 사용자 위치/국적을 나타내는 값이 아니다.

## Generation 해석

CellularGeneration은 UNKNOWN0, CELLULAR_2G1, 3G2, 4G3, 5G4 다. permission denied이면 UNKNOWN 으로 resolve 할 수 있다. web는 navigator.connection.effectiveType의 RTT/downlink 추정이므로 실제 이동통신 radio generation과 동일한 측정이 아니다. browser support 차이를 고려한다.

```ts
const permission = await Cellular.getPermissionsAsync();
if (permission.granted) {
  const generation = await Cellular.getCellularGenerationAsync();
  console.log(generation);
}
```

ERR_CELLULAR_GENERATION_UNKNOWN_NETWORK_TYPE는 network type에 접근할 수 없거나 cellular에 연결되지 않은 경우다. carrier metadata 나 estimated generation은 실제 internet reachability, bandwidth와 요금제를 보장하지 않는다. null/unknown을 정상 unavailable 상태로 처리한다.

## 출처

- [Expo Documentation, Cellular](https://docs.expo.dev/versions/latest/sdk/cellular)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
