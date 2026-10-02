---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Fingerprint native compatibility hash와 source diff"]
---

# Fingerprint native compatibility hash와 source diff

## 무엇을 hash 하는가

`@expo/fingerprint`는 Node에서 dependency, custom native code, native project file과 config를 hash 해 JS/native compatibility 판단을 돕는다. expo와 expo-updates에 포함되며 transitive 사용은 `expo/fingerprint` import가 가능하다. hash 일치만으로 실제 모든 native behavior가 같음을 증명하지 않는다. 특히 제외 설정과 raw config plugin 한계를 확인한다.

```ts
import * as Fingerprint from '@expo/fingerprint';
const baseline = await Fingerprint.createFingerprintAsync(projectRoot, { debug: true });
const hash = await Fingerprint.createProjectHashAsync(projectRoot);
const diff = await Fingerprint.diffFingerprintChangesAsync(baseline, projectRoot);
```

Fingerprint는 final hash와 sources 목록이다. source는 file/dir(filePath) 또는 contents(id,contents)이고 reasons/hash/debugInfo를 가진다. 제외 source의 hash는 null 일 수 있다. diff는 addedSource,removedSource 또는 beforeSource/afterSource를 가진 added/removed/changed union이다. diffFingerprints(a,b)는 source가 sorted 되어 있다고 가정한다.

## ignore와 skip

`.fingerprintignore`는 root 기준 minimatch이며 gitignore와 완전히 같지 않다. `build`는 android/build를 부분 matching 하지 않으므로 `**/build` 등을 쓴다. ignorePaths는 default ignore와 합쳐지고 `!` prefix로 default를 override 할 수 있다. ios 전체를 제외해도 !ios/Podfile, !ios/Podfile.lock 으로 다시 포함할 수 있다. native 변경을 무작정 제외하면 compatibility 구분을 잃는다.

fingerprint.config.js의 sourceSkips는 enum bitmask 또는 key 배열이다. Versions1,RuntimeVersionIfString2,Names4,AndroidPackage8,IosBundleIdentifier16,Schemes32,EASProject64,Assets128,ExpoConfigAll256,AndroidAndIosScriptsIfNotContainRun512,ScriptsAll1024,GitIgnore2048,ExtraSection4096가 선택 범위다. ExpoConfigAll은 plugin/icon 등 중요한 native 변경을 숨기므로 신중히 쓴다. DEFAULT_IGNORE_PATHS/DEFAULT_SOURCE_SKIPS는 package 기본값을 제공한다.

## options와 transform

platforms 기본 android/ios,hashAlgorithm 기본 sha1,concurrentIoLimit 기본 CPU core 수,debug,silent,extraSources,ignorePaths,sourceSkips를 지정한다. dirExcludes는 deprecated 다. useRNCoreAutolinkingFromExpo는 SDK52이 상 기본 true, enableReactImportsPatcher는 SDK51이 하에서 기본 true 였던 안정화 옵션이다.

`fileHookTransform(source,chunk,isEndOfFile,encoding)`는 Buffer/string/null을 반환해 hash 전 내용을 바꾼다. contents source는 한 chunk이며 file은 여러 chunk 일 수 있다. 파일 전체를 바꿔야 하면 chunk를 모아 끝에서 반환하고 중간에는 null을 반환한다. 민감 config 제거와 dynamic 값 안정화는 가능하지만 의미 있는 native 변경을 지우지 않도록 범위를 정한다. 큰 파일 buffering은 memory 비용이 있다.

## raw function 한계

inline raw config plugin은 구현 전체를 serialize 하지 못한다. named function은 Function.name, anonymous function은 withAnonymous로 fingerprint에 표현되므로 **같은 이름의 구현 변경이 hash를 바꾸지 않을 수 있다**. 단순히 function에 이름을 붙이는 것으로 구현 hash가 보장되지 않는다. plugin을 별도 local module로 두고 포함 source가 어떻게 추적되는지 diff로 확인한다. 원문의 local plugin app.json 예제는 plugins string처럼 표현돼 있으나 실제 plugin 배열 형식을 사용한다. CLI `npx @expo/fingerprint --help`에서 지원 command를 확인할 수 있으며 config와 API로 계산 결과의 근거를 조사한다.

## 출처

- [Expo Documentation, Expo Fingerprint](https://docs.expo.dev/versions/latest/sdk/fingerprint)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
