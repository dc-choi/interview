---
tags: [expo, expo-sdk, communication]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK 실험적 Incoming Sharing"]
---

# Expo SDK 실험적 Incoming Sharing

expo-sharing의 incoming share는 실험적이다. SDK57에서는 다른 앱의 text/URL/file/image/video/audio를 앱으로 받아오는 native 설정과 payload API를 제공한다. outgoing API는 [[Expo-SDK-Print-Share]]에 있다.

## Native 등록

plugin의 ios.enabled/Android enabled 기본 false를 활성화하고 binary를 다시 빌드한다. iOS extensionBundleIdentifier는 기본 bundleID.ShareExtension, appGroupIdentifier는 group.bundleID다. activationRule은 object 또는 raw predicate이며 supportsText와 supportsAttachmentsWithMaxCount/supportsFileWithMaxCount/supportsImageWithMaxCount/supportsMovieWithMaxCount/supportsWebPageWithMaxCount/supportsWebURLWithMaxCount를 제한한다. 기본 count0/false를 실제 지원 payload만 큼 바꾼다. Android singleShareMimeTypes/multipleShareMimeTypes 배열은 ACTION_SEND/ACTION_SEND_MULTIPLE filter를 만든다.

iOS 구현은 ShareExtension view 대신 main app을 열며 Apple이 지원하지 않는 방식이라 향후 OS 변화로 깨질 수 있다. Expo Go로 custom native extension/filter 구성을 검증할 수 없다. Router +native-intent에서 URL parse를 try/catch하고 expo-sharing hostname을 share 처리 route로 연결한다. 외부 문자열에 new URL을 무조건 적용하면 throw한다.

## Raw와 resolved payload

getSharedPayloads():SharedPayload[]는 synchronous raw 배열이며 없으면[]다. item은 value, mimeType(default text/plain), shareType(default text; text/url/file/image/video/audio)다. getResolvedSharedPayloadsAsync():Promise<ResolvedSharedPayload[]>는 URI/redirect/metadata를 resolve한다. contentUri/text/contentMimeType/contentSize/contentName은 nullable이고 URL resolution에는 네트워크가 필요할 수 있다. raw url와 resolved web site를 동일한 file로 간주하지 않는다.

useIncomingShare()는 sharedPayloads, resolvedSharedPayloads, isResolving, error, refreshSharePayloads(), clearSharedPayloads()를 제공한다. 처리 중/실패시 resolved array는[]일 수 있으므로 empty와 pending/error를 구분한다. raw payload는 처리 완료 후 clearSharedPayloads():void로 지워 중복 ingestion을 막는다. source의 IntentFilter data 타입처럼 docgen이 undefined array로 표시한 부분은 실제 native 설정 계약으로 추정해 채우지 않는다.

## 출처

- [Expo Documentation, Sharing](https://docs.expo.dev/versions/latest/sdk/sharing)

## 관련 문서

- [[Expo-SDK-Print-Share]]
- [[Expo-Router-Native-Intent-Handoff]]
