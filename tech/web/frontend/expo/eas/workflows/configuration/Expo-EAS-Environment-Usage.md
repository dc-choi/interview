---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Build Update Hosting의 환경 변수 평가"]
---

# Build Update Hosting의 환경 변수 평가

## Build와 Update

Build profile의 environment로 사용할 EAS 변수 집합을 정한다. 생략 시 store distribution은 production, developmentClient는 development, 나머지는 preview로 결정되므로 profile 이름만 보고 환경을 판단하지 않는다.

SDK 55 이상에서 `eas update --environment production`처럼 environment가 필수다. 지정한 EAS environment의 plaintext/sensitive로 bundle을 만들며 로컬 .env를 사용하지 않는다. 서버 밖에서 읽을 수 없는 secret은 이 Update export 경로에 사용할 수 없다.

Build worker는 CI, EAS_BUILD, EAS_BUILD_PLATFORM, EAS_BUILD_RUNNER, EAS_BUILD_ID/PROFILE/PROJECT_ID, EAS_BUILD_GIT_COMMIT_HASH/WORKINGDIR 등의 runtime 정보를 제공한다. 로컬 app.config 평가에도 존재한다고 가정하지 않는다. EAS_BUILD_USERNAME은 bot에서 없을 수 있다.

EAS_BUILD_DISABLE_BUNDLE_JAVASCRIPT_STEP=1은 앞선 JS bundle 검사만 건너뛴다. 오류가 없어지는 것이 아니라 native build 단계에서 늦게 드러날 수 있다. NPM/MAVEN/COCOAPODS cache 비활성화 변수도 각 계층만 제어한다.

## Hosting의 두 단계

```sh
eas env:pull --environment production
npx expo export --platform web
eas deploy --environment production
```

Export 때 EXPO_PUBLIC_ 값이 browser bundle에 들어가고 deploy 때 server/API route 변수가 연결된다. deploy에 environment만 넣어도 이미 export한 client bundle이 다시 작성되지는 않는다.

현재 Hosting은 plaintext/sensitive만 지원하며 secret visibility를 배포할 수 없다. 서버 전용 민감 값은 sensitive로 두고 client 코드에 포함하지 않는다. deployment는 불변이므로 변수 변경 후 필요한 export와 deploy를 다시 수행한다.

## 다른 명령과 외부 관리

`eas env:exec production '명령'`으로 서버 밖에서 읽을 수 있는 변수를 다른 명령에 공급할 수 있다. Source map upload 인증처럼 로컬/CI에서 필요한 값은 이 조회 범위를 고려한다.

EAS 없이 dotenv나 외부 secret manager가 환경을 주입하는 방식도 가능하다. Expo CLI의 .env 로딩과 EAS CLI의 app.config 평가를 구분한다. without-eas 원문의 .env를 ignore에서 제외하라는 일반 설명은 SDK 57 Update의 environment 필수 규칙과 그대로 호환되지 않는다. secret 파일을 Git에 공개하는 해결책으로 사용하지 말고 각 runner에 필요한 값을 안전하게 공급한다.

## 출처

- [Expo Documentation, Using environment variables in EAS](https://docs.expo.dev/eas/environment-variables/usage)
- [Expo Documentation, Using environment variables without EAS](https://docs.expo.dev/eas/environment-variables/without-eas)

## 관련 문서

- [[Expo-EAS-Configuration]]

- [[Expo]]
