---
tags: [security, open-source, license, supply-chain, compliance]
status: done
verified_at: 2026-10-14
category: "보안(Security)"
aliases: ["오픈소스 라이선스 검토", "OSS License Review", "상용 소프트웨어의 오픈소스 의무"]
---

# 오픈소스 라이선스 검토

오픈소스는 상용 사용과 유상 배포가 가능하지만, 그 허가에 붙은 조건까지 없어지는 것은 아니다. 라이선스 비용, 고지 의무, 소스 제공 의무와 유지보수 비용을 따로 판단한다. 소스를 읽을 수 있다는 사실만으로 OSI의 오픈소스 정의를 충족하지도 않는다. 사업 분야의 사용 제한 등을 포함하는 source-available 조건은 원문을 따로 확인한다. [OSI 정의](https://opensource.org/osd)

2026-10-02에 MIT, Apache License 2.0, GPLv3, AGPLv3와 GNU FAQ를 대조한 기본 검토 지식이다. 아래 절차는 원문 조건을 개발과 납품에 적용하기 위한 제안이다. 개별 결합 저작물의 범위, 추가 예외와 한국법상 계약의 효력은 이 문서만으로 확정하지 않는다.

## 공개 저장소와 오픈소스 허가는 다르다

2026-10-13에 GitHub의 저장소 라이선스 안내와 OSI 정의를 대조했다. 이 절의 확인은 위에 적은 개별 라이선스 검토 날짜와 구분한다.

- GitHub의 public 저장소라는 사실만으로 코드를 자유롭게 사용, 수정하거나 재배포할 허가가 생기지는 않는다. 별도 라이선스가 없으면 기본 저작권 규칙이 적용된다. 다만 GitHub 약관에 따른 플랫폼 내 열람과 fork 권한은 별개다. fork 버튼의 존재를 외주 납품이나 재배포 허가로 해석하지 않는다. [GitHub 라이선스 안내](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- 오픈소스 여부는 코드 접근뿐 아니라 재배포, 수정과 파생물 배포 등 이용 조건으로 판단한다. AI로 기능을 재구현할 수 있다는 시연만으로 원 제품의 소스나 라이선스가 공개됐다고 판단하지 않는다. 재구현물과 원 제품을 구분하고 각각의 권리와 포함 자산을 검토한다. 이는 OSI 정의를 적용한 검토 기준이며, 특정 역공학 방식의 적법성을 판정한 것은 아니다. [OSI 정의](https://opensource.org/osd)
- GitHub의 라이선스 표시는 알려진 라이선스 파일을 탐지한 결과다. 복수 라이선스나 복잡한 조건이 있으면 표시가 불명확할 수 있으므로 배지나 검색 필터만으로 판단하지 않고 실제 파일과 적용 범위를 읽는다. [GitHub 라이선스 탐지 안내](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository#detecting-a-license)

## 오픈 웨이트 모델과 Open Source AI는 다르다

2026-10-14에 OSI의 Open Source AI Definition 1.0(2024-10-28 공개)과 Llama 3.1 Community License 원문을 대조했다. 이 절의 확인 날짜는 위의 다른 절과 구분한다.

- OSAID 1.0은 AI 시스템을 어떤 목적으로든 사용하고, 동작을 연구하고, 수정하고, 공유할 자유를 요구한다. 수정에 적합한 형태로 데이터 정보(Data Information), 코드(Code), 파라미터(Parameters)를 모두 제공해야 한다. 코드는 학습과 실행에 쓴 전체 소스 코드다. [OSAID 1.0](https://opensource.org/ai/open-source-ai-definition)
- 데이터 정보는 숙련자가 실질적으로 동등한 시스템을 만들 수 있을 만큼 상세해야 한다. 학습에 쓴 데이터 전체(공유할 수 없는 데이터를 썼다면 그것도 포함)의 출처, 범위와 특성, 수집과 선별 방법, 라벨링 절차, 처리와 필터링 방법을 설명하고, 공개 데이터와 제3자에게서 구할 수 있는 데이터(유료 포함)의 목록과 입수처를 밝혀야 한다. 요구 요소는 데이터 원본이 아니라 이 데이터 정보다. [OSAID 1.0](https://opensource.org/ai/open-source-ai-definition)
- 같은 정의는 Open Source 모델과 Open Source 가중치가 그 파라미터를 도출한 데이터 정보와 코드를 포함해야 한다고 적는다. 가중치를 내려받을 수 있다는 사실(오픈 웨이트)만으로 Open Source AI라고 판단하지 않고, 모델 카드의 라이선스와 이용 정책 원문을 코드 라이선스와 별도로 확인한다.
- 예를 들어 Llama 3.1 Community License는 출시일(2024-07-23)에 라이선스 이용자나 계열사가 제공하는 제품과 서비스의 직전 달 월간 활성 사용자가 7억 명을 넘었다면 Meta의 별도 라이선스를 받기 전까지 권리를 주지 않는다. Llama 자료나 이를 포함한 제품과 서비스를 배포하거나 제공하면 계약서 사본을 함께 주고 Built with Llama를 눈에 띄게 표시해야 하며, Llama 자료나 그 출력으로 만들거나 미세조정한 모델을 배포하거나 제공하면 모델 이름 앞에 Llama를 붙여야 한다. Acceptable Use Policy 준수도 조건이다. [Llama 3.1 License](https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/LICENSE)
- 미세조정, 가중치 병합이나 증류로 만든 파생 모델은 원 모델들의 조건을 함께 확인한다. 어댑터와 병합 모델의 공급망 위험은 [[LLM-Application-Security#LLM03 공급망|LLM 공급망]]에서 다룬다.

## 무엇을 어떤 방식으로 제공하는가

1. 실제 릴리스에 포함한 직접/전이 의존성, 복사한 코드, 번들, 컨테이너와 생성 산출물을 확인한다. 저장소의 의존성 선언만으로 납품물 전체를 설명할 수는 없다.
2. 사용한 버전의 `LICENSE`, 파일별 고지, `NOTICE`, 추가 예외와 별도 상용 계약을 보관한다. 프로젝트 이름이나 최신 홈페이지의 라이선스를 과거 버전에 자동 적용하지 않는다.
3. 사내 실행, 서버에서만 실행하는 서비스, 사용자에게 전달하는 브라우저 코드, 설치형 제품과 고객에게 넘기는 이미지/소스를 구분한다. SaaS라는 상품명만으로 배포 여부가 정해지지 않는다.
4. 원본 수정, 코드 복사, 라이브러리 결합과 별도 프로그램 간 통신을 기록한다. 프로세스나 API를 나눴다는 사실만으로 결합 저작물의 범위가 확정된다고 보지 않는다.
5. 의무를 수행할 사람과 납품 위치를 정한다. 고지문을 저장소에만 남기고 실제 사용자에게 전달하는 아티팩트에서 빠뜨리지 않았는지 확인한다.

의존성 버전, 제품의 배포 방식, 고객 계약이나 자산 매각 범위가 바뀌면 다시 검토한다. 다른 라이선스의 코드를 결합할 때는 각 라이선스의 조건을 함께 충족할 수 있는지 확인한다. GNU FAQ의 호환성 설명도 결합 방식에 따라 판단이 달라질 수 있다고 구분한다. [GNU FAQ](https://www.gnu.org/licenses/gpl-faq.en.html#WhatIsCompatible)

## 대표 라이선스의 조건

### MIT

- 사용, 수정, 배포, 재라이선스와 판매를 허용한다.
- 소프트웨어의 모든 복제물 또는 실질적인 부분에 저작권 고지와 허가 고지를 포함해야 한다. 허용형 라이선스라는 이유로 이를 지우지 않는다.
- MIT 원문은 수정본의 소스 공개를 요구하지 않는다. 제품에 함께 들어간 다른 구성요소의 조건은 별도로 확인한다. [MIT 원문](https://opensource.org/license/mit)

### Apache License 2.0

- 재배포 시 라이선스 사본을 제공하고, 수정한 파일에는 변경 사실을 눈에 띄게 표시한다. 배포하는 파생물의 소스에서는 관련 저작권, 특허, 상표와 귀속 고지를 유지한다.
- 원본 배포물에 `NOTICE`가 있으면 파생물 배포 시 관련 귀속 고지를 읽을 수 있게 전달한다. 원문이 허용하는 파일, 문서 또는 표시 위치를 확인한다. 모든 프로젝트에 새 `NOTICE`를 만드는 의무로 확대하지 않는다.
- 특허 허가는 기여자가 허가할 수 있고 해당 기여물 등에 의해 필연적으로 침해되는 청구항 범위다. 모든 특허 분쟁의 면책을 뜻하지 않는다. 원문의 해당 특허 소송 조건을 충족하면 그 저작물에 대한 특허 허가가 종료된다.
- 상표 사용권은 일반적으로 부여하지 않으며 원문 제6조의 제한된 예외를 확인한다. 소스 공개 의무가 없는 허용형 조건과 이 고지/특허 조건을 함께 검토한다. [Apache 2.0 제3, 4, 6조](https://www.apache.org/licenses/LICENSE-2.0)

### GPLv3

- 사적으로 수정하고 실행하는 것만으로 수정본을 공개 저장소에 게시할 의무가 생기지는 않는다. GPLv3 제0조는 복제물 전달 없는 네트워크 상호작용을 `conveying`으로 보지 않는다.
- 소스나 바이너리 복제물을 전달한다면 제4~6조의 고지, 라이선스와 소스 제공 조건을 검토한다. 수정하지 않은 바이너리를 전달하는 경우도 소스 조건을 확인한다.
- 제5조의 프로그램에 기반한 저작물을 전달하는 경우 그 전체에 GPL 조건을 적용해야 한다. 제5조가 정의한 독립 저작물의 단순 집합(`aggregate`)은 다른 부분까지 GPL로 바꾸지 않는다. 실제 결합물이 어느 쪽인지 이름만으로 판정하지 않는다.
- 바이너리의 `Corresponding Source`는 수정뿐 아니라 생성, 설치와 실행에 필요한 소스와 제어 스크립트 등을 포함하며 제1조의 제외 범위도 있다. 수정한 패치 몇 개나 최신 원본 저장소 주소만으로 충족했다고 판단하지 않는다.
- 제6조의 실제 전달 방식에 맞는 소스 제공 경로와 유지 조건을 확인한다. 공개 GitHub 저장소가 유일한 이행 방식은 아니다. 그렇다고 수령자의 GPL상 재배포 권리를 별도 비밀유지 조건으로 막을 수 있다고 가정하지 않는다. [GPLv3 제0, 1, 4~6, 10조](https://www.gnu.org/licenses/gpl-3.0.html)

### AGPLv3

- GPL 계열의 전달 조건에 더해 제13조의 네트워크 상호작용 조건을 확인한다.
- 프로그램을 수정했고 그 수정 버전이 원격 네트워크 상호작용을 지원한다면, 해당 버전과 원격으로 상호작용하는 모든 사용자에게 그 버전의 `Corresponding Source`를 무료로 복사할 수 있는 네트워크 제공 기회를 눈에 띄게 제시해야 한다.
- AGPL 프로그램을 사용했다는 이유만으로 회사의 모든 저장소나 관련 없는 서비스 코드를 공개해야 한다고 일반화하지 않는다. 수정 버전과 결합 저작물의 범위, 해당 소스와 추가 허가를 확인한다. 제13조는 그 조항에 따라 결합한 GPLv3 저작물의 해당 소스도 포함하도록 규정한다. [AGPLv3 제13조](https://www.gnu.org/licenses/agpl-3.0.html)

## SaaS에서 놓치기 쉬운 경계

서버에서만 실행하는 GPL 프로그램의 수정본과 방문자의 브라우저로 전달하는 GPL JavaScript는 같은 조건으로 처리하지 않는다. GNU FAQ는 전자의 비배포 사용과 후자의 사용자에게 코드가 전달되는 경우를 구분한다. 수정한 AGPL 프로그램의 원격 상호작용 조건도 별도 확인 대상이다. SaaS이면 전부 공개 또는 SaaS이면 의무 없음이라는 단정으로 검토를 끝내지 않는다. [GNU FAQ](https://www.gnu.org/licenses/gpl-faq.en.html#UnreleasedMods)

고객사 온프레미스 설치, 컨테이너 전달이나 프로젝트 매각을 계획하면 기존 서버 운영 때의 판단을 그대로 재사용하지 않는다. 특정 제품의 상용 라이선스 또는 추가 허가를 선택했다면 그 계약이 허용하는 버전, 고객, 복제물과 전달 범위를 확인한다.

## 목록과 계약 판단을 구분한다

- `MIT`, `Apache-2.0` 같은 SPDX 식별자는 라이선스를 일관되게 가리키는 표기다. 패키지에 붙은 표기가 실제 포함 파일의 조건과 같은지는 원문에서 확인한다. [SPDX License List](https://spdx.org/licenses/)
- SBOM은 릴리스에 무엇이 포함됐는지 확인하는 출발점이다. 목록이 있다는 사실만으로 고지 전달, 소스 제공, 결합 범위와 계약상 권한까지 검토가 끝나지는 않는다.
- 아이콘, 폰트, 사진, 데이터셋과 모델 가중치는 코드와 함께 전달되더라도 각각의 이용 조건을 확인한다. 저장소 루트의 코드 라이선스가 모든 외부 자산을 허가한다고 추정하지 않는다.
- 외주 납품에서는 제3자 구성요소 목록, 라이선스/고지문, 수정 내역과 필요한 소스 제공 책임을 함께 인계하도록 협의한다. 타인의 오픈소스 권리까지 고객에게 독점 양도할 수 있다고 약속하지 않는다.

## 판단 연습

1. 서버에서만 쓰던 GPLv3 프로그램을 수정한 컨테이너를 고객에게 전달한다. 전달 방식, 고지, 해당 소스와 결합 범위를 다시 검토해야 하는 이유를 설명한다.
2. 수정한 AGPLv3 서버에 고객이 원격으로 접속한다. 제13조의 조건과 제공할 소스 범위를 설명하고, 회사의 모든 저장소 공개라는 결론에 필요한 근거가 있는지 구분한다.

## 출처

- [GitHub Docs, Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [OSI, The Open Source Definition](https://opensource.org/osd)
- [OSI, The MIT License](https://opensource.org/license/mit)
- [Apache Software Foundation, Apache License Version 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [GNU, GNU General Public License Version 3](https://www.gnu.org/licenses/gpl-3.0.html)
- [GNU, GNU Affero General Public License Version 3](https://www.gnu.org/licenses/agpl-3.0.html)
- [OSI, GNU Affero General Public License Version 3](https://opensource.org/license/agpl-3.0)
- [GNU, Frequently Asked Questions about the GNU Licenses](https://www.gnu.org/licenses/gpl-faq.en.html)
- [SPDX, License List](https://spdx.org/licenses/)
- [OSI, The Open Source AI Definition 1.0](https://opensource.org/ai/open-source-ai-definition)
- [Open Source AI Definition on the road: Looking back and forward — OSI](https://opensource.org/blog/open-source-ai-definition-on-the-road-looking-back-and-forward) (1.0 공개일)
- [Meta, Llama 3.1 Community License Agreement](https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/LICENSE)

## 관련 문서

- [[Supply-Chain-Security|공급망 보안]] — 구성요소의 출처와 악성 배포 위험
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캐닝]] — 스캔 결과와 SBOM의 범위
- [[Side-Project-Asset-Sale|사이드 프로젝트와 디지털 자산 매각]] — 제3자 권리와 인계 조건
- [[LLM-Application-Security|LLM 애플리케이션 보안]] — 사전학습 모델, 어댑터와 병합 모델의 공급망 위험
- [[보안(Security)|보안 인덱스]]
