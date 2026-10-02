---
tags: [expo, react-native, overlays]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["ModalBottomSheet lifecycle와 gestures"]
---

# ModalBottomSheet lifecycle와 gestures


## 표시와 닫기 수명

ModalBottomSheet는 children/onDismissRequest가 필수다. 표시 상태로 조건부 mount하고 닫을 때 ref.hide Promise를 기다린 뒤 unmount하면 애니메이션을 유지한다. swipe/back/scrim의 닫기 요청에서도 앱 상태를 갱신한다.

```tsx
const close = async () => {
  await sheetRef.current?.hide();
  setVisible(false);
};
{visible && <ModalBottomSheet ref={sheetRef} onDismissRequest={() => setVisible(false)}>
  <Column modifiers={[paddingAll(24)]}>
    <Text>내용</Text><Button onClick={close}><Text>닫기</Text></Button>
  </Column>
</ModalBottomSheet>}
```

선택적 속성은 modifiers/ref/containerColor/contentColor/scrimColor, initialFullyExpanded(기본 false), skipPartiallyExpanded(기본 false), sheetGesturesEnabled(기본 true), showDragHandle(기본 true), properties다. skipPartiallyExpanded는 부분 상태를 없애고 완전히 펼쳐 연다. initialFullyExpanded는 처음에만 완전히 펼치고 이후 부분 상태로 이동할 수 있다. skip=true이면 initialFullyExpanded는 무시된다.

ref의 expand/hide/partialExpand는 모두 Promise<void> 애니메이션이다. partialExpand는 skip=false일 때만 동작한다. DragHandle 슬롯이 있으면 showDragHandle보다 사용자 지정 핸들을 사용한다. Column/Box의 모양과 배경으로 핸들을 구성할 수 있다.

## 닫기 정책과 RN 스크롤

properties의 shouldDismissOnBackPress/shouldDismissOnClickOutside 기본은 true다. 프로그램으로만 닫으려면 둘을 false로 하고 sheetGesturesEnabled도 false로 한다. 핸들을 숨기는 것만으로 제스처/뒤로가기/바깥 누르기가 막히지는 않는다. 명시적 닫기 행동을 제공한다.

RNHostView의 단일 자식에 짧은 내용은 본래 크기를 맞추고, 긴 내용은 높이가 정해진 Column 안에 RN flex:1 영역으로 넣는다. RN FlatList/ScrollView/FlashList/Legend List는 nestedScrollEnabled로 스크롤을 먼저 처리하고 위쪽 끝에서 남은 드래그를 sheet로 전달한다. 이 연결 없이 목록이 입력을 소비하면 sheet가 움직이지 않을 수 있다.

유한한 경계, 짧고 긴 내용의 부분 펼침, 키보드 회피, Pressable 터치 판정과 hide 완료 뒤 상태 전환을 확인한다. native의 두 정착 상태를 임의 개수의 snap point 계약으로 설명하지 않는다.

## 출처

- [Expo Documentation, ModalBottomSheet](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/bottomsheet)

## 관련 문서

- [[Expo-Compose-Host]]
- [[Expo-UI-Sheet]]
