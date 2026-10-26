"""Offline checks for collection state, revision handling and the existing learn queue."""

import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

sys.dont_write_bytecode = True  # 실행 검사가 보는 스킬 스크립트의 __pycache__를 고치지 않는다.
import palantir_docs as docs  # noqa: E402
import vault_learn as vl  # noqa: E402

URL = docs.BASE + "/docs/foundry/example"
PAGE = ('<html><head><title>Example</title></head><body><nav>Navigation</nav>'
        '<div data-pagefind-body><h1>Example</h1><p>' + 'Document content. ' * 10 + '</p></div></body></html>')


def sitemap(urls):
    return ('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(
        f'<url><loc>{url}</loc><lastmod>2026-10-16</lastmod></url>' for url in urls) + '</urlset>')


class CollectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.responses = {url: sitemap([]) for url in docs.SITEMAPS}
        self.responses[docs.SITEMAPS[0]] = sitemap([URL, URL + '/?tracking=x#heading',
                                                   docs.BASE + '/docs/kr/foundry/example',
                                                   docs.BASE + '/docs/foundry/search'])
        self.responses[docs.SITEMAPS[1]] = sitemap([docs.BASE + '/docs/apollo/overview'])
        self.responses[docs.SITEMAPS[2]] = sitemap([docs.BASE + '/docs/gotham/overview'])
        self.responses[docs.BASE + '/docs/robots.txt'] = '\n'.join('Sitemap: ' + url for url in docs.SITEMAPS)
        self.responses[URL] = PAGE
        self.original_fetch = docs.fetch
        self.fetch = patch.object(docs, 'fetch', side_effect=lambda url: self.responses[url]).start()
        self.addCleanup(patch.stopall)
        patch.object(docs, 'SEEDS', [URL]).start()
        self.clock = patch.object(docs.time, 'time', return_value=1000000).start()

    def discover(self, **kwargs):
        return docs.discover(self.root, {'fetch_limit': 1, 'refresh_hours': 1}, **kwargs)

    def state(self):
        return docs.load(self.root / 'palantir' / 'STATE.json')

    def test_all_sitemaps_deduplication_and_dry_run(self):
        report = self.discover(dry_run=True)
        self.assertEqual(report['discovered'], 3)
        self.assertEqual(report['would_fetch'], [URL])
        self.assertFalse((self.root / 'palantir').exists())
        self.assertTrue(set(docs.SITEMAPS) <= {call.args[0] for call in self.fetch.call_args_list})
        self.assertEqual(docs.canonical('https://palantir.com/docs/kr/foundry/example/?a=b#c'), URL)
        self.assertEqual(docs.page_url(docs.BASE + '/docs/foundry/api/objects/search'), docs.BASE + '/docs/foundry/api/objects/search')
        self.assertEqual(docs.page_url(docs.BASE + '/docs/foundry/workshop/versions'), docs.BASE + '/docs/foundry/workshop/versions')
        self.assertFalse(docs.page_url(docs.BASE + '/docs/foundry/search'))
        self.assertEqual(docs.canonical(docs.BASE + '/docs/foundry/ontology-mcp/overview'), docs.BASE + '/docs/foundry/ontology-mcp')
        for url in ['http://www.palantir.com/docs/x', 'https://evil.test/docs/x',
                    'https://www.palantir.com@evil.test/docs/x', docs.BASE + '/docs/../secret',
                    docs.BASE + '/docs/%2e%2e/secret']:
            self.assertFalse(docs.canonical(url))
        with self.assertRaises(ValueError):
            docs.OfficialRedirects().redirect_request(None, None, 302, '', {}, 'https://evil.test/docs/x')

    def test_308_redirects_follow_official_get_and_head_without_allowing_post_or_other_hosts(self):
        target = docs.BASE + '/docs/foundry/supported-browsers-network-requirements'
        handler = docs.OfficialRedirects()
        handler.parent = Mock()
        for method in ('GET', 'HEAD'):
            with self.subTest(method=method):
                request = docs.urllib.request.Request(URL, method=method)
                request.timeout = 20
                stream = io.BytesIO(b'redirect')
                result = handler.http_error_308(request, stream, 308, 'Permanent Redirect',
                                                {'location': '/docs/foundry/supported-browsers-network-requirements'})
                self.assertIs(result, handler.parent.open.return_value)
                redirected = handler.parent.open.call_args.args[0]
                self.assertEqual(redirected.full_url, target)
                self.assertEqual(redirected.get_method(), method)
                self.assertTrue(stream.closed)
        with self.assertRaises(ValueError):
            handler.http_error_308(docs.urllib.request.Request(URL), io.BytesIO(), 308,
                                   'Permanent Redirect', {'location': 'https://evil.test/docs/x'})
        with self.assertRaises(docs.urllib.error.HTTPError):
            handler.redirect_request(docs.urllib.request.Request(URL, data=b'body'), None,
                                     308, 'Permanent Redirect', {}, target)

    def test_incomplete_http_read_records_backoff_and_continues_later_documents(self):
        later_url = docs.BASE + '/docs/foundry/later'
        self.responses[later_url] = PAGE
        self.fetch.side_effect = self.original_fetch

        class IncompleteResponse(io.BytesIO):
            def read(self, size=-1):
                raise docs.http.client.IncompleteRead(b'partial', 100)

        opener = Mock()
        opener.open.side_effect = lambda request, timeout: (
            IncompleteResponse() if request.full_url == URL
            else io.BytesIO(self.responses[request.full_url].encode()))
        with patch.object(docs.urllib.request, 'build_opener', return_value=opener), \
                patch.object(docs, 'SEEDS', [URL, later_url]):
            report = docs.discover(self.root, {'fetch_limit': 2})
        self.assertEqual(report['fetched'], 1)
        self.assertEqual(report['fetch_errors'][0]['url'], URL)
        failed = self.state()['documents'][URL]
        self.assertIn('IncompleteRead', failed['error'])
        self.assertEqual(failed['failures'], 1)
        self.assertGreater(failed['retry_at'], self.clock.return_value)
        self.assertTrue(self.state()['documents'][later_url]['key'])

    def test_next_data_preserves_markdown_schema_and_code_without_site_metadata(self):
        contents = [
            {"type": "markdown", "markdown": "## Contract\n\n| input | result |\n|---|---|\n| optional | null |\n\n```python\nif ready:\n    run()\n```"},
            {"type": "ontology", "ontology": {"properties": [{"name": "id", "required": True}],
                "ontologyEntityTypeContent": {"type": "interfaceType", "interfaceType": {
                    "linkConstraints": [{"required": False, "cardinality": {"type": "oneToMany"}}]}},
                "codeSnippets": [{"code": "if ready:\n    run()"}]}},
            {"type": "endpoint", "endpoint": {"operationId": "v2.createObject", "operationType": {"type": "post", "post": {}}, "path": "/api/v2/objects", "parameters": [
                {"name": "pageToken", "required": False}], "response": {"type": "string"}, "errors": ["Forbidden"]}},
        ]
        for content in contents:
            with self.subTest(content=content["type"]):
                payload = {"props": {"pageProps": {"page": {"title": "API contract", "content": content},
                    "ontologyGraph": "UNRELATED_GRAPH", "siteSettings": "UNRELATED_SETTINGS"}}}
                html = '<script crossorigin="" id="__NEXT_DATA__" type="application/json">' + json.dumps(payload) + '</script>'
                title, text = docs.extract(html)
                self.assertEqual(title, "API contract")
                self.assertNotIn("UNRELATED_", text)
                if content["type"] == "markdown":
                    self.assertEqual(text, content["markdown"])
                else:
                    self.assertEqual(json.loads(text), content)
        markdown = "## Transform output\n\n```python\nif ready:\n    run()\n```\n" + "Writing data. " * 10
        payload = {"props": {"pageProps": {"markdown": markdown, "siteSettings": "UNRELATED_SETTINGS"}}}
        html = '<script id="__NEXT_DATA__">' + json.dumps(payload) + '</script>'
        self.assertEqual(docs.extract(html)[1], markdown.strip())
        with self.assertRaisesRegex(ValueError, "empty_body"):
            docs.extract('<script id="__NEXT_DATA__">{"props":{"pageProps":{"navBarItems":"' + 'menu ' * 30 + '"}}}</script>')

    def test_release_next_data_preserves_all_days_notes_and_metadata(self):
        releases = [
            {"id": "day-1", "date": "October 16, 2026", "releaseNotes": [
                {"id": "note-1", "type": "FEATURE", "title": "Typed outputs",
                 "description": "The output may be null.",
                 "longDescription": "## Contract\n\n| input | result |\n|---|---|\n| missing | null |\n\n```python\nif ready:\n    run()\n```",
                 "releaseVersion": "1.2.3", "applicationId": "logic",
                 "mediaFilenames": ["/docs/resources/example.png"],
                 "applications": [{"applicationId": "logic", "isKeyComponent": True}]},
                {"id": "note-2", "title": "빈 값 처리", "description": "",
                 "longDescription": "Preserve empty arrays: []"}]},
            {"id": "day-2", "date": "October 15, 2026", "releaseNotes": [
                {"title": "Older change", "description": "Earlier contract."}]},
        ]
        payload = {"props": {"pageProps": {"releases": releases,
            "siteSettings": "UNRELATED_SETTINGS", "categoryBuckets": "UNRELATED_CATEGORIES"}}}
        html = ('<head><title>2026 Release notes</title></head><main><h1>Release notes</h1><p>'
                + 'Categories ' * 20 + '</p><p>loading...</p></main>'
                + '<script id="__NEXT_DATA__">' + json.dumps(payload) + '</script>')
        title, text = docs.extract(html)
        self.assertEqual(title, "2026 Release notes")
        self.assertEqual(json.loads(text), releases)
        self.assertNotIn("UNRELATED_", text)
        self.assertNotIn("loading...", text)
        self.assertEqual(docs.extract(html)[1], text)

    def test_loading_shell_and_incomplete_release_payloads_are_rejected(self):
        shell = '<main><h1>Release notes</h1><p>' + 'Categories ' * 20 + '</p><p>loading...</p></main>'
        with self.assertRaisesRegex(ValueError, "empty_body"):
            docs.extract(shell)
        valid_note = {"title": "A change", "description": "A contract."}
        for releases in (None, {}, [], "loading...", [None],
                         [{"date": "October 16, 2026", "releaseNotes": []}],
                         [{"date": "October 16, 2026", "releaseNotes": [None]}],
                         [{"releaseNotes": [valid_note]}],
                         [{"date": "October 16, 2026", "releaseNotes": [{"title": "No narrative"}]}],
                         [{"date": "October 16, 2026", "releaseNotes": [valid_note,
                             {"title": "Truncated", "description": " "}]}]):
            with self.subTest(releases=releases):
                payload = {"props": {"pageProps": {"releases": releases}}}
                html = shell + '<script id="__NEXT_DATA__">' + json.dumps(payload) + '</script>'
                with self.assertRaisesRegex(ValueError, "empty_body"):
                    docs.extract(html)

    def test_bare_class_attribute_before_valid_next_data_does_not_abort_parsing(self):
        payload = {"props": {"pageProps": {"markdown": "A file of audit logs"}}}
        html = '<main class></main><script id="__NEXT_DATA__">' + json.dumps(payload) + '</script>'
        self.assertEqual(docs.extract(html)[1], "A file of audit logs")

    def test_empty_typed_payloads_and_error_shells_are_rejected(self):
        for content in ({"type": "ontology", "ontology": {}}, {"type": "endpoint"},
                        {"type": "endpoint", "endpoint": {}},
                        {"type": "ontology", "ontology": {"subtitle": "A menu"}},
                        {"type": "endpoint", "endpoint": {"path": "/api/example"}},
                        {"type": "error", "message": "Unable to load content. " * 10},
                        {"type": "markdown", "markdown": None}):
            with self.subTest(content=content):
                payload = {"props": {"pageProps": {"page": {"content": content}}}}
                html = '<script id="__NEXT_DATA__">' + json.dumps(payload) + '</script>'
                with self.assertRaisesRegex(ValueError, "empty_body"):
                    docs.extract(html)

    def test_null_payload_shapes_use_empty_body_errors_or_title_fallback(self):
        for payload in ({"props": None}, {"props": {"pageProps": None}},
                        {"props": {"pageProps": {"page": None}}},
                        {"props": {"pageProps": {"markdown": None}}}):
            with self.subTest(payload=payload):
                html = '<script id="__NEXT_DATA__">' + json.dumps(payload) + '</script>'
                with self.assertRaisesRegex(ValueError, "empty_body"):
                    docs.extract(html)
        payload = {"props": {"pageProps": {"page": {"title": None,
                   "content": {"type": "markdown", "markdown": "A file of audit logs"}}}}}
        html = '<head><title>Palantir</title></head><script id="__NEXT_DATA__">' + json.dumps(payload) + '</script>'
        self.assertEqual(docs.extract(html), ("Palantir", "A file of audit logs"))

    def test_short_explicit_document_body_is_not_mistaken_for_empty(self):
        # Actual public Audit API basic-page body, shorter than the HTML fallback threshold.
        page = {"id": "log-file-basics", "title": "Log File basics",
                "content": {"type": "markdown", "markdown": "A file of audit logs\n"}}
        payload = {"props": {"pageProps": {"page": page}}}
        html = '<script id="__NEXT_DATA__">' + json.dumps(payload) + '</script>'
        self.assertEqual(docs.extract(html), ("Log File basics", "A file of audit logs"))

    def test_empty_markdown_and_navigation_only_are_not_document_bodies(self):
        for props in ({"markdown": ""}, {"markdown": "   "}, {"navBarItems": ["menu"]}):
            with self.subTest(props=props):
                payload = {"props": {"pageProps": props}}
                html = '<body><div>' + 'Menu links ' * 30 + '</div><script id="__NEXT_DATA__">' + json.dumps(payload) + '</script></body>'
                with self.assertRaisesRegex(ValueError, "empty_body"):
                    docs.extract(html)

    def test_only_content_revisions_create_new_candidates(self):
        first = self.discover()
        self.assertEqual((first['fetched'], first['changed']), (1, 1))
        candidate = docs.candidates(self.root, set())[0]
        key = candidate['key']
        self.assertEqual(docs.candidates(self.root, {key}), [])
        # Remaining new documents are collected before refreshing already fetched ones.
        for url in list(self.state()['documents']):
            self.responses[url] = PAGE
        docs.discover(self.root, {'fetch_limit': 3, 'refresh_hours': 1})
        self.clock.return_value += 4000
        self.responses[URL] = PAGE.replace('Navigation', 'Changed navigation').replace('Example</title>', 'New title</title>')
        self.assertEqual(self.discover()['changed'], 0)
        self.assertEqual(self.state()['documents'][URL]['key'], key)
        self.clock.return_value += 4000
        self.responses[URL] = PAGE.replace('Document content.', 'Revised document.')
        self.assertEqual(self.discover()['changed'], 1)
        current = self.state()['documents'][URL]
        self.assertNotEqual(current['key'], key)
        self.assertTrue(Path(candidate['path']).is_file())
        self.assertNotIn(key, {item['key'] for item in docs.candidates(self.root, set())})

    def test_baseline_body_is_not_a_candidate_until_revised(self):
        self.discover()
        sha = self.state()['documents'][URL]['sha256']
        docs.write(self.root / 'palantir' / 'BASELINE.json', json.dumps({'documents': {URL: [sha]}}))
        self.assertNotIn(URL, {item['url'] for item in docs.candidates(self.root, set())})
        self.assertEqual(docs.summary(self.root, [])['baseline_current'], 1)
        for url in list(self.state()['documents']):
            self.responses[url] = PAGE
        docs.discover(self.root, {'fetch_limit': 3, 'refresh_hours': 1})
        self.clock.return_value += 4000
        self.responses[URL] = PAGE.replace('Document content.', 'Revised document.')
        self.assertEqual(self.discover()['changed'], 1)
        self.assertIn(URL, {item['url'] for item in docs.candidates(self.root, set())})

    def test_empty_failure_retry_preserves_existing_snapshot_and_knowledge(self):
        self.discover()
        original = self.state()['documents'][URL].copy()
        for url in list(self.state()['documents']):
            self.responses[url] = PAGE
        docs.discover(self.root, {'fetch_limit': 3, 'refresh_hours': 1})
        self.clock.return_value += 4000
        self.responses[URL] = '<html><body><nav>Only a menu</nav></body></html>'
        self.discover()
        entry = self.state()['documents'][URL]
        self.assertEqual(entry['key'], original['key'])
        self.assertIn('empty_body', entry['error'])
        self.assertGreater(entry['retry_at'], self.clock.return_value)
        self.assertTrue(Path(original['path']).exists())
        self.responses[docs.SITEMAPS[0]] = sitemap([])
        self.clock.return_value += 86401
        self.responses[URL] = PAGE
        self.discover()
        self.assertIn(URL, self.state()['documents'])

    def test_collection_is_not_learning_and_existing_queue_keeps_capacity(self):
        self.discover()
        for url in list(self.state()['documents']):
            self.responses[url] = PAGE
        docs.discover(self.root, {'fetch_limit': 3})
        item = docs.candidates(self.root, set())[0]
        logs = [{'key': item['key'], 'result': 'learned'},
                {'key': item['key'], 'result': 'deferred', 'commit': 'abc'}]
        self.assertEqual(docs.summary(self.root, logs)['learned_current'], 0)
        logs.append({'key': item['key'], 'result': 'learned', 'commit': 'abc'})
        self.assertEqual(docs.summary(self.root, logs)['learned_current'], 1)
        lead = {'key': 'email:x', 'source': 'email'}
        with patch.object(vl, 'S', self.root), patch.object(vl, 'inbox_leads', return_value=[lead]), patch.object(docs, 'listed', return_value=True):
            data = vl.pick_data(6)
        self.assertIn(lead, data['tier1'])
        self.assertEqual(data['palantir_limit'], 2)
        self.assertEqual(data['counts']['palantir_documents'], 3)
        self.assertEqual(len([item for item in data['tier1'] if item.get('source') == 'palantir']), 2)
        with patch.object(vl, 'S', self.root), patch.object(vl, 'inbox_leads', return_value=[lead]), patch.object(docs, 'listed', return_value=False):
            self.assertEqual(vl.pick_data(6)['counts']['palantir_documents'], 0)
        self.assertEqual(len(docs.candidates(self.root, set())), 3)

    def test_partial_sitemap_failure_keeps_entries_and_retries(self):
        self.discover()
        for url in list(self.state()['documents']):
            self.responses[url] = PAGE
        self.clock.return_value += 86401
        self.responses[docs.SITEMAPS[0]] = 'broken XML'
        report = self.discover()
        self.assertTrue(report['errors'])
        self.assertEqual(len(self.state()['documents']), 3)
        self.assertGreater(self.state()['sitemap_retry_at'], self.clock.return_value)

    def test_translated_lastmod_does_not_override_english(self):
        self.responses[docs.SITEMAPS[0]] = sitemap([URL])
        self.responses[docs.SITEMAPS[1]] = sitemap([docs.BASE + '/docs/kr/foundry/example']).replace('2026-10-16', '2026-10-17')
        self.discover()
        self.assertEqual(self.state()['documents'][URL]['lastmod'], '2026-10-16')

    def test_repeated_palantir_deferred_retries_without_changing_other_sources(self):
        logs = [{'key': key, 'result': 'deferred', 'ts': day}
                for key in ('palantir:example:hash', 'email:example')
                for day in ('2026-10-01', '2026-10-08')]
        self.assertEqual(vl.settle_deferred(logs, vl.dt.date(2026, 10, 14)), {'palantir:example:hash', 'email:example'})
        self.assertEqual(vl.settle_deferred(logs, vl.dt.date(2026, 10, 15)), {'email:example'})
        logs.append({'key': 'palantir:example:hash', 'result': 'deferred', 'ts': '2026-10-15'})
        self.assertEqual(vl.settle_deferred(logs, vl.dt.date(2026, 10, 22)), {'email:example'})


if __name__ == '__main__':
    unittest.main()
