---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Android 스토어 제출과 수동 업로드"]
---

# Android 스토어 제출과 수동 업로드

## EAS Submit 준비

Play Console 앱 레코드, 일치하는 Android package, 배포용 AAB와 Google Service Account 권한을 준비한다. 서비스 계정 키는 EAS의 해당 앱 credential에 연결한다. Google Play의 신규 앱 배포에는 AAB를 사용하고 직접 설치용 APK와 구분한다.

현재 Android 제출 가이드는 첫 build도 EAS Submit으로 internal track에 제출할 수 있다고 설명한다. Console에서 앱을 생성하고 필요한 설정을 완료해야 하며 앱이 draft 상태일 수 있다. 일부 오래된 보안/CI 안내의 첫 수동 업로드 필수 설명과 충돌하므로 모든 앱에 수동 첫 업로드를 강제하지 않는다. 계정과 앱 상태에 따른 Console 요구사항을 확인한다.

## 자동 제출

```sh
eas submit --platform android --profile production
```

제출 profile에서 track을 정하고 서비스 계정이 그 앱에 배포 권한을 갖는지 확인한다. `--auto-submit` 또는 Workflow의 build 의존 submit job으로 연결할 수 있다. CI의 `EXPO_TOKEN`은 Expo 인증이며 Google의 제출 credential을 대체하지 않는다.

internal upload 후 테스터 목록과 opt-in 링크를 설정한다. production 승격 전 스토어 listing, 개인정보 관련 신고와 계정별 테스트 요건을 완료한다. 업로드 성공이 사용자에게 공개되었다는 뜻은 아니다.

## 수동 Play Console 경로

Console에 앱을 만들고 이름, 기본 언어, 앱/게임 구분과 유료/무료 정보를 지정한다. Internal testing에 테스터 목록을 연결하고 release를 생성한다. Play App Signing을 설정한 뒤 AAB를 업로드하고 release 내용을 검토한다.

같은 versionCode는 다시 사용할 수 없다. package와 서명이 기존 앱에 맞아야 한다. 검토 화면의 오류를 해결하고 테스트 release를 배포한 뒤 적절한 track으로 승격한다. 사람의 이메일 목록이나 서비스 계정 키를 문서나 저장소에 복사하지 않는다.

## 출처

- [Expo Documentation, Submit to the Google Play Store with EAS Submit](https://docs.expo.dev/submit/android)
- [Expo Documentation, Manually submit an Android app to the Google Play Store](https://docs.expo.dev/submit/android-manual)

## 관련 문서

- [[Expo-EAS-Submit]]

- [[Expo]]
