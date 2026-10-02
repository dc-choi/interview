---
tags: [react-native, ios, deployment, app-store]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native iOS Release와 App Store 배포"]
---

# React Native iOS Release와 App Store 배포

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## release 배포의 전제

RN의 iOS 배포도 native iOS 앱의 signing, archive와 App Store Connect 제출 흐름을 따른다. RN에 추가로 필요한 계약은 JS/asset bundle을 binary에 포함하고 개발 메뉴를 끄는 것이다. Expo 앱은 [[Expo]]의 EAS 배포 흐름도 사용할 수 있다.

## Release scheme

Xcode에서 Product, Scheme, Edit Scheme을 연다. Run의 Build Configuration을 Release로 설정한다.

Release에서는 in-app Dev Menu를 비활성화하고 JavaScript를 로컬 bundle에 포함한다. 개발 컴퓨터나 Metro 없이 실제 기기에서 테스트한다.

```sh
npm run ios -- --mode="Release"
```

CLI의 Release 실행은 로컬 빌드/테스트 경로다. App Store 제출 archive와 signing 준비가 자동으로 모두 끝났다는 뜻은 아니다.

## Debug bundle 생성 최적화

가이드는 실제 device를 target으로 할 때 Debug에도 static bundle이 만들어진다고 안내한다. Debug 반복 빌드에서 생성 시간을 줄일 필요가 있으면 Xcode의 Bundle React Native code and images build phase에 다음 조건을 둘 수 있다.

```sh
if [ "${CONFIGURATION}" = "Debug" ]; then
  export SKIP_BUNDLING=true
fi
```

Release까지 skip하게 만들지 않는다. script 조건, 실제 configuration과 Metro 의존성을 함께 확인한다.

## release 빌드와 Archive

1. `.xcworkspace`를 Xcode에서 연다.
2. local release build는 Product, Build 또는 Cmd+B로 수행한다.
3. App Store용 archive는 device를 Any iOS Device (arm64) 등 archive 가능한 destination으로 바꾸고 Product, Archive를 실행한다.
4. Bundle Identifier가 Apple Developer의 등록 identifier와 같은지 확인한다.
5. archive 완료 후 Organizer에서 Distribute App을 선택한다.

Simulator binary를 store archive로 간주하지 않는다. Run scheme의 configuration뿐 아니라 Archive action의 설정과 signing target도 검토한다.

## App Store Connect 업로드

RN 가이드의 Xcode 업로드 흐름은 App Store Connect, Upload, 옵션 확인, signing 방식 선택, Upload다. Xcode 버전에 따라 화면 label과 옵션이 달라질 수 있으므로 실제 Xcode 도움말을 대조한다.

- Automatically manage signing 또는 Manually manage signing을 프로젝트/계정 요구에 따라 선택한다.
- 업로드 후 App Store Connect의 build와 TestFlight 처리 상태를 확인한다.
- 필요한 앱 정보를 채우고 Build를 선택하여 저장한 뒤 review를 제출한다.

업로드 성공과 심사 승인, store 공개는 별개 상태다. 각 단계의 결과를 구분한다.

## Screenshot과 제출 요구

App Store에는 지원 device/display에 맞는 screenshot이 필요하다. 일부 display size는 다른 size의 screenshot으로 대체될 수 있다. 구체적인 최신 크기/개수는 Apple의 screenshot specifications에서 확인하고, RN 가이드의 일반 안내를 고정 규격으로 취급하지 않는다.

## 배포 확인 항목

- Metro 없이 cold start하고 모든 asset과 초기 화면이 표시되는지 확인한다.
- Dev Menu가 release에서 노출되지 않는지 확인한다.
- native modules, permission, network와 앱 재시작을 release 기기로 확인한다.
- Bundle Identifier, signing certificate/profile과 archive build configuration을 대조한다.
- App Store Connect에서 실제 업로드 build가 선택되었는지 확인한다.

이 정리에서는 signing 계정 접근, Archive 업로드와 App Store 심사를 수행하지 않았다.

## 출처

- [React Native, Publishing to Apple App Store](https://reactnative.dev/docs/publishing-to-app-store)

## 관련 문서

- [[RN-iOS-Simulator-and-Linking]]
- [[RN-iOS-App-Extensions]]
- [[Expo]]
