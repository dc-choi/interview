---
tags: [palantir, schedule, parameterization, action]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry parameterized schedule"]
---

# Parameterized schedule과 출력 수명

Schedule parameterization은 같은 Python transform을 여러 parameter 값으로 실행하는 beta 기능이다. Enrollment 가용성을 확인한다. 최소 `transformsVersion 10.96.0`, `transformsLangPythonPluginVersion 1.1137.0`을 요구한다.

## Standard와 parallelized mode

Parameter는 Python 변수의 이름, String/Integer/Float/Boolean type과 default를 갖는다. Transform은 parameter 객체의 `.value`를 읽는다. Standard mode는 schedule에 값을 넣고, 숨긴 parameter는 transform의 default를 사용한다. Parameterized schedule 밖에서 build해도 default가 쓰인다.

시간별 incremental과 매일 compaction의 실행 flag를 나눌 수 있다. 다만 output `set_mode("replace")`는 출력 쓰기 모드 변경이며 과거 전체 input을 자동 재구성한다는 뜻은 아니다. 예제의 replace 코드를 적용하기 전에 input이 전체 view인지 incremental tail인지 확인해 이력 손실을 막는다.

Parallelized mode는 서로 다른 run setup을 독립 build하고 union view에 결과를 모은다. 각 setup은 고유 run setup key와 나머지 parameter를 갖는다. Main schedule branch의 target dataset 내용은 이 결과로 갱신되지 않는다. 소비자는 지정한 union view를 읽어야 한다.

## Setup 변경과 데이터 반영은 다른 시점이다

- Setup 생성/수정은 다음 build의 입력값을 바꾼다. 저장 즉시 과거 output을 새 의미로 바꾸지 않는다.
- 수정 전 build가 기여한 row는 다시 build되기 전까지 union view에 남는다.
- Setup 삭제는 그 setup의 union output row도 제거한다.
- Action으로 실행하면 같은 key의 setup은 parameter를 갱신한 뒤 build하고, 새 key이면 setup을 생성한 뒤 즉시 build한다.

Run setup key를 단순 요청 ID로 할지 같은 업무 대상을 재계산하는 ID로 할지 결정한다. 후자에서는 수정/build 실패 동안 이전 row가 남는 상태를 UI와 downstream에서 어떻게 해석할지 정한다.

## 한계

Schedule당 최대 50 parameter이며 생성 후 이름/type을 바꿀 수 없다. 새 parameter 계약은 새 schedule이 필요하다. Parallelized는 최대 1,000 setup, tabular Foundry dataset의 union view만 지원한다. 자동 trigger를 정의할 수 없고 setup 수동 실행 또는 Action으로 실행한다. 병렬 실행 기능을 cron 기반 자동 fan-out으로 오해하지 않는다.

## 출처

- [Palantir, Parameterization](https://www.palantir.com/docs/foundry/building-pipelines/parameterization)

## 관련 문서

- [[Palantir-Pipeline-Schedule-Resolution|Build schedule]]
- [[Palantir-Action-External-Effects|Action과 외부 실행]]
- [[Palantir-Incremental-Transactions-and-Compaction|증분과 replace 의미]]
