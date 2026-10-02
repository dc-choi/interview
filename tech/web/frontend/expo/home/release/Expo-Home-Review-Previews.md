---
tags: [expo, react-native, release]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 리뷰용 빌드와 preview 공유"]
---

# Expo 리뷰용 빌드와 preview 공유

## 배포 방법 선택

| 수단 | artifact/runtime | 적합한 상황 |
| --- | --- | --- |
| Store test track | signed release build | 실제 store 설치/update/심사 경로 |
| EAS internal distribution | Android APK, iOS ad hoc/enterprise | development 또는 release build를 빠르게 설치 |
| Development build + EAS Update | installed native runtime + compatible JS/assets | PR/review feedback을 빠르게 반영 |

Expo Go는 운영 릴리스 리뷰의 runtime parity를 제공하지 않는다. Store test track은 release binary를 쓰고 development build는 internal distribution 경로로 공유한다.

Google Play는 internal/closed/open testing track을 제공한다. 공식 Expo guide 기준 internal은 100 testers, closed는 초대, open은 공개 참여이며 실제 계정별 testing requirements를 Play Console에서 확인한다. AAB와 listing/track 설정이 필요하다.

TestFlight는 paid Apple Developer 계정과 App Store Connect upload/processing을 요구한다. Expo guide 기준 internal은 account team 최대100명, external은 최대10000명이며 external beta review가 production App Review와 구분된다. 새로운 tester마다 ad hoc build를 재서명하는 경로와 달리 TestFlight는 기존 processed build를 배포할 수 있다.

## Update preview

```sh
eas update --auto --environment preview
```

현재 git branch 이름으로 update를 발행하고 EAS dashboard link를 reviewer에게 공유한다. Preview dialog의 QR은 compatible installed development build에서 연다. build/runtime/platform이 맞는지 먼저 확인하며 update URL만으로 native code가 설치되지 않는다.

```yaml
name: Publish preview update
on:
  push:
    branches: ['*']
jobs:
  publish_preview_update:
    type: update
    params:
      branch: ${{ github.ref_name || 'test' }}
```

`.eas/workflows/publish-preview-update.yml`에 두고 workflow integration을 설정한다. `eas workflow:run publish-preview-update.yml`로 manual run도 가능하다. trigger pattern과 branch 이름은 현재 repo 정책에 맞추고 민감 값/미완성 native 변경을 무조건 publish하지 않는다.

## Orbit로 실행

Orbit를 설치해 Settings에서 Expo 계정으로 로그인한다. EAS Updates > target update > Preview > Open with Orbit에서 platform을 선택한다. Orbit는 runtimeVersion과 platform이 맞는 최신 development build를 찾아 설치/launch한다.

compatible EAS artifact가 없거나 local build만 있다면 이미 설치된 compatible binary를 Launch with deep link로 열 수 있다. 자동 artifact 검색 실패와 runtime mismatch는 구분한다.

update launch 대상은 Android device/Emulator와 iOS Simulator이며 physical iOS는 지원하지 않는다. Orbit가 build를 실기기에 설치할 수 있는 범위와 update를 launch하는 범위는 같지 않다. macOS/Windows/Linux별 device management 도구도 충족해야 한다.

## 출처

- [Expo Documentation, Overview of distributing apps for review](https://docs.expo.dev/review/overview)
- [Expo Documentation, Share previews with your team](https://docs.expo.dev/review/share-previews-with-your-team)
- [Expo Documentation, How to launch an update using Expo Orbit](https://docs.expo.dev/review/with-orbit)

- [Expo Documentation, Using environment variables](https://docs.expo.dev/eas/environment-variables/usage)

## 관련 문서

- [[Expo-Home-Development-Sharing]]
- [[Expo-Home-Release-Updates]]
