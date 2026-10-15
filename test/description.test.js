'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TwittrApi } = require('../dist/nodes/TwittrApi/TwittrApi.node');
const { TwittrApiApi } = require('../dist/credentials/TwittrApiApi.credentials');
const { ENDPOINTS, RESOURCES } = require('../dist/nodes/TwittrApi/endpoints');
const { buildUrlExpression } = require('../dist/nodes/TwittrApi/descriptions');

const node = new TwittrApi();
const props = node.description.properties;

test('node is usable as a tool and uses the credential', () => {
	assert.equal(node.description.usableAsTool, true);
	assert.equal(node.description.credentials[0].name, new TwittrApiApi().name);
});

test('every endpoint appears as an operation of its resource', () => {
	for (const ep of ENDPOINTS) {
		const op = props.find(
			(p) => p.name === 'operation' && p.displayOptions.show.resource.includes(ep.resource),
		);
		assert.ok(op, `operation list for ${ep.resource}`);
		const option = op.options.find((o) => o.value === ep.operation);
		assert.ok(option, `${ep.resource}.${ep.operation}`);
		assert.equal(option.routing.request.method, ep.method);
	}
	for (const r of RESOURCES) {
		assert.ok(
			ENDPOINTS.some((ep) => ep.resource === r.value),
			`resource ${r.value} has endpoints`,
		);
	}
});

test('operation and resource options are sorted by name', () => {
	for (const p of props.filter((p) => p.name === 'operation' || p.name === 'resource')) {
		const names = p.options.map((o) => o.name);
		assert.deepEqual(
			names,
			[...names].sort((a, b) => a.localeCompare(b)),
		);
	}
});

test('operation values are unique per resource', () => {
	const seen = new Set();
	for (const ep of ENDPOINTS) {
		const key = `${ep.resource}.${ep.operation}`;
		assert.ok(!seen.has(key), key);
		seen.add(key);
	}
});

test('every path placeholder has a matching param', () => {
	for (const ep of ENDPOINTS) assert.doesNotThrow(() => buildUrlExpression(ep), ep.path);
});

/** Evaluate a URL expression the way n8n would, with a given $parameter. */
function evalUrl(expr, parameter) {
	const body = expr.replace(/^=/, '');
	return body.replace(/\{\{(.*?)\}\}/g, (_m, js) =>
		String(new Function('$parameter', `return (${js});`)(parameter)),
	);
}

test('URL expressions resolve to the expected paths', () => {
	const url = (resource, operation, parameter) =>
		evalUrl(
			buildUrlExpression(
				ENDPOINTS.find((e) => e.resource === resource && e.operation === operation),
			),
			parameter,
		);
	assert.equal(url('user', 'getByUsername', { username: ' @jack ' }), '/user/by/username/jack');
	assert.equal(
		url('user', 'getFollowers', { userBy: 'username', username: 'jack' }),
		'/user/-1/followers',
	);
	assert.equal(url('user', 'getFollowers', { userBy: 'id', userId: '12' }), '/user/12/followers');
	assert.equal(url('tweet', 'getLikers', { tweetId: '20' }), '/tweet/20/favorites');
	assert.equal(
		url('community', 'search', { searchTerm: 'a b/c' }),
		'/communities/search/a%20b%2Fc',
	);
	assert.equal(url('trend', 'get', { woeid: '1' }), '/trends/1');
	assert.equal(buildUrlExpression(ENDPOINTS.find((e) => e.path === '/search')), '/search');
});

test('paginated operations expose returnAll, maxPages, count and cursor', () => {
	for (const ep of ENDPOINTS.filter((e) => e.paginated)) {
		const forOp = props.filter(
			(p) =>
				p.displayOptions?.show?.operation?.includes(ep.operation) &&
				p.displayOptions.show.resource.includes(ep.resource),
		);
		const returnAll = forOp.find((p) => p.name === 'returnAll');
		assert.equal(typeof returnAll.routing.operations.pagination, 'function', ep.path);
		assert.ok(
			forOp.find((p) => p.name === 'maxPages'),
			ep.path,
		);
		const options = forOp.find((p) => p.name === 'options');
		const names = options.options.map((o) => o.name);
		assert.ok(names.includes('count') && names.includes('cursor'), ep.path);
	}
});

test('getLikers is a POST with cookie, proxy, count and cursor in the body', () => {
	const ep = ENDPOINTS.find((e) => e.resource === 'tweet' && e.operation === 'getLikers');
	assert.equal(ep.method, 'POST');
	assert.match(ep.description, /own tweets/);
	const forOp = props.filter(
		(p) =>
			p.displayOptions?.show?.operation?.includes('getLikers') &&
			p.displayOptions.show.resource.includes('tweet'),
	);
	const cookie = forOp.find((p) => p.name === 'cookie');
	assert.equal(cookie.required, true);
	assert.equal(cookie.typeOptions.password, true);
	assert.equal(cookie.routing.send.type, 'body');
	assert.equal(cookie.routing.send.property, 'cookie');
	const proxy = forOp.find((p) => p.name === 'proxy');
	assert.equal(proxy.required, true);
	assert.equal(proxy.routing.send.type, 'body');
	assert.equal(proxy.routing.send.property, 'proxy');
	const options = forOp.find((p) => p.name === 'options').options;
	for (const name of ['count', 'cursor']) {
		assert.equal(options.find((o) => o.name === name).routing.send.type, 'body', name);
	}
	assert.ok(forOp.find((p) => p.name === 'returnAll'));
});

test('GET operations send count and cursor in the query', () => {
	const options = props.find(
		(p) =>
			p.name === 'options' &&
			p.displayOptions.show.resource.includes('tweet') &&
			p.displayOptions.show.operation.includes('getRetweeters'),
	).options;
	for (const name of ['count', 'cursor']) {
		assert.equal(options.find((o) => o.name === name).routing.send.type, 'query', name);
	}
});

test('no two visible properties share a name for the same operation', () => {
	for (const ep of ENDPOINTS) {
		const forOp = props.filter(
			(p) =>
				p.displayOptions?.show?.operation?.includes(ep.operation) &&
				p.displayOptions.show.resource.includes(ep.resource),
		);
		// Properties with mutually exclusive userBy conditions may share no name either.
		const names = forOp.map(
			(p) => `${p.name}|${JSON.stringify(p.displayOptions.show.userBy ?? '')}`,
		);
		assert.equal(new Set(names).size, names.length, `${ep.resource}.${ep.operation}`);
	}
});

test('credential sets the right headers for each mode', async () => {
	const cred = new TwittrApiApi();
	const direct = await cred.authenticate(
		{ apiType: 'direct', apiKey: ' k1 ' },
		{ headers: { a: '1' } },
	);
	assert.deepEqual(direct.headers, { a: '1', 'X-API-KEY': 'k1' });
	const rapid = await cred.authenticate(
		{ apiType: 'rapidApi', apiKey: 'k2', rapidApiHost: 'https://twitter-aio.p.rapidapi.com/' },
		{},
	);
	assert.deepEqual(rapid.headers, {
		'x-rapidapi-key': 'k2',
		'x-rapidapi-host': 'twitter-aio.p.rapidapi.com',
	});
});

test('base URL expression resolves per mode', () => {
	const { BASE_URL_EXPRESSION } = require('../dist/credentials/TwittrApiApi.credentials');
	const js = BASE_URL_EXPRESSION.replace(/^=\{\{/, '').replace(/\}\}$/, '');
	const run = (c) => new Function('$credentials', `return (${js});`)(c);
	assert.equal(
		run({ apiType: 'direct', baseUrl: 'https://api.twittrapi.com/' }),
		'https://api.twittrapi.com',
	);
	assert.equal(run({ apiType: 'direct' }), 'https://api.twittrapi.com');
	assert.equal(
		run({ apiType: 'rapidApi', rapidApiHost: 'twitter-aio.p.rapidapi.com' }),
		'https://twitter-aio.p.rapidapi.com',
	);
	assert.equal(run({ apiType: 'rapidApi' }), 'https://twitter-aio.p.rapidapi.com');
});

test('another RapidAPI listing host is used for the URL and the header', async () => {
	const { BASE_URL_EXPRESSION } = require('../dist/credentials/TwittrApiApi.credentials');
	const js = BASE_URL_EXPRESSION.replace(/^=\{\{/, '').replace(/\}\}$/, '');
	const run = (c) => new Function('$credentials', `return (${js});`)(c);
	const cred = new TwittrApiApi();
	for (const rapidApiHost of ['twttr.p.rapidapi.com', ' https://twttr.p.rapidapi.com/ ']) {
		const c = { apiType: 'rapidApi', apiKey: 'k', rapidApiHost };
		assert.equal(run(c), 'https://twttr.p.rapidapi.com');
		const { headers } = await cred.authenticate(c, {});
		assert.equal(headers['x-rapidapi-host'], 'twttr.p.rapidapi.com');
	}
});
