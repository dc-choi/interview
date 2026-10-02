---
tags: [expo, react-native, cicd]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Workflow 파일과 job dependency"]
---

# EAS Workflow 파일과 job dependency

## YAML과 실행 경로

EAS Workflows는 Expo-hosted CI/CD로 native build, OTA update, store submit, Maestro test, web deploy를 YAML graph로 연결한다. `.eas/workflows/`가 workflow file 위치다. tutorial은 CNG project를 전제로 native android/ios를 commit하지 않고 build 때 generate한다. Expo/EAS project, GitHub App repository 연결, Build/Update 설정이 필요하고 store 자동 제출에는 별도 credentials가 필요하다.

```yaml
name: Hello
on:
  push:
    branches: ['main']
jobs:
  greet:
    steps:
      - id: set_greeting
        run: set-output greeting "Hello from EAS Workflows"
    outputs:
      greeting: ${{ steps.set_greeting.outputs.greeting }}
  show_info:
    needs: [greet]
    type: doc
    params:
      md: ${{ needs.greet.outputs.greeting }}
```

custom job은 steps/run을 사용하고 pre-packaged job은 type/params로 build/submit/update/doc 등을 실행한다. job ID는 graph와 expression에서 참조하는 key이고 name은 dashboard 표시다. `set-output`은 step output을 생성하며 job outputs를 통해 downstream에 노출한다.

jobs는 dependency가 없으면 parallel이고 steps는 job 안에서 sequential이다. needs는 listed jobs가 성공한 뒤 실행하며 dependency failure는 dependent skip으로 이어진다. after는 outcome와 관계없이 completion을 기다리는 notification 같은 용도다. 둘의 output/status context도 needs와 after로 구분한다.

```sh
eas workflow:run .eas/workflows/hello.yml
```

manual run은 CLI가 workflow를 upload하고 dashboard URL을 제공한다. dashboard logs, graph, trigger, commit/ref와 preserved Workflow file을 확인해 의도한 revision이 실행됐는지 판단한다. local echo test는 cloud source checkout와 실제 app build를 검증하지 않는다.

## Triggers와 외부 CI

on.push.branches는 selected branch push, pull_request는 대상 branch PR 생성/update, push.tags는 pushed tag pattern, pull_request_labeled는 label event다. cron/manual도 지원한다. 자동 trigger는 repository 연결과 default branch의 workflow file을 필요로 한다. file을 feature branch에만 추가하면 기대한 PR event에 적용되지 않을 수 있다.

GitHub Actions와 syntax 일부가 비슷하지만 runs-on/runner setup 없이 packaged job을 호출하는 계약은 EAS 전용이다. 두 시스템을 함께 쓰거나 Actions에서 eas workflow:run을 호출할 수도 있다. 연습용 workflow는 trigger를 제거하거나 삭제해 매 push마다 불필요하게 실행되지 않게 한다.

## 출처

- [Expo Documentation, CI/CD Tutorial: Introduction](https://docs.expo.dev/tutorial/cicd/introduction)
- [Expo Documentation, Run your first EAS Workflows job](https://docs.expo.dev/tutorial/cicd/first-workflow)

## 관련 문서

- [[Expo-Learn-EAS-Setup]]
- [[Expo-Learn-CICD-Fingerprint]]
