---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Metro의 universal bundling 설계"]
---

# Expo Metro의 universal bundling 설계

## target와 환경을 공유하는 build tool

Metro는 React Native/Expo의 중심 bundler다. Android/iOS/web과 server/client/DOM graph가 resource와 transform 작업을 공유할 수 있어 platform마다 별도 bundler를 유지하는 비용을 줄인다. 개발에서는 요청한 target만 처리하고 delta bundling/transform cache로 바뀐 부분을 반복 처리한다.

Fast Refresh, Hermes bytecode, React Native DevTools와 React Compiler integration이 같은 생태계에 연결된다. Expo는 Router routing, async chunks, CSS, tree shaking, DOM components와 API routes를 그 위에 확장한다. 기능별 stable/experimental 상태는 각각의 reference를 확인한다.

## 처리별 기술

| 처리 | 구현 선택 |
| --- | --- |
| core bundler | JS/Flow |
| file crawl/watch | JS, optional Watchman |
| JS AST parse | Hermes parser/WebAssembly |
| transform | Babel |
| native 최종 처리 | Hermes 관련 pipeline |
| web JS minify | Terser, optional esbuild |
| CSS parse/minify | LightningCSS/Rust |

AST transform은 여러 worker/thread로 병렬 처리하고 cached artifact를 remote builder/머신 사이에서 재사용할 수 있다. 실제 속도는 graph와 cache hit, hardware/config에 달려 있으므로 특정 도구보다 언제나 빠르다고 단정하지 않는다.

## browser ESM과 다른 조건

개발 browser ESM은 서버 bundling을 줄일 수 있지만 많은 module의 network request/waterfall이 생길 수 있다. Metro는 개발에도 bundle해 React Native의 큰 module graph와 production 방식에 가깝게 동작한다. web 전용 도구와 비교할 때 native bytecode, embedded asset, server graph와 universal code 요구를 함께 고려한다.

Metro는 native binary에 JS와 OS asset을 embed할 수 있다. DOM component도 parent config에서 별도 web graph를 요청 시 생성한다. Static Hermes의 typed native-code compile과 universal RSC 등 미래/preview 기능은 현재 앱에서 확인한 안정 기능과 구분한다.

## 출처

- [Expo Documentation, Why Metro?](https://docs.expo.dev/guides/why-metro)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
