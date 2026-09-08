"""Score a fixed query and candidate set with a pinned local cross-encoder."""
import argparse
import hashlib
import json
import math
import time
from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


MAX_CANDIDATES = 50
MAX_MODEL_TOKENS = 512
BATCH_SIZE = 8


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def load_model_manifest(directory):
    manifest = json.loads((directory / 'experiment-model.json').read_text())
    if not isinstance(manifest.get('files'), dict):
        raise ValueError('Model manifest files must be an object')
    for name, expected in manifest['files'].items():
        relative = Path(name)
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('Invalid model manifest path')
        if sha256((directory / relative).read_bytes()) != expected:
            raise ValueError('Model file checksum mismatch: ' + name)
    return manifest


def load_queries(raw):
    payload = json.loads(raw)
    queries = payload.get('queries')
    if not isinstance(queries, list) or not queries:
        raise ValueError('Input must contain a non-empty queries array')
    ids = set()
    for query in queries:
        if not isinstance(query, dict) or not isinstance(query.get('id'), str) or not query['id']:
            raise ValueError('Each query needs a non-empty string id')
        if query['id'] in ids:
            raise ValueError('Duplicate query id: ' + query['id'])
        ids.add(query['id'])
        if not isinstance(query.get('query'), str) or not query['query']:
            raise ValueError('Each query needs non-empty query text')
        candidates = query.get('candidates')
        if not isinstance(candidates, list) or len(candidates) > MAX_CANDIDATES:
            raise ValueError(f'Each query needs at most {MAX_CANDIDATES} candidates')
        candidate_ids = set()
        for candidate in candidates:
            if not isinstance(candidate, dict) or not isinstance(candidate.get('id'), str) or not candidate['id']:
                raise ValueError('Each candidate needs a non-empty string id')
            if candidate['id'] in candidate_ids:
                raise ValueError(f"Duplicate candidate id in {query['id']}: {candidate['id']}")
            candidate_ids.add(candidate['id'])
            if not isinstance(candidate.get('text'), str) or not candidate['text']:
                raise ValueError('Each candidate needs non-empty text')
    return queries


def token_lengths(tokenizer, query, candidates):
    encoded = tokenizer([query] * len(candidates), [item['text'] for item in candidates],
                        add_special_tokens=True, truncation=False, padding=False)
    return [len(item) for item in encoded['input_ids']]


def score_query(model, tokenizer, device, query):
    candidates = query['candidates']
    if not candidates:
        return [], {'pairs': 0, 'truncated_pairs': 0, 'max_untruncated_tokens': 0}, 0.0
    lengths = token_lengths(tokenizer, query['query'], candidates)
    started = time.perf_counter()
    scores = []
    for offset in range(0, len(candidates), BATCH_SIZE):
        batch = candidates[offset:offset + BATCH_SIZE]
        inputs = tokenizer(
            [query['query']] * len(batch), [item['text'] for item in batch],
            padding=True, truncation=True, max_length=MAX_MODEL_TOKENS, return_tensors='pt',
        ).to(device)
        with torch.no_grad():
            logits = model(**inputs, return_dict=True).logits.view(-1).float().cpu().tolist()
        for candidate, score in zip(batch, logits):
            if not math.isfinite(score):
                raise ValueError('Non-finite model score')
            scores.append({'id': candidate['id'], 'score': score})
    scores.sort(key=lambda item: (-item['score'], item['id']))
    for rank, item in enumerate(scores, 1):
        item['rank'] = rank
    return scores, {
        'pairs': len(candidates),
        'truncated_pairs': sum(length > MAX_MODEL_TOKENS for length in lengths),
        'max_untruncated_tokens': max(lengths),
    }, round((time.perf_counter() - started) * 1000, 2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()

    raw = args.input.read_bytes()
    queries = load_queries(raw)
    manifest = load_model_manifest(args.model)
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    if device == 'cpu':
        torch.set_num_threads(4)
    started = time.perf_counter()
    tokenizer = AutoTokenizer.from_pretrained(args.model, local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(args.model, local_files_only=True).to(device)
    model.eval()
    load_ms = round((time.perf_counter() - started) * 1000, 2)

    warmup_ms = None
    first = next((query for query in queries if query['candidates']), None)
    if first:
        _, _, warmup_ms = score_query(model, tokenizer, device, {
            'id': first['id'], 'query': first['query'], 'candidates': first['candidates'][:1],
        })
    results = []
    for query in queries:
        scores, tokens, ranking_ms = score_query(model, tokenizer, device, query)
        results.append({'id': query['id'], 'ranking_ms': ranking_ms, 'tokens': tokens, 'scores': scores})
    args.output.write_text(json.dumps({
        'input_sha256': sha256(raw),
        'scorer_sha256': sha256(Path(__file__).read_bytes()),
        'model': manifest,
        'device': device,
        'batch_size': BATCH_SIZE,
        'max_model_tokens': MAX_MODEL_TOKENS,
        'tokenization': 'pair,longest_first,truncation,padding',
        'model_load_ms': load_ms,
        'warmup_one_pair_ms': warmup_ms,
        'results': results,
    }, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
