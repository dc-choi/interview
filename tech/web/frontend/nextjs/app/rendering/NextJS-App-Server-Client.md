---
tags: [nextjs, app-router, rendering]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js의 서버/클라이언트 모듈 경계"]
---

# Next.js의 서버/클라이언트 모듈 경계

## 실행 위치와 번들 경계

page/layout은 기본 Server Component다. DB/API 접근, 비밀값, 작은 client bundle에 적합하다. state/event/Effect/browser API가 필요한 작은 UI에 use client를 둔다. Client Component도 첫 load에서는 server에서 HTML로 prerender될 수 있으므로 use client를 window가 항상 존재한다는 보장으로 읽지 않는다.

Server는 route segment와 parallel slot 단위로 RSC Payload를 생성한다. RSC에는 server rendered output, Client placeholder/JS 참조와 serializable props가 담긴다. 첫 load는 HTML preview → RSC reconciliation → Client hydration, 이후 이동은 RSC/client render로 진행한다.

## directive의 계약

| directive | 적용 위치/효과 |
| --- | --- |
| use client | imports 전 파일 첫 부분, client module entry, inline 불가 |
| use server | 서버 파일 또는 async 함수 첫 부분, Server Function 참조 생성 |
| use cache | 서버 파일 또는 async 함수 첫 부분, output cache |

file-level use server/use cache의 모든 exported 함수는 async여야 한다. file-level cache가 generateMetadata/generateStaticParams도 포함하면 그 함수들 역시 async다. Client module에 server/cache directive를 선언하지 않는다. 해당 서버 파일을 client에서 import하면 구현 코드가 아닌 서버 호출 참조를 받는다.

use client의 import graph는 client bundle에 포함되며 직접 import한 component도 영향을 받는다. 따라서 큰 layout에 directive를 올리는 대신 Search/Counter 같은 leaf에 둔다. 서버에서 children prop으로 넣은 rendered UI는 client module graph의 import가 아니므로 그 Server Component 코드가 client로 이동하지 않는다.

## composition과 직렬화

```tsx
// Server page
import Modal from './modal' // use client module
import Cart from './cart'   // Server Component
export default function Page() { return <Modal><Cart /></Modal> }
```

Cart는 Modal이 닫혀 있어도 서버에서 먼저 실행된다. Modal이 Server Cart를 client 파일에서 직접 import하는 형태와 다르다. 경계를 넘는 props는 React serialization을 만족해야 한다. 일반 callback은 넘길 수 없지만 Server Function reference는 가능하다. Promise를 넘기고 client use로 stream하는 방식은 Suspense와 함께 쓴다.

React Context는 Server Component에서 사용하지 않는다. client provider를 만들어 서버 layout에서 children만 감싸고 필요한 client consumer가 읽게 한다. provider를 깊게 두면 나머지 static server UI 최적화가 쉬워진다.

## 외부 컴포넌트와 환경 오염 방지

Hook을 쓰지만 directive가 없는 third-party component는 별도 use client wrapper에서 export하면 Server parent가 안전하게 사용할 수 있다. 라이브러리 작성자는 client entry directive가 bundler에서 제거되지 않도록 한다.

server secret은 NEXT_PUBLIC 접두사를 붙이지 않는다. non-public env가 client에서 빈 문자열로 바뀌는 것만으로 올바른 실행 경계가 보장되지는 않는다. 서버 DB/secret utility에 `import 'server-only'`, browser utility에 `import 'client-only'`로 잘못된 import를 build에서 막는다. Next.js는 marker를 내부 처리하므로 패키지 설치는 선택적이며 lint의 외부 dependency 규칙에 따라 선언한다. noUncheckedSideEffectImports용 타입도 제공한다.

## 경계를 작게 두는 예제

서버의 `[id]` Page는 Promise params를 await해 getPost(id)를 실행하고 title은 서버에서, likes:number만 LikeButton으로 넘긴다. Client Counter는 `useState(0)`과 onClick에서 count+1을 표시한다. Header/Logo/정적 navigation이 있는 layout을 서버로 유지하고 Search나 Counter만 client entry로 만든다. state/onChange/onClick, Effect lifecycle, localStorage/window/geolocation 및 custom hook은 client 영역에 둔다. 서버 데이터의 근접 실행과 secret 보호, JS 감소, FCP 개선과 progressive streaming은 server 선택 이유다.

첫 요청은 RSC와 Client 참조로 HTML을 prerender하고, 브라우저에서 HTML preview, RSC tree 결합, event handler hydration 순서다. 이후 이동은 prefetched/cached RSC로 조합하며 client UI에는 새 server HTML을 보내지 않는다. **보이지 않는 parallel slot도** 서버 segment chunk 작업에 포함되므로 닫힌 Modal의 Cart와 마찬가지로 숨김을 데이터 실행 방지로 가정하지 않는다.

ThemeProvider 예는 client createContext와 value='dark' Provider가 children만 감싸고 서버 root layout은 html/body를 유지한다. Client consumer가 context를 사용하며 서버가 context를 읽는 구조가 아니다. Promise 기반 서버 데이터를 provider로 전달한 후 client use()로 읽는 패턴도 가능하다.

useState를 쓰는 외부 Carousel은 client Gallery에서 isOpen 상태/버튼과 함께 렌더하거나 use client 파일에서 import 후 재export한다. 후자를 서버 Page가 import할 수 있다. 라이브러리는 해당 entry의 directive를 보존하도록 esbuild/tsup 설정을 확인한다. server-only 예는 외부 fetch의 authorization에 non-public API_KEY를 쓰는 data.js 맨앞에 marker를 import한다. client-only는 window utility에 쓴다. 설치가 필요한 lint 환경의 대표 명령은 `npm install server-only`다.

## 컴파일과 Server Function 예제

use client/use server는 React, use cache 및 private/remote 변형은 Next.js가 정의한다. dev/production 모두 compiler가 처리하며 overlay/stack trace는 생성 코드 대신 source file/line을 가리킨다. cacheHandlers는 저장 위치를 정한다. page 전체 cache는 imports 및 렌더 결과를 포함하지만 data helper cache는 해당 결과만 보관한다. 비싼 요청 하나가 목적이면 helper에 directive를 둔다. remote entry가 커지면 저장/네트워크 비용도 커진다.

서버 actions.ts의 async createUser({name,email})는 auth()로 session.user를 확인하고 DB create 뒤 `{id,name}`만 반환한다. fetchUsers도 session 검증 후 select:{id,name,email}로 필요한 필드만 읽으며 client MyButton이 onClick에서 해당 참조를 호출한다. client의 import는 서버 구현 코드를 내려받는 것이 아니다.

inline updatePost는 서버 PostPage에서 await params/getPost 후 async 함수 첫 줄에 use server를 둔다. closure id와 FormData를 savePost에 전달하고, 인증 확인 후 `revalidatePath('/posts/' + id)`를 호출해 EditPost의 action prop으로 넘긴다. 인자는 반드시 검증하며 인증은 client가 전달한 token 대신 cookies/headers에서 읽는다. DAL이 input/auth/authorization/return scope를 공통 계약으로 관리한다. return은 raw DB record 대신 UI 필드만 serializable하게 보낸다.

## 이해 확인

1. Modal의 children Cart가 보이지 않는 동안 query가 실행될 수 있는 이유는?
2. use client를 선언했는데 SSR에서 window 에러가 날 수 있는가?
3. use server와 server-only는 어떤 다른 경계를 만드는가?

## 출처

- [Next.js, server-and-client-components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js, directives](https://nextjs.org/docs/app/api-reference/directives)
- [Next.js, use-client](https://nextjs.org/docs/app/api-reference/directives/use-client)
- [Next.js, use-server](https://nextjs.org/docs/app/api-reference/directives/use-server)

## 관련 문서

- [[React-Server-Components]]
- [[React-Server-Functions]]
- [[React-Server-Boundaries]]
