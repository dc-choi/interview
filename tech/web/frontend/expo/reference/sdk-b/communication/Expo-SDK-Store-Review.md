---
tags: [expo, expo-sdk, communication]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK 스토어 리뷰 요청"]
---

# Expo SDK 스토어 리뷰 요청

expo-store-review는 Android5+ ReviewManager와 iOS SKStoreReviewController를 호출한다. npx expo install expo-store-review 후 namespace import한다. Expo Go 포함이지만 iOS TestFlight는 native review prompt가 지원되지 않는다.

isAvailableAsync():Promise<boolean>은 native mechanism 사용 가능 여부, hasAction():Promise<boolean>은 native flow 또는 configured store URL 사용 가능 여부다. storeUrl():string|null은 Constants.expoConfig의 ios.appStoreUrl/android.playStoreUrl을 읽으며 web에서는 null이다. requestReview():Promise<void>는 호출 결과일 뿐 OS quota와 정책 때문에 prompt가 표시되지 않을 수 있다. ERR_STORE_REVIEW_FAILED를 처리한다.

```ts
if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview();
```

작업을 마친 시점에 요청하고 critical task, 첫 실행, 반복 요청을 피한다. native prompt를 누르면 반드시 뜬다는 버튼으로 노출하거나 사전 질문으로 긍정 사용자만 골라 요청하지 않는다. 사용자가 명시적으로 스토어 리뷰를 여는 버튼은 iOS store URL의 action=write-review, Android showAllReviews=true 링크를 사용할 수 있지만 Android 옵션은 전체 리뷰 화면이며 리뷰 작성 완료를 보장하지 않는다.

## 출처

- [Expo Documentation, StoreReview](https://docs.expo.dev/versions/latest/sdk/storereview)

## 관련 문서

- [[Expo-SDK-Linking-Intent]]
