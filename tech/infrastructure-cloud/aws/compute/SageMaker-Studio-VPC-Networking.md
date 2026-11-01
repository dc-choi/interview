---
tags: [aws, sagemaker, vpc, networking, security]
status: done
verified_at: 2026-11-01
category: "Infrastructure - AWS"
aliases: ["SageMaker Studio VPC Networking", "SageMaker Studio 사설 네트워크"]
---

# SageMaker Studio의 VPC 네트워크 경계

Amazon SageMaker AI의 Studio에서 `VpcOnly`는 SageMaker가 제공하는 인터넷 경로를 끄고 고객 VPC의 네트워크 구성으로 통신을 제어하는 모드다. AWS 서비스와 단절된 에어갭이나 학습 컨테이너의 network isolation과 같은 설정이 아니다. 이 문서는 Studio Classic과 구분되는 갱신된 Studio 경험의 공식 안내를 기준으로 한다.

## 인터넷 차단과 필요한 통신을 함께 설계한다

| 경계 | 확인할 조건 |
|---|---|
| 서브넷 | `VpcOnly`는 private subnet만 쓸 수 있고 기본 tenancy VPC의 서브넷만 지정할 수 있다. 공식 안내는 사용자당 IP 2~4개를 권장하므로 도메인에 지정한 서브넷들의 가용 IP 합계와 비교한다 |
| AWS API | 인터넷을 허용하지 않으면 SageMaker API와 runtime, S3, SageMaker Studio(`aws.sagemaker.<region>.studio`), Projects를 쓰면 Service Catalog와 그 밖에 필요한 서비스의 interface endpoint를 준비한다. 이 endpoint에는 VPC의 보안 그룹도 연결한다 |
| 인터넷 허용 | 인터넷을 허용하려면 인터넷에 연결된 NAT gateway(예: internet gateway 경유)를 사용해야 한다. `VpcOnly` 이름만으로 인터넷 차단을 판정하지 않는다 |
| 추가 기능 | 사용하는 AWS 서비스의 경로를 준비한다. 인터넷을 허용하지 않는 구성에서 SageMaker Python SDK로 원격 학습을 실행하면 STS와 CloudWatch Logs(`logs`) endpoint도 만든다 |

보안 그룹의 송수신 규칙과 endpoint 연결을 함께 확인한다. 공식 안내는 사용자 프로필마다 별도 보안 그룹을 두고 같은 그룹에서 오는 통신을 허용하도록 권장한다. 도메인 수준 보안 그룹을 사용자 프로필에 재사용하는 것은 권장하지 않으며, 그 그룹이 자기 자신의 수신을 허용하면 도메인의 모든 앱이 다른 모든 앱에 접근할 수 있다고 설명한다. 과도한 수신 규칙은 VPC에 접근할 수 있는 사용자가 인증 없이 다른 프로필의 앱과 상호작용하게 할 수 있다. 보안 그룹의 수신과 송신 규칙에는 도메인과 EFS 볼륨 사이의 TCP 2049 NFS 통신과 같은 보안 그룹 안의 TCP 통신을 허용한다. 같은 그룹 안의 TCP 통신은 Jupyter Server 앱과 Kernel Gateway 앱의 연결에 필요하며 최소 8192-65535 포트를 허용해야 한다. Studio 앱이 시작됐다는 사실만으로 데이터 읽기, 원격 학습과 추론 호출까지 성공했다고 보지 않는다.

## 브라우저 경로와 컨테이너 경로는 별도다

공식 안내는 온프레미스에서 `VpcOnly` 도메인을 쓸 때 브라우저 호스트의 네트워크와 대상 VPC 사이의 사설 연결을 요구 사항으로 둔다. Studio UI가 사용자 프로필의 실행 역할에 연결된 임시 자격 증명으로 AWS API를 호출하기 때문이다. 실행 역할의 IAM 정책 조건이 구성된 VPC endpoint를 거친 호출만 허용하면 이 연결 없이는 Studio UI의 API 호출이 실패한다. 공식 안내는 AWS Site-to-Site VPN 또는 Direct Connect를 권장한다. 사내 방화벽에서는 Studio와 앱 URL, Jupyter의 WebSocket 통신도 확인한다.

SageMaker API/runtime의 interface endpoint는 VPC에서 서비스 API까지의 경로다. Private DNS를 켜고 VPC의 DNS hostnames와 DNS resolution이 모두 켜져 있으면 VPC 안에서는 기본 서비스 호스트명이 endpoint로 해석된다. 단, SageMaker Runtime은 클라이언트가 있는 가용 영역에 endpoint가 활성화되어 있어야 Private DNS 해석이 동작하며, 그렇지 않으면 DNS 해석이 실패할 수 있다. 온프레미스 네트워크에서 같은 이름을 쓰려면 Route 53 Resolver endpoint와 규칙으로 VPC 쪽 해석에 연결한다. 이 endpoint를 학습 또는 추론 컨테이너의 네트워크 설정으로 대신하지 않는다.

- **컨테이너 VPC 설정:** 학습 작업에 지정한 서브넷과 보안 그룹으로 네트워크 인터페이스를 만들어 학습 컨테이너에 붙이고, VPC 내부 자원에 연결하게 한다. 분산 학습에서는 같은 보안 그룹 구성원 사이의 수신을 허용해 같은 작업의 컨테이너끼리 통신하게 한다. EFA를 쓰는 인스턴스는 같은 보안 그룹과의 수신과 송신을 모두 전체 트래픽으로 허용한다. 인터넷이 없는 VPC에서는 학습 데이터가 있는 S3에 접근하도록 S3 VPC endpoint를 만든다.
- **Network isolation:** 학습 또는 추론 컨테이너는 S3를 포함한 어떤 서비스로도 송신 호출을 할 수 없고, 컨테이너 런타임에는 AWS 자격 증명이 제공되지 않는다. 다중 인스턴스 학습의 송수신은 같은 학습 작업의 컨테이너끼리로 제한된다. S3 데이터의 다운로드와 업로드는 SageMaker가 실행 역할로 컨테이너와 분리해 처리한다. VPC 설정을 함께 주면 이 전송은 VPC 서브넷을 거치지만, 컨테이너는 여전히 VPC 내부 자원과 인터넷에 접근하지 못한다.

## 적용 전 확인할 것

아래는 문서의 통신 경계를 적용한 점검 제안이다. 실제 AWS 환경에서 실행한 결과는 아니다.

1. 인터넷 없이 앱 시작, S3 접근, 학습 제출과 추론 호출을 각각 시험한다.
2. 노트북 내부 호출과 온프레미스 브라우저의 UI 호출을 구분해 실패 지점을 찾는다.
3. 허용한 데이터 접근과 금지한 외부 접근을 모두 시험한다. 접근 오류를 해결하려고 역할이나 보안 그룹을 포괄적으로 열지 않는다.
4. 외부 패키지 저장소가 필요한 설치 절차는 별도로 점검한다. 다른 조직의 사설 구성 사례만으로 현재 사용하는 모든 기능의 오프라인 동작을 보장하지 않는다.

## 출처

- [AWS, Connect Amazon SageMaker Studio in a VPC to External Resources](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-updated-and-internet-access.html)
- [AWS, Connect to SageMaker AI Within your VPC](https://docs.aws.amazon.com/sagemaker/latest/dg/interface-vpc-endpoint.html)
- [AWS, Give SageMaker AI Training Jobs Access to Resources in Your Amazon VPC](https://docs.aws.amazon.com/sagemaker/latest/dg/train-vpc.html)
- [AWS, Run Training and Inference Containers in Internet-Free Mode](https://docs.aws.amazon.com/sagemaker/latest/dg/mkt-algo-model-internet-free.html)
- [AWS, Access AWS services through AWS PrivateLink](https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-aws-services.html)

## 관련 문서

- [[VPC-Connectivity|VPC 연결과 endpoint]]
- [[IAM-Policy|IAM 정책 평가와 요청 경로 조건]]
- [[Bedrock-Private-Access|Bedrock 비공개 연결과 권한 경계]]
