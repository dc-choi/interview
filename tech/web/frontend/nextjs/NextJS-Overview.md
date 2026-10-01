---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js의 역할과 문서 읽기"]
---

# Next.js의 역할과 문서 읽기

## React와 Next.js의 경계

Next.js는 React UI에 routing, 서버 실행, 데이터 처리, 빌드 최적화와 배포 계약을 결합하는 프레임워크다. React의 state, purity, Suspense, Server Function 계약을 기반으로 하되 cache의 수명, file convention, route navigation은 Next.js 버전과 설정에 따라 달라진다.

HTML/CSS/JavaScript와 React 기초를 전제로 한다. 문서를 보유한 것과 실제 구현 경험 또는 숙련은 구분한다. 아래 순서는 지식을 찾기 위한 경로이며 사용자에게 확정된 학습 일정이나 완료한 진도가 아니다.

## 두 라우터

| 구분 | App Router | Pages Router |
| --- | --- | --- |
| 핵심 구조 | app의 page/layout/route와 segment | pages의 파일 route, _app/_document, API Routes |
| 렌더와 데이터 | Server Component, streaming, 서버 함수, 선택적 Cache Components | getStaticProps/getStaticPaths/getServerSideProps, client fetching |
| 경계 | module graph와 server/client 직렬화 | page props 직렬화와 서버 데이터 함수 |
| 선택 | 최신 기능의 주된 문서 경로 | 기존 앱 유지 및 점진적 전환에 필요한 별도 계약 |

두 디렉터리는 점진적 전환에 활용할 수 있으나 같은 URL을 중복 정의하지 않는다. Pages의 ISR/fallback과 App Cache Components의 shell/재검증을 같은 규칙으로 읽지 않는다.

## 문서 종류별 사용법

Getting Started는 설치부터 route, UI, data, cache, metadata와 배포까지 연결한다. Guides는 인증, 성능, 테스트, 운영 같은 실제 문제를 다룬다. API Reference는 directives, components, file conventions, functions, configuration과 CLI의 인자/반환/실패 조건을 확인하는 곳이다.

공식 Docs의 App Router, Pages Router, 공통 architecture/community를 주제별로 정리했다. 외부 블로그, error message 링크와 예제 저장소 전체는 포함하지 않는다.

## 탐색 순서

1. [[NextJS-Concepts]]와 [[NextJS-App-Router]]에서 실행 시점과 route 구조를 잡는다.
2. [[NextJS-App-Data]], [[NextJS-Cache-Operations]], [[NextJS-Prefetching]]에서 저장 위치와 무효화 주체를 나눈다.
3. [[NextJS-Authentication]], [[NextJS-Data-Security]]에서 데이터 접근 권한을 UI 노출과 분리한다.
4. [[NextJS-Guides]]에서 현재 문제에 맞는 테스트, 자산, 운영, migration 주제로 이동한다.
5. 기존 Pages 앱은 [[NextJS-Pages-Router]]부터 시작하고, 설정 계약은 [[NextJS-Platform]]을 함께 본다.

## 버전과 증거

2026-10-01 공식 문서 스냅샷을 기준으로 정리했다. 주요 페이지는 16.3.8을 표시하지만 일부 원문은 다른 metadata version이나 과거 버전 변경을 담고 있다. Next 최신 문서의 실험 기능, Cache Components 활성화 조건, 과거 migration 내용을 기본 동작으로 섞지 않는다.

공식 문서 대조는 실제 프로젝트의 기능 작동을 증명하지 않는다. 적용할 때 설치 버전, config, bundler, runtime, hosting adapter를 확인하고 production 빌드와 사용자 흐름으로 검증한다.

## React 버전과 공식 문서 탐색

App Router는 안정 React 19 변경과 framework에서 검증하는 새 기능을 포함한 내장 React canary를 사용한다. Pages Router는 프로젝트 package.json에 설치한 React를 사용한다. Pages Router도 지원과 개선이 이어지는 별도 모델이며 단순 폐기된 API로 취급하지 않는다. App Router의 filesystem routing은 Server Components, Suspense와 Server Functions를 통합한다. bundler/compiler의 기본 구성도 Next가 맡는다.

공식 사이트의 sidebar 상단에서 App/Pages를 전환하고 Ctrl+K 또는 Cmd+K로 검색한다. Getting Started는 create-next-app/TypeScript/ESLint/path alias부터 project convention, page/layout, Link/navigation과 server/client 경계로 이어진다. API Reference에는 adapters, Edge Runtime와 Rust 기반 incremental bundler Turbopack도 포함된다.

선행 지식이 필요하면 공식 React Foundations와 dashboard app 과정으로 연결한다. Docs의 화면 읽기 안내는 Firefox+NVDA 또는 Safari+VoiceOver 조합을 권장한다. 질문/자료 탐색은 GitHub Discussions, Discord, X와 Reddit의 공식 커뮤니티 경로를 사용할 수 있다. 이 안내는 앱 자체의 접근성 검증이나 사용자의 학습 완료를 뜻하지 않는다.

## 출처

- [Next.js, docs](https://nextjs.org/docs)
- [Next.js, app](https://nextjs.org/docs/app)
- [Next.js, guides](https://nextjs.org/docs/app/guides)
- [Next.js, api-reference](https://nextjs.org/docs/app/api-reference)

## 관련 문서

- [[React]]
- [[Fullstack-BaaS-Boundaries]]
