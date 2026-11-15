---
tags: [aws, sagemaker, ml-platform, iam, cost]
status: done
verified_at: 2026-11-15
category: "Infrastructure - AWS"
aliases: ["SageMaker Studio Domain Setup", "SageMaker Studio 도메인 설정"]
---

# SageMaker Studio 도메인 설정

Amazon SageMaker AI의 도메인은 Studio 사용자 목록, 인증 방식, 실행 역할, 네트워크와 저장소 설정을 묶는 단위다. 데이터 과학 팀이 쓰는 개발 환경(JupyterLab, Code-OSS 기반 Code Editor)은 이 도메인 아래의 사용자 프로필과 공간(space)으로 실행된다. 이 문서는 Studio Classic이 아닌 갱신된 Studio 경험의 공식 안내를 기준으로 한다.

## 빠른 설정과 조직용 설정

| 선택 | 자동으로 정해지는 것 | 맞는 경우 |
|---|---|---|
| 단일 사용자(Quick setup) | 도메인과 사용자 프로필 이름, `AmazonSageMakerFullAccess`를 붙인 새 실행 역할(갱신된 Studio가 기본이면 `AmazonS3FullAccess`와 Canvas 정책 2개도 붙는다), S3 버킷, 기본 VPC 같은 공개 VPC | 개인 실험과 첫 사용 |
| 조직용(Custom setup) | 인증 방식, ML 활동별 역할, 기본 앱, UI 숨김 항목, 네트워크, KMS 키와 공간 디스크 크기를 직접 정한다 | 팀 운영, 사설 네트워크와 암호화 요구가 있는 환경 |

빠른 설정은 시작이 빠른 대신 넓은 권한의 역할과 공개 VPC를 쓴다. 이를 팀 환경으로 그대로 넓히지 않는다(적용 제안).

## 인증과 실행 역할

- **IAM Identity Center**: 사용자가 AWS access portal로 Studio에 들어간다. SageMaker AI는 Identity Center의 조직 인스턴스만 지원한다.
- **IAM**: 사용자가 계정에 로그인한 뒤 SageMaker AI 콘솔에서 도메인에 들어간다. 특정 VPC, interface endpoint나 IP 주소에서만 도메인 접근을 허용하려면 IAM 인증이어야 하며, Identity Center 인증 도메인은 이 제한을 지원하지 않는다.
- 공식 페이지는 IAM 인증 도메인에 Identity Center를 SAML 애플리케이션으로 붙여 접근 제한과 중앙 로그인을 함께 쓰는 대안을 안내한다(안내된 블로그는 Studio Classic 기준).
- `UpdateDomain` API에는 인증 방식 파라미터가 없고, CloudFormation의 `AWS::SageMaker::Domain`은 `AuthMode` 변경을 Replacement(도메인 교체)로 명시한다. 접근 경로 제한이 필요할지 도메인을 만들기 전에 정한다.
- 실행 역할은 Studio 안에서 다른 AWS 자원에 접근할 때 쓰는 권한이다. `AmazonSageMakerFullAccess`는 출발점이며, 사용하는 서비스와 자원으로 좁힌다. 사용자를 도메인에 할당하면 기본 실행 역할을 받고, 사용자별로 바꿀 수 있다.

## 비용과 자원 관리

| 기능 | 동작 | 확인할 조건 |
|---|---|---|
| 유휴 종료(idle shutdown) | 앱이 유휴 기준을 만족하면 앱을 종료한다. JupyterLab은 활성 커널과 터미널이 없을 때, Code Editor는 편집, 파일 열람과 터미널 사용이 없을 때 유휴로 본다 | 앱 종류마다 따로 설정한다. 도메인과 사용자 프로필 수준에서 설정하며 사용자 프로필 설정이 우선한다. SageMaker Distribution 이미지 v2.0 이상이 필요하고, 이전 버전은 lifecycle configuration으로 자동 종료를 관리한다. 실행 중인 앱은 재시작해야 설정이 적용되고, 시간을 비우면 기본값은 10,080분이다 |
| 공간 디스크 | 공간의 EBS 기본 크기와 최대 크기를 도메인에서 정한다 | 빠른 설정의 기본값은 5 GB, 최대 100 GB다 |
| 사용자 정의 태그 전파 | 도메인, 사용자 프로필과 공간의 태그를 Studio, JupyterLab, Code Editor와 Canvas에서 만든 SageMaker 자원에 붙인다 | 기본값은 꺼져 있고 도메인 수준에서만 켠다. AWS가 붙인 시스템 태그는 전파되지 않는다. 자원당 태그 50개 한도를 넘으면 자원 생성이 실패하며, 자동으로 붙는 도메인, 사용자 프로필과 공간의 ARN 태그도 이 수에 포함된다 |

유휴 종료는 앱을 종료하므로 메모리에 있던 커널 상태가 다음 시작 때 남아 있다고 가정하지 않는다. 공식 페이지는 종료 뒤 보존되는 범위를 따로 설명하지 않는다. 태그 전파는 팀이나 프로젝트별 비용 배분에 쓰되, 실제 비용 보고서에서 태그가 활성화되어 집계되는지는 별도로 확인한다(적용 제안).

## 환경 구성

- **Lifecycle configuration**: JupyterLab과 Code Editor 공간이 시작될 때 패키지 설치, 확장 설정, 데이터 미리 받기 같은 스크립트를 실행한다. 관리자가 붙인 built-in 구성은 공간이 시작될 때마다 실행되고, 그다음 공간 수준에서 사용자에게 미리 선택되어 있고 사용자가 바꿀 수 있는 default 구성이 실행된다. 둘 사이의 패키지 충돌은 해결해 주지 않는다.
- **사용자 정의 이미지**: 기본 환경인 SageMaker Distribution 대신 특정 언어나 라이브러리 버전이 필요할 때 자체 이미지를 가져온다.
- **Docker와 local mode**: 기본으로 꺼져 있고 도메인의 `DockerSettings`에서 켠다. 켠 뒤 새로 만든 앱에만 적용된다. 단일 인스턴스 작업만 가능하고, 네트워크는 `sagemaker`만 쓰며, 포트 매핑과 privileged 모드를 쓸 수 없다. rootless Docker를 켜지 않은 `VpcOnly` 도메인에서는 이미지 push와 pull이 고객 VPC가 아니라 서비스 VPC를 거치고, 신뢰 계정 목록(기본값과 `VpcOnlyTrustedAccounts`)의 ECR만 지원한다. rootless Docker를 켜면 이 목록은 무시되고 고객 VPC를 거쳐 그 VPC가 닿는 레지스트리에 접근한다.
- **공유 공간**: 도메인의 모든 사용자 프로필이 접근하고 도메인의 VPC 설정을 따른다. 문서는 노트북 동시 편집이 2~5명의 작은 그룹에 맞는다고 안내한다. 같은 페이지 안에 실시간 협업을 지원하는 앱의 범위가 서로 다르게 적혀 있으므로 쓰려는 앱에서 먼저 시험한다.

## 네트워크와 암호화

- 조직용 설정에서 공개 인터넷 접근이나 `VpcOnly`를 고른다. `VpcOnly`에서는 SageMaker API와 runtime의 interface endpoint나 NAT gateway가 없으면 노트북을 실행할 수 없고, 보안 그룹도 아웃바운드 연결을 허용해야 한다. 서브넷, endpoint와 보안 그룹 설계는 [[SageMaker-Studio-VPC-Networking|SageMaker Studio의 VPC 네트워크 경계]]를 따른다.
- EFS와 EBS를 암호화한 KMS 키는 나중에 바꿀 수 없다. 도메인의 네트워크 접근 유형은 실행 중이거나 대기, 삭제 중인 앱이 없을 때만 바꿀 수 있다.
- 콘솔에서 만든 설정은 SageMaker API로도 같은 값을 만들 수 있으므로, 팀 환경은 코드로 재현할 수 있게 관리한다(적용 제안).

## 적용 전 확인할 것

아래는 문서의 설정 조건을 적용한 점검 제안이다. 실제 AWS 계정에서 도메인을 만들어 시험한 결과는 아니다.

1. 인증 방식을 정하기 전에 접근 경로 제한이 필요한지 확인한다.
2. 실행 역할을 넓은 관리형 정책으로 시작했다면 실제 사용하는 S3 경로와 서비스로 좁힌 뒤 학습과 추론 호출이 되는지 확인한다.
3. 유휴 종료 시간과 이미지 버전, 태그 전파와 태그 한도를 함께 점검한다.
4. Docker를 켤 계획이면 `VpcOnly` 여부와 사용할 레지스트리를 먼저 정한다.

## 출처

- [AWS, Use quick setup for Amazon SageMaker AI](https://docs.aws.amazon.com/sagemaker/latest/dg/onboard-quick-start.html)
- [AWS, Use custom setup for Amazon SageMaker AI](https://docs.aws.amazon.com/sagemaker/latest/dg/onboard-custom.html)
- [AWS, UpdateDomain API Reference](https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateDomain.html)
- [AWS, Idle shutdown](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-updated-idle-shutdown.html)
- [AWS, Custom tag propagation](https://docs.aws.amazon.com/sagemaker/latest/dg/custom-tags.html)
- [AWS, Lifecycle configurations within Amazon SageMaker Studio](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-lifecycle-configurations.html)
- [AWS, Bring your own image (BYOI)](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-updated-byoi.html)
- [AWS, Local mode support in Amazon SageMaker Studio](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-updated-local.html)
- [AWS, Getting started with local mode](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-updated-local-get-started.html)
- [AWS, Set up idle shutdown](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-updated-idle-shutdown-setup.html)
- [AWS CloudFormation Template Reference, AWS::SageMaker::Domain](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sagemaker-domain.html)
- [AWS, Collaboration with shared spaces](https://docs.aws.amazon.com/sagemaker/latest/dg/domain-space.html)
- [Get started with Amazon SageMaker Studio — Amazon Web Services](https://www.youtube.com/watch?v=XTc__VP6uQ4) — 도메인 설정 순서의 학습 계기. 화면 설정값은 공식 문서와 대조한 범위만 옮겼다.

## 관련 문서

- [[SageMaker-Studio-VPC-Networking|SageMaker Studio의 VPC 네트워크 경계]]
- [[SageMaker-HyperPod-Inference|HyperPod 추론]]
- [[IAM-Policy|IAM 정책 평가와 요청 경로 조건]]
- [[ECR|ECR]]
