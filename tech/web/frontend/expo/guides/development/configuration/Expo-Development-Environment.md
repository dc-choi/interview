---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 환경 변수 인라인과 노출 경계"]
---

# Expo 환경 변수 인라인과 노출 경계

## EXPO_PUBLIC 인라인

Expo CLI는 표준 `.env` 해석 순서로 변수를 process에 로드하고 앱 코드의 `EXPO_PUBLIC_` 참조를 번들 생성 때 literal 값으로 치환한다. 런타임 서버의 secret 조회가 아니다.

```dotenv
EXPO_PUBLIC_API_URL=https://api.example.com
```

```ts
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
```

`process.env.EXPO_PUBLIC_KEY`처럼 정적인 dot notation만 인라인한다. bracket notation `process.env['EXPO_PUBLIC_KEY']`, 구조 분해와 동적 key 접근은 지원하지 않는다. `node_modules` 안의 코드는 이 치환 대상이 아니다.

변수 수정에 CLI 재시작이나 cache clear가 보통 필요하지 않지만 앱을 full reload해야 새 값이 보인다. 모든 `EXPO_PUBLIC_` 값은 사용자에게 보이는 plain text다. private key, backend credential과 비밀 token을 넣지 않는다.

## 파일과 환경 선택

`.env`, `.env.local` 등 표준 파일을 사용하고 머신별 `.env*.local`은 Git에서 제외한다. `.env.staging` 같은 비표준 이름을 자동 읽는다고 가정하지 않는다.

`NODE_ENV`를 staging/test 선택자로 재사용하지 않는다. `expo export`는 production으로 고정하며 이를 호출하는 `eas update`도 영향을 받는다. package manager도 NODE_ENV를 해석해 devDependencies 설치를 바꾸므로 환경 선택과 build mode를 혼용하면 결과가 달라진다. EAS에서는 `eas env:pull`로 선택 환경의 `.env.local`을 가져올 수 있다.

## 두 기능을 독립적으로 끄기

| 설정 | 중단하는 기능 |
| --- | --- |
| `EXPO_NO_DOTENV=1` | CLI가 .env를 process에 자동 로딩 |
| `EXPO_NO_CLIENT_ENV_VARS=1` | Metro의 client JS 인라인 직렬화 |

문제 조사 때 두 단계를 구분한다. 로딩을 꺼도 외부 shell에서 이미 제공한 변수가 사라지는 것은 아니다.

## Build와 Update 환경

EAS Build는 빌드 작업에 업로드한 `.env`와 build profile/EAS 환경을 이용해 내장 JS 번들을 만든다. SDK 55 이상 EAS Update는 --environment가 필수이며 지정한 EAS environment의 plaintext/sensitive 값을 사용하고 로컬 .env는 사용하지 않는다. Secret은 export에서 읽을 수 없다. SDK 54 이하에서만 --environment 생략 시 로컬 .env fallback을 사용한다. 같은 앱이라도 서로 다른 작업의 변수 값이 다르면 binary 내 번들과 OTA 번들의 endpoint가 달라질 수 있다.

## 기존 방식에서 이전

- `react-native-config`의 앱 JS 변수는 이름에 `EXPO_PUBLIC_`를 붙이고 import 대신 `process.env` 정적 참조를 사용한다. native 용도로 쓰는 값은 별도로 유지할지 결정한다.
- Babel inline environment plugin은 변수를 옮긴 뒤 제거하고 `npx expo start --clear`로 Babel cache를 비운다.
- `direnv`의 JS용 변수는 표준 .env로 옮겨 `Constants.expoConfig.extra` 경유 대신 직접 참조한다. shell의 다른 용도는 direnv에 남길 수 있다.

환경 변수에 저장했다는 사실은 secret 보호가 아니다. 공개 config의 `extra`로 전달하는 경로도 같은 노출 문제를 가진다.

## 출처

- [Expo Documentation, Environment variables in Expo](https://docs.expo.dev/guides/environment-variables)

- [Expo Documentation, Using environment variables](https://docs.expo.dev/eas/environment-variables/usage)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
