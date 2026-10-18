---
tags: [palantir, embedded-ontology, offline, pwa]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Embedded Ontology offline sync"]
---

# Embedded Ontology offline sync

Embedded Ontology는 lohi-ts local data를 통해 network 없이 query와 optimistic edit를 수행하는 application 패턴이다. Client-facing app/OSDK/hosting을 준비하고 Embedded Ontology React template을 사용한다. Offline-capable PWA와 browser storage가 막힌 Custom Widget runtime을 구분한다.

## Offline data의 범위를 명시한다

syncedObjectTypes에 generated SDK object type/API name/ObjectSetQuery를 지정하며 필요한 subset만 선택한다. 기본값은 빈 목록이다. 설정하지 않은 type은 offline에서 사용할 수 없고 큰 type을 전부 sync하면 초기 시간과 device storage가 커진다.

Template의 기본 client는 Lohi이므로 React hook의 read/write가 local cache를 통하고 write는 optimistic하다. SyncProvider가 mount 시 초기 sync와 성공 후 OSDK cache 전체 invalidation을 수행하며 기본 10초 interval을 둘 수 있다. Interval을 제거하면 mount/on-demand만 실행한다. SyncGate는 첫 sync 완료 전 UI를 보류한다.

Optimistic local 성공을 Foundry 서버 commit으로 보고하지 않는다. 반드시 online Foundry에 도달해야 하는 action은 StandardClientScope/useOnlineAction으로 실행하고 성공 후 resync/invalidate한다. Offline conflict/retry/permission revocation의 세부 해결 정책은 이 bootstrap 안내만으로 보장하지 않는다.

## Build와 deployment 설정

Template에는 Wasm dependency/plugin과 local/standard client factory, 공유 OAuth client가 있다. Hosted CSP scriptSrc에 'wasm-unsafe-eval'을 허용하지 않으면 초기화에 실패한다. Widget의 unconfigurable CSP와 달리 Developer Console hosting의 CSP 설정을 사용한다.

VITE env를 build-time index.html meta tag로 주입하고 config factory가 runtime에 읽는다. Production redirect를 실제 HTTPS domain callback으로 바꾸고 OAuth/CORS 설정을 맞춘다. Generated config를 직접 고치는 것과 env/meta tag contract를 구분한다. Tag build/deploy 후 지원 browser의 PWA install을 사용하고 network를 끈 상태에서 필요한 data와 action 처리를 검증한다.

## Peering은 별도 준비가 필요하다

기본 remote sync는 configured type의 모든 object를 다시 읽어 느릴 수 있다. Diff-only peering을 쓰려면 Ontology Manager의 Offline App Sync를 type마다 켜고 Peering database indexing 완료를 기다린 뒤 syncConfig에서 per-type peering을 활성화한다. 단순히 app config flag만 켠다고 backend diff sync가 준비되지 않는다.

## 출처

- [Palantir, Create offline-capable application with embedded Ontology](https://www.palantir.com/docs/foundry/developer-console/create-embedded-ontology-application)

## 관련 문서

- [[Palantir-OSDK-Static-Website-Hosting|Wasm CSP와 hosted app]]
- [[Palantir-OSDK-React-Cache|Optimistic update와 cache]]
- [[Palantir-Custom-Widget-State-and-Security|Widget runtime 저장 제한]]
