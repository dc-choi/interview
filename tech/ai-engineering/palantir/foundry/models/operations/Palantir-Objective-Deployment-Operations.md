---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Objective live/batch의 release, 자원과 진단

objective live와 batch는 staging/production tag의 기존 release가 전제다. live는 지속 endpoint, batch는 input dataset을 model에 통과시켜 output dataset을 만드는 pipeline이다. current release와 deployment status를 확인한 뒤 실제 input으로 query/build한다.

## Batch

single tabular dataset input만 지원하고 여러 input은 Python transform으로 조합한다. output은 새 dataset 또는 기존 dataset을 선택하며 Spark profile로 inference resource를 정한다. release가 바뀌면 dataset logic이 바뀌므로 logic-trigger schedule을 걸어 output을 자동 rebuild할 수 있다. release만 바꿔 놓고 output도 갱신됐다고 가정하지 않는다.

## Live

min/max replica와 CPU/GPU를 설정해 horizontal scaling할 수 있다. FAQ default2replica와 낮은 profile은 instance/설정에 따라 바뀔 수 있어 자신의 runtime을 확인한다. GPU Python model은 Beta/enrollment availability 조건이다. live 생성 권한은 batch 생성과 별도로 제한할 수 있다.

Disable은 Target RID를 보존하며 재enable하면 latest release로 upgrade한다. Delete는 되돌릴 수 없고 Target RID도 유지되지 않는다. private library는 publish되어야 하고 public channel도 Foundry에 연결되어야 한다. 외부 API 호출에는 egress 설정이 필요하다.

## Query와 관측

기본 request 최대50MB와 synchronous dialog read timeout5분은 objective FAQ의 기본값이다. 이를 direct의 확정 한도로 확대하지 않는다. source의 single-I/O curl은 sunset endpoint이며 Bearer prefix가 생략된 예제도 있어 최신 API header 계약을 따른다.

startup logs에서 Conda URI/download/install/model load 오류를 찾는다. 여러 replica log는 tags.node_id로 구분한다. source는 log retention7일을 명시한다. Kubernetes host metric은 다른 process도 포함하고 inference container metric은 model process를 본다. container-backed model에는 이 usage metric이 없고 옛 live version은 restart 뒤 새 metric이 보일 수 있다.

## Spark live

objective의 Spark live는 Beta이며 JDK/Spark를 포함한 single local JVM에서만 실행한다. 분산 Spark serving이 아니다. Spark version backward compatibility를 보장하지 않아 rebuild가 필요할 수 있고 JSON→Pandas→Spark 변환을 adapter에서 명시적으로 처리한다.

## 출처

- [Palantir, set-up-live](https://www.palantir.com/docs/foundry/manage-models/set-up-live)
- [Palantir, set-up-batch](https://www.palantir.com/docs/foundry/manage-models/set-up-batch)
- [Palantir, live-faq](https://www.palantir.com/docs/foundry/manage-models/live-faq)

## 관련 문서

- [[Palantir-Model-Live-HTTP-API]]
- [[Palantir-Spark-Model-Constraints]]
- [[Palantir-Model-Live-Usage]]
