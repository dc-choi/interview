---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 개념 사이의 경계"]
---

# Next.js 개념 사이의 경계

## 실행 시점과 데이터의 축

| 개념 | 의미 | 혼동하면 안 되는 것 |
| --- | --- | --- |
| build time | 코드 변환, 자산 생성, 가능한 UI prerender | 모든 사용자 요청의 실제 입력을 아는 시점 |
| request/runtime rendering | 요청 입력에 의존하는 렌더 | dynamic URL segment와 동의어 아님 |
| prerender | 빌드 또는 재검증 때 미리 만든 HTML/RSC | client state를 영구 보존하는 기능 아님 |
| hydration | 서버 HTML을 React client tree와 맞추고 상호작용을 연결 | Server Component를 브라우저에서 다시 실행하는 것 아님 |
| static export | 서버 없이 배포할 파일 출력 | runtime 서버 기능이 자동으로 외부 서비스에 생기는 것 아님 |

`[slug]`는 URL 패턴이다. `generateStaticParams`로 일부 값을 미리 렌더할 수 있어 동적 segment라는 이름만으로 요청 시 렌더를 결론 내릴 수 없다. `cookies`, `headers`, `searchParams`, `draftMode` 같은 요청 데이터의 실제 읽기와 cache 설정을 본다.

## 코드 그래프와 응답

Server Component는 서버에서 실행되고 자신의 코드가 client JS bundle에 들어가지 않는다. Client Component는 state/effect/event/browser API를 사용할 수 있지만 첫 HTML 생성 과정에서 서버 렌더될 수 있다.

`use client`는 import로 이어지는 module graph의 경계를 만든다. `children`으로 받은 서버 렌더 결과까지 client module로 변환하는 지시어는 아니다. `use server`는 원격 호출 가능한 async Server Function 경계다. Action 문맥에서 쓰이는 함수와 일반 데이터 조회 경로의 비용/보안을 구분한다.

RSC payload는 서버 트리의 결과, Client Component 참조와 전달 props를 표현한다. 초기 HTML, client JS, RSC payload는 각각 역할이 다르다. route code splitting과 tree shaking이 있어도 큰 client import나 props payload의 비용은 남을 수 있다.

## route 구조의 용어

| 구조 | 역할 |
| --- | --- |
| page/layout/template | route UI, 공유 UI, remount 경계 |
| `(group)` / `_private` | URL에 영향을 주지 않는 그룹 / 라우팅 제외 폴더 |
| `[id]` / `[...slug]` / `[[...slug]]` | 한 값 / 여러 segment / 값이 없는 경우까지 허용 |
| parallel slot / intercepting route | 같은 layout의 여러 화면 / 탐색 문맥을 유지하는 다른 화면 표시 |
| loading/error/not-found | Suspense fallback / 예외 경계 / 찾을 수 없는 리소스 처리 |
| Route Handler / Proxy | Web Request/Response endpoint / 라우트 처리 전 요청 분기 |
| redirect / rewrite | 브라우저 URL 이동 / 보이는 URL을 유지한 내부 목적지 변경 |

이름만 익히기보다 hard reload와 soft navigation에서 동일 URL이 어떻게 달라지는지 확인한다. layout 재사용은 새 요청의 인증을 생략할 근거가 아니다.

## cache, shell과 navigation

React memoization은 한 렌더 요청에서 중복 작업을 줄이고, 서버 Data Cache/함수 cache는 설정한 기간 결과를 재사용한다. client router cache는 방문/미리 받은 RSC를 브라우저에서 재사용한다. 컴파일러의 filesystem cache는 이 데이터 cache들과 다른 층이다.

Cache Components는 `use cache`, `cacheLife`, `cacheTag`로 캐시한 부분과 요청 시 스트리밍할 부분을 섞는다. Suspense는 기다리는 부분의 fallback을 정한다. PPR의 static shell과 partial prefetching의 route App Shell을 같은 데이터 범위로 단정하지 않는다.

Partial Prefetching을 활성화하면 기본적으로 URL별 전체 결과보다 route App Shell을 미리 가져온다. URL 데이터는 링크마다 다르다. 세션을 포함한 shell은 client의 세션 범위에서 다뤄야 하며 공개 CDN cache로 일반화하면 안 된다. 짧은 stale의 데이터는 공유 shell 포함 조건에서도 제외될 수 있다.

재검증은 시간 또는 명시적 무효화로 결과를 갱신하는 과정이다. `router.refresh`, `revalidatePath`, `revalidateTag`, `updateTag`는 호출 위치와 대상이 달라 같은 명령이 아니다. ISR, CDN purge, SWR/Query cache 갱신을 따로 구분한다.

## 도구와 운영

Metadata는 검색/공유 표현이고 Image/Font/Script는 자산 전달 계약이다. public 파일은 정적 자산이지만 모든 파일에 immutable cache를 적용해도 된다는 뜻은 아니다. Turbopack는 코드 묶기 도구이고 runtime의 데이터 cache를 대신하지 않는다.

Version skew는 오래 열린 client가 새 server/asset과 만나는 배포 불일치다. deploymentId, 이전 asset 보존, cache와 Action key를 함께 고려한다. 모듈 import alias나 파일 이동만으로 이 배포 계약이 해결되지는 않는다.

## 이해 확인

- dynamic segment, dynamic rendering, client rendering을 각각 독립적으로 설명할 수 있는가?
- 같은 화면이 오래된 값을 보일 때 server cache, router cache, client data library와 CDN을 어떻게 나눠 조사할 것인가?

## 출처

- [Next.js, glossary](https://nextjs.org/docs/app/glossary)

## 관련 문서

- [[NextJS-App-Routing]]
- [[NextJS-Rendering-Strategy]]
- [[NextJS-Cache-Operations]]
- [[NextJS-Prefetching]]
- [[NextJS-Self-Hosting]]
- [[NextJS-Glossary]]
