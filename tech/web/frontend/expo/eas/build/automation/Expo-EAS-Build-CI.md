---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["CI와 GitHub에서 EAS Build 실행"]
---

# CI와 GitHub에서 EAS Build 실행

## 비대화형 CI

먼저 각 플랫폼에서 대화형 EAS build를 한 번 성공시켜 projectId, eas.json, android.package/ios.bundleIdentifier와 서명 자료를 준비한다. 원격 EAS build를 로컬 터미널에서 요청했다는 뜻이며 `--local` 빌드를 반드시 수행하라는 뜻은 아니다.

다른 CI는 안전하게 보관한 `EXPO_TOKEN`으로 인증한다. Apple credential 복구/기기 갱신에는 ASC API key와 `EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`, `EXPO_ASC_ISSUER_ID`, 필요 시 `EXPO_APPLE_TEAM_ID`, `EXPO_APPLE_TEAM_TYPE`을 전달한다.

```sh
npx eas-cli build --platform all --non-interactive --no-wait
```

`--no-wait`가 있으면 CI 성공은 원격 build 요청 성공까지만 뜻한다. 다음 단계가 바이너리 결과를 필요로 하면 기다리거나 별도 최종 상태 확인을 연결한다. GitHub Actions/GitLab/CircleCI/Bitbucket/Travis에서도 핵심은 checkout, 올바른 toolchain, lockfile 설치, token, build 요청과 결과 확인이다.

EAS Workflows는 `.eas/workflows` YAML의 push/manual trigger와 build job으로 같은 작업을 서비스 내에서 자동화한다. iOS ad hoc의 새 기기 포함 여부는 [[Expo-EAS-Internal-Distribution]]의 profile refresh 조건을 따른다.

## Expo GitHub App

Expo 프로젝트와 GitHub repository를 연결하고 Expo 계정의 Owner/Admin 권한, 접근 가능한 연결 GitHub 사용자와 App 권한을 확인한다. 앱이 monorepo 하위에 있으면 Base directory를 설정한다. GitHub organization repository 연결에는 Expo organization 조건이 있다.

Dashboard Build from GitHub는 Git ref, platform, profile과 필요 시 일회성 base directory를 선택한다. build profile의 image와 필요한 credentials를 먼저 준비한다. profile이 없거나 base directory가 잘못되면 dispatch되지 않는다.

## PR label과 trigger

PR label은 `eas-build-[platform]:[profile]` 형식이다. platform은 android/ios/all이며 생략 시 all, profile 생략 시 production이다. 문서에는 PR label이 base branch 최신 commit을 build한다는 표현이 있으므로 PR head를 검증했다고 자동 단정하지 않는다. 실제 build detail의 Git SHA를 검토 대상 SHA와 비교한다.

기존 dashboard Build triggers 기능은 deprecated이며 새 프로젝트에서는 비활성화됐다. 새 자동화는 EAS Workflows를 기준으로 한다. 외부 기여 PR에 인증 token이나 제출 권한을 무조건 노출하지 않고 승인된 소스와 job 권한 범위를 구분한다.

## 출처

- [Expo Documentation, Trigger builds from CI](https://docs.expo.dev/build/building-on-ci)
- [Expo Documentation, Trigger builds from the Expo GitHub App](https://docs.expo.dev/build/building-from-github)

## 관련 문서

- [[Expo-EAS-Build-Automation]]

- [[Expo]]
