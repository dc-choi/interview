---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["FCM V1 service account와 Android 설정"]
---

# FCM V1 service account와 Android 설정

## 두 파일의 다른 책임

| 파일 | 사용처 | 보관 |
|---|---|---|
| Google service account private JSON | 서버/Expo가 FCM V1 send 인증 | 비밀, git에 커밋하지 않음 |
| google-services.json | Android 앱의 Firebase registration | public-facing project identifier, 앱 native 설정 |

Firebase console Project settings > Service accounts에서 private key를 생성하거나 기존 service account를 사용한다. EAS Credentials의 Android Application Identifier > Service Credentials > FCM V1 service account key에 업로드한다. CLI는 eas credentials의 Google Service Account / Push Notifications(FCM V1) 경로로 설정한다.

기존 service account는 Google Cloud IAM에서 Firebase Cloud Messaging API Admin 역할이 필요하다. 실제 사용 project와 principal의 권한이 맞는지 확인한다. private key를 모바일 앱 bundle이나 docs 예제에 넣지 않는다.

## 앱 연결

Firebase Android app에 해당 package identifier를 등록하고 google-services.json을 내려받는다. app config의 `android.googleServicesFile`에 path를 지정한다. Prebuild/native build로 registration 설정을 포함한다. server credential와 client file은 동일 Firebase sender/project에 속해야 한다.

```json
{
  "expo": {
    "android": {"googleServicesFile": "./google-services.json"}
  }
}
```

## API key restrictions와 Play signing

google-services.json의 current_key에 API restrictions가 있으면 FCM Registration API와 Firebase Installations API가 허용되어야 한다. Android application restriction의 SHA1은 Play Console의 App signing key certificate를 사용한다. upload key fingerprint와 혼동하면 Play 배포 앱의 Firebase Installations 요청이403 PERMISSION_DENIED로 막혀 push token을 받지 못할 수 있다.

development/production binary의 signing certificate가 다르면 각 실행 환경의 restriction도 맞춘다. 단순 service account 업로드 성공과 기기의 token registration 성공은 별개로 확인한다. private credentials rotation은 서버 전송에, client Firebase 설정 변경은 native rebuild에 영향을 준다.

## 출처

- [Expo Documentation, Obtain Google Service Account Keys using FCM V1](https://docs.expo.dev/push-notifications/fcm-credentials)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
