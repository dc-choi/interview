---
tags: [security, incident-response, nist, recovery]
status: done
verified_at: 2026-10-12
category: "보안(Security)"
aliases: ["Security Incident Response", "보안 사고 대응", "침해사고 대응"]
---

# 보안 사고 대응

보안 사고 대응은 침해의 범위를 판단하고 확산을 억제하며 안전하게 서비스를 복구하는 활동이다. 탐지 도구뿐 아니라 책임, 기록, 복구 기준과 개선 절차가 필요하다.

## NIST의 수명주기

NIST SP 800-61 Rev. 3(2025)은 CSF 2.0의 여섯 기능에 대응을 연결한다. 준비, 탐지, 격리, 제거, 복구를 설명하는 교육용 단계 수를 NIST의 고정된 단계 수로 해석하지 않는다.

| 기능 | 대응에서의 역할 |
|---|---|
| Govern, Identify, Protect | 책임, 위험 이해와 보호 조치로 사고에 대비 |
| Detect | 이상 징후를 발견하고 분석 |
| Respond | 사고를 관리하고 분석, 소통, 차단과 제거 수행 |
| Recover | 영향을 받은 자산과 업무 복구 |

개선은 마지막 회고에만 두지 않는다. 각 활동에서 얻은 교훈을 Identify의 Improvement로 모아 다른 기능에 반영한다.

## 신고 접수와 대응 권한을 훈련한다

탐지 자동화와 별도로 사람이 의심 징후를 알릴 경로와 접수 담당자를 둔다. NIST SP 800-61 Rev. 3의 RS.MA-02는 사고 보고를 검증하고 우선순위를 판단하며, 외부 당사자가 잠재적 사고를 보고할 수단을 마련하도록 권고한다. GV.RR-02는 대응 역할의 문서화와 필요한 권한 부여를, ID.IM-02는 공급자 등 관련 당사자와의 테스트와 훈련을 다룬다. 이 범위는 2026-10-10 공식 원문으로 대조했다.

다음은 이를 작은 운영 조직에 적용한 훈련 예시다.

1. 의심스러운 로그인 신고를 접수하고 관찰 사실과 추정을 구분한다. 신고자가 침해를 확정해야만 접수하는 절차로 만들지 않는다.
2. 담당자가 원본 로그로 신고를 검증하고, 영향받는 서비스와 데이터에 따라 대응 우선순위를 정한다.
3. 계정 차단 권한자, 서비스 담당자와 외부 공급자의 연락 경로를 확인한다. 담당자 지정만으로 실제 실행 권한이 생기지는 않는다.
4. 모의 상황에서 접수부터 판단, 조치까지 따라가며 권한 부재와 인계 누락을 찾고 절차에 반영한다.

AI의 경고 요약은 이 과정의 보조 자료다. 요약 생성과 신고 검증, 차단 실행을 서로 다른 단계로 기록한다.

## 대응 중 남길 근거

- 발생 순서, 관련 자산, 관찰한 사실과 수행한 조치를 기록한다.
- 기록과 수집 자료의 무결성, 출처와 접근 권한을 보호한다.
- 처음 발견한 시스템 외의 잠재적 대상도 확인해 범위를 과소평가하지 않는다.
- 차단과 제거는 사고 유형, 영향과 조치 유지 기간을 고려해 선택한다.

## 복구 완료 조건

백업이 있다는 사실만으로 복구를 시작하지 않는다. 복원 자산의 침해 흔적과 손상을 확인한다. 운영 재개 전에는 복구된 자산의 무결성과 근본 원인 조치를 확인하고, 서비스 소유자와 정상 동작을 검증한다.

## 로그로 침해 흐름 재구성하기

로그는 수집한 사건의 기록이다. 모든 행동이 자동으로 남거나 공격자가 흔적을 지울 수 없다는 보장은 없다. 수집 누락, 저장 공간 부족에 따른 덮어쓰기, 변조와 삭제가 조사 범위를 제한한다.

1. **수집 범위 확인**: 인증, 단말, 네트워크와 업무 서비스의 기록을 모으고 빠진 시스템과 기간을 표시한다. 외부 접근이 가능한 직원용 서비스도 조사 범위에 넣는다.
2. **정규화와 시각 대조**: 필드 의미와 시각 형식을 맞추고 시계 동기화 상태를 확인한다. 발생 시각과 수집 시각의 차이를 사건 순서로 오인하지 않는다.
3. **상관관계 분석**: 계정, 기기와 요청 식별자로 기록을 연결한다. 같은 시간대의 낯선 로그인과 대량 조회는 조사할 단서이며 침해 확정과 구분한다.
4. **근거와 공백 보존**: 관찰한 사실, 추정한 연결, 확인하지 못한 구간을 나누고 수집 자료의 출처와 무결성을 보호한다.

SIEM(Security Information and Event Management)은 로그를 모아 검색하고 상관관계를 분석하는 데 활용한다. 분석 도구가 있어도 기록하지 않은 사건을 복원할 수는 없다. 중앙 수집, 전송과 저장 보호, 수정과 삭제 권한 통제가 함께 필요하다. 레코드 설계와 보존 원칙은 [[Audit-Log|감사 로그]]를 따른다. 이 조사 흐름은 ACSC 공동 지침과 NIST 사고 대응 지침을 연결한 실무 적용 예시다.

## XDR의 사건 묶음과 리스크 점수를 해석한다

XDR은 엔드포인트 외에 네트워크, 클라우드와 이메일 등 여러 영역의 신호를 연결해 탐지와 대응을 돕는다. 실제 수집 범위와 대응 기능은 제품 및 연결한 솔루션에 따라 확인한다. 다음은 2026-10-10 제품 공식 설명을 대조한 예시다.

- Microsoft Defender에서 alert는 악성 또는 의심스러운 사건을 나타내는 탐지 신호이고, incident는 관련 alert를 묶는 조사 단위다. 사건 안에서 원본 이벤트의 타임라인, 사용자와 장비, 조사와 대응 이력을 함께 확인할 수 있다.
- AhnLab XDR의 리스크 지수는 사용자와 자산을 중심으로 대응 우선순위를 정하는 데 쓰인다. 자산가치, 이벤트, 확률과 가중치를 함께 계산하므로 점수 80을 곧바로 침해 확률 80%로 해석하지 않는다.

이를 운영에 적용할 때는 경고 수와 사건 수를 같은 지표로 비교하지 않는다. 피싱 경고를 닫았더라도 관련 단말 실행과 다른 자산으로의 접근이 같은 사건에 남아 있는지 확인한다. 점수 하락을 평가할 때도 실제 조치, 로그 수집 범위와 분석 규칙의 변경을 함께 대조한다. 이는 제품 기능을 바탕으로 한 검토 기준이며 특정 제품의 도입 효과나 침해 부재를 입증한 수치는 아니다.

## 탐지에서 자동 차단으로 연결하기

탐지 결과와 대응 실행은 별도의 경계다. 계정, 단말과 서비스의 신호를 연결했더라도 실제 차단을 수행할 제품, 권한과 적용 범위가 있어야 한다.

Microsoft Defender XDR의 자동 공격 차단은 여러 제품의 신호를 사건 단위로 묶고, 공격에 이용되는 자산을 찾아 연결된 제품으로 대응하는 사례다. 특정 신호를 이용하려면 해당 제품이, 대응을 실행하려면 그 조치를 담당하는 제품이 배포돼 있어야 한다. 라이선스, 권한과 제품별 설정도 확인한다. 이는 공식 기능 설명이며 개별 도입 환경의 탐지 정확도나 피해 감소를 입증한 결과는 아니다.

운영 설계에서는 다음 경계를 먼저 정한다.

- 차단할 계정이나 기기, 예상되는 정상 업무 영향과 담당자
- 자동 조치를 검토하고 해제하는 경로, 자동 차단에서 제외할 중요 자산과 대체 보호 조치
- 판단의 근거가 된 원본 이벤트와 실제 수행한 조치의 이력

Defender는 자동 조치의 해제와 지원 대상 자산의 제외 설정을 제공하지만, 조치를 해제한다고 이미 생긴 업무 중단까지 없어지는 것은 아니다. 생성형 AI가 조사 설명을 보조할 때도 설명과 실행 권한을 분리한다. 외부 로그나 메일의 문장을 실행 지시로 받아들이는 위험은 [[LLM-Application-Security|LLM 애플리케이션 보안]]에서 다룬다.

## SOAR로 대응 절차를 자동화한다

SOAR(Security Orchestration, Automation and Response)는 여러 보안 도구를 커넥터로 연결하고 워크플로에 따라 보강, 대응, 수정(remediation) 작업을 실행하는 기술이다. CISA는 SOAR를 낮거나 중간 수준의 보안 이벤트에 대한 자동 대응을 포함하는, 서로 호환되는 소프트웨어 애플리케이션의 기술 스택으로 설명한다. NIST SP 800-215는 사고 대응 과정을 자동화하려고 발전한 보안 전략으로 SOAR를 설명하고, SP 800-61 Rev. 3는 SIEM과 함께 로그 감시, 이벤트 상관과 영향과 범위 추정에 쓰는 도구 예시로 든다. NIST 용어집에는 약어만 있고 규범적 정의는 없다. 범주는 제품명보다 기능으로 나눈다. Microsoft Sentinel은 SIEM이면서 SOAR 플랫폼이고, 위의 자동 공격 차단은 사용자가 작성하는 SOAR 자동 대응과 달리 제품에 내장된 기능이다. 이 절의 표준과 제품 서술은 2026-10-12 NIST, CISA, OASIS와 제품 공식 문서로 대조했다.

| 구분 | 주된 기능 |
|---|---|
| SIEM | 로그 수집, 검색, 상관 분석과 탐지 |
| SOAR | 이기종 도구를 잇는 워크플로로 보강, 대응, 수정(remediation) 실행 |
| XDR | 엔드포인트, ID, 이메일 등 보호 영역의 신호를 묶어 탐지와 대응(수집 범위는 제품과 연결한 솔루션에 따라 다름) |

### playbook과 자동화 규칙

- NIST SP 800-61 Rev. 3는 playbook을 절차를 문서화하는 한 형식으로 소개하고, 여러 시나리오나 상황에서 사람이 수행할 실행 가능한 단계나 작업을 제공한다고 설명한다. CISA의 2021년 SLTT IOC 자동화 파일럿 자료(현재 아카이브)는 SOAR 워크플로를 playbook을 기계가 이해할 수 있게 코드화한 것으로 설명하고, OASIS CACAO Security Playbooks 2.0 위원회 명세(Committee Specification 01, 2023-11-27)에서는 action 단계의 명령마다 유형을 달리할 수 있어, 사람이나 사람을 대신하는 시스템이 처리하는 manual 명령과 자동 명령을 한 playbook에 섞어 쓸 수 있다. 사람이 수행할 절차와 기계가 실행할 단계를 구분해 기록한다.
- Microsoft Sentinel 자동화 규칙은 트리거(인시던트 생성, 인시던트 갱신, 경고 생성), 조건, 동작으로 구성되고 순서 번호대로 차례로 실행된다. 상태와 심각도 변경, 소유자 지정, 태그와 작업 추가, 알려진 오탐(false positive)이나 무해한 양성(benign positive) 인시던트의 자동 종료는 규칙만으로 처리한다. 외부 시스템이 관련된 조치는 Azure Logic Apps로 만든 playbook을 호출한다.
- 공식 권장 예시 중에는 사용자와 IP가 담긴 인시던트를 보안 채널에 알리고 관리자에게 차단과 무시 선택 메일을 보내 응답을 기다린 뒤, 차단을 고르면 방화벽에 IP 차단을, Microsoft Entra ID에 사용자 비활성화를 요청하는 흐름이 있다. 반대로 권장 사용 사례에는 사람의 개입을 최소화한 즉시 대응(Response)도 있다. playbook 개요 문서는 계정과 장비가 침해되면 SOC가 통보받기 전에 playbook이 장비를 네트워크에서 격리하고 계정을 차단할 수 있다고 예시한다. 권장 사례 문서는 이를 두 예시로 나눈다. 침해가 의심되는 사용자에게는 Teams로 본인 행위인지 확인을 요청하고 Microsoft Entra ID Protection에 침해 확인으로 표시하며, 침해된 장비는 Microsoft Defender for Endpoint로 격리한다.

### 사람 승인은 조치마다 정하는 설계다

자동 대응 전의 사람 승인은 SOAR의 고유 속성이 아니다. 제품은 승인 단계를 기능으로 제공하지만 설정에 따라 사람 없이 실행된다.

| 제품 | 승인 방식 |
|---|---|
| Splunk SOAR (Cloud) | 승인자를 지정한 asset의 쓰기 action만 승인 대상이다. 1차 승인자 중 한 명이 거부하면 중단되고, 기한이 지나면 2차, executive 승인자로 넘어간 뒤 만료된다. playbook 안에서는 Prompt 블록으로 확인과 입력을 받는다 |
| Google SecOps SOAR | action을 Manual로 바꾸고 Approval link를 켜면 승인과 거부 링크 placeholder가 생기고, 이를 앞 단계의 이메일 발송 action에 넣어 플랫폼 밖 사용자에게 보낸다. Time to respond로 응답 기한을 둘 수 있다 |
| Defender for Office 365 AIR | 기본값에서는 수정 조치를 대기열에 넣고 SecOps가 승인한다. 관리자가 자동화 설정에서 유사 파일, 유사 URL, 여러 유사 속성 클러스터를 골라 켜면 악성으로 판정된 해당 클러스터의 조치(현재 soft delete만 가능)는 승인 없이 실행된다. 메시지가 10,000개를 넘는 클러스터는 자동 처리되지 않고 대기 조치로 남는다 |
| Defender for Endpoint | 장치 그룹마다 자동화 수준 Full(권장), 승인이 필요한 Semi 수준들, No automated response 중 하나를 고른다. 모든 폴더에 승인을 요구하는 Semi 수준에서는 대기 조치가 7일 뒤 시간 초과되고 거부한 것과 같이 처리된다. Microsoft는 2026-09-01부터 Defender for Endpoint의 AIR를 별도 조사 경험으로 실행하지 않고 수동 실행도 제공하지 않는다고 공지했다(Defender for Office 365 AIR는 해당 없음). 2026-10-12 확인 시점의 자동화 수준 문서는 상단에 같은 변경 공지를 싣고 있지만 수준별 설명과 7일 시간 초과 설명은 그대로 두고 있어, 이 승인 흐름이 변경 뒤에도 적용되는지는 확인되지 않았다 |

장치 그룹을 Semi 수준으로 둬도 자동 공격 차단은 수동 승인 없이 실행될 수 있다. 장치 그룹을 자동 봉쇄(containment)에서 빼려면 자동화 수준을 No automated response로 둘 수 있지만, Microsoft는 이 설정을 그다지 권장하지 않고 소수 장치에만 쓰라고 한다. 미리 보기 기능인 자동 장치 격리(isolation)에서 특정 장치를 빼려면 자동 공격 차단 제외를 설정한다.

NIST SP 800-61 Rev. 3는 일부 격리 조치를 보안 기술이 자동으로 수행하게 구성하는 방안을 고려사항으로 두면서, 사고 처리자가 자동 조치 대신 또는 함께 격리 조치를 수동으로 선택해 수행할 수 있게 하라고 권고한다. 핵심 서비스 중단처럼 영향이 큰 조치의 결정 권한은 리더십에 둘 수 있다. CISA 파일럿의 자동 IOC 피드는 low regret 방법론을 따른다. 악성 위협이라는 확신이 있고 자동 차단이 운영을 방해하지 않을 것이 거의 확실하므로, 피드를 받는 기관이 IOC 자동 차단을 허용할 수 있다는 뜻이다. CISA의 확신도와 운영 영향, NIST의 영향이 큰 조치에 대한 결정 권한에 되돌리기 쉬운 정도를 더해 자동 실행, 승인 뒤 실행, 수동 실행을 나눈다.

### 운영에서 확인할 것

- **단계 성공과 실제 적용**: Microsoft Entra ID Protection에 사용자를 침해 확인으로 표시하는 동작은 그 자체로 강제 조치를 시작하지 않는다. 실제 강제 조치(예: 다음 로그인 때 MFA 요구)는 미리 정의한 정책에 달려 있으므로 playbook 성공 기록과 적용 결과를 따로 확인한다.
- **실행 권한**: Sentinel 자동화 규칙은 playbook을 Sentinel 서비스 계정으로 실행하므로 playbook이 있는 리소스 그룹에 Microsoft Sentinel Automation Contributor 역할을 준다. 대상 시스템에 대한 조치 권한은 각 커넥터 연결이 인증에 쓰는 ID나 자격 증명의 권한에 달려 있다. Logic Apps는 상호작용하는 리소스마다 따로 연결하고 인증하며, 지원하는 인증 방식은 커넥터마다 다르다. 예를 들어 Microsoft Sentinel 커넥터는 관리 ID(미리 보기), 서비스 주체, Microsoft Entra 사용자를 지원한다.
- **지연**: Defender 포털에서는 경고 발생 뒤 자동화 규칙 실행까지 최대 10분, Defender 인시던트가 Sentinel에 나타나기까지 최대 5분이 걸릴 수 있다. 자동화 규칙은 playbook이 2분 넘게 실행되면 시작 2분 뒤 완료 여부와 관계없이 다음 동작으로 넘어간다. 초 단위 대응을 전제로 설계하지 않는다.
- **외부 승인 요청**: Google SecOps 문서는 플랫폼 밖 사용자에게 장비 격리 승인 링크를 메일로 보내는 예시를 들지만 승인자 인증 방식은 설명하지 않는다. Splunk SOAR (Cloud)는 외부 prompt 수신자에게 SAML 인증을 선택적으로 요구할 수 있다. 승인자 신원을 확인할 수 없는 외부 링크로는 호스트 격리처럼 영향이 큰 조치를 승인하지 않는다.
- **효과 측정**: 분류 시간, 대응 시간과 놓친 사건을 자기 환경에서 같은 조건으로 잰다. 공개된 1차 측정치인 CISA 파일럿의 IOC 최초 식별부터 차단 성공까지 걸린 시간 단축(평균 3일에서 약 3분)은 특정 절차의 결과이고, fact sheet가 측정 방법을 설명하지 않으므로 인시던트 전반의 대응 시간으로 일반화하지 않는다. ML 상관이나 AI 경고 분류는 SIEM, XDR의 분석 기능이나 AI 에이전트 기능으로 SOAR playbook과 구분하고, 오탐을 자동으로 닫을 때 생기는 미탐 위험까지 평가한다. 경보 묶음과 억제, 정밀도와 재현율 기준은 [[Alert-Fatigue|알람 피로]]를 따른다.

## 생성형 AI로 만든 보안 리포트의 검증

CSV가 생성됐다는 사실은 수집과 필드 변환이 정확하다는 증거가 아니다. 생성된 코드와 설명은 원 API 응답에 대조하고, 누락을 정상 결과로 바꾸지 않는지 확인한다.

다음은 2026-10-07 Amazon Inspector API Reference를 대조한 검증 예시다.

- **API와 수집 범위**: 의도한 제품 API, 계정, 리전과 필터인지 확인한다. `ListFindings` 응답에 `nextToken`이 있으면 후속 페이지를 조회한다. 첫 페이지를 전체 결과로 내보내지 않는다.
- **필드 매핑**: 패키지 취약점 식별자는 `packageVulnerabilityDetails.vulnerabilityId`에서 읽는다. 네트워크 도달성 등 다른 finding에는 이 객체가 없을 수 있으므로 모든 행에 CVE가 있어야 한다고 가정하지 않는다.
- **빈 값의 의미**: 적용되지 않는 필드, 파서가 놓친 필드, API 호출 실패를 같은 `N/A`나 0건으로 합치지 않는다. 원본 finding과 출력 행을 비교하고 수집이 끝나지 않았으면 불완전한 보고서로 표시한다.

이 항목들은 API 계약을 이용한 검토 기준이다. 특정 환경에서 코드를 실행하거나 취약점을 점검했다는 기록은 아니다. 보고서의 권고 조치를 실행할 때는 대상과 변경 영향, 승인과 복구 경로를 별도로 검토한다.

## 이해 점검

1. 차단 뒤에도 다른 자산의 침해 흔적을 찾아야 하는 이유는 무엇인가?
2. 서비스가 켜진 것과 안전하게 복구된 것은 어떻게 다른가?
3. 수집이 빠진 기간이 있으면 침해 타임라인의 어느 결론을 보류해야 하는가?
4. 탐지 도구가 경고를 냈지만 차단할 수 없는 이유를 제품 연결과 권한으로 설명할 수 있는가?
5. 어떤 대응 조치를 자동 실행하고 어떤 조치에 사람 승인을 둘지 확신도, 업무 영향과 되돌리기 쉬운 정도로 나눌 수 있는가?

## 출처

- [Microsoft Learn, Incidents and alerts in the Microsoft Defender portal](https://learn.microsoft.com/en-us/defender-xdr/incidents-overview)
- [AhnLab XDR 출시, 통합 보안의 정점을 향하다 — AhnLab](https://www.ahnlab.com/ko/contents/content-center/34045)
- [NIST, SP 800-61 Rev. 3: Incident Response Recommendations and Considerations for Cybersecurity Risk Management](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-61r3.pdf)
- [ASD ACSC, Best practices for event logging and threat detection](https://www.cyber.gov.au/business-government/detecting-responding-to-threats/event-logging/best-practices-for-event-logging-and-threat-detection)
- [Microsoft Learn, Automatic attack disruption in Microsoft Defender](https://learn.microsoft.com/en-us/defender-xdr/automatic-attack-disruption)
- [Microsoft Learn, Configure automatic attack disruption in Microsoft Defender XDR](https://learn.microsoft.com/en-us/defender-xdr/configure-attack-disruption)
- [Amazon Inspector API Reference, ListFindings](https://docs.aws.amazon.com/inspector/v2/APIReference/API_ListFindings.html)
- [Amazon Inspector API Reference, Finding](https://docs.aws.amazon.com/inspector/v2/APIReference/API_Finding.html)
- [Amazon Inspector API Reference, PackageVulnerabilityDetails](https://docs.aws.amazon.com/inspector/v2/APIReference/API_PackageVulnerabilityDetails.html)
- [NIST, SP 800-215: Guide to a Secure Enterprise Network Landscape](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-215.pdf)
- [NIST CSRC, Glossary: security orchestration, automation, and response](https://csrc.nist.gov/glossary/term/security_orchestration_automation_and_response)
- [CISA, State, Local, Tribal & Territorial Indicators of Compromise Automation Pilot Fact Sheet](https://www.cisa.gov/sites/default/files/publications/SLTT%2520IOC%2520Factsheet_Final_508c_0.pdf) — 2021-07-14 개정 아카이브 문서
- [OASIS, CACAO Security Playbooks Version 2.0](https://docs.oasis-open.org/cacao/security-playbooks/v2.0/security-playbooks-v2.0.html)
- [Microsoft Learn, Automation in Microsoft Sentinel](https://learn.microsoft.com/en-us/azure/sentinel/automation/automation)
- [Microsoft Learn, Automate threat response in Microsoft Sentinel with automation rules](https://learn.microsoft.com/en-us/azure/sentinel/automate-incident-handling-with-automation-rules)
- [Microsoft Learn, Recommended Microsoft Sentinel playbook use cases, templates, and examples](https://learn.microsoft.com/en-us/azure/sentinel/automation/playbook-recommendations)
- [Microsoft Learn, Automate Threat Response with Playbooks in Microsoft Sentinel](https://learn.microsoft.com/en-us/azure/sentinel/automation/automate-responses-with-playbooks)
- [Microsoft Learn, Authenticate playbooks to Microsoft Sentinel](https://learn.microsoft.com/en-us/azure/sentinel/automation/authenticate-playbooks-to-sentinel)
- [Microsoft Learn, Automation levels in automated investigation and remediation](https://learn.microsoft.com/en-us/defender-endpoint/automation-levels)
- [Microsoft Learn, Go to the Action center to view and approve your automated investigation and remediation tasks](https://learn.microsoft.com/en-us/defender-xdr/m365d-action-center) — 2026-09-01 Defender for Endpoint AIR 변경 공지
- [Microsoft Learn, Automated investigation and response in Microsoft Defender for Office 365](https://learn.microsoft.com/en-us/defender-office-365/air-about)
- [Microsoft Learn, Automated remediation in AIR](https://learn.microsoft.com/en-us/defender-office-365/air-auto-remediation)
- [Splunk Help, Approve actions before they run in Splunk SOAR (Cloud)](https://help.splunk.com/en/splunk-soar/soar-cloud/use-soar-cloud/get-started-using-splunk-soar-cloud/approve-actions-before-they-run-in-splunk-soar-cloud)
- [Splunk Help, Require user input using the Prompt block in your Splunk SOAR (Cloud) playbook](https://help.splunk.com/en/splunk-soar/soar-cloud/build-playbooks/use-the-playbook-editor-to-create-and-view-playbooks-to-automate-analyst-workflows/require-user-input-using-the-prompt-block-in-your-splunk-soar-cloud-playbook)
- [Google Cloud, Assign approval links in actions](https://docs.cloud.google.com/chronicle/docs/soar/respond/working-with-playbooks/assign-approval-links-in-actions)

## 관련 문서

- [[Security-Policy-and-Assessment|보안 정책과 점검]]
- [[Audit-Log|감사 로그]]
- [[Incident-Runbook|장애 대응 런북]]
- [[Incident-Recovery-Prevention|복구와 재발 방지]]
- [[Alert-Fatigue|알람 피로]]
