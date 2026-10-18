---
tags: [palantir, compute-modules, docker, deployment]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Compute Modules 이미지와 배포"]
---

# Compute Modules 이미지와 배포

Image는 코드와 의존성을 담은 실행 template이며 container는 실행 instance다. Compute Module replica는 같은 구성의 container 집합으로 만들어진다. Replica 안에서는 network와 volume을 공유할 수 있지만 replica 간 통신이나 메모리 공유를 전제하지 않는다.

## 이미지의 실행 조건

Containers 기준 image는 numeric non-root user로 실행하고 `latest` 이외 tag 또는 digest를 지정한다. EXPOSE port는 1024~65535 중 8945/8946을 제외한다. 문서는 linux/amd64를 요구하지만 Getting started의 queue에 맞춘 platform 변경과 과거 안내의 일부 arm64 queue가 함께 있으므로 실제 resource queue의 지원 architecture를 확인한다. Apple Silicon에서 host 기본 architecture를 그대로 배포하지 않는다.

Dockerfile은 base image, dependency install, code copy와 startup command를 정의한다. 의존성을 code copy보다 먼저 분리하면 layer cache를 활용할 수 있다. 런타임 reserved env는 덮어쓰지 않는다. 이미지 빌드가 성공해도 startup의 SDK 실행, runtime 연결과 schema import는 별도로 확인한다.

## 로컬과 Code Repositories 경로

로컬 Python/Java/Node.js SDK 경로는 이미지를 Artifacts Docker repository에 publish한 뒤 module에서 repository와 version을 선택한다. Getting started의 Python 3.9+, Java 21+, Node.js 18+ 및 의존성 버전은 해당 예제의 기준이며 계속 최신 지원 버전이라는 의미가 아니다. SDK 사용법과 runtime compatibility를 실제 선택 버전에서 대조한다.

Python Compute Module Code Repository는 src/app.py에 함수를 정의하고 Libraries/meta.yaml로 의존성을 관리하며 Tag version으로 image를 만든다. 선택한 tagged image로 configuration을 저장한 뒤 module을 실행하고 detected function을 import한다. Commit만으로 module의 실행 image가 바뀌지 않는다.

로컬 OSDK package는 private artifact index에서 내려받는다. Docker BuildKit secret mount로 FOUNDRY_TOKEN을 빌드에 제공하고 enrollment/repository RID는 Developer Console 값으로 교체한다. Build token과 실행 CLIENT_SECRET을 혼동하지 않는다. Code Repository에서는 generated Python Conda SDK 또는 Java Maven dependency를 연결한다.

## Functions CLI는 빌드와 schema 생성을 연결한다

CLI는 static function inference와 필요한 metadata label을 가진 Docker image build/publish를 담당한다. Python은 `infer --opt functions --plugin python_cm` 또는 plan file을 사용한다. File plugin은 명시한 functions/types JSON으로 custom object와 list/set/dict/optional의 중첩 schema를 정의한다.

Build plan은 image name/tag/registry와 OAuth client 또는 token 인증을 담는다. `-t`, `-tt`, `-ttt`는 각각 patch/minor/major tag increment다. 기본 Docker 외 GoCR engine은 daemon 없이 base image/copy_paths/entrypoint로 build할 수 있다. 태그 번호 증가가 기존 consumer schema의 호환성을 검증해 주는 것은 아니다.

## 과거 번역 문서의 적용 경계

영문에서 더 이상 확인되지 않은 authoring/deploying 안내는 중국어 기계 번역본으로 확인했다. 번역 정확성과 현행 지원을 보장하지 않으며 beta 시기의 설정으로 보존한다. 과거 app.py 고정 위치, 상대 import만 허용, baseImageTag 0.15 전후의 NoRuntime/COMPUTE_MODULE_RUNTIME_V1 전환을 현재 모든 SDK에 적용하지 않는다. 현재 Java의 옛 DeployedAppRuntime 경로는 Include runtime을 OFF로 요구한다.

과거 연결 JSON file의 생성 대기, 장기 polling과 모든 job 결과 보고는 현재 client 계약과 함께 볼 수 있다. 그러나 JSON comment, placeholder API path, 잘못된 COPY 예제는 그대로 실행할 수 없다. Mutable image tag의 자동 update 약 24시간이라는 과거 설명을 신규 배포의 확정 SLA로 삼지 않고 특정 version/digest와 실행 history로 확인한다.

## 출처

- [Palantir, Containers](https://www.palantir.com/docs/foundry/compute-modules/containers)
- [Palantir, Getting started](https://www.palantir.com/docs/foundry/compute-modules/get-started)
- [Palantir, Functions CLI](https://www.palantir.com/docs/foundry/compute-modules/functions)
- [Palantir, OSDK integration](https://www.palantir.com/docs/foundry/compute-modules/osdk-integration)
- [Palantir, Java SDK](https://www.palantir.com/docs/foundry/compute-modules/java-sdk)
- [Palantir, 本地创作概述 (중국어 기계 번역, 과거 안내)](https://palantir.com/docs/zh/foundry/compute-modules/authoring-locally-overview/)
- [Palantir, 本地 Python 创作 (중국어 기계 번역, 과거 안내)](https://palantir.com/docs/zh/foundry/compute-modules/authoring-locally-python/)
- [Palantir, Foundry 中创作 (중국어 기계 번역, 과거 안내)](https://palantir.com/docs/zh/foundry/compute-modules/authoring-foundry/)
- [Palantir, 部署计算模块 (중국어 기계 번역, 과거 안내)](https://palantir.com/docs/zh/foundry/compute-modules/deploying-compute-module/)

## 관련 문서

- [[Palantir-Compute-Scaling-and-Recovery|업그레이드와 replica history]]
- [[Palantir-Artifacts-and-Package-Lifecycle|Artifacts 수명]]
