---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo iOS와 Android app config"]
---

# Expo iOS와 Android app config

## iOS 식별과 화면

`ios.bundleIdentifier`는 배포 앱의 고유 ID, `appleTeamId`는 native target의 Apple 개발팀, `buildNumber`는 CFBundleVersion이다. `ios.version`은 공통 version보다 우선한다. `deploymentTarget`은 지원할 최소 iOS이며 SDK가 요구하는 최저 버전보다 무작정 내릴 수 있다는 뜻은 아니다.

`ios.icon`은 이미지 경로나 `.icon` 디렉터리 또는 light/dark/tinted 아이콘 객체다. 공통 icon을 덮어쓰며 iOS 디자인 지침을 따른다. `supportsTablet` 기본 false, `isTabletOnly`는 태블릿 전용, `requireFullScreen`은 iPad Slide Over/Split View 제한이다. `appStoreUrl`은 배포된 앱 링크다.

## iOS capability와 개인정보

`infoPlist`와 `entitlements`는 native plist에 임의 값을 추가하며 Expo가 의미까지 검증하지 않는다. 최종 native 출력과 서명 capability가 일치하는지 확인한다.

| 필드 | 역할 |
| --- | --- |
| `privacyManifests.NSPrivacyAccessedAPITypes` | required reason API 범주와 사용 이유 |
| `NSPrivacyTracking`, `NSPrivacyTrackingDomains` | tracking 여부와 domain |
| `NSPrivacyCollectedDataTypes` | 수집 자료 유형, 연결/추적 여부와 목적 |
| `associatedDomains` | `applinks:도메인` 형식의 연결 도메인 |
| `usesIcloudStorage` | DocumentPicker의 iCloud storage 사용 |
| `usesAppleSignIn` | Apple Sign-In 사용 |
| `usesBroadcastPushNotifications` | EAS capability sync에서 push broadcast 설정 사용 |
| `accessesContactNotes` | 연락처 notes 접근 capability. Apple 허가가 별도로 필요 |
| `googleServicesFile` | GoogleService-Info.plist 경로 |
| `config.usesNonExemptEncryption` | ITSAppUsesNonExemptEncryption 값 |

EAS를 사용하지 않으면 broadcast 설정만 적어서는 Apple Developer capability를 변경하지 못한다. `ios.config`가 production manifest에서 빠지는 것은 build에 주입한 API key가 바이너리에서도 비밀로 보호된다는 뜻이 아니다. 지도 key는 해당 지도 패키지 plugin 구성을 우선 대조한다.

## Android 식별과 표시

`android.package`는 application ID, `versionCode`는 양의 정수 빌드 번호이며 release마다 증가시킨다. `android.version`은 공통 version보다 우선한다. `playStoreUrl`은 배포 페이지 링크다.

`adaptiveIcon.foregroundImage`가 있으면 일반 icon보다 우선한다. `backgroundImage`는 같은 크기의 배경으로 backgroundColor보다 우선하며 foreground가 없으면 효과가 없다. `monochromeImage`는 Android 13 이상 themed icon용이다.

## Android 권한과 링크

`permissions`는 Prebuild 때 manifest에 추가할 권한이다. `blockedPermissions`는 의존성에서 merge되는 권한까지 최종 manifest에서 제거하며 Expo Go에는 적용되지 않는다. 실제 사용자 동의 요청은 별도 runtime API로 처리한다.

`googleServicesFile`은 google-services.json 경로다. `intentFilters`는 action/data/category와 `autoVerify`를 설정한다. 앱 링크 검증에는 서버에서 도메인 소유를 증명하는 JSON 구성도 필요하므로 autoVerify만 켜는 것으로 끝나지 않는다.

`softwareKeyboardLayoutMode`는 resize/pan이며 기본 resize다. `allowBackup`은 기본 true인 Android backup 설정을 제어한다. 실제 OS와 기기 전송 정책까지 앱 설정 하나로 보장한다고 해석하지 않는다. `predictiveBackGestureEnabled`는 Android 13 이상 predictive back 설정이며 reference 기본값은 false다.

## 유지보수 경계

`publishManifestPath`, `publishBundlePath`, `ios.bitcode`처럼 스키마에 남은 필드를 새 EAS 배포 절차로 해석하지 않는다. 기존 native project를 직접 관리한다면 Info.plist, entitlements, AndroidManifest와 Gradle/Xcode 설정을 실제로 확인한다. app config 변경은 이미 설치된 앱에 OTA만으로 native 설정을 바꾸지 못한다.

## 출처

- [Expo Documentation, app.json / app.config.js](https://docs.expo.dev/versions/latest/config/app)

## 관련 문서

- [[Expo-Configuration-Reference]]

- [[Expo]]
