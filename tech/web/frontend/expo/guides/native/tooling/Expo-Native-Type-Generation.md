---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Swift에서 TypeScript interface 생성"]
---

# Swift에서 TypeScript interface 생성

## 적용 조건

SDK56+ expo-type-information은 Swift source에서 TypeScript interface를 생성하는 tooling이다. macOS와 SourceKitten이 필요하며 Kotlin을 읽거나 양 플랫폼 API 일치를 검증하지 않는다. `brew install sourcekitten`은 환경 설정 명령의 예시다.

Swift module definition을 작성하고 `npx expo-type-information module-interface --module-path <module>`처럼 실행한다. SDK와 CLI version의 정확한 subcommand 표기는 reference를 따른다. tutorial의 짧은 --module 표기와 reference의 --module-path 표기가 다를 수 있다.

## 출력 종류

| Command | 결과 |
|---|---|
| module-interface | module types, native loader, view wrapper별 파일, index |
| short-module-interface | stable wrapper와 volatile generated file |
| inline-modules-interface | inline source별 Module.tsx와 Module.generated.ts |
| other type-information | 파싱한 FileTypeInformation JSON |
| other generate-module-types | module types text |
| other generate-view-types | view types text |
| other generate-jsx-intrinsics | JSX intrinsic declaration |
| other preprocess-file | inference용 중간 source 검사 |
| generate-mocks-for-file | source 기반 native mock |

volatile `.generated.ts`는 매번 재생성된다. stable `.tsx`는 사용자의 wrapper 변경을 유지하기 위한 파일이다. 저장된 hash와 manual edit가 충돌하면 overwrite를 멈출 수 있다. stable file을 삭제해 재생성하면 custom logic이 사라지므로 diff를 확인한다. 하나의 default view를 가정하는 wrapper는 multiple views에 맞게 조정한다.

## 공통 CLI 옵션

| 옵션 | 의미 |
|---|---|
| -i / --input-paths | source path/glob 목록 |
| -m / --module-path | module root |
| -o / --output-path | 출력 경로, 기본 console |
| -t / --type-inference | NO_INFERENCE, SIMPLE_INFERENCE, PREPROCESS_AND_INFERENCE |
| -s / --skip-unicode-character-mapping | SourceKitten byte offset와 Unicode mapping 보정 생략 |
| -w / --watcher | source 변화 감시 |
| -a / --app-json | inline command가 사용할 app config |

일반 command의 default inference는 PREPROCESS_AND_INFERENCE, inline command는 SIMPLE_INFERENCE다. 더 강한 inference는 parse 시간이 2배 이상 늘 수 있다. 모드/옵션을 앱 전체 runtime 타입 보장으로 이해하지 않는다.

## 생성 결과 검토

generated enum의 실제 wire value를 확인한다. 원문 theme tutorial은 Swift String Enumerable에 숫자 enum output을 보여주므로 raw strings와 불일치하는 결과를 그대로 사용하지 않는다. module event types가 자동 생성되지 않는 부분은 수동 보완한다. wrapper의 nullable/Promise/native view ref 계약도 native와 대조한다.

preprocessing은 return expression을 임시 identifier로 바꾸어 inference를 돕는다. 문자열/comment의 특수 형태, implicit return, 중첩 DSL class return type에서 한계가 있다. unresolved는 unknown으로 남을 수 있다. enums의 associated value는 파싱하지 않고 Records의 @Field 필드만 읽는다. Events는 View에서 읽지만 Module event parsing은 완전하지 않다.

세부 programmatic interface와 data model은 [[Expo-Native-Type-Generation-API]]에 정리했다.

## 출처

- [Expo Documentation, Tutorial: Generate module TS interface](https://docs.expo.dev/modules/type-generation-tutorial)
- [Expo Documentation, Type generation reference](https://docs.expo.dev/modules/type-generation-reference)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
