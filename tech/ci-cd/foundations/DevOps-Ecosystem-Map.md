---
tags: [cicd, devops, overview]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["DevOps Ecosystem Map", "DevOps 생태계 지도", "DevOps 로드맵 읽는 법"]
---

# DevOps 생태계 지도: 도구가 답하는 질문으로 읽기

DevOps는 직함이나 도구 묶음에 그치지 않고 소프트웨어를 만드는 사람과 운영하는 사람이 수명 주기 내내 함께 일하는 방식이다. 로드맵에 나열된 도구는 네 질문으로 묶인다. 어디서 실행하는가, 어떻게 안전하게 바꾸는가, 어떻게 내보내는가, 어떻게 계속 돌아가게 하는가. 이 문서는 영역마다 답하는 질문을 적고 상세 문서로 잇는 지도이며, 개념의 상세와 버전에 민감한 사실은 연결한 문서에 있다.

## 배경

개발 조직은 기능을 만드는 데, 운영 조직은 운영 환경을 안정되게 유지하는 데 집중해 왔다. 애자일은 변경을 작게 나눠 내보내게 했고 지속적 통합은 작업을 자주 합치게 했지만, 릴리스하고 운영하는 단계의 협업은 따로 풀어야 할 문제로 남았다.

2009년에 이 문제의식이 하나의 움직임으로 모였다. John Allspaw와 Paul Hammond가 Velocity 2009에서 Flickr의 개발과 운영 협력을 발표했고(10+ Deploys Per Day: Dev and Ops Cooperation at Flickr), 같은 해 벨기에 Ghent에서 Patrick Debois가 시작한 첫 devopsdays가 열렸다. 2026-11-17 발표 슬라이드 표지와 devopsdays.org 소개 페이지로 대조했다.

## 영역과 질문

| 영역 | 답하는 질문 | 핵심 개념 | 도구 예 | 상세 문서 |
|---|---|---|---|---|
| 인프라 | 어디서 실행하는가 | 자체 데이터센터, 클라우드와 혼합 가운데 선택. 계정 구조, 기본 네트워크, 접근 규칙, 중앙 로깅과 보안 통제를 갖춘 기반(랜딩 존), 개발과 테스트와 운영 환경의 분리, 코드로 정의한 인프라. 이미 있는 기반이면 그 안에서 필요한 부분만 더한다 | Terraform, CloudFormation, Bicep | [[Cloud-Definition-and-Deployment-Models\|클라우드 컴퓨팅의 정의와 배포 모델]], [[IaC\|IaC]], [[AWS-Control-Tower#랜딩 존 설계와 구현 수단을 구분한다\|랜딩 존 설계와 구현 수단(AWS)]] |
| 네트워크 | 누가 어디에 닿을 수 있는가 | 서브넷, 방화벽, DNS, 로드 밸런서, 기존 시스템과의 사설 연결. 필요한 경로만 열고 나머지는 닫는다 | AWS VPC, Azure Virtual Network, NGINX, HAProxy | [[VPC\|VPC]], [[VPC-Connectivity\|VPC 간 연결과 온프레미스 연결]], [[VPN-and-Private-Network\|VPN과 사설 네트워크]], [[DNS\|DNS]], [[Load-Balancer\|Load Balancer]] |
| 소스와 설정 | 무엇이 언제 누구에 의해 바뀌었는가 | 변경 이력과 리뷰, 환경별 설정을 코드와 분리, 인프라 정의와 파이프라인도 같은 저장소 흐름으로 리뷰 | Git, GitHub, GitLab, Bitbucket, Ansible | [[GitHub-Repository-Operations\|GitHub 저장소 운영]], [[Code-Review-Culture\|생산적 코드 리뷰 문화]], [[IaC#CI/CD, DevOps, GitOps 연결\|인프라 변경의 리뷰와 GitOps]] |
| CI와 테스트 | 이 변경이 동작하고 다른 것을 깨지 않았는가 | 자주 합치고 자동으로 빌드, 검사. 단위, 통합, 전체 흐름과 성능 테스트가 서로 다른 범위를 본다 | Jenkins, GitHub Actions, GitLab CI, Azure Pipelines | [[CICD-Basics\|CI/CD 기초]], [[CI-Tool-Selection\|CI/CD 도구 선택]], [[Test-Pyramid\|Practical Test Pyramid]], [[performance\|Performance Test]] |
| 패키지와 아티팩트 | 무엇을 빌드했고 테스트한 바로 그것을 내보내는가 | 외부 라이브러리의 버전 추적, 빌드 산출물 보관, 한 번 빌드한 산출물을 환경마다 그대로 옮기기 | Maven, Gradle, npm, JFrog Artifactory, Sonatype Nexus | [[CICD-Basics#빌드 재사용과 실행 환경의 동일성은 다르다\|빌드 재사용과 환경 동일성]], [[Dependency-Management\|의존성 관리]], [[Docker-Image-Pipeline\|Docker Image Build Pipeline]] |
| 컨테이너 | 환경이 달라도 같게 실행되는가 | 애플리케이션과 실행에 필요한 것을 이미지로 포장. 여러 장비에 걸친 배치, 재시작, 업데이트 조율과 용량 조절 | Docker, Kubernetes | [[Docker\|Docker]], [[K8s-Core-Workloads-and-Service-Architecture\|Kubernetes control plane과 node component]] |
| 보안 | 누가 접근할 수 있고 정보와 비밀 값을 어떻게 지키는가 | 사람과 서비스마다 필요한 권한만, 비밀 값은 코드 밖에 보관, 코드와 의존성과 컨테이너 스캔을 파이프라인에 연결, 전송 구간 보호와 로그의 민감 정보 노출 방지 | HashiCorp Vault, 클라우드 시크릿 서비스 | [[DevOps-vs-DevSecOps\|DevOps vs DevSecOps]], [[Secret-Management\|시크릿 관리]], [[Access-Control-Models\|접근 제어 모델]], [[Dependency-Vulnerability-Scanning\|의존성 취약점 스캔]] |
| 릴리스 | 어떻게 통제하며 운영에 넣는가 | 릴리스(내보내려는 버전)와 배포(환경에 올리는 과정)의 구분. 릴리스를 기능을 사용자에게 여는 일로 쓰는 용법은 따로 있다. 지속적 제공(Continuous Delivery)과 지속적 배포(Continuous Deployment), 필수 검사와 승인과 배포 시간대의 합의, 카나리, 롤링, 블루그린 | - | [[CICD-Basics#CD — Continuous Delivery vs Continuous Deployment\|Delivery와 Deployment의 차이]], [[CICD-Basics#코드 배포와 기능 릴리스 분리\|코드 배포와 기능 릴리스 분리]], [[Canary\|Canary 배포]], [[Blue-Green\|Blue-Green 배포]], [[Feature-Flag\|Feature Flag]] |
| 모니터링 | 지금 건강한가, 어디부터 볼 것인가 | 메트릭(시간에 따른 측정), 로그(일어난 사건), 트레이스(요청이 지난 경로), 행동할 이유가 있는 알림, 런북과 대응 담당 | Prometheus, Grafana, OpenTelemetry, Elastic, Splunk | [[Logs-vs-Metrics\|로그 vs 메트릭]], [[OpenTelemetry\|OpenTelemetry와 분산 트레이싱]], [[Alert-Fatigue\|Alert Fatigue 방지]], [[Incident-Runbook\|Incident Runbook]] |
| 신뢰성과 비용 | 큰 장애에서 얼마나 빨리, 얼마나 잃고 돌아오는가. 얼마가 드는가 | 복구 시간과 허용 손실 목표, 복원 연습, 신뢰성 목표와 그 준수 여부, 바쁜 시기의 용량 계획, 쓰지 않는 자원 정리 | - | [[Backup-Restore\|백업과 복원]], [[SLI-SLO\|SLI / SLO / Error Budget]], [[SRE#DevOps와 SRE의 관계\|DevOps와 SRE의 관계]], [[AWS-Cost-Optimization\|AWS 비용 최적화]] |

표의 순서는 앞 영역이 남긴 질문을 다음 영역이 받는 순서다. 실행할 곳, 연결, 변경 기록, 변경 검증, 산출물 보관, 일관된 실행, 보호, 운영 반영, 관찰, 복구와 비용으로 이어진다. 열 영역이라는 구분은 한 입문 자료의 구성이며 표준 분류가 아니다. 도구 예는 그 영역에서 자주 거론되는 이름일 뿐 권장 목록이 아니고, 릴리스, 신뢰성과 비용 영역은 특정 도구보다 절차와 합의로 설명되는 경우가 많아 도구 예를 비워 두었다(이 문서의 정리).

## 영역에서 뽑은 운영 원칙

- **검사는 끝에 몰지 않고 변경마다 돌린다**: 파이프라인은 테스트를 프로젝트 끝으로 미루지 않고 변경할 때마다 피드백을 준다.
- **한 번 빌드하고 같은 산출물을 옮긴다**: 테스트용과 운영용을 따로 빌드하면 운영에 나간 것이 테스트한 것과 같은지 알기 어렵다. 같은 이미지를 써도 환경별 설정과 외부 서비스의 차이는 남는다([[CICD-Basics#빌드 재사용과 실행 환경의 동일성은 다르다|빌드 재사용과 환경 동일성]]).
- **인프라와 파이프라인 정의도 리뷰한다**: 애플리케이션 변경처럼 적용하기 전에 무엇이 바뀌는지를 본다. 같은 정의로 환경을 다시 만들 수 있어 손으로 다시 짓지 않는다.
- **사람의 승인과 자동화는 함께 갈 수 있다**: 운영 배포마다 승인이 필요한 조직도 빌드, 검사와 릴리스 준비까지는 자동화할 수 있다. 중요한 것은 단계가 명확하고 반복 가능하다는 점이다.
- **보안은 출시 직전의 검사만이 아니라 과정의 일부다**: 스캔 도구가 완전한 보안을 보장하지는 않는다. 어떤 검사를 필수로 둘지와 검사에 걸렸을 때 무엇을 할지를 보안 담당과 미리 정한다.
- **알림은 행동할 이유를 줘야 한다**: 받는 사람이 누구이고 어디서부터 조사할지가 함께 정해져 있어야 한다.
- **백업은 복원해 봐야 믿을 수 있다**: 복구 시간과 허용 손실은 서비스를 맡긴 쪽과 합의하고 복원을 연습한다.
- **문제가 잦으면 변경보다 신뢰성 개선이 먼저일 수 있다**: 신뢰성 목표를 두고 준수 여부를 재는 생각이 SRE와 이어진다. 목표에 못 미칠 때 변경을 늦추는 규칙은 [[SLI-SLO#Error Budget Policy|에러 버짓 정책]]에 있다.
- **반복되는 준비는 공유 플랫폼으로 모은다**: 프로젝트가 늘면 저장소, 테스트 환경, 파이프라인과 보안 검사의 출발점을 공유해 새 팀이 같은 준비를 되풀이하지 않게 한다([[Internal-Developer-Platform|내부 개발자 플랫폼]]).

## 도구보다 질문을 먼저 본다

도구 조합은 프로젝트마다 다르다. 어떤 팀은 Terraform과 Jenkins를, 다른 팀은 클라우드 제공자의 도구와 GitHub Actions를 쓴다. Kubernetes는 요구 사항과 조직이 승인한 플랫폼이 맞을 때 쓰고, 더 단순한 관리형 서비스나 가상 머신으로 충분한 경우도 있다. 인프라 위치도 기존 시스템, 보안 규칙, 비용과 데이터를 둘 수 있는 지역에 따라 정해진다.

로드맵을 볼 때는 영역마다 그 영역이 푸는 문제와 다른 영역과의 연결을 먼저 말해 보고, 도구는 그 뒤에 고른다(학습 순서는 이 문서의 제안).

이 지도는 입문용 단순화다. 데이터베이스 스키마 변경, 규제 감사와 변경 관리 절차, DevOps를 전담 팀이나 직함으로 두는 조직 설계의 문제는 담지 않았다.

## 이해 확인

1. 로드맵에서 본 도구 하나를 골라 어느 영역의 어떤 질문에 답하는지 말할 수 있는가?
2. 테스트 환경용과 운영 환경용을 따로 빌드하면 무엇을 확신할 수 없게 되는가?
3. 운영 배포에 사람의 승인이 필수인 조직에서 자동화할 수 있는 범위는 어디까지인가?
4. 메트릭, 로그와 트레이스는 각각 어떤 질문에 답하는가?
5. 백업 파일이 있다는 것과 복구할 수 있다는 것은 어떻게 다른가?

## 출처

- [10+ Deploys Per Day: Dev and Ops Cooperation at Flickr — SlideShare, John Allspaw, Paul Hammond](https://www.slideshare.net/jallspaw/10-deploys-per-day-dev-and-ops-cooperation-at-flickr) — Velocity 2009 발표 슬라이드. 2026-11-17 표지의 발표자와 행사명 확인
- [About devopsdays — devopsdays](https://devopsdays.org/about) — 2026-11-17 첫 행사(2009년 벨기에 Ghent)와 창립자 확인
- [I Wish Someone Explained DevOps to Me Like This — YouTube, Cloud X Berry](https://www.youtube.com/watch?v=GwYx0-7o_vg) — 2026-10-30 공개, 2026-11-17 음성 인식 전사 전체 확인. 열 영역 구성의 출처. 질문 문장은 영상의 설명을 이 문서가 질문으로 다시 쓴 것. 가상의 은행 대출 시스템 프로젝트로 설명하는 입문 영상이며 화면 자료는 확인하지 못함. 전사문의 인명 오인식은 위 두 자료로 교정

## 관련 문서

- [[CICD-Basics|CI/CD 기초]] — CI, 제공과 배포의 구분, 파이프라인 단계
- [[DevOps-vs-DevSecOps|DevOps vs DevSecOps]] — 보안 검사를 앞 단계로 옮기기
- [[IaC|IaC]] — 코드로 정의한 인프라
- [[SRE|SRE]] — 신뢰성 목표와 운영
- [[Internal-Developer-Platform|내부 개발자 플랫폼]] — 공유 플랫폼의 셀프서비스와 운영 경계
- [[비용&운영(FinOps)|비용&운영]] — 클라우드 비용 관리
- [[CICD-Foundations|CI/CD 기초와 도구 선택]]
