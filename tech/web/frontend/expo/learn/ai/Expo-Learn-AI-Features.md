---
tags: [expo, react-native, ai]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["AI prompt로 사진과 sticker 기능 구체화"]
---

# AI prompt로 사진과 sticker 기능 구체화

## 화면 요구를 관찰 기준으로 바꾸기

Home/About 두 tabs, Expo Router, dark background/header/tab bar `#25292e`, white text, selected yellow `#ffd33d`, @expo/vector-icons를 사용하는 요구를 먼저 정의한다. tabs는 누른 화면으로 바뀌고 active color와 icon이 현재 상태를 나타내야 한다.

asset pack의 background-image와 emoji images를 `assets/images`에 둔다. 원문 download/extract prompt는 같은 이름 파일을 대체하므로 existing project에 적용할 때는 덮어쓰기 범위를 확인한다. expo-image로 rounded large photo를 가운데 표시하고 prominent Choose a photo button, plain Use this photo button을 아래에 둔다.

expo-image-picker는 선택한 사진 URI로 placeholder를 대체한다. cancel은 현재 사진을 유지해야 한다. system picker의 permission 요구는 OS와 SDK에 따라 달라지므로 항상 광범위한 library read 권한이 필요하다고 가정하지 않는다.

## 상태 전환과 sticker 선택

사진을 선택하거나 Use this photo를 누르면 photo selection buttons에서 editing options로 전환한다. Reset은 original buttons로 돌아가고 중앙 +는 bottom modal을 연다. modal title은 Choose a sticker이고 asset emoji를 horizontal list에 표시한다. item 선택은 modal close와 selected sticker update를 함께 수행한다.

구현에는 사진, 편집 모드, modal visibility, selected emoji 상태가 따로 필요하다. Reset 요구가 모든 사진/sticker/transform을 지울지, 버튼 모드만 되돌릴지는 명시한다. 원문의 요구만으로 이미 선택한 사진과 sticker가 반드시 삭제된다고 추론하지 않는다.

sticker overlay가 사진 위에 배치되는지, modal가 scroll되며 바깥 UI와 충돌하지 않는지, close/reopen 뒤 선택이 유지되는지 실제 device에서 확인한다. Android back button의 modal close도 UI 구현에서 처리할 동작이다.

## Gesture의 성공 기준

react-native-gesture-handler와 react-native-reanimated로 drag, double tap resize를 만든다. Double tap마다 original size와 doubled size 사이를 전환하고 이동/resize는 부드럽게 보여야 한다.

drag가 매 event마다 시작 좌표로 돌아오면 누적 offset/gesture delta를 확인한다. sticker가 급히 뛰면 absolute pointer position와 relative translation을 섞었는지 확인한다. scale 시 position과 capture 영역의 관계도 검증한다. agent가 API를 사용했다는 사실보다 손가락을 떼도 위치가 유지되는지, 재차 drag가 자연스러운지가 결과 기준이다.

## 저장과 platform branch

Save option은 download icon과 함께 제공한다. native에서는 photo+sticker를 담은 View만 react-native-view-shot으로 capture하고 expo-media-library에 저장한다. navigation/button/modal까지 capture되지 않아야 한다. save permission을 거부하면 성공 alert를 표시하지 않고 실패 또는 대안을 안내한다.

SDK57 저장은 `Asset.create(localUri)` modern API를 기준으로 한다. tutorial의 오래된 `saveToLibraryAsync`를 유지한다면 `expo-media-library/legacy` import가 필요하다. photo picker permission과 media save permission은 분리한다.

web에서는 browser DOM capture로 합성 후 file download한다. 원문은 dom-to-image를 예시로 사용한다. Platform web branch에서 실행하고 native-only library를 그대로 호출하지 않는다. browser마다 CORS/image/font capture와 download 동작을 확인한다. native gallery 저장과 browser download initiation은 서로 다른 완료 상태다.

## 마감과 다음 변경

expo-status-bar로 dark UI 위 clock/battery/signal이 light로 보이게 한다. `expo.icon`과 expo-splash-screen config plugin에 icon, splash image, `#25292e` background를 구성한다. 원문이 Android/iOS/web splash를 함께 요청하더라도 config plugin은 native build 변경 경로이며 web loading UI는 별도로 확인한다.

Expo Go의 home-screen icon은 host app icon이므로 custom app icon은 standalone/dev/production build에서 확인한다. Go와 development build의 splash 표현은 production과 다를 수 있어 release build에서 launch를 검증한다.

여러 sticker, system share sheet, About 설명은 후속 확장 예시다. 구현된 기능으로 간주하지 않고 data model과 permission/platform 요구를 새로 정의한 뒤 같은 prompt/build/verify 반복을 적용한다.

## 출처

- [Expo Documentation, Build the home screen](https://docs.expo.dev/tutorial/build-with-ai/build-the-home-screen)
- [Expo Documentation, Add stickers](https://docs.expo.dev/tutorial/build-with-ai/add-stickers)
- [Expo Documentation, Save your creation](https://docs.expo.dev/tutorial/build-with-ai/save-your-creation)
- [Expo Documentation, Finishing touches](https://docs.expo.dev/tutorial/build-with-ai/finishing-touches)

## 관련 문서

- [[Expo-Learn-App-Gestures]]
- [[Expo-Learn-App-Capture]]
- [[Expo-Learn-App-Finishing]]
- [[Expo-Learn-AI-Workflow]]
