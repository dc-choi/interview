---
tags: [expo, react-native, app]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Modal과 FlatList로 스티커 선택"]
---

# Expo Modal과 FlatList로 스티커 선택

## State와 UI 책임

`showAppOptions`는 사진 선택 이후 Reset/Add/Save 버튼을 표시하고 `isModalVisible`은 picker overlay, `pickedEmoji`는 선택된 sticker source다. 같은 boolean으로 모두 제어하면 close/reset/selection의 상태 의미가 섞인다.

Reset은 tutorial에서 options만 숨기지만 완전 초기화를 원하면 selectedImage, pickedEmoji와 gesture position까지 reset할지 정한다. options만 닫는 예제를 전체 상태 초기화로 설명하지 않는다.

CircleButton은 plus icon/Pressable, IconButton은 icon/label/callback을 받는다. `icon: keyof typeof MaterialIcons.glyphMap`으로 허용 icon name을 제한할 수 있다. icon-only button에는 접근성 label/role을 제공한다.

## Controlled modal

```tsx
import { type PropsWithChildren } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';

export const EmojiPicker = ({ isVisible, onClose, children }: PropsWithChildren<{
  isVisible: boolean; onClose: () => void;
}>) => <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
  <View style={{ position: 'absolute', bottom: 0, height: '25%', width: '100%', backgroundColor: '#25292e' }}>
    <Text>스티커 선택</Text>
    <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="선택 창 닫기">
      <Text>닫기</Text>
    </Pressable>
    {children}
  </View>
</Modal>;
```

visible은 parent state, close callback은 false로 변경한다. transparent는 content 바깥에 투명 배경을 허용하며 Modal 자체는 앱 위에 표시된다. 하단25%와 slide는 예제 styling이지 native bottom sheet component의 모든 behavior를 제공하는 것은 아니다. Android back에는 onRequestClose를 연결한다.

## FlatList 선택

```tsx
import { FlatList, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';

<FlatList horizontal data={emojiSources}
  showsHorizontalScrollIndicator={Platform.OS === 'web'}
  renderItem={({ item }) => <Pressable onPress={() => { onSelect(item); onCloseModal(); }}>
    <Image source={item} style={{ width: 100, height: 100, marginRight: 20 }} />
  </Pressable>}
/>;
```

`emojiSources`는 static PNG require 배열이다. data/renderItem으로 목록을 구성하고 선택 시 parent의 pickedEmoji를 갱신한 뒤 modal을 닫는다. contentContainerStyle은 item 영역, list style은 scroll container 자체에 적용된다. web만 scrollbar를 보여줄 수 있다.

고정 작은 배열은 index key로 시작할 수 있지만 변경/정렬되는 데이터에는 stable item ID로 keyExtractor를 제공한다. component state가 필요 없는 immutable asset 목록을 useState에 둘 의무는 없다.

## Sticker overlay

ImageViewer와 EmojiSticker를 같은 composition container에 둔다. source와 imageSize를 sticker에 전달하고 selected source가 있을 때만 렌더링한다. tutorial의 `top: -350`은 fixed image 크기 위에 겹치기 위한 단순 offset이며 responsive image/layout에 일반화하지 않는다.

다음 단계의 gestures가 position/size를 바꾸므로 image canvas 좌표, overflow/clipping와 save capture 영역을 함께 정한다. modal을 여닫는 동작과 sticker selection이 background image state를 의도치 않게 바꾸지 않는지 확인한다.

## 출처

- [Expo Documentation, Create a modal](https://docs.expo.dev/tutorial/create-a-modal)

## 관련 문서

- [[Expo-Learn-App-Gestures]]
- [[Expo-Learn-App-Capture]]
