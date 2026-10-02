---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Custom build YAML과 데이터 전달"]
---

# Custom build YAML과 데이터 전달

## run과 단계 간 값

run.command는 shell 명령이며 multiline block도 가능하다. 한 step에서 export한 변수는 다음 step으로 자동 전달되지 않는다. `set-env NAME value`는 후속 step에 값을 공유하지만 현재 shell에 export하지는 않는다. 현재 step에서도 필요하면 별도로 export한다.

```yaml
build:
  steps:
    - run:
        id: prepare
        outputs: [message]
        command: set-output message 'ready'
    - run:
        inputs:
          message: ${ steps.prepare.message }
        command: echo "${ inputs.message }"
```

step.id로 실행을 식별하고 `${ steps.<id>.<output> }`로 다른 단계에서 참조한다. outputs는 이름 배열 또는 name/required 객체다. 선택 출력은 required:false로 선언한다. 비밀 값을 output이나 로그에 넣어 배포 artifact로 남기지 않는다.

## 재사용 함수

functions.<name>에 command 또는 JS 모듈 path를 정의한다. inputs의 type은 string(기본), num, json이며 required, default_value, allowed_values로 계약을 지정한다. 호출값과 기본값/허용값도 타입 검증 대상이다.

```yaml
functions:
  greet:
    inputs:
      - name: target
        type: string
        default_value: app
    command: echo "Hello ${ inputs.target }"
build:
  steps:
    - greet:
        inputs:
          target: tester
```

name, working_directory, shell은 호출 시 덮어쓸 수 있다. supported_platforms는 runner OS인 darwin/linux를 받으며 기본은 양쪽이다. 함수 정의의 플랫폼은 Android/iOS UI 컴포넌트의 지원 여부와 별개다.

## import와 문법 경계

import 배열로 함수 파일을 가져올 수 있다. 가져오는 파일에는 build 절을 두지 않는다. JS 함수는 [[Expo-EAS-Custom-Functions]], built-in API는 [[Expo-EAS-Custom-Build-Steps]]를 참조한다.

공식 schema의 일반 custom build 예제는 `${ ... }`를 사용하지만 cache 예제 등 일부에는 Workflow의 `${{ ... }}` 표기가 섞여 있다. 이 문서는 두 형식을 무조건 호환으로 간주하지 않는다. 선택한 CLI/parser에서 해당 표현식을 확인하고, cache key는 확인 전 고정 문자열로 시작할 수 있다. 원문의 잘못된 들여쓰기와 run 안의 run 키 예시는 복사하지 않고 command 구조를 따른다.

## 출처

- [Expo Documentation, Custom build configuration schema](https://docs.expo.dev/custom-builds/schema)

## 관련 문서

- [[Expo-EAS-Custom-Build-Reference]]

- [[Expo]]
