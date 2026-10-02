---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["FileSystem download와 upload task 상태"]
---

# FileSystem download와 upload task 상태

## immediate download와 stream upload

현재 `File.downloadFileAsync(url, File|Directory, options)`는 network 파일을 destination에 받는다. Directory 면 응답이나 URL에서 filename을 정한다. idempotent 기본 false는 기존 destination에서 error,true는 overwrite 다. headers,onProgress,AbortSignal을 전달할 수 있다. progress.totalBytes=-1이면 Content-Length가 없으므로 비율을 계산하지 않는다. `expo/fetch`의 body에 File이 나 FormData를 직접 넣을 수 있어 base64 변환 비용을 피한다.

```ts
const destination = new File(Paths.document, 'video.mp4');
const task = File.createDownloadTask(url, destination, {
  onProgress: ({ bytesWritten, totalBytes }) => {
    setProgress(totalBytes > 0 ? bytesWritten / totalBytes : null);
  },
});
const result = await task.downloadAsync();
if (result) saveCompletedUri(result.uri);
```

## DownloadTask state와 pause 저장

createDownloadTask는 자동 시작하지 않는다. idle에서 downloadAsync를 **한 번** 호출해 active로 간다. completed/cancelled/error는 terminal,paused는 resume가 능하다. downloadAsync/resumeAsync는 완료 시 File,중간 pause 시 null,network failure/cancel 시 rejection이다. AbortSignal은 AbortError로 reject 한다. pause()는 요청만 보내며 pauseAsync()는 native resume data가 준비될 때까지 기다린다.

paused에서만 savable()이 가능하다. DownloadPauseState는 url,fileUri,isDirectory,headers,opaque resumeData를 포함하며 callback/signal은 저장하지 않는다. DownloadTask.fromSavable(state,newOptions)는 paused task를 복원하고 같은 header이 름은 newOptions가 override 한다. resumeAsync는 다시 pause 될 때 null을 반환할 수 있다. cancel은 진행 promise를 reject 하고 terminal에서 no-op이다. release는 native handle을 해제하므로 사용이 끝난 뒤 호출한다.

## UploadTask와 HTTP 결과

file.upload(url,options)는 즉시 시작한다. file.createUploadTask는 idle task를 만들고 uploadAsync로 한 번 시작한다. upload에 는 paused 상태나 resume API가 없다. cancel과 signal은 진행 promise를 reject 한다. 완료 HTTP 응답은 **non-2xx도 resolve**하므로 `{status,headers,body}`의 status를 검사한다. promise reject는 file read/network/cancel 실패다.

options 기본 httpMethodPOST,uploadTypeBINARY_CONTENT(0),multipart(1)의 fieldName 기본 file이다. multipart는 mimeType,parameters를 지원하고 progress.bytesSent에 는 boundary/header/form overhead가 포함될 수 있다. onProgress 또는 addListener('progress')를 사용하고 manual listener는 remove 한다.

## native background와 JS 수명

iOS sessionType 기본 background이며 foreground를 선택할 수 있다. background native transfer는 app suspension이 후 계속될 수 있으나 **app termination/relaunch 뒤 JS Task instance,promise,callback,cancellation state가 자동 복원되지 않는다**. Android는 download sessionType option을 API consistency로 받아도 무시한다. 서버의 idempotency,완료 기록,재시도 상태를 별도로 설계한다. native background 동작은 기기에서 검증해야 하며 foreground example 실행으로 보장되지 않는다.

## 출처

- [Expo Documentation, FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
