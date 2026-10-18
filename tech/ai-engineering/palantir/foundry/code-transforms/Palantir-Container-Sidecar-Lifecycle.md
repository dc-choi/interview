---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Container sidecar의 입출력과 수명 계약"]
---

# Container sidecar의 입출력과 수명 계약

Spark sidecar transform은 PySpark executor 옆의 container를 통해 별도 code/dependency를 실행한다. 각 executor에 정확히 한 container를 선언하는 모델이며 container-backed model asset이나 Python bring-your-own-container runtime과 동일한 API가 아니다.

## Image와 resource

Image는 linux/amd64, numeric nonzero user, 1024~65535 port와 digest 또는 latest 아닌 tag를 요구한다. Python BYOC는 user5001이라는 별도 조건이 있다. 각 layer는 약10GB 미만을 강하게 권하고 더 큰 경우 지원 확인이 필요하다. Telemetry는 선택 사항이지만 /bin/sh와 set/tee가 필요하다.

Resource profile은 sidecar 자체 CPU/memory/GPU를 정한다. SMALL 1core/3GB, MEDIUM 2/6, LARGE 4/13, XL8/27, XXL16/54GB이며 GPU는 LARGE/XL 옵션, shared-memory 2GB는 특정 MEDIUM 옵션이다. Spark executor profile과 sidecar 할당을 함께 고려해야 한다.

## Shared volume protocol

Executor와 sidecar는 `/opt/palantir/sidecars/shared-volumes/` 아래 volume으로 input/output와 start/done/close flag를 교환한다. Sidecar가 자동으로 input 준비를 기다리거나 output 복사를 기다려 주는 것이 아니므로 사용자 entrypoint가 대기/종료 protocol을 구현한다.

Server 방식은 localhost endpoint를 호출하고 CLI 방식은 file/flag로 동기화하는 예시다. Partition 수, task당 executor 배치와 profile을 맞춰야 volume 공유에서 실행이 겹치지 않는다. Source의 네 executor 예시는 고정 네 row/repartition/profile 전제를 포함하며 Spark의 일반 exactly-once 실행 보증이 아니다.

## 예제의 실패 한계

예제 wait-for-done helper는 최대10분을 기다린 뒤 완료 여부를 raise하지 않고 종료한다. File-copy helper도 missing file을 출력만 하고 진행하며 process의 exit status를 검사하지 않는다. 따라서 이 예제를 그대로 써서 output이 성공적으로 생성되었다고 판정할 수 없다. 실제 wrapper에는 완료/오류/timeout 구분, 출력 검증과 정리가 필요하다는 것이 코드에서 도출한 적용 조건이다.

Sample server는 readiness 기다림 없이 request를 보내고 CLI는 단순 공백 split로 command를 나누므로 복잡한 quoting 계약을 보장하지 않는다. 재시도/병렬 실행의 중복 효과와 flag 충돌도 이 예제에서 해결했다고 가정하지 않는다. 이는 문서 예제의 정적 검토이며 container build/push나 sidecar 실행을 수행하지 않았다.

## 출처

- [Palantir transforms-container, transforms-container](https://www.palantir.com/docs/foundry/transforms-container)
- [Palantir transforms-container, container-overview](https://www.palantir.com/docs/foundry/transforms-container/container-overview)
- [Palantir transforms-container, transforms-sidecar](https://www.palantir.com/docs/foundry/transforms-container/transforms-sidecar)

- [Palantir Python transforms, container-overview](https://www.palantir.com/docs/foundry/transforms-python/container-overview)

- [Palantir Python transforms, transforms-sidecar](https://www.palantir.com/docs/foundry/transforms-python/transforms-sidecar)

## 관련 문서

- [[Palantir-Code-Transforms]]
