'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TwittrApi } = require('../dist/nodes/TwittrApi/TwittrApi.node');
const { TwittrApiXSessionApi } = require('../dist/credentials/TwittrApiXSessionApi.credentials');
const { ENDPOINTS } = require('../dist/nodes/TwittrApi/endpoints');
const { addXSession, checkXSession, xSessionTest } = require('../dist/nodes/TwittrApi/xSession');

const node = new TwittrApi();
const props = node.description.properties;
const account = ENDPOINTS.filter((e) => e.resource === 'account');

const COOKIE = 'auth_token=abc123; ct0=def456; twid=u%3D12';
const PROXY = 'http://user:pass@1.2.3.4:8080';

const forOp = (operation) =>
	props.filter(
		(p) =>
			p.displayOptions?.show?.operation?.includes(operation) &&
			p.displayOptions.show.resource.includes('account'),
	);

/** Fake IExecuteSingleFunctions for the preSend hook. */
function ctx(credentials) {
	return {
		getCredentials: async (name) => {
			assert.equal(name, 'twittrApiXSessionApi');
			return credentials;
		},
		getNode: () => ({ name: 'TwittrAPI', type: 'twittrApi' }),
	};
}

test('account resource has the expected operations, all POST to /client', () => {
	assert.deepEqual(account.map((e) => e.operation).sort(), [
		'addListMember',
		'bookmarkTweet',
		'createArticle',
		'createDraft',
		'createList',
		'createTweet',
		'deleteArticle',
		'deleteTweet',
		'followUser',
		'getArticle',
		'getArticles',
		'getBookmarkFolderTweets',
		'getBookmarkFolders',
		'getCommunityMemberships',
		'getDmInbox',
		'getDrafts',
		'likeTweet',
		'publishArticle',
		'removeListMember',
		'replyToTweet',
		'retweet',
		'searchBookmarks',
		'sendDm',
		'unbookmarkTweet',
		'unfollowUser',
		'unlikeTweet',
		'unpublishArticle',
		'unretweet',
		'updateArticle',
	]);
	for (const ep of account) {
		assert.equal(ep.method, 'POST', ep.operation);
		assert.match(ep.path, /^\/client\//, ep.operation);
		assert.equal(ep.xSession, true, ep.operation);
	}
});

test('X session is a separate credential with password fields, shown only for Account', () => {
	const cred = new TwittrApiXSessionApi();
	for (const name of ['cookie', 'proxy', 'chatPasscode']) {
		const field = cred.properties.find((p) => p.name === name);
		assert.equal(field.typeOptions.password, true, name);
	}
	const creds = node.description.credentials;
	assert.equal(creds[0].name, 'twittrApiApi');
	assert.deepEqual(creds[0].displayOptions.show.authentication, ['twittrApiApi']);
	const session = creds.find((c) => c.name === cred.name);
	assert.deepEqual(session.displayOptions.show.resource, ['account']);
	assert.equal(session.testedBy, 'xSessionTest');
	assert.equal(typeof node.methods.credentialTest.xSessionTest, 'function');
	const auth = props.find((p) => p.name === 'authentication');
	assert.equal(auth.type, 'hidden');
	assert.equal(auth.default, 'twittrApiApi');
});

test('account operations have no cookie, proxy or passcode parameter', () => {
	for (const ep of account) {
		const names = forOp(ep.operation).flatMap((p) => [
			p.name,
			...(p.options ?? []).map((o) => o.name),
		]);
		for (const secret of ['cookie', 'proxy', 'passcode', 'chatPasscode']) {
			assert.ok(!names.includes(secret), `${ep.operation} has ${secret}`);
		}
	}
});

test('account operations run the X session preSend hook', () => {
	const op = props.find(
		(p) => p.name === 'operation' && p.displayOptions.show.resource.includes('account'),
	);
	for (const option of op.options) {
		assert.deepEqual(option.routing.send.preSend, [addXSession], option.value);
	}
	const tweetOps = props.find(
		(p) => p.name === 'operation' && p.displayOptions.show.resource.includes('tweet'),
	);
	for (const option of tweetOps.options) assert.equal(option.routing.send, undefined, option.value);
});

test('preSend adds cookie and proxy to the body, and the passcode only for DMs', async () => {
	const creds = { cookie: ` ${COOKIE} `, proxy: PROXY, chatPasscode: '0042' };
	const like = await addXSession.call(ctx(creds), {
		url: '/client/like',
		method: 'POST',
		body: { tweet_id: '20' },
	});
	assert.deepEqual(like.body, { tweet_id: '20', cookie: COOKIE, proxy: PROXY });
	const dm = await addXSession.call(ctx(creds), {
		url: '/client/dm/send',
		method: 'POST',
		body: { user_id: '12', text: 'hi' },
	});
	assert.deepEqual(dm.body, {
		user_id: '12',
		text: 'hi',
		cookie: COOKIE,
		proxy: PROXY,
		passcode: '0042',
	});
	const drafts = await addXSession.call(ctx({ cookie: COOKIE, proxy: PROXY }), {
		url: '/client/drafts',
		method: 'POST',
	});
	assert.deepEqual(drafts.body, { cookie: COOKIE, proxy: PROXY });
	await assert.rejects(
		addXSession.call(ctx({ cookie: '', proxy: PROXY }), { url: '/client/like', body: {} }),
		/cookie and a proxy/,
	);
});

test('body fields use the API names', () => {
	const send = (operation, name) => {
		const top = forOp(operation).find((p) => p.name === name);
		if (top) return top.routing.send;
		const options = forOp(operation).find((p) => p.name === 'options');
		return options.options.find((o) => o.name === name).routing.send;
	};
	assert.equal(send('likeTweet', 'tweetId').property, 'tweet_id');
	assert.equal(send('replyToTweet', 'tweetId').property, 'id');
	assert.equal(send('replyToTweet', 'quoteUrl').property, 'attachment_url');
	assert.equal(send('createTweet', 'quoteUrl').property, 'quote_url');
	assert.equal(send('createTweet', 'whoCanReply').property, 'conversation_control_mode');
	assert.equal(send('createTweet', 'pollChoices').property, 'poll.choices');
	assert.equal(send('createTweet', 'pollDurationMinutes').property, 'poll.duration_minutes');
	assert.equal(send('followUser', 'userId').property, 'user_id');
	assert.equal(send('followUser', 'username').property, 'username');
	assert.equal(send('addListMember', 'listId').property, 'list_id');
	assert.equal(send('sendDm', 'conversationId').property, 'conversation_id');
	for (const [op, name] of [
		['createTweet', 'text'],
		['likeTweet', 'tweetId'],
		['getDmInbox', 'count'],
	]) {
		assert.equal(send(op, name).type, 'body', `${op}.${name}`);
	}
	// Poll choices are sent as an array.
	const js = send('createTweet', 'pollChoices')
		.value.replace(/^=\{\{/, '')
		.replace(/\}\}$/, '');
	assert.deepEqual(new Function('$value', `return (${js});`)(' Yes , No,, Maybe '), [
		'Yes',
		'No',
		'Maybe',
	]);
});

test('user and DM target fields depend on the selector', () => {
	const follow = forOp('followUser');
	assert.equal(follow.find((p) => p.name === 'userBy').routing, undefined);
	assert.deepEqual(follow.find((p) => p.name === 'userId').displayOptions.show.userBy, ['id']);
	assert.deepEqual(follow.find((p) => p.name === 'username').displayOptions.show.userBy, [
		'username',
	]);
	const dm = forOp('sendDm');
	assert.equal(dm.find((p) => p.name === 'sendTo').routing, undefined);
	assert.deepEqual(dm.find((p) => p.name === 'userId').displayOptions.show.sendTo, ['user']);
	assert.deepEqual(dm.find((p) => p.name === 'conversationId').displayOptions.show.sendTo, [
		'conversation',
	]);
});

test('credential test checks the format without a request', async () => {
	assert.equal(checkXSession({ cookie: COOKIE, proxy: PROXY }), undefined);
	assert.match(checkXSession({ cookie: 'auth_token=x', proxy: PROXY }), /auth_token and ct0/);
	assert.match(checkXSession({ cookie: COOKIE, proxy: 'host:8080' }), /proxy/);
	assert.match(checkXSession({ cookie: COOKIE, proxy: 'socks5://h:1' }), /proxy/);
	const ok = await xSessionTest.call({}, { data: { cookie: COOKIE, proxy: PROXY } });
	assert.equal(ok.status, 'OK');
	const bad = await xSessionTest.call({}, { data: { cookie: 'x', proxy: PROXY } });
	assert.equal(bad.status, 'Error');
});

test('Get Many by IDs allows 500 IDs', () => {
	const ep = ENDPOINTS.find((e) => e.resource === 'user' && e.operation === 'getManyByIds');
	assert.match(ep.description, /500/);
	assert.equal(ep.params[0].maxItems, 500);
});

const sendOf = (operation, name) => {
	const top = forOp(operation).find((p) => p.name === name);
	if (top) return top.routing.send;
	const options = forOp(operation).find((p) => p.name === 'options');
	return options.options.find((o) => o.name === name).routing.send;
};

const evalValue = (expr, value) =>
	new Function('$value', `return (${expr.replace(/^=\{\{/, '').replace(/\}\}$/, '')});`)(value);

test('bookmark, community and article operations post to the new /client routes', () => {
	const paths = Object.fromEntries(account.map((e) => [e.operation, e.path]));
	assert.equal(paths.getBookmarkFolders, '/client/bookmarks/folders');
	assert.equal(paths.getBookmarkFolderTweets, '/client/bookmarks/folder');
	assert.equal(paths.searchBookmarks, '/client/bookmarks/search');
	assert.equal(paths.getCommunityMemberships, '/client/communities/memberships');
	assert.equal(paths.getArticles, '/client/articles');
	for (const op of ['get', 'create', 'update', 'publish', 'unpublish', 'delete']) {
		const name = `${op}Article`;
		assert.equal(paths[name], `/client/articles/${op}`, name);
	}
});

test('cursor-only account reads have Return All and Cursor but no Count', () => {
	for (const operation of [
		'getBookmarkFolders',
		'getBookmarkFolderTweets',
		'getCommunityMemberships',
	]) {
		assert.ok(
			forOp(operation).find((p) => p.name === 'returnAll'),
			operation,
		);
		const names = forOp(operation)
			.find((p) => p.name === 'options')
			.options.map((o) => o.name);
		assert.deepEqual(names, ['cursor'], operation);
		assert.equal(sendOf(operation, 'cursor').type, 'body', operation);
	}
	for (const operation of ['searchBookmarks', 'getArticles']) {
		assert.equal(sendOf(operation, 'count').type, 'body', operation);
		assert.equal(sendOf(operation, 'cursor').type, 'body', operation);
	}
});

test('new account fields use the API names', () => {
	assert.equal(sendOf('getBookmarkFolderTweets', 'folderId').property, 'folder_id');
	assert.equal(sendOf('searchBookmarks', 'query').property, 'query');
	assert.equal(sendOf('getArticles', 'lifecycle').property, 'lifecycle');
	assert.equal(sendOf('getArticles', 'userId').property, 'user_id');
	for (const op of [
		'getArticle',
		'updateArticle',
		'publishArticle',
		'unpublishArticle',
		'deleteArticle',
	]) {
		assert.equal(sendOf(op, 'articleId').property, 'article_id', op);
		assert.equal(forOp(op).find((p) => p.name === 'articleId').required, true, op);
	}
	assert.equal(sendOf('createArticle', 'contentState').property, 'content_state');
	assert.equal(sendOf('updateArticle', 'coverMediaId').property, 'cover_media_id');
	assert.equal(sendOf('updateArticle', 'coverMediaCategory').property, 'cover_media_category');
	assert.equal(sendOf('updateArticle', 'removeCover').property, 'remove_cover');
	assert.equal(sendOf('publishArticle', 'tweetText').property, 'tweet_text');
	assert.equal(sendOf('publishArticle', 'replyControl').property, 'reply_control');
	assert.equal(sendOf('publishArticle', 'visibility').property, 'visibility');
});

test('article choices match the values the API accepts', () => {
	const values = (op, name) => {
		const top = forOp(op).find((p) => p.name === name);
		const prop =
			top ??
			forOp(op)
				.find((p) => p.name === 'options')
				.options.find((o) => o.name === name);
		return prop.options.map((o) => o.value).sort();
	};
	assert.deepEqual(values('getArticles', 'lifecycle'), ['draft', 'published']);
	assert.deepEqual(values('publishArticle', 'visibility'), ['public', 'subscribers']);
	assert.deepEqual(values('publishArticle', 'replyControl'), [
		'all',
		'byinvitation',
		'community',
		'verified',
	]);
	assert.deepEqual(values('updateArticle', 'coverMediaCategory'), [
		'AmplifyVideo',
		'DraftTweetGif',
		'DraftTweetImage',
	]);
});

test('Content State is sent as a JSON object', () => {
	const prop = forOp('updateArticle')
		.find((p) => p.name === 'options')
		.options.find((o) => o.name === 'contentState');
	assert.equal(prop.type, 'json');
	const state = { blocks: [{ text: 'Hi' }], entity_map: [] };
	assert.deepEqual(evalValue(prop.routing.send.value, JSON.stringify(state)), state);
	assert.deepEqual(evalValue(prop.routing.send.value, state), state);
	assert.equal(evalValue(prop.routing.send.value, '  '), undefined);
	assert.throws(() => evalValue(prop.routing.send.value, '{oops'));
	const text = forOp('createArticle')
		.find((p) => p.name === 'options')
		.options.find((o) => o.name === 'text');
	assert.equal(text.typeOptions.rows, 5);
});
