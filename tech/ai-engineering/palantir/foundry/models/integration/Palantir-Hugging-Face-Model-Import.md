---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Hugging Face import와 sunset adapter의 재사용 범위

현재 import-huggingface-models와 language-models-adapters는 옛 no-code Import an open source model과 기본 adapter가 deprecated/sunset이고 유지보수/새 기능을 제공하지 않는다고 명시한다. Chinese alias의 옛 language-models-import는 해당 wizard가 현재도 가능하다고 증명하지 않는다. 번역 정확성도 원문에 미검증이라고 표시되어 있다.

## 파일과 네트워크

모델 hub의 Files and versions를 unstructured dataset에 가져오되 binary weight format은 필요한1개를 고른다. driver로 복사한 뒤 tokenizer/model을 from_pretrained하고 자신의 adapter로 publish한다. 또는 egress를 열어 직접 download한다. 현재 문서는 huggingface.co,hf.co,xethub cas-bridge/cas-server/transfer,cdn-lfs와 지역별cdn-lfs,us.gcp.cdn.hf.co/us.aws.cdn.hf.co를 안내하지만 domain은 변경될 수 있어 blocked request를 확인한다.

옛 Chinese add-new alias의2domain 목록을 현재 완전한 allowlist로 재사용하지 않는다. repo에 transforms-external-systems와 policy/ExportControl을 설정한다. /.cache permission 오류는 writable temporary cache_dir로 피한다. 외부 model code의 trust_remote_code=true는 arbitrary code 실행을 포함할 수 있어 source/license/dependency를 직접 검토한다.

## Sunset code에서 얻을 수 있는 구조

Seq2Seq/Causal adapter는 text→prediction, NER는 entity/score/token index/word/start/end, embedding은 attention-mask mean pooling 뒤 L2 normalization을 사용한다. text classification은 prediction/logits/classes의 순서를 보존하고 zero-shot은 candidate_labels와 score/label 순서를 다룬다. 실제 제공 code의 output schema가 설명문과 다른 부분은 그대로 강한 타입으로 간주하지 않는다.

GPU는 load가 아니라 첫 predict에서 이동하도록 lazy initialization한다. load와 inference가 다른 process여서 CUDA shared-memory 재초기화 오류를 피하려는 구조다. DeviceMixin에는 pipeline flag 이름이 일치하지 않는 code가 남아 있어 지원되는 완성 library로 재사용하지 않는다.

Seq2Seq finetune은 eval_data를 생략하면 training data를 다시 사용하며 독립 품질 평가가 아니다. ROUGE는 reference와 lexical overlap/sequence를 비교하는 지표이며 domain factuality를 보장하지 않는다. zero-shot은 row별 label이 constructor default보다 우선하고 labels가 없으면 실패한다. preserve_scores_order는 원래 candidate 순서로 돌려놓는다.

기존 code를 출발점으로 자체 repo에서 유지보수하고 현재 auto serializer를 검토한다. sunset adapter는 direct deployment 같은 새 기능 지원을 받지 않는다.

## 출처

- [Palantir, import-huggingface-models](https://www.palantir.com/docs/foundry/integrate-models/import-huggingface-models)
- [Palantir, language-models-adapters](https://www.palantir.com/docs/foundry/integrate-models/language-models-adapters)
- [Palantir, language-models-add-new (미검증 번역 alias)](https://palantir.com/docs/zh/foundry/integrate-models/language-models-add-new/)
- [Palantir, language-models-import (미검증 번역 alias)](https://palantir.com/docs/zh/foundry/integrate-models/language-models-import/)

## 관련 문서

- [[Palantir-Model-Serialization]]
- [[Palantir-Model-GPU-Environment]]
