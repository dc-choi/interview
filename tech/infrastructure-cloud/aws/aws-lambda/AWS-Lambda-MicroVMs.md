---
tags: [aws, lambda, microvm, firecracker, sandbox, serverless, stateful, snapshot]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["AWS Lambda MicroVMs", "Lambda MicroVMs", "람다 마이크로VM", "격리 샌드박스"]
---

# AWS Lambda MicroVMs — 상태 보존형 격리 샌드박스

사용자나 AI가 생성한 코드를 **VM 수준으로 격리된 상태 보존 환경**에서 실행하는 서버리스 컴퓨팅 프리미티브. 기존 Lambda Function이 무상태(stateless) 이벤트 요청-응답에 맞춰진 것과 달리, MicroVM은 **세션 단위로 살아 있는 격리 환경**을 제공한다. 코딩 에이전트, 대화형 코딩 환경, 데이터 분석 플랫폼, 취약점 스캔처럼 신뢰할 수 없는 코드를 멀티테넌트로 돌려야 하는 워크로드가 타깃이다.

## 핵심 특성과 적용 조건

격리, 빠른 기동과 상태 보존을 함께 제공한다. 다만 스냅샷 호환성, 수명 제한과 과금 구조를 고려해야 한다.

- **강한 격리** — 요청, 세션, 테넌트마다 독립된 가상머신. 컨테이너 공유 커널 격리보다 강한 하이퍼바이저 경계
- **스냅샷 기반 실행, 재개** — 사전 초기화한 상태를 복원해 초기화 지연을 줄인다. 실제 기동 지연은 애플리케이션으로 측정한다
- **생명주기, 상태 직접 제어** — suspend/resume, 세션 전체에서 메모리, 디스크, 실행 중 프로세스 보존

## Firecracker 기반 격리

MicroVM은 Firecracker 마이크로VM 위에서 실행된다. 게스트 커널을 분리하는 VM 경계를 사용하며, 사용자가 격리 환경의 생명주기를 직접 제어한다. 격리가 애플리케이션 권한이나 네트워크 접근 정책을 대신하지는 않는다.

## Image-then-Launch 모델 (스냅샷)

기동 비용을 매 호출이 아니라 **이미지 빌드 시점 한 번**으로 옮기는 것이 동작의 핵심이다.

1. **이미지 정의** — Dockerfile과 코드를 zip 아티팩트로 S3에 올린다
2. **초기화, 스냅샷** — Lambda가 Dockerfile을 실행하고 애플리케이션을 초기화한 뒤, **실행 중인 환경의 메모리와 디스크 상태를 Firecracker 스냅샷으로 캡처**한다 → MicroVM Image
3. **스냅샷에서 시작** — 새 MicroVM은 이미지의 초기화된 상태에서 시작하고, suspend 이후에는 해당 세션의 상태를 복원한다. 복원과 훅 실행에 걸리는 시간까지 포함해 기동 지연을 측정한다

이미지 안의 고유 ID와 난수 시드는 여러 MicroVM에 복제될 수 있다. `/run` 훅에서 세션별 값을 초기화하고, `/resume` 훅에서는 만료된 자격 증명과 끊긴 연결을 갱신한다. 이미지 생성 때 준비와 복원 후 동작을 확인하는 `/ready`, `/validate` 훅과 구분한다.

## Suspend / Resume — 생명주기 제어

상태를 보존하면서 유휴 컴퓨트 비용을 줄이는 것이 차별점이다.

- **자동(idle policy)** — 예: 15분 비활성 시 자동 suspend, 다음 요청 도착 시 자동 resume
- **프로그래매틱** — API로 직접 suspend, resume 호출
- **suspend 효과** — 메모리, 디스크, 실행 중 프로세스를 보존하고, suspended 상태에서는 컴퓨트 요금이 발생하지 않는다. 단, 스냅샷 스토리지 요금은 발생한다. resume 후 보존된 상태를 복원해 세션을 이어간다
- **최대 수명 설정** — 실행 가이드의 `maximumDurationInSeconds` 설명은 running과 suspended 상태를 포함해 최대 28,800초(8시간)로 제한한다. 일시 중지한 시간을 빼고 8시간을 추가 사용할 수 있다고 가정하지 않는다

## 네트워킹, 접근

- MicroVM마다 **고유 ID + 전용 엔드포인트 URL**을 할당받아 직접 주소 지정
- **인증** — CLI로 단기 인증 토큰을 발급해 `X-aws-proxy-auth` 헤더에 실어 HTTPS 요청. 세션 친화적 프로토콜(HTTP/2, gRPC, WebSocket 등) 위로 상호작용

## 표준 Lambda Functions vs Lambda MicroVMs

아래 Functions 열은 표준 호출 실행 모델이다. Managed Instances와 Durable Functions의 실행 특성은 별도로 확인한다.

| 축 | Lambda Functions | Lambda MicroVMs |
|---|---|---|
| 워크로드 | 이벤트 구동 요청-응답 | 세션, 멀티테넌트 격리 실행 |
| 상태 | 무상태(stateless) | 상태 보존(stateful), 세션 전반 유지 |
| 시간 제한 | 단일 호출 15분(900초) | 최대 수명 설정 8시간, suspended 포함 |
| 기동 | 새 환경 초기화 또는 기존 환경 재사용 | 초기화된 이미지 또는 세션 스냅샷 복원 |
| 생명주기 제어 | 없음(AWS가 정리) | suspend/resume 직접 제어 |
| 격리 단위 | 재사용 가능한 execution environment. 동시 호출은 별도 환경에서 처리 | 세션당 micro-VM(노출, 제어) |
| 접근 | 트리거, 호출 모델 | 전용 URL + 토큰 인증 |

둘은 대체재가 아니라 용도 분화다. 짧은 무상태 처리는 Functions, **각 사용자, 세션마다 살아 있는 격리 환경**이 필요하면 MicroVMs.

## 스펙, 제약

| 항목 | 값 |
|---|---|
| 아키텍처 | ARM64 전용 |
| 기준 자원 | 메모리 0.5~8GB, vCPU 0.25~4 |
| 최대 자원 | 기준의 최대 4배, 최대 메모리 32GB와 16 vCPU |
| 최대 디스크 | 선택한 기준 자원에 따라 8GB, 16GB 또는 32GB |
| 최대 수명 설정 | 8시간, running과 suspended 포함 |
| 이미지 입력 | Dockerfile + zip 아티팩트(S3) |
| 리전(출시 시점 5개) | 버지니아 북부, 오하이오, 오레곤, 도쿄, 아일랜드 |

## 가격 모델

메모리 기준값으로 기준 CPU를 함께 정한다. 기본값은 2GB와 1 vCPU이며 피크는 8GB와 4 vCPU다. 모든 크기에 최대 32GB가 주어지는 것은 아니다.

- **running** 상태에는 기준 자원 요금과 기준을 초과해 실제 사용한 자원 요금이 초 단위로 발생한다. 사용량이 적어도 실행 중인 기준 자원 비용은 남는다
- **suspended** 상태에는 컴퓨트 요금은 없지만 스냅샷 스토리지 요금이 발생한다. 전체 비용에는 스냅샷 작업과 데이터 전송도 고려한다
- **terminated** 상태가 되면 해당 MicroVM 과금은 멈춘다. 별도로 보관하는 이미지와 다른 AWS 자원까지 자동 삭제된다는 뜻은 아니다

## 사용 사례

- **코딩 에이전트, AI 생성 코드 실행** — 신뢰할 수 없는 코드를 테넌트별 VM에 가둬 실행
- **대화형 코딩 환경** — 사용자별 세션 상태(파일 시스템, 프로세스)를 8시간까지 보존, 유휴 시 suspend로 비용 절감
- **데이터 분석 플랫폼** — 무거운 초기 로드를 스냅샷에 굽고, 세션마다 빠르게 resume
- **취약점 스캔** — 위험한 페이로드를 격리된 일회성 VM에서 실행

## 면접 체크포인트

- **MicroVM이 컨테이너 격리보다 강한 이유는?** → 공유 커널 위 네임스페이스, cgroup이 아니라 하이퍼바이저(KVM) 경계로 게스트 커널을 분리. 신뢰할 수 없는, 사용자/AI 생성 코드의 멀티테넌트 실행에 적합
- **near-instant launch는 어떻게 가능한가?** → cold boot(런타임 로드 + init)을 매번 하지 않고, 이미지 빌드 때 초기화 완료 상태를 Firecracker 스냅샷으로 떠두고 매 launch를 그 스냅샷 resume으로 대체
- **언제 Function 대신 MicroVM인가?** → 같은 세션의 상태 유지와 사용자별 격리 샌드박스가 필요할 때. 짧은 이벤트 처리는 표준 Function도 비교하며 비용은 호출 패턴과 유휴 시간으로 계산한다
- **스냅샷 모델의 함정은?** → 이미지에 고정된 고유값의 복제와 만료된 연결 문제. `/run`과 `/resume`에서 필요한 상태를 각각 갱신한다

## 출처

2026-10-07 공식 가이드로 자원 크기, 과금과 수명 설정을 대조했다. 수명은 실행 가이드의 파라미터 설명 기준이며 실제 계정에서 실행하거나 과금과 지연을 측정하지 않았다.

- [AWS Lambda, MicroVM images](https://docs.aws.amazon.com/lambda/latest/dg/microvms-images.html)
- [AWS Lambda, Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [Announcing Lambda MicroVMs: serverless compute environments with VM-level isolation and near-instant startup — AWS Compute Blog](https://aws.amazon.com/blogs/compute/announcing-lambda-microvms-serverless-compute-environments-with-vm-level-isolation-and-near-instant-startup/)
- [Run isolated sandboxes with full lifecycle control: AWS Lambda introduces MicroVMs — AWS Blog](https://aws.amazon.com/blogs/aws/run-isolated-sandboxes-with-full-lifecycle-control-aws-lambda-introduces-microvms/)
- [AWS introduces Lambda MicroVMs — What's New](https://aws.amazon.com/about-aws/whats-new/2026/06/aws-lambda-microvms/)
- [Developer Guide, AWS Lambda MicroVMs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-microvms-guide.html)
- [AWS Lambda — Running and using MicroVMs](https://docs.aws.amazon.com/lambda/latest/dg/microvms-launching.html)
- [Understanding the Lambda execution environment lifecycle — AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)

## 관련 문서

- [[AWS-Lambda|AWS Lambda 인덱스]]
- [[AWS-Lambda-Execution-Model|Lambda 실행 모델, Cold Start, Firecracker micro-VM]]
- [[Docker|Docker, 컨테이너 격리]]
- [[Multi-Stage-Build|멀티 스테이지 빌드]]
- [[Cloud-Service-Models|클라우드 서비스 모델, FaaS]]
