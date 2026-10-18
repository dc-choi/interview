---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# GPU training의 환경 resolution과 inference 분리

GPU는 enrollment 지원과 project resource queue 배정이 전제다. GPU 추가와 CUDA-compatible library 설치, 실제 training code의 장치 사용은 각각 확인해야 한다. GPU profile만으로 Spark code가 자동 분산되지 않는다.

## Dependency resolution

Code Workspaces에서는 GPU를 먼저 추가한 뒤 Conda로 PyTorch/TensorFlow를 설치한다. CPU 환경에서 먼저 resolve한 package는 GPU 추가만으로 자동 교체되지 않을 수 있다. Maestro 환경 reset/reinstall 등 정식 재해결 절차를 쓰며 lock file을 임의 편집하지 않는다. GPU 없는 solver에는 __cuda virtual package가 없어 강제 CUDA package 설치가 실패할 수 있다.

Repository dependency solver에는 GPU가 없다. source는 deepest build.gradle의 runVersions/condaPackRun task에 CONDA_OVERRIDE_CUDA를 지정한다. 최상위 root에만 설정해 해결됐다고 보지 않는다. nvidia-smi의 CUDA 값은 driver가 지원하는 최대치이며 실제 framework가 쓰는 CUDA version과 다르다. Conda dependency를 확인하며 pip overlay의 충돌을 피한다.

## Training과 inference

native distributed Spark library가 아니라면 lightweight training을 우선 검토한다. Spark driver/executor GPU profile은 각각 요청하고 실제 library가 분산을 지원하는지 확인한다. GPU는 preview에서 사용할 수 없다.

training GPU와 sidecar inference GPU는 별도 요청이다. source sidecar example은 gpus=1,cpus=3.4,memory=16을 지정한다. 이전 Spark-only container inference 안내와 같은 문서의 non-Spark sidecar 예제가 섞여 있으므로 library/runtime version을 확인한다. 현재 migration 문서는 palantir_models0.2010.0이상에서 lightweight/using sidecar를 안내한다.

benchmark는 warmup과 synchronization을 포함해야 비동기 GPU 호출 시간을 오해하지 않는다. 예제의 속도 수치는 실제 자신의 model과 queue에 대한 성능 보장이 아니다.

## 출처

- [Palantir, gpu-training](https://www.palantir.com/docs/foundry/model-integration/gpu-training)

## 관련 문서

- [[Palantir-Model-Training-Environments]]
- [[Palantir-Foundry-ML-Migration]]
