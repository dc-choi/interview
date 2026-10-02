---
tags: [expo, expo-router, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 타입 경로와 플랫폼 모듈"]
---

# Expo Router 타입 경로와 플랫폼 모듈

## typed routes

Typed routes는 beta 기능이며 TypeScript 프로젝트에서 `experiments.typedRoutes: true`로 활성화한다. 기본 템플릿은 활성화되어 있을 수 있다. Expo CLI 개발 서버가 파일 구조에서 route type을 생성하고 `Href`, `Route`, Link와 imperative router의 경로를 검사한다.

```tsx
import { Link, useLocalSearchParams } from 'expo-router';
<Link href={{ pathname: '/users/[id]', params: { id: '123' } }} />;
const params = useLocalSearchParams<'/users/[id]', { tab?: string }>();
```

동적 template만 문자열 `/users/[id]`로 보내면 필수 parameter가 빠지므로 객체형을 쓴다. query는 파일에 없으므로 generic으로 수동 선언한다. 상대 href는 typed routes가 지원하지 않는다고 문서화되어 있다. `useSegments`의 group segment를 읽어 absolute 주소를 만들면 현재 탭을 유지할 수 있다.

`npx expo customize tsconfig.json`으로 include를 구성하고 `.expo/types/**/*.ts`, `expo-env.d.ts`를 제거하지 않는다. 자동 생성 파일은 Git에서 제외하며 직접 편집하지 않는다. CI 설명은 customize 명령을 안내하지만 해당 프로젝트에서 실제 route type 파일이 생성되는지도 확인해야 한다. 정적 type 생성 성공을 런타임 주소 검증으로 해석하지 않는다.

생성 환경 타입에는 NODE_ENV union, CSS/Sass imports, CSS module export, Metro require.context가 포함된다. React Native Web용 style, tabIndex/aria-level/lang, Pressable hovered와 className type도 보강한다.

## 플랫폼별 화면

route 디렉터리에서 `.ios.tsx`, `.android.tsx`, `.native.tsx`, `.web.tsx`를 쓰려면 같은 basename의 일반 `.tsx`가 있어야 한다. 유니버설 route 발견과 deep link 계약을 유지하기 위한 조건이다. 예를 들어 `about.web.tsx`와 `about.tsx`를 함께 두면 URL `/about`은 같고 웹 구현만 달라진다.

route 밖에서는 Metro 플랫폼 확장자 해석으로 component를 선택하고 route는 `export { default } from '@/components/about';`로 재사용할 수 있다. 작은 차이는 `Platform.OS` 분기, 큰 navigator 차이는 플랫폼 파일을 사용한다. 웹 전용 div를 네이티브 branch에 렌더링하지 않는다.

## 출처

- [Expo Documentation, Typed routes](https://docs.expo.dev/router/reference/typed-routes)
- [Expo Documentation, Platform-specific extensions and module](https://docs.expo.dev/router/advanced/platform-specific-modules)

## 관련 문서

- [[Expo-Router]]
