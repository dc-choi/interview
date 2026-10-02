---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Camera video recording과 barcode scanner"]
---

# Camera video recording과 barcode scanner

## video recording 수명

CameraView mode=video와 microphonepermission을 준비한뒤 recordAsync({maxDuration,maxFileSize,codec})를호출한다. maxDuration은 seconds,maxFileSize는 bytes 다. mute(defaultfalse)는무음 recording이다. Promise는 stopRecording,limit도 달또는 preview 정지시 cacheURI를 반환하고 undefined가 능성도있다. recording 중 camera를 바꾸면정지한다. orientation에 맞게 video를 회전한다. iOScodec는 getAvailableVideoCodecsAsync의 avc1/hvc1/jpeg/apcn/ap4h 중지원값을 사용한다. videoBitrate는 bits/sec이며 iOS에 는 codec 지정도필요하다.

```ts
const pending = cameraRef.current!.recordAsync({ maxDuration: 30, maxFileSize: 20_000_000 });
// 사용자가 완료를 누를 때 cameraRef.current?.stopRecording()
const result = await pending;
if (result) await persistRecording(result.uri);
```

videoQuality2160p/1080p/720p/480p/4:3은 기기지원범위에의존하며 없으면 highestavailable로 대체된다. stabilizationdefaultauto,off/standard/cinematic은 Android에 서실제구체모드보다 on/off를 선택하며 device가 방법을결정한다. toggleRecordingAsync는 활성 recordingpause/resume이고 getSupportedFeatures().toggleRecordingAsyncAvailable로 확인한다. iOS18이 상제한이있다. recordingoptionsmirror는 deprecated이며 viewmirror를 쓴다.

## preview scanning와 결과

barcodeScannerSettings.barcodeTypes로 QR/EAN/UPC/Aztec/PDF417/DataMatrix/Code39/93/128/ITF14/Codabar 범위를정하고 onBarcodeScanned({type,data,bounds,cornerPoints,extra?})를 받는다. bounds는 빈 rect/partialarea 일수있고 cornerPoints는 누락될수있다. iOScode39/pdf417에 는 corner가 없다. **corner 순서가다르다**: Android/WebtopLeft,topRight,bottomRight,bottomLeft;iOSbottomLeft,bottomRight,topLeft,topRight 다. 좌표는 camerasource/viewspace 다. 반복 scan을 deduplicate 하고 URLpayload를 자동으로신뢰하지 않는다.

scanFromURLAsync(url,barcodeTypes?)는 possiblyemptyarray를 반환한다. iOS는 QR만 지원하고 Android는 barcode가 image 대부분을차지해야좋다. sourceimage와 camera 라이브 scanner의 지원차이를구분한다.

## modern scanner

launchScanner(options)는 AndroidGooglecodescanner,iOS16+DataScannerViewControllermodal을 연다. getSupportedFeatures().isModernBarcodeScannerAvailable 또는 nativeavailability를 먼저확인한다. onModernBarcodeScannedlistener는 type/data/extra를 받고 bounds/cornerPoints는 없는 ScanningResult 다. subscription.remove로 정리한다. Android는 scan 후자동 dismiss,iOS는 dismissScanner로 닫는다. options의 barcodeTypes와 iOSguidance(defaulttrue),highlighting(defaultfalse),pinchzoom(defaulttrue)을정한다. generatednativeclass에 platform이 광범위하게붙어있어도개별 publicmethod의 platform 제한을우선한다.

- [Expo Documentation, Camera](https://docs.expo.dev/versions/latest/sdk/camera/)

## 출처


## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
