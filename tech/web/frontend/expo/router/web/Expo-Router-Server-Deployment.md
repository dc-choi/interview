---
tags: [expo, expo-router, web]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 서버 배포와 adapter"]
---

# Expo Router 서버 배포와 adapter

`npx expo export --platform web`은 client와 server artifact를 만든다. API만 필요한 경우 `--no-ssg`를 사용해 website HTML 생성을 건너뛸 수 있다. `npx expo serve`는 export한 production artifact를 로컬에서 실행한다. 실제 배포, 계정 인증과 release build는 이 문서 작성에서 수행하지 않았다.

## native origin version

native 앱은 production server origin을 plugin origin에 연결한다. 자동 versioned deployment는 alpha `EXPO_UNSTABLE_DEPLOY_SERVER=1`로 opt-in한다. 먼저 EAS Hosting project를 한 번 deploy하고 config의 origin 및 expo.extra.router.origin을 비운다. dynamic app.config.js/ts는 자동 연동에 아직 지원되지 않는다.

- build의 Bundle JavaScript 단계에 서버 오류가 드러날 수 있다.
- `EXPO_NO_DEPLOY=1`로 자동 deployment를 건너뛸 수 있다.
- EXPO_OFFLINE에서는 deploy하지 않고 로그는 `.expo/logs/deploy.log`다.
- 수동 deploy 후 명시 origin으로 build하는 방식도 가능하다.

로컬 production 테스트는 export → serve → simulator가 접근할 origin 설정 → release build 순서다. 기기에서 localhost는 개발 컴퓨터가 아닐 수 있으므로 실제 도달 가능한 주소를 사용한다. production 발행 전에 로컬 origin을 제거한다. iOS `--unstable-rebundle`은 native rebuild를 줄이는 실험적 빠른 반복이며 store 전에는 clean build로 확인한다.

## third-party adapter

expo-server는 Metro를 포함하지 않고 `.env`를 자동 로드하지 않는다. hosting provider가 환경 변수를 주입해야 한다. runtime에 따라 createRequestHandler adapter를 선택하고 dist/client static 파일과 dist/server runtime을 함께 전달한다.

| 환경 | entry와 deployment 계약 |
| --- | --- |
| Bun | expo-server/adapter/bun, static file 존재 확인 후 handler에 Request 전달 |
| Express | expo-server/adapter/express, compression/static/morgan 이후 catch-all handler |
| Netlify | netlify/functions/server.ts, adapter/netlify, functions에 dist/server/**/* 포함 |
| Vercel | api/index.ts, adapter/vercel, dist/server/** 포함 후 rewrite |
| Cloudflare Workers | adapter/workerd, SSR guide의 runtime 목록 |
| EAS Hosting | Expo artifact와 내장 runtime 통합 |

Express static은 dist/client를 serve하며 immutable bundle/HTML caching을 구분한다. Netlify는 publish=dist/client와 함수 redirect를 두고 환경 변수를 provider에 등록한다. Vercel의 새 config는 outputDirectory=dist/client, functions/includeFiles와 rewrites, legacy v2는 builds/routes와 static-build를 쓴다. legacy vercel-build script 요구를 새 config에 무조건 더하지 않는다.

third-party adapter는 unofficial/experimental이고 지속 integration test를 보장하지 않는다. API guide의 Bun 예시는 `websocket` 변수가 정의되지 않았으므로 그대로 실행 가능한 server entry로 복제하지 않는다. static 파일 pathname과 filesystem 연결에는 경로/콘텐츠 타입 처리가 별도로 필요하다. SSR guide의 Edge adapter 표기와 API guide의 Node function 예시는 서로 다른 runtime 맥락이므로 provider의 실제 runtime에 맞춰 검증한다.

## 출처

- [Expo Documentation, API Routes](https://docs.expo.dev/router/web/api-routes)
- [Expo Documentation, Server rendering](https://docs.expo.dev/router/web/server-rendering)

## 관련 문서

- [[Expo-Router-API-Routes]]
- [[Expo-Router-Server-Rendering]]
