---
tags: [expo, react-native, overlays]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["DropdownMenu와 exposed field anchor"]
---

# DropdownMenu와 exposed field anchor


## 표시 상태를 관리하는 메뉴

DropdownMenu의 필수 children은 Trigger/Items 슬롯을 구성한다. expanded, onDismissRequest, color(컨테이너), cornerRadius(dp, 기본 MenuDefaults.shape), modifiers/style은 선택적이다. 열린 메뉴는 닫기 요청과 항목 클릭에서 expanded=false로 바꾼다.

```tsx
<DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)}>
  <DropdownMenu.Trigger>
    <OutlinedButton onClick={() => setOpen(true)}><Text>메뉴</Text></OutlinedButton>
  </DropdownMenu.Trigger>
  <DropdownMenu.Items>
    <DropdownMenuItem onClick={() => setOpen(false)}>
      <DropdownMenuItem.Text><Text>복사</Text></DropdownMenuItem.Text>
    </DropdownMenuItem>
  </DropdownMenu.Items>
</DropdownMenu>
```

Items/Trigger는 필수 ReactNode를 감싸는 슬롯이다. DropdownMenuItem은 Text/LeadingIcon 등으로 내용을 구성하고 예제에 onClick/elementColors(textColor)가 있다. 생성된 API 표는 Item 속성을 모두 열거하지 않아 설치된 타입도 확인해야 한다. 원문의 Preview 설명은 iOS 전용이라 Android 참조 페이지와 충돌한다. 이를 Android의 긴 누르기 미리보기 계약으로 사용하지 않는다.

RN Pressable은 RNHostView matchContents로 연결한다. Compose에서 길게 눌러 열려면 Trigger에 combinedClickable의 onClick/onLongClick를 적용해 expanded를 바꾼다. 호환 MenuView의 바깥 Pressable 입력 소유와 구분한다.

## ExposedDropdownMenuBox

Box는 expanded가 필수이며 children/modifiers/onExpandedChange(boolean)는 선택적이다. 앵커 자식에 menuAnchor를 적용하고 ExposedDropdownMenu를 Box 안에 둔다. Menu도 expanded가 필수이며 children/modifiers/containerColor/onDismissRequest는 선택적이다.

readOnly TextField는 useNativeState로 선택 라벨을 표시한다. 항목 클릭에서 상태를 갱신하고 expanded=false로 닫는다. 초기 문자열만으로 이후의 라벨 갱신이 처리되지는 않는다. 업무 ID와 표시 라벨은 따로 유지할 수 있다.

## 출처

- [Expo Documentation, DropdownMenu](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/dropdownmenu)
- [Expo Documentation, ExposedDropdownMenuBox](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/exposeddropdownmenubox)

## 관련 문서

- [[Expo-Compose-TextField]]
- [[Expo-Compose-Native-State]]
- [[Expo-UI-Compat-Menu]]
