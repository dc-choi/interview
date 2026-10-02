---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo update, 웹과 opt-in 설정"]
---

# Expo update, 웹과 opt-in 설정

## Updates 설정

| 필드 | SDK 57 reference 계약 |
| --- | --- |
| `updates.enabled` | 기본 true. false면 빌드에 포함된 코드/asset만 사용 |
| `checkAutomatically` | ON_LOAD 기본, ON_ERROR_RECOVERY/WIFI_ONLY/NEVER 선택 |
| `fallbackToCacheTimeout` | 시작 때 원격 update를 기다릴 시간. 기본 0ms, 범위 0~300000ms |
| `url` | manifest를 가져올 update 서버 |
| `requestHeaders` | manifest/asset 요청에 추가할 HTTP 헤더. 기존 값 override 가능 |
| `codeSigningCertificate` | PEM X.509 인증서 경로. 지정하면 다운로드 update에 서명 필요 |
| `codeSigningMetadata` | alg는 rsa-v1_5-sha256, keyid는 인증서 key 식별자 |
| `assetPatternsToBeBundled` | 프로젝트 root 기준 asset glob. 생략하면 전체, `['**']`도 전체 |
| `enableBsdiffPatchSupport` | bundle diff 다운로드/적용 지원. 기본 true |

시작 대기시간을 넘겨 다운로드된 update는 다음 실행 때 적용될 수 있다. timeout은 update가 호환되는지 판단하는 값이 아니다.

`useEmbeddedUpdate` 기본 true이며 false로 바꾸면 시작 때 원격 update에 의존한다. 이 경우 ON_LOAD와 충분한 timeout이 필요하고 production 사용은 비권장이다. `disableAntiBrickingMeasures`는 기본 false이며 보호장치 해제는 앱을 실행 불능으로 만들 수 있어 production에 사용하지 않는다. `useNativeDebug`는 update를 켠 native debug build용이며 dev-client/packager JS debugging을 끄는 진단 옵션이다.

## Web 출력

`web.output`은 single/static/server다. 기본 single은 index.html 한 개의 SPA, static은 Router route별 정적 HTML, server는 static HTML과 API Routes를 서버에서 호스팅할 출력이다. 실제 Router 버전의 export/배포 계약을 함께 확인한다.

`web.favicon`, `name`, `shortName`(최대 12자), `lang`, `description`, `dir`은 표시와 언어를 설정한다. `scope`와 `startUrl`은 manifest의 이동/시작 범위이며 startUrl은 manifest 기준 상대 URL이다. `display`, `orientation`, `themeColor`, `backgroundColor`, `barStyle`은 웹 앱 표시 힌트다. 네이티브 설정을 바꾸는 필드가 아니다.

`preferRelatedApplications`는 native 앱을 선호한다는 user agent용 힌트다. `web.splash`는 PWA splash의 배경/이미지/resizeMode, `web.config.firebase`는 Firebase 웹 구성이다. `web.dangerous`는 예고 없는 변경 가능성이 있다.

`web.bundler` 스키마에는 webpack과 metro가 있으나 Expo Webpack은 deprecated다. 새 프로젝트의 universal bundling은 Metro를 기준으로 한다.

## Experiments

| 필드 | 용도 |
| --- | --- |
| `outOfTreePlatforms`, `supportsTVOnly` | 외부 플랫폼 지원 또는 TV 전용 표시 |
| `onDemandFilesystem` | watchFolders 밖 파일의 지연 접근 |
| `autolinkingModuleResolution` | Metro 해석을 Autolinking 결과와 정렬해 native module 버전 불일치 완화 |
| `tsconfigPaths` | TypeScript/JavaScript import alias 지원 |
| `typedRoutes` | TypeScript 기반 Router link 검사 |
| `baseUrl` | production 웹을 `/subpath` 아래 export |
| `reactCanary`, `reactCompiler` | React canary/Compiler opt-in |
| `reactServerComponentRoutes`, `reactServerFunctions` | RSC route와 server function 실험 기능 |
| `inlineModules.watchedDirectories` | inline native module 탐색 경로 |
| `inlineModules.xcodeProjectTargets` | inline 파일을 넣을 Xcode target, 생략 시 main target |

`experiments.buildCacheProvider` 대신 최상위 buildCacheProvider를 사용한다. 오래된 `turboModules` 설명을 SDK 57의 New Architecture 설정 절차로 복제하지 않는다. 필드의 존재와 기능의 현재 release status는 별개이므로 [[Expo-Release-Statuses]]와 해당 기능 reference를 확인한다.

## 출처

- [Expo Documentation, app.json / app.config.js](https://docs.expo.dev/versions/latest/config/app)

## 관련 문서

- [[Expo-Configuration-Reference]]

- [[Expo]]
