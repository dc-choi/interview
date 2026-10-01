---
tags: [nextjs, app-router, runtime]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Draft Mode와 preview 인증"]
---

# Draft Mode와 preview 인증

## 상태와 cookie

next/headers의 draftMode()는 async이며 반환 object의 isEnabled로 상태를 읽고 enable()/disable()로 변경한다. 변경은 Route Handler/Server Action에서 수행한다. cache 함수 안에서는 isEnabled만 읽을 수 있고 enable/disable은 오류다. Draft Mode는 cache를 우회하여 게시 전 데이터를 조회할 수 있게 한다.

```ts
import { draftMode } from 'next/headers'
export async function GET(request: Request) {
  const url = new URL(request.url)
  await verifyPreviewSecret(url.searchParams.get('secret'))
  const path = await validatePreviewPath(url.searchParams.get('slug'))
  const draft = await draftMode()
  draft.enable()
  return Response.redirect(new URL(path, request.url))
}
```

CMS preview endpoint는 secret을 검증하고 실제 존재하는 허용 content path를 확인한다. 제공받은 slug를 검증 없이 외부 redirect destination으로 쓰지 않는다. draft state가 활성화되었다는 사실 자체로 private content의 접근 권한을 대신하지 않는다.

## 생애와 사용

enable은 __prerender_bypass cookie를 설정한다. 값은 새 build마다 무작위로 달라져 오래된 preview cookie와 새 deployment가 같다고 전제하지 않는다. 기본 session cookie는 browser session이 끝나면 종료된다. local HTTP에서 테스트할 때 browser의 cookie 정책이나 third-party cookie 차단 때문에 preview가 안 될 수 있다.

Server Component에서는 await draftMode 뒤 isEnabled에 따라 CMS query의 published/draft 선택을 바꿀 수 있다. preview UI는 현재 draft임을 표시하고 실제 published 경로와 검증한다. disable endpoint로 가는 Link에는 prefetch=false를 둔다. prefetch GET만으로 draft를 끄는 부작용이 생기지 않아야 한다.

## async 접근과 cache 예외

draftMode()는 Promise를 반환하므로 await 또는 React use로 읽는다. isEnabled는 boolean이며 enable()은 __prerender_bypass를 설정하고 disable()은 삭제한다. Handler 예는 `const draft = await draftMode(); draft.enable()` 또는 disable() 후 활성/비활성 상태 Response를 반환한다. Server Page는 isEnabled에 따라 Enabled/Disabled 안내를 렌더한다.

cache scope에서 isEnabled는 허용되어 draft/production query를 선택할 수 있지만 cookies/headers 제한은 남는다. draft 활성 중에는 cache 함수가 매 request마다 다시 실행되고 결과를 저장하지 않는다. cache 안에서 mode를 toggle하면 throw한다. local HTTP 테스트에는 third-party cookie와 local storage 접근 허용이 필요하다. 13.4에 도입되었으며 15 RC에서 async로 전환되어 codemod를 제공한다. 14 이전의 sync API와 15의 하위 호환 sync 읽기는 deprecated 예정이다.

## 이해 확인

1. secret 확인 없이 draft enable endpoint를 공개하면 어떤 접근이 열리는가?
2. disable 링크의 prefetch를 끄는 이유는?
3. 새 build 뒤 기존 cookie 상태가 동일하게 유지된다고 가정할 수 있는가?

## 출처

- [Next.js, draft-mode](https://nextjs.org/docs/app/api-reference/functions/draft-mode)

## 관련 문서

- [[NextJS-App-Request-Response]]
- [[NextJS-App-Fetching]]
- [[NextJS-App-Cache-Functions]]
