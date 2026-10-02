---
tags: [expo, expo-router, migration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Webpack에서 Metro와 Expo Router로 이전"]
---

# Expo Webpack에서 Metro와 Expo Router로 이전

@expo/webpack-config는 deprecated이고 새 기능 업데이트를 받지 않는다. Webpack4의 Expo 웹은 bundler integration과 SPA 중심이었고 Router는 native/web route와 rendering을 함께 구성한다. Metro가 모든 Webpack plugin과 tree shaking 기능을 그대로 제공한다는 뜻은 아니다.

## 파일과 빌드 대응

| 기존 | Router/Metro |
| --- | --- |
| webpack.config.js, @expo/webpack-config | metro.config.js, Expo Metro config |
| expo export:web | expo export --platform web |
| web-build/ | dist/ |
| web/ static resource | public/ |
| web/index.html single template | static output은 src/app/+html.tsx, single output은 public/index.html |
| PUBLIC_URL, package homepage | 실험적 expo.experiments.baseUrl |

`web.output: static`은 route별 HTML로 SEO와 social preview를 만들고 single은 SPA HTML 하나를 만든다. public 내용은 export 시 dist에 복사되지만 native production에서 URL로 요청할 public file은 실제 server hosting이 필요하다. `--dump-sourcemap`은 export sourcemap을 만든다.

Babel은 native와 web이 root babel.config.js를 공유하고 `api.caller(caller => caller && caller.platform)`으로 platform별 plugin을 선택할 수 있다. 모든 platform dev server는 동일 port에서 serving/log/refresh를 제공한다. fake HTTPS native hosting과 실제 HTTPS tunnel을 혼동하지 않는다. Fast Refresh는 기본 제공하므로 Webpack react-refresh plugin을 복제하지 않는다.

app config는 babel-preset-expo를 거쳐 expo-constants에 반영된다. app.json 변경이 보이지 않으면 Babel/Metro cache를 지우고 새로 bundling한다. web.favicon은 favicon 생성 source다. Global CSS, CSS Modules, font optimization, bundle splitting과 lazy bundling은 Metro의 해당 SDK 기능이며 plugin은 Metro pipeline에 맞춰 이전한다.

## Subpath와 PWA

실험적 baseUrl은 asset prefix만이 아니라 route URL에도 prefix를 넣는다. `/profile`이 `/site/profile`로 바뀌므로 client links, server rewrite, manifest start_url과 service worker scope까지 같이 검토한다.

Router는 PWA manifest를 자동 생성하지 않는다. public/manifest.json에 name/short_name/icons/start_url/display/theme_color/background_color를 만들고 +html의 `<link rel="manifest" href="/manifest.json" />`로 연결한다. subpath에서는 root path를 그대로 쓰지 않는다.

Workbox Webpack plugin을 Metro plugin으로 옮길 수는 없지만 export 이후 CLI post-build로 generated dist를 precache할 수 있다. 흐름은 expo export → Workbox config(dist root, dist/sw.js) → generateSW다. service worker registration은 browser load event에서 실행하고 +html의 Node render 중 navigator를 직접 사용하지 않는다. 등록 script를 HTML에 넣는 것과 Node에서 실행하는 것을 구분한다.

공격적으로 HTML/JS를 precache하면 새 배포가 오래된 shell을 계속 사용하는 문제가 생길 수 있다. cache version, 업데이트/폐기와 배포 atomicity를 설계한 뒤 offline 기능을 도입한다. 같은 기능을 native 앱으로 제공할지 웹 offline으로 제공할지는 사용 환경에 따라 선택한다. 이 문서는 build, SW 생성이나 hosting 명령을 실행한 결과가 아니다.

## 출처

- [Expo Documentation, Migrate from Expo Webpack](https://docs.expo.dev/router/migrate/from-expo-webpack)

## 관련 문서

- [[Expo-Router-Static-Rendering]]
- [[Expo-Router-Async-Routes]]
- [[Expo-Router-Server-Deployment]]
