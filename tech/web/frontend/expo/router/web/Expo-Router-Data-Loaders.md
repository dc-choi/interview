---
tags: [expo, expo-router, web]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router server data loader"]
---

# Expo Router server data loader

Data loader는 route의 `loader` named export에서 server data를 읽고 컴포넌트의 `useLoaderData<typeof loader>()`로 받는다. SDK 55~57에는 `unstable_useServerDataLoaders: true`가 필요하며 SDK 58부터 stable이다. static 또는 server rendering을 구성해야 한다.

```tsx
export async function loader(request, params) {
  const response = await fetch(`https://api.example.com/posts/${params.id}`);
  if (!response.ok) throw new Error('Load failed');
  return response.json();
}
function ArticleContent() {
  const article = useLoaderData<typeof loader>();
  return <Text>{article.title}</Text>;
}
```

hook은 해당 route의 child subtree에서도 사용할 수 있다. data가 pending이면 가장 가까운 Suspense fallback, error는 screen ErrorBoundary 또는 parent boundary로 전파한다. retry callback으로 회복 UI를 만들 수 있다.

## request와 return

두 번째 인수는 route params다. static build에서는 Request가 undefined, SSR에서는 immutable incoming Request로 cookie/authorization을 읽을 수 있다. loader는 JSON.stringify 가능한 object/array/primitive만 반환하며 null/undefined는 null로 정규화한다. stream/async iterable은 지원하지 않는다.

static은 export 시점의 결과를 HTML/JSON에 넣어 다음 build 전까지 유지한다. SSR은 request마다 실행되고 client navigation은 cache된 loader data를 재사용한다. 현재 built-in invalidation API가 없다는 제한이 있으므로 수정 후 fresh data 필요에 별도 전략을 세운다.

## type helper와 runtime

`expo-router/server`의 createStaticLoader는 callback에 params만 제공해 static/SSR 둘 다 사용할 수 있다. createServerLoader는 immutable request와 params를 받고 SSG에서 실행하면 error다. LoaderFunction<T>는 전체 request/params signature를 직접 선언한다. guide의 helper 소개에 expo-server라 적힌 부분보다 예제 import인 expo-router/server를 따른다.

loader는 expo-server StatusError, setResponseHeaders와 background task helper를 사용할 수 있다. 요청 없는 static build에서 request-scoped helper의 사용 가능성을 무조건 가정하지 않는다. auth에 의존하는 page에는 SSR request 계약이 맞다.

## client bundle 경계

loader export는 client bundle에서 제거되지만 반환한 결과는 공개 HTML/JSON/client에 전달된다. API key로 server fetch를 했어도 key를 return하면 비밀이 유지되지 않는다. server helper module을 client의 다른 import가 참조하면 client에 포함될 수 있다. route 밖 shared module을 server-only라고 이름만 붙이는 것은 보안 경계가 아니다.

## 출처

- [Expo Documentation, Data loaders](https://docs.expo.dev/router/web/data-loaders)

## 관련 문서

- [[Expo-Router-Static-Rendering]]
- [[Expo-Router-Server-Rendering]]
- [[Expo-Router-Errors-Testing]]
