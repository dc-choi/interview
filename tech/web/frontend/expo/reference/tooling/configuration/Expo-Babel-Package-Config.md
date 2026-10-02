---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Babel과 package.json 설정"]
---

# Expo Babel과 package.json 설정

## Babel 설정

Expo 프로젝트는 `babel-preset-expo`를 기본으로 사용한다. 이 preset은 React Native 기본 preset을 확장해 decorator, 웹 라이브러리 tree shaking과 아이콘 폰트 로딩 등을 지원한다. 커스텀 설정이 없다면 Babel 파일을 별도로 만들 필요가 없다.

```sh
npx expo customize babel.config.js
```

생성한 설정은 `presets: ['babel-preset-expo']`를 유지한 채 필요한 부분만 확장한다. 변경 뒤 `npx expo start --clear`로 Metro를 다시 시작해 변환 캐시까지 비운다. Babel은 코드 변환, Metro는 모듈 해석과 번들링을 맡으므로 resolver 오류를 Babel 옵션만으로 해결하려 하지 않는다.

## package.json의 Expo 설정

package.json의 `expo` 필드는 Expo 도구의 동작을 설정한다. app.json의 앱 설정 객체와 용도가 다르다.

| 설정 | 기능과 주의점 |
| --- | --- |
| `expo.install.exclude` | start, doctor, install의 권장 버전 검사에서 패키지를 제외한다. 설치나 네이티브 linking을 막는 옵션이 아니다 |
| `expo.autolinking` | native module 검색/해석 설정이다. `nativeModulesDir`로 로컬 모듈 경로를 지정할 수 있다 |
| `expo.doctor.reactNativeDirectoryCheck.enabled` | React Native Directory 기반 패키지 검사를 켜거나 끈다. 기본 true |
| `reactNativeDirectoryCheck.exclude` | 특정 패키지를 해당 검사에서 제외한다 |
| `reactNativeDirectoryCheck.listUnknownPackages` | Directory에 없는 패키지를 표시한다. 기본 true |
| `expo.doctor.appConfigFieldsNotSyncedCheck.enabled` | native 디렉터리와 app config 비동기화 경고를 제어한다 |

```json
{
  "expo": {
    "autolinking": { "nativeModulesDir": "./modules" },
    "doctor": {
      "reactNativeDirectoryCheck": {
        "enabled": true,
        "listUnknownPackages": true
      }
    }
  }
}
```

추적되고 업로드되는 android/ios 디렉터리가 있으면 EAS Build가 app config를 native project에 자동 동기화하지 않는다. Doctor 경고를 끄는 것은 native project를 갱신하는 작업과 다르다. 권장 버전에서 벗어나는 라이브러리도 동작 검증 뒤 필요한 범위만 제외한다.

## 출처

- [Expo Documentation, babel.config.js](https://docs.expo.dev/versions/latest/config/babel)
- [Expo Documentation, package.json](https://docs.expo.dev/versions/latest/config/package-json)

## 관련 문서

- [[Expo-Configuration-Reference]]

- [[Expo]]
