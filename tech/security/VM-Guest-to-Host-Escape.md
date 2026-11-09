---
tags: [security, virtualization, kvm, linux-kernel, sandbox, vulnerability, patch-management]
status: done
verified_at: 2026-11-09
category: "보안(Security)"
aliases: ["VM Escape", "Guest-to-Host Escape", "가상 머신 탈출", "게스트 호스트 탈출", "PwnEscape", "CVE-2026-99999", "microVM 샌드박스", "공유 커널 격리"]
---

# VM 게스트에서 호스트로의 탈출 (Guest-to-Host Escape)

VM 격리는 하이퍼바이저 하나가 지키는 경계가 아니다. 게스트가 값을 정할 수 있는 데이터를 처리하는 호스트의 코드 경로 전부가 함께 경계를 이룬다.

## 정의

게스트에서 호스트로의 탈출(guest-to-host escape, VM escape)은 좁게는 가상 머신 안에서 실행되는 코드가 격리 경계를 넘어 호스트에서 실행이나 제어를 얻는 것이다. 호스트 메모리 노출과 호스트 중단은 그 앞 단계의 격리 침해이며, 피해는 아래처럼 단계로 나눠 판단한다.

| 단계 | 게스트가 얻는 것 | 영향 범위 |
| --- | --- | --- |
| 정보 노출 | 호스트 메모리나 다른 테넌트 데이터 읽기 | 호스트의 비밀, 같은 호스트의 다른 게스트 |
| 가용성 | 호스트 커널 중단 | 그 호스트의 모든 게스트 |
| 무결성과 실행 | 호스트 메모리 쓰기, 호스트 권한의 명령 실행 | 호스트 전체와 그 위의 테넌트 |

위협 모델은 게스트 안의 공격자가 특권을 가진다고 둔다. 2026-10 AWS 공지도 공격자를 게스트 안에서 특권 접근을 가진 행위자로 기술했다. 신뢰하지 않는 코드를 돌리는 샌드박스에서는 사용자가 게스트를 통제하는 것이 정상 상태이므로, 게스트 내부 보호가 이미 없는 상태를 출발점으로 삼는다(이 문서의 해석). 컨테이너는 호스트 커널을 직접 공유해 시스템 콜 표면이 경계가 되고([[Container-Linux-Internals|Linux 컨테이너 내부 구조]]), VM은 게스트 커널을 따로 두지만 호스트 커널이 게스트의 데이터를 계속 처리한다.

## 격리 경계를 보는 모델

하이퍼바이저와 VMM만 경계로 보면 공격 표면을 과소평가한다. 아래 표의 계층 구분은 이 문서의 해석이고, 근거 열은 출처로 확인한 내용이다.

| 호스트 계층 | 게스트가 통제하는 입력 | 근거와 사례 |
| --- | --- | --- |
| 하이퍼바이저(KVM) | VM exit를 일으키는 명령과 장치 접근, 중첩 가상화를 켜면 가상화 명령 | Vercel은 중첩 가상화 끄기를 포함한 외부 화이트박스 검토의 권고를 적용했다고 밝혔다 |
| VMM 장치 모델(Firecracker, QEMU) | virtio 큐 디스크립터, 장치 설정, 직렬 콘솔과 로그 출력 | Firecracker 운영 문서는 게스트가 로그와 직렬 출력량에 영향을 줄 수 있으므로 호스트가 이를 제한하라고 한다 |
| 호스트 커널 네트워크 | 패킷 내용, virtio-net 헤더의 체크섬 오프로드 메타데이터 | PwnEscape(아래 사례) |
| 호스트 스토리지 계층 | 블록 I/O(재사용 블록 읽기 포함) | 해제 뒤 재사용되는 블록은 호스트 쪽 상태다. 2026-10 Vercel 공개: 삭제된 샌드박스의 재활용 디스크 블록을 다른 샌드박스가 읽을 수 있었던 device-mapper 계층 결함. 커널 코드 결함인지 구성 문제인지는 이 문서에서 구분하지 않았다 |

장치 모델을 작게 유지하는 것은 필요하지만 호스트 커널 경로를 줄이지는 못한다. Vercel 샌드박스는 샌드박스마다 전용 게스트 커널을 가진 Firecracker microVM과 의도적으로 작게 만든 장치 모델을 쓰지만, PwnEscape 결함은 호스트 커널의 네트워크 스택에 있었다. 수정 커밋은 IPv4 단편화, 브리지 netfilter 단편화, NFQUEUE, `xt_CHECKSUM`과 xfrm 출력 경로에 같은 검사를 넣었다. 게스트 패킷이 지나는 호스트 기능이 여럿이므로 오프로드, 브리지와 netfilter, IPsec 같은 기능을 켤 때마다 경계가 넓어진다고 본다(이 문서의 해석).

## 검사 후 사용 결함 (TOCTOU)

검사한 값이 사용 전에 바뀌면 검사는 효력을 잃는다(time-of-check to time-of-use). 객체 수준의 개념과 복사 후 검증 원칙은 [[Defensive-Copy-Basics|방어적 복사]]에서 다룬다. 게스트와 호스트 경계에서는 두 형태로 나타난다(분류는 이 문서의 해석).

- **이중 읽기(double fetch):** 호스트가 게스트와 공유한 메모리에서 길이나 오프셋을 읽어 검사한 뒤 같은 위치를 다시 읽어 쓴다. 다른 vCPU가 그 사이 값을 바꾸면 검사하지 않은 값이 쓰인다. 대응은 한 번만 읽어 호스트 전용 사본을 만들고 그 사본만 검사하고 사용하는 것이다.
- **메타데이터가 지시하는 지연 쓰기:** 호스트가 헤더를 해석하고 검사한 뒤, 나중 단계가 게스트가 준 오프셋에 값을 쓴다. 쓰기가 이미 검사한 영역과 겹치면 앞의 검사 결과가 무효가 된다. PwnEscape가 이 형태다. 체크섬 오프로드에서 게스트는 체크섬 계산을 시작할 위치(`csum_start`)와 결과를 기록할 위치(`csum_start` 기준 오프셋 `csum_offset`)를 넘기고, 호스트가 소프트웨어로 체크섬을 완성할 때(`skb_checksum_help`) `csum_start + csum_offset` 위치에 값을 쓴다. 쓰기는 `csum_start` 앞으로 갈 수 없으므로 시작 위치를 검사하면 이미 해석한 헤더와의 겹침을 막을 수 있다.

PwnEscape는 경쟁 조건이 없는 결정적 흐름이다. 이 문서는 검사 뒤에 일어난 쓰기가 검사 결과를 무효로 만드는 경우까지 넓게 검사 후 사용 결함으로 묶는다(이 문서의 해석).

대응 원칙은 다음과 같다.

- 쓰기 위치와 길이를 정하는 메타데이터는 그 쓰기가 닿을 수 있는 구조와 대조해 사용 직전에 검사한다. PwnEscape 수정은 새 함수 `ip_check_csum_start()`로 체크섬 시작 위치가 IP 헤더 끝보다 앞이면 오류를 돌려 패킷을 버린다.
- 입구에서도 검사한다. 수정 커밋은 사용 지점 검사(`ip_check_csum_start()`)를 심층 방어로 넣었고, 입력 단계의 더 완전한 검증은 후속 작업이 필요하다고 밝혔다.
- 덜 신뢰하는 쪽이 영향을 줄 수 있는 메타데이터는 수락부터 완료까지 모든 연산을 거치는 동안 유효해야 한다(발견자 측 분석의 원칙). 제어 평면에도 같은 원칙이 적용된다. Vercel이 적용했다고 밝힌 외부 검토 권고는 microVM 안의 소프트웨어가 돌려준 값을 테넌트 입력으로 보고, 경계를 넘는 값을 서버 측에서 도출하거나 게스트가 닿지 못하는 키로 서명하라고 한다.
- 코드 리뷰에서는 게스트 값이 저장된 뒤 나중 단계에서 쓰이는 지점, 그 사이에 버퍼를 바꾸는 연산, 쓰기 지점마다 재검사가 있는지를 찾는다(적용 제안).

## 게스트를 패치해도 막지 못하는 이유

- 결함 코드는 호스트 커널에서 실행된다. 게스트는 악성 메타데이터를 만들어 보내는 쪽이고 위협 모델상 게스트 커널은 공격자가 통제하므로, 게스트 커널 버전과 관계없이 원하는 헤더를 만들 수 있다(이 문서의 해석).
- AWS 공지는 조치 대상을 호스트로 지정해 갱신된 커널 패키지를 호스트 시스템에 적용하고 재부팅하라고 했고, 우회책은 없다고 밝혔다.
- 게스트 커널 갱신은 게스트 내부 침해를 줄이는 별도 통제로 유지한다. Firecracker 운영 문서와 Vercel이 적용한 외부 검토 권고도 호스트와 게스트 커널을 모두 최신으로 유지하라고 한다.

## 운영 대응 체크포인트

공개 직후의 대응 절차와 기록은 [[Security-Incident-Response|보안 사고 대응]]을 따른다.

### 노출 판정

- 게스트 패킷을 호스트 커널로 받는 호스트를 찾는다. AWS 공지는 virtio-net과 KVM으로 VM을 직접 관리하는 구성(Firecracker 같은 VMM 포함)을 영향 대상으로 들었다.
- VM이 없는 경로도 본다. PwnEscape 논의에는 VM 없이 TUN이나 AF_PACKET으로 같은 메타데이터를 넣는 시나리오가 있었고, 수정 커밋의 Fixes 태그도 AF_PACKET의 GSO와 체크섬 오프로드 지원 커밋을 가리킨다. 신뢰하지 않는 코드가 이런 장치나 소켓을 만들 수 있는 컨테이너 호스트도 목록에 넣는다(운영 제안).
- 수정 여부는 배포판이 공지한 수정 패키지로 판정한다. 일부 배포판 커널은 수정만 백포트해 업스트림 번호가 낮아도 수정됐을 수 있으므로 업스트림 번호와 직접 비교하지 않는다. 업스트림 6.12 브랜치의 수정은 6.12.113이지만 AWS는 Amazon Linux 2023의 `kernel6.12-6.12.110-135.201.amzn2023`을 수정 버전으로 공지했다.
- 영향 범위 표기는 출처마다 다를 수 있다. CVE 레코드는 2.6.27 이후를, AWS 공지는 4.4~6.18을 적었다. 넓은 쪽으로 대상을 잡고 벤더 수정 패키지로 좁힌다(운영 제안).

### 라이브 패치와 재부팅

- 커널 라이브 패치는 재부팅 없이 중요한 함수를 고치는 수단이지만, 추적 가능한 함수만 패치할 수 있는 등의 제약이 있다(커널 livepatch 문서).
- 제공 여부는 배포판과 커널 빌드마다 다르므로 배포판별 상태를 확인한다. PwnEscape의 2026-11-02 상태는 아래 사례 절에 있다.
- 라이브 패치는 다음 재부팅 창까지의 다리로 쓴다. 실행 중인 커널에 실제로 적용됐는지 확인하고, 수정 커널로 재부팅하는 일정을 따로 잡는다(운영 제안).

### 롤링 재부팅

- 다른 호스트로 옮기지 않은 게스트는 호스트 재부팅 동안 멈춘다. 라이브 마이그레이션이 되면 게스트를 옮긴 뒤, 아니면 워크로드를 다른 호스트로 비운(drain) 뒤 재부팅한다(운영 제안).
- 재시작 전에 호스트당 중단 시간과 한 리전에서 동시에 내려갈 수 있는 호스트 수를 알리고, 리전마다 단계적으로 재시작하며 진행률을 갱신한다. 고가용성 데이터베이스 사용자에게는 primary와 standby 전환이 늘 수 있다고 미리 알린다(운영 제안, 2026-10 Fly.io의 진행 방식은 아래 사례 절).
- 신뢰하지 않는 멀티테넌트 워크로드를 돌리는 호스트부터 패치하고, 재시작이 끝날 때까지 새 워크로드는 패치된 호스트에 배치하며, 재부팅 뒤 실제로 실행 중인 커널 버전을 확인한다(운영 제안).
- 애플리케이션은 인스턴스와 복제본을 서로 다른 호스트에 두고, 호스트 하나를 잃어도 견딜 용량과 재시작 정책을 확인해 둔다(운영 제안).

### 책임 분담

- 관리형 컴퓨팅은 제공자가 호스트를 패치한다. 2026-10 공지에서 AWS는 AWS가 관리하는 EC2, Lambda와 Fargate는 영향이 없다고 밝혔다. EC2 인스턴스 안에서 KVM을 직접 돌리면 아래 자체 관리 범위다.
- 자체 관리 하이퍼바이저의 호스트 커널은 운영자 책임이다. 베어메탈이나 중첩 가상화 인스턴스에서 KVM과 Firecracker로 샌드박스를 직접 제공하면 그 커널의 패치와 재부팅도 운영자가 맡는다(이 문서의 해석, AWS 공지의 자체 관리 VM 범위). 경계 구분은 [[Cloud-Service-Models|클라우드 서비스 모델]]의 책임 공유 모델을, EC2 안의 중첩 가상화는 [[EC2-Compute|EC2 컴퓨팅]]을 참고한다.

## 에이전트 샌드박스의 다층 방어

호스트 커널 결함은 다시 나온다고 보고, 한 겹이 뚫려도 피해를 줄이도록 설계한다. Vercel이 적용했다고 밝힌 외부 검토 권고도 다음 제로데이를 가정하라는 원칙을 둔다. 아래 표 근거 열의 Vercel은 Vercel 글(2026-10-14)이 소개한 외부 검토 권고를 뜻하고, 폭발 반경 행의 사례는 같은 글의 자체 보고다.

| 통제 | 내용 | 근거 |
| --- | --- | --- |
| 게스트 값 불신 | 경계를 넘는 값은 서버 측에서 도출하거나 게스트가 닿지 못하는 키로 서명 | Vercel |
| 커널 패치와 표면 축소 | 호스트와 게스트 커널을 배포판 보안 공지에 맞춰 정기 패치, 빌드와 런타임 설정으로 커널 공격 표면 축소 | Firecracker 운영 문서, Vercel |
| 중첩 가상화 끄기 | 게스트에 가상화 확장을 넘기지 않는다 | Vercel. 게스트가 닿는 호스트 KVM 코드를 줄이려는 것이라는 설명은 이 문서의 해석 |
| jailer | VMM 프로세스를 cgroup과 namespace로 가두고 권한을 내린 전용 비특권 사용자로 실행, 가능하면 인스턴스마다 다른 uid와 gid | Firecracker 운영 문서, Vercel |
| seccomp | 가장 제한적인 Firecracker 기본 필터를 유지하고, 운영에서 사용자 정의 필터(`--seccomp-filter`)나 `--no-seccomp`를 쓰지 않는다 | Firecracker 운영 문서 |
| 테넌트 분리 | Firecracker 프로세스 하나에는 한 테넌트의 워크로드만 두고, 테넌트 분리가 필요한 운영에서는 SMT를 끄며, KSM(Kernel Samepage Merging)은 끈다 | Firecracker 운영 문서 |
| 호스트 egress 통제 | Firecracker는 네트워크 트래픽을 거르지 않으므로 호스트 방화벽으로 게스트 egress를 제한(예: 인스턴스 메타데이터 주소 차단) | Firecracker 운영 문서 |
| 폭발 반경 | 신뢰 수준별로 호스트 풀을 나누고 호스트 하나의 손실을 견딜 용량을 둔다. Vercel 구성을 재현한 연구자 장비에서는 패킷 두 개로 호스트가 멈춰 그 위의 모든 샌드박스가 내려갔다 | 사례는 Vercel(자체 보고), 통제는 적용 제안 |
| 탐지 | 호스트 커널 oops, 예기치 않은 재부팅과 비정상 egress를 보안 신호로 수집 | 운영 제안 |

에이전트의 파일, 네트워크와 도구 권한은 [[Agent-Execution-Isolation|에이전트 실행 격리]], microVM과 네트워크 경계를 겹친 구성은 [[AI-Training-Environment-Containment|AI 학습 환경의 격리]], Firecracker 기반 관리형 샌드박스는 [[AWS-Lambda-MicroVMs|Lambda MicroVMs]]에서 다룬다.

### 공유 커널 컨테이너에서 microVM으로 옮기는 이유

컨테이너는 호스트 커널을 함께 쓰므로 그 커널의 로컬 권한 상승 결함 하나가 컨테이너 탈출로 이어지면 같은 호스트의 다른 워크로드, 자격 증명과 네트워크까지 닿을 수 있다. OpenAI는 2026-11-04 Linux 커널 로컬 권한 상승 948건의 발견 결과를 공개하며, 단기와 중기에는 최신 패치가 없는 운영체제의 낮은 권한 계정을 자원이 많은 공격자에게 사실상 루트로 보고 샌드박스와 Firecracker, gVisor 같은 격리로 피해 범위를 줄이라고 권했다(발견 경과는 [[Coordinated-Vulnerability-Disclosure#대량 발견은 재현, 경로 검증과 패치를 붙여 보고한다|대량 발견의 보고]]).

Replit의 2026-11-04 글은 자율 에이전트가 늘며 이런 경계가 충분하지 않다고 보고, 호스트 커널을 공유하던 Docker 컨테이너 실행 환경을 샌드박스마다 커널을 둔 microVM 기반으로 다시 만든 사례다. 2026-11-09 대조했고 수치와 성과는 자체 보고다.

- **커널을 샌드박스마다 둔다:** 샌드박스마다 자체 Linux 커널을 가진 microVM을 Cloud Hypervisor(Firecracker와 rust-vmm 구성요소를 공유)와 KVM으로 띄운다. 게스트 커널이 뚫려도 공격자는 가상화 경계를 한 번 더 넘어야 하고, 사용자가 VM 안에서 Docker를 써도 공유 호스트의 권한을 내주지 않는다.
- **VM 안에도 층을 둔다:** 지원 서비스마다 microVM을 주는 대신 최소한의 runc 컨테이너로 나누고(오버헤드 대비 이득이 작다는 판단), namespace, seccomp, 장치 접근과 capability를 역할별로 정해 사용자 프로세스가 감시 에이전트의 권한을 물려받지 않게 한다. VMM은 capability가 없는 비특권 계정으로 돌린다. eBPF로 프로세스 실행, 파일 접근과 네트워크 활동을 관찰하고 Linux 보안 모듈(LSM) 훅으로 금지 동작을 막는다. 어느 LSM인지는 밝히지 않았다.
- **게스트 커널을 줄인다:** 배포판 설정 대신 tinyconfig에서 시작해 Bluetooth, 무선, USB와 디스플레이 드라이버를 빼고, 필요한 드라이버는 내장하며 모듈 적재를 끈다. 2026-06-01~11-04 공개된 Linux CNA CVE 6,211건 중 5,969건(96.1%)을 피했다고 집계했는데 내역은 공개 전 반영된 수정 4,375건과 설정으로 제외된 676건이고 나머지 근거는 글에 없다. Linux 커널 CNA는 수정이 stable 트리에 들어간 뒤 CVE를 자동 배정하므로, 앞의 수는 갱신 주기의 효과이고 표면 축소의 직접 효과는 설정 제외분으로 읽는다(해석).
- **이전과 속도:** 수억 개 프로젝트를 데이터 손실과 중단 없이 옮겼다고 밝혔지만 이전 절차는 공개하지 않았다. 고객 볼륨 연결과 지원 서비스 설정을 포함한 샌드박스 확보는 warm pool로 약 500ms라고 적는다.

## 트레이드오프

- **라이브 패치와 재부팅:** 라이브 패치는 중단 없이 노출 기간을 줄이지만 제공 범위와 기술 제약이 있다. AWS 권고처럼 수정 커널로 재부팅한 상태를 완료 기준으로 둔다(이 문서의 해석).
- **재부팅 속도와 용량:** 한 리전에서 여러 호스트를 동시에 내리면 노출 기간은 줄지만 동시 용량 손실과 고객 영향이 커진다(이 문서의 해석).
- **기능과 표면:** 중첩 가상화와 오프로드 같은 기능은 성능과 활용 범위를 넓히는 대신 게스트가 닿는 호스트 코드를 늘린다. 다만 AWS가 이번 결함에 우회책이 없다고 밝혔으므로, 벤더 확인 없이 기능 끄기를 완화책으로 간주하지 않는다(이 문서의 해석).
- **밀도와 격리:** 테넌트별로 호스트를 나누면 비용이 늘고, 공유하면 호스트 결함 하나의 영향 범위가 커진다(이 문서의 해석).

## 사례: PwnEscape (CVE-2026-99999), 2026-10

확인 수준 표기: [1차]는 CVE 레코드, 커널 커밋, 벤더 공지와 상태 기록으로 2026-11-02 확인한 내용, [자체 보고]는 발견자 측이나 당사자 게시물의 주장, [미확인]은 이 문서에서 확인하지 못한 내용이다.

- **원인 [1차]:** 잘못된 체크섬 메타데이터를 가진 패킷이 IPv4 스택에 들어오면 `skb_checksum_help`가 네트워크 헤더를 훼손할 수 있었다. 수정 커밋 `6785011f8b16`(ipv4: validate checksum_start before completing checksum)은 체크섬 완성 전에 시작 위치를 검사한다.
- **악용 경로 [자체 보고]:** 지연된 체크섬 쓰기가 이미 해석한 IPv4 헤더의 첫 바이트를 `0x45`(헤더 20바이트)에서 `0x4f`(60바이트)로 바꾸면, 단편화 코드가 28바이트인 선형 영역에서 60바이트 헤더를 복사해 호스트 메모리 32바이트가 패킷에 실려 나간다.
- **영향 범위 [1차]:** CVE 레코드는 2.6.27부터 영향으로 두고, 수정 커밋의 Fixes 태그는 TUN의 virtio_net_hdr GSO 지원 커밋과 AF_PACKET의 GSO, 체크섬 오프로드 지원 커밋을 가리킨다. 수정 버전은 5.10.272, 5.15.223, 6.1.190, 6.6.159, 6.12.113, 6.18.57, 7.2.11과 7.3이다. CVSS 3.1 기본 점수는 9.3(Critical)이고 벡터는 범위 변경(S:C)을 포함한다. 조회 시점의 CISA-ADP SSVC 악용(Exploitation) 값은 none이다.
- **벤더와 배포판 [1차]:** AWS는 2026-10-15 공지 2026-137-AWS에서 관리형 EC2, Lambda와 Fargate는 영향이 없고 virtio-net과 KVM 자체 관리 고객은 호스트에 수정 커널을 적용해 재부팅해야 하며 우회책은 없다고 밝혔다. Debian은 DSA-6568-1(trixie 6.12.113-1), DLA-4841-1(bookworm 6.1.190-1)과 DLA-4850-1(bookworm의 linux-6.12 6.12.113-1~deb12u1)로 수정했다. 2026-11-02 조회한 TuxCare 추적기에서 KernelCare 패치는 RHEL 8, 9와 Debian 13 등은 Released, Debian 12와 Amazon Linux 2는 Planned였다. Ubuntu와 RHEL의 자체 수정 공지는 [미확인]이다.
- **실증 범위 [자체 보고]:** Vercel은 호스트 메모리 노출은 자사 운영 샌드박스에서, 호스트 중단과 호스트 명령 실행은 Vercel 구성과 맞춘 연구자 소유의 KVM과 Firecracker 장비에서 시연됐고, 고객 데이터 접근을 보인 보고는 없었다고 밝혔다. 발견자 측도 어느 벤더의 운영 환경에서든 root 명령 실행을 주장하지 않는다고 적었다.
- **일정:** 2026-08-20 Vercel 샌드박스 공개 챌린지에 첫 메모리 노출 보고, 2026-09-04 커널 보안팀과 네트워킹 유지보수자에게 원인과 후보 패치를 비공개 전달, 2026-09-19~22 netdev 메일링 리스트에 공개 패치 제출과 수정(수정 커밋의 Closes 링크도 2026-09-22 netdev 게시물을 가리킨다. 병합된 수정은 발견자의 패치가 아니라 다른 개발자의 패치이며 발견자는 Reported-by와 Closes로 기록됐다), 2026-10-08 net 트리 반영, 2026-10-14 메인라인 병합 [자체 보고]. Debian 추적기는 메인라인 수정을 7.3-rc7로 표기했고 CVE 레코드는 2026-10-15에 게시됐다 [1차]. 비공개 보고에서 공개까지의 흐름은 [[Coordinated-Vulnerability-Disclosure|조율된 취약점 공개]]와 같이 본다.
- **호스팅 대응 [1차]:** Fly.io는 2026-10-16 16:22 UTC 플랫폼 전체 롤링 호스트 재시작을 공지하면서 호스트당 15~20분 중단과 한 리전의 여러 호스트 동시 중단 가능성을 알렸고, 관리형 Postgres(MPG) 사용자에게는 primary와 standby 전환이 늘 수 있다고 안내했다. 리전마다 단계적으로 재시작하며 진행률을 갱신했고, 2026-10-17 00:45 UTC 갱신에서 PwnEscape(CVE-2026-99999) 완화 조치라고 밝혔다. 03:48 UTC 모든 호스트 재시작을 마쳤고 05:15 UTC 해결로 닫았다(공지부터 약 13시간). 완료 뒤 남은 일부 저하 호스트는 따로 안내했다.
- **AI 활용 [자체 보고]:** 발견자 측은 사람이 연구를 이끌고 GPT-5.6 Sol을 소스 분석의 주 추론 엔진으로 써서 3일 안에 프리미티브를 찾았으며, API 토큰 비용은 700달러 미만이었다고 밝혔다. 악용 준비 시간이 줄어드는 흐름은 [[AI-Accelerated-Threat-Defense|악용 시간 단축과 AI 공격 대비]]에서 다룬다.

## 확인 질문

1. 하이퍼바이저와 장치 모델이 견고해도 호스트 커널 네트워크 스택의 결함이 VM 탈출이 되는 이유는 무엇인가? PwnEscape에서 게스트가 정한 값은 호스트의 어떤 연산을 지시했는가?
2. 이중 읽기와 메타데이터가 지시하는 지연 쓰기는 무엇이 다르고, 각각 어디에서 무엇을 검사해야 하는가?
3. 자체 관리 KVM 호스트 수백 대에 같은 유형의 결함이 공개됐다. 노출 판정, 라이브 패치 사용 여부, 재부팅 순서와 고객 공지를 어떤 근거로 정하며, 게스트 커널 갱신만으로 끝나지 않는 이유는 무엇인가?
4. 신뢰하지 않는 코드를 실행하는 서비스가 공유 커널 컨테이너에서 microVM으로 옮기면 커널 권한 상승 결함의 피해 범위는 어떻게 달라지고, VM 안에는 어떤 통제를 남겨야 하는가?

## 출처

- [PwnEscape: Guest-to-Host KVM Escape (CVE-2026-99999) — pwn.ai](https://pwn.ai/blog/pwnescape) — 발견자 측 분석. 메타데이터 겹침 쓰기, 32바이트 노출, 실증 범위, 일정과 비용은 자체 보고로 구분
- [Findings from the $1M Vercel Sandbox challenge — Vercel](https://vercel.com/blog/findings-from-the-1-million-dollar-vercel-sandbox-challenge) — 2026-10-14. 운영 샌드박스와 연구자 장비의 실증 구분, 고객 데이터 접근 보고 없음, 강화 권고, device-mapper 재활용 블록 결함
- [Issue in the Linux kernel virtio-net/TAP networking path affecting KVM-based hypervisors — AWS](https://aws.amazon.com/security/security-bulletins/2026-137-aws/) — 2026-137-AWS, 2026-10-15. 영향 커널 범위, 관리형 서비스 제외, 호스트 적용 후 재부팅, 우회책 없음, Amazon Linux 수정 패키지
- [ipv4: validate checksum_start before completing checksum — GitHub, torvalds/linux](https://github.com/torvalds/linux/commit/6785011f8b16abf40b1e9d8b2e332232b3e68822) — 수정 커밋의 설명, Fixes 태그와 변경 파일
- [CVE Program, CVE-2026-99999](https://www.cve.org/CVERecord?id=CVE-2026-99999) — 2026-10-15 게시. 영향 시작 버전, 브랜치별 수정 버전, CVSS와 CISA-ADP SSVC
- [Debian Security Tracker, CVE-2026-99999](https://security-tracker.debian.org/tracker/CVE-2026-99999)
- [TuxCare CVE Tracker, CVE-2026-99999](https://tuxcare.com/cve-tracker/cve/details/cve-2026-99999/) — 2026-11-02 조회 시점의 배포판별 KernelCare 상태
- [Fly.io Status, Platform Wide Rolling Host Reboots](https://status.flyio.net/incidents/01M52RAWMVC0NKEBRDKC3VXT3K) — 2026-10-16~17 갱신 기록
- [Firecracker, Production Host Setup Recommendations](https://github.com/firecracker-microvm/firecracker/blob/main/docs/prod-host-setup.md)
- [The Linux Kernel documentation, Livepatch](https://docs.kernel.org/livepatch/livepatch.html)
- [Hosting Companies Rebooted EVERYTHING Because of This Bug — YouTube, Better Stack](https://www.youtube.com/watch?v=0BNlnYN3ryE) — 2026-10-22 공개 영상, 계기 자료. 사실관계는 이 목록의 1차 출처로 대조했고 확인하지 못한 수치는 쓰지 않음
- [Inside Replit's New Sandbox Engine, Part 1: The Path to MicroVMs — Replit Frontier](https://frontier.replit.com/sandbox-engine-microvms-part-1/) — 2026-11-04 게시, 2026-11-09 구조, VM 안의 계층, 커널 설정, CVE 집계 방식과 이전 범위 대조. 자체 보고
- [A thousand fewer paths to root — OpenAI](https://openai.com/index/a-thousand-fewer-paths-to-root/) — 2026-11-04 게시, 2026-11-09 공식 한국어 페이지로 저권한 계정과 격리 권고 대조
- [The Linux Kernel documentation, CVEs](https://docs.kernel.org/process/cve.html) — 2026-11-09 수정 반영 뒤 자동 배정 원칙 확인

## 관련 문서

- [[Agent-Execution-Isolation|에이전트 실행 격리]]
- [[AI-Training-Environment-Containment|AI 학습 환경의 격리]]
- [[AWS-Lambda-MicroVMs|Lambda MicroVMs]]
- [[Container-Linux-Internals|Linux 컨테이너 내부 구조]]
- [[Defensive-Copy-Basics|방어적 복사와 TOCTOU]]
- [[Coordinated-Vulnerability-Disclosure|조율된 취약점 공개]]
- [[AI-Accelerated-Threat-Defense|악용 시간 단축과 AI 공격 대비]]
- [[Security-Incident-Response|보안 사고 대응]]
- [[Cloud-Service-Models|클라우드 서비스 모델]]
- [[EC2-Compute|EC2 컴퓨팅]]
