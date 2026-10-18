---
tags: [palantir, compute-modules, egress, storage, logging]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Compute Module source와 저장 경계"]
---

# Compute Module source와 저장 경계

Compute Module의 일반 network access는 Foundry의 다른 service를 포함해 기본 차단된다. Data Connection source에 network policy와 credentials를 묶고 compute module에서 명시적으로 연결한다. 권한 token을 발급받은 것과 목적지로 접속할 수 있는 것은 별개다.

## Source lifecycle과 credentials

Source는 같은 Project 또는 해당 Project의 reference여야 하며 Code import에서 compute module import를 허용하고 API name을 지정한다. 추가/제거는 module을 먼저 중지해야 한다. Network policy 변경은 full restart, credentials 변경은 rolling upgrade로 반영한다.

SOURCE_CREDENTIALS는 파일 경로이며 JSON의 source API name, secret name 순으로 찾는다. REST source에서는 additionalSecret prefix가 붙을 수 있다. SOURCE_CONFIGURATIONS_PATH는 connection URL 등 metadata도 담는다. 예제의 secrets/httpConnectionConfig 경로가 실제 source configuration과 맞는지 확인한다.

Python의 `foundry-compute-modules[sources]`와 sources_v2.get_source는 secret과 HTTPS connection/client 접근을 제공한다. TypeScript는 sources 선언 시 startup 검증과 compile-time credential 이름 검사를 제공하지만 선언이 없으면 이 검증을 하지 않는다. 실제 network/credential 유효성을 정적 타입 검사만으로 보장하지 않는다.

TypeScript getServiceApi는 FoundryService의 service endpoint를 source ingress 설정 없이 접근하는 SDK 경로를 제공한다. 이를 임의 host로의 일반 HTTP egress 허용으로 확대하지 않는다. 일반 REST/OSDK hostname 접근은 source 설정 계약을 따른다.

## Volume은 replica 내부 임시 저장이다

Empty directory는 시작 시 비어 있고 같은 replica의 여러 container가 read/write한다. Content directory는 startup 전에 정의한 파일을 read-only로 제공하며 전체 content는 100KB 이하다. Volume 이름은 letter로 시작하는 lowercase/number/hyphen, 최대 63자다. Mount path는 root 이외 absolute path여야 한다.

두 타입 모두 replica 종료/재시작을 넘는 persistent storage가 아니다. 서로 다른 replica의 volume도 별개다. 함수 간 cache로는 쓸 수 있지만 scale-out 일관성, cache invalidation과 reload를 설계해야 한다. 영구 상태는 dataset 등 플랫폼 저장소로 옮긴다.

Volume 예제는 함수 정의 전에 load helper를 호출하고 directory mount 자체를 file로 열어 복사 실행 시 오류가 날 수 있다. Helper를 먼저 정의하고 mount 아래 실제 file path를 사용한다. 예제의 persists between function executions는 같은 replica 안의 호출 사이에만 해당한다.

## 로그 형식과 수집 경로를 함께 설정한다

Container별 logging을 켜고 SLS 또는 plaintext를 고른다. SLS 모드에서는 System.out.println 같은 비SLS 출력이 수집되지 않는다. Plaintext는 출력 text를 SLS message field에 넣어 structured JSON도 문자열로 보존한다. 파싱 방식과 수집 형식을 맞춘다.

Stdout source는 /bin/sh와 set/tee 지원을 요구하며 선택적으로 stderr를 합친다. File source는 directory와 전체 file pattern을 지정하고 시작 시 해당 directory가 비어 있어야 한다. Log가 없다는 사실만으로 container가 실행되지 않았다고 확정하기 전에 수집 설정을 확인한다.

Python/Java SDK는 session/job/process 식별자가 있는 structured logger를 제공한다. TypeScript는 SlsLogger 또는 호환 logger를 쓴다. SafeArg는 비민감 값에만 적용하며 이름, event payload나 반환 object를 그대로 log하는 예제는 민감정보 분류를 대신하지 않는다. 최소 level 설정은 필요한 diagnostics 보존과 함께 조정한다.

## 출처

- [Palantir, Sources](https://www.palantir.com/docs/foundry/compute-modules/sources)
- [Palantir, Containers](https://www.palantir.com/docs/foundry/compute-modules/containers)
- [Palantir, Volumes](https://www.palantir.com/docs/foundry/compute-modules/volumes)
- [Palantir, TypeScript SDK](https://www.palantir.com/docs/foundry/compute-modules/typescript-sdk)
- [Palantir, Python SDK](https://www.palantir.com/docs/foundry/compute-modules/python-sdk)
- [Palantir, Java SDK](https://www.palantir.com/docs/foundry/compute-modules/java-sdk)

## 관련 문서

- [[Palantir-Compute-Execution-and-Identity|권한 주체와 job token]]
- [[Palantir-Compute-Scaling-and-Recovery|Replica 교체와 관측]]
- [[Palantir-Network-Egress-and-Private-Connectivity|플랫폼 network 경계]]
