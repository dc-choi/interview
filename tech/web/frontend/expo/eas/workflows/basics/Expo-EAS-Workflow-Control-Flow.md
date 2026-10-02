---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow 의존성과 출력 계약"]
---

# Workflow 의존성과 출력 계약

## needs와 after

needs는 지정한 job이 모두 성공해야 다음 job을 실행한다. after는 성공 여부와 관계없이 완료를 기다린다. if=false인 job은 skipped이며 이를 needs로 요구한 job도 실행되지 않는다. 서로 배타적인 build/repack 분기 뒤 합류하려면 after와 실제 성공 조건을 함께 사용한다.

```yaml
jobs:
  make_value:
    outputs:
      label: ${{ steps.prepare.outputs.label }}
    steps:
      - id: prepare
        run: set-output label ready
  consume:
    needs: [make_value]
    env:
      LABEL: ${{ needs.make_value.outputs.label }}
    steps:
      - run: echo "$LABEL"
```

step output은 job.outputs로 공개해야 다른 job이 읽을 수 있다. needs로 기다렸으면 needs.<id>, after로 기다렸으면 after.<id>의 outputs/status를 참조한다. 원문 repack 예제의 after 선언과 needs 참조 혼용을 복제하지 않는다.

## Context와 표현식

`${{ ... }}`로 github, inputs, needs, after, steps, env, workflow, app, account와 App Store Connect event 값을 읽는다. workflow에는 id/name/filename/url, app에는 id/slug, account에는 id/name이 있다. metadata는 build 관련 job에서 채워지며 일반 custom job에서는 비어 있다.

fromJSON/toJSON은 문자열과 JSON 변환, contains/startsWith/endsWith는 문자열 조건, replaceAll/substring은 문자열 가공에 사용한다. hashFiles는 worker의 step에서만 사용할 수 있다. success()/failure()는 이전 실행 상태 판단이며 trigger 평가 시점에는 사용할 수 없다.

외부 PR 제목/본문과 수동 입력을 shell source에 직접 보간하면 명령으로 해석될 수 있다. job.env에 데이터로 전달하고 shell에서는 `"$VALUE"`로 읽는다. 비밀을 포함할 수 있는 전체 context를 로그에 출력하지 않는다.

## 취소와 동시 실행

concurrency.cancel_in_progress=true는 GitHub에서 시작한 같은 branch의 이전 실행을 취소한다. 현재 group은 사용자 정의 lock을 제공하지 않으며 문서의 placeholder를 임의의 배포 mutex로 해석하지 않는다. 이미 발생한 외부 side effect가 취소로 되돌아오는 것도 아니다.

## 출처

- [Expo Documentation, Syntax for EAS Workflows](https://docs.expo.dev/eas/workflows/syntax)

## 관련 문서

- [[Expo-EAS-Workflow-Basics]]

- [[Expo]]
