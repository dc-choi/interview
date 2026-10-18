---
tags: [palantir, foundry, python, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Python 환경 해석과 라이브러리 수명주기"]
---

# Python 환경 해석과 라이브러리 수명주기

Environment는 직접 package뿐 아니라 transitive dependency, channel과 platform 제약을 함께 푼 결과다. Checks에서 Hawk가 meta.yaml을 해석해 resolved environment를 Artifacts에 publish하고 build가 설치한다. 설치 실패 때 build-time resolution으로 fallback할 수 있어 같은 source commit만으로 모든 환경 조건이 고정된다고 보장하지 않는다.

## Solve와 install을 분리해 진단

Solve는 channel repodata download/parse, dependency graph pruning, SAT constraint 작성과 solving이다. Install은 package download/extract/verify/link다. 큰 channel, 많은 transitive dependency, 환경 크기와 큰 package는 서로 다른 병목이다. 작은 목적별 환경을 두고 불필요한 package를 줄인다.

Missing package/channel/virtual package, direct version conflict, transitive conflict, artifact permission/download, Python ABI, Conda+JAR 쌍 누락을 구분한다. Can be installed라는 문구는 나머지 package와의 동시 설치 가능성을 보장하지 않는다. 느린 resolution과 container OOM을 같은 원인으로 단정하지 않는다.

GraphFrames/Spark NLP처럼 Python wrapper와 JVM JAR가 모두 필요한 library는 호환 Scala/Spark/library version 및 test-time sparkJars도 필요할 수 있다. 원문의 Scala2.12 예제를 Spark4/Scala2.13 환경에 그대로 적용하지 않는다.

## Lockfile, pin과 갱신

Package UI는 backing artifact repository와 권한을 함께 연결하므로 권장 경로다. Task Runner는 현재 run environment를 변경하며 test-only dependency는 지원하지 않는다. 특정 version pin 뒤에는 Checks와 Code Assist 재시작이 필요할 수 있다. Uninstall은 의존하는 package도 제거할 수 있다.

Lockfile은 Checks의 resolved environment다. meta.yaml 변경, template upgrade, recalled package, lockfile 삭제/수정 때 재해석한다. Unit-test 문서의7일 cache 설명과 lockfile 재해석 조건을 구분한다. 변경 전후 lockfile로 실제 version 변화와 upstream 변화를 비교한다. 충돌 시 양쪽 lockfile을 무조건 합치는 안내를 모든 lock 형식의 일반 해법으로 취급하지 않는다.

문서는 resolution을 줄이기 위한 주요 package pin과 dependency conflict를 줄이기 위한 unpin을 모두 권한다. 필요한 호환 범위만 제한하고 security/compatibility update가 막히는지 검토한다. Python build/run version은 같게 맞춘다. 일반 Conda/pip 범위 문법과 Foundry Python version pin 제약은 다르므로 원문 일부의 >= 미지원 표현을 모든 package에 일반화하지 않는다.

## 2026-10-16 기준 version 문서

전용 Python-version 표는3.9를2026-01-31부터 미지원,3.10을2026-10-31부터 미지원,3.11/3.12 지원,3.13 coming soon,3.14 planning으로 표기한다. 과거 troubleshooting/template의3.9 예시는 현재 지원 version 추천이 아니다. 지원 종료 전 campaign과 실제 repository runtime을 확인하며 이 날짜표를 영구 현재 사실로 사용하지 않는다.

## Library publish와 consumer

공유 library는 Conda package로 publish한다. Repository 이름에서 유도한 package 이름은 lowercase ASCII/숫자/hyphen이고 import package name과 다를 수 있다. 기본은 SLS-compatible tag의 Checks 성공 후 publish하며 consumer는 새 version으로 자동 upgrade하지 않는다. Consumer에게 Viewer와 artifact reference가 필요하다.

pip dependency는 Conda 환경 위에 설치하며 Python transform repo에서 지원하지만 library repo의 pip section에는 미지원이다. Secret/user token은 package artifact나 문서에 저장하지 않는다. Local clone token의7일 갱신과 package cache7일은 별도 수명주기다. 실제 dependency install은 실행하지 않았다.

## 출처

- [Palantir Python transforms, environment-creation-overview](https://www.palantir.com/docs/foundry/transforms-python/environment-creation-overview)
- [Palantir Python transforms, environment-overview](https://www.palantir.com/docs/foundry/transforms-python/environment-overview)
- [Palantir Python transforms, environment-troubleshooting](https://www.palantir.com/docs/foundry/transforms-python/environment-troubleshooting)
- [Palantir Python transforms, python-versions](https://www.palantir.com/docs/foundry/transforms-python/python-versions)
- [Palantir Python transforms, share-python-libraries](https://www.palantir.com/docs/foundry/transforms-python/share-python-libraries)
- [Palantir Python transforms, use-python-libraries](https://www.palantir.com/docs/foundry/transforms-python/use-python-libraries)

## 관련 문서

- [[Palantir-Python-Transforms]]
- [[Palantir-Code-Transforms]]
- [[Palantir-Python-Spark-Incremental-Batches]]
- [[Palantir-Python-Incremental-Media-Contracts]]
