---
tags: [expo, expo-sdk, communication]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK 인쇄와 파일 공유"]
---

# Expo SDK 인쇄와 파일 공유

expo-print와 expo-sharing는 native 문서 인쇄/PDF 생성과 파일 share sheet를 제공한다. npx expo install expo-print expo-sharing 후 namespace import한다. Android/iOS/web에서 API가 존재하지만 web 결과는 native와 다르다. incoming share는 [[Expo-SDK-Incoming-Share]]의 실험적 기능이다.

## Print 계약

printAsync(options):Promise<void>는 html 또는 PDF uri(remote/local/data:application/pdf; base64,...)를 인쇄한다. uri는 image나 임의 document 형식을 지원하지 않는다. web은 현재 page HTML을 인쇄한다. iOS printerUrl 없이 실행하면 native창에서 인쇄 시작시 resolve, 시작 전 닫으면 reject한다. Android는 창 표시 직후 resolve하고 취소해도 reject하지 않는다. 인쇄물 배송/물리 완료 보장이 아니다.

printToFileAsync(options={}):Promise<FilePrintResult>는 native cache PDF의 uri/numberOfPages를 반환한다. base64:true일 때 base64를 추가하고 data URI prefix는 없다. web에서는 print dialog를 연다. width612/height792 default는 72PPI US Letter다. html, iOS margins {left, top, right, bottom}, Android textZoom percent(default100), iOS useMarkupFormatter를 설정한다. useMarkupFormatter는 이미지를 표시하지 않는다. printAsync는 iOS orientation(Print.Orientation.portrait/landscape)과 printerUrl도 받는다. selectPrinterAsync():Promise<{name, url}>는 iOS 전용이다. markupFormatterIOS는 deprecated다.

```ts
const result = await Print.printToFileAsync({html:'<!DOCTYPE html><html><body>문서</body></html>'});
if (await Sharing.isAvailableAsync()) {
  await Sharing.shareAsync(result.uri, {UTI:'.pdf', mimeType:'application/pdf'});
}
```

iOS WKWebView HTML은 local asset URL을 읽지 못하므로 이미지를 base64 inline하고 실제 encoding과 data MIME을 맞춘다. source 예제의 PNG MIME을 임의 기본 output format과 섞지 않는다. markup formatter+margins에서 끝 빈 페이지가 생기면 well-formed HTML/DOCTYPE를 확인한다. Android HTML margin은 WebView engine과 CSS @page에 좌우된다.

## Outgoing Sharing

isAvailableAsync():Promise<boolean>은 web Web Share 지원 확인에 필요하다. web은 HTTPS 필수이며 local file URI 공유가 불가능하므로 upload된 URL 등 web에 맞는 경로를 별도로 둔다. shareAsync(url, options={}):Promise<void>는 native local file share sheet를 연다. Android mimeType, Android/web dialogTitle, iOS UTI와 popover anchor{x, y, width, height}를 설정한다. Promise 완료가 상대 앱 전달/저장 완료 증거는 아니다.

## 출처

- [Expo Documentation, Print](https://docs.expo.dev/versions/latest/sdk/print)
- [Expo Documentation, Sharing](https://docs.expo.dev/versions/latest/sdk/sharing)

## 관련 문서

- [[Expo-SDK-Incoming-Share]]
