'use strict';

// Output Format = Simple (format=simple). Fixtures in test/fixtures/simple are the
// backend's expected simple-format outputs, copied from the API's normalize testdata.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { TwittrApi } = require('../dist/nodes/TwittrApi/TwittrApi.node');
const { ENDPOINTS } = require('../dist/nodes/TwittrApi/endpoints');
const { FORMAT_VALUE_EXPRESSION } = require('../dist/nodes/TwittrApi/descriptions');
const {
	isSimplePage,
	nextCursor,
	paginateByCursor,
} = require('../dist/nodes/TwittrApi/pagination');

const props = new TwittrApi().description.properties;
const simple = (name) =>
	JSON.parse(JSON.stringify(require(path.join(__dirname, 'fixtures', 'simple', `${name}.json`))));

/** Evaluate a `={{ ... }}` value expression the way n8n would, with a given $value. */
function evalValue(expr, value) {
	const js = expr.replace(/^=\{\{/, '').replace(/\}\}$/, '');
	return new Function('$value', `return (${js});`)(value);
}

test('Output Format is a Raw / Simple option, default Raw', () => {
	const prop = props.find((p) => p.name === 'outputFormat');
	assert.ok(prop, 'outputFormat property exists');
	assert.equal(prop.type, 'options');
	assert.equal(prop.default, 'raw');
	assert.deepEqual(
		prop.options.map((o) => [o.name, o.value]),
		[
			['Raw', 'raw'],
			['Simple', 'simple'],
		],
	);
	assert.equal(props.filter((p) => p.name === 'outputFormat').length, 1);
});

test('Output Format is shown for every operation', () => {
	const prop = props.find((p) => p.name === 'outputFormat');
	// No displayOptions: visible (and its routing applied) for every resource and operation.
	assert.equal(prop.displayOptions, undefined);
	assert.ok(ENDPOINTS.length > 0);
});

test('Simple sends format=simple, Raw sends no format parameter', () => {
	const prop = props.find((p) => p.name === 'outputFormat');
	assert.equal(prop.routing.send.type, 'query');
	assert.equal(prop.routing.send.property, 'format');
	assert.equal(prop.routing.send.value, FORMAT_VALUE_EXPRESSION);
	assert.equal(evalValue(FORMAT_VALUE_EXPRESSION, 'simple'), 'simple');
	assert.equal(evalValue(FORMAT_VALUE_EXPRESSION, 'raw'), undefined);
	assert.equal(evalValue(FORMAT_VALUE_EXPRESSION, undefined), undefined);
});

test('recognizes simple pages, not single objects or raw bodies', () => {
	assert.equal(isSimplePage(simple('user-userid-tweets')), true);
	assert.equal(isSimplePage(simple('tweet-tweetid-favorites')), true);
	assert.equal(isSimplePage(simple('user-by-username-username')), false);
	assert.equal(isSimplePage({ data: { user: {} } }), false);
	assert.equal(isSimplePage(null), false);
	assert.equal(isSimplePage([]), false);
});

test('simple fixtures parse into the documented shapes', () => {
	const tweets = simple('user-userid-tweets');
	const t = tweets.data[0];
	assert.equal(t.id, '2019881223666233717');
	assert.equal(t.author.username, 'XDevelopers');
	assert.equal(t.counts.likes, 5599);
	assert.deepEqual(t.media, []);
	assert.equal(t.quoted, null);
	const user = simple('user-by-username-username').data;
	assert.equal(user.id, '2244994945');
	assert.equal(typeof user.counts.followers, 'number');
});

test('nextCursor follows nextCursor while hasNextPage is true', () => {
	for (const name of [
		'user-userid-tweets',
		'user-userid-followers',
		'search',
		'communities-search-searchterm',
	]) {
		const body = simple(name);
		assert.equal(body.hasNextPage, true, name);
		assert.equal(nextCursor(body, new Set()), body.nextCursor, name);
		assert.equal(nextCursor(body, new Set([body.nextCursor])), undefined, `${name} repeat`);
	}
});

test('nextCursor stops on the last simple page', () => {
	assert.equal(nextCursor(simple('tweet-tweetid-favorites'), new Set()), undefined);
	assert.equal(
		nextCursor(
			{ data: [{ id: '1' }], nextCursor: 'C', previousCursor: null, hasNextPage: false },
			new Set(),
		),
		undefined,
	);
	assert.equal(
		nextCursor({ data: [], nextCursor: 'C', previousCursor: null, hasNextPage: true }, new Set()),
		undefined,
	);
});

test('paginateByCursor pages through simple responses', async () => {
	const page = (ids, next) => ({
		data: ids.map((id) => ({ id })),
		nextCursor: next ?? null,
		previousCursor: null,
		hasNextPage: Boolean(next),
	});
	const pages = [page(['1', '2'], 'C1'), page(['3'], 'C2'), page(['4']), page(['5'], 'C9')];
	const calls = [];
	const ctx = {
		getNodeParameter: (name, fallback) => (name === 'maxPages' ? 10 : fallback),
		makeRoutingRequest: async (opts) => {
			calls.push({ ...opts.options.qs });
			return [{ json: pages[calls.length - 1] }];
		},
	};
	const items = await paginateByCursor.call(ctx, {
		options: { url: '/x', qs: { count: 20, format: 'simple' } },
		preSend: [],
		postReceive: [],
	});
	assert.equal(items.length, 3);
	assert.deepEqual(calls, [
		{ count: 20, format: 'simple' },
		{ count: 20, format: 'simple', cursor: 'C1' },
		{ count: 20, format: 'simple', cursor: 'C2' },
	]);
});
