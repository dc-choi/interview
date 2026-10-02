---
tags: [expo, react-native, overlays]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["AlertDialog slots와 BasicAlertDialog"]
---

# AlertDialog slots와 BasicAlertDialog


## 구조화된 AlertDialog

AlertDialog의 Title/Text/ConfirmButton/DismissButton/Icon 슬롯은 제목/본문/행동/아이콘을 구성한다. onDismissRequest는 바깥 누르기나 뒤로가기에서 닫기를 요청한다. 앱이 표시 상태를 false로 바꿔 unmount해야 한다. 확인/취소 버튼도 업무 처리와 닫기를 직접 수행한다.

```tsx
{visible && <AlertDialog onDismissRequest={() => setVisible(false)}>
  <AlertDialog.Title><Text>작업 확인</Text></AlertDialog.Title>
  <AlertDialog.Text><Text>계속 진행할까요?</Text></AlertDialog.Text>
  <AlertDialog.ConfirmButton>
    <TextButton onClick={confirm}><Text>확인</Text></TextButton>
  </AlertDialog.ConfirmButton>
</AlertDialog>}
```

children/colors/modifiers/onDismissRequest/properties/tonalElevation(dp)는 선택적이다. colors는 containerColor/iconContentColor/titleContentColor/textContentColor의 선택적 ColorValue다. DialogProperties의 decorFitsSystemWindows/dismissOnBackPress/dismissOnClickOutside/usePlatformDefaultWidth는 모두 기본 true로 시스템 여백, 너비와 닫기 행동을 정한다.

## 자유로운 BasicAlertDialog

BasicAlertDialog는 children/modifiers/onDismissRequest/properties를 받지만 AlertDialog의 슬롯/colors/tonalElevation은 없다. Surface+Column+Text+TextButton으로 모양, 배경, 배치를 구성한다. properties는 같은 네 boolean이다.

wrapContentWidth/Height, RoundedCorner clip, 패딩과 버튼 정렬을 modifier로 구성한다. 키보드 초점, 접근성, 취소 경로, 터치 영역과 유한한 크기를 확인한다. 닫기 요청과 작업 성공은 별도 상태이므로 실패했을 때 dialog를 어떻게 유지할지도 정한다.

## 출처

- [Expo Documentation, AlertDialog](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/alertdialog)
- [Expo Documentation, BasicAlertDialog](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/basicalertdialog)

## 관련 문서

- [[Expo-Compose-Surfaces]]
- [[Expo-Compose-Sheet]]
