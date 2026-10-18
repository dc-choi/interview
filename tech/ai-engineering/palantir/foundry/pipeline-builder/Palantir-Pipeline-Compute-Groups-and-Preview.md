---
tags: [palantir, foundry, pipeline-builder, data-engineering]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder compute, job group과 preview"]
---

# Pipeline Builder compute, job group과 preview

Compute profile의 크기, 공유 실행 단위, preview sampling은 각각 다른 비용과 정확성의 경계다. Spark/Faster/streaming profile 이름이 같아도 core/memory 의미가 다르다.

## Profile와 권한

Standard Spark는 Extra Small/Small/Medium을 자동 import한다. Large/Extra Large와 같은 급 custom profile은 Compass Project Editor/Owner와 Resource Management admin이 함께 있어야 import할 수 있다. Pipeline 자체 Owner만으로 충분하지 않다. 이미 쓰던 profile은 유지되며 Faster/streaming은 이 import 계약을 적용하지 않는다. Marketplace install도 같은 권한을 확인하고 작은 profile로 대체할 수 있다.

Spark standard total maximum core는 XS 1, S 3, M 33, L 65, XL 257로 설명한다. Faster는 S 1core/7.5GB부터 XXL 16core/120GB까지 별도 profile이다. 문서 수치는 workload의 실제 사용량이나 성능 보장이 아니다.

Managed profile은 해당 deployment 최근 5 build를 보고 최초 할당보다 낮추는 방향으로만 조정하며 preset 사이 custom 수준도 가능하다. Warm pool은 continuously running VM에서 최대 3 job을 공유하고 Spark XS/S에 지원한다. UDF에는 사용할 수 없고 log가 축약되어 실패 조사 시 비활성화가 필요할 수 있다.

Native acceleration은 Velox off-heap과 JVM on-heap의 균형을 요구한다. 큰 profile도 LLM/embedding의 JVM 작업과 shuffle OOM을 해결하지 못할 수 있다. Recovered 미검증 한국어 페이지의 HIGH부터 조절하라는 이전 안내보다 현재 영어 profile별 조건을 구분한다. Faster는 profile management Standard만 지원한다고 설명한다.

Streaming profile은 Job Manager와 task memory/parallelism을 지정하며 max job duration은 1분~7일이다. Non-main은 기본 1일 제한이다. Stream behavior에서 consistency를 별도로 선택하며 미설정 warning을 exactly-once 보장으로 해석하지 않는다.

## Job group과 checkpoint

Batch는 기본 output마다 독립 job, streaming은 기본 모든 output이 한 Flink cluster의 job이다. 묶은 output은 compute와 실패 경계를 공유하고 streaming group을 나누면 cluster 비용도 늘어난다. Incremental/streaming output의 group 이동은 replay를 요구한다.

같은 group 안에서는 직접 연결되지 않은 input의 marking도 모든 output에 상속된다. Group 변경은 단순 성능 조정이 아니라 접근 요건도 바꾼다. Marking badge는 이러한 잠재 상속을 표시하며 제거에는 별도 보안 승인 경로가 필요하다.

Checkpoint는 공통 중간 결과를 short-term disk(기본), memory, dedicated output dataset으로 저장한다. 같은 group의 여러 output이어야 재계산을 줄인다. Memory는 Faster 미지원이며 큰 결과는 OOM이 날 수 있다. Disk에 큰 join 결과 전체가 저장될 수 있고 query 최적화 경계도 생기므로 늘 빨라지는 것은 아니다. Performance 문구의 lower-cost 표현과 감소 성능 설명은 서로 어색해 실제 비용을 계측해야 한다.

## Preview와 표본의 의미

일반 preview table은 최대 500 row이며 꼭 처음 500개는 아니다. Filter/join/dedup은 그 500개를 만들기 위해 더 많은 input을 읽을 수 있다. Sampling은 preview에만 적용하고 build는 full input을 쓴다. Percentage는 1~100, file filtered preview는 metadata 조건이며 compatible input에만 Apply-to-all이 가능하다.

Row count/statistics는 선택한 input sample 범위의 계산이다. Chart의 histogram/bar/aggregation도 intermediate 검토 수단이며 production 품질 gate와 다르다. Timestamp timezone picker는 표시만 다시 렌더링하고 같은 session의 다른 preview와 공유한다.

Preview는 기본 자동 실행이며 user preference가 enrollment default보다 우선한다. LLM/model preview는 실제 compute를 발생시킬 수 있다. 이 문서의 수치와 성능은 공식 본문 설명이며 profile 실행이나 비용 측정을 수행하지 않았다.

## 출처

- [Palantir Pipeline Builder, compute-profile-permissions](https://www.palantir.com/docs/foundry/pipeline-builder/compute-profile-permissions)
- [Palantir Pipeline Builder, management-build-settings](https://www.palantir.com/docs/foundry/pipeline-builder/management-build-settings)
- [Palantir Pipeline Builder, management-charts](https://www.palantir.com/docs/foundry/pipeline-builder/management-charts)
- [Palantir Pipeline Builder, management-checkpoints](https://www.palantir.com/docs/foundry/pipeline-builder/management-checkpoints)
- [Palantir Pipeline Builder, management-input-sampling](https://www.palantir.com/docs/foundry/pipeline-builder/management-input-sampling)
- [Palantir Pipeline Builder, management-job-groups](https://www.palantir.com/docs/foundry/pipeline-builder/management-job-groups)
- [Palantir Pipeline Builder, management-native-acceleration](https://palantir.com/docs/kr/foundry/pipeline-builder/management-native-acceleration/)
- [Palantir Pipeline Builder, outputs-preview-pipeline](https://www.palantir.com/docs/foundry/pipeline-builder/outputs-preview-pipeline)
- [Palantir Pipeline Builder, tips-and-tricks](https://www.palantir.com/docs/foundry/pipeline-builder/tips-and-tricks)

## 관련 문서

- [[Palantir-Pipeline-Builder]]
- [[Palantir-Pipeline-Transforms]]
- [[Palantir-Pipeline-Expressions]]
