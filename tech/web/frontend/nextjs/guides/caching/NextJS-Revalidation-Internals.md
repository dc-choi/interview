---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 재검증과 분산 캐시 계약"]
---

# Next.js 재검증과 분산 캐시 계약

## 재검증 대상과 출력 단위

시간 기반 갱신은 stale 응답을 제공하면서 다음 요청에서 background 재생성을 시작한다. on-demand는 지정 tag/path의 값을 무효화하며 SWR/즉시 만료 profile 및 Action/Handler 호출 위치에 따라 새 값 대기와 UI 갱신 시점이 달라진다.

App Router route cache와 Pages의 ISR/prerender cache는 갱신 대상이다. Pages의 순수 automatic static optimization 결과를 ISR API의 갱신 대상으로 뭉뚱그리지 않는다. Pages res.revalidate와 x-prerender-revalidate 흐름은 singular cacheHandler, use cache directive는 plural cacheHandlers 계약이다.

App Router는 같은 React tree에서 만든 HTML과 RSC를 한 렌더 버전으로 유지한다. 두 응답을 CDN에서 서로 다른 TTL로 관리하면 document와 client navigation의 내용이 달라질 수 있다. Pages에는 RSC가 없다. Vary/Cache-Control을 존중하고 출력 쌍의 갱신 정책을 일치시킨다. 별도 문제인 배포 A client와 배포 B server 불일치는 deploymentId를 통해 hard navigation으로 회복할 수 있다.

## explicit tag와 soft tag

cacheTag 또는 fetch next.tags는 개발자가 붙인 explicit tag다. revalidateTag(tag, 'max')는 해당 tag의 cache entry를 SWR로 낡은 상태로 만든다. 자동 soft tag는 `_N_T_` 접두어로 경로의 layout/leaf 의존을 표현한다. `/blog/hello`의 entry에는 root/blog/hello layout과 leaf 의존이 연결될 수 있다.

**의존 목록과 만료 대상을 구분한다.** 가이드에는 revalidatePath가 leaf와 모든 ancestor tag를 무효화한다고 적혀 있지만, 확인한 구현은 요청 경로와 선택 type으로 만든 tag를 전달한다. `/`와 `/index` alias 처리를 제외하고 상위 layout tag 전체를 자동 나열하지 않는다. 따라서 leaf 갱신이 root layout 전체를 만료시킨다고 일반화하지 않는다. layout type의 명시적 범위는 API 계약을 따른다.

custom handler의 get은 softTags를 받을 수 있다. getExpiration은 주어진 tags의 최신 재검증 timestamp 또는 아직 없을 때 0을 반환한다. Infinity는 softTags를 get에 넘겨 그곳에서 판단하도록 하는 신호다. entry timestamp보다 새 무효화 시각이 있으면 재사용을 제한한다. 구체적인 stale/expire 처리는 handler의 해당 계약을 따른다.

## 다중 인스턴스에서 전파

기본 로컬 cache에서는 A 인스턴스의 invalidation이 B에 자동 전달되지 않는다. 파일/entry 저장소만 공유해도 프로세스의 태그 상태가 자동으로 같아지는 것은 아니다.

1. tag 무효화 timestamp를 Redis/DB/HTTP service 등 공유 저장소에 기록한다.
2. updateTags는 무효화 사건을 공유 저장소에 반영한다.
3. refreshTags는 새 요청 전 등 호출 시 공유 상태를 읽어 로컬 tag 상태를 갱신한다.
4. App HTML/RSC를 같은 버전으로 공유 저장하고 가능한 원자적 갱신으로 어긋나는 시간을 줄인다.

단일 인스턴스의 기본 filesystem cache는 로컬 원자적 쓰기와 메모리 tag 상태로 동작한다. 다중 인스턴스에서 원자적 entry 쓰기만으로 분산 무효화 전체가 해결되는 것은 아니다. 무효화 전파 지연과 replica 장애 시 허용 stale 범위를 정한다.

## 장애 처리

| 장애 | handler와 운영의 처리 |
| --- | --- |
| 읽기 실패 | 내부 오류를 잡고 undefined를 반환하면 cache miss로 fresh render 시도. throw는 render 오류 |
| 쓰기 실패 | 비동기 cache 쓰기 실패로 entry가 남지 않더라도 생성한 응답은 제공할 수 있음. 다음 요청 재계산 비용 발생 |
| refreshTags 실패 | throw가 요청 실패로 전파될 수 있음. 잡고 마지막 tag 상태로 진행하면 stale 가능성을 수용 |
| HTML/RSC TTL 불일치 | 같은 생성/갱신 정책과 Vary 적용, 실제 응답 쌍 대조 |
| 배포 버전 불일치 | deploymentId와 새 document 요청으로 정합한 bundle/응답 확보 |

가용성을 우선하는 복구 패턴이지 모든 cache 장애에서 정상 응답이 보장되는 것은 아니다. 원천 DB도 실패하거나 stale 허용이 불가능한 데이터면 다른 실패 정책이 필요하다. CDN을 포함한 경로와 서로 다른 인스턴스에서 실제 최신 데이터를 읽는지 확인한다.

## 출처

- [Next.js, how-revalidation-works](https://nextjs.org/docs/app/guides/how-revalidation-works)

- [Next.js revalidatePath 구현 — GitHub](https://github.com/vercel/next.js/blob/canary/packages/next/src/server/web/spec-extension/revalidate.ts)

## 관련 문서

- [[NextJS-Cache-Operations]]
- [[NextJS-ISR-Patterns]]
- [[NextJS-CDN-and-PPR]]
