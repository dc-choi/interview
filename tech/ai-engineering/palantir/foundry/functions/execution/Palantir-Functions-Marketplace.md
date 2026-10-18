---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Functions의 Marketplace 패키징과 소비자 계약

Marketplace의 함수 패키지는 실행할 함수, Ontology/외부 source와 SDK mapping 의존성을 묶는다. 실행에 원본 repository가 필요하지 않다는 점과 설치된 source code를 다시 build할 수 있다는 보장은 구분한다.

기본 설치는 함수 ID와 버전을 재구성하며 처음 0.1.0에서 후속 minor release로 관리한다. API name 충돌에는 suffix가 붙을 수 있다. stable-function mode는 beta로 정확한 버전/API 계약을 유지하지만 version 충돌로 새 function이 생기거나 API name 충돌로 설치가 실패할 수 있다. 기존 설치 내부 소비자 자동 갱신과 외부 소비자 수동 갱신을 나눈다. Compute Module function의 stable mode 지원도 별도 제한이다.

## 환경 의존성

Source alias는 설치 입력으로 remap할 수 있다. model alias는 현재 다른 모델로 remap할 수 없어 정확한 RID 접근을 확인한다. interface를 구현한 구체 object type은 source와 패키지 SDK mapping에 모두 포함되어야 한다. 빠지면 `SdkObjectMappingNotFound`가 날 수 있다.

Deployed 함수를 패키징할 때 현재 실행 중인 repository 버전이 패키지 버전과 맞아야 한다. 배포 설정과 scaling을 포장하더라도 고정된 실행 image를 그대로 복제하는 의미는 아니다. 설치 시 배포가 생성/시작되거나 serverless 미지원 환경에서 deployed가 필요해 비용이 발생할 수 있다.

v1 `@Static` override는 query나 외부 API를 호출하는 임의 실행 확장으로 사용하지 않는다. source code customization을 시작하면 upstream 업데이트와 충돌할 수 있으므로 생성 패키지와 fork 유지의 책임을 나눈다.

## 출처

- [Palantir, marketplace-functions](https://www.palantir.com/docs/foundry/functions/marketplace-functions)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
