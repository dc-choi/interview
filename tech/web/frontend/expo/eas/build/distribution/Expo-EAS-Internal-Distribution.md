---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS 내부 배포와 iOS 기기 등록"]
---

# EAS 내부 배포와 iOS 기기 등록

## Internal distribution

Profile의 `distribution: internal`은 팀/테스터에게 직접 설치할 수 있는 build를 만든다. Android는 기본 Gradle 작업이 APK를 생성하며 custom command를 쓰면 실제 APK가 나오는지 확인한다. iOS는 ad hoc 또는 enterprise provisioning을 사용한다.

내부 build URL은 기본적으로 URL을 가진 누구나 접근할 수 있다. 프로젝트 설정의 Unauthenticated access to internal builds를 끄면 허가된 Expo 계정 로그인을 요구할 수 있다. 추측하기 어려운 URL과 접근 통제는 다른 조건이다.

## Ad hoc 기기 목록

Ad hoc build는 생성 시 provisioning profile에 포함된 UDID의 기기에만 설치할 수 있다. `eas device:create`는 EAS에 기기를 등록하고, 실제 Apple Portal 반영은 build/profile 생성 또는 resign 때 이뤄진다. 이후 등록한 기기는 기존 바이너리에 자동 추가되지 않는다.

`eas device:list`로 목록, device:rename으로 이름, device:delete로 EAS 삭제와 선택적인 Apple 비활성화를 관리한다. 비활성화가 연간 Apple 등록 한도를 즉시 돌려주는 것으로 해석하지 않는다. 새로 시작/갱신된 membership의 기기는 Apple 처리에 24~72시간 걸릴 수 있어 profile 생성 실패 뒤 처리 완료를 기다려야 한다.

## CI profile 갱신

`--non-interactive`만 쓰면 유효한 기존 profile을 재사용해 새 기기가 빠질 수 있다. EAS CLI 19.1.0 이상에서 다음 옵션으로 Expo-managed ad hoc profile을 갱신할 수 있다.

```sh
eas build --platform ios --profile preview --non-interactive --refresh-ad-hoc-provisioning-profile
```

Internal distribution, EAS 관리 credentials, EAS에 등록된 기기와 App Store Connect API key가 필요하다. key는 CI 환경 또는 프로젝트에 저장된 제출용 key를 사용한다. iOS 대상은 iPhone/iPad, macOS 대상은 Mac 등 해당 플랫폼 기기를 선택한다. Workflows build job의 대응 값은 `refresh_ad_hoc_provisioning_profile: true`다.

## 배포 방식의 선택

Android APK는 기기의 외부 앱 설치 허용을 거쳐 직접 설치한다. iOS ad hoc은 유료 개발자 계정과 UDID 관리가 필요하다. Enterprise는 자격을 갖춘 조직의 내부 직원 배포용이며 공개 사용자 배포의 우회 수단이 아니다. 일반 사용자/외부 대규모 시험에는 스토어 또는 TestFlight 경로와 비교한다.

## 출처

- [Expo Documentation, Internal distribution](https://docs.expo.dev/build/internal-distribution)

## 관련 문서

- [[Expo-EAS-Build-Distribution]]

- [[Expo]]
