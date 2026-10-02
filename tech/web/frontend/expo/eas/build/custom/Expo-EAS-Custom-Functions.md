---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Custom build JavaScript 함수"]
---

# Custom build JavaScript 함수

## 함수 모듈 계약

Shell 단계로 부족한 재사용 로직은 JS/TS 함수 모듈로 만든다. create-eas-build-function으로 기본 구조를 만들 수 있으며 src/index.ts의 기본 export가 BuildStepContext를 받는 async 함수다. 타입과 runtime helper는 @expo/steps를 사용한다.

```ts
import { BuildStepContext } from '@expo/steps';

export default async function run(context: BuildStepContext) {
  context.logger.info('사용자 정의 검사를 시작합니다');
}
```

모듈을 self-contained JavaScript로 bundle하고 build/index.js를 업로드에 포함한다. runtime에서 별도의 dependency 설치를 기대하지 않는다. 공식 예시는 ncc build로 output을 만들며 TS 소스를 수정한 뒤 bundle을 다시 만들어야 한다.

## YAML에서 연결

```yaml
functions:
  inspect:
    path: ./inspect
build:
  steps:
    - inspect:
        id: inspection
```

path는 구성 파일을 기준으로 함수 모듈을 가리킨다. .gitignore/.easignore가 compiled output을 제외하면 runner에서 실행할 수 없다. 함수 내부에서도 필요한 파일의 존재, 입력 형식과 외부 호출 오류를 처리한다.

## 입력과 출력

YAML에 선언한 inputs는 context의 입력 계약으로 받는다. 숫자 타입의 구현 예시는 BuildStepInputValueTypeName.NUMBER와 BuildStepInput 제네릭을 사용하며 `.value`로 값을 읽는다. 출력은 BuildStepOutput의 `.set(String(value))`로 기록한다. 출력값은 문자열이므로 소비 단계에서 숫자로 쓰려면 변환/검증이 필요하다.

step.id와 `${ steps.inspection.<output> }`로 후속 단계에 전달한다. logger에는 실행에 필요한 진단만 남기고 credential, 토큰과 개인정보를 출력하지 않는다. module 작성이 단순 shell 한 단계보다 복잡하기만 하다면 run.command를 유지한다.

## 출처

- [Expo Documentation, TypeScript functions](https://docs.expo.dev/custom-builds/functions)

## 관련 문서

- [[Expo-EAS-Custom-Build-Reference]]

- [[Expo]]
