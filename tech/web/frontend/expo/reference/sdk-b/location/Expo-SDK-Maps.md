---
tags: [expo, expo-sdk, location]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Alpha Native Maps"]
---

# Expo SDK Alpha Native Maps

expo-maps는 alpha이며 빈번한 breaking change를 예상해야 한다. iOS Apple Maps, Android Google Maps만 지원하고 Expo Go는 미지원이다. npx expo install expo-maps 후 AppleMaps/GoogleMaps를 import하고 platform 분기로 View를 표시한다. iOS Google Maps provider 선택은 제공하지 않는다.

## Native 설정과 user location

Apple Maps는 별도 API key가 필요 없다. Android는 Google Cloud Maps SDK for Android를 enable하고 android.package와 signing SHA1로 제한한 key를 android.config.googleMaps.apiKey에 넣고 rebuild한다. Play App Signing certificate와 development keystore fingerprint가 다를 수 있어 실제 binary의 key restriction을 맞춘다. key 발급/upload/build 절차는 source 설명이며 이번 문서화에서 수행한 작업이 아니다.

plugin requestLocationPermission=false는 native permission declaration 추가 여부, locationPermission은 iOS usage message다. 선언과 runtime grant는 다르다. getPermissionsAsync/requestPermissionsAsync():Promise<PermissionResponse>와 useLocationPermissions()의[status|null, request, get]로 상태를 다룬다. map 표시만으로 위치 권한이 필요한 것은 아니고 my-location 표시 전에 얻는다. source의 Android permission table은 background/service 항목도 포함하지만 지도 표시에 그 모든 권한이 필요하다고 확장하지 않는다.

```tsx
if (Platform.OS === 'ios') return <AppleMaps.View style={{flex:1}} />;
if (Platform.OS === 'android') return <GoogleMaps.View style={{flex:1}} />;
return <Text>지원 플랫폼 밖입니다.</Text>;
```

## 공통 camera와 overlay

cameraPosition은 initial {coordinates:{latitude, longitude}, zoom}이다. ref.setCameraPosition()으로 이후 camera를 변경한다. Google은 duration(ms)를 받지만 iOS animation duration은 미지원이다. onCameraMove는 initial mount에도 호출되며 coordinates/zoom/bearing/tilt/latitudeDelta/longitudeDelta를 전달한다. 낮은 zoom은 view 크기에 따라 불가능할 수 있다.

markers, circles, polygons, polylines 배열에 id를 붙여 click event를 domain item과 연결한다. circle은 center/radius(m)/fill color/lineColor/lineWidth, polygon은 coordinates/색/line, polyline은 coordinates/색/width와 Apple contourStyle GEODESIC/STRAIGHT 또는 Google geodesic을 받는다. Google circle clickCoordinates는 실제 tap 위치다. onMapClick은 POI/marker click에서는 실행되지 않는다. 각 overlay의 on...Click은 해당 object를 전달한다.

## Apple Maps

markers는 coordinates/id/title/tintColor/systemImage 또는 iOS17+monogram을 받으며 둘 다 있으면 systemImage가 우선한다. custom image는 annotations를 사용한다. annotation은 marker fields+backgroundColor/text/textColor/icon SharedRef<'image'>다. expo-image useImage 결과를 넣고 ImageSource 객체를 직접 넣지 않는다.

properties는 isMyLocationEnabled=false, isTrafficEnabled, mapType(STANDARD/IMAGERY/HYBRID), elevation(AUTOMATIC/FLAT/REALISTIC), emphasis(AUTOMATIC/MUTED), selectionEnabled, polylineTapThreshold(default20m), pointsOfInterest{including/excluding}다. including:[]는 모두숨김, excluding:[]는 모두표시라 빈 배열 의미가 반대다. POI category는 airport/bank/park/restaurant/sport/transport 등 Apple enum을 사용한다. colorScheme AUTOMATIC/LIGHT/DARK를 설정한다.

uiSettings는 compassEnabled(회전시 표시), myLocationButtonEnabled, scaleBarEnabled, togglePitchEnabled다. ref.openLookAroundAsync(coordinates):Promise<void>, iOS18+selectMarker/selectAnnotation(id,{moveCamera, zoom}):void를 제공한다. 설명은 undefined로 selection clear를 허용하지만 type 표시는 string이어서 설치 버전 타입을 확인한다.

## Google Maps와 Street View

marker는 id/coordinates/title/snippet/draggable/showCallout/zIndex(default0)/icon/anchor를 받는다. icon은 useImage의 native image ref, 실제 로드 image dimensions가 marker 크기를 정한다. SVG width/height/viewBox 또는 hook maxWidth/maxHeight로 제한한다. anchor{x, y}는 0..1이며 기본 bottom-center다.

properties는 isBuildingEnabled/isIndoorEnabled/isMyLocationEnabled/isTrafficEnabled, mapType NORMAL/SATELLITE/TERRAIN/HYBRID, mapStyleOptions{json}, minZoomPreference/maxZoomPreference, selectionEnabled다. mapOptions.mapId는 Cloud styling identifier, colorScheme FOLLOW_SYSTEM/LIGHT/DARK다. contentPadding{top, bottom, start, end}는 logo/UI가 obscured region을 피하게 하고 start/end는 RTL에 맞춰 바뀐다. userLocation{coordinates, followUserLocation}은 기본 위치 동작을 override한다.

uiSettings는 compass/indoorLevelPicker/mapToolbar/myLocationButton/scaleBar/rotation/scroll/scrollDuringRotateOrZoom/tilt/togglePitch/zoomControls/zoomGestures flags다. onMapLoaded/onMapLongClick/onPOIClick({coordinates, name})도 제공한다. ref.selectMarker():Promise<void>는 camera animation이며 빠른 연속호출로 이전 animation이 취소되면 reject할 수 있다.

GoogleStreetView는 position{coordinates, bearing?, tilt?, zoom?}, style과 isPanningGesturesEnabled/isStreetNamesEnabled/isUserNavigationEnabled/isZoomGesturesEnabled를 받는다. 모든 위치에 Street View/Look Around imagery가 존재한다는 보장은 아니다.

## 출처

- [Expo Documentation, Maps](https://docs.expo.dev/versions/latest/sdk/maps)

## 관련 문서

- [[Expo-SDK-Location]]
- [[Expo-SDK-Symbols]]
