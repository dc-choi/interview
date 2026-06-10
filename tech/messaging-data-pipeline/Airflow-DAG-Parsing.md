---
tags: [airflow, data-pipeline, performance, observability]
status: done
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Airflow DAG Parsing", "Airflow DAG 파싱 최적화"]
---

# Airflow DAG 파싱 최적화

## DAG 파싱이란

dag-processor가 `dags/` 폴더의 모든 `.py` 파일을 **import → DAG 객체 생성 → 직렬화(serialized_dag)** 하여 메타스토어에 저장하는 과정. 스케줄러는 이 직렬화본을 읽어 스케줄링한다.

핵심은 **파싱이 일회성이 아니라 주기적으로 반복**된다는 점이다. `min_file_process_interval` 주기마다 모든 DAG 파일을 다시 import, 실행하므로, 파일이 많거나 top-level 코드가 무거우면 파싱 사이클이 길어지고 → 스케줄 지연, CPU 점유로 이어진다. DAG 파일의 **top-level 코드는 매 파싱마다 실행**되며, 이게 파싱 비용의 본질이다.

Airflow 3.x에서 dag-processor는 스케줄러와 분리된 **독립 서비스**다(2.x는 스케줄러 내부).

## 진단: 측정이 먼저 (직감 금지)

코드를 열어보기 전에 메트릭으로 범인을 특정한다.

| 메트릭 | 의미 |
|---|---|
| `dag_processing.total_parse_time` | 전체 파싱 사이클 소요 시간 |
| `dag_processing.last_duration.<filename>` | **파일별** 파싱 시간 → 어떤 파일이 느린지 특정 |

목표 주기 대비 실측 사이클을 비교한다. 예: 설정 주기 30초인데 실측이 155초(약 5배)면 파싱이 밀리고 있다는 신호 — 튜닝으로 ~72초까지 줄일 수 있다.

## 최적화 레버 (ROI 순)

**인프라 튜닝이 코드 수정보다 먼저다(ROI 큼).** 코드 레벨 안티패턴 제거는 그다음.

| 레버 | 효과 | 트레이드오프 |
|---|---|---|
| `parsing_processes` ↑ | 파일 병렬 파싱 | CPU/메모리 마진 내에서만 |
| `min_file_process_interval` ↑ | 재파싱 빈도 ↓ | DAG 변경 반영이 늦어짐 |
| `parsing_pre_import_modules` | 공통 무거운 모듈을 미리 한 번 import → 워커가 재사용 | 일회성 import 비용 vs N회 반복 비용 |
| `file_parsing_sort_mode` | 파싱 순서 제어(modified_time / alphabetical / random) | — |
| `.airflowignore` | 파싱 대상에서 명시적 제외(DAG 아닌 `.py`, 테스트, 유틸) | 패턴 관리 필요 |
| `dag_discovery_safe_mode` | `airflow`/`dag` 키워드 포함 파일만 스캔 | **이것만으론 불충분** → `.airflowignore` 병행 |

## 안티패턴 — top-level 실행 코드

DAG 파일 최상위에서 실행되는 코드는 **매 파싱마다** 비용을 낸다.

- top-level `Variable.get()` / `Connection.get()` → 매 파싱마다 메타DB 조회
- top-level 클라이언트 인스턴스화 (`PostgresClient()`, `KISClient()` 등) → 매 파싱마다 연결, 객체 생성

해결: 이런 코드를 **task 내부(런타임)로 내리거나 지연 평가**한다. 탐지는 정규식 스캔으로:

`rg "^(Variable\.get|Connection\.get)" */dags/`
`rg "^(PostgresClient|KISClient)\(" */dags/`

## 2.x → 3.x 변경점 (주의)

- **설정 섹션 이동**: `[scheduler]` → `[dag_processor]` (`parsing_processes` 등)
- **`.airflowignore` 기본 문법 변경**: regexp → **glob**. 기존 regex 패턴이 glob에서 매칭 실패하면 제외가 안 되어 파싱 대상이 조용히 폭증하는 **silent breaking change**가 생긴다.
- 매칭 검증: `find_path_from_directory(d, '.airflowignore', ignore_file_syntax='glob')` 결과로 실제 제외 목록 확인.

## 면접 체크포인트

- "Airflow가 느려졌다" → 코드 보기 전 **메트릭(`total_parse_time`, `last_duration`)으로 범인 파일, 사이클부터 측정**. (추상화가 샐 때 밑단을 측정으로 짚는 사고)
- **파싱 타임 비용 vs 런타임 비용** 구분 — top-level 코드는 파싱마다, task 코드는 실행 시에만.
- 인프라 파라미터의 트레이드오프를 설명할 수 있는가: `parsing_processes` ↔ CPU, `min_file_process_interval` ↔ 변경 반영 지연.

## 출처

- [Apache Airflow 3.x DAG Parsing 최적화 체크리스트 — DEVOCEAN (SK)](https://devocean.sk.com/blog/techBoardDetail.do?id=168274&boardType=techBlog&isShared=Y)

## 관련 문서

- [[메시징&파이프라인(Messaging&Pipeline)]] — 카테고리 인덱스
