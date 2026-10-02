---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["AgeRange 공유 동의와 platform 결과"]
---

# AgeRange 공유 동의와 platform 결과

## 설치와 조건

`npx expo install expo-age-range`, `import * as AgeRange from 'expo-age-range'`. Android Play Age Signals와 iOS26+ Declared Age Range를 사용한다. iOS는 Xcode26+ build와 com.apple.developer.declared-age-range entitlement가 필요하다. 실기기 검증을 권장한다. native API가 활발히 바뀌므로 library stable 표기와 API 변화 가능성을 함께 고려한다.

## Request 순서

Android는 requestAgeSignalsAccessAsync 결과가 SHARED 일 때만 requestAgeRangeAsync를 호출한다. NOT_SHARED이면 fields가 null, VERIFICATION_REQUIRED이면 Play Store에서 검증을 해결하도록 안내한다. user dismiss는 ERR_AGE_RANGE_TASK_CANCELLED 다. iOS에서는 별도 sharing API가 null을 반환하고 range request 자체가 consent UI를 표시한다.

```ts
const sharing = await AgeRange.requestAgeSignalsAccessAsync();
if (Platform.OS === 'android' && sharing !== 'SHARED') return;
const range = await AgeRange.requestAgeRangeAsync({ threshold1: 13, threshold2: 18 });
```

threshold1은 필수, threshold2/3은 optional이다. iOS age thresholds는 최소2 년 간격이어야 하며 잘못되면 INVALID_REQUEST 다. signed-in account가 필요하고 OS가 결과를 cache 할 수 있다. unsupported iOS<26/web의 request는 lowerBound18 fallback을 반환한다. 이 값은 실제 성인 검증을 수행한 증거가 아니다.

## Regulation discovery

isEligibleForAgeFeaturesAsync는 iOS26.2+에서 true/false, unsupported는 null이다. null/rejection은 unknown이며 false와 다르다. getRequiredRegulatoryFeaturesAsync는 iOS26.4+ required feature list, unsupported null이다. declaredAgeRangeRequired, significantAppChangeRequiresAdultNotification, significantAppChangeRequiresParentalConsent를 구분한다.

showSignificantUpdateAcknowledgmentAsync(description)는 iOS26.4+ system UI이며 unsupported는 UI 없이 즉시 resolve 한다. feature list가 adult notification을 요구할 때 호출한다. UI resolve만 으로 별도 guardian consent 요구까지 충족했다고 판단하지 않는다.

## 결과와 오류

lowerBound/upperBound는 nullable 다. iOS ageRangeDeclaration은 selfDeclared/guardianDeclared/confirmed(null가 능), activeParentalControls는 shared controls 다. confirmed는26.2+에서 보고된다. Android ageRangeSource는 TIER_A(self)/B(parent)/C(평가)/D(강한 조합 검증)이며 installId, significantChangeStatus(APPROVED/PENDING/DECLINED), significantChangeApprovalDate를 제공한다. mostRecentApprovalDate는 deprecated alias 다.

USER_DECLINED는 공유 거부, NOT_AVAILABLE은 미로그인 등 조회 불가다. technical signal은 앱의 gating 판단 자료이며 법규 의무 전체를 자동 판정하는 기능은 아니다. null/fallback/unsupported를 실제 확인 결과와 구분해 저장한다.

## 출처

- [Expo Documentation, AgeRange](https://docs.expo.dev/versions/latest/sdk/age-range)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
