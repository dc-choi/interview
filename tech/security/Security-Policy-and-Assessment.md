---
tags: [security, governance, risk, assessment]
status: done
verified_at: 2026-10-06
category: "보안(Security)"
aliases: ["Security Policy and Assessment", "보안 정책과 점검", "보안 감사 절차"]
---

# 보안 정책과 점검

보안 정책은 보호할 자산과 위험에 맞춰 책임과 운영 기준을 정하는 문서다. 점검은 그 기준이 실제 설정과 업무에서 지켜지는지 증거로 확인하는 활동이다. 정책 작성, 실행, 평가와 개선이 이어져야 한다.

## 정책을 운영으로 연결하기

NIST CSF 2.0은 조직 맥락과 우선순위에 맞춘 정책 수립, 전달과 집행(GV.PO-01), 환경 변화에 따른 검토와 갱신(GV.PO-02)을 다룬다. 구체적인 문서 양식이나 구현 방법을 하나로 강제하지 않는다.

| 단계 | 확인할 것 | 남길 자료의 예 |
|---|---|---|
| 자산과 위험 파악 | 보호할 데이터, 서비스와 의존성, 위협의 가능성과 영향 | 자산 목록, 위험 평가 |
| 책임과 기준 설정 | 결정권자, 실행 담당자, 적용 범위와 예외 | 책임표, 정책과 운영 기준 |
| 전달과 실행 | 담당자가 기준을 이해하고 실제로 수행하는가 | 역할별 교육, 설정과 작업 기록 |
| 검토와 개선 | 요구사항, 위협과 기술 변화가 반영됐는가 | 개정 이력, 미해결 위험과 후속 조치 |

위 표는 CSF의 자산 관리, 위험 평가, 책임과 교육 항목을 연결한 실무 정리다. 정책, 세부 기준, 작업 절차로 문서를 나눌 수 있지만 파일 세 개를 만드는 것 자체가 목표는 아니다.

### CSF 2.0의 여섯 기능과 현재, 목표 상태

2026-10-10 NIST CSF 2.0의 2장과 3장을 대조한 범위다. CSF Core는 Govern, Identify, Protect, Detect, Respond, Recover의 여섯 기능으로 보안 성과를 분류한다. 순서대로 한 번씩 끝내는 사고 대응 단계가 아니며, 기능의 나열 순서가 중요도를 뜻하지도 않는다.

| 기능 | 확인할 성과 |
|---|---|
| Govern | 위험 관리 전략, 책임과 정책을 정하고 전달하며 감독한다 |
| Identify | 자산, 공급자와 현재 위험을 이해하고 개선 기회를 찾는다 |
| Protect | 접근 통제, 교육과 데이터 보호 등 위험을 줄이는 조치를 적용한다 |
| Detect | 공격과 침해 가능성을 발견하고 분석한다 |
| Respond | 탐지한 사고를 분석하고 영향을 억제하며 소통한다 |
| Recover | 영향을 받은 자산과 운영을 복원하고 복구 상황을 전달한다 |

Govern은 다른 다섯 기능의 우선순위를 이끈다. Govern, Identify, Protect, Detect는 지속해서 수행하고, Respond와 Recover는 사고에 대비해 준비한다. 조직 규모와 위험에 맞춰 적용하되, CSF 자체를 정해진 도구 목록이나 일률적인 작업 체크리스트로 해석하지 않는다.

Current Profile에는 현재 달성하거나 달성하려는 성과와 그 정도를, Target Profile에는 선택하고 우선순위를 정한 목표 성과를 기록한다. 두 상태의 차이로 실행 계획을 정하고 조치 뒤 갱신한다. 작은 서비스라면 관리자 권한 회수의 현재 증거와 목표를 비교해 담당자와 개선 작업을 정할 수 있다. 이는 적용 예시이며 Profile 작성만으로 보안 통제가 검증됐다는 뜻은 아니다.

## 경계 장비보다 자원과 접근 경로를 기준으로 점검한다

2026-10-09 NIST SP 800-207과 CSF 2.0을 대조한 범위다. 내부망에 있거나 조직 소유 장비라는 이유만으로 사용자와 자원을 신뢰하지 않는다. 자원 접근 전에 인증과 인가를 확인하며, 외부 경계의 방화벽 점검만으로 계정, 장비와 데이터의 보호 상태를 판단하지 않는다.

CSF 2.0의 ID.AM-03은 내부와 외부 데이터 흐름을, ID.AM-04는 공급자가 제공하는 서비스 목록을 관리하도록 한다. 이를 작은 서비스에 적용하면 다음 경로를 함께 확인할 수 있다. 아래는 표준의 고정 점검표가 아닌 적용 예시다.

- 공개 API뿐 아니라 관리 화면, 원격 접속, 배포 계정과 외부 연동에서 중요 데이터까지 이어지는 접근 경로를 그린다.
- 경로마다 사용 주체, 권한, 실제 설정과 점검 책임자를 연결한다. 관리 대상에서 빠진 자원도 찾는다.
- 개선 순서는 취약해 보이는 정도만으로 정하지 않는다. 위협, 취약점, 악용 가능성과 영향을 함께 보는 ID.RA-04와 ID.RA-05를 적용한다.

예를 들어 외부 API의 방화벽 규칙이 충분해도 운영 계정의 과도한 데이터 조회 권한은 별도 위험이다. 권한 축소와 재점검이 필요한지 해당 경로의 피해 범위로 판단한다. 이 원칙은 특정 금융회사 사고의 원인이나 피해 사실을 입증하지 않는다.

## 관리형 서비스의 책임과 감사 증거를 나눈다

2026-10-10 AWS 공동 책임 모델과 Artifact 문서 대조 기준. 클라우드 공급자가 맡는 통제와 고객이 수행할 통제는 사용하는 서비스에 따라 달라진다.

| 사용 방식 | 고객이 확인할 책임의 예 |
|---|---|
| EC2에서 애플리케이션 운영 | 게스트 OS와 설치한 애플리케이션의 패치, 보안 그룹 설정 |
| S3와 DynamoDB 같은 추상화된 서비스 이용 | 데이터 분류, 암호화 옵션과 IAM 접근 권한 |

관리형 서비스를 사용해도 고객 데이터와 접근 권한의 관리 책임이 사라지지는 않는다. 외주 운영에서는 이 책임을 다시 발주자와 운영 담당자의 작업 범위로 나누고, 설정 변경과 재점검을 누가 수행할지 정하는 방식을 검토한다. 이는 계약과 운영을 위한 적용 예시이며 AWS가 두 당사자의 책임 배분까지 정한다는 뜻은 아니다.

AWS Artifact는 AWS의 보안과 규정 준수 보고서 및 인증 문서를 제공한다. 이 자료는 사용 중인 AWS 인프라와 서비스의 통제를 설명할 감사 증거로 활용할 수 있다. 고객 회사와 애플리케이션의 보안 및 규정 준수를 입증할 자료는 고객이 별도로 준비해야 한다. 공급자의 보고서 확보와 자사 서비스의 통제 검증을 서로 다른 완료 조건으로 둔다.

## 보안 인식 교육의 목표와 측정

교육은 수강 완료와 실제 행동 변화를 구분해 평가한다. 모든 사용자가 알아야 할 위협 인식과 신고 방법을 공통으로 다루고, 관리자와 개발자에게는 권한 관리와 설정 변경처럼 역할에 맞는 실습을 더한다. 아래는 NIST SP 800-50 Rev. 1의 학습 프로그램과 측정 원칙을 적용한 예시다(2026-10-07 확인).

| 목표 | 실습 예시 | 확인할 증거 |
|---|---|---|
| 의심스러운 요청 식별과 신고 | 피싱 또는 지원팀 사칭 상황에서 확인 절차 수행 | 모의 공격 대응과 신고 기록 |
| 계정 보호 습관 | 비밀번호 관리와 MFA 사용 절차 연습 | 정책 준수와 MFA 사용 변화 |
| 역할별 안전한 작업 | 관리자 권한 부여와 회수 상황 재현 | 수행 결과와 잘못된 판단의 원인 |
| 지식 유지 | 교육 전후와 일정 기간 뒤 같은 개념 재확인 | 즉시 점수와 지연 평가의 차이 |

교육 이수율만으로 위험 감소를 입증할 수 없다. 실습 결과, 신고와 업무 행동의 변화를 함께 보고 교육 내용을 조정한다. 교육 기록도 개인 평가와 연결될 수 있으므로 접근과 취급 범위를 정한다. 이 지침은 미국 연방기관을 주 대상으로 하며, 국내 조직의 법정 교육 주기나 일률적인 사고 감소율을 증명하지 않는다.

## 점검의 범위와 증거

보안 감사 전체를 취약점 스캐너 실행으로 대신할 수 없다. 기술 점검은 문서와 설정 검토, 테스트를 조합하며, 목적과 허용 위험에 맞게 방법을 고른다. [[Application-Security|취약점 진단과 모의해킹]]도 서로 다른 범위를 확인한다.

NIST SP 800-115의 계획, 수행, 사후 조치를 다음처럼 운영할 수 있다. 아래 여섯 항목은 작업용 구분이며 표준이 강제하는 여섯 단계가 아니다.

1. **계획:** 목표, 대상과 제외 대상, 담당자, 일정, 허용 활동과 사고 대응을 정하고 승인받는다.
2. **자료 수집:** 정책, 구성과 자산 목록을 실제 환경에 대조한다.
3. **평가:** 자동화 결과와 수동 검토를 결합해 발견 사항을 확인한다.
4. **분석:** 원인과 영향을 검토하고 개선 우선순위를 정한다.
5. **보고:** 점검 방법, 발견 근거, 한계와 권고 조치를 전달한다.
6. **후속 조치:** 변경을 시험하고 적용한 뒤 재점검한다. 완료, 부분 완료와 미완료를 추적한다.

외주 점검에서는 고객의 승인 범위와 제3자가 소유한 시스템의 허용 범위를 구분한다. 수집한 설정과 취약점 보고서도 민감한 자료이므로 접근과 취급 방법을 계획에 포함한다.

## 사고 대응 훈련은 기술 복구와 의사결정을 함께 점검한다

2026-10-09 NIST 용어집과 CISA 훈련 평가 지침을 대조한 범위다. Tabletop exercise는 시나리오를 놓고 역할과 대응을 토론하며 계획을 검토한다. Functional exercise는 모의 운영 환경에서 담당자가 계획과 비상 대응 준비 상태를 검증한다. 토론에서 답을 정했다는 사실을 시스템 복구 성공과 같게 보지 않는다.

작은 서비스에서는 계정 탈취나 서비스 중단 하나를 골라 다음을 점검할 수 있다. 아래는 표준의 고정 평가표가 아닌 적용 예시다.

- 기술 대응: 어떤 로그로 범위를 확인하고, 누가 차단이나 복구를 수행하며, 정상화는 무엇으로 확인하는가.
- 의사결정과 소통: 서비스 중단을 누가 승인하고, 고객과 내부 담당자에게 확인된 사실과 미확인 사항을 어떻게 전달하는가.
- 평가 증거: 시나리오와 목표, 실제 행동과 시각, 막힌 지점과 판단 근거를 남긴다. 훈련 중 점수나 한 번의 빠른 대응만으로 전체 운영 역량을 판정하지 않는다.

CISA의 After-Action Report / Improvement Plan은 목표 대비 강점과 개선점을 분석하고, 시정 조치마다 책임자와 이행 일정을 연결한다. 운영에서는 수정한 절차를 다음 훈련에서 다시 확인할 조건도 정한다. 특정 훈련의 중간 관찰만으로 AI와 사람의 일반적인 대응 우열을 주장하지 않는다.

## AWS 구성 점검 도구와 예외 처리

2026-10-07 Prowler 문서와 Service Screener 저장소를 대조한 범위다. 자동 점검 결과는 실제 위험과 조치 우선순위를 검토할 입력이며, 인증 충족이나 침해 부재의 증명으로 쓰지 않는다.

| 도구 | 확인할 범위 | 운영 경계 |
|---|---|---|
| Prowler | AWS 구성에 대한 보안 검사와 finding | 공식 권한 안내는 `SecurityAudit`, `ViewOnlyAccess`와 일부 검사의 추가 읽기 권한을 요구한다. 권한 부족과 대상 누락을 통과로 계산하지 않는다 |
| Service Screener | AWS와 커뮤니티 모범 사례에 따른 보안, 안정성, 성능과 비용 등의 구성 개선 권고 | Well-Architected 검토를 보완한다. 생성한 보고서는 로컬에서 호스팅하고 인터넷에 공개하지 않도록 저장소가 명시한다 |

검사용 읽기 권한과 개선 조치를 실행할 쓰기 권한은 따로 설계한다. 점검 보고서에도 자원 구성과 취약한 설정이 담길 수 있으므로 저장 위치, 열람자와 보존 기간을 정한다.

Service Screener의 실행 전체를 읽기 전용으로 가정해서는 안 된다. 현재 저장소의 사전 조건에는 `AWSCloudShellFullAccess`, `cloudformation:CreateStack`, `cloudformation:DeleteStack`도 포함된다. 도구는 감사용 빈 CloudFormation 스택을 실행 중 생성하고 삭제한다고 설명한다. 구성 조회, 실행 기록용 변경과 개선 조치의 권한을 구분해 승인 범위를 확인한다. [실행 사전 조건](https://github.com/aws-samples/service-screener-v2#prerequisites)

Prowler의 mutelist는 의도적인 설정에 대한 finding을 억제한다. CSV에서는 `muted=True`로 표시하면서 원래 `PASS`, `FAIL`, `MANUAL` 상태를 유지하고, JSON-OCSF에서는 `status_id`가 `Suppressed`가 된다. 따라서 억제된 결과를 수정 완료나 점검 통과로 합산하지 않는다.

다음은 이 기능을 운영에 적용할 때의 제안이다.

- 예외마다 대상 자원, 근거, 책임자와 재검토 날짜를 남긴다. 낮은 우선순위와 오탐, 승인된 위험 수용을 구분한다.
- 실행마다 도구 버전, 계정과 리전, 검사 범위, 실패와 제외 항목을 함께 기록한다. 결과 수 감소만으로 보안이 좋아졌다고 판단하지 않는다.
- 조치 뒤 같은 범위로 다시 검사하고 실제 접근 차단 여부도 확인한다. 보고서 생성과 위험 해소는 별도 완료 조건이다.

### 보안 조치의 완료 조건에 서비스 전환을 포함한다

2026-10-10 RDS 공식 문서 대조 기준. 암호화되지 않은 DB를 스냅샷으로 전환할 때는 원본 스냅샷의 암호화 사본을 만들고, 그 사본에서 새 DB 인스턴스를 복원한다. 암호화된 DB가 생성됐다는 사실만으로 기존 애플리케이션의 연결까지 새 DB로 바뀌지는 않는다.

이 경로를 선택한 경우에는 스냅샷 이후 쓰기 데이터의 처리, 새 접속 대상과 권한, 애플리케이션 전환 및 복구 조건을 계획하고 확인한다. 이는 조치 완료를 판정하기 위한 운영 제안이다. 스냅샷 복원만을 유일한 전환 방법으로 일반화하지 않으며, 공식 문서는 Blue/Green 배포를 통한 암호화 전환도 별도로 안내한다. 지원 조건은 대상 엔진과 배포 구성에서 확인한다.

### 중앙 점검 결과와 장기 감사 증거를 구분한다

2026-10-09 AWS Security Hub CSPM 공식 문서 기준, finding은 상태와 갱신 시각에 따라 만료된다. 처음 수집한 날부터 모든 결과를 일률적으로 90일 보존하는 구조로 이해하지 않는다.

| RecordState | 갱신되지 않았을 때의 만료 기간 |
|---|---|
| `ACTIVE` | 90일 |
| `ARCHIVED` | 30일 |

Security Hub CSPM 자체 control finding은 `UpdatedAt`을 기준으로 한다. 그 밖의 finding은 `ProcessedAt`과 `UpdatedAt` 중 더 최근 시각을 기준으로 한다. 만료된 finding은 영구 삭제되므로, 목록에서 사라졌다는 사실만으로 취약점이 해결됐다고 판단하지 않는다.

장기 감사 증거가 필요하면 S3 같은 별도 저장소로 내보낸다. AWS는 EventBridge 규칙과 custom action을 이용한 내보내기를 안내한다. 운영에서는 필요한 계정과 리전의 결과가 실제로 저장되는지, 접근 통제와 보존 기간이 요구사항에 맞는지 별도로 확인한다. 중앙 화면 연동과 감사 증거의 장기 보존은 서로 다른 완료 조건이다.

### 런타임 경보 부재와 수집 공백을 구분한다

2026-10-10 GuardDuty Runtime Monitoring 공식 문서 대조 기준. 구성 점검 결과와 실행 중 행위의 수집 상태는 서로 다른 증거다. GuardDuty의 coverage는 Runtime Monitoring 활성화, VPC endpoint와 보안 에이전트 배포 상태를 확인한다. `Healthy`는 런타임 이벤트를 받아 분석할 수 있다는 의미이며 침해가 없다는 판정이 아니다. `Unhealthy` 상태에서는 해당 자원의 런타임 행위를 수신하거나 모니터링할 수 없고 Runtime Monitoring finding도 생성할 수 없다.

운영 적용 제안: 경보가 0건이어도 감시 대상 자원과 coverage를 먼저 대조한다. EventBridge로 coverage 변경을 알리고, 에이전트의 CPU와 메모리 사용량도 관측한다. 설치 완료, 이벤트 수신, 위협 탐지와 실제 대응 성공을 각각 확인하며, 센서 배포만으로 차단까지 완료됐다고 기록하지 않는다. 이 구체적인 상태 의미는 GuardDuty 기준이며 다른 보안 제품에도 같은 상태 계약이 있다고 가정하지 않는다.

### 민감정보 발견 결과와 검사 범위를 함께 기록한다

2026-10-10 Amazon Macie와 Security Lake 공식 문서 대조 기준. 데이터 보안 점검에서는 발견 건수와 실제 검사한 범위를 따로 본다. Macie job의 sampling depth는 분석할 적격 S3 객체의 비율이며, 선택한 각 객체에서 읽을 바이트 비율이 아니다. Discovery result에는 민감정보를 찾지 못한 객체와 권한 또는 형식 문제로 분석하지 못한 객체의 기록도 포함된다. Finding이 없다는 사실만으로 검사 완료나 민감정보 부재를 판정하지 않는다.

에이전트 설치 여부와 스캔 인프라의 실행 위치도 나누어 확인한다. Security Lake의 Sentra 통합 안내는 고객 계정에 스캔 인프라를 배포하고 발견 메타데이터를 SaaS로 수집한 뒤 OCSF로 전달하는 흐름을 설명한다. 이를 운영에 적용할 때는 스캔 권한, 원본과 메타데이터의 이동 범위, 비용과 부하를 확인한다. 에이전트가 없다는 설명만으로 고객 계정의 실행 자원이나 외부 전달 데이터도 없다고 가정하지 않는다.

개발용 데이터 복사본을 점검한다면 대상 목록, 분석 성공과 실패, 표본 추출 범위, 마스킹 조치와 재검사 결과를 연결한다. 이는 운영 점검 제안이며 특정 제품의 정확도나 위험 감소율을 보장하지 않는다.

## 인증 종류와 심사 범위를 먼저 정한다

2026-10-09 KISA 제도 소개와 인증 절차를 대조한 범위다. 구성 점검 도구의 결과를 인증 전체의 충족 증거로 대신하지 않는다.

| 구분 | 확인 대상 |
|---|---|
| ISMS | 정보보호 관리체계. 정보서비스의 운영과 보호에 필요한 조직, 물리적 위치와 정보자산을 인증범위에 포함한다 |
| ISMS-P | 정보보호와 개인정보보호 관리체계. 개인정보의 수집, 보유, 이용, 제공과 파기에 관여하는 시스템과 취급자까지 범위를 확인한다 |
| CSAP | 클라우드서비스에 대한 별도 보안인증. ISMS-P의 개인정보보호 부분이나 하위 심사 항목으로 취급하지 않는다 |

ISMS-P 인증기준은 관리체계 수립과 운영, 보호대책 요구사항, 개인정보 처리 단계별 요구사항으로 구분한다. 심사 항목 수만 외우기보다 적용할 기준과 서비스 범위를 먼저 확정한다. 최초심사로 부여되는 유효기간은 3년이며, 유지 여부를 확인하는 사후심사는 유효기간 중 매년 1회 이상 받는다. 인증범위의 중요한 변경도 최초심사 대상이다.

준비 자료에는 인증 대상 서비스, 운영 조직과 자산, 개인정보 처리 흐름, 운영 증거와 결함 보완 내역을 연결한다. 인증 의무 여부와 제재 감경은 별도 법적 요건이므로 위 분류만으로 단정하지 않는다.

## 작은 서비스의 적용 예

관리자 권한 회수 점검을 가정한 예시다.

- 기준: 승인된 관리자만 접근하도록 책임과 절차를 정한다.
- 증거: 승인 목록과 실제 권한, 회수 기록을 비교한다.
- 조치: 불필요한 권한을 회수하고 회수 절차의 누락 원인을 고친다.
- 재점검: 같은 조건으로 접근을 다시 시도해 차단 여부를 확인한다.

설정을 고쳤다는 보고와 문제가 해소됐다는 검증은 구분한다. 재점검 통과도 확인한 범위의 결과이지 다른 취약점이 없다는 증명은 아니다.

## 적용 한계

- SP 800-115는 2008년 문서다. 여기서는 점검 계획과 후속 조치 구조를 사용하며, 당시 도구와 암호 기술을 현재 권고로 옮기지 않는다.
- 이 절차만으로 특정 인증을 충족했다고 판단하지 않는다. 적용할 인증의 기준과 심사 범위는 별도 확인 대상이다.

## 출처

- [Amazon Macie, Scope options for sensitive data discovery jobs](https://docs.aws.amazon.com/macie/latest/user/discovery-jobs-scope.html)
- [Amazon Macie, Storing and retaining sensitive data discovery results](https://docs.aws.amazon.com/macie/latest/user/discovery-results-repository-s3.html)
- [Amazon Security Lake, Third-party integrations with Security Lake](https://docs.aws.amazon.com/security-lake/latest/userguide/integrations-third-party.html) — Sentra 통합의 스캔 위치와 발견 메타데이터 전달.
- [Amazon GuardDuty, Reviewing runtime coverage statistics and troubleshooting issues](https://docs.aws.amazon.com/guardduty/latest/ug/runtime-monitoring-assessing-coverage.html)
- [Amazon GuardDuty, After you enable Runtime Monitoring](https://docs.aws.amazon.com/guardduty/latest/ug/runtime-monitoring-after-configuration.html)
- [Amazon RDS, Encrypting Amazon RDS resources](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html) — 암호화 사본 복원과 Blue/Green 전환 안내.
- [Shared Responsibility Model — AWS](https://aws.amazon.com/compliance/shared-responsibility-model/)
- [AWS Artifact, What is AWS Artifact?](https://docs.aws.amazon.com/artifact/latest/ug/what-is-aws-artifact.html)
- [NIST, Tabletop Exercise](https://csrc.nist.gov/glossary/term/Tabletop_Exercise)
- [NIST, Functional Exercise](https://csrc.nist.gov/glossary/term/functional_exercise)
- [CISA, CTEP Facilitator / Evaluator Handbook](https://www.cisa.gov/sites/default/files/2023-01/3_-_ctep_facilitator_evaluator_handbook_2020_final_508.pdf)
- [NIST, SP 800-207: Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final) — 네트워크 위치와 소유권에 따른 암묵적 신뢰 배제.
- [AWS Security Hub CSPM, Creating and updating findings](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings.html) — 상태별 만료 기간, 기준 시각과 장기 보존.
- [KISA, ISMS-P 제도소개](https://www.isms-p.or.kr/sysm/intro/selectSysmCertDetail.do)
- [KISA, ISMS-P 인증 절차 안내](https://www.isms-p.or.kr/cert/aply/selectCertPrcdDetail.do)
- [KISA, 클라우드보안인증제](https://www.isms-p.or.kr/sysm/intro/selectSysmVrtlDetail.do)
- [Prowler, AWS Authentication in Prowler](https://docs.prowler.com/user-guide/providers/aws/authentication)
- [Prowler, Mutelisting](https://docs.prowler.com/user-guide/cli/tutorials/mutelist)
- [Service Screener — AWS Samples](https://github.com/aws-samples/service-screener-v2)
- [NIST, SP 800-50 Rev. 1: Building a Cybersecurity and Privacy Learning Program](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-50r1.pdf) — 2.4절의 측정과 2.5절의 대상별 학습
- [NIST, The Cybersecurity Framework (CSF) 2.0](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) — 2장의 여섯 기능, 3.1절의 Current/Target Profile, Appendix A의 GV.PO, GV.RR, ID.AM, ID.RA와 PR.AT
- [NIST, SP 800-115: Technical Guide to Information Security Testing and Assessment](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-115.pdf) — 6장의 계획과 승인, 7장의 자료 취급, 8장의 개선과 재점검

## 관련 문서

- [[CIA-Triad|기밀성, 무결성과 가용성]]
- [[Application-Security|애플리케이션 보안]]
- [[Audit-Log|감사 로그]]
- [[Risk-Management|사업 리스크 관리]]
