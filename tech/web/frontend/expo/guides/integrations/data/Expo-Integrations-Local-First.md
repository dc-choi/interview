---
tags: [expo, expo-integrations, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo local-first 저장과 동기화"]
---

# Expo local-first 저장과 동기화

local-first는 read/write를 기기 database에서 처리하고 network 회복 뒤 여러 기기 데이터를 sync하는 구조다. interaction latency와 offline 작업을 개선하지만 sync conflict, permissions와 remote effect의 결과 상태가 사라지는 것은 아니다. email 전송 같은 작업은 local queue에 넣고 queued/sending/accepted/failed를 따로 추적한다.

## 역할을 나누기

persistence는 durable local 저장, state management는 UI 구독과 reactivity, sync는 data structure와 transport다. SQLite 하나를 설치했다고 이 셋이 모두 해결되지는 않는다. CRDT는 merge 가능한 자료구조이며 transport/auth/권한을 함께 제공한다는 뜻이 아니다.

| 도구 | 원문의 역할과 제한 |
| --- | --- |
| Legend-State | fine-grained state, persistence/sync, Supabase built-in, RN AsyncStorage 연계 |
| TinyBase | reactive store, Yjs/SQLite layer 연결, native expo-sqlite/web localStorage, Expo Go example |
| expo-sqlite | persistence. Yjs y-expo-sqlite와 store/sync를 추가 구성 |
| Yjs | CRDT Y.Array/Y.Map를 사용, 일반 Array/Object와 구분. state/persistence/transport를 조합 |
| Prisma | Expo/RN early access local-first 접근. 성숙한 backend ORM 지원과 구분 |
| Jazz | local-first relational data, realtime/offline/row permissions, self-host 가능 |
| LiveStore | client 중심 SQLite data layer와 Expo 지원 |
| Turso | offline bidirectional sync/conflict detection. 원문 시점 자동 conflict resolution은 없음 |
| Instant | realtime collaborative database, Expo sketch example |
| RxDB | reactive NoSQL, SQLite adapter, HTTP/GraphQL/Supabase/custom replication |

Automerge/ElectricSQL/PowerSync는 추가 후보로 소개되며 이 Expo guide는 완전한 비교 benchmark가 아니다. Legend-State/TinyBase examples는 시작 구조를 제공하지만 유저별 local DB partition, logout cleanup, remote permission revoke와 tombstone/삭제 sync를 확인한다. early ecosystem에서는 custom sync와 multiuser permission을 직접 해결할 수 있다.

network-bound loading UI가 줄어도 initial sync, migration, storage quota와 unsynced write 상태를 표시해야 한다. remote server outage가 기존 local 작업을 막지 않아야 한다는 목표와 계정/새 데이터/원격 side effect 가용성은 구분한다. 공식 guide는 work in progress이며 사용자가 특정 도구를 채택하거나 숙련했다고 뜻하지 않는다.

## 출처

- [Expo Documentation, Local-first architecture with Expo](https://docs.expo.dev/guides/local-first)

## 관련 문서

- [[Expo-Integrations-Supabase]]
- [[Expo-Integrations-Convex-CMS]]
- [[Expo-Integrations-Resend]]
