---
tags: [expo, expo-sdk, location]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Background Location과 Geofence"]
---

# Expo SDK Background Location과 Geofence

expo-location background 기능은 top-level [[Expo-SDK-TaskManager]] definition과 foreground/background 권한, native build 설정이 함께 필요하다. 원문 methods의 web 지원 배지는 TaskManager의 web=false와 충돌하므로 web background 실행 지원으로 해석하지 않는다.

## Native 설정과 permission flow

plugin은 iOS locationWhenInUsePermission/locationAlwaysAndWhenInUsePermission, motionUsagePermission을 설정한다. locationAlwaysPermission(NSLocationAlwaysUsageDescription)은 deprecated다. isIosBackgroundLocationEnabled=false는 UIBackgroundModes location, isAndroidBackgroundLocationEnabled=false는 ACCESS_BACKGROUND_LOCATION을 enable한다. isAndroidForegroundServiceEnabled는 background enable시 기본 true, 아니면 false이며 FOREGROUND_SERVICE/Android14+FOREGROUND_SERVICE_LOCATION을 포함한다. androidForegroundServiceIcon은 96x96 monochrome white/transparent PNG다. 없으면 notification_icon→launcher fallback이고 full-color launcher는 흰 사각형이 될 수 있다.

Android coarse/fine은 자동 추가, background/service는 별도 use case와 store review가 필요하다. iOS background mode는 Info.plist가 authoritative 대상이며 원문 manual subsection의 Expo.plist 표기는 같은 source의 반복 Info.plist 설명과 불일치한다. config plugin 또는 실제 native target 설정을 확인한다.

get/requestBackgroundPermissionsAsync/useBackgroundPermissions로 상태를 다룬다. Android11+ request는 settings를 열기 전 사용 이유를 설명하고 foreground grant부터 얻는다. iOS Always가 필요하며 foreground Allow Once 뒤 같은 session의 background request는 prompt 없이 denied될 수 있다. Allow Once 여부를 확정할 API는 없고 settings를 안내한다. iOS 직접 background request도 먼저 When In Use를 받고 system이 Always 필요 시 prompt하므로 Always를 가정하지 않는다. isBackgroundLocationAvailableAsync():Promise<boolean>으로 환경을 확인한다.

## Location task

startLocationUpdatesAsync(taskName, options):Promise<void>는 registration 완료시 resolve하고 task data.locations 배열을 전달한다. hasStartedLocationUpdatesAsync():Promise<boolean>, stopLocationUpdatesAsync():Promise<void>로 조회/해제한다. definition 예제의 parameter에서 data.locations를 바로 destructure하면 error/no-data 호출시 throw할 수 있으므로 body를 먼저 검사한다.

```ts
TaskManager.defineTask('tracking', async ({data,error})=>{
  if (error || !data) return;
  await saveBatch(data.locations);
});
await Location.startLocationUpdatesAsync('tracking', {
  accuracy:Location.Accuracy.Balanced, distanceInterval:50,
  foregroundService:{notificationTitle:'위치 기록',notificationBody:'기록 중'}
});
```

LocationTaskOptions는 foreground options에 deferredUpdatesDistance(m)/deferredUpdatesInterval(ms)/deferredUpdatesTimeout, iOS activityType(Other/AutomotiveNavigation/Fitness/OtherNavigation/Airborne), pausesUpdatesAutomatically=false, showsBackgroundLocationIndicator=false를 더한다. deferred는 background에만 적용한다. overview deferredTimeout과 실제 type deferredUpdatesTimeout의 이름이 달라 type 이름을 따른다. foregroundService는 notificationTitle/body/color(#RRGGBB/#AARRGGBB), killServiceOnDestroy를 받는다. 빈번한 high-accuracy update와 battery cost를 조정한다.

## Geofence와 종료 한계

startGeofencingAsync(taskName, regions=[]):Promise<void>는 재호출로 기존 region set을 갱신한다. hasStartedGeofencingAsync()/stopGeofencingAsync()로 관리한다. region은 identifier(defaultUUID), latitude/longitude, radius(m), notifyOnEnter/Exit=true, state Unknown0/Inside1/Outside2다. task data={eventType:Enter1|Exit2, region}이며 Android 최대 100, iOS 동시 20과 startup initial state reporting 제한이 있다.

일반 background tracking은 user termination에서 중단되고 앱 재시작 시 재개된다. Android terminated app은 location/geofence로 자동 시작하지 않으며 recent-app removal의 kill 의미는 vendor별이다. iOS는 새 geofence event에서 terminated app을 재시작할 수 있다. 이를 모든 task가 종료 후 항상 실행된다는 보장으로 확장하지 않는다.

## 출처

- [Expo Documentation, Location](https://docs.expo.dev/versions/latest/sdk/location)

## 관련 문서

- [[Expo-SDK-Location]]
- [[Expo-SDK-TaskManager]]
