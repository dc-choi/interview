---
tags: [expo, expo-integrations, user-interface]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 아이콘과 store listing asset"]
---

# Expo 아이콘과 store listing asset

앱 안의 icon font와 store에 올리는 image/video는 별 artifact다. 아이콘이 render됐다는 사실과 store asset format/표현이 승인될 조건을 구분한다.

## Vector icon과 custom font

원문은 @expo/vector-icons의 예정된 deprecation과 @react-native-vector-icons 이전을 안내한다. 기존 API 이해를 위해 name/size/color로 FontAwesome/Ionicons 등을 render하고 iconset.font object를 preload하는 패턴을 남긴다. 새 프로젝트의 기본 권장으로 고정하지 않는다.

createIconSet(glyphMap,fontFamily,fontFileName?)는 이름→UTF8 character/character code mapping으로 component를 만든다. fontFamily는 파일명과 다르며 Android의 third argument는 font filename이다. IcoMoon은 selection.json/ttf, Fontello는 config.json/ttf를 보관하고 useFonts/Font.loadAsync로 먼저 로드한다. createIconSetFromIcoMoon은 source 시점 old JSON format만 지원해 new IcoMoon export를 그대로 넣지 않는다.

Font.Button은 Text/Touchable props와 children, onPress를 받는다. 기본 color white, size20, iconStyle marginRight10, backgroundColor#007AFF, borderRadius5다. icon-only color/margin은 iconStyle로 설정한다. Font.Button onPress가 인증 API를 제공하는 것은 아니다.

## Store asset 제작 방식

실기기 screenshot은 정확하고 간단하지만 device별 capture가 필요하다. screenshot을 design 안에 넣으면 설명을 추가할 수 있고 product 요소를 적극 구성하면 디자인/유지 비용이 늘어난다. 어느 방식이든 실제 앱 경험을 정확히 표현해야 한다.

| 대상 | 원문 기준 artifact |
| --- | --- |
| Play icon | 별도 listing upload,512x512,32bit PNG alpha, 최대1024KB |
| Play feature graphic | 1024x500,JPEG/24bit PNG noalpha |
| Play screenshot | source는4-10과1024x500~3840/9:16을 제시. current Play device별 조건과 구분 |
| Play video | optional YouTube URL 1개 |
| iPhone screenshot | dynamic island6.9inch 계열,1320x2868 또는1290x2796,JPG/PNG noalpha |
| iPad screenshot | iPad지원 앱은2064x2752 또는2048x2732 set |
| Apple preview | screen size별 최대3 video, optional |

Apple screenshot은 localization당 최대10, portrait/landscape를 지원하고 미제공 size는 가까운 size를 scale한다. 원문은 Apple screenshot minimum2와 Play minimum4를 고정해 두었으나 store requirements는 변하므로 제출 전에 공식 screenshot/preview 규격을 다시 확인한다. 한 pixel 차이도 reject될 수 있다. Apple icon은 bundle에서 가져오지만 Google Play listing icon은 별도로 업로드한다. localized text가 있는 image는 locale별 asset을 제공한다.

## 출처

- [Expo Documentation, Expo Vector Icons](https://docs.expo.dev/guides/icons)
- [Expo Documentation, Create app store assets](https://docs.expo.dev/guides/store-assets)

## 관련 문서

- [[Expo-Integrations-Localization]]
- [[Expo-Router-Native-Tabs-Options]]
