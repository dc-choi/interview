---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Observe 이미지 decode 진단"]
---

# Observe 이미지 decode 진단

## Oversized 판정

SDK 57 이상, expo-image 57.0.2 이상에서 `integrations: { 'expo-image': true }`를 설정한다. decoded 이미지 pixel 면적을 전체 물리 화면 면적(width × height × pixelRatio²)과 비교한다. 화면 안의 Image 컴포넌트 크기와 비교하는 규칙은 아니다. 기본 threshold는 1.5배다.

Android Image는 보통 component 크기에 맞춰 decode하므로 같은 원본도 event가 없을 수 있다. iOS는 렌더링 downscale 전 decode를 관찰하므로 allowDownscaling을 써도 큰 원본 event가 생길 수 있다. useImage/Image.loadAsync는 기본 full source decode이며 maxWidth/maxHeight로 제한한다.

## Event와 URL

expo-image.oversized는 sanitized URL당 session 한 번 기록한다. image width/height는 pixels, screen width/height는 points, pixelRatio를 별도로 제공한다. urlSanitized는 실제 URL 정규화 여부다.

기본은 query/fragment를 제거하고 basic credentials는 항상 제거한다. 지원 scheme은 http(s), file, android.resource이며 data/ph는 제외한다. includeUrlParams를 켜면 signed URL token이나 개인정보가 남을 수 있으므로 필요한 값만 수집한다.

Observe가 없는 앱에서 expo-image의 선택적 integration은 no-op이다. 이벤트가 없다는 이유만으로 모든 image 메모리 사용이 적다고 결론 내리지 않는다.

## 출처

- [Expo Documentation, Expo Image integration](https://docs.expo.dev/eas/observe/integrations/expo-image)

## 관련 문서

- [[Expo-Observe-Integrations]]

- [[Expo]]
