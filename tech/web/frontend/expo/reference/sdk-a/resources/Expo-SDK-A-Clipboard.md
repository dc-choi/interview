---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Clipboard typed data와 native paste button"]
---

# Clipboard typed data와 native paste button

## text, image와 URL

`expo-clipboard`는 Android, iOS, macOS, Web clipboard를 제공한다. `getStringAsync({ preferredFormat })`는 기본 `StringFormat.PLAIN_TEXT` 또는 HTML 형식을 읽는다. `setStringAsync(text, { inputFormat })`는 같은 형식 구분을 쓰며 Promise<boolean>을 반환한다. native 성공은 true, Web boolean은 실제 성공 여부다. `hasStringAsync()`는 plain/rich text 존재를 검사한다.

`getImageAsync({ format: 'png' | 'jpeg', jpegQuality })`는 `{ data, size }` 또는 null이다. `jpegQuality`는 0~1, 기본1이며 JPEG에만 적용된다. 반환 `data`는 이미 MIME prefix를 포함한 data URI 다. 반면 `setImageAsync(base64)`는 prefix 없는 raw base64를 받는다. `hasImageAsync()`로 존재를 확인한다. iOS/macOS `getUrlAsync`, `setUrlAsync`, `hasUrlAsync`는 plain string과 구별되는 native URL clipboard 형식이다.

```ts
const copied = await Clipboard.setStringAsync('https://example.com');
if (copied && await Clipboard.hasImageAsync()) {
  const image = await Clipboard.getImageAsync({ format: 'jpeg', jpegQuality: 0.8 });
  if (image) showPreview(image.data);
}
```

iOS16의 paste permission을 사용자가 거부하면 text는 빈 문자열, image/URL은 null이 될 수 있다. 빈 clipboard와 거부를 반환값만으로 구분하지 않는다. Web은 Async Clipboard API 지원, secure context, user gesture 조건에 의존한다. WebKit은 비동기 user interaction 처리에 제한이 있다.

## 변경 listener와 UIPasteControl

`addClipboardListener(listener)`의 event는 `contentTypes` 목록이다. 직접 content를 노출하는 이벤트가 아니므로 필요한 형식을 읽는다. Web/macOS listener는 no-op이다. subscription의 `remove()`로 정리한다. `removeClipboardListener`는 deprecated 다.

`ClipboardPasteButton`은 iOS16이 상 UIPasteControl이다. `isPasteButtonAvailable`을 확인하고 반드시 width/height를 지정한다. style의 backgroundColor, color, borderRadius를 쓰지 않고 `backgroundColor`, `foregroundColor`, `cornerStyle` prop을 쓴다. cornerStyle 기본은 capsule, displayMode 기본은 iconAndLabel이다. `acceptedContentTypes` 기본은 plain-text와 image 다. plain-text와 html을 함께 지정하면 모든 text를 html로 처리할 수 있으므로 원하는 계약에 맞춰 선택한다. `onPress` payload의 type에 따라 text/image를 분기하고 pasted HTML의 신뢰 경계를 별도로 처리한다.

```tsx
{Clipboard.isPasteButtonAvailable && <Clipboard.ClipboardPasteButton
  style={{ width: 160, height: 44 }} acceptedContentTypes={['plain-text']}
  onPress={event => { if (event.type === 'text') setText(event.text); }}
/>}
```

ImagePicker의 base64를 복사할 때는 현재 결과의 `assets[0].base64`를 확인한다. 원문의 오래된 top-level result.base64 형태를 그대로 사용하지 않는다.

## 출처

- [Expo Documentation, Clipboard](https://docs.expo.dev/versions/latest/sdk/clipboard)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
