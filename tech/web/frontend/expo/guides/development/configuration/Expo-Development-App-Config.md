---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo app config 해석과 공개 범위"]
---

# Expo app config 해석과 공개 범위

## 설정 파일의 책임

프로젝트 루트의 `package.json` 옆에 둔 app config는 Prebuild 생성, Expo Go 로딩과 OTA manifest를 설정한다. 최소 항목은 `name`, `slug`다. 최상위 `expo` 객체가 있으면 그 객체를 설정으로 사용하고 바깥 키는 무시한다.

| 형태 | 파일 | 편집 방식 |
| --- | --- | --- |
| 정적 | `app.config.json`, `app.json` | CLI가 자동 수정 가능 |
| 동적 | `app.config.ts`, `app.config.js` | 개발자가 로직과 값을 수정 |

## 해석 순서

1. `app.config.json`을 먼저 찾고 없으면 `app.json`을 읽는다. 둘 다 없으면 package metadata와 의존성에서 기본값을 추론한다.
2. `app.config.ts` 또는 `app.config.js`를 읽고 둘 다 있으면 TypeScript를 선택한다.
3. 동적 export가 함수이면 정규화된 정적 config를 `{ config }` 인자로 전달한다.
4. 반환값을 최종 설정으로 사용한다. Promise와 비동기 반환은 지원하지 않는다.
5. 함수 값은 도구가 사용하기 전에 평가/직렬화되며 호스팅 manifest는 JSON이어야 한다.
6. 최종 객체에도 `expo`가 있으면 그 내부 객체만 사용한다.

`npx expo config`는 최종 해석값을 출력한다. 원본 파일과 최종 공개 설정은 다른 대상이다.

## 동적 설정 예제

```ts
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: process.env.APP_VARIANT === 'production' ? 'Store' : 'Store Dev',
  slug: 'store',
  extra: { apiUrl: process.env.EXPO_PUBLIC_API_URL },
});
```

환경 변수는 명령을 실행하는 process에서 제공한다. 동적 설정은 Metro가 다시 로딩할 때 갱신된다. ESM import는 JS/TS에서 지원하지만 다른 TS 파일과 언어 기능을 사용하려면 `tsx` 구성을 검토한다. `.mts`, `.cts`, `.mjs`, `.cjs`도 탐색하며 혼합 ESM/CommonJS로 문제가 나면 명시적 확장자로 모듈 형식을 고정한다.

## 런타임 접근과 비밀값

```ts
import Constants from 'expo-constants';
const apiUrl = Constants.expoConfig?.extra?.apiUrl;
```

대부분의 config는 `Constants.expoConfig`에서 접근 가능하다. `extra`는 임의 런타임 설정 전달용이며 비밀 저장소가 아니다. `app.json`이나 `app.config.js`를 앱 코드에 직접 import하면 처리/필터링 전 파일 전체가 들어갈 수 있다.

공개 config에서 제외되는 필드는 `ios.config`, `android.config`, `updates.codeSigningCertificate`, `updates.codeSigningMetadata`다. 그 밖의 민감값을 임의로 안전하다고 가정하지 않는다. `npx expo config --type public`으로 빌드/업데이트에 포함할 공개값을 확인한다.

Config plugin은 config를 확장해 Prebuild 중 native 프로젝트를 변경한다. config를 변경했다고 이미 설치된 앱의 native 값이 자동으로 바뀌지는 않는다.

## 출처

- [Expo Documentation, Configure with app config](https://docs.expo.dev/workflow/configuration)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
