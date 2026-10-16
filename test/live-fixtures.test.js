'use strict';

// Pagination against trimmed real TwittrAPI responses (test/fixtures/live/*.json,
// captured 2026-10-10). Each file is {request, capturedAt, response}; only
// `response` is the API body.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
	extractBottomCursor,
	countContentEntries,
	nextCursor,
	paginateByCursor,
} = require('../dist/nodes/TwittrApi/pagination');
const { COUNT_VALUE_EXPRESSION } = require('../dist/nodes/TwittrApi/descriptions');
const { TwittrApi } = require('../dist/nodes/TwittrApi/TwittrApi.node');

const live = (name) => {
	const file = require(path.join(__dirname, 'fixtures', 'live', `${name}.json`));
	return JSON.parse(JSON.stringify(file.response));
};

const TIMELINES = {
	// followers/followings/list members: Bottom comes BEFORE Top
	'user-userid-followers': '1000000000000000000|2109014666083565496',
	'lists-members': '1000000000000000000|2109016359324090346',
	// tweet timelines: Top first
	'user-userid-tweets': null,
	'user-userid-articles': null,
	// TweetDetail: last entry of instructions[1]
	'tweet-tweetid': null,
	// search wrapper {category, entries}
	search: null,
};

/** The Bottom cursor value, read the slow obvious way. */
function expectedBottom(body) {
	const values = [];
	JSON.stringify(body, (key, value) => {
		if (value && value.cursorType === 'Bottom') values.push(value.value);
		return value;
	});
	assert.equal(values.length, 1, 'fixture has exactly one Bottom cursor');
	return values[0];
}

function topValue(body) {
	let top;
	JSON.stringify(body, (key, value) => {
		if (value && value.cursorType === 'Top') top = value.value;
		return value;
	});
	return top;
}

for (const [name, known] of Object.entries(TIMELINES)) {
	test(`${name}: next cursor is the Bottom cursor, never Top`, () => {
		const body = live(name);
		const bottom = extractBottomCursor(body);
		assert.equal(bottom, expectedBottom(body));
		if (known) assert.equal(bottom, known);
		const top = topValue(body);
		if (top) assert.notEqual(bottom, top);
		assert.ok(countContentEntries(body) > 0);
		assert.equal(nextCursor(body, new Set()), bottom);
	});
}

test('search wrapper keeps the {category, entries} shape', () => {
	const body = live('search');
	assert.equal(body.category, 'Latest');
	assert.ok(Array.isArray(body.entries));
});

test('slice next_cursor: community search, community members, job search', () => {
	for (const [name, getSlice] of [
		['communities-search-searchterm', (b) => b.data.communities_search_slice],
		['communities-communityid-members', (b) => b.data.communityResults.result.members_slice],
		['jobs-search-searchterm', (b) => b.data.job_search],
	]) {
		const body = live(name);
		const slice = getSlice(body);
		assert.ok(slice.items_results.length > 0, name);
		assert.equal(countContentEntries(body), slice.items_results.length, name);
		assert.equal(extractBottomCursor(body), slice.slice_info.next_cursor, name);
		assert.equal(nextCursor(body, new Set()), slice.slice_info.next_cursor, name);
	}
});

test('community moderators without next_cursor stop after one page', () => {
	const body = live('communities-communityid-moderators');
	assert.equal(extractBottomCursor(body), undefined);
	assert.equal(nextCursor(body, new Set()), undefined);
});

test('slice next_cursor "0" means no more pages', () => {
	const body = live('jobs-search-searchterm');
	body.data.job_search.slice_info.next_cursor = '0';
	assert.equal(nextCursor(body, new Set()), undefined);
});

test('empty likes and favorites stop cleanly', () => {
	for (const name of ['user-userid-likes', 'tweet-tweetid-favorites']) {
		const body = live(name);
		assert.equal(extractBottomCursor(body), undefined, name);
		assert.equal(countContentEntries(body), 0, name);
		assert.equal(nextCursor(body, new Set()), undefined, name);
	}
});

test('articles with an empty tweet_results entry do not break pagination', () => {
	const body = live('user-userid-articles');
	const entries = body.data.user.result.timeline.timeline.instructions[0].entries;
	entries.splice(1, 0, {
		entryId: 'tweet-1',
		sortIndex: '1',
		content: {
			entryType: 'TimelineTimelineItem',
			itemContent: { itemType: 'TimelineTweet', tweet_results: {} },
		},
	});
	assert.equal(nextCursor(body, new Set()), expectedBottom(body));
});

function fakeContext(pages, maxPages) {
	const calls = [];
	return {
		calls,
		getNodeParameter: (name, fallback) => (name === 'maxPages' ? maxPages : fallback),
		makeRoutingRequest: async (opts) => {
			calls.push({ ...opts.options.qs });
			const page = pages[calls.length - 1];
			return page === undefined ? [] : [{ json: page }];
		},
	};
}

const req = (qs = {}) => ({ options: { url: '/x', qs }, preSend: [], postReceive: [] });

test('return all: followers page then an end page', async () => {
	const first = live('user-userid-followers');
	const end = live('user-userid-likes');
	const ctx = fakeContext([first, end, first], 10);
	const items = await paginateByCursor.call(ctx, req({ count: 20 }));
	assert.equal(items.length, 2);
	assert.deepEqual(ctx.calls, [
		{ count: 20 },
		{ count: 20, cursor: '1000000000000000000|2109014666083565496' },
	]);
});

test('return all: does not stop when a page has fewer items than count', async () => {
	const tweets = live('user-userid-tweets');
	const second = live('user-userid-tweets');
	// Different cursor on the second page, same (small) number of items.
	JSON.stringify(second, (k, v) => {
		if (v && v.cursorType === 'Bottom') v.value = 'NEXT';
		return v;
	});
	const ctx = fakeContext([tweets, second, live('tweet-tweetid-favorites')], 10);
	const items = await paginateByCursor.call(ctx, req({ count: 100 }));
	assert.equal(items.length, 3);
	assert.equal(ctx.calls[2].cursor, 'NEXT');
});

test('return all: same cursor twice stops', async () => {
	const page = live('search');
	const ctx = fakeContext([page, page, page], 10);
	const items = await paginateByCursor.call(ctx, req());
	assert.equal(items.length, 2);
});

test('return all: slice pages follow next_cursor', async () => {
	const p1 = live('communities-search-searchterm');
	const p2 = live('communities-search-searchterm');
	p2.data.communities_search_slice.slice_info = {};
	const ctx = fakeContext([p1, p2], 10);
	const items = await paginateByCursor.call(ctx, req());
	assert.equal(items.length, 2);
	assert.equal(ctx.calls[1].cursor, p1.data.communities_search_slice.slice_info.next_cursor);
});

test('return all: empty first page makes one request', async () => {
	const ctx = fakeContext([live('tweet-tweetid-favorites')], 10);
	const items = await paginateByCursor.call(ctx, req());
	assert.equal(items.length, 1);
	assert.equal(ctx.calls.length, 1);
});

test('count is clamped to 1..100 and defaults to 20 for invalid input', () => {
	const js = COUNT_VALUE_EXPRESSION.replace(/^=\{\{/, '').replace(/\}\}$/, '');
	const run = (v) => new Function('$value', `return (${js});`)(v);
	assert.equal(run(20), 20);
	assert.equal(run(500), 100);
	assert.equal(run(-3), 1);
	assert.equal(run('50'), 50);
	assert.equal(run('abc'), 20);
	const props = new TwittrApi().description.properties;
	// Page size of the read operations (Account > Get DM Inbox has its own count, 1..50).
	const readOptions = props.filter(
		(p) => p.name === 'options' && !p.displayOptions.show.resource.includes('account'),
	);
	for (const options of readOptions) {
		const count = options.options.find((o) => o.name === 'count');
		if (!count) continue;
		assert.equal(count.default, 20);
		assert.deepEqual(count.typeOptions, { minValue: 1, maxValue: 100 });
		assert.equal(count.routing.send.value, COUNT_VALUE_EXPRESSION);
	}
});

test('user timelines: username is only sent when identifying by username', () => {
	const props = new TwittrApi().description.properties;
	const usernames = props.filter(
		(p) => p.name === 'username' && p.routing?.send?.property === 'username',
	);
	assert.ok(usernames.length > 0);
	for (const p of usernames) assert.deepEqual(p.displayOptions.show.userBy, ['username']);
	// Account operations send user_id in the body; this is about the read timelines.
	const userIds = props.filter(
		(p) =>
			p.name === 'userId' &&
			p.displayOptions?.show?.userBy !== undefined &&
			!p.displayOptions.show.resource.includes('account'),
	);
	for (const p of userIds) {
		assert.deepEqual(p.displayOptions.show.userBy, ['id']);
		assert.equal(p.routing, undefined, 'userId goes in the path, not the query');
	}
});
