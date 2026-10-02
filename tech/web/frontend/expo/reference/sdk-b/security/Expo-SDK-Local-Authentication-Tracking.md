---
tags: [expo, expo-sdk, security]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo biometric 인증과 tracking permission"]
---

# Expo biometric 인증과 tracking permission

local-authentication과 tracking-transparency는 서로 다른 OS 권한이다. biometric은 device owner 확인, ATT는 다른 앱/서비스간 tracking 동의이며 서버 session/authorization이나 법적 동의 전체를 대신하지 않는다.

## LocalAuthentication

expo-local-authentication은 Android/iOS를 지원하지만 Expo Go iOS FaceID는 미지원이라 development build가 필요하다. plugin faceIDPermission은 NSFaceIDUsageDescription이며 없으면 FaceID device에서 passcode fallback을 사용할 수 있다. Android USE_BIOMETRIC과 deprecated USE_FINGERPRINT native permission이 library에 포함된다.

hasHardwareAsync/isEnrolledAsync는 boolean, supportedAuthenticationTypesAsync는 FINGERPRINT1/FACIAL_RECOGNITION2/IRIS3 배열, getEnrolledLevelAsync는 NONE0/SECRET1/BIOMETRIC_WEAK2/STRONG3이다. Android pre-M의 SECRET은 SIM lock일 수 있어 authenticateAsync capability와 동일하지 않다.

authenticateAsync(options)→{success:true} 또는 {success:false, error, warning?}, cancelAuthenticate→Promise<void>다. options는 promptMessage/cancelLabel, Android promptDescription/promptSubtitle/requireConfirmation(true default, system hint)/biometricsSecurityLevel(weak default, strong은 Class3), iOS fallbackLabel이다. disableDeviceFallback 기본 false이며 true는 biometric-only policy로 바꾼다. fallbackLabel=''은 button만 숨기므로 fallback policy와 구분한다.

error는 not_enrolled/not_available/passcode_not_set/lockout/authentication_failed, user_cancel/app_cancel/system_cancel/user_fallback, timeout/unable_to_process/no_space/invalid_context/unknown이다. 취소와 technical failure, retry 제한을 분리해 처리한다.

```ts
const result = await LocalAuthentication.authenticateAsync({
  promptMessage:'기기 소유자 확인', biometricsSecurityLevel:'strong',
});
if (result.success) unlockLocalView();
```

## TrackingTransparency

expo-tracking-transparency는 Android/iOS/tvOS에서 AD ID와 ATT를 제공한다. plugin userTrackingPermission은 NSUserTrackingUsageDescription, Android AD_ID permission은 advertising-ID 사용에 필요하다. locale file로 usage description을 번역할 수 있다. isAvailable는 boolean이며 미지원 platform get/request는 granted fallback이어서 실제 ATT 동의가 있었다는 뜻이 아니다.

getTrackingPermissionsAsync/requestTrackingPermissionsAsync와 useTrackingPermissions는 status/granted/canAskAgain/expires를 반환한다. iOS system Allow Apps to Request to Track=false면 denied이며 user 선택을 기억한다. Android/web get/request는 항상 granted다. getAdvertisingId는 UUID string|null, simulator/restricted/denied/Android limit-ad-tracking이면 null이다. source의 zero IDFA 반환과 wrapper null 반환 문구를 구분해 양쪽 unavailable 값을 유효 identifier로 저장하지 않는다.

AAID/IDFA는 reset/revoke될 수 있어 영구 user identity나 저장 cache로 쓰지 말고 필요할 때 현재 permission/ID를 다시 읽는다. 여러 Android user는 같은 기기에서도 다른 ID를 가질 수 있다. ATT approved와 analytics data minimization은 별 판단이다.

## 출처

- [Expo Documentation, LocalAuthentication](https://docs.expo.dev/versions/latest/sdk/local-authentication)
- [Expo Documentation, TrackingTransparency](https://docs.expo.dev/versions/latest/sdk/tracking-transparency)

## 관련 문서

- [[Expo-SDK-SecureStore]]
- [[Expo-Integrations-Authentication]]
- [[Expo-Integrations-Privacy]]
