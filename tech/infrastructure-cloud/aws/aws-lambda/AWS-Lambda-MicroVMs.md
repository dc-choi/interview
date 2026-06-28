---
tags: [aws, lambda, microvm, firecracker, sandbox, serverless, stateful, snapshot]
status: done
category: "Infrastructure - AWS"
aliases: ["AWS Lambda MicroVMs", "Lambda MicroVMs", "람다 마이크로VM", "격리 샌드박스"]
---

# AWS Lambda MicroVMs — 상태 보존형 격리 샌드박스

사용자나 AI가 생성한 코드를 **VM 수준으로 격리된 상태 보존 환경**에서 실행하는 서버리스 컴퓨팅 프리미티브. 기존 Lambda Function이 무상태(stateless) 이벤트 요청-응답에 맞춰진 것과 달리, MicroVM은 **세션 단위로 살아 있는 격리 환경**을 제공한다. 코딩 에이전트, 대화형 코딩 환경, 데이터 분석 플랫폼, 취약점 스캔처럼 신뢰할 수 없는 코드를 멀티테넌트로 돌려야 하는 워크로드가 타깃이다.

## 핵심 명제 — 트레이드오프 없는 3요소

종래에는 셋 중 일부를 포기해야 했지만, MicroVM은 한꺼번에 제공하는 것이 핵심 가치다.

- **강한 격리** — 요청, 세션, 테넌트마다 독립된 가상머신. 컨테이너 공유 커널 격리보다 강한 하이퍼바이저 경계
- **거의 즉시 실행, 재개** — 스냅샷 기반이라 cold boot 없이 launch와 idle resume 모두 near-instant
- **생명주기, 상태 직접 제어** — suspend/resume, 세션 전체에서 메모리, 디스크, 실행 중 프로세스 보존

## Firecracker 기반 격리

MicroVM은 Firecracker 마이크로VM 위에서 돈다. Firecracker는 Lambda Function의 실행 격리에도 쓰여 월 15조 회 이상의 호출을 처리해온 경량 가상화 기술이다. KVM 위에 최소 기능만 갖춘 VMM을 올려 **VM의 보안 경계와 컨테이너 수준의 가볍고 빠른 기동**을 동시에 얻는다. MicroVMs는 이 격리 단위를 사용자가 직접 생명주기까지 제어할 수 있게 노출한 형태다.

## Image-then-Launch 모델 (스냅샷)

기동 비용을 매 호출이 아니라 **이미지 빌드 시점 한 번**으로 옮기는 것이 동작의 핵심이다.

1. **이미지 정의** — Dockerfile과 코드를 zip 아티팩트로 S3에 올린다
2. **초기화, 스냅샷** — Lambda가 Dockerfile을 실행하고 애플리케이션을 초기화한 뒤, **실행 중인 환경의 메모리와 디스크 상태를 Firecracker 스냅샷으로 캡처**한다 → MicroVM Image
3. **launch = resume** — 이후 그 이미지에서 뜨는 모든 MicroVM은 cold boot 대신 사전 초기화된 스냅샷에서 재개된다. 그래서 최초 launch도, idle 후 resume도 거의 즉시. 수 GB짜리 대화형 세션도 빠르게 온라인 복귀

스냅샷 모델이라 **초기화 중 고유 콘텐츠 생성, 네트워크 연결 수립, 임시 데이터 로드**를 하는 앱은 스냅샷 호환성을 위해 서비스가 제공하는 훅과 통합해야 할 수 있다. (스냅샷에 고정되면 안 되는 난수 시드, 커넥션 같은 부분 — Java Lambda의 SnapStart가 다루는 문제와 같은 맥락.)

## Suspend / Resume — 생명주기 제어

상태를 보존한 채 **유휴 비용을 끄는** 것이 차별점이다.

- **자동(idle policy)** — 예: 15분 비활성 시 자동 suspend, 다음 요청 도착 시 자동 resume
- **프로그래매틱** — API로 직접 suspend, resume 호출
- **suspend 효과** — 메모리, 디스크, 실행 중 프로세스를 보존하면서 과금되는 컴퓨트는 줄인다. resume 시 세션 상태가 그대로 살아 있어 사용자 입장에선 끊김 없이 이어진다
- **최대 8시간** — 한 MicroVM의 총 런타임 상한

## 네트워킹, 접근

- MicroVM마다 **고유 ID + 전용 엔드포인트 URL**을 할당받아 직접 주소 지정
- **인증** — CLI로 단기 인증 토큰을 발급해 `X-aws-proxy-auth` 헤더에 실어 HTTPS 요청. 세션 친화적 프로토콜(HTTP/2, gRPC, WebSocket 등) 위로 상호작용

## Lambda Functions vs Lambda MicroVMs

| 축 | Lambda Functions | Lambda MicroVMs |
|---|---|---|
| 워크로드 | 이벤트 구동 요청-응답 | 세션, 멀티테넌트 격리 실행 |
| 상태 | 무상태(stateless) | 상태 보존(stateful), 세션 전반 유지 |
| 최대 실행 | 15분(900초) | 8시간 |
| 기동 | cold start(런타임 로드, init) | 스냅샷 resume(near-instant) |
| 생명주기 제어 | 없음(AWS가 정리) | suspend/resume 직접 제어 |
| 격리 단위 | 호출당 micro-VM(내부) | 세션당 micro-VM(노출, 제어) |
| 접근 | 트리거, 호출 모델 | 전용 URL + 토큰 인증 |

둘은 대체재가 아니라 용도 분화다. 짧은 무상태 처리는 Functions, **각 사용자, 세션마다 살아 있는 격리 환경**이 필요하면 MicroVMs.

## 스펙, 제약

| 항목 | 값 |
|---|---|
| 아키텍처 | ARM64 전용 |
| 최대 vCPU | 16 |
| 최대 메모리 | 32GB |
| 최대 디스크 | 32GB |
| 최대 런타임 | 8시간 |
| 이미지 입력 | Dockerfile + zip 아티팩트(S3) |
| 리전(출시 시점 5개) | 버지니아 북부, 오하이오, 오레곤, 도쿄, 아일랜드 |

## 가격 모델

- **실행(running) 중인 시간만큼** 기본 컴퓨트 리소스에 과금. suspend 동안은 컴퓨트 과금이 빠지므로 유휴 비용이 절감된다
- 추가로 끌어 쓴 리소스는 **실제 사용량 기준**으로만 청구

## 사용 사례

- **코딩 에이전트, AI 생성 코드 실행** — 신뢰할 수 없는 코드를 테넌트별 VM에 가둬 실행
- **대화형 코딩 환경** — 사용자별 세션 상태(파일 시스템, 프로세스)를 8시간까지 보존, 유휴 시 suspend로 비용 절감
- **데이터 분석 플랫폼** — 무거운 초기 로드를 스냅샷에 굽고, 세션마다 빠르게 resume
- **취약점 스캔** — 위험한 페이로드를 격리된 일회성 VM에서 실행

## 면접 체크포인트

- **MicroVM이 컨테이너 격리보다 강한 이유는?** → 공유 커널 위 네임스페이스, cgroup이 아니라 하이퍼바이저(KVM) 경계로 게스트 커널을 분리. 신뢰할 수 없는, 사용자/AI 생성 코드의 멀티테넌트 실행에 적합
- **near-instant launch는 어떻게 가능한가?** → cold boot(런타임 로드 + init)을 매번 하지 않고, 이미지 빌드 때 초기화 완료 상태를 Firecracker 스냅샷으로 떠두고 매 launch를 그 스냅샷 resume으로 대체
- **언제 Function 대신 MicroVM인가?** → 세션 간 상태 유지, 15분 초과 장기 실행, 사용자별 격리 샌드박스가 필요할 때. 짧은 무상태 변환은 여전히 Function이 단순, 저렴
- **스냅샷 모델의 함정은?** → init 시점에 고정된 난수 시드, 커넥션, 타임스탬프가 모든 인스턴스에 복제되는 문제. SnapStart와 동일하게 resume 훅으로 재초기화 필요

## 출처

- [Run isolated sandboxes with full lifecycle control: AWS Lambda introduces MicroVMs — AWS Blog](https://aws.amazon.com/blogs/aws/run-isolated-sandboxes-with-full-lifecycle-control-aws-lambda-introduces-microvms/)
- [AWS introduces Lambda MicroVMs — What's New](https://aws.amazon.com/about-aws/whats-new/2026/06/aws-lambda-microvms/)
- [AWS Lambda MicroVMs — Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/lambda-microvms-guide.html)

## 관련 문서

- [[AWS-Lambda|AWS Lambda 인덱스]]
- [[AWS-Lambda-Execution-Model|Lambda 실행 모델, Cold Start, Firecracker micro-VM]]
- [[Docker|Docker, 컨테이너 격리]]
- [[Multi-Stage-Build|멀티 스테이지 빌드]]
- [[Cloud-Service-Models|클라우드 서비스 모델, FaaS]]
