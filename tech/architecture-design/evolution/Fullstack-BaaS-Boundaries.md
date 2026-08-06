---
tags: [architecture, fullstack, baas, nextjs, supabase, rsc]
status: done
verified_at: 2026-08-06
category: "Architecture - 진화"
aliases: ["Fullstack BaaS Boundaries", "풀스택 프레임워크와 BaaS 경계", "Next.js Supabase 아키텍처 오해"]
---

# 풀스택 프레임워크와 BaaS의 경계

Next.js + Supabase처럼 별도의 백엔드 서버를 두지 않는 스택은 **코드가 어디서 실행되는가**와 **데이터 접근 경계가 어디에 있는가**라는 전제가 틀리면 설계 전체가 흔들린다. 이 스택에서 자주 만나는 두 가지 오해를 바로잡는 것이 출발점이다.

## 오해 1 — Next.js는 프론트엔드 프레임워크다

- Next.js는 프론트엔드 프레임워크가 아니라 **풀스택 웹 프레임워크**다. JS/TS 코드는 서버 런타임에서 실행되는 것이 기본값이고, 이는 `.tsx`/`.jsx`로 작성되는 React 컴포넌트도 마찬가지다.
- React는 브라우저에서 HTML을 만드는 클라이언트 사이드 렌더링이라는 이해는 낡은 지식이다. React Server Components(RSC)를 사용하는 앱에서는 컴포넌트를 서버에서 렌더링하는 것이 기본값이고, `use client` 지시어는 클라이언트에서 실행할 경계를 명시하기 위해 존재한다. RSC는 Next.js 전용 기술이 아니다.
- 실행 위치의 기본값을 전제로 깔아야 데이터 접근, 시크릿 노출, 번들 경계에 대한 판단이 선다.

## 오해 2 — Supabase는 프론트엔드에서 DB를 직접 제어하는 도구다

Supabase는 Postgres에 REST API를 제공하는 PostgREST를 얇은 SDK 레이어로 감싼 BaaS다. SDK 호출은 결국 DB로 가는 HTTP 요청이다. 프론트엔드에서 SDK를 직접 호출하는 구조에는 두 가지 비용이 있다.

- **RLS 디버깅 제어권** — 백엔드 없이 CRUD를 만들 수 있도록 RLS(Row Level Security) 사용이 권장되고 그것이 장점일 수도 있지만, 문제가 생기면 애플리케이션 코드가 아니라 Supabase 쪽(로그, RLS 규칙, 특정 사용자 상태)에서 진단해야 한다. LLM과 협업할 때도 복잡한 문제가 될 수 있다. 비즈니스 로직의 제어권이 RLS로 넘어가면 단위 테스트 작성도 어려워진다. 대안으로 RBAC 개념을 나타낸 테이블을 두고 애플리케이션 코드 수준에서 권한을 제어할 수 있다.
- **DB와의 강결합** — DB 스키마 변경에 프론트엔드 코드가 깨진다. 백엔드가 DB와 결합하는 것과 프론트엔드가 DB에 강결합되는 것은 다른 문제다.

경계를 설계로 못 박는 수단도 있다 — Supabase의 Data API를 비활성화하면 SDK를 통한 직접 HTTP 요청 자체가 차단되어, DB는 서버 코드(ORM 등)에서만 접근하게 강제할 수 있다.

## 스택 조합의 판단 축

- BaaS의 가치(관리형 Postgres, Auth, Web UI)와 SDK 직접 호출 여부는 분리해서 선택할 수 있다. BaaS를 DB와 Auth 제공자로만 쓰고 데이터 접근은 서버 경유로 제한하는 조합이 가능하다.
- 판단 기준은 두 가지다: 문제가 생겼을 때 **내 코드 안에서 진단할 수 있는가**(디버깅 제어권), DB 변경의 파급이 **어느 층까지 미치는가**(결합 방향).

## 면접 체크포인트

- RSC 이후 React 컴포넌트의 실행 위치 기본값이 어떻게 바뀌었는지, `use client`가 존재하는 이유
- 프론트엔드 직접 DB 접근(BaaS SDK)의 두 가지 비용을 설명할 수 있는가
- RLS와 애플리케이션 레벨 권한 제어(RBAC 테이블)의 트레이드오프

## 출처

- [바이브코딩 국민스택 Next.js + Supabase 조합을 더 잘 이해하기 위해 오해를 풉시다 — 개인 블로그](https://blog.m1nsuppp.com/nextjs-supabase-misconceptions)
- [React — 'use client' directive](https://react.dev/reference/rsc/use-client)
- [Supabase Docs — REST API (PostgREST)](https://supabase.com/docs/guides/api)
- [Supabase Docs — Hardening the Data API](https://supabase.com/docs/guides/database/hardening-data-api)

## 관련 문서

- [[Runtime-Stack-Evolution|런타임 스택 진화]]
- [[Library-vs-Framework|라이브러리 vs 프레임워크]]
- [[Why-Architecture-Matters|아키텍처가 중요한 이유]]
