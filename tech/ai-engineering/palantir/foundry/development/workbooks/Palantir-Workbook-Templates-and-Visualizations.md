---
tags: [palantir, workbook, template, visualization, filesystem]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workbook template, chart와 파일 계약"]
---

# Workbook template, chart와 파일 계약

Template는 code의 dataset/column/변수 자리를 form parameter로 바꾸는 재사용 resource다. Text/number/select/multiselect/boolean/list type, 설명과 default를 명시한다. Toggle View로 생성 code를 확인한다. Form 제약이 underlying code의 정확성을 보장하지 않는다.

## Template version과 공유 parameter

생성 당시 global helper는 template에 포함되지만 소비 Workbook의 global code에는 접근하지 않는다. Template edit는 새 version이고 기존 instance를 자동 갱신하지 않는다. Upgrade prompt를 검토한 뒤 적용한다.

Multi-node는 여러 template의 parameter를 공유해 group/child pane 어디서 바꿔도 연결된 모든 instance 값을 바꾼다. 한 node만 바꾼다고 착각하지 않는다. Column parameter는 source dataset을 지정하고 dataset parameter는 같은 Workbook graph의 유효 node를 선택한다.

Suggested template는 persisted dataset tag와 input-tag 조건을 사용한다. Unsaved node는 dataset tag가 없어 추천을 지원하지 않는다. Multi-node output tag는 생성 dataset에 부여할 수 있다. Save-as-dataset 기본값은 template 소비 시 persistence 선택이며 코드 실행 완료와 별개다.

## Chart 출력과 interaction

Python Matplotlib/Seaborn은 `plt.show()`, Plotly는 `fig.show()`로 transform visualization을 반환한다. PNG 기본과 SVG hint/decorator를 구분한다. R ggplot은 plot과 `# image: svg`, custom device는 `graphicsFile`과 format hint를 사용한다.

한글/일본어는 Noto Sans/Serif CJK 등 설치된 font family를 명시한다. Available fonts의 DejaVu/Noto 목록은 해당 runtime 기준이며 local 환경에 같은 font가 있다고 가정하지 않는다. 옛 Matplotlib 2의 TTC 탐지 제약은 version별 문제다.

Plotly console은 static PNG이며 interactive chart는 graph transform에서 실행한다. 20,000점 초과는 browser 성능 권장 경계이고 scattergl/aggregation을 검토한다. 여러 Matplotlib node는 thread-safety 문제로 다른 node에 chart가 나타날 수 있어 `@synchronous_node_execution`을 적용한다.

Copy for Notepad로 chart를 소비 문서에 연결한다. Reports는 2022-10-03 이후 신규 고객 기본 제공이 아닌 역사적 경계다. 이미지 생성, 외부 문서의 데이터 갱신과 download 권한을 각각 확인한다.

## Filesystem input/output은 saved 경계가 필요하다

Python/R TransformInput은 imported/persisted dataset만 지원한다. Unsaved intermediate는 filesystem input이 아니다. Python `Transforms.get_output()`/R `new.output()`으로 file output을 쓰는 node는 saved dataset이어야 하고 console에서는 지원하지 않는다. Python output 객체를 사용한 뒤 다른 return value는 무시되는 계약이다.

R의 `fileSystem()`은 listing(path/size/modified), connection open, local temporary `get_path`와 upload를 제공한다. `disk_optimal=FALSE`는 다운로드 후 접근하고 TRUE는 다운로드와 실행을 겹치는 FIFO 경로라 library 호환성을 확인한다. Output을 쓰고 다시 읽는 경우 FALSE가 필요하다. R 문서의 PySpark type link 같은 표기 혼용을 언어간 객체 호환으로 읽지 않는다.

Gzip/zip은 streaming bytes와 명시한 encoding으로 읽고 CSV quoting을 보존한다. Java 병렬 unzip은 archive 파일 사이에 병렬화하며 단일 압축 파일 내부 split이 필요한 경우 format 특성을 검토한다. Transforms FAQ의 repository 다중 output/generation 예제를 Workbook의 single-output node 기능으로 혼동하지 않는다. Output bytes/format, stream close와 error 보존을 검증한다.

## 출처

- [Palantir, Templates](https://www.palantir.com/docs/foundry/code-workbook/templates-overview)
- [Palantir, Template tutorial](https://www.palantir.com/docs/foundry/code-workbook/templates-getting-started)
- [Palantir, Multi-node templates](https://www.palantir.com/docs/foundry/code-workbook/templates-multi-node)
- [Palantir, Suggested templates](https://www.palantir.com/docs/foundry/code-workbook/templates-suggested)
- [Palantir, Visualize data](https://www.palantir.com/docs/foundry/code-workbook/transforms-visualize)
- [Palantir, Available fonts](https://www.palantir.com/docs/foundry/code-workbook/available-fonts)
- [Palantir, Present visualizations](https://www.palantir.com/docs/foundry/code-workbook/present-visualizations)
- [Palantir, Access unstructured files](https://www.palantir.com/docs/foundry/code-workbook/transforms-unstructured)
- [Palantir, R filesystem](https://www.palantir.com/docs/foundry/code-workbook/r-filesystem)
- [Palantir, Transforms FAQ](https://www.palantir.com/docs/foundry/code-workbook/transforms-faq)

## 관련 문서

- [[Palantir-File-Parsing-and-Error-Outputs|Parser와 오류 출력]]
- [[Palantir-Workbook-Execution-and-Persistence|입출력과 저장]]
