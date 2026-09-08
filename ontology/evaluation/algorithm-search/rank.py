"""Offline candidate comparison. Input contains source text and queries, never judgments."""
import argparse
import hashlib
import json
import time
from pathlib import Path

import numpy as np
import torch
from sentence_transformers import SentenceTransformer

from lexical import LexicalIndex


def in_scope(path, scopes):
    return not scopes or any(path == scope or path.startswith(scope.rstrip('/') + '/') for scope in scopes)


def fuse(left, right, limit=50):
    scores = {}
    for ranking in (left, right):
        for rank, item in enumerate(ranking, 1):
            scores[item['id']] = scores.get(item['id'], 0) + 1 / (60 + rank)
    return [{'id': key, 'score': score} for key, score in
            sorted(scores.items(), key=lambda item: (-item[1], item[0]))[:limit]]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=Path, required=True)
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    raw = (args.data / 'corpus.json').read_bytes()
    inputs_hash = hashlib.sha256((args.data / 'inputs.json').read_bytes()).hexdigest()
    rows = json.loads(raw)
    query_bytes = (args.data / 'queries.json').read_bytes()
    queries = json.loads(query_bytes)
    model_manifest = json.loads((args.model / 'experiment-model.json').read_bytes())
    for name, expected_hash in model_manifest['files'].items():
        if Path(name).is_absolute() or '..' in Path(name).parts:
            raise ValueError('Invalid model manifest path')
        if hashlib.sha256((args.model / name).read_bytes()).hexdigest() != expected_hash:
            raise ValueError('Model file checksum mismatch: ' + name)
    key = hashlib.sha256(raw + json.dumps(model_manifest, sort_keys=True).encode()
                         + b'title-heading-body:e5-prefix:512:normalized:v1').hexdigest()
    vector_file = args.data / 'vectors.npy'
    cache_file = args.data / 'vectors.json'
    torch.set_num_threads(4)
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    print(json.dumps({'stage': 'load_model', 'device': device}), flush=True)
    model = SentenceTransformer(str(args.model), device=device, local_files_only=True)
    model.max_seq_length = 512
    cached = cache_file.exists() and vector_file.exists() and json.loads(cache_file.read_text()).get('key') == key
    if cached:
        if hashlib.sha256(vector_file.read_bytes()).hexdigest() != json.loads(cache_file.read_text()).get('vectors_sha256'):
            raise ValueError('Cached embedding checksum mismatch')
        vectors = np.load(vector_file, allow_pickle=False)
        build_ms = None
    else:
        started = time.perf_counter()
        batches = []
        for offset in range(0, len(rows), 512):
            texts = ['passage: ' + row['title'] + '\n' + row['heading'] + '\n' + row['text']
                     for row in rows[offset:offset + 512]]
            batches.append(model.encode(texts, batch_size=32, normalize_embeddings=True,
                                        convert_to_numpy=True, show_progress_bar=False))
            print(json.dumps({'stage': 'encode', 'completed': min(offset + 512, len(rows)), 'total': len(rows)}), flush=True)
        vectors = np.concatenate(batches).astype('float32')
        np.save(vector_file, vectors, allow_pickle=False)
        build_ms = round((time.perf_counter() - started) * 1000, 2)
        cache_file.write_text(json.dumps({'key': key, 'rows': len(rows), 'build_ms': build_ms,
                                         'vectors_sha256': hashlib.sha256(vector_file.read_bytes()).hexdigest()}))
    if vectors.shape != (len(rows), 384) or not np.isfinite(vectors).all():
        raise ValueError('Invalid cached embedding matrix')
    started = time.perf_counter()
    lexical = LexicalIndex(rows)
    lexical_build_ms = round((time.perf_counter() - started) * 1000, 2)
    print(json.dumps({'stage': 'rank', 'queries': len(queries)}), flush=True)
    results = []
    for query in queries:
        started = time.perf_counter()
        bm25 = lexical.search(query['query'], query['scope'], limit=50)
        lexical_ms = (time.perf_counter() - started) * 1000
        started = time.perf_counter()
        vector = model.encode(['query: ' + query['query']], normalize_embeddings=True,
                              convert_to_numpy=True, show_progress_bar=False)[0]
        indices = [i for i, row in enumerate(rows) if in_scope(row['path'], query['scope'])]
        scores = vectors[indices] @ vector
        order = sorted(range(len(indices)), key=lambda i: (-float(scores[i]), rows[indices[i]]['id']))[:50]
        dense = [{'id': rows[indices[i]]['id'], 'score': float(scores[i])} for i in order]
        dense_ms = (time.perf_counter() - started) * 1000
        started = time.perf_counter()
        hybrid = fuse(bm25, dense)
        fusion_ms = (time.perf_counter() - started) * 1000
        results.append({'id': query['id'], 'bm25': bm25, 'dense': dense, 'hybrid': hybrid,
                        'timing_ms': {'bm25': lexical_ms, 'dense': dense_ms,
                                      'hybrid_sequential': lexical_ms + dense_ms + fusion_ms}})
    args.output.write_text(json.dumps({
        'model': model_manifest, 'device': device, 'corpus_sha256': hashlib.sha256(raw).hexdigest(),
        'inputs_sha256': inputs_hash,
        'queries_sha256': hashlib.sha256(query_bytes).hexdigest(),
        'embedding_cache_key': key, 'embedding_build_ms': build_ms, 'embedding_cache_hit': cached,
        'vectors_sha256': json.loads(cache_file.read_text())['vectors_sha256'],
        'lexical_build_ms': lexical_build_ms, 'candidate_limit': 50, 'rrf_constant': 60,
        'max_model_tokens': 512, 'results': results,
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
