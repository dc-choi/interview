---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js taint와 환경 변수 노출 경계", "NextJS-Config-Taint-Env"]
---

# Next.js taint와 환경 변수 노출 경계

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## env

레거시 `next.config`의 env object는 key/value를 build-time JavaScript bundle에 포함한다. NEXT_PUBLIC_ prefix 없이도 노출될 수 있으므로 secrets를 넣지 않는다. `.env`/process environment에서 NEXT_PUBLIC_로 공개하는 정책과 다르다. 직접 `process.env.customKey` 접근을 static replacement하며 destructuring은 DefinePlugin 방식 때문에 작동하지 않는다.

```js
export default { env: { publicProductName: 'Catalog' } }
```

값은 build에 고정된다. runtime에서 같은 artifact를 승격하는 배포와 public config 교체를 구분한다. App 레퍼런스는 레거시로 표시하며 9.4 이후 environment files 사용을 안내한다.

## taint

실험 `experimental.taint: true`는 React의 experimental_taintObjectReference와 experimental_taintUniqueValue를 활성화한다. App의 React experimental channel도 활성화하고 process.env 전체 object reference를 taint한다. server/client 경계를 금지한 object/value가 넘으면 오류를 발생시킨다.

```ts
import { experimental_taintObjectReference } from 'react'

export async function readPrivateAccount() {
  const account = await loadAccount()
  experimental_taintObjectReference('전체 계정 객체를 client에 전달하지 않는다', account)
  return account
}
```

object taint는 reference 기반이다. `{ ...account }` 복사본, 개별 field, process.env.TOKEN 문자열은 자동 taint되지 않는다. unique value는 다른 변수에 재할당해도 같은 값이면 막지만 template string 등 derived value는 별도 taint가 필요하다. lifetime reference가 scope에 유지되는 동안 적용되는 계약도 고려한다.

## DTO와 방어의 역할

taint는 실수에 대한 방어막이며 유일한 개인정보/secret 방지책으로 쓰지 않는다. 서버 조회 결과에서 client에 필요 없는 field를 제거한 DTO를 만드는 것이 먼저다. secret-bearing object를 광범위하게 반환한 뒤 taint만으로 모든 변형을 추적할 수는 없다. bundle search와 실제 RSC response를 확인한다.

## object와 unique value 예시

taintObjectReference(message, object)는 전체 user object의 Client 전달을 막아도 firstName/lastName 같은 개별 field는 그 자체로 taint하지 않는다. 필요한 field만 선택한 DTO를 우선 반환한다. 외부 조회 shape/함수를 바꿀 수 없거나 server rendering 중 민감정보를 다룰 때 방어층으로 쓸 수 있다.

taintUniqueValue(message, lifetime, value)는 config object를 lifetime으로 사용하고 SERVICE_API_KEY 값을 taint할 수 있다. 같은 token을 다른 변수에 할당해도 막지만 'version::'+token처럼 만든 derived string은 별도로 taint하지 않으면 노출된다. SERVICE_API_VERSION 같은 다른 field는 사용할 수 있다. 조회 반환값에서 API key 자체를 제거하는 설계를 우선한다.

ContactPage 예시는 params Promise를 await해 id를 꺼낸 뒤 getUserDetails에 전달한다. TS 예시의 정의되지 않은 id를 교정하고 전체 object 전달이 실제 taint 오류를 만드는 조건을 검증한다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/env](https://nextjs.org/docs/app/api-reference/config/next-config-js/env)
- [Next.js, pages/api-reference/config/next-config-js/env](https://nextjs.org/docs/pages/api-reference/config/next-config-js/env)
- [Next.js, app/api-reference/config/next-config-js/taint](https://nextjs.org/docs/app/api-reference/config/next-config-js/taint)

## 관련 문서

- [[NextJS-Config-Server-Actions]]
