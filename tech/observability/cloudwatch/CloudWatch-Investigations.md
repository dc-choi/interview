---
tags: [observability, aws, cloudwatch, aiops, incident-response]
status: done
verified_at: 2026-10-07
category: "관측가능성(Observability)"
aliases: ["CloudWatch Investigations", "CloudWatch AI 장애 조사"]
---

# CloudWatch investigations의 조사와 조치 경계

CloudWatch investigations는 텔레메트리를 탐색해 관측 결과와 원인 가설을 제시하는 생성형 AI 기능이다. 가설의 채택, 운영 리소스 변경과 복구 확인을 각각 다른 단계로 다룬다.

## 조사 방식과 접근 권한

2026-10-07 공식 문서 기준으로 investigation group 없이 시작하는 조사와 group을 구성한 조사가 모두 있다.

| 방식 | 범위와 수명 | 적합한 용도 |
|---|---|---|
| 추가 구성 없는 조사 | 로그인한 사용자의 권한으로 분석하는 세션 기반 읽기 전용 조사, 24시간 뒤 자동 삭제 | 경보나 지표에서 시작하는 빠른 탐색 |
| Investigation group을 구성한 조사 | 조사 접근, 교차 계정 지원, 암호화와 보존 설정을 관리 | 권한을 받은 팀원과 조사 공유, 근거 추가와 후속 조사 |

Group에는 조사 대상 리소스에 접근할 IAM 역할을 연결한다. 사용자의 조사 권한과 group의 자료 접근 권한은 별도다. 암호화된 자료는 필요한 KMS 권한도 확인한다. 모든 운영자 권한을 조사 역할에 복사하기보다 조사에 필요한 데이터 범위와 실제 조회 실패를 먼저 확인한다.

조사 역할이 접근한 자료는 조사에 추가되어 운영자에게 보일 수 있다. 따라서 역할의 조회 범위와 조사 결과를 열람할 운영자의 허용 범위를 함께 맞춘다.

Group을 구성하면 활성 조사가 없어도 지정된 역할로 리소스와 텔레메트리 관계를 주기적으로 탐색한다. 장애가 발생할 때만 자료 접근이 일어난다고 가정하지 않는다.

## 관측 결과에서 원인 가설로

조사에는 메트릭과 경보, CloudTrail 변경 이벤트, X-Ray trace, Application Signals와 Contributor Insights 등의 자료를 연결할 수 있다. Logs Insights 쿼리 제안은 Standard 로그 클래스의 로그 그룹을 대상으로 한다. 계측되지 않았거나 권한 밖인 데이터까지 자동으로 확보되는 것은 아니다.

다음은 조사 결과를 검토하는 절차 예다.

1. 영향받는 서비스와 시간 범위를 고정한다.
2. AI가 제시한 관측 결과의 원시 지표, 로그와 배포 시각을 확인한다.
3. `Show reasoning`에서 가설에 사용한 근거를 읽고 종속성 및 실제 설정과 대조한다.
4. 맞지 않는 제안은 제외하고 필요한 자료를 추가한다. 비슷한 시각의 변화만으로 원인이 확정됐다고 판단하지 않는다.

예를 들어 DB 쓰기 throttling과 API 오류가 함께 늘었다면 처리 용량, 특정 키나 테넌트의 집중, SDK 재시도를 함께 조사한다. 용량 증가가 증상을 완화해도 부하 발생 원인을 제거했다는 뜻은 아니다.

## 가설 채택은 런북 실행이 아니다

Group 기반 조사에서 가설을 `Accept`하면 조사 Feed에 추가된다. 연결된 런북이 자동 실행되지는 않는다. 제안된 Systems Manager Automation 런북을 실행하려면 내용을 검토하고 입력 파라미터와 실행을 별도로 지정한다.

실행 전에는 대상 계정과 리전, 리소스, 각 단계의 변경 여부를 확인한다. 실행에는 운영자의 IAM 권한과 해당 조치 및 Systems Manager 권한이 필요하다. 조사 자료를 읽을 수 있다는 사실만으로 변경 권한까지 있다고 판단하지 않는다.

Execution preview의 `Undetermined`는 읽기 전용이라는 뜻이 아니다. Lambda, Step Functions, 외부 API나 스크립트로 위임된 동작의 영향을 Automation이 판정하지 못한 상태이므로, 해당 단계의 실제 동작을 직접 검토한다.

다음은 운영 완료 기준의 예다. 런북 성공 상태와 함께 실제 오류율, 지연 및 사용자 요청의 성공을 확인하고, 남은 원인과 재발 방지 조치를 기록한다. 알람 해제만으로 모든 사용자 경로의 복구를 보장하지 않는다.

## 이해 확인

- 추가 구성 없는 조사와 group 기반 조사의 공유 및 보존 경계는 어떻게 다른가?
- 가설을 채택한 뒤 실제 리소스 변경 전에 무엇을 확인해야 하는가?

## 출처

- [Amazon CloudWatch, CloudWatch investigations](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Investigations.html)
- [Amazon CloudWatch, Conduct an investigation without additional configuration](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Investigations-Ephemeral.html)
- [Amazon CloudWatch, Security in CloudWatch investigations](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Investigations-Security.html)
- [Amazon CloudWatch, Insights that CloudWatch investigations can surface](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Investigations-SuggestionTypes.html)
- [Amazon CloudWatch, Reviewing and executing suggested runbook remediations](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/suggested-investigation-actions.html)

## 관련 문서

- [[CloudWatch|CloudWatch]]
- [[MCP-Incident-Investigation|MCP 기반 장애 조사와 변경 권한]]
- [[Root-Cause-Investigation-Loop|근본 원인 조사 루프]]
- [[DynamoDB|DynamoDB 스로틀링 진단]]
