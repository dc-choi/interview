---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Hosting의 export와 첫 배포"]
---

# EAS Hosting의 export와 첫 배포

EAS Hosting은 Expo Router/React Native web의 정적 asset, API route와 server function을 배포한다. native 앱과 서버 버전 연결, Android/iOS/web의 공통 배포와 관찰에 유용하다. web component가 없거나 기존 hosting이 충분한 프로젝트에는 별도 선택이며 full Node.js process를 요구하면 worker 제약을 먼저 확인한다.

## 출력 방식과 export

expo.web.output=single은 index.html 하나인 SPA, static은 정적 생성 페이지, server는 API route/server function과 정적 페이지를 만든다. API route의 +api.ts에는 server output이 필요하다. 출력 방식의 렌더링 계약은 [[Expo-Router-Static-Rendering]]과 [[Expo-Router-API-Routes]]를 연결한다.

```sh
npx expo export --platform web
eas deploy
```

명령은 배포 절차 예시다. EAS account와 CLI가 필요하며 eas login/eas whoami로 계정을 준비한다. 전역 CLI 설치 대신 npx eas-cli@latest도 사용할 수 있다. 배포 전에 매번 export하여 최신 dist를 만든다. deploy가 stale dist를 자동으로 새 export로 바꾼다고 가정하지 않는다.

첫 배포는 EAS project 연결과 preview subdomain을 선택하고 preview URL와 Dashboard details를 출력한다. subdomain이 my-app이면 배포 URL은 my-app--<deploymentId>.expo.app, production은 my-app.expo.app이다. Free plan도 사용할 수 있으며 paid plan의 deployments/bandwidth/storage/requests/custom domain 범위는 현재 가격표를 확인한다.

## 배포와 관찰의 경계

각 배포는 immutable이다. preview와 production에 대한 mutable alias를 별도로 관리하고 rollback은 기존 배포에 alias를 다시 지정한다. backend의 데이터 변경은 alias 이동만으로 되돌아가지 않는다. process.env의 server 변수와 export 시 client bundle에 포함되는 값은 노출 범위가 다르므로 secret을 공개 client 값에 넣지 않는다.

Hosting은 crashes/logs/requests를 제공하지만 높은 traffic에서는 sampling된다. V8 isolate runtime와 부분 Node 지원을 사용하므로 dependency의 fs/server/thread 요구를 점검한다. 배포만으로 앱/서버 버전 호환성이 자동 보장되지는 않는다.

## 출처

- [Expo Documentation, Introduction to EAS Hosting](https://docs.expo.dev/eas/hosting/introduction)
- [Expo Documentation, Deploy your first Expo Router and React app](https://docs.expo.dev/eas/hosting/get-started)

## 관련 문서

- [[Expo-EAS-Hosting-Aliases]]
- [[Expo-EAS-Hosting-Runtime]]
- [[Expo-EAS-Hosting-Observability]]
