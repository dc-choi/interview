---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Atlas bundle graph와 Lighthouse 분석"]
---

# Expo Atlas bundle graph와 Lighthouse 분석

## 분석 대상 분리

JS download/parse가 중요한 web과 bytecode를 사용하는 native의 startup 비용은 다르다. package별 byte size만으로 전체 사용자 성능을 설명하지 않는다. production bundle graph와 실제 hosted page 측정을 연결한다.

```sh
EXPO_ATLAS=true npx expo start --no-dev
EXPO_ATLAS=true npx expo export --platform web
npx expo-atlas .expo/atlas.jsonl
```

개발 서버는 Shift+M의 dev tools plugin menu에서 Atlas를 연다. 기본 dev mode는 production optimization이 없으므로 production 비교에는 `--no-dev` 또는 export를 사용한다. platform을 지정하면 그 target만 수집한다.

## graph를 읽는 방법

큰 node에서 transformed module을 열어 Babel 변환, imports와 reverse importers를 확인한다. package가 포함된 원인을 역추적하고 unused barrel export, platform 분기와 중복 package를 조사한다. dependency 이름이 큰 것으로 보인다고 무조건 삭제하지 않고 실제 route 사용과 대체 비용을 확인한다.

export가 생성한 `.expo/atlas.jsonl`은 원본/변환 source와 인라인 EXPO_PUBLIC 값을 포함한다. 프로젝트를 모르는 사람도 열 수 있으므로 공개 성능 report와 같은 데이터로 취급하지 않는다.

## source-map-explorer의 역사적 대안

SDK50 이전은 `expo export --source-maps` 산출물을 source-map-explorer로 분석할 수 있다. Hermes native의 JS 분석에는 `--no-bytecode`를 사용한다. web server output은 client 디렉터리와 server 디렉터리가 분리되므로 경로를 맞춘다.

source map에는 소스가 들어갈 수 있어 production 공개 배포와 내부 분석을 구분한다. runtime wrapper 일부가 source map에 없어 unmapped bytes 경고가 생길 수 있다. 과거 Node18/wasm 초기화 workaround를 현재 SDK57/Node 환경의 기본 조치로 적용하지 않는다.

## Lighthouse

production web export를 serve 또는 실제 host에서 제공한 뒤 URL로 Lighthouse를 실행한다. performance, accessibility와 관련 audit를 browser/CLI에서 확인한다. development server의 debug code와 production host의 HTTP/cache/TLS를 섞어 비교하지 않는다. Atlas는 code의 포함 원인, Lighthouse는 페이지 경험의 문제를 찾는 도구다.

## 출처

- [Expo Documentation, Analyzing JavaScript bundles with Expo Atlas and Lighthouse](https://docs.expo.dev/guides/analyzing-bundles)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
