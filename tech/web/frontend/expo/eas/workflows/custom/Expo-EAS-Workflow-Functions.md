---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow 사용자 함수의 입력과 범위"]
---

# Workflow 사용자 함수의 입력과 범위

## function.yml

재사용할 step 묶음을 function.yml 또는 function.yaml에 저장한다. 호출 uses는 `./` 또는 `../`로 시작하는 정적 directory 경로이며 repository 밖으로 나갈 수 없다. 모든 중첩 경로는 호출 파일이 아니라 EAS project root 기준이다.

```yaml
name: Prepare label
inputs:
  - name: label
    type: string
    default_value: preview
outputs:
  label:
    value: ${{ steps.prepare.outputs.label }}
runs:
  steps:
    - id: prepare
      env:
        LABEL: ${{ inputs.label }}
      run: set-output label "$LABEL"
```

이 파일을 .eas/functions/label/function.yml에 두었다면 job에서 `uses: ./.eas/functions/label`로 호출하고 with.label로 값을 준다. 출력은 `${{ steps.<call_id>.outputs.label }}`로 읽는다.

## Schema와 scope

최상위 키는 name/description/inputs/outputs/runs다. inputs의 string/boolean/number/json, default_value/allowed_values/required를 선언하며 기본은 optional string이다. runs.steps는 최소 하나가 필요하고 outputs는 value 표현식과 선택 description을 둔다. 모든 출력은 문자열이다.

함수 내부 steps는 자기 step만 참조하고 caller는 내부 step ID에 접근하지 못한다. Call의 with/env/if는 caller scope에서 평가한다. call.env는 내부 step으로 상속하고 중첩한 내부 값이 같은 이름을 덮어쓴다. Call.if는 함수 전체를 제어한다.

Call에 working_directory를 두지 않고 내부 step에 둔다. 상대 working_directory도 function.yml 위치가 아니라 job 기본 위치에서 해석한다. uses 경로에 표현식이나 backslash를 사용할 수 없다.

## 중첩과 사용 장소

Custom/build job steps와 job/default hooks에서 호출할 수 있다. 최대 10단계 중첩이며 직접/간접 재귀는 금지한다. 현재 custom function 안에서 eas/build 또는 eas/maestro_test를 호출할 수 없다. 전체 job/workflow 재사용이나 matrix를 제공하는 기능과는 다르다.

## 출처

- [Expo Documentation, Custom functions in EAS Workflows](https://docs.expo.dev/eas/workflows/custom-functions)
- [Expo Documentation, Syntax for EAS Workflows](https://docs.expo.dev/eas/workflows/syntax)

## 관련 문서

- [[Expo-EAS-Workflow-Custom]]

- [[Expo]]
