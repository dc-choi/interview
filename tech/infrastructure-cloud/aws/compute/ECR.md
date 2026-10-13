---
tags: [infrastructure, aws, ecr, container, registry, docker]
status: done
category: "Infrastructure - AWS"
aliases: ["ECR", "Amazon ECR", "Elastic Container Registry"]
verified_at: 2026-09-30
---

# Amazon ECR (Elastic Container Registry)

AWS 내 **Docker 이미지 저장, 관리** 레지스트리 서비스. ECS/EKS/Fargate가 컨테이너를 실행할 때 가져오는 이미지 출처.

## 핵심

- AWS 관리형 OCI/Docker 레지스트리
- **IAM** 통합 — 인증, 권한이 AWS 자격증명으로 처리됨
- ECS, EKS, App Runner, Lambda 컨테이너 이미지 소스로 사용
- account마다 region별 private registry가 있으며 repository policy와 IAM policy를 함께 적용할 수 있음
- Docker client는 ECR authorization token으로 인증한다. 장기 access key를 image나 EC2 파일에 넣지 않고 workload role을 사용한다

## Push와 Pull 흐름

registry 주소는 `<account-id>.dkr.ecr.<region>.amazonaws.com`이다. repository 하나에 한 종류의 image를 두고 버전은 tag로 구분한다. image 참조 이름, `docker tag`의 의미와 태그 전략은 [[Docker-Image-Pipeline|Docker 이미지 파이프라인]]에 정리했다.

```bash
aws ecr get-login-password --region ap-northeast-2 \
  | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-2.amazonaws.com
docker build -t api .
docker tag api:latest <account-id>.dkr.ecr.ap-northeast-2.amazonaws.com/api:<tag>
docker push <account-id>.dkr.ecr.ap-northeast-2.amazonaws.com/api:<tag>
# 실행 서버도 같은 방식으로 로그인한 뒤 전체 주소로 pull
docker pull <account-id>.dkr.ecr.ap-northeast-2.amazonaws.com/api:<tag>
```

- Docker CLI는 IAM 인증을 직접 쓰지 못한다. `get-login-password`로 받은 token으로 registry마다 로그인하며, token은 12시간 유효하고 권한 범위는 token을 받은 IAM principal과 같다
- 로그인 대상, tag에 넣은 registry 주소, repository를 만든 Region이 모두 맞아야 한다. repository가 없으면 push가 실패한다(repository creation template을 둔 경우는 예외)
- 실행 서버(EC2)에서 로그인 없이 pull하면 권한 오류가 난다. 서버에 `aws configure`로 장기 access key를 저장하는 대신 EC2 instance profile에 pull 권한(`AmazonEC2ContainerRegistryPullOnly` 또는 대상 repository로 좁힌 고객 관리형 정책)을 주고 같은 `get-login-password` 흐름을 쓴다. 로컬과 CI의 push는 OIDC 같은 짧은 수명 자격 증명을 쓴다([[IAM-Best-Practices|IAM 모범 사례]])
- token이 만료되므로 며칠 뒤 `docker compose pull`만 실행하면 인증 오류가 날 수 있다. 배포 script에서 pull 직전에 로그인하거나 Amazon ECR Docker credential helper를 쓴다(helper는 MFA를 지원하지 않음)
- 코드 변경 배포는 image를 다시 build, push한 뒤 서버에서 `docker compose pull`, `docker compose up -d`로 container를 교체한다. 같은 tag를 덮어쓰면 실행 중인 image가 무엇인지 흐려지므로 tag immutability를 켜고 배포와 rollback 대상은 digest로 고정한다

## 저장 옵션

| 옵션 | 용도 |
|------|------|
| **Private repository** | 계정 단위 비공개 저장 |
| **Public Gallery** | 공개 저장 — ECR Public Gallery로 게시 |

## 부가 기능

- **이미지 취약점 스캐닝** (Basic / Enhanced — Inspector 통합)
- **tag immutability와 exclusion filter** — release tag 덮어쓰기를 막을 수 있음
- **수명 주기 정책** (Lifecycle Policy) — 오래된 이미지 자동 삭제

### 스캔 범위와 배포 승인을 구분한다

2026-10-13 공식 스캔 가이드 대조 기준이다. 이미지 push 성공과 취약점 검사 완료는 별도 상태다.

| 방식 | 검사 범위 | 실행 방식 |
|---|---|---|
| Basic | 운영체제 패키지 취약점 | 수동 또는 push 시 스캔 |
| Enhanced | 운영체제와 프로그래밍 언어 패키지 취약점, Amazon Inspector 통합 | 저장소 필터에 따라 push 시 또는 지속 스캔 |

Enhanced를 켜도 필터에 맞지 않는 저장소는 스캔 빈도가 `Off`이며 검사하지 않는다. 두 빈도의 필터가 함께 일치하면 지속 스캔을 우선한다. 지속 스캔도 설정된 검사 기간을 확인하며, 검사 자격이 만료된 이미지는 `SCAN_ELIGIBILITY_EXPIRED` 상태를 구분한다. 초기 활성화 때는 최근 14일 안에 push한 이미지만 인식하므로 오래된 이미지의 검사 여부를 따로 확인한다.

새 Basic scanning의 결과는 `DescribeImageScanFindings`로 조회한다. `DescribeImages`의 `imageScanFindingsSummary`와 `imageScanStatus`만으로 검사 결과를 판단하지 않는다.

배포 절차 설계 제안: 배포할 digest의 검사 완료 여부, 발견한 취약점과 허용 기준을 함께 확인한다. 검사하지 않은 이미지를 취약점이 없는 이미지로 취급하지 않는다. 스캔 결과를 배포 차단과 연결하는 정책은 별도로 구성하며, 이 절은 실제 이미지 검사나 배포 차단 시험의 결과가 아니다.

## Docker Repository 비교

| 레지스트리 | 종류 |
|-----------|------|
| Docker Hub | 퍼블릭 (private도 있음) |
| **Amazon ECR** | AWS 프라이빗 |
| **Amazon ECR Public Gallery** | AWS 퍼블릭 |

registry라는 역할은 Docker Hub와 같다. image에 실행 runtime이 들어 있어 서버에는 Docker만 두고 pull해서 실행하면 되므로, 서버에서 git clone 후 build하고 언어 runtime을 설치하던 배포보다 서버 이전과 환경 재현이 쉽다. ECR을 고르는 이유는 IAM 권한과 ECS, EKS, Lambda 같은 AWS 서비스 통합을 한 계정 안에서 관리하는 편의에 있고, 이미 다른 registry와 권한 체계를 쓰고 있다면 그대로 써도 된다.

## 시험 빈출 포인트

- ECS/EKS의 이미지 소스 → ECR
- 도커 이미지 취약점 스캐닝 → ECR Basic/Enhanced Scanning
- 오래된 이미지 자동 정리 → ECR Lifecycle Policy

## 관련 문서

- [[ECS]], [[EKS]], [[AWS-Lambda]]
- [[Docker-Image-Pipeline|Docker 이미지 파이프라인]] — 태그 전략, digest 배포, registry 인증 비교

## 출처

- [Amazon ECR 공식 문서 — Scan images for software vulnerabilities](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html)
- [Amazon ECR 공식 문서 — Scan images for OS and programming language package vulnerabilities](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-enhanced.html)
- [Amazon ECR 공식 문서 — 서비스 개요와 기능](https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html)
- [Amazon ECR 공식 문서 — Private registry](https://docs.aws.amazon.com/AmazonECR/latest/userguide/Registries.html)
- [Amazon ECR 공식 문서 — Tag immutability](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html)
- [Amazon ECR 공식 문서 — Private registry authentication](https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html)
- [Amazon ECR 공식 문서 — Pushing a Docker image](https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html)
- [Amazon ECR 공식 문서 — AWS managed policies](https://docs.aws.amazon.com/AmazonECR/latest/userguide/security-iam-awsmanpol.html)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — AWS ECR, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227947)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — AWS ECR 사용해보기 실습, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227948)
- [비전공자도 이해할 수 있는 Docker 입문/실전 — AWS EC2에 Spring Boot 배포하기 실습, JSCODE 박재성 강사](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227949)
