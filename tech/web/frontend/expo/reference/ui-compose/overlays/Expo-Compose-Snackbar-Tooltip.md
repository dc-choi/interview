---
tags: [expo, react-native, overlays]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose Snackbar와 Tooltip"]
---

# Compose Snackbar와 Tooltip

Snackbar는 화면 아래의 짧은 결과 피드백이고 Tooltip은 앵커의 맥락 설명이다. 둘 다 Android Compose용이다. 메시지 표시와 스타일 설정을 분리한다.

## SnackbarHost와 큐

레이아웃에 `SnackbarHost`를 한 번 배치하고 `SnackbarHostRef.showSnackbar(options)`를 호출한다. 이후 호출은 현재 snackbar가 끝난 뒤 순서대로 표시된다. 반환 Promise는 행동 버튼이면 `actionPerformed`, 시간 만료나 닫기 버튼이면 `dismissed`로 resolve한다.

```tsx
const snackbar = useRef<SnackbarHostRef>(null);
const archive = async () => {
  await archiveItem();
  const result = await snackbar.current?.showSnackbar({
    message: '보관 완료', actionLabel: '되돌리기', duration: 'short',
    withDismissAction: true,
  });
  if (result === 'actionPerformed') await restoreItem();
};
<SnackbarHost ref={snackbar}>
  <Snackbar actionOnNewLine={false} />
</SnackbarHost>
```

필수 옵션은 `message`다. `actionLabel`을 생략하면 행동 버튼이 없다. `duration`은 `short`, `long`, `indefinite`다. 기본은 행동 라벨이 없으면 short, 있으면 indefinite다. 행동 버튼을 넣고도 짧게 표시하려면 위 예제처럼 duration을 지정한다. `withDismissAction` 기본은 false다.

`Snackbar`는 Host 안의 스타일 설정용 자식이다. 자체 메시지나 자식 내용을 받는 방식이 아니다. `containerColor`, `contentColor`, `actionContentColor`, `dismissActionContentColor`, `actionOnNewLine`(기본 false), `modifiers`를 설정한다. Host는 `children`, `ref`, `modifiers`를 받는다. 화면 하단 배치는 Box의 `align('bottomCenter')`, `fillMaxWidth()`로 구성한다.

## TooltipBox와 슬롯

`TooltipBox` 자식 중 `.PlainTooltip` 또는 `.RichTooltip` 슬롯을 설명으로 쓰고 나머지를 앵커로 쓴다. 기본적으로 길게 누르면 표시한다. Rich에는 `.Title`, `.Text`, `.Action` 슬롯이 있다. action이 있으면 `hasAction`을 자동으로 추론한다.

```tsx
<TooltipBox isPersistent>
  <TooltipBox.RichTooltip>
    <TooltipBox.RichTooltip.Title><Text>카메라 권한</Text></TooltipBox.RichTooltip.Title>
    <TooltipBox.RichTooltip.Text><Text>촬영 전에 권한이 필요합니다.</Text></TooltipBox.RichTooltip.Text>
    <TooltipBox.RichTooltip.Action>
      <TextButton onClick={openHelp}><Text>도움말</Text></TextButton>
    </TooltipBox.RichTooltip.Action>
  </TooltipBox.RichTooltip>
  <Button onClick={record}><Text>촬영</Text></Button>
</TooltipBox>
```

`isPersistent` 기본 false는 짧은 시간 뒤 자동으로 사라진다. 행동을 눌러야 하는 설명에는 true가 적절하다. `enableUserInput` 기본 true는 길게 누르기와 hover 입력을 허용한다. `focusable` 기본 false는 popup 초점 허용 여부다. `hasAction`은 접근성과 dismiss 행동에 영향을 주므로 실제 action 구성과 일치시킨다. `modifiers`와 `ref`도 선택적이다. `TooltipBoxRef.show()`와 `dismiss()`는 Promise<void>를 반환해 프로그램으로 표시/닫기할 수 있다.

## 출처

- [Expo Documentation, Snackbar](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/snackbar)
- [Expo Documentation, Tooltip](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/tooltip)

## 관련 문서

- [[Expo-Compose-Dialogs]]
- [[Expo-Compose-Layout]]
