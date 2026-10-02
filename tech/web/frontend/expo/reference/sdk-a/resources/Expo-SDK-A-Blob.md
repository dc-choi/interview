---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Blob binary와 memory 경계"]
---

# Expo Blob binary와 memory 경계

## 설치와 construction

`npx expo install expo-blob`, `import { Blob } from 'expo-blob'`. Android/iOS/web/Expo Go에서 Web Blob contract에 맞는 구현을 제공한다. BlobPart는 string, ArrayBuffer, ArrayBufferView 또는 Blob이다. constructor의 type은 MIME metadata이며 내용 validation은 아니다.

```ts
const blob = new Blob([new Uint8Array([1, 2, 3])], {
  type: 'application/octet-stream',
});
const bytes = await blob.bytes();
const part = blob.slice(0, 2, 'application/octet-stream');
```

size는 bytes, type은 MIME 또는 empty string이다. text는 전체 UTF8 string, arrayBuffer는 ArrayBuffer, bytes는 Uint8Array를 Promise로 반환한다. slice(start,end,contentType)는 start inclusive/end exclusive이며 byte index는 signed32bit 범위다. text character index와 byte index를 혼동하지 않는다. contentType 생략 시 새 Blob type은 empty string이다.

## Stream의 실제 한계

stream은 ReadableStream을 반환해 reader로 chunks를 읽을 수 있지만 현재 구현은 전체 Blob을 먼저 memory에 로드한다. streaming API 형태가 constant-memory file/network streaming을 의미하지 않는다. 큰 media를 Blob 으로 통째로 materialize 하면 peak memory를 늘릴 수 있으므로 FileSystem/fetch streaming contract를 함께 검토한다.

React Native 기존 Blob의 slice/Web API 제약을 줄이기 위한 대안이며 모든 third-party API가 Expo Blob instance를 받는지는 해당 API와 확인한다. 객체가 제공하는 MIME만 으로 extension이 나 실제 format을 신뢰하지 않는다.

## 출처

- [Expo Documentation, Blob](https://docs.expo.dev/versions/latest/sdk/blob)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
