---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo local build cache provider 계약"]
---

# Expo local build cache provider 계약

## fingerprint로 바이너리 재사용

`expo run:android/ios`는 프로젝트 fingerprint와 일치하는 remote build를 찾으면 다운로드/실행해 compile을 생략한다. 없으면 정상 compile 후 산출물을 upload한다. JS 변경과 native binary 재사용을 구분하는 기능이며 EAS Build의 compile cache 설정과 다르다.

```sh
npx expo install eas-build-cache-provider --dev
```

```json
{ "expo": { "buildCacheProvider": "eas" } }
```

Windows에서는 CLI 인자 전달을 위해 `expo install eas-build-cache-provider "--" --dev` 형태를 사용한다.

## custom provider API

| method | 입력의 주요 필드 | 반환 |
| --- | --- | --- |
| `resolveBuildCache` | projectRoot, platform, runOptions, fingerprintHash | binary URL 또는 null |
| `uploadBuildCache` | 위 필드와 buildPath | uploaded URL 또는 실패 null |
| `calculateFingerprintHash`(optional) | projectRoot, platform, runOptions | hash 또는 null |

각 method는 Promise를 반환하며 config `options`가 두 번째 인자로 전달된다. platform은 android/ios다. plugin은 `@expo/config`의 `BuildCacheProviderPlugin` 타입을 사용한다.

provider TypeScript를 별도 `provider/src/`에서 build하고 root의 `provider.plugin.js`가 compiled export를 require하도록 연결할 수 있다. app config는 `buildCacheProvider: { plugin: './provider.plugin.js', options: {...} }`로 지정한다. options가 client 공개 설정에 노출되는지 확인하고 비밀 credential을 단순 inline 옵션으로 저장하지 않는다.

## 재사용 제한

- provider는 local `run:*`만 호출한다. `eas build`는 이 plugin을 호출하지 않는다.
- iOS 실기기 build는 provisioning profile의 device 범위가 있어 조회/upload 모두 생략한다. Simulator build만 cache에 참여한다.
- `appVersionSource:"remote"`의 buildNumber/versionCode는 source fingerprint 입력에 없다. cached binary는 최초 생성 때 번호를 유지하며 local run은 그 번호를 자동 증가시키지 않는다.

cache hit만 검사하지 말고 miss compile, upload 실패와 stale/invalid URL도 점검한다. 사용자 정의 hash는 실제 native 변화가 충돌 없이 구분돼야 한다.

## 출처

- [Expo Documentation, Use build cache providers](https://docs.expo.dev/guides/cache-builds-remotely)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
