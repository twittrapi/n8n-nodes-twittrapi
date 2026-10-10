'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	extractBottomCursor,
	countContentEntries,
	nextCursor,
	paginateByCursor,
} = require('../dist/nodes/TwittrApi/pagination');
const { followersPage, searchReplacePage, emptyPage, slicePage } = require('./fixtures/timelines');

test('extracts bottom cursor from TimelineAddEntries', () => {
	assert.equal(extractBottomCursor(followersPage(['1', '2'], 'B1')), 'B1');
});

test('extracts bottom cursor from TimelineReplaceEntry', () => {
	assert.equal(extractBottomCursor(searchReplacePage(['9'], 'B2')), 'B2');
});

test('extracts slice_info.next_cursor', () => {
	assert.equal(extractBottomCursor(slicePage(2, 'S1')), 'S1');
});

test('no cursor in a plain object', () => {
	assert.equal(extractBottomCursor({ data: { user: { result: { rest_id: '1' } } } }), undefined);
	assert.equal(extractBottomCursor(null), undefined);
	assert.equal(extractBottomCursor('text'), undefined);
});

test('counts content entries and ignores cursor entries', () => {
	assert.equal(countContentEntries(followersPage(['1', '2', '3'], 'B')), 3);
	assert.equal(countContentEntries(emptyPage('B')), 0);
	assert.equal(countContentEntries(slicePage(4, 'S')), 4);
});

test('nextCursor stops on empty page and repeated cursor', () => {
	assert.equal(nextCursor(emptyPage('B9'), new Set()), undefined);
	assert.equal(nextCursor(followersPage(['1'], 'B1'), new Set(['B1'])), undefined);
	assert.equal(nextCursor(followersPage(['1'], 'B1'), new Set()), 'B1');
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

const baseRequest = (qs = {}) => ({ options: { url: '/x', qs }, preSend: [], postReceive: [] });

test('paginateByCursor follows cursors until an empty page', async () => {
	const ctx = fakeContext(
		[followersPage(['1', '2'], 'B1'), followersPage(['3'], 'B2'), emptyPage('B3')],
		10,
	);
	const items = await paginateByCursor.call(ctx, baseRequest({ count: 20 }));
	assert.equal(items.length, 3);
	assert.deepEqual(ctx.calls, [
		{ count: 20 },
		{ count: 20, cursor: 'B1' },
		{ count: 20, cursor: 'B2' },
	]);
});

test('paginateByCursor respects maxPages', async () => {
	const pages = Array.from({ length: 10 }, (_, i) => followersPage([String(i)], 'B' + i));
	const ctx = fakeContext(pages, 3);
	const items = await paginateByCursor.call(ctx, baseRequest());
	assert.equal(items.length, 3);
	assert.equal(ctx.calls.length, 3);
});

test('paginateByCursor starts from a given cursor and stops on a repeat', async () => {
	const ctx = fakeContext([followersPage(['1'], 'B1'), followersPage(['2'], 'B1')], 10);
	const items = await paginateByCursor.call(ctx, baseRequest({ cursor: 'START' }));
	assert.equal(items.length, 2);
	assert.deepEqual(ctx.calls, [{ cursor: 'START' }, { cursor: 'B1' }]);
});

test('apiErrorMessage reads {"error": "..."} and plain text bodies', () => {
	const { apiErrorMessage } = require('../dist/nodes/TwittrApi/errors');
	assert.equal(apiErrorMessage({ error: 'Insufficient balance' }), 'Insufficient balance');
	assert.equal(apiErrorMessage({ message: 'x' }), 'x');
	assert.equal(apiErrorMessage('Bad gateway'), 'Bad gateway');
	assert.equal(apiErrorMessage(undefined), undefined);
});
