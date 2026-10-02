---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo platform shaking과 실험적 graph 최적화"]
---

# Expo platform shaking과 실험적 graph 최적화

## production 제거 단계

platform shaking은 target별 bundle에서 다른 platform 분기를 제거한다. 파일마다 `react-native`에서 직접 import한 `Platform.OS`, `Platform.select`를 대상으로 하며 다른 module로 re-export하면 해당 인식이 사라질 수 있다. production에만 수행한다.

`__DEV__`와 `process.env.NODE_ENV`는 constant folding 후 unreachable branch가 minification에서 제거된다. `EXPO_PUBLIC_` 변수도 앱 코드에 인라인해 feature branch 제거에 사용할 수 있다. .env 값은 string이므로 `'false'`도 truthy라는 점을 고려해 `=== 'true'`처럼 명시적으로 비교한다. server bundle에는 client 환경 인라인을 적용하지 않는다.

`process.env.EXPO_OS`는 bundled target이고 runtime에서 바뀌지 않는다. Metro의 dependency 해석 뒤 minify 순서 때문에 이 변수 분기만으로 import graph platform 제거까지 보장하지 않는다.

## server/browser 분기

server bundling은 `typeof window === 'undefined'`를 true로 바꾼다. web client는 Web Worker처럼 window가 없는 context를 고려해 기본적으로 이 검사를 남긴다. client를 일괄 browser main thread로 가정하는 minify 옵션은 해당 Babel preset의 실제 option 이름과 환경을 확인한 후 쓴다. native 환경의 server 판별도 같은 검사 하나로 단정하지 않는다.

## RNW ESM import

`import { View, Image } from 'react-native'`는 web에서 각각의 RNW export 경로로 바뀌어 barrel을 줄일 수 있다. `require('react-native')`는 전체 RNW barrel을 유지한다. static ESM syntax가 최적화 분석에 유리하다.

## module 간 tree shaking 활성화

SDK52 이후의 unused imports/exports graph 제거는 experimental이다. SDK54 이후 import support 자체는 기본이지만 graph/tree-shaking flag까지 안정 기본이라고 볼 수 없다.

```dotenv
EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH=1
EXPO_UNSTABLE_TREE_SHAKING=1
```

production export에서만 효과를 확인한다. `experimentalImportSupport`는 ESM 구조를 분석할 수 있게 하며 별도 Babel CommonJS 변환을 먼저 적용하면 최적화를 깨뜨릴 수 있다. CJS `module.exports/require` module은 이 제거 대상이 아니다.

## barrel, recursion과 side effects

star export는 ESM export를 펼쳐 사용한 항목만 남길 수 있다. CJS처럼 모호한 export가 섞이면 expansion과 제거를 포기한다. unused 함수 제거 후 그 함수가 쓰던 다른 symbol도 다시 조사하며 module마다 recursion을 5회에서 중단하는 성능 한계가 있다.

package.json의 `sideEffects`는 import 실행 부작용이 필요한 파일을 표시한다. 해당 module은 제거/inlining을 제한해 실행 순서를 보호한다. 비어 있거나 comment/directive만 있는 경우는 제거될 수 있다. sideEffects:false를 실제 부작용이 있는 package에 억지로 붙이지 않는다.

`inlineRequires`는 tree shaking과 함께 production startup을 최적화할 수 있지만 단독 사용은 side effect 순서를 바꿀 수 있다. graph 전체 최적화는 transform delay와 cache 재사용 감소를 수반하므로 Atlas로 포함 결과와 실제 production runtime을 함께 검사한다.

## 출처

- [Expo Documentation, Tree shaking and code removal](https://docs.expo.dev/guides/tree-shaking)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
