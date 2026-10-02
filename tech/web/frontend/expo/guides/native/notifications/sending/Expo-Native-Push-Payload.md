---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Push payload 옵션과 플랫폼 차이"]
---

# Expo Push payload 옵션과 플랫폼 차이

## 공통 필드

| Field | 계약 |
|---|---|
| to | 필수 string 또는 string[] ExpoPushToken |
| data | JSON object, total provider payload 포함4096bytes 제한 |
| title/body | 표시 title/body |
| ttl | redelivery 보관 시간 초, 생략 시 provider 기본4주 |
| expiration | Unix epoch timestamp, ttl가 있으면 ttl 우선 |
| priority | default/normal/high, 생략은 default |
| categoryId | 앱에 등록된 notification action category |
| richContent | `{image: URL}` image, iOS Notification Service Extension 필요 |
| collapseId | transit message coalescing, iOS는 displayed replacement도 수행 |

priority default는 Android normal, iOS high에 대응한다. Android normal은 sleeping device network를 열지 않아 지연될 수 있다. high는 기기를 깨울 수 있지만 delivery 보장은 아니다. APNs normal/high는 각각5/10이며 background payload 요구와 맞춘다. ttl0은 Android 즉시 best effort이나 Doze의 normal priority에서는 도달 전 만료될 수 있다.

## iOS 필드

| Field | 의미 |
|---|---|
| contentAvailable | background task 유도, native background config 필요 |
| subtitle | title 아래 subtitle |
| sound | default/custom filename 또는 null, custom sound는 plugin 포함 |
| badge | app icon 숫자, 0은 clear |
| interruptionLevel | active/critical/passive/time-sensitive, OS entitlement/정책 적용 |
| targetContentId | window identifier, 수신 content의 targetContentIdentifier |
| relevanceScore | 0~1 summary 우선도 |
| filterCriteria | Focus 표시 판단 criteria |
| threadId | 시각 grouping, 기존 notification 제거 안 함 |
| mutableContent | service extension interception, 기본false |

`contentAvailable`은 deprecated `_contentAvailable`을 대체하며 둘 다 있으면 새 필드가 우선한다. ios.allowsSound/allowsBadge가 false이면 sound/badge가 반영되지 않을 수 있다. top-level status granted만으로 모든 presentation 권한이 허용됐다고 판단하지 않는다.

## Android 필드

| Field | 의미 |
|---|---|
| channelId | 기기에 존재하는 channel ID, 지정 channel이 없으면 표시 안 됨 |
| icon | Android drawable resource name, 기본 plugin icon |
| tag | 같은 tag의 이미 표시된 notification 대체 |

channelId 생략/null은 Expo가 Default channel을 만들 수 있으나 user-facing channel은 삭제/설정 변경에 OS 제약이 있다. channel별 중요도와 sound는 앱에서 native channel을 사전에 구성한다.

Android collapseId는 offline/in-transit messages를 합칠 뿐 이미 표시된 알림을 대체하지 않는다. 그 목적은 tag다. iOS collapseId는 전달 전 합치기와 기존 알림 대체를, threadId는 제거 없는 grouping을 한다. 세 필드를 같은 기능으로 취급하지 않는다.

## 출처

- [Expo Documentation, Send notifications with the Expo Push Service](https://docs.expo.dev/push-notifications/sending-notifications/)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
