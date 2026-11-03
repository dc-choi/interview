---
tags: [container, rootless, sandbox, agent]
status: done
verified_at: 2026-11-02
category: "Infrastructure - 컨테이너"
aliases: ["일회성 코드 실행과 rootless 격리"]
---

# 일회성 코드 실행과 rootless 격리

에이전트 코드와 도구 호출을 매번 새 실행 환경에 넣으면 이전 작업의 프로세스와 임시 파일이 다음 작업에 섞이는 일을 줄인다. 새 컨테이너, rootless 실행과 안전한 외부 접근은 각각 별도 조건이다.

## 확인할 경계

- user namespace는 컨테이너 내부 권한과 호스트 권한을 매핑한다. rootless라는 이름만으로 커널 취약점이나 허용된 파일 접근이 없어지지는 않는다.
- mount와 rootfs는 볼 수 있는 파일을 정한다. 호스트 디렉터리를 쓰기 가능하게 연결하면 그 데이터는 여전히 변경할 수 있다.
- network namespace와 egress 정책은 다르다. 분리된 네트워크에서도 외부 연결이 허용될 수 있다.
- seccomp, capability 제거와 cgroup 자원 제한은 서로 다른 공격 경로와 자원 고갈을 다룬다.
- 실행 종료 뒤 자식 프로세스, 마운트와 임시 데이터 정리를 확인한다. 외부 서비스에 보낸 요청은 컨테이너 삭제로 되돌아오지 않는다.

## 경량 런타임 사례

2026-11-02 확인한 kern은 Linux용 정적 바이너리로, 상주 데몬과 소켓 없이 rootless 컨테이너를 생성한다. macOS에서는 Linux VM이 필요하다. untrusted 프로필은 namespace, pivot_root, seccomp, capability와 자원 제어를 결합한다. 프로필 제공과 현재 호스트에서 모든 보호가 작동한다는 증명은 구분한다.

개발자가 발표한 `/bin/true` 생성과 종료 비교는 Docker 대비 단일 실행 약 80배, 200개 병렬 실행 약 130배다. 짧은 프로세스의 시작 비용을 재는 특정 장비와 워크로드의 결과이며, 장시간 계산 처리량이나 실제 에이전트의 전체 완료 시간으로 확대하지 않는다. 이번 정리에서는 설치와 격리 탈출 시험을 하지 않았다.

## 선택 기준

짧은 작업이 많은지, 이미지와 파일 준비 비용이 포함됐는지, 출력 및 자원 한도가 있는지 확인한다. 비신뢰 코드의 격리 강도가 핵심이면 편리한 실행 API와 별도로 커널 공유, VM 경계, 자격 증명과 네트워크 허용 범위를 검토한다.

## 출처

- [kern, 공식 소개와 벤치마크 조건](https://getkern.dev/) — 2026-11-02 기능 및 개발자 측정 범위 확인
- [getkern/kern, README와 소스](https://github.com/getkern/kern)

## 관련 문서

- [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]
- [[AI-Training-Environment-Containment|AI 실행 환경의 격리]]
