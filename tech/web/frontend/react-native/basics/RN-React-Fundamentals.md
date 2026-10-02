---
tags: [react-native, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native에서 사용하는 React 기초"]
---

# React Native에서 사용하는 React 기초

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 컴포넌트와 JSX

함수 컴포넌트는 props를 받아 React element를 반환한다. 반환한 element가 화면에 무엇을 표시할지 선언하고, React Native renderer가 플랫폼 UI로 반영한다. 다른 파일에서 사용하려면 일반 JavaScript 모듈 규칙으로 export/import한다. Snack 예제의 `export default`는 실행 도구와 잘 맞는 관례이며 모든 프로젝트의 유일한 export 방식은 아니다.

JSX는 JavaScript 안에서 element를 표현하는 문법이다. 중괄호 안에는 변수뿐 아니라 함수 호출 등 JavaScript 표현식을 넣을 수 있다. 문자열이 아닌 숫자, 배열과 객체도 props에 중괄호로 전달한다.

```tsx
import {Image, Text, View} from 'react-native';

interface CardProps {
  readonly name: string;
}

const Card = ({name}: CardProps) => (
  <View>
    <Text>안녕하세요, {name}입니다.</Text>
    <Image
      source={{uri: 'https://reactnative.dev/img/tiny_logo.png'}}
      style={{width: 64, height: 64}}
    />
  </View>
);
```

`style={{width: 64}}`의 바깥 중괄호는 JSX 표현식이고 안쪽 중괄호는 객체 리터럴이다. TypeScript 예제는 props의 타입을 명시하고, JavaScript에서는 같은 JSX에 타입 선언을 생략한다.

## 조합과 props

`View`, `Text`, `TextInput` 같은 Core Components를 중첩해 사용자 컴포넌트를 만든다. 부모가 여러 자식 인스턴스를 렌더링하면 같은 함수 코드를 재사용하면서 각 인스턴스에 다른 props를 전달할 수 있다.

props는 컴포넌트를 호출할 때 주는 설정값이다. 이름, 이미지 주소, 표시 옵션처럼 부모가 정하는 입력을 전달한다. Android의 LinearLayout 같은 배치 컨테이너 경험은 참고할 수 있지만 React Native `View`의 자식 배치는 Flexbox를 기준으로 이해한다.

형제 JSX element는 하나의 바깥 element로 묶는다. 추가 컨테이너 뷰가 필요 없으면 `<>...</>` Fragment로 묶어 불필요한 `View`를 만들지 않는다.

## state와 이벤트

시간이 지나거나 사용자 동작으로 변하는 값은 state로 관리한다. `useState(initialValue)`는 현재 값과 setter를 돌려주며, setter 호출 후 다음 렌더에서 새 값이 보인다. `const` 변수를 직접 재할당하는 방식이 아니다.

```tsx
import {useState} from 'react';
import {Button, Text, View} from 'react-native';

const Meal = () => {
  const [isHungry, setIsHungry] = useState(true);
  return (
    <View>
      <Text>{isHungry ? '식사 전' : '식사 완료'}</Text>
      <Button
        title={isHungry ? '식사하기' : '완료'}
        disabled={!isHungry}
        onPress={() => setIsHungry(false)}
      />
    </View>
  );
};
```

각 `Meal` 인스턴스는 자신의 state를 가진다. 버튼의 `onPress`가 setter를 호출하면 텍스트, title과 disabled가 같은 state에서 계산된다. state는 문자열, 숫자, boolean, 배열과 객체 등 다양한 값을 보관할 수 있다.

React 기초를 React Native 전용 규칙으로 복제할 필요는 없다. 렌더링의 순수성, state snapshot, Hook 호출 규칙과 효과의 수명은 기존 React 문서를 이어서 본다. React Native에서 달라지는 중심은 DOM 대신 어떤 플랫폼 컴포넌트를 렌더링하는가다.

## 출처

- [React Native, Intro React](https://reactnative.dev/docs/intro-react)

## 관련 문서

- [[React-Components-and-JSX]]
- [[React-Core-Mental-Model]]
- [[React-State-Updates]]
- [[RN-Core-Components]]
