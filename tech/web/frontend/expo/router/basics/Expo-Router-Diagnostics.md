---
tags: [expo, expo-router, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 화면 추적과 sitemap"]
---

# Expo Router 화면 추적과 sitemap

## 화면 추적

화면은 URL로 표현되므로 루트 layout에서 `usePathname`과 `useGlobalSearchParams`를 관찰해 analytics에 넘긴다. provider가 준비되어야 하며 URL에 담긴 민감 값을 무조건 기록하지 않는다.

```tsx
const pathname = usePathname();
const params = useGlobalSearchParams();
useEffect(() => {
  analytics.track({ pathname, params });
}, [pathname, params]);
```

Expo Router가 root NavigationContainer를 관리하므로 별도의 onReady/onStateChange 분석 패턴보다 URL hook을 우선한다. query 변화도 event가 될 수 있으므로 원하는 screen view 정의에 맞춰 중복을 줄인다.

## sitemap과 deep link 확인

`/_sitemap`은 자동 주입되는 앱 route 목록 진단 화면이다. SEO XML sitemap과 같은 기능으로 오해하지 않는다. `expo-router` config plugin에 `sitemap: false`를 지정해 제거할 수 있고 `_sitemap.tsx`를 만들면 내장 route를 덮는다.

실기기에서는 Safari/Chrome에 scheme URL을 입력하거나 uri-scheme CLI로 테스트한다. Expo Go 주소는 개발 서버 주소에 `/--/` 뒤 route를 붙인다. 예: `exp://<개발서버주소>/--/form-sheet`. 주소와 포트는 실제 `expo start` 결과로 바꾼다. 여기서는 실기기 실행이나 deep link 성공을 검증하지 않았다.

## 출처

- [Expo Documentation, Screen tracking for analytics](https://docs.expo.dev/router/reference/screen-tracking)
- [Expo Documentation, Sitemap](https://docs.expo.dev/router/reference/sitemap)

## 관련 문서

- [[Expo-Router]]
