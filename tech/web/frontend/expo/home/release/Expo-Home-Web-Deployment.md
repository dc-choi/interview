---
tags: [expo, react-native, release]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 웹 export와 EAS Hosting 배포"]
---

# Expo 웹 export와 EAS Hosting 배포

## Output 계약

EAS Hosting은 Expo Router/React web app을 배포한다. `expo.web.output`은 `static` 또는 `server`여야 한다. static site와 server/API Routes를 포함하는 output의 runtime 요구를 구분한다.

```json
{ "expo": { "web": { "output": "static" } } }
```

```sh
npx expo export --platform web
eas deploy
# 검증한 export를 production으로 배포
eas deploy --prod
```

export는 `dist`를 만들며 app 변경 뒤 deploy 전에 다시 실행한다. deploy가 source의 최신 변경을 자동 반영했다고 가정하지 않는다. 첫 deploy는 preview subdomain을 선택하고 immutable preview URL을 제공한다. 예를 들어 `test-app--1234.expo.app`의 `test-app`이 project subdomain이다. production deploy는 stable production URL로 연결한다.

## 자동 deploy

```yaml
name: Deploy web
on:
  push:
    branches: ['main']
jobs:
  deploy_web:
    type: deploy
    params:
      prod: true
```

`.eas/workflows/deploy-web.yml`과 project integration을 설정하고 `eas workflow:run deploy-web.yml`로 실행할 수 있다. pre-packaged deploy job의 export/build 동작과 env 설정은 EAS Workflow reference를 대조한다. 수동 CLI의 export 필요를 모든 자동 job 내부 구현과 같다고 단정하지 않는다.

aliases와 custom domain은 deployment와 URL을 연결하는 별도 설정이다. API Routes는 server output과 실제 hosting runtime에서 배포하며 native client bundle의 base URL과 secret 처리를 확인한다. website deploy와 App Store release는 서로 다른 배포다.

## 출처

- [Expo Documentation, Publish your web app](https://docs.expo.dev/deploy/web)

## 관련 문서

- [[Expo-Home-Release-Build]]
- [[Expo-Home-Authentication]]
