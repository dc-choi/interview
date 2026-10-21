---
tags: [linux, nixos, digital-sovereignty, interoperability, workplace]
status: done
verified_at: 2026-10-22
category: "OS&런타임(OS&Runtime)"
aliases: ["디지털 자율 업무환경", "Sovereign Workplace Stack", "DAWO"]
---

# 디지털 자율 업무환경의 구성과 검증

디지털 자율 업무환경은 OS, 업무 앱, 계정과 운영 기반을 조직이 통제하고 필요에 따라 교체할 수 있도록 설계하는 접근이다. OS만 교체하는 것과 메일, 협업, 인증까지 포함한 업무환경을 전환하는 것은 범위가 다르다.

## OS와 전체 업무환경을 구분한다

2026-10-22 확인한 네덜란드 정부의 DAWO 공개 저장소는 상호운용성과 디지털 자율성을 목표로 다음 구성요소를 나눈다. 아래는 프로젝트 구성의 확인이며 전국 배포 완료나 운영 성능의 검증이 아니다.

| 계층 | 공개된 구성과 추진 범위 |
|---|---|
| 운영체제 | NixOS 기반 DAWO-NixOS, 대안 개발 경로인 DAWO-Fedora-Kinoite |
| 장비 관리 | DAWO-NixOS의 fleet manager인 DAWO-Sextant |
| 공통 기반 | DAWO-Cloud, DAWO-IAM, DAWO-AI를 별도 구성요소로 관리 |
| 협업 도구 | MijnBureau를 중심으로 개발하고 OpenDesk, La Suite와 협력 |

DAWO-NixOS 저장소는 NixOS를 통해 업무용 장비를 자동으로 동일하게 구성하는 코드를 제공한다. 이를 Windows와의 바이너리 호환성이나 기존 업무 앱의 무수정 실행을 보장하는 것으로 해석하지 않는다.

## 파일럿은 통합과 사용자 적합성을 확인한다

2026-04-07 정부 발표는 네 지방자치단체가 Linux 노트북과 MijnBureau의 초기 버전을 시험한다고 설명했다. 파일럿의 목적은 사용자 피드백, 기존 시스템과의 통합 개선, 먼저 운영에 적용할 수 있는 직원 집단의 식별이었다. 당시 발표된 참여 수와 일정은 현재 참여 수나 전면 도입 결과를 뜻하지 않는다.

이 사례에서 도출할 수 있는 전환 점검은 다음과 같다.

1. **재구성:** 새 장비에서 필요한 OS와 앱 구성을 다시 만들고, 업데이트 실패 시 복구할 수 있는지 확인한다.
2. **업무 호환성:** 문서 서식, 메일, 공동 편집, 프린터와 기존 업무 앱의 핵심 과업을 실제 사용자로 시험한다.
3. **계정과 데이터:** 로그인, 권한 회수, 자료 내보내기와 복구를 OS 설치와 별도로 검증한다.
4. **운영 책임:** 보안 패치, 장비 관리, 사용자 지원과 장애 대응의 담당자를 정한다.

위 목록은 공개 구성과 파일럿 목적에서 도출한 설계 제안이다. DAWO의 구현이나 특정 조직의 마이그레이션을 직접 시험한 결과가 아니다.

## 선택의 비용과 한계

구성 코드를 공개하고 교체 가능한 구성요소를 두면 의존 관계를 검토할 근거가 생긴다. 그러나 공개 저장소가 있다는 사실만으로 외부 서비스 의존성, 보안 취약점이나 운영 인력 부담이 사라지지는 않는다.

전환 여부는 라이선스 비용뿐 아니라 통합, 교육, 지원과 복구 비용을 함께 비교해 결정한다. 특정 국가나 공급자가 서비스를 중단했다는 개별 사건의 원인과 이 프로젝트의 착수 계기는 별도 1차 근거 없이 연결하지 않는다.

## 출처

- [DAWO 구성요소 — 네덜란드 내무부, code.overheid.nl](https://code.overheid.nl/MinBZK/DAWO)
- [DAWO-NixOS — 네덜란드 내무부, code.overheid.nl](https://code.overheid.nl/MinBZK/DAWO-NixOS)
- [Municipalities to test autonomous digital workplaces — Digital Government](https://www.nldigitalgovernment.nl/netherlands-digitalisation-strategy-nds/dossierpostcontext/dutch-municipalities-explore-autonomous-digital-work-environment/)

## 관련 문서

- [[Linux-File-System|Linux 파일시스템]]
- [[Cloud-Migration-Strategies|클라우드 전환 전략]]
- [[Service-Continuity-and-Exit|서비스 지속성과 종료 설계]]
