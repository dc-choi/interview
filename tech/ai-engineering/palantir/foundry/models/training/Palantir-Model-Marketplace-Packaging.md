---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Marketplace의 모델 내용, 재학습과 소비자 버전

Model content는 weights, adapter/environment와 container를 포함한 정적 snapshot이며 설치 뒤 재build되지 않는다. sidecar를 포함한 전체8GiB 제한을 확인한다. 재학습하려면 Code Repository, published notebook transform 또는 Studio 등 model producer를 package한다. interactive notebook 자체는 재학습 producer가 아니다.

## 포함 범위

default branch의 direct deployment를 package하며 non-default branch/objective deployment와 external model은 지원하지 않는다. live deployment의 replica/scaling/environment/thread configuration도 포함된다. Package live deployment를 선택하면 published model Function도 포함할 수 있다.

Code Repository install은 checks를 실행하지 않아 container가 없을 수 있다. live/sidecar가 필요하면 설치와 새 버전 upgrade 뒤 checks를 직접 실행하고 build한다. model을 product input으로 받는 transform은 sidecar=true 조건을 따른다. sidecar 소비자는 adapter import가 필요하지 않다.

## 시작과 업데이트

auto-start=false는 새 설치 또는 멈춘 deployment를 그대로 두며, 이미 실행 중인 deployment를 upgrade 때 정지시키지는 않는다. true는 설치 시 시작한다. model producer는 training/build 완료를 기다리고 static content는 해당 version이 즉시 존재한다.

installed output model의 재학습은 deployment를 갱신하지만 Function version은 자동 publish하지 않는다. API가 같으면 기존 Function version이 계속 동작할 수 있지만 API가 바뀌면 새 Function publish와 소비자 version 갱신이 필요하다. product 밖 소비자는 별도로 점검한다.

선택한 model version과 명시한 Function version이 맞아야 한다. resolver가 해당 model에 맞는 옛 Function을 자동 탐색해 주지는 않는다. 정식 resource import는 추적/재연결되지만 import 없이 Platform SDK로 동적으로 호출하는 dependency는 자동 추적되지 않는다.

## 출처

- [Palantir, marketplace-models](https://www.palantir.com/docs/foundry/model-integration/marketplace-models)

## 관련 문서

- [[Palantir-Model-Functions-Versioning]]
- [[Palantir-Model-Engineering-Workflow]]
