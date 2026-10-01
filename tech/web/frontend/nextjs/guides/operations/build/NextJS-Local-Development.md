---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 로컬 개발 성능"]
---

# Next.js 로컬 개발 성능

## 개발과 프로덕션의 차이

next dev는 경로를 열거나 이동할 때 compile해서 전체 route를 미리 기다리지 않고 초기 메모리도 줄인다.
next build/start는 minification, content hash 등의 production 최적화를 한다. 첫 dev route compilation과 production 응답 지연을 같은 지표로 비교하지 않는다.
앱이 커져 느려지면 filesystem, import graph, compiler 설정, server fetch와 memory를 나눠 측정한다.

## 파일 시스템과 보안 도구

antivirus는 파일 접근을 늦출 수 있으며 Windows 외 플랫폼에서도 원인이 될 수 있다.
Defender의 프로젝트 folder exclusion 경로는 Windows Security, Virus & threat protection, Manage settings, Add or remove exclusions다.
이는 측정과 조직 정책을 거쳐 좁은 신뢰 프로젝트에 검토할 선택이다. 전체 보호 해제를 성능 기본 처방으로 적용하지 않는다.
Windows11 Dev Drive는 개발 filesystem과 Defender performance mode를 활용하는 다른 선택이다.
macOS 원문의 spctl developer-mode enable-terminal과 Privacy & Security/Developer Tools의 terminal 허용은 개발 도구 접근 설정이다.
이를 Gatekeeper 전체 disable과 같은 의미로 소개하지 않는다. 조직 정책, OS 버전과 실제 파일 검사의 영향을 확인한다.
사용 terminal을 목록에 추가/활성화한 경우 재시작이 필요할 수 있다. 다른 antivirus도 해당 설정을 확인한다.

Docker Desktop의 Mac/Windows host-to-VM 공유는 filesystem event를 늦추거나 누락해 Fast Refresh가 오래 걸릴 수 있다.
native Linux Docker와 production에는 같은 파일 공유층 문제가 보통 없다.
개발은 host의 next dev, production build 검증/배포는 Docker로 하는 선택을 비교한다.
VM 개발이면 source를 VM filesystem에 두고 host mount를 피한다. Docker Desktop synchronized shares는 watcher 신뢰성을 높일 수 있지만 host 실행보다 지연이 남는다.
watchOptions.pollIntervalMs는 마지막 선택이다. polling은 latency, CPU와 I/O를 늘릴 수 있다.
WSL2에서도 source를 Linux home 아래 두고 C: 또는 /mnt/c에서 작업하는 교차 filesystem 비용을 피한다.

## Bundler와 import graph

지원하는 Next 버전의 개선을 검토하고 현재 기본 Turbopack을 사용한다. 필요하면 next dev --webpack으로 기존 plugin 호환을 선택한다.
npm script의 CLI 전달에는 -- 구분자가 필요하다. 최신 패키지 설치는 migration 검증을 생략하는 명령이 아니다.
Dependency Cruiser/Madge와 bundle analyzer로 실제 import graph를 읽는다.
@material-ui/icons, @phosphor-icons/react, react-icons 같은 대형 icon barrel은 소수 사용에도 많은 모듈을 탐색할 수 있다.
Phosphor는 공식 deep path의 Triangle처럼 필요한 icon을 직접 import하는 선택이 있다. 지원되지 않는 내부 경로를 임의로 사용하지 않는다.
react-icons의 pi/md/tb/cg를 모두 섞으면 각 set의 수천 모듈 처리 비용이 쌓일 수 있다. 일관된 set을 고른다.
barrel은 다른 파일을 재export한다. 컴파일러가 module side-effect를 파악하려고 더 많은 파일을 읽으므로 가능한 직접 경로와 내장 최적화를 활용한다.
experimental.optimizePackageImports에 barrel 패키지를 지정할 수 있다. Turbopack의 자동 분석과 이 설정의 실제 지원/효과는 사용 bundler와 패키지별로 확인한다.

## CSS, 사용자 설정과 데이터

Tailwind v3 content에는 src의 js/ts/jsx/tsx만 넣고 node_modules를 포함하는 넓은 packages glob을 피한다.
공유 UI도 packages/ui/src까지만 지정한다. v3.4.8 이후에는 느린 broad scan 설정 경고가 있다. v4의 CSS 기반 source 감지는 별도 설정이다.
custom Webpack 도구가 개발 compile을 늦추면 production에서만 켤 필요를 검토하거나 Turbopack loader 설정으로 전환한다.
큰 앱의 메모리는 별도 heap/build 측정으로 확인한다.
Server Component HMR은 page render/data 요청을 반복할 수 있다. serverComponentsHmrCache는 개발 fetch 응답을 refresh 사이 재사용해 지연과 유료 API 호출을 줄인다.
이 개발 캐시는 production revalidation 계약이 아니다. 현재 옵션 지원과 full reload 동작을 별도 확인한다.

## 로그와 trace 재현

logging.fetches.fullUrl: true는 개발 fetch 정보를 자세히 보여 준다. URL query의 비밀 값이 log에 남지 않게 다룬다.
next dev --internal-trace로 시작하고 느린 route 이동/파일 수정을 재현한 다음 서버를 종료한다.
project root .next-profiles/trace-turbopack.bin을 npx next internal trace <path>로 연다.
구버전에는 internal turbo-trace-server라는 명령명이었다.
trace 서버를 켠 뒤 trace.nextjs.org viewer에서 module compile 시간과 관계를 본다.
기본 Aggregated in order는 합산이고 Spans in order는 개별 span이다. 같은 재현 구간에서 병목을 확인한다.
해결이 안 되면 trace와 재현 조건을 GitHub Discussions/Discord 지원 자료로 사용할 수 있다. 공유 전 로컬 경로/비밀 정보 포함 여부를 확인한다.

## 이해 확인

- VM 공유 폴더와 WSL Linux filesystem의 watcher 성능이 다른 이유는 무엇인가?
- HMR fetch cache와 production Data Cache를 혼동하면 어떤 검증을 잘못하게 되는가?

## Tailwind v3 스캔 범위 예제

~~~js
// tailwind.config.cjs, Tailwind v3 전제
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
}
~~~

../../packages 전체 glob 대신 실제 UI source만 추가한다.

## 출처

- [Next.js, local-development](https://nextjs.org/docs/app/guides/local-development)

## 관련 문서

- [[NextJS-Memory-Usage]]
- [[NextJS-Package-Bundling]]
- [[NextJS-Debugging]]
