---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS 로컬 자격 증명과 이전"]
---

# EAS 로컬 자격 증명과 이전

## credentials.json

`credentialsSource: local`은 credentials.json에 적힌 파일 경로와 암호를 사용한다. remote는 EAS 저장본을 사용하며 기본값이다. local이라는 이름은 cloud build에 자료를 보내지 않는다는 뜻이 아니다. cloud job 실행에 필요한 자료는 업로드되고 job 완료 후 폐기되는 경로다.

Android는 keystorePath, keystorePassword, keyAlias, keyPassword를 설정한다. iOS는 provisioningProfilePath와 distributionCertificate의 path/password를 설정한다. 경로는 프로젝트 기준 상대 경로나 절대 경로를 지원한다.

```json
{
  "android": {
    "keystore": {
      "keystorePath": "private/release.jks",
      "keystorePassword": "SECRET_VALUE",
      "keyAlias": "release",
      "keyPassword": "SECRET_VALUE"
    }
  }
}
```

예제의 SECRET_VALUE는 설명용이며 실제 값은 안전하게 주입한다. credentials.json과 실제 key/certificate/profile 파일 모두 Git에서 제외한다. iOS extension처럼 여러 target이 있으면 ios 아래 target 이름별로 각 profile과 인증서를 지정한다.

## CI 복원

CI에서는 비밀 저장소에서 파일을 복원하고 JSON의 경로와 일치시킨 뒤 build를 요청한다. Base64는 텍스트 운반 형식이며 암호화가 아니다. 인코딩 문자열이나 복원 파일을 로그/artifact에 노출하지 않는다. JSON만 복원하고 keystore/p12를 빼면 서명이 실패한다.

## 기존 자료 이전

기존에 배포한 앱의 서명 자료를 먼저 local credentials.json으로 구성한다. 이후 local로 계속 사용하거나 `eas credentials`에서 EAS로 업로드해 관리형으로 전환할 수 있다. 관리 방식을 바꾸는 작업과 앱의 서명 key를 바꾸는 작업을 구분한다.

## 원격과 로컬 동기화

`eas credentials`에서 플랫폼을 고르고 credentials.json upload/download 메뉴를 사용한다. 플랫폼별로 반복한다. 원격에서 내려받았다고 build profile의 credentialsSource가 자동으로 원하는 값이 됐다고 판단하지 않는다.

Xcode에서 직접 iOS 앱을 서명하려면 인증서를 Keychain에 설치하고 Signing & Capabilities에서 provisioning profile을 선택한다. EAS에 파일을 보유한 상태와 로컬 Xcode가 사용할 수 있는 상태는 다르다.

## 출처

- [Expo Documentation, Using local credentials](https://docs.expo.dev/app-signing/local-credentials)
- [Expo Documentation, Using existing credentials](https://docs.expo.dev/app-signing/existing-credentials)
- [Expo Documentation, Sync credentials between remote and local sources](https://docs.expo.dev/app-signing/syncing-credentials)

## 관련 문서

- [[Expo-EAS-Build-Signing]]

- [[Expo]]
