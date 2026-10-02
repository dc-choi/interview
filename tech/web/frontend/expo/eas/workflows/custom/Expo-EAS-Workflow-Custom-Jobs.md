---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Workflow custom job과 runner"]
---

# Workflow custom job과 runner

## 단계 구성

Custom job은 type 없이 steps를 둔다. 일반 shell은 run, 내장/사용자 함수는 uses를 사용한다. step에 id/name/shell/working_directory/if/env를 지정할 수 있으며 기본 shell은 bash다. steps를 직접 제공할 수 있는 job은 custom과 build다.

```yaml
jobs:
  check:
    environment: preview
    steps:
      - uses: eas/checkout
      - uses: eas/install_node_modules
      - name: Check types
        run: npm run typecheck
```

명령은 프로젝트에 실제 존재하는 script로 바꾼다. Private package가 있으면 install 전에 eas/use_npm_token을 추가한다. checkout은 기본 recorded commit을 사용하며 ref override는 첫 checkout에서만 가능하다. Git 원격에 도달 가능한 ref를 depth 1로 가져오므로 local/tarball source에서는 사용할 수 없다.

## Runner와 도구

image는 OS/toolchain snapshot이고 runs_on은 자원과 실행 플랫폼이다. Android Emulator는 linux-*-nested-virtualization, iOS build/Simulator는 macos-*가 필요하다. 보통 Linux custom job 기본은 linux-medium이다.

Linux medium/large는 각각 4/8 vCPU와 16/32 GiB RAM, macOS medium/large는 5/10 efficiency cores와 20/40 GiB unified memory로 문서화되어 있다. nested-virtualization의 자원은 별도 표를 확인한다. Build 인프라와 Workflow 표의 disk 수치가 다르므로 서로 복사하지 않는다.

Workflow defaults.image/tools로 node/package manager/NDK/Ruby 도구를 고정하고 job별로 필요한 override를 둔다. defaults.run.working_directory보다 job 기본, step의 working_directory가 더 구체적이다. 상대 경로는 앱/job 기준으로 해석한다.

## Hook

Build/deploy/fingerprint/maestro/maestro-cloud/repack/submit/testflight/update는 job별 hook을 제공한다. 지원하지 않는 이름을 임의로 추가하지 않는다. defaults.hooks의 같은 key를 job hook이 덮어쓰며 빈 배열은 그 기본 hook을 끈다.

Build의 install 전후, update의 before_update/after_update, submit의 before_submit/after_submit, Maestro의 테스트 전후 같은 적절한 시점을 선택한다. Source map 같은 worker 파일은 같은 job의 after hook에서 처리하거나 명시적으로 artifact로 전달한다.

## 출처

- [Expo Documentation, Syntax for EAS Workflows](https://docs.expo.dev/eas/workflows/syntax)

## 관련 문서

- [[Expo-EAS-Workflow-Custom]]

- [[Expo]]
