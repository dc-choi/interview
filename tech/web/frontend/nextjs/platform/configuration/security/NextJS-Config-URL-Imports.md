---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 외부 URL import와 lockfile", "NextJS-Config-URL-Imports"]
---

# Next.js 외부 URL import와 lockfile

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## urlImports

실험 `experimental.urlImports: string[]`는 허용 URL prefix에서 module/asset을 가져와 import하게 한다. 정식 production 권장 기능이 아니며 Turbopack에는 계획되지 않은 기능이므로 webpack 기반 호환성을 확인한다.

```js
export default {
  experimental: { urlImports: ['https://cdn.example.com/modules/'] },
}
```

이 설정은 내려받은 코드를 개발자의 machine에서 실행할 수 있게 하므로 신뢰할 domain과 최소 prefix만 허용한다. browser sandbox로 제한하려는 설계 목표를 현재 실행 격리 보장으로 표현하지 않는다.

## next.lock

Next.js는 `next.lock` 디렉터리에 lockfile과 fetched assets를 저장한다. 이 디렉터리는 Git에 commit하며 ignore하지 않는다. dev는 새 URL import를 내려받고 lock에 추가한다. production build는 lock의 데이터로 빌드하며 오래된 lock은 실패할 수 있다.

대부분 build 중 network가 필요 없지만 `Cache-Control: no-cache` resource는 lock에 no-cache entry를 가지고 매 build fetch한다. 공급망 재현성이 lock으로 전부 해결되는 것이 아니다. 정적 image import, CSS url, new URL(..., import.meta.url)도 지원하는 입력 유형이다.

## 적용 판단

npm package처럼 버전과 integrity를 관리할 수 있는 경로가 이미 있다면 일반 package import를 우선한다. URL 변경, remote outage, 예기치 않은 내용 변경과 install-time execution을 검토한다. 사용해야 한다면 webpack build, committed lock, offline build와 no-cache 예외를 확인한다.

## 네 가지 입력 예시의 결과

Skypack canvas-confetti를 URL import하고 useEffect에서 호출하는 예시는 외부 JavaScript module 실행이다. next/image의 remote static logo import는 placeholder: blur를 사용할 수 있는 static metadata 경로다. CSS background의 url(https://.../hero.jpg)도 asset 입력이며 new URL(https://.../file.txt, import.meta.url)의 pathname은 원격 원본 대신 /_next/static/media/file.<hash>.txt 같은 build 산출물 주소가 된다. 정상 package import가 가능한 모든 위치에 URL import를 사용할 수 있다는 기능 범위와 신뢰 domain/webpack 조건을 함께 적용한다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/urlImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/urlImports)
- [Next.js, pages/api-reference/config/next-config-js/urlImports](https://nextjs.org/docs/pages/api-reference/config/next-config-js/urlImports)

## 관련 문서

- [[NextJS-Turbopack]]
- [[NextJS-Config-Dependencies]]
