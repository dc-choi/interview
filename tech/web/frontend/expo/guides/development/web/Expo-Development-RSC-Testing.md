---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo RSC Jest renderer와 Flight 검증"]
---

# Expo RSC Jest renderer와 Flight 검증

## 테스트 목적

RSC는 Node 서버에서 실행되지만 Expo universal renderer는 target별 파일 확장자와 client module reference를 다르게 해석한다. 일반 client UI test와 RSC serialization test를 나누어 서버에 불가능한 import를 확인한다.

| Jest preset | 해석 대상 |
| --- | --- |
| `jest-expo/rsc/android` | android, native, 공통 module |
| `jest-expo/rsc/ios` | ios, native, 공통 module |
| `jest-expo/rsc/web` | web, 공통 module |
| `jest-expo/rsc` | 위 target을 함께 실행 |

```js
// jest-rsc.config.js
module.exports = require('jest-expo/rsc/jest-preset');
```

script는 `jest --config jest-rsc.config.js`로 구성하고 server test는 `__rsc_tests__/`에 둔다. client suite를 server renderer에서 잘못 실행하지 않게 한다. 특정 project만 실행하려면 `--selectProjects rsc/web` 등을 지정한다.

## matcher 계약

`toMatchFlight`는 JSX를 Expo CLI와 유사한 pseudo renderer로 serialize한 Flight 문자열과 비교한다. `toMatchFlightSnapshot`은 같은 문자열을 snapshot으로 보관한다. render stream을 buffer하므로 전체 결과 비교용이며 점진 stream 순서는 별도 관찰해야 한다.

```tsx
/// <reference types="jest-expo/rsc/expect" />
import { Text } from 'react-native';

it('텍스트를 서버 payload로 렌더링한다', async () => {
  await expect(<Text testID="title">Catalog</Text>).toMatchFlightSnapshot();
});
```

renderer 오류는 matcher failure가 되며 Flight에는 client에서 throw할 `E:` error line이 생길 수 있다. snapshot을 갱신해 오류를 무시하지 않고 boundary/import 계약을 조사한다.

## package export와 경계

`server-only`, `client-only`는 잘못된 환경 import를 assert한다. package exports의 `react-server` condition으로 server 전용 module을 지정할 수 있다. RSC mode에서 기본 module은 server graph이며 `'use client'`가 async client reference로 전환한다. `'use server'`는 Server Functions용이다.

테스트는 experimental serialization/library compatibility를 검사한다. 실제 EAS deployment, native Hermes의 network/runtime와 production streaming은 별도 검증 대상이다.

## 출처

- [Expo Documentation, Testing React Server Components](https://docs.expo.dev/guides/testing-rsc)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
