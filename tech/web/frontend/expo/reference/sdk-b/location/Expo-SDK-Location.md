---
tags: [expo, expo-sdk, location]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Foreground Location"]
---

# Expo SDK Foreground Location

expo-location은 Android/iOS/web의 위치 fix, foreground subscription, geocoding, heading과 motion activity를 제공한다. background tracking/geofence는 [[Expo-SDK-Location-Background]]에 분리한다. npx expo install expo-location 후 namespace import한다. Expo Go foreground는 가능하지만 native background/foreground service는 development build가 필요하다.

## 권한과 provider

get/requestForegroundPermissionsAsync():Promise<LocationPermissionResponse>와 useForegroundPermissions()의 [response|null, request, get]로 조회/요청한다. response는 status(granted/denied/undetermined), granted, canAskAgain, expires와 Android accuracy(fine/coarse/none), iOS accuracy(full/reduced), scope(whenInUse/always/none)를 제공한다. granted가 precise 위치를 뜻하지 않는다. iOS Allow Once는 현재 session만 유효하며 API로 While Using과 구분할 수 없다.

hasServicesEnabledAsync():Promise<boolean>와 getProviderStatusAsync():Promise<{locationServicesEnabled, backgroundModeEnabled, gpsAvailable?, networkAvailable?, passiveAvailable?}>는 권한과 별도로 device provider 상태를 확인한다. Android enableNetworkProviderAsync()는 Google Play services high accuracy dialog를 열고 수락 resolve/거절 reject한다. installWebGeolocationPolyfill():void는 navigator.geolocation interoperability용이다.

## One-shot과 subscription

getCurrentPositionAsync(options={}):Promise<LocationObject>는 새 fix를 얻느라 실내에서 수초 지연될 수 있다. getLastKnownPositionAsync({maxAge, requiredAccuracy}):Promise<LocationObject|null>은 cached 위치의 age(ms)/uncertainty(m) 조건을 검사해 빠르게 반환한다. stale 여부를 UI에 반영한다.

```ts
const permission = await Location.requestForegroundPermissionsAsync();
if (!permission.granted) return;
const position = await Location.getLastKnownPositionAsync({maxAge:30_000,requiredAccuracy:100})
  ?? await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
```

LocationObject는 epoch-ms timestamp, coords와 Android mocked?다. coords latitude/longitude는 degrees, accuracy/altitude/altitudeAccuracy는 meters, speed는 m/s, heading은 north0/east90 clockwise degrees이며 unavailable 값은 null이다. mock flag만으로 위치 authenticity 전체를 증명하지 않는다.

Accuracy Lowest(3km)/Low(1km)/Balanced(default100m)/High(10m)/Highest/BestForNavigation은 requested quality와 power tradeoff이며 실제 보장 오차가 아니다. options.distanceInterval meters, Android timeInterval ms, mayShowUserSettingsDialog=true를 설정한다. watchPositionAsync(options, callback, errorHandler?):Promise<{remove}>는 foreground에서만 업데이트하고 errorHandler는 string을 받는다. async subscription 생성 전에 unmount될 수 있으므로 cancel flag와 remove cleanup을 모두 고려한다.

## Geocoding과 heading

geocodeAsync(address):Promise<LocationGeocodedLocation[]>는 latitude/longitude와 optional altitude/accuracy를 반환한다. reverseGeocodeAsync({latitude, longitude}):Promise<LocationGeocodedAddress[]>는 city/country/district/region/subregion/street/streetNumber/name/postalCode/isoCountryCode 등 nullable fields, Android formattedAddress, iOS timezone을 제공한다. Android foreground permission이 필요하다. 요청량이 많으면 error가 나며 즉시 보여주지 않을 background geocoding은 피한다.

getHeadingAsync():Promise<LocationHeadingObject>는 몇 update 중 정확한 값을 고른다. watchHeadingAsync(callback, error?):Promise<subscription>으로 구독한다. magHeading은 magnetic north, trueHeading은 location permission이 없으면-1이다. accuracy0..3은 none/low/medium/high이며 iOS uncertainty 기준 >50/<50/<35/<20degrees다.

## Motion activity

get/requestMotionActivityPermissionsAsync 및 useMotionActivityPermissions()는 location과 별도 permission이다. Android10+ ACTIVITY_RECOGNITION, iOS Motion/Fitness와 plugin motionUsagePermission이 필요하다. getMotionActivityAsync():Promise<MotionActivityObject>는 첫 update 후 unsubscribe한다. watchMotionActivityAsync(callback, error?)는 foreground 전용이다.

결과는 timestamp와 activities record(automotive/cycling/running/stationary/unknown/walking)이며 각 {detected, confidence:Low0/Medium1/High2}다. detected=false면 Low, Android는 활동별 probability bucket, iOS는 detected activities 공통 reading confidence다. enum overview의 highest-priority 설명과 record 계약을 혼동해 하나의 단일 activity string으로 읽지 않는다. emulator는 location을 enable하고 iOS simulated location을 None 이외로 지정한다.

## 출처

- [Expo Documentation, Location](https://docs.expo.dev/versions/latest/sdk/location)

## 관련 문서

- [[Expo-SDK-Location-Background]]
- [[Expo-SDK-Maps]]
- [[Expo-SDK-TaskManager]]
