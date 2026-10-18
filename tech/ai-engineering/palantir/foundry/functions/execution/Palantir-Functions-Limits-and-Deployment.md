---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 실행 한도와 serverless/deployed 선택

## 시간과 메모리

일반 함수의 기본 elapsed time은 60초이며 설정 가능하다. Live preview 최대 280초, Automate 비동기 최대 4시간은 서로 다른 실행 경계다. TypeScript v1의 CPU 시간 30초와 메모리 128MB는 elapsed time과 별도로 제약된다.

v2/Python serverless 메모리는 기본 1,024MiB, 구성 범위 512~5,120MiB로 문서화되어 있다. v2는 최대 8 vCPU와 약 5GB 환경을 설명한다. deployed Python의 기본 메모리 설명과 배포 resource 설정은 구분한다. 함수 페이지에서 조정하는 한도와 배포 서비스의 CPU/GPU/memory 구성은 같은 UI가 아니다.

함수 설정은 버전별이다. template TypeScript v1 3.512.0/Python 0.423.0 이상에서 이전 버전의 설정을 상속하는 계약이 있으므로 구형 template에서 새 release가 같은 설정을 가진다고 가정하지 않는다. stable release는 이전 stable, prerelease는 이전 버전 선택 규칙을 확인한다.

## 배포 모드

Serverless는 지원되는 환경에서 기본이며 여러 버전을 실행 시 사용할 수 있다. deployed는 장기 실행 서비스로 GPU와 service discovery 같은 기능이 필요할 때 사용하며 실행하지 않아도 할당 자원 비용이 생긴다. repository의 한 버전이 전체 함수를 제공하므로 일부 함수만 업그레이드한 것처럼 소비자를 방치하지 않는다.

Deployed 설정 변경은 restart와 중단을 만들 수 있다. in-memory cache는 restart 때 사라지며 영속 상태가 아니다. 외부 OAuth token 갱신이 필요한 워크플로는 deployed의 제한을 확인하고 serverless를 검토한다.

Function-backed Action은 기본적으로 일관된 Ontology snapshot을 사용한다. 외부 source 함수의 실시간 조회와 snapshot 적용은 다른 문제이며 긴 실행의 stale snapshot 오류와 외부 효과를 함께 검토한다. 자원 한도를 늘려 데이터 일관성 문제를 해결했다고 보지 않는다.

## 출처

- [Palantir, enforced-limits](https://www.palantir.com/docs/foundry/functions/enforced-limits)
- [Palantir, manage-functions](https://www.palantir.com/docs/foundry/functions/manage-functions)
- [Palantir, functions-deployed](https://www.palantir.com/docs/foundry/functions/functions-deployed)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
