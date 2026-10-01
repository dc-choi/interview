---
tags: [nextjs, app-router, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["기존 cache API와 요청별 memoization"]
---

# 기존 cache API와 요청별 memoization

## unstable_cache의 저장 계약

unstable_cache는 expensive async 작업의 결과를 Next Data Cache에 저장하여 요청과 deployment 사이에 재사용한다. cache된 함수의 source와 호출 인자는 key에 포함된다. closure에서 읽는 외부 값은 `keyParts`로 추가하거나 명시적 함수 인자로 전달한다. tags는 invalidation label이고 keyParts와 달리 cache identity를 결정하지 않는다.

```ts
import { unstable_cache } from 'next/cache'
const getUser = unstable_cache(
  async (id: string) => database.user.find(id),
  ['user-v1'],
  { tags: ['users'], revalidate: 3600 },
)
const user = await getUser(userId)
```

첫 인자는 Promise를 반환하는 함수, 두 번째는 선택적인 string keyParts 배열이다. options의 tags는 string 배열이며 revalidate는 초 단위 number 또는 false다. 기본 revalidate 생략/false는 별도 invalidation까지 유지하는 cache를 의미한다. 함수 인자가 사용자별 값이면 key가 분리되지만 결과에 비밀을 포함할지와 호출 권한은 별도로 검증한다.

cache 함수 안에서 cookies/headers 같은 동적 request data를 직접 읽는 패턴은 지원하지 않는다. cache 바깥에서 읽고 필요한 값을 인자로 넘긴다. cache 함수 전체 결과가 공유 가능한지 확인한다. React cache는 현재 request/render의 memoization이며 Data Cache를 사용하는 unstable_cache와 수명이 다르다.

현재 권장되는 새 함수 cache API는 `use cache`다. 그러나 Cache Components를 켰다고 기존 unstable_cache, fetch cache가 사라지거나 같은 lifetime으로 통합되는 것은 아니다. 이들은 별도 계층으로 남는다. 마이그레이션할 때 저장 위치, key, invalidation, TTL을 각각 대응시킨다.

## unstable_noStore와 새 의도 표현

unstable_noStore는 예전 모델에서 component의 prerender를 피하도록 선언하는 API다. 반환값이 없고 인자가 없다. fetch의 cache: no-store/revalidate:0과 비슷하게 정적 렌더링을 벗어나려는 의도를 나타낸다. route 전체 force-dynamic보다 좁은 component 수준 선언이 가능했다.

unstable_cache 안에서 noStore를 호출해도 그 함수 cache 자체를 무효화하지 않는다. cache layer 밖과 안의 의미가 다르다. 이 API는 deprecated이며 실제 request를 기다리려면 connection, Cache Components의 uncached I/O 경계는 io 등 현재 API의 계약을 사용한다. 과거 지식의 동적 렌더링 export를 Cache Components에 그대로 옮기지 않는다.

## 확인할 증상

항상 같은 사용자가 반환된다면 closure 값이 key에 빠졌는지 본다. 매 요청 DB가 조회된다면 cache 함수를 실제로 호출했는지, 인자가 매번 달라지는지, invalidation/TTL이 있는지 확인한다. 요청별 memoization의 성공을 요청 사이 cache hit로 오해하지 않는다.

## 반환 함수와 버전

`unstable_cache(fetchData, keyParts?, options?)`는 즉시 data를 반환하지 않고 **호출하면 Promise를 반환하는 함수**를 돌려준다. `unstable_cache(...)()`에서 miss이면 fetchData를 실행하고 저장한 뒤 반환한다. `const { userId } = await params`로 읽어 closure에서 `{id: userId}`를 만드는 예는 keyParts:[userId], tags:['users'], revalidate 60초를 설정한다. 외부 getUser를 wrapper에 넣고 ['my-app-user']를 identity에 추가하는 예도 같은 반환 함수 계약이다. 14.0에 도입되었으며 16에서는 Cache Components/use cache 마이그레이션을 권장한다.

noStore 예는 `import {unstable_noStore as noStore} from 'next/cache'` 후 DB query 직전에 noStore()를 호출한다. fetch 옵션을 매번 넘기기 어렵거나 fetch가 아닌 read에서 기존 prerender opt-out을 표현한다. 14.0에 도입되었으며 15.0부터 connection을 권장한다. deprecated된 하위 호환 API다.

## 이해 확인

1. tags를 사용자 ID별로 나누면 key도 자동으로 사용자별이 되는가?
2. closure를 keyParts에 포함해야 하는 조건은?
3. noStore를 cached 함수 안에서 부르면 persistent cache를 우회하는가?

## 출처

- [Next.js, unstable_cache](https://nextjs.org/docs/app/api-reference/functions/unstable_cache)
- [Next.js, unstable_noStore](https://nextjs.org/docs/app/api-reference/functions/unstable_noStore)

## 관련 문서

- [[React-Server-Cache-and-Taint]]
- [[NextJS-App-Cache-Functions]]
- [[NextJS-App-IO]]
- [[NextJS-App-Fetching]]
