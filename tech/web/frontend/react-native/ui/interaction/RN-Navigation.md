---
tags: [react-native, mobile, interaction]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native 화면 이동과 navigator

React Native 0.87 Navigation 가이드 기준. navigator는 여러 화면의 표시, 화면 전환과 header, tab bar 같은 탐색 UI를 관리한다. React Native 코어 화면 컴포넌트와 별도로 사용하는 라이브러리다.

## 라이브러리 선택

| 선택지 | 가이드가 설명하는 용도 |
|---|---|
| React Navigation | 시작하기 쉬운 stack, tab 패턴, Android와 iOS |
| react-native-navigation | 기존 네이티브 탐색에 RN을 통합하거나 다른 네이티브 탐색 대안 |

React Navigation은 커뮤니티의 독립 라이브러리다. 코어 컴포넌트만 import하면 navigator가 자동으로 구성되는 것은 아니다. 이미 네이티브 앱에 탐색 구조가 있으면 새 JS 탐색 계층을 추가하기 전 기존 소유권을 확인한다.

## 새 프로젝트와 설치

새 Expo 프로젝트를 React Navigation 템플릿으로 시작할 수 있다.

```sh
npx create-expo-app@latest --template react-navigation/template
```

기존 프로젝트에서는 가이드의 native stack 설치를 따른다.

```sh
npm install @react-navigation/native @react-navigation/native-stack
```

peer dependency는 프로젝트 형태에 맞춰 설치한다.

```sh
# Expo 프로젝트
npx expo install react-native-screens react-native-safe-area-context

# bare React Native 프로젝트
npm install react-native-screens react-native-safe-area-context
```

bare iOS에서는 CocoaPods가 준비돼 있어야 하고 `ios/`에서 `pod install`을 실행한 뒤 앱을 다시 빌드한다. Expo와 bare 설치 명령을 모두 실행해야 한다는 뜻이 아니다. `latest`와 외부 패키지의 버전은 설치 시점과 프로젝트 호환성을 별도로 확인한다.

## static navigator 구성 예제

아래는 가이드의 static configuration을 JS로 재구성한 예다. 화면 이름, 컴포넌트, 화면별 options를 navigator에 등록하고 실제 Navigation을 렌더한다.

```jsx
import {Button, Text} from 'react-native';
import {createStaticNavigation, useNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

const HomeScreen = () => {
  const navigation = useNavigation();
  return <Button title="프로필 보기"
    onPress={() => navigation.navigate('Profile', {name: '사용자'})} />;
};

const ProfileScreen = ({route}) => (
  <Text>{route.params.name}의 프로필</Text>
);

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {screen: HomeScreen, options: {title: '홈'}},
    Profile: {screen: ProfileScreen},
  },
});
const Navigation = createStaticNavigation(RootStack);

export default () => <Navigation />;
```

- `screens`의 key가 route 이름이다.
- `screen`은 React 컴포넌트 또는 다른 navigator다.
- `options`로 header title 등을 설정한다.
- 화면 안에서 `useNavigation`으로 navigation 객체를 얻는다.
- `navigate('Profile', params)`로 전달한 값은 목적지 `route.params`에서 읽는다.

예제는 등록된 경로와 정상 params를 전제로 한다. 외부 링크에서 들어온 값 검증과 TypeScript route typing까지 이 짧은 예제가 해결하지는 않는다.

## native stack과 다른 탐색 패턴

`createNativeStackNavigator`는 iOS의 UINavigationController, Android의 Fragment를 사용한다. 해당 네이티브 API 기반 전환과 유사한 동작과 성능 특성을 얻도록 하는 선택이다. JS 화면에 들어 있는 모든 작업의 성능까지 보장하는 것은 아니다.

React Navigation에는 tabs, drawer용 패키지도 있다. stack 안에 tab을 넣는 등의 구체적인 중첩 구조, 뒤로 가기와 deep link 설정은 React Navigation의 해당 reference를 이어서 확인한다.

## 확인할 점

등록한 화면 이름과 navigate 이름, 화면별 params, header, iOS pod 설치, Android와 iOS의 뒤로 가기 흐름을 확인한다. 이 문서의 설치 명령과 예제는 실행하지 않았다. 인증 redirect와 deep link는 [[RN-Security-Authentication|인증 보안]]의 별도 경계다.

## 출처

- [React Native 0.87, Navigating Between Screens](https://reactnative.dev/docs/navigation)

## 관련 문서

- [[RN-Touches|탐색을 시작하는 버튼]]
- [[RN-Security-Authentication|deep link와 인증 redirect]]
