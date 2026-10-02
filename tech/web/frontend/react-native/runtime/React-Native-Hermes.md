---
tags: [react-native, mobile, runtime]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Hermes 실행과 bytecode"]
---

# React Native Hermes 실행과 bytecode

React Native 0.87 문서 기준이다.

Hermes는 React Native에 맞춘 JavaScript engine이며 기본으로 사용된다. 시작 시간, 메모리와 앱 크기를 개선하는 것이 목적이지만 실제 효과는 앱과 빌드 조건에 따라 측정한다.

## Bundled Hermes

React Native는 각 릴리스와 호환되는 Hermes를 함께 제공한다. 앱이 엔진 최신 버전만 독립적으로 올리는 방식과 다르다. React Native 업그레이드 때 engine과 native dependency의 조합도 함께 확인한다.

## 엔진 확인과 bytecode 확인

JavaScript에서 `global.HermesInternal`의 존재로 Hermes 실행 여부를 확인할 수 있다. 그러나 사용자 정의 번들 로딩을 쓰면 이 global이 있어도 최적화된 사전 컴파일 bytecode를 사용하지 않을 수 있다.

따라서 엔진 선택 확인, `.hbc` bytecode 사용 확인과 성능 비교를 분리한다. runtime engine을 확인했다는 이유로 앱 시작 최적화가 완료됐다고 판단하지 않는다.

## Release 비교

프로젝트 script가 Community CLI에 연결되어 있다는 전제의 예시다.

```sh
npm run android -- --mode="release"
npm run ios -- --mode="Release"
```

release 빌드 과정에서 JavaScript를 Hermes bytecode로 컴파일한다. cold start, memory와 app size를 같은 device와 build 조건에서 비교한다. 개발 번들의 측정값을 release 결과로 대체하지 않는다.

## JavaScriptCore로 전환

JSC 사용은 community repository의 현재 통합 절차를 따른다. 엔진만 바꿔도 profiler, native dependency와 engine-specific 동작에 영향이 있을 수 있다. 오래된 `hermesEnabled` 변경 예제만으로 현재 앱의 전체 전환 절차가 끝난다고 가정하지 않는다.

RAM bundle은 Hermes bytecode와 호환되지 않는다. non-Hermes의 로딩 기법을 Hermes release 설정에 그대로 추가하지 않는다.

## 이해 확인

- `HermesInternal`이 존재하는데도 bytecode 최적화 여부가 미확인일 수 있는 이유는 무엇인가?
- React Native와 별개로 engine만 바꾸기 전에 어떤 호환 조건을 확인해야 하는가?
- 시작 시간 개선을 주장하려면 어떤 build와 기기에서 비교해야 하는가?

## 출처

- [React Native, Using Hermes](https://reactnative.dev/docs/hermes)

## 관련 문서

- [[React-Native-JavaScript-Runtime]]
- [[React-Native-JavaScript-Loading]]
- [[React-Native-Release-Debugging]]
