---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow 환경과 평가 시점"]
---

# Workflow 환경과 평가 시점

## 우선순위

Worker runtime의 같은 이름은 job.env, build profile.env, EAS environment 변수 순서로 우선한다. Job.env는 YAML에 평문으로 기록되므로 secret 저장 장소로 쓰지 않는다. EAS_ prefix는 worker 변수와 충돌하지 않게 사용자 변수명에서 피한다.

Job environment의 기본값은 build이면 profile 설정, submit이면 제출하는 build의 환경, maestro/maestro-cloud이면 preview, 나머지는 production이다. Fingerprint/update와 build가 같은 native config를 평가하도록 environment를 맞춘다.

## 평가 시점이 다르다

Job params/if/env/outputs의 env 표현식은 dispatch 전 EAS 변수로 평가한다. 이때 job 자체의 env와 EAS_BUILD_ID 같은 worker 변수는 아직 없다. run은 worker에서 평가되므로 job.env와 worker 변수를 함께 볼 수 있다.

```yaml
jobs:
  inspect:
    environment: preview
    env:
      LABEL: review
    steps:
      - run: echo "$LABEL $EAS_BUILD_ID"
```

최상위 on/run_name에서는 env를 쓰지 않는다. VM을 쓰지 않는 get-build/slack/doc/github-comment/branch-delete/require-approval/apple-device-registration-request/update-rollout에는 job.env를 둘 수 없다. 이미 업로드된 asc_build_id를 처리하는 TestFlight 변형도 worker를 쓰지 않으므로 VM 단계/hook을 기대하지 않는다.

## 단계 간 전달

export는 현재 shell/step에만 영향을 준다. set-env는 같은 job의 이후 step에만 전파하며 현재 shell을 바꾸지 않는다. Job 간 전달은 set-output, job.outputs, downstream env를 연결한다.

GitHub 수동 실행은 event_name=workflow_dispatch이고 다른 GitHub 필드가 비어 있을 수 있다. App Store Connect context도 해당 trigger에서만 존재한다. 조건별 존재 여부를 확인하고 입력을 기본값 없이 무조건 참조하지 않는다.

## 출처

- [Expo Documentation, Environment variables in EAS Workflows](https://docs.expo.dev/eas/workflows/environment)

## 관련 문서

- [[Expo-EAS-Workflow-Basics]]

- [[Expo]]
