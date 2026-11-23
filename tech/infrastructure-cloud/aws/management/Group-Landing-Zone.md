---
tags: [infrastructure, aws, landing-zone, multi-account, governance, guardrails, security-operations]
status: done
verified_at: 2026-11-23
category: "Infrastructure - AWS"
aliases: ["Group Landing Zone", "그룹 통합 랜딩 존", "계열사 공통 클라우드 플랫폼", "멀티 계정 보안 기준 운영"]
---

# 그룹 통합 랜딩 존: 계열사에 공통 보안 기반을 계정 단위로 공급한다

지주회사나 그룹 IT 조직이 계정 구조, 공통 네트워크, 보안 기준과 로그 경로를 미리 만들고, 계열사에는 그 기준이 적용된 계정을 공급하는 방식이다. 계열사는 계정, 네트워크와 보안을 매번 다시 구성하지 않고 애플리케이션과 데이터에 집중한다. 랜딩 존과 Control Tower의 일반 개념, 통제 종류와 AFT는 [[AWS-Control-Tower|AWS Control Tower]], SCP와 RCP의 정책 평가는 [[AWS-Organizations|AWS Organizations]]를 따른다. 이 문서는 여러 법인을 한 기준으로 묶을 때의 구조와 운영 절차를 다룬다.

## 왜 그룹 단위로 묶는가

계열사가 각자 클라우드를 구축하면 다음 격차가 쌓인다. 2026년 9월 발표된 한진그룹의 진단을 일반화했다.

- **인력과 투자 편차:** IT와 보안 전담 인력의 차이가 보안 거버넌스의 불균형으로 이어진다. 솔루션 도입과 아웃소싱에 맡긴 영역에서는 주요 데이터 관리가 비기 쉽다.
- **운영 안정성:** 노후 장비의 지원 종료(EOS)와 밀린 업데이트가 취약점이 되고, 독립 환경과 거미줄식 인터페이스가 운영을 복잡하게 만든다.
- **표준 부재:** 구축 시점마다 표준이 달라 계열사별 품질 격차가 생기고, 그룹 전체의 인프라와 보안 상태를 보는 가시성이 없다.

그룹 랜딩 존은 이 격차를 공통 운영 환경으로 줄이는 선택이다. 대신 중앙 기준 하나가 모든 계열사의 업무를 막을 수 있으므로 예외 승인과 기준 변경 절차를 함께 설계한다(설계 판단).

## 구성: 공통 기반 계정과 업무 계정

| 구분 | 계정 예 | 역할 |
|---|---|---|
| 관리 | 관리 계정 | 조직, 계정과 정책의 중앙 관리 |
| 로그와 감사 | 로그 보관 계정, 감사 계정 | 원본 증적 보존, 구성 집계와 감사 |
| 네트워크 | 코어 네트워크, 경계(Perimeter), 검사(Inspection) 계정 | 계정 간 연결과 온프레미스 연결, 외부 진입 보호, 중앙 트래픽 검사 |
| 보안 | 보안 계정 | 탐지 결과의 중앙 집계와 분석 |
| 업무 | 계열사별, 환경(개발, 검증, 운영)별 계정 | 업무 서비스 운영 |

계정을 나누면 권한이 분리되고 장애나 침해가 다른 계열사와 환경으로 번지는 범위가 줄어든다. 새 업무 계정은 공통 기준을 적용한 뒤 조직에 편입한다.

Control Tower의 기본 구조는 랜딩 존 버전에 따라 다르다. 3.3 이하에서는 Security OU에 Log Archive와 Audit 공유 계정을 두며, 초기 설정 뒤에는 기존 계정을 보안이나 로그 계정으로 추가할 수 없다. 4.0부터는 Security OU가 필수가 아니어서 조직 구조를 직접 정하고, AWS Config, CloudTrail, AWS Backup 같은 서비스 통합 계정은 루트 바로 아래의 지정한 한 OU에 모은다(2026-11-23 공식 문서 확인). 그룹 표준 문서에는 계정 이름만 적지 말고 어느 랜딩 존 버전의 어떤 통합 계정에 대응하는지 함께 적는다(운영 제안).

## BASELINE: 계정을 만들 때부터 같은 기준

계정 공급은 빈 계정을 만드는 일이 아니라 검증된 보안 환경을 공급하는 일이다. 발표의 흐름은 다음과 같다.

1. **신청과 승인:** 계정 요청을 PR로 검토하고 승인된 요청만 처리한다.
2. **표준 계정 생성:** Control Tower와 AFT(Account Factory for Terraform)로 계정을 만든다. AFT의 적용 순서와 재적용은 [[AWS-Control-Tower|AWS Control Tower]]의 AFT 절을 따른다.
3. **설정과 연결:** 전 계정 공통 보안 기준을 적용하고 환경과 목적에 맞는 설정을 더한 뒤, 로그와 보안 신호를 관제와 거버넌스에 연결한다.

### 여러 계층의 가드레일을 겹친다

| 계층 | 수단 | 막는 것 | 빈틈 |
|---|---|---|---|
| 조직 | SCP, RCP, Control Tower 예방 통제(preventive) | 금지 행위와 비인가 접근 | 권한을 주지 않고 상한만 정한다. 적용 예외는 [[AWS-Organizations\|AWS Organizations]]를 따른다 |
| 주체 | IAM permission boundary | 사용자와 역할이 가질 수 있는 최대 권한 | 경계와 identity 정책이 함께 허용한 작업만 할 수 있다. 경계만으로는 권한이 생기지 않는다 |
| 배포 전 | Control Tower 사전 통제(proactive), Terraform 코드 검사 | 잘못된 구성의 배포 | Control Tower 사전 통제는 CloudFormation 스택 작업의 hook으로 동작해 콘솔, API, SDK와 다른 IaC 도구의 요청에는 걸리지 않을 수 있다 |
| 운영 중 | AWS Config, Security Hub CSPM | 기준에서 벗어난 상태의 지속 탐지 | 탐지는 차단이 아니므로 조치 경로를 따로 둔다 |

AFT처럼 Terraform으로 배포하는 환경에는 Control Tower 사전 통제가 걸리지 않을 수 있으므로, 파이프라인의 IaC 정책 검사로 배포 전 계층을 채운다(해석). 허용 범위 제한, 배포 전 검사, 운영 중 탐지의 세 겹을 하나의 체계로 본다. permission boundary의 평가는 [[IAM-Role-Federation|IAM Role과 Permission Boundary]]에 있다.

### 기준 변경은 검증한 뒤 단계적으로

공통 기준은 한 벌의 코드로 관리하고 바꿀 때는 다음 순서를 따른다(발표의 절차).

1. 공통 기준 코드의 변경을 PR로 검토하고 승인한다. 영향 분석과 현재 사용 패턴을 함께 본다.
2. 정책 스테이징 환경에서 허용해야 할 정상 작업이 허용되고 막아야 할 금지 작업이 차단되는지 둘 다 확인한다.
3. 낮은 위험 환경부터 적용하고 대상별 반영 상태와 영향을 확인한 뒤 적용 대상을 넓힌다.
4. 문제가 생기면 이전 코드 버전으로 되돌린다.

조직 수준의 거부 정책은 붙이는 즉시 하위 계정 전체의 동작을 바꾼다. 차단만 시험하고 정상 작업을 시험하지 않으면 보안 기준 변경이 업무 장애가 된다(해석). 리전 차단처럼 범위가 넓은 통제의 사전 조사는 [[AWS-Control-Tower|AWS Control Tower]]의 리전 차단 절을 따른다.

## ARCHITECTURE: 구조로 경계를 통제한다

진입, 검사, 출구를 공통 경로에 둔다.

- **진입 보호:** 외부 사용자의 웹 접속은 WAF로 보호한다.
- **중앙 연결과 검사:** Transit Gateway로 환경과 업무별 통신을 나누고, 검사 대상 트래픽은 Network Firewall을 둔 검사 VPC를 지나게 한다. 내부 사용자와 데이터센터의 접속(사용자, 사내망)은 SASE와 연계 구간을 거쳐 Transit Gateway로 들어온다.
- **출구 통제:** 인터넷으로 나가는 트래픽은 egress VPC의 NAT gateway로 모은다.
- **예외:** 경로별 정책을 적용하고 승인된 통신만 허용하며, 예외도 모니터링 대상에 둔다.

NAT 앞에서 검사해야 워크로드별 출발지 IP 규칙을 쓸 수 있다는 점과 중앙 검사 VPC의 `HOME_NET` 설정은 [[Shield-WAF-NetworkFirewall|Shield, WAF, Network Firewall]]에, 라우팅 분리는 [[Transit-Gateway|Transit Gateway]]에 있다. 중앙 검사 경로는 모든 계열사의 공유 의존성이므로 그 용량과 가용 영역 구성이 그룹 전체의 장애 범위를 정한다(해석).

## ASSURANCE: 지속적으로 확인하고 대응한다

### 분석 경로는 하나로, 원본 증적은 따로

- **탐지 결과:** GuardDuty(위협), Inspector(취약점), IAM Access Analyzer(외부 접근)의 finding을 Security Hub CSPM으로 계정과 리전별로 모으고 SIEM에서 그룹 단위로 분석한다. Security Hub CSPM은 이 서비스들의 finding을 받고, 교차 리전 집계로 연결 리전의 finding, 통제 준수 상태와 보안 점수를 home Region에서 본다. 집계의 전제와 누락 판정은 [[AWS-Security-Response-Automation|AWS 보안 대응 자동화]]를 따른다.
- **운영 로그:** WAF 웹 요청과 네트워크 트래픽 로그는 분석용 통합 저장소로 모은다.
- **원본 증적:** 발표의 구성은 CloudTrail을 로그 보관 계정, AWS Config를 감사 계정에 두어 분석본과 계정, 권한을 분리한다([[CloudTrail-Config|CloudTrail과 Config]]). 이 배치는 발표 자료 기준이며, Control Tower에서 Config 기록이 전달되는 계정과 감사 계정의 집계 역할은 사용하는 랜딩 존 버전의 공식 문서로 확인한다.

분석 사본은 가공되거나 지워질 수 있으므로 사고 조사와 감사에 쓰는 원본은 분석 담당자도 바꿀 수 없는 계정에 둔다(해석).

### 탐지에서 끝내지 않고 판단, 조치, 검증까지

| 단계 | 담당 | 내용 |
|---|---|---|
| 탐지 | 통합 관제 | finding과 관련 로그 확인 |
| 판단 | 통합 관제 | 오탐 여부, 심각도와 영향 범위 판단 |
| 조치 | 랜딩 존 운영 | 설정 변경, 리소스 조치 |
| 검증 | 통합 관제 | 결과 검증, 이벤트 종결 |

반복되는 지적은 기준 개선으로 등록하고, 보안 거버넌스의 승인을 받아 영향 분석, 정책 스테이징 검증과 단계적 배포를 거쳐 가드레일과 탐지 기준에 반영한다. 긴급한 위협은 사전에 승인된 범위 안에서 즉시 차단한 뒤 정식 조치로 전환하고, 해제 여부를 판단하며, 변경 이력을 남긴다. 탐지와 조치를 다른 조직이 맡으면 조치 요청과 결과 회신이 끊기지 않게 하는 절차가 핵심이 된다(해석). finding 분류와 실제 조치의 차이는 [[AWS-Security-Response-Automation|AWS 보안 대응 자동화]]에 있다.

## 계열사가 온보딩 전에 준비할 것

랜딩 존은 공통 기반이고 애플리케이션 고유의 위험은 계열사 몫이다. 발표는 이전 전 준비 항목으로 애플리케이션 현대화를 들었다.

- **API와 의존성:** 서비스 사이의 직접 의존을 줄이고 API를 체계적으로 관리한다.
- **IaC 운영:** 인프라를 코드로 운영한다([[IaC|IaC]]).
- **CI/CD:** 파이프라인에서 버전을 관리하고 취약점을 자동 점검한다.
- **데이터 거버넌스:** 데이터 암호화와 민감정보 태깅으로 통제와 가시성을 확보한다.

이전 계획과 cutover 검증은 [[Cloud-Migration-Strategies|클라우드 전환 전략]]을 따른다.

## 사례: 한진그룹 통합 랜딩 존 (회사 발표)

2026년 9월 발표 기준이다. 지주회사 한진칼이 그룹 표준을 정하는 역할로 전체 그룹사의 보안과 IT 환경을 점검한 것이 출발점이었다. 대한항공이 2024년 IaC와 운영 효율을 목표로 구축한 AWS 랜딩 존을 바탕으로, 2026년 보안과 거버넌스 확립을 목표로 그룹 전체 랜딩 존으로 확장했다. 발표가 든 산출물은 단계적 거버넌스 설계, 애플리케이션 현대화 표준 스택, 운영 런북과 복잡한 그룹사 비용 구조를 위한 비용 투명성이다. 계정 수, 비용 효과와 보안 지표 같은 정량 결과는 제시되지 않았다.

## 점검 항목

- 공통 기반 계정과 업무 계정의 경계, 신규 계정의 편입 조건이 문서로 있는가
- 가드레일의 각 계층이 어떤 배포 경로(콘솔, API, CloudFormation, Terraform)에 적용되는지 확인했는가
- 기준 변경 때 정상 작업 허용과 금지 작업 차단을 모두 시험하고 되돌리는 절차가 있는가
- 원본 증적이 분석 경로와 다른 계정에 있고 분석 담당자가 지울 수 없는가
- 탐지, 판단, 조치, 검증의 담당과 긴급 차단의 사전 승인 범위가 정해졌는가
- 공통 계정과 중앙 검사 경로의 비용을 계열사에 어떻게 배분하는가

## 출처

- [AWS, Proactive controls](https://docs.aws.amazon.com/controltower/latest/controlreference/proactive-controls.html) — 2026-11-23 CloudFormation hook 구현과 적용 범위 대조
- [AWS, How AWS Control Tower works](https://docs.aws.amazon.com/controltower/latest/userguide/how-control-tower-works.html) — 2026-11-23 랜딩 존 3.3 이하와 4.0의 Security OU, 공유 계정과 서비스 통합 OU 대조
- [AWS IAM, Permissions boundaries for IAM entities](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html)
- [AWS Security Hub, AWS service integrations with Security Hub CSPM](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-internal-providers.html)
- [AWS Security Hub, Understanding cross-Region aggregation in Security Hub CSPM](https://docs.aws.amazon.com/securityhub/latest/userguide/finding-aggregation.html)
- [한진그룹 통합 랜딩존: 그룹사를 위한 표준 클라우드 플랫폼 — 삼성SDS REAL Summit 2026 발표 자료, 한진칼, 삼성SDS](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/Track%204-1%20%ED%95%9C%EC%A7%84%EC%B9%BC%20%EC%B5%9C%EC%A0%95%ED%9D%AC%20%ED%8C%80%EC%9E%A5_%EC%82%BC%EC%84%B1SDS%20%EB%A5%98%EA%B8%B8%EC%84%B1%20%ED%94%84%EB%A1%9C_%ED%95%9C%EC%A7%84%EA%B7%B8%EB%A3%B9%ED%86%B5%ED%95%A9%EB%9E%9C%EB%94%A9%EC%A1%B4_20260907_vF.pdf) — 2026년 9월 발표. 그룹 단위 진단, 계정 구성, BASELINE, ARCHITECTURE와 ASSURANCE 절차, 사례에 반영했다. 회사 소개와 공동 프로젝트 홍보는 옮기지 않았다

## 관련 문서

- [[AWS-Control-Tower|AWS Control Tower]]
- [[AWS-Organizations|AWS Organizations와 SCP]]
- [[IAM-Role-Federation|IAM Role과 Permission Boundary]]
- [[Shield-WAF-NetworkFirewall|Shield, WAF, Network Firewall]]
- [[Transit-Gateway|Transit Gateway]]
- [[AWS-Security-Response-Automation|AWS 보안 대응 자동화]]
- [[CloudTrail-Config|CloudTrail과 Config]]
