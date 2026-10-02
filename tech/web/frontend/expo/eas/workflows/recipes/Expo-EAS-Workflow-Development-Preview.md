---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["개발 build와 preview Update 자동화"]
---

# 개발 build와 preview Update 자동화

## 세 종류의 개발 artifact

Android development APK는 Emulator/실기기에 설치할 수 있지만 iOS 실기기와 Simulator는 별도 build다. eas.json의 developmentClient=true, distribution=internal profile과 ios.simulator=true 파생 profile을 준비한다.

세 build job에 dependencies를 두지 않으면 병렬 실행한다. 팀은 dashboard/build:run/build:dev로 적합한 artifact를 설치하고 Expo dev server에서 JS를 로드한다. 원문 예시는 on이 없으므로 수동 실행이며 자동 재빌드를 원하면 GitHub trigger를 추가한다.

## Branch preview

Update를 설정한 새 development build를 먼저 설치한다. 이후 JS/asset 변경을 preview environment와 branch별 Update로 publish할 수 있다.

```yaml
name: Preview update
on:
  push:
    branches: ['*']
jobs:
  preview:
    type: update
    environment: preview
    params:
      branch: ${{ github.ref_name || 'testing' }}
```

위 구성은 연결된 GitHub branch push에서 실행하며 수동 실행에는 testing fallback을 쓴다. 원문 예시의 생략된 environment를 보완해 production 변수가 preview bundle에 들어가는 실수를 줄였다.

## 호환성과 확인

Development build UI/QR로 update를 열더라도 native runtime이 맞아야 한다. Native module이나 plugin 설정을 바꿨다면 새 build가 필요하다. Preview 링크 공유 범위와 테스트 서버의 접근 권한도 확인한다.

## 출처

- [Expo Documentation, Create development builds with EAS Workflows](https://docs.expo.dev/eas/workflows/examples/create-development-builds)
- [Expo Documentation, Publish preview updates with EAS Workflows](https://docs.expo.dev/eas/workflows/examples/publish-preview-update)

## 관련 문서

- [[Expo-EAS-Workflow-Examples]]

- [[Expo]]
