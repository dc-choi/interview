---
tags: [react-native, setup]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["기존 Android 앱에 React Native 통합"]
---

# 기존 Android 앱에 React Native 통합

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 통합 경계와 디렉터리

기존 앱 전체를 교체하지 않고 한 화면이나 사용자 flow를 React Native로 구현할 수 있다. Android 통합의 최소 경계는 JavaScript 의존성, Gradle 의존성, Application 초기화, ReactActivity와 앱의 번들 공급 경로다.

기존 Android 프로젝트를 프로젝트 루트의 `android/`에 두고 루트에 package.json, index.js와 App.tsx를 둔다. 기존 Activity와 AndroidManifest 편집을 이해하고 로컬 개발 환경을 먼저 준비한다. 사용 버전의 Community Template을 비교 기준으로 삼는다.

0.87 예제는 `0.87-stable/template/package.json`을 가져와 npm/Yarn 의존성을 설치한다. 기존 package.json이 있으면 필요한 의존성을 병합하고 무조건 덮어쓰지 않는다. `node_modules/`는 Git 추적에서 제외한다.

## Gradle 설정의 세 층

| 위치 | 역할 |
|---|---|
| `settings.gradle` | `@react-native/gradle-plugin` included build, `com.facebook.react.settings`, 설정 단계 autolinking |
| 최상위 `build.gradle` | React Native Gradle Plugin classpath 등록 |
| 앱 `build.gradle` | `com.facebook.react` 적용, React/Hermes 의존성, 앱 autolinking |

```groovy
// settings.gradle의 React Native 관련 구성
pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
plugins { id("com.facebook.react.settings") }
extensions.configure(com.facebook.react.ReactSettingsExtension) { ex ->
    ex.autolinkLibrariesFromCommand()
}
includeBuild("../node_modules/@react-native/gradle-plugin")
```

기존 `include(':app')`와 Gradle module은 유지한다. Kotlin DSL이면 같은 extension의 typed configuration을 사용한다.

```groovy
// 앱 build.gradle의 관련 부분
apply plugin: "com.facebook.react"

dependencies {
    implementation("com.facebook.react:react-android")
    implementation("com.facebook.react:hermes-android")
}
react { autolinkLibrariesWithApp() }
```

RNGP를 사용하면 React/Hermes 의존성 버전을 plugin이 관리하므로 예제는 버전 번호를 직접 적지 않는다. `gradle.properties`의 예제는 `reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64`, `newArchEnabled=true`, `hermesEnabled=true`를 제시한다. 실제 지원 ABI와 템플릿의 아키텍처 설정을 대조한다.

통합 페이지에 남아 있는 Android Gradle Plugin 7.3.1 줄은 예제의 과거 기반 설정이다. 해당 숫자를 0.87 프로젝트의 권장 AGP 버전으로 복사하지 않고 Community Template과 현재 프로젝트의 Gradle 호환성을 확인한다.

## manifest와 개발 서버

기본 manifest에 `android.permission.INTERNET`를 추가한다. Metro 개발 서버가 HTTP를 사용하므로 **debug manifest에만** `android:usesCleartextTraffic="true"`를 설정한다. debug 필요 때문에 release의 cleartext 정책까지 완화하지 않는다.

ReactActivity를 manifest에 등록하고 `Theme.AppCompat.Light.NoActionBar` 등 ActionBar 없는 theme을 지정한다. 그렇지 않으면 React Native 화면 위에 네이티브 ActionBar가 추가될 수 있다.

## JavaScript 진입점과 이름 계약

`index.js`는 앱의 entrypoint다. TypeScript UI를 다른 파일에 두더라도 진입점을 유지한다.

```js
import {AppRegistry} from 'react-native';
import App from './App';

AppRegistry.registerComponent('HelloWorld', () => App);
```

`App.tsx`는 React Native root component를 export한다. `registerComponent`의 이름과 네이티브 Activity의 `getMainComponentName()` 반환값이 일치해야 한다. 이름 불일치는 UI 내용이 아니라 등록 계약의 문제다.

통합 예제의 `react-native/Libraries/NewAppScreen` deep import는 Strict TypeScript API의 public root contract와 맞지 않는다. 새 화면은 root-exported Core Components로 구성하고 과거 template 데모 UI를 그대로 복사하지 않는다.

## Application 초기화

Java에서는 `Application implements ReactApplication`, Kotlin에서는 `Application(), ReactApplication`을 구현한다. 페이지 예제는 다음 책임을 Application에 둔다.

- `DefaultReactNativeHost`에서 PackageList를 제공한다.
- JS main module은 `index`, developer support는 `BuildConfig.DEBUG`를 사용한다.
- New Architecture와 Hermes 설정을 BuildConfig 값에 연결한다.
- `DefaultReactHost`로 ReactHost를 제공한다.
- `SoLoader.init(..., OpenSourceMergedSoMapping)`과 New Architecture entrypoint를 초기화한다.

이 초기화 코드는 사용 버전의 `MainApplication` 템플릿과 대조한다. 기존 Application의 다른 SDK 초기화와 수명을 유지하면서 필요한 책임을 병합한다.

## ReactActivity 연결

```kotlin
class MyReactActivity : ReactActivity() {
    override fun getMainComponentName(): String = "HelloWorld"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
```

위 예제는 ReactActivity에서 JS root component를 호스팅하는 핵심 연결만 보여준다. 실제 파일에는 사용 버전에 맞는 import, package와 manifest 등록이 필요하다. 전체 Activity 대신 영역 단위 호스팅이 필요하면 ReactFragment로 이어간다.

## Metro와 개발 실행

루트 `metro.config.js`가 React Native 기본 설정을 사용하도록 만든다.

```js
const {getDefaultConfig} = require('@react-native/metro-config');
module.exports = getDefaultConfig(__dirname);
```

`npm start` 또는 `yarn start`로 Metro를 실행하고 기존 Android 앱을 빌드한다. ReactActivity가 개발 서버에서 bundle을 받아 화면을 표시하는지 확인한다. 실제 기기라면 USB reverse나 LAN 연결도 맞춰야 한다.

## release 번들 경로

RNGP는 release APK/AAB에 JavaScript 번들을 넣는 작업을 처리한다. Android Studio의 release build 또는 Gradle 명령을 사용한다.

```sh
cd android
./gradlew :app:assembleRelease
./gradlew :app:bundleRelease
```

Metro가 켜져 있는 debug 성공과 release 번들 성공을 구분한다. 배포 서명, ABI와 기기 검증은 기존 Android 출시 과정과 React Native release 요구를 함께 따른다.

## 출처

- [React Native, Integration With Existing Apps](https://reactnative.dev/docs/integration-with-existing-apps)

## 관련 문서

- [[RN-Local-Environment]]
- [[RN-Android-Fragment]]
- [[RN-Metro]]
- [[RN-Strict-TypeScript-API]]
- [[RN-iOS-Integration]]
