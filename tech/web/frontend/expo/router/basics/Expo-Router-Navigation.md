---
tags: [expo, expo-router, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 탐색과 URL 매개변수"]
---

# Expo Router 탐색과 URL 매개변수

`Link href`와 `router`는 같은 URL을 사용한다. 객체형 Href는 `pathname`과 `params`로 동적 segment와 query를 분리한다. 예를 들어 `{ pathname: '/users/[id]', params: { id: '123', tab: 'posts' } }`는 `/users/123?tab=posts`다.

## 이동 동작

| API | history에 미치는 영향 |
| --- | --- |
| `navigate(href, options?)` | 기존 screen으로 되감거나 새 screen을 추가 |
| `push(href, options?)` | 새 screen을 명시적으로 push |
| `replace(href, options?)` | 현재 screen을 교체 |
| `back()` | 이전 screen으로 이동 |
| `setParams(params)` | 새 history 항목 없이 URL parameter 변경 |
| `<Redirect href>` | 현재 route를 렌더링하지 않고 replace 방식 이동 |

`useRouter()`는 컴포넌트에서 router를 얻고 `import { router }`는 imperative 호출에 사용한다. 반복적으로 focus될 때 redirect해야 하면 `useFocusEffect` 안에서 replace한다. 초기 렌더에서 무조건 push하는 패턴은 피한다.

Link는 기본적으로 Text 자식 컨테이너다. View나 버튼 배치를 직접 제어하려면 `asChild`로 onPress/onClick과 ref 전달이 가능한 Pressable을 자식으로 둔다. `./article`, `../article`은 렌더링된 현재 화면 기준 상대 URL이며 typed routes의 정적 검사에는 별도 제약이 있다.

```tsx
import { Link, router, useLocalSearchParams } from 'expo-router';
export default function Product() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  return <Link href={{ pathname: '/products/[id]', params: { id, tab: 'info' } }}>
    {tab ?? 'info'}
  </Link>;
}
// 현재 URL의 query만 교체
router.setParams({ tab: 'reviews' });
```

## local과 global parameter

route parameter는 경로 match에 쓰는 `[id]` 값이다. search parameter는 `?tab=...`처럼 추가 전달하는 직렬화 값이다. 화면의 generic type은 런타임 검증을 대신하지 않는다.

`useLocalSearchParams`는 현재 컴포넌트 route와 URL이 맞을 때 갱신되어 뒤에 남아 있는 Stack 화면의 parameter를 보존한다. `useGlobalSearchParams`는 활성 URL이 바뀔 때 background 화면도 갱신해 분석에 적합하지만 불필요한 render와 data fetch를 유발할 수 있다. `[...rest]`는 `string[]`, 일반 segment는 string이며 선택적 query는 없을 수 있다.

`setParams`는 history를 push하지 않는다. 동적 route parameter가 바뀌면 화면은 remount될 수 있으므로 query 갱신과 같은 state 보존을 기대하지 않는다. hash는 `'#'` search key로 읽고 `router.setParams({ '#': 'details' })`로 바꾼다. `screen`, `params`, `initial`, `state`는 내부 예약 이름이다.

## prefetch와 deep link

`<Link href="/about" prefetch>`는 render 시 대상 화면을 미리 준비한다. 기본 navigator는 off-screen render를 사용할 수 있고 custom navigator는 지원하지 않을 수 있다. preloaded Stack 화면은 활성화 전 imperative router 호출, navigation.setOptions와 navigator event listener 사용이 제한된다. navigation이 바뀔 때 effect listener를 다시 연결하고 focus된 뒤 action을 수행한다.

웹 URL은 브라우저 주소이고 네이티브 URL은 config scheme을 앞에 붙인 `myapp://users/123`이다. HTTPS로 앱을 여는 app/universal link에는 도메인 association 설정도 필요하다. deep link에서 back 대상이 필요하면 layout anchor를 지정한다.

## 출처

- [Expo Documentation, Navigating between pages in Expo Router](https://docs.expo.dev/router/basics/navigation)
- [Expo Documentation, Using URL parameters](https://docs.expo.dev/router/reference/url-parameters)
- [Expo Documentation, Redirects](https://docs.expo.dev/router/reference/redirects)

## 관련 문서

- [[Expo-Router-Typed-Routes]]
- [[Expo-Router-Link]]
- [[Expo-Router-Layouts]]
