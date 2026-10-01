---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 정적 export"]
---

# Next.js 정적 export

## 결과물과 설정

output: 'export'를 설정하고 next build를 실행하면 기본 out에 라우트별 HTML, CSS, JavaScript와 navigation payload가 나온다.
엄격한 단일 SPA와 달리 경로별 HTML을 처음부터 제공하고 클라이언트 이동을 이어갈 수 있다. 서버 기능이 필요해지면 Node 실행으로 전환할 수 있다.
trailingSlash: true는 /me 링크를 /me/로, me.html을 me/index.html로 바꾼다.
skipTrailingSlashRedirect: true는 자동 slash redirect 대신 href를 보존한다. distDir는 out 대신 배포 출력 디렉터리를 지정하는 export 설정 예다.
HTML/CSS/JS를 제공할 수 있는 정적 호스트에 결과를 올린다. next export 명령을 따로 실행하지 않는다.

## 서버와 클라이언트 컴포넌트

App Router의 Server Component는 빌드 중 실행되고 최초 HTML과 클라이언트 이동용 정적 payload를 생성한다.
async Page 안의 fetch도 이 시점에 실행된다. 요청별 cookies나 동적 서버 기능을 사용하지 않는 컴포넌트는 이 모델을 사용할 수 있다.
Client Component는 SWR 같은 도구로 브라우저에서 외부 데이터를 읽을 수 있다.
fetcher는 URL을 fetch해 JSON을 반환하고 useSWR(url, fetcher)의 error/data 상태로 실패, loading, 결과를 구분한다.
서버가 없는 export에서도 생성된 /post/1, /post/2 또는 /other 사이를 Link로 이동할 수 있다. TS/JS 예제는 링크 경로가 다르지만 모두 이미 export된 경로의 클라이언트 이동이다.
클라이언트 데이터 접근에 필요한 인증, CORS와 공개 API 계약은 그 외부 서버에서 처리한다.

## 이미지 URL 생성

기본 Next.js 이미지 최적화 서버는 export에 없다. images.loader: 'custom'과 loaderFile로 외부 서비스의 최적화 URL을 생성하거나 unoptimized 선택을 검토한다.
loader는 src: string, width: number, quality?: number를 받아 URL 문자열을 반환한다.
Cloudinary 예는 f_auto, c_limit, w_<width>, q_<quality 또는 auto>를 콤마로 연결해 image/upload 다음에 경로를 붙인다.
src가 /turtles.jpg라면 width/height 300의 Image가 외부 최적화 URL로 요청한다. loader 자체가 이미지를 변환하는 서버는 아니다.
품질의 || fallback은 0 같은 falsy 값을 auto로 취급한다. 앱의 허용 품질 계약에 맞춰 ?? 또는 검증을 선택한다.

## 정적 Route Handler와 브라우저 API

Cache Components를 끈 모델에서 GET Route Handler를 dynamic = 'force-static'으로 명시하면 build 중 응답을 파일로 생성한다. Cache Components가 켜진 export에는 호환되지 않는 dynamic 옵션을 그대로 복사하지 않고 지원 계약을 확인한다.
app/data.json/route.ts의 GET이 Response.json({name: 'sample'})을 반환하면 data.json 정적 파일이 된다.
HTML, JSON, TXT 등 응답 형태를 사용할 수 있으며 cached/uncached 데이터를 빌드 중 읽을 수 있다.
들어오는 Request의 동적 값을 읽거나 GET 외 동사를 실행하는 서버 API로 export를 사용할 수 없다.
Client Component도 빌드 시 HTML로 사전 렌더링된다. window, localStorage, navigator는 module scope/render에서 곧바로 읽지 않는다.
useEffect 안에서 window.innerHeight를 읽는 예처럼 브라우저가 실행한 뒤 접근한다. use client 선언만으로 빌드 시 서버 실행이 사라지지는 않는다.

## 지원하지 않는 기능

| 범주 | export의 제한 |
| --- | --- |
| 동적 경로 | dynamicParams: true 또는 generateStaticParams 없는 경로 |
| 요청 시점 데이터 | Request 의존 Route Handler, cookies |
| 서버 라우팅/응답 | rewrites, redirects, headers, Proxy |
| 서버 캐시 갱신 | ISR, Draft Mode |
| 서버 실행 | Server Actions |
| 이미지 | 기본 loader의 서버 최적화 |
| App Router UI | Intercepting Routes |

개발 중에도 지원하지 않는 조합은 오류가 날 수 있다. 기존 렌더 모델의 root dynamic = 'error'와 비슷한 정적 경계로 이해한다.
Cache Components에서는 기존 route-segment dynamic 옵션을 그대로 적용할 수 없으므로 설정 지원을 따로 확인한다.
정적 호스트의 redirects/headers 규칙은 Next.js 서버 설정과 다른 계층에서 구현한다.

## 호스트의 파일 매핑

/와 빌드 때 열거한 /blog/post-1, /blog/post-2는 out/index.html, out/404.html, out/blog/post-1.html, out/blog/post-2.html을 생성한다.
Nginx root를 out의 배포 경로로 두고 try_files 순서를 URI, URI.html, URI/, 404로 설정한다.
trailingSlash: false인 /blog/ 하위는 /blog/<path>.html로 매핑하는 규칙이 필요할 수 있다. true이면 디렉터리 index.html을 사용한다.
error_page 404를 /404.html에 연결하고 그 location을 internal로 제한하는 예가 있다.
GitHub Pages 공식 template은 새 프로젝트와 기존 배포 workflow 구성의 참고 자료다. 다른 앱의 basePath/asset 경로도 호스트에 맞춰야 한다.

## 버전과 이해 확인

13.3은 next export를 deprecated하고 output: 'export'로 대체했다.
13.4는 안정 App Router에서 RSC와 Route Handler export 지원을 확장했다. 14는 next export를 제거했다.
Pages Router는 getStaticProps/getStaticPaths의 별도 정적 경로 계약을 사용한다.

- use client가 있는 컴포넌트의 window 접근도 빌드 때 실패할 수 있는 이유는 무엇인가?
- 정적 GET 파일과 사용자의 Request를 읽는 API는 어느 시점에 실행되는가?

## Loader와 호스트 예제

~~~js
// next.config.mjs
export default {
  output: 'export',
  images: { loader: 'custom', loaderFile: './my-loader.js' },
}
~~~

~~~js
// my-loader.js
export default function loader({ src, width, quality }) {
  const params = ['f_auto', 'c_limit', 'w_' + width, 'q_' + (quality ?? 'auto')]
  return 'https://res.cloudinary.com/demo/image/upload/' + params.join(',') + src
}
~~~

src는 /turtles.jpg처럼 slash로 시작하는 Cloudinary 경로를 전제로 한다.

~~~nginx
server {
  listen 80;
  server_name example.com;
  root /var/www/out;
  location / { try_files $uri $uri.html $uri/ =404; }
  # trailingSlash:false의 파일 배치
  location /blog/ { rewrite ^/blog/(.*)$ /blog/$1.html break; }
  error_page 404 /404.html;
  location = /404.html { internal; }
}
~~~

## 정적 GET과 브라우저 실행 예제

~~~ts
// app/data.json/route.ts, Cache Components 미사용
export const dynamic = 'force-static'
export async function GET() {
  return Response.json({ name: 'sample' })
}
~~~

~~~tsx
'use client'
import { useEffect } from 'react'
export default function ClientComponent() {
  useEffect(() => { console.log(window.innerHeight) }, [])
  return <div>Browser information is read after mount.</div>
}
~~~

## 출처

- [Next.js, static-exports](https://nextjs.org/docs/app/guides/static-exports)

## 관련 문서

- [[NextJS-Platform-Deployment]]
- [[NextJS-Config-Image-CDN-Loaders]]
- [[NextJS-Pages-Static-Props]]
