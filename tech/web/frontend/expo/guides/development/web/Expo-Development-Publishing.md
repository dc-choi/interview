---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo web output과 hosting 구성"]
---

# Expo web output과 hosting 구성

## 출력 형식

| `web.output` | 산출물 | routing/hosting 조건 |
| --- | --- | --- |
| `single` 기본 | 단일 index.html SPA | route 요청을 index.html로 rewrite |
| `static` | route별 HTML | 생성한 dynamic params와 파일 route 제공 |
| `server` | client/server 디렉터리 | server JS/API를 실행할 런타임 필요 |

SDK57 기준 server output은 API route를 제공한다. static에서 plugin `apiRoutes:true`를 opt-in하는 계약은 SDK58 이후의 내용이므로 SDK57 앱에 그대로 적용하지 않는다. single output은 API routes가 없다. static/server의 global header 설정은 Router plugin과 호스트 응답을 함께 확인한다.

```sh
npx expo export -p web
npx expo serve
```

export는 `dist/`를 만들고 `public/` 파일을 복사한다. Metro reserved path인 `public/assets/` 등에 사용자 파일을 두지 않는다. `serve`는 기본 `localhost:8081`의 HTTP production preview이며 HTTPS 전용 API와 실기기 LAN secure-context 검증을 대신하지 않는다.

## Netlify와 Vercel

Netlify SPA는 `public/_redirects`에 `/* /index.html 200`을 두고 재export한다. static output이면 전체 SPA rewrite를 적용하지 않는다. `netlify deploy --dir dist`는 생성 artifact를 배포하며 Git 연동 build도 가능하다.

Vercel은 root `vercel.json`에 buildCommand `expo export -p web`, outputDirectory `dist`, devCommand `expo`, framework `null`, cleanUrls와 필요한 rewrites를 설정한다. SPA는 `/:path*`를 `/`로 rewrite하지만 static 페이지를 모두 SPA로 덮어쓰지 않는다. server output은 단순 static upload만으로 API runtime이 생기지 않는다.

## Amplify와 Firebase

Amplify는 연결한 Git repository/branch와 build YAML에서 export 또는 이미 생성한 artifact의 위치를 정한다. monorepo는 앱 경로를 정확히 선택한다. 미리 생성한 dist를 커밋하는 workflow와 호스트가 source에서 빌드하는 workflow를 구분한다. 예제의 `amplify-explicit.yml`과 자동 탐색 `amplify.yml` 이름 차이를 그대로 혼용하지 말고 실제 console build 설정을 확인한다.

Firebase Hosting은 public directory를 `dist`로 지정한다. SPA rewrite 질문은 `single`일 때만 Yes다. export 후 `firebase deploy --only hosting`을 실행한다. `firebase.json`의 headers는 HTML의 재검증과 hash asset cache를 구분하며 전체 no-store와 asset 장기 cache 규칙의 적용 순서를 확인한다.

## GitHub Pages와 하위 경로

repo subpath 배포는 `experiments.baseUrl:"/repo-name"`를 사용한다. `gh-pages --nojekyll -d dist`는 artifact branch와 `.nojekyll`을 만들며 Expo의 underscore 파일이 Jekyll 처리로 빠지지 않게 한다. Pages는 gh-pages branch의 root를 제공하도록 설정한다. source code와 build artifact branch는 별도다.

EAS Hosting은 Expo server 기능과 통합된 선택지다. 외부 호스트는 output 종류, deep-link refresh, subpath asset, TLS, header와 API support를 실제 배포 방식에 맞게 검증한다. 이 문서는 배포 실행 기록이 아니다.

## 출처

- [Expo Documentation, Publish websites](https://docs.expo.dev/guides/publishing-websites)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
