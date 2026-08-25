---
tags: [infrastructure, container, docker, jib, alpine]
status: index
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Container Image Build", "컨테이너 이미지 빌드와 베이스 이미지 선택"]
---

# 컨테이너 이미지 빌드와 베이스 이미지 선택

Dockerfile 단계 분리와 베이스 이미지 선택으로 최종 이미지의 크기, 재현성, 런타임 동작이 결정되는 계층을 묶는다. Dockerfile 없이 굽는 Jib 같은 빌드 도구 교체와, 베이스 이미지 계열이 바뀔 때 조용히 달라지는 명령 동작까지 포함한다.

- [[Multi-Stage-Build|멀티스테이지 빌드]]: 빌드 단계와 실행 단계 분리, 2-Stage 패턴, 모노레포 적용, 크기 비교와 909MB에서 513MB로 줄인 실무 사례
- [[Image-Size-Optimization|이미지 최적화]]: 베이스 이미지 선택 기준(publisher 신뢰, 지원 버전, digest 고정), 레이어와 캐시 최적화 기법, 측정과 안전한 정리 정책
- [[Jib-Java-Container|Jib]]: Dockerfile과 데몬 없이 빌드 도구가 직접 굽는 방식, 5계층 레이어링과 재현성, distroless 베이스, Dockerfile 방식과의 비교와 한계
- [[Alpine-vs-Debian-Image|Alpine vs Debian 베이스 이미지]]: busybox와 GNU coreutils 동작 차이, cp 심링크 처리 사례, musl과 glibc, 동작을 맞추는 법과 마이그레이션 함정

## 함께 볼 문서

- [[컨테이너(Container)|컨테이너]]
