---
tags: [expo, expo-router, links]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router Link API"]
---

# Expo Router Link API

Link는 파일 경로를 URL로 연결하고 네이티브 탐색과 웹 anchor를 함께 제공한다. `import { Link, Redirect } from 'expo-router'`로 사용한다. 단순한 화면 이동과 매개변수는 [[Expo-Router-Navigation]], iOS preview와 zoom은 [[Expo-Router-Link-Preview-Zoom]]에서 이어진다.

## 목적지와 탐색 동작

`href`는 string 또는 `{ pathname, params }`다. `Href` 타입은 생성된 route type을 반영하고 `ExternalPathString`은 scheme이나 `//`로 시작한다. `RelativePathString`은 `./`, `../`, `..`다. query/hash suffix는 각각 `?`, `#`로 시작한다. 상대 링크는 기본적으로 현재 문서를 기준으로 해석하며 `relativeToDirectory`를 켜면 현재 URL의 디렉터리를 기준으로 한다.

| prop | 계약 |
| --- | --- |
| `asChild` | Link의 Text 대신 단일 자식으로 onPress, href 등을 전달한다. 자식은 해당 prop과 ref를 전달해야 한다 |
| `push` | 같은 경로라도 새 stack entry를 추가한다 |
| `replace` | current entry를 교체한다 |
| `dismissTo` | href까지 stack을 닫는다. 이력에서 못 찾으면 href로 교체한다 |
| `prefetch` | 화면이 보일 때 destination 준비를 요청한다. 준비한 route는 focused 화면이 아니다 |
| `withAnchor` | destination navigator의 anchor/initial 화면을 보존해 deep entry에서도 돌아갈 화면을 만든다 |
| `dangerouslySingular` | push할 때 같은 식별자 entry를 이력에서 제거한다. boolean 또는 `(name, params) => string | undefined`로 식별자를 지정한다 |
| `onPress` | press event callback. native와 web event type이 다를 수 있다 |
| `className` | 웹 class와 native CSS interop을 연결한다. 별도 interop 구성 없이 RN style이 되는 것은 아니다 |
| `ref`, `style` | wrapper 또는 asChild의 실제 rendering 대상에 따른다 |

```tsx
<Link href={{ pathname: '/products/[id]', params: { id: '42' } }} asChild>
  <Pressable><Text>상품 보기</Text></Pressable>
</Link>
```

웹에서 `target` 기본값은 `_self`이며 `_blank`, `_parent`, `_top` 또는 이름을 지정한다. `download`는 다운로드 파일명, `rel`은 `nofollow`, `noopener`, `noreferrer` 등의 anchor 관계다. 외부 scheme은 내부 route와 같은 서버 권한 경계로 취급하지 않는다. `Redirect`는 mount되면 href로 교체하며 href, relativeToDirectory, withAnchor를 받는다.

## iOS 메뉴 구성

`Link.Menu`는 title, subtitle, SF Symbol `icon`, image와 menu children을 받는다. children은 `Link.Menu` 또는 `Link.MenuAction`이어야 한다. 같은 Link 안에서는 첫 Menu만 사용한다. `destructive`는 위험한 action 표현, `inline`은 제목 없이 inline action 표시, `palette`는 palette layout이다. `elementSize`는 small/medium/auto/large이고 small은 submenu에만 적용된다. 예전 `displayAsPalette`, `displayInline`은 deprecated다. image는 `useImage`가 반환한 shared reference를 전달할 수 있고 icon보다 image가 우선한다.

`Link.MenuAction`의 제목은 children으로 표현한다. 예전 title prop은 deprecated다. `onPress`는 action callback, `disabled`는 비활성, `hidden`은 메뉴에서 숨김, `destructive`는 destructive 표현, `isOn`은 check 상태다. `subtitle`, `discoverabilityLabel`, `icon`, `image`, `imageRenderingMode`도 지원한다. `unstable_keepPresented`는 action 뒤 메뉴를 계속 열지만 메뉴 상태를 재설정하므로 안정적인 제어 API로 가정하지 않는다.

```tsx
<Link href="/item/42">
  <Link.Trigger><Text>항목</Text></Link.Trigger>
  <Link.Preview />
  <Link.Menu title="항목 작업">
    <Link.MenuAction icon="square.and.arrow.up" onPress={share}>공유</Link.MenuAction>
    <Link.MenuAction destructive onPress={remove}>삭제</Link.MenuAction>
  </Link.Menu>
</Link>
```

## 구성 요소의 제약

Trigger, Preview, Menu는 Link의 직접 자식이어야 한다. Trigger는 단일 자식을 요구하고 첫 Trigger, Preview만 사용된다. `Link.Trigger`의 `withAppleZoom`은 자식에 zoom source wrapper를 적용하므로 이미 AppleZoom으로 감싼 자식과 중첩하지 않는다. Preview의 style은 native presentation에 따라 일부 속성을 무시할 수 있다. menu 표시가 권한 검사나 삭제 확인을 대신하지는 않는다.

## 출처

- [Expo Documentation, Router Link](https://docs.expo.dev/versions/latest/sdk/router/link)

## 관련 문서

- [[Expo-Router-Navigation]]
- [[Expo-Router-Link-Preview-Zoom]]
