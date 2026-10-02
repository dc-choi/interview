---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Submit 설정과 제출 단계"]
---

# EAS Submit 설정과 제출 단계

## 제출과 출시

EAS Submit은 Android/iOS 바이너리를 스토어의 배포 시스템에 업로드한다. 빌드를 만드는 EAS Build, 테스터에게 설치를 허용하는 설정, 공개 출시 심사는 별도 단계다. 기존 build를 다시 제출할 때 소스를 다시 compile할 필요는 없다.

```sh
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

명령은 제출할 EAS build 또는 파일을 선택하고 필요한 정보를 묻는다. 자동화에서는 artifact/build ID와 profile을 명시하고 실제 제출 결과를 확인한다. `eas build --auto-submit`은 빌드 성공 뒤 제출을 연결하지만 공개 출시 승인까지 처리하지 않는다.

## submit profile

eas.json의 `submit`과 `build`는 서로 다른 객체다. submit profile 이름은 자유롭게 정한다. interactive 제출은 파일 없이 가능하지만 CI에서는 명시적인 설정이 재현에 유리하다.

```json
{
  "submit": {
    "production": {
      "android": { "track": "internal" },
      "ios": { "ascAppId": "1234567890" }
    }
  }
}
```

production 기본값과 build profile 이름에 따른 선택 규칙에 의존하기보다 `--profile`로 의도를 정한다. `extends`는 최대 깊이 5이며 순환 상속은 허용되지 않는다. 키 파일 자체를 Git에 저장하지 않는다.

## 완료 확인

CLI 요청 접수와 스토어 처리 완료를 구분한다. 제출 dashboard, App Store Connect/Play Console에서 artifact의 식별자, versionCode/buildNumber, track/group과 처리 결과를 확인한다. metadata, privacy, 계정 검증 또는 심사 때문에 업로드 성공 뒤에도 출시가 막힐 수 있다.

## 출처

- [Expo Documentation, Configure EAS Submit with eas.json](https://docs.expo.dev/submit/eas-json)

## 관련 문서

- [[Expo-EAS-Submit]]

- [[Expo]]
