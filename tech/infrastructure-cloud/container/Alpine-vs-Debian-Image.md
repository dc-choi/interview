---
tags: [infrastructure, docker, alpine, debian, busybox, coreutils]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Alpine vs Debian", "busybox vs coreutils", "Alpine cp 동작 차이"]
---

# Alpine vs Debian 베이스 이미지 (런타임 동작 차이)

같은 셸 스크립트라도 Alpine 기반 이미지와 Debian/Ubuntu 기반 이미지에서 **결과가 조용히 달라질 수 있다.** 이미지 크기 차이([[Image-Size-Optimization|크기 최적화]])는 잘 알려져 있지만, 더 위험한 건 명령어 동작 차이다. 원인은 두 이미지의 기반 구성이 다르기 때문이다.

- **Alpine**: musl libc + **busybox** 유틸리티 (임베디드용 최소 구현)
- **Debian/Ubuntu**: glibc + **GNU coreutils** (풀 기능 구현)

busybox는 바이너리 하나에 수십 개 명령을 욱여넣은 경량 구현이라, `cp`, `tar`, `sed`, `grep` 같은 명령의 일부 플래그와 기본 동작이 GNU 판과 미묘하게 다르다.

## 대표 사례: cp의 심볼릭 링크 처리

대상(destination)이 **기존 일반 파일을 가리키는 심볼릭 링크**일 때 `cp src dest`의 동작이 갈린다.

재현:

```sh
echo 1 > a
echo 2 > b
ln -s a c      # c는 a를 가리키는 심볼릭 링크
cat a b c      # → 1 2 1
cp b c
cat a b c
```

| 베이스 | `cp b c` 동작 | `cat a b c` 결과 | c의 상태 |
|---|---|---|---|
| **Debian/Ubuntu (GNU cp)** | 심링크를 **따라가** 원본 a에 b 내용을 써넣음 | `2 2 2` | 여전히 a를 가리키는 심링크 |
| **Alpine (busybox cp)** | 심링크를 **제거하고** 그 자리에 일반 파일로 복사 | `1 2 2` | 일반 파일로 교체됨 |

핵심: GNU cp는 대상 심링크를 **dereference(역참조)** 해 가리키는 파일에 쓰고, busybox cp는 대상 심링크 자체를 **교체**한다. a 파일을 공유하는 다른 경로가 있다면, 이 차이가 데이터 유무를 가르는 버그로 번진다.

### dangling symlink 차이

대상이 끊어진(존재하지 않는 대상을 가리키는) 심링크일 때, GNU cp는 위험하다고 판단해 **기본적으로 거부**하고 진단 메시지를 낸다. 이 안전 로직이 busybox에는 없다.

## 동작을 맞추는 법

Debian에서 Alpine처럼 "심링크를 교체"하고 싶으면, 대상을 먼저 명시적으로 없앤다.

```sh
cp --remove-destination b c    # GNU cp: 복사 전 대상(심링크)을 제거
# 또는
rm c && cp b c
```

반대로 busybox에서 GNU처럼 "링크를 따라가 쓰기"를 강제하려면 `-L`(dereference) 옵션을 고려한다. 다만 busybox는 옵션 지원 범위가 좁으므로 빌드 환경에서 실제 동작을 검증해야 한다.

## 그 외 흔한 Alpine 마이그레이션 함정

- **musl vs glibc**: 네이티브 모듈(bcrypt, sharp 등)이 musl과 호환되지 않을 수 있다. DNS resolver 동작도 glibc와 달라 멀티 A레코드, search 도메인 처리에서 차이가 난다.
- **busybox 텍스트 도구**: `sed -i`, `grep -P`(PCRE), `date` 포맷 등에서 GNU 확장 플래그가 없거나 다르게 동작.
- **셸**: 기본 셸이 `ash`(busybox)라 bash 전용 문법이 깨질 수 있다.

## 교훈, 면접 체크포인트

- 베이스 이미지를 Alpine ↔ Debian으로 바꾸면, 빌드/엔트리포인트 스크립트의 동작이 **에러 없이 결과만 달라질** 수 있다(특히 심링크, 와일드카드, 텍스트 처리).
- 근본 원인은 busybox(최소 구현)와 GNU coreutils(풀 기능)의 명령 동작 차이, musl과 glibc의 라이브러리 차이.
- 이미지 선택은 크기뿐 아니라 **런타임 정확성**까지 따져야 한다. 마이그레이션 시 핵심 스크립트는 양쪽에서 동작을 사전 검증하고 회귀 테스트로 고정.

## 출처
- [Alpine과 Debian Docker 이미지의 cp 동작 차이 — 인프랩 기술블로그](https://tech.inflab.com/202205-cp-behavior-difference-between-alpine-and-debian-docker-image/)
- [cp invocation — GNU Coreutils](https://www.gnu.org/software/coreutils/cp)

## 관련 문서
- [[Image-Size-Optimization|Image Size Optimization (Alpine 크기 트레이드오프)]]
- [[Docker|Docker]]
- [[Multi-Stage-Build|Multi-stage build]]
- [[Container-Entrypoint-Signals|Entrypoint와 시그널 (ash vs bash, PID 1)]]
