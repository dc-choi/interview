---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js use cache 저장소 계약", "NextJS-Config-Cache-Handlers"]
---

# Next.js use cache 저장소 계약

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## cacheHandlers

plural `cacheHandlers`는 use cache component/function 결과의 custom backend를 등록한다. `default`는 use cache, `remote`는 use cache: remote, 추가 이름은 use cache: name을 담당한다. 설정이 없으면 default와 remote 모두 in-memory LRU다. private directive는 이 handler 시스템으로 customize할 수 없다.

```js
export default {
  cacheComponents: true,
  cacheHandlers: { remote: require.resolve('./remote-cache.js') },
}
```

custom handler는 인스턴스 간 공유, 재시작 후 persistence, 기존 storage 연동이 필요할 때 만든다. 기본 메모리 cache로 충분한 앱에 외부 store를 먼저 도입할 필요는 없다.

## CacheEntry

| 속성 | 타입/단위 | 역할 |
| --- | --- | --- |
| value | ReadableStream<Uint8Array> | cache result byte stream |
| tags | string[] | 명시적 tag, soft tags 제외 |
| timestamp | number, milliseconds | entry 생성 시각 |
| stale | number, seconds | client freshness |
| revalidate | number, seconds | server refresh 기준 |
| expire | number, seconds | entry 최종 사용 상한 |

stream은 한 번 소비하면 재사용할 수 없으므로 저장과 반환을 동시에 해야 하면 tee를 사용한다. 큰 결과 전체를 array buffer로 변환하면 memory usage가 늘어난다. partial stream error를 성공 entry로 보존하면 불완전 UI가 제공될 수 있으므로 complete write와 error cleanup을 설계한다.

## get

`get(cacheKey: string, softTags: string[])`은 entry 또는 undefined를 반환한다. missing, expiry/revalidate와 tag invalidation을 검사한다. 같은 ReadableStream instance를 여러 요청에 재사용하지 않고 저장된 bytes에서 새 stream을 만들거나 branch를 유지한다.

## set

`set(cacheKey, pendingEntry: Promise<CacheEntry>)`는 Promise<void>다. 호출 시 entry stream이 아직 생성 중일 수 있으므로 pendingEntry를 await하고 완전한 데이터를 저장한다. opaque cache key를 그대로 유지한다. serialization은 bytes와 tags/timestamp/lifetime을 모두 포함해야 한다.

## refreshTags와 getExpiration

`refreshTags(): Promise<void>`는 request 시작 전에 외부 tag state를 동기화하는 지점이다. local memory 구현에서는 no-op일 수 있다. `getExpiration(tags)`는 tag들의 최근 revalidation timestamp 최댓값(milliseconds), 한 번도 없으면 0을 반환한다. soft tags를 get 안에서 직접 확인하도록 설계하면 Infinity를 반환할 수 있다.

## updateTags

`updateTags(tags: string[], durations?: { expire?: number })`는 Promise<void>로 invalidation/expiration 정보를 갱신한다. duration의 expire는 seconds다. 공유 저장소에 tag invalidation timestamp를 기록하고 다른 instance가 refreshTags로 가져가야 한다. local Map만 지우면 다른 process의 cache는 갱신되지 않는다.

## soft tags

Next.js가 route segment에서 layout/leaf path soft tag를 만든다. `/blog/hello`는 `/layout`, `/blog/layout`, `/blog/hello/layout`, `/blog/hello`에 대응하는 내부 `_N_T_` tag를 가진다. 이는 entry에 연결된 soft tag 집합이다. revalidatePath('/blog/hello')가 조상 layout tag까지 모두 invalidation한다는 뜻은 아니다. 구체적 호출은 요청한 path와 선택적 page/layout type의 tag를 invalidation하며 root/index alias 같은 특례는 별도다. 해당 entry의 soft tag 중 실제 invalidation된 tag의 timestamp가 entry timestamp보다 새로우면 stale로 취급한다. explicit entry.tags와 get의 softTags를 모두 확인해야 한다.

## 구현과 장애 정책

Map 예시는 계약 설명용이며 production LRU, capacity limit, error handling과 distributed coordination을 완성하지 않는다. remote storage는 bytes를 serialize하고 재조회 때 새 stream을 복원한다. get 실패를 miss로 처리할지, set 실패에도 response를 제공할지, tag write 실패를 어떻게 surfacing할지 명시한다. cache를 우회해도 보안과 데이터 consistency가 유지되어야 한다.

## 검증 시나리오

entry miss/hit, elapsed revalidate/expire, explicit tag, soft path invalidation, A invalidation 후 B read, stream 도중 오류, process restart와 storage 장애를 확인한다. CacheEntry timestamp의 milliseconds와 lifetime seconds를 섞지 않는다. `cacheMaxMemorySize`는 custom handler의 capacity를 관리하지 않는다.

## 동시 쓰기, stream 저장과 오류 반환

같은 key의 get이 진행 중인 set보다 먼저 끝나지 않도록 pendingSets promise를 추적하고 get에서 기다리는 패턴이 있다. set은 pendingEntry를 await하고 finally에서 pending promise를 resolve/delete한다. 실패 때도 대기자를 풀어 교착을 피한다. 이는 분산 인스턴스 동기화까지 제공하는 것은 아니다.

Redis 저장은 stream reader로 chunks를 읽고 finally에서 releaseLock한다. bytes를 Buffer로 합쳐 base64, tags/stale/timestamp/expire/revalidate를 JSON으로 보존하고 EX에는 expire seconds를 사용한다. 복원은 새 ReadableStream에서 bytes를 enqueue/close한다. 큰 entry는 S3류로 직접 streaming해 전체 memory buffering을 줄일 수 있다.

분산 tags는 전용 revalidated-tags set으로 이름을 추적해 전체 keyspace scan을 피하고 mGet으로 timestamp를 읽는다. updateTags는 multi/exec에 timestamp와 set membership을 기록하며 local state도 갱신한다. 이 예시의 durations 처리는 완성되어 있지 않아 delayed expire가 필요하면 명시적으로 구현한다.

set 실패는 이미 response stream이 흐르는 시점의 비동기 저장 실패이므로 사용자는 응답을 받고 다음 요청은 새 render한다. get은 framework가 try/catch로 감싸지 않으므로 내부 저장소 오류를 잡아 undefined(miss)로 반환하지 않으면 render 오류가 전파된다. partial write는 write-then-rename 또는 atomic write로 차단한다.

API 반환은 get: Promise<CacheEntry | undefined>, set/refreshTags/updateTags: Promise<void>, getExpiration: Promise<number>다. Node server/Docker는 지원, static export는 미지원, adapter는 플랫폼별 지원이다. cacheHandlers는 16.0에 도입됐다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/cacheHandlers](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheHandlers)

## 관련 문서

- [[NextJS-Config-Server-Cache]]
- [[NextJS-Config-Cache-Policy]]
- [[NextJS-Adapter-PPR]]
