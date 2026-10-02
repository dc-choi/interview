---
tags: [expo, expo-integrations, platforms]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["iOS 개발 모드와 internal build 실행"]
---

# iOS 개발 모드와 internal build 실행

iOS16+ physical device에서 internal distribution과 local development build 실행에는 OS Developer Mode가 필요하다. enterprise provisioning이나 iOS Simulator에는 이 조건이 적용되지 않는다. App Store production app의 일반 사용 설정과 구분한다.

## Device에서 활성화

development build를 먼저 설치하고 app을 열면 Developer Mode alert가 나타날 수 있다. Settings→Privacy & Security→Developer Mode에서 toggle을 켜고 restart한다. 재시작 뒤 unlock/Turn On/passcode 확인을 완료해야 활성화된다. 다시 끄면 재활성화 때 같은 흐름을 반복한다.

## Xcode로 준비

Mac에 Xcode가 있으면 USB로 연결해 device에서 Trust This Computer를 승인한다. Xcode→Open Developer Tool→Device Hub에서 device를 선택해 enable 안내를 보고 기기 Settings에서 toggle/restart/Turn On을 완료한다. 이 경로는 앱을 먼저 설치하지 않아도 설정을 노출한다.

OS-level Developer Mode가 켜졌다고 provisioning, device registration, debug server network와 native dependency가 모두 준비된 것은 아니다. 설치가 되지만 실행되지 않으면 그 경계를 따로 확인한다. 문서 작업에서는 기기 설정이나 재시작을 수행하지 않았다.

## 출처

- [Expo Documentation, iOS Developer Mode](https://docs.expo.dev/guides/ios-developer-mode)

## 관련 문서

- [[Expo-Integrations-Troubleshooting]]
- [[Expo-Integrations-Upgrade]]
