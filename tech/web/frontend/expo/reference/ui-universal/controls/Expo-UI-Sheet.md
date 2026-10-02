---
tags: [expo, react-native, controls]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Universal BottomSheet visibility와 snap points"]
---

# Universal BottomSheet visibility와 snap points

## Controlled modal

BottomSheet는 required isPresented boolean/onDismiss ()=>void다. swipe down/overlay tap dismiss callback에서 React visibility를 false로 맞춘다. children, modifiers, showDragIndicator true, snapPoints, testID가 optional이다. usage는 opener만 Host에 두고 BottomSheet를 sibling으로 구성한다. 일반 universal layout의 Host 규칙과 sheet의 자체 hosting 경로를 구분한다.

```tsx
<BottomSheet isPresented={visible} onDismiss={()=>setVisible(false)} snapPoints={['half','full']}>
  <ScrollView><Column spacing={12}><Text>Sheet contents</Text></Column></ScrollView>
</BottomSheet>
```

snapPoints omitted는 content auto-size다. half는 약 절반/full은 fully expanded다. fraction object0~1 또는 height object는 iOS/web에서 precise height이고 Android는 nearest half/full로 매핑한다. 원문 height는 fixed pixel height로 설명한다.

Android underlying ModalBottomSheet는 두 resting states만 지원한다. short content는 Material partial threshold보다 작아 half가 보이지 않을 수 있다. explicit content height/fill로 partial state를 확보해야 한다. smallest snap point보다 tall content는 ScrollView로 overflow를 처리한다.

showDragIndicator false는 handle 표시만 바꾸며 dismissal 자체를 막는 prop으로 간주하지 않는다. universal sheet API와 gorhom compat ref/index/snapToIndex API는 별개다. controlled close, swipe dismiss, back/overlay, content scrolling을 실제 platform에서 확인한다.

## 출처

- [Expo Documentation, BottomSheet](https://docs.expo.dev/versions/latest/sdk/ui/universal/bottomsheet)

## 관련 문서

- [[Expo-UI-Scroll]]
- [[Expo-UI-Compat-Sheet]]
