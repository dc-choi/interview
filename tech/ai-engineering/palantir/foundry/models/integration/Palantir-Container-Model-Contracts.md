---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Container model의 권한, 시작 순서와 telemetry

container model은 language/대형 weight/기존 serving image를 adapter와 함께 가져온다. Rubix 기반과 Control Panel의 container workflow enablement가 필요하며 꺼져 있으면 해당 job/deployment가 실패한다. Windows image는 지원하지 않고 Linux/image requirement를 따른다.

## 이미지와 권한

model resource를 먼저 만들고 token으로 registry에 push한다. latest tag는 허용되지 않으며 명시 tag/digest를 쓴다. Viewer는 이미지도 다시 pull할 수 있어 model 조회 권한을 weight/image 배포 권한과 함께 판단한다. FAQ는22GB이상 image가 보통 push timeout된다고 설명하며 이는 Marketplace 전체8GiB 제한과 별개다.

## Adapter와 runtime

정해진 serving API는 없고 adapter가 선택한 port/HTTP request/shared volume로 통신한다. service URI는 container명마다 여러 port를 가질 수 있다. 예제 mirror adapter는 첫 service를 골라 row마다 POST하고 returnedText를 읽는 단순 예시이며 timeout/retry/status 검증을 완성한 client가 아니다.

여러 container를 묶을 수 있지만 동시에 시작하며 orchestration/start order를 보장하지 않는다. port, memory,args,env와 exec command를 version별로 설정한다. prerequisite container의 준비를 가정하지 말고 readiness/error handling을 자기 adapter에 맞춘다.

sidecar decorator로 local adapter를 먼저 시험할 수 있다. upload guide의 Python transform 경로는 container model에 명시 version RID와 adapter dependency를 요구한다. 최신 일반 use_sidecar 경로와 구분해 사용 version의 signature를 확인한다.

## Telemetry

새 model version에서 Enable telemetry를 켜고 image에 /bin/sh와 set/tee가 있어야 한다. container logs는 Python transforms/live에 제공되지만 objective batch deployment에는 방출되지 않는다는 FAQ 제약이 있다. Control Panel에서 image와 vulnerability recall을 관리하며 model build 성공만으로 image가 안전하다고 단정하지 않는다.

## 출처

- [Palantir, container-overview](https://www.palantir.com/docs/foundry/integrate-models/container-overview)
- [Palantir, container-models-faq](https://www.palantir.com/docs/foundry/integrate-models/container-models-faq)
- [Palantir, container-model-adapter-example](https://www.palantir.com/docs/foundry/integrate-models/container-model-adapter-example)
- [Palantir, upload-image-container-model](https://www.palantir.com/docs/foundry/integrate-models/upload-image-container-model)

## 관련 문서

- [[Palantir-Model-Adapter-Contracts]]
- [[Palantir-Model-Marketplace-Packaging]]
