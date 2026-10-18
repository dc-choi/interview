---
tags: [palantir, data-lifetime, retention, lineage]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Data Lifetime 계보 기반 삭제"]
---

# 계보를 따르는 삭제 정책

Data Lifetime은 dataset transaction에 삭제 날짜를 정하고 그 transaction에서 파생한 downstream transaction에도 전파하는 lineage-aware retention이다. Retention application의 일반 정책은 이 전파를 하지 않는다. 두 정책을 함께 쓸 수 있지만 Data Lifetime의 날짜 화면은 다른 retention policy의 더 이른 삭제일을 합산하지 않는다.

## 삭제 단위와 branch 범위

Fixed deletion date는 root dataset의 모든 branch transaction에 같은 날짜를 준다. Cutoff를 지정하면 그 이전 commit만 대상이고 이후는 날짜가 없을 수 있다. Dataset row의 business timestamp를 자동 기준으로 삼는 정책이 아니다.

Latest view only는 정책이 지정한 branch 중 어느 하나의 latest view에 포함된 transaction을 유지한다. 포함되지 않은 history에는 즉시 삭제 가능한 날짜가 붙고, 정책에 포함되지 않은 branch의 latest view에만 남은 transaction도 보호되지 않는다. APPEND/UPDATE가 기존 view에 기여하면 유지할 수 있지만 새 SNAPSHOT은 이전 view transaction의 재평가를 일으킨다. Latest transaction 하나만 남기는 것과 latest view를 구성하는 transaction들을 남기는 것은 다르다.

Downstream은 parent transaction의 삭제일 또는 삭제일 없음을 계승한다. Root/upstream부터 정책을 검토하고 branch와 downstream impact를 확인한다. Data Lifetime은 현재 dataset만 대상으로 하며 media set/model asset에도 같은 정책이 지원된다고 가정하지 않는다.

## Policy override는 상속을 끊는 별도 권한이다

집계/최소화된 downstream을 더 오래 유지해야 하는 경우 override로 upstream 삭제일 상속을 끊을 수 있다. Superseding policy를 지정하거나 replacement 없이 override할 수 있다. 후자는 해당 transaction/downstream에 삭제일이 없어질 수 있다. 다른 lineage를 통해 별도 정책을 이미 받는 downstream에는 대체 정책이 그대로 적용되지 않을 수 있으므로 최종 날짜를 확인한다.

Override는 Data Governance Officer를 요구한다. Namespace/Policy/Dataset View 권한과 함께 판단하며 Dataset Editor가 할 수 있는 기존 policy 적용/제거와 namespace policy 생성/수정/삭제 권한을 구분한다. Creation guide의 Editor 또는 Officer라는 넓은 prerequisite를 policy 생성 권한표보다 우선하지 않는다.

## 적용 이력과 실제 삭제는 다르다

Policy History의 Applications/Removals는 dataset에 policy를 적용/제거한 기록이다. Removals를 data deletion으로 보고하지 않는다. 실제 deleted/marked transaction은 Deletions에서 transaction RID/time range로 확인한다. RID는 Dataset Preview History의 transaction details에서 찾는다.

최신 view 정책 적용이 underlying storage의 즉시 물리 삭제를 뜻하지 않는다. 정책 평가/삭제는 rate limited이며 하루 여러 번 mark하고 storage 정리에는 시간이 걸린다. FAQ는 통상 긴 경우 약 30일을 안내하지만 모든 환경의 확정 삭제 SLA로 확대하지 않는다. Policy 제거가 이미 삭제된 데이터를 복원하지도 않는다.

Policy 적용/제거와 override 권한을 제한하고 필요하면 Checkpoint justification으로 근거를 기록한다. 삭제 범위의 법적 적합성은 이 기능의 성공 메시지로 증명되지 않으며 해당 조직의 적용 요건과 실제 파생 data 범위를 확인한다. 이 문서는 설정 계약 학습이며 실제 삭제를 실행한 기록이 아니다.

## 출처

- [Palantir, Data Lifetime](https://www.palantir.com/docs/foundry/data-lifetime)
- [Palantir, Core concepts](https://www.palantir.com/docs/foundry/data-lifetime/core-concepts-data-lifetime)
- [Palantir, Create a deletion policy](https://www.palantir.com/docs/foundry/data-lifetime/creating-a-deletion-policy)
- [Palantir, Implications of deletion policies](https://www.palantir.com/docs/foundry/data-lifetime/deletion-policies-implications)
- [Palantir, Getting started](https://www.palantir.com/docs/foundry/data-lifetime/getting-started)
- [Palantir, Policy overrides](https://www.palantir.com/docs/foundry/data-lifetime/policy-overrides)
- [Palantir, Remove a deletion policy](https://www.palantir.com/docs/foundry/data-lifetime/removing-a-policy)
- [Palantir, View policy activity history](https://www.palantir.com/docs/foundry/data-lifetime/view-changes-applied-policy)
- [Palantir, FAQ](https://www.palantir.com/docs/foundry/data-lifetime/FAQ)

## 관련 문서

- [[Palantir-Dataset-Preview-and-Parsing|History 확인]]
- [[Palantir-Checkpoint-Scope-and-Evidence|Policy 변경 근거]]
