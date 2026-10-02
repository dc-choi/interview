---
tags: [expo, expo-integrations, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Firebase JS와 native SDK"]
---

# Expo Firebase JS와 native SDK

Firebase는 auth/database/storage/analytics/crash 등을 제공하지만 Expo Go에서 모든 제품을 같은 package로 쓸 수 없다. Android/iOS/web 공통 JS API와 Android/iOS native SDK wrapper를 구분한다.

## Firebase JS SDK

Auth/Firestore/Realtime Database/Storage를 JS SDK로 사용할 수 있고 custom native plugin 없이 Expo Go에서 시작한다. Expo guide는 firebase>=12.0.0을 요구하며 이전 버전은 ES module resolution error가 날 수 있다. v9 이후 modular API에서 firebase/app initializeApp(config) 후 firebase/auth, firebase/firestore 등 필요한 service만 import한다.

```ts
import { initializeApp } from 'firebase/app';
const app = initializeApp({ apiKey:'<PUBLIC_CLIENT_KEY>',
  authDomain:'<project>.firebaseapp.com', projectId:'<project>',
  storageBucket:'<bucket>', appId:'<APP_ID>' });
```

config는 Firebase project에 web app을 등록해 받는다. client API key는 서버 service account secret과 다르며 data access는 Firebase security rule로 제한한다. Auth reload persistence는 RN storage에 맞춘 별도 설정을 확인한다. JS SDK의 mobile Analytics/Crashlytics 미지원은 native SDK 선택 이유다.

## React Native Firebase

@react-native-firebase/app은 native core이며 원하는 service module을 추가한다. expo-dev-client와 해당 module의 config plugin/native Firebase 설정이 필요하고 Expo Go에는 없는 module이다. EAS development build는 로컬 실행 없이 만들 수 있으며 로컬 build에는 Android Studio/Xcode 설정이 필요하다. CNG의 native 설정을 적용한 뒤 binary를 새로 빌드한다. JS update만으로 native module을 추가하지 않는다.

원문은 Dynamic Links를 native SDK 선택 예로 남겨 두었지만 해당 서비스의 현재 운영/종료 여부를 확인하지 않은 채 신규 도입을 권장하지 않는다. 예전 expo-firebase-analytics/expo-firebase-recaptcha는 React Native Firebase migration 대상으로 본다. SDK 설치 후에도 console credential, bundle/package, service permission과 실제 release build 동작은 provider 문서에서 제품별로 검증한다.

## 출처

- [Expo Documentation, Using Firebase](https://docs.expo.dev/guides/using-firebase)

## 관련 문서

- [[Expo-Integrations-Authentication]]
- [[Expo-Integrations-Analytics]]
- [[Expo-Integrations-Supabase]]
