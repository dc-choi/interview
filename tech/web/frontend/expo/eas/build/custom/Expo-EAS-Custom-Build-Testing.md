---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Custom build의 Maestro 실행"]
---

# Custom build의 Maestro 실행

## 통합 테스트 단계

eas/maestro_test는 Maestro 설치, Emulator/Simulator 준비, 앱 설치, flow 실행과 테스트 artifact 업로드를 묶는다. flow_path는 필수이며 newline으로 여러 flow 경로를 받는다. app_path를 생략하면 Android APK 또는 iOS Simulator .app의 기본 출력 위치를 찾는다.

```yaml
build:
  steps:
    - eas/build
    - eas/maestro_test:
        inputs:
          flow_path: maestro/sign-in.yml
```

테스트 runner에 설치할 수 있는 artifact를 만들어야 한다. AAB나 실기기 서명 IPA를 Simulator용 앱으로 취급하지 않는다. Maestro version, 기기 또는 artifact 수집을 더 조절해야 하면 개별 단계를 구성한다.

## 개별 함수

eas/install_maestro는 maestro_version을 받으며 생략 시 latest를 설치한다. 재현성이 중요하면 테스트한 버전을 고정한다. eas/start_android_emulator의 system_image_package는 x86_64 system image를 지정하며 device_name으로 기기 이름을 정한다. 원문의 확장 예제에 있는 system_package_name과 표가 다르므로 계약 표의 system_image_package를 따른다.

eas/start_ios_simulator는 device_identifier로 기기 이름 또는 UDID를 받는다. image가 바뀌면 그 기기가 사라질 수 있으므로 지정이 필요한 이유와 지원 목록을 확인한다.

## 인프라와 실패 자료

Custom build schema에는 Android Emulator가 old Build Infrastructure를 필요로 한다는 안내가 남아 있다. 이를 최신 EAS Workflows Maestro job의 조건에 그대로 확대하지 않는다. 해당 custom build runner에서 Emulator 실행 지원을 먼저 확인한다. Xcode 15.0/15.2 timeout에 대한 오래된 회피 안내도 현재 image의 보증으로 읽지 않는다.

직접 구성한 테스트에서는 APK/.app 검색 결과가 없으면 명확히 실패시키고 flow 실패 코드를 보존한다. 테스트 artifact는 `if: ${ always() }`로 실패 때도 수집할 수 있으나 같은 type의 중복 업로드 제한을 확인한다. 로그와 screenshot에 담긴 계정/사용자 데이터를 배포 범위에 맞게 관리한다.

## 출처

- [Expo Documentation, Custom build configuration schema](https://docs.expo.dev/custom-builds/schema)

## 관련 문서

- [[Expo-EAS-Custom-Build-Reference]]

- [[Expo]]
