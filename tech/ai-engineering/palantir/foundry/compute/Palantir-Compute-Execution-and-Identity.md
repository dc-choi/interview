---
tags: [palantir, compute-modules, authorization]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Compute Modules 실행과 권한"]
---

# Compute Modules 실행과 권한

Compute Module은 컨테이너의 custom logic을 Foundry 함수 또는 데이터 파이프라인으로 실행한다. 기존 Foundry 기능이 요구를 충족하는지 먼저 비교하고, 별도 언어/라이브러리/실시간 처리 요구가 있을 때 컨테이너 운영 책임을 선택한다. 애플리케이션 활성화에는 관리자 설정이 필요할 수 있다.

## 실행 모드가 접근 주체를 결정한다

| 모드 | 실행 계약 | Foundry 접근 |
|---|---|---|
| Functions, No platform permissions | 외부에서 query를 받아 함수 실행 | 플랫폼 API/OSDK 권한 없음, 외부 source 설정은 가능 |
| Functions, Application permissions | query를 받아 앱의 고정 권한으로 실행 | 연결된 third-party application 서비스 계정 |
| Pipeline | build system이 제공한 입력을 처리하고 출력 기록 | 명시한 입력/출력에 제한된 job token |

Application permissions는 호출자마다 권한이 바뀌는 모델이 아니다. Python SDK 설명의 on behalf of users라는 문장이나 context의 token 설명을 호출자 권한 위임 보장으로 확대하지 않는다. 일부 enrollment에서는 이 모드를 사용할 수 없다.

자동 생성한 third-party app의 CLIENT_ID/CLIENT_SECRET 또는 Developer Console의 다른 app credentials를 연결할 수 있다. 서비스 계정에 필요한 resource/Marking 접근과 OAuth scope를 부여하고 실제 접근을 확인한다. 서비스 계정 설정에는 Manage OAuth 2.0 clients 권한이 필요하다.

OSDK를 사용할 때는 generated SDK의 backend service/application permissions 설정, entity와 backing data 접근, Foundry hostname egress가 모두 맞아야 한다. 클라이언트 ID가 있다는 사실만으로 객체 접근이 허용되지 않는다. Python RefreshingOauthToken은 기본 30분 갱신, Java는 만료 전 자동 갱신을 제공한다. 장기 실행에서 한 번 받은 raw token을 계속 쓰는 방식과 구분한다.

## Pipeline은 대화형 query를 받지 않는다

Pipeline 모드는 resource를 build system으로 통과시켜 계보와 Marking 경계를 추적한다. 기본적으로 resource 권한이 없으며 같은 Project의 dataset, streaming dataset, media set을 입력/출력으로 명시한다. `BUILD2_TOKEN`은 토큰 문자열이 아니라 토큰 파일 경로다. `RESOURCE_ALIAS_MAP`도 파일 경로이며 설정한 alias를 RID와 nullable branch로 해석한다.

컨테이너는 자체 처리 loop를 실행하며 compute query client가 필요하지 않다. query가 없어 autoscaler가 0으로 줄일 수 있으므로 상시 처리에는 minimum replicas를 1 이상으로 설정한다. Build system이 output dataset transaction을 열고 성공 시 commit하는 계약과 외부 서비스의 부수효과를 같은 원자적 transaction으로 취급하지 않는다.

예제의 stream 최신 record를 60초마다 읽고 쓰는 loop에는 cursor/checkpoint, 재처리 중복 제거, HTTP 실패 처리 또는 token 갱신이 구현되지 않았다. 그대로 exactly-once 수집기로 쓰지 않는다. 파일 API 예제는 `master`를 고정하고 파일 content를 JSON으로 해석하므로 실제 alias branch와 파일 형식에 맞춰 바꾼다. Getting started 마지막의 Query panel 안내도 pipeline에 직접 query가 가능하다는 근거가 아니다.

## Marketplace 배포 시 Ontology를 다시 해석한다

Marketplace 설치 compute module의 `FOUNDRY_ONTOLOGY_RID`는 원본이 아니라 설치 Project의 Ontology를 가리킨다. OSDK client 초기화에 이 RID를 반영하고 source/target entity API name이 일치하는지 확인한다. 원본 RID를 코드에 고정하면 설치 환경에서 잘못된 Ontology를 참조할 수 있다.

## 출처

- [Palantir, Compute modules overview](https://www.palantir.com/docs/foundry/compute-modules/overview)
- [Palantir, Execution modes](https://www.palantir.com/docs/foundry/compute-modules/execution-modes)
- [Palantir, Getting started](https://www.palantir.com/docs/foundry/compute-modules/get-started)
- [Palantir, OSDK integration](https://www.palantir.com/docs/foundry/compute-modules/osdk-integration)
- [Palantir, Python SDK](https://www.palantir.com/docs/foundry/compute-modules/python-sdk)
- [Palantir, Java SDK](https://www.palantir.com/docs/foundry/compute-modules/java-sdk)

## 관련 문서

- [[Palantir-Compute-Function-Schemas-and-Clients|함수 계약]]
- [[Palantir-Compute-Sources-and-Storage|Source와 저장 경계]]
- [[Palantir-Pipeline-Markings-and-Declassification|파이프라인 Marking]]
