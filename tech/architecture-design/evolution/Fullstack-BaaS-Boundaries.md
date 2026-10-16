---
tags: [architecture, fullstack, baas, nextjs, supabase, rsc]
status: done
verified_at: 2026-10-12
category: "Architecture - 진화"
aliases: ["Fullstack BaaS Boundaries", "풀스택 프레임워크와 BaaS 경계", "Next.js Supabase 아키텍처 오해", "BaaS 종속과 이탈 기준"]
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

## 여러 테이블을 함께 확정하는 쓰기

PostgREST는 요청 하나를 트랜잭션 하나로 실행한다. SDK 호출을 여러 번으로 나누면 쓰기마다 다른 트랜잭션이 되어, 뒤 호출이 실패해도 앞 호출의 결과는 남는다. 결제 승인 뒤 주문 확정, 다운로드 권한 부여와 확인 메일 예약처럼 함께 성공하거나 함께 실패해야 하는 쓰기는 DB 함수 하나로 묶어 `rpc()` 한 번으로 호출하거나 서버 코드의 DB 트랜잭션으로 처리한다. 함수 안의 제약 위반이나 오류를 던지는 `RAISE`는 그 요청의 트랜잭션 전체를 롤백한다. 메일 발송처럼 DB 밖의 부수 효과는 같은 트랜잭션에 발송할 행만 남기고 실제 발송은 별도 작업에 맡긴다([[Transactional-Outbox|Transactional Outbox]]).

함수는 Data API로 열리는 또 하나의 입구다. 2026-10-12 Supabase 문서 기준 기존 프로젝트의 `public` 함수에는 `anon`을 포함한 역할의 `EXECUTE`가 자동으로 부여되며, Supabase는 이 자동 부여를 없애 노출을 직접 선택하게 하는 쪽으로 기본값을 바꾸는 중이다. RLS는 함수 실행 권한을 통제하지 않으므로 프로젝트의 실제 권한을 확인해 필요한 역할에만 `EXECUTE`를 준다. 기본값인 `security invoker`는 호출자 권한으로 실행되고, `security definer`는 함수를 만든 역할의 권한으로 실행되어 호출자가 읽을 수 없는 행도 돌려줄 수 있으므로 쓸 때는 `search_path`를 고정하고 따로 검토한다.

## 종속의 강도와 이탈 기준

BaaS의 종속은 기능마다 다르다. DB는 Postgres라 Supabase CLI나 `pg_dump`로 스키마와 데이터를 내보낼 수 있고, Storage는 S3 프로토콜 호환 API를 제공한다(버전 관리 같은 일부 기능 제외). 반면 회원가입, 이메일 확인과 비밀번호 재설정 같은 인증 흐름, 요청한 사용자의 ID와 JWT를 돌려주는 `auth.uid()`와 `auth.jwt()`에 기댄 RLS 정책, 화면 곳곳의 SDK 호출은 Supabase를 떠날 때 다시 만들어야 한다. 소셜 로그인과 사용자 관리 화면까지 완성형으로 주는 인증 서비스일수록 받는 편의만큼 옮길 범위도 넓어진다.

- **이탈 조건을 처음에 정한다**: 소수가 쓰는 사내 도구나 실습처럼 수명과 이전 가능성이 낮으면 통합 편의를 받는다. 공개 서비스로 키울 제품이면 인증과 데이터 접근 호출을 화면 곳곳에 흩지 않고 서버 쪽 한 계층에 모아 옮길 범위를 줄인다(위 판단 축).
- **관리형 서비스가 요건에 맞는지 먼저 본다**: 기밀 자료를 다루거나 정해진 망 안에 둬야 하는 시스템이면 호스팅형 BaaS를 처음부터 제외할지 확인한다. 데이터를 완전히 통제해야 하거나 관리형 서비스를 쓸 수 없는 컴플라이언스 요건은 Docker 기반 자체 호스팅의 적합 조건이지만, 자체 호스팅에는 관리형 백업과 PITR이 없고 서버, 보안 패치, 백업, 가용성과 모니터링을 직접 맡으며 지원은 커뮤니티에 기댄다.

## 요금제 한도와 백업 범위

아래 수치는 2026-10-12 Supabase 공식 문서 기준이며 바뀔 수 있다.

- **파일 크기**: Free 프로젝트의 전역 파일 크기 상한은 50MB를 넘을 수 없고, Pro 이상은 500GB까지 올릴 수 있으며 그보다 크면 Supabase에 문의한다. 판매 파일의 최대 크기 같은 제품 결정이 그 단계에서 쓰는 플랜의 한도와 부딪히지 않는지 결정할 때 확인한다.
- **큰 파일 업로드**: 6MB를 넘을 수 있는 파일이나 네트워크가 불안정한 업로드에는 재개 가능한 TUS 업로드가 권장된다. 업로드 URL은 최대 24시간 유효하며 그 안에 끝내지 못하면 처음부터 다시 올린다.
- **백업 범위**: 자동 일일 백업은 Pro 이상 플랜에 있고(Pro는 최근 7일), Free 프로젝트에는 CLI `db dump`로 정기적으로 내보내 오프사이트에 보관하라고 권장한다. DB 백업에는 Storage API로 올린 객체가 들어가지 않고 메타데이터만 남으므로, 판매 파일 같은 객체는 따로 백업한다([[Backup-Restore|백업과 복구]]).

## 면접 체크포인트

- RSC 이후 React 컴포넌트의 실행 위치 기본값이 어떻게 바뀌었는지, `use client`가 존재하는 이유
- 프론트엔드 직접 DB 접근(BaaS SDK)의 두 가지 비용을 설명할 수 있는가
- RLS와 애플리케이션 레벨 권한 제어(RBAC 테이블)의 트레이드오프
- SDK 호출로 나눈 다중 쓰기의 부분 실패, DB 함수로 묶는 방법과 함수 실행 권한, `security definer`의 위험
- BaaS 기능별 종속 강도(DB, Storage, Auth와 RLS, SDK)와 이탈 기준

## 출처

- [바이브코딩 국민스택 Next.js + Supabase 조합을 더 잘 이해하기 위해 오해를 풉시다 — 개인 블로그](https://blog.m1nsuppp.com/nextjs-supabase-misconceptions)
- [React — 'use client' directive](https://react.dev/reference/rsc/use-client)
- [Supabase Docs — REST API (PostgREST)](https://supabase.com/docs/guides/api)
- [Supabase Docs — Hardening the Data API](https://supabase.com/docs/guides/database/hardening-data-api)
- [Supabase Docs — Database Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Docs — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Docs — Storage File Limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Supabase Docs — Resumable Uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)
- [Supabase Docs — S3 Compatibility](https://supabase.com/docs/guides/storage/s3/compatibility)
- [Supabase Docs — Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase Docs — Self-Hosting](https://supabase.com/docs/guides/self-hosting)
- [PostgREST Docs — Transactions](https://docs.postgrest.org/en/stable/references/transactions.html)
- [YouTube, 양실장의 바이브코딩대학, 3시간 순삭) 55개 기술 의사결정, 소스코드 해설까지! 현존 바이브코딩 기본 강의 중 가장 실전적인 강의](https://www.youtube.com/watch?v=K6Rsy-pHBi0) — 2026-08-18, 1:13:47~1:20:50의 Supabase 유지와 제거 기준은 강사의 경험적 판단이고 1:39:57의 파일 크기와 무료 플랜 한도 충돌은 시연 사례. 본문의 수치와 권한 기본값은 위 공식 문서로 확인했다.

## 관련 문서

- [[Runtime-Stack-Evolution|런타임 스택 진화]]
- [[Library-vs-Framework|라이브러리 vs 프레임워크]]
- [[Why-Architecture-Matters|아키텍처가 중요한 이유]]
- [[Transactional-Outbox|Transactional Outbox]] — DB 밖 부수 효과를 같은 트랜잭션의 기록으로 넘기는 방법
- [[Backup-Restore|백업과 복구]] — 3-2-1 규칙과 복원 검증
- [[S3-Security-Patterns|S3 보안 설계 패턴]] — 만료 URL과 판매 파일의 보호 범위
- [[Cloudflare-vs-Vercel-Hosting|1인 제품 호스팅 플랫폼 선택]] — 무료 플랜 조건과 cron 한도
