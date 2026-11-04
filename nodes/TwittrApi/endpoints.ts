/**
 * Single source of truth for every TwittrAPI endpoint the node exposes.
 *
 * To add or change an operation, edit this file only. The node UI (resources,
 * operations, fields, routing and pagination) is generated from these entries
 * in `descriptions.ts`.
 *
 * Path placeholders use `{name}` and must match the `name` of a path param.
 */

export type ParamType = 'string' | 'number' | 'boolean' | 'options' | 'json';

export interface EndpointParam {
	/** n8n parameter name (unique per operation). */
	name: string;
	/** Name the API expects, if different from `name`. */
	apiName?: string;
	/** 'ui' params only steer which other fields are shown and are not sent. */
	in: 'path' | 'query' | 'body' | 'ui';
	displayName: string;
	type: ParamType;
	/** Required params are top-level fields. Optional ones go into the "Options" collection. */
	required?: boolean;
	default?: string | number | boolean;
	description: string;
	placeholder?: string;
	options?: Array<{ name: string; value: string; description?: string }>;
	/** Hide the value like a password (cookies). */
	password?: boolean;
	/** Strip a leading "@" (usernames). */
	stripAt?: boolean;
	/** Remove spaces and empty entries from a comma-separated list. */
	csv?: boolean;
	/** Reject more than this many comma-separated values before calling the API. */
	maxItems?: number;
	minValue?: number;
	maxValue?: number;
	/** Send a comma-separated value as an array of trimmed, non-empty strings. */
	list?: boolean;
	/** Show a multi-line text box with this many rows. */
	rows?: number;
	/** Extra displayOptions.show conditions, e.g. { userBy: ['id'] }. */
	showWhen?: Record<string, string[]>;
}

export interface Endpoint {
	resource: string;
	operation: string;
	/** Operation name shown in the UI (Title Case). */
	name: string;
	/** Action label shown in the node picker (sentence case). */
	action: string;
	description: string;
	/** POST sends body params, Count and Cursor in a JSON body. */
	method: 'GET' | 'POST';
	path: string;
	params: EndpointParam[];
	/**
	 * The response is an X timeline with a bottom cursor. Adds Count, Cursor,
	 * Return All and Max Pages.
	 */
	paginated?: boolean;
	/** Paginated, but the API takes only a cursor: no Count option. */
	noCount?: boolean;
	/**
	 * The path contains `{userId}` and the API also accepts `?username=` with
	 * userId `-1`. Adds a "User" selector (by ID or by username).
	 */
	userLookup?: boolean;
	/**
	 * Runs with the user's own X session: cookie and proxy come from the
	 * "TwittrAPI X Session" credential and are added to the body.
	 */
	xSession?: boolean;
}

export interface Resource {
	name: string;
	value: string;
	description: string;
}

export const RESOURCES: Resource[] = [
	{
		name: 'Account',
		value: 'account',
		description:
			'Act on your own X account: post, like, follow, DMs, lists, drafts, bookmarks, articles',
	},
	{ name: 'Community', value: 'community', description: 'X Communities' },
	{ name: 'List', value: 'list', description: 'X Lists' },
	{ name: 'Search', value: 'search', description: 'Search tweets and people' },
	{ name: 'Space', value: 'space', description: 'X Spaces (live audio)' },
	{ name: 'Trend', value: 'trend', description: 'Trending topics by location' },
	{ name: 'Tweet', value: 'tweet', description: 'Single tweets and their engagement' },
	{ name: 'User', value: 'user', description: 'Profiles, timelines and follower graphs' },
];

// Reusable params ----------------------------------------------------------

const userId: EndpointParam = {
	displayName: 'User ID',
	name: 'userId',
	in: 'path',
	type: 'string',
	required: true,
	default: '',
	placeholder: '44196397',
	description: 'Numeric user ID (rest_ID)',
};

const usernamePath: EndpointParam = {
	displayName: 'Username',
	name: 'username',
	in: 'path',
	type: 'string',
	required: true,
	default: '',
	placeholder: 'elonmusk',
	description: 'Username without or with a leading @',
	stripAt: true,
};

const tweetId: EndpointParam = {
	displayName: 'Tweet ID',
	name: 'tweetId',
	in: 'path',
	type: 'string',
	required: true,
	default: '',
	placeholder: '1585341984679469056',
	description: 'Numeric tweet ID (the number at the end of the tweet URL)',
};

const listId: EndpointParam = {
	displayName: 'List ID',
	name: 'listId',
	in: 'query',
	type: 'string',
	required: true,
	default: '',
	placeholder: '1539453138322673664',
	description: 'Numeric list ID (the number at the end of the list URL)',
};

const communityId: EndpointParam = {
	displayName: 'Community ID',
	name: 'communityId',
	in: 'path',
	type: 'string',
	required: true,
	default: '',
	placeholder: '1493446837214187523',
	description: 'Numeric community ID (the number in the community URL)',
};

const cookie: EndpointParam = {
	displayName: 'Cookie',
	name: 'cookie',
	in: 'body',
	type: 'string',
	required: true,
	default: '',
	placeholder: 'auth_token=...; ct0=...',
	description:
		'Cookie header of the X account that posted the tweet. Must contain auth_token and ct0.',
	password: true,
};

const proxy: EndpointParam = {
	displayName: 'Proxy',
	name: 'proxy',
	in: 'body',
	type: 'string',
	required: true,
	default: '',
	placeholder: 'http://user:pass@host:port',
	description: 'Proxy the request to X goes out through',
};

const rankingMode = (values: string[]): EndpointParam => {
	const first = values[0];
	return {
		displayName: 'Ranking Mode',
		name: 'rankingMode',
		in: 'query',
		type: 'options',
		default: first,
		description: 'Order of the results',
		options: values.map((v) => ({ name: v, value: v })),
	};
};

// Account (your own X session) ---------------------------------------------

const tweetIdBody = (what: string): EndpointParam => ({
	displayName: 'Tweet ID',
	name: 'tweetId',
	apiName: 'tweet_id',
	in: 'body',
	type: 'string',
	required: true,
	default: '',
	placeholder: '1585341984679469056',
	description: `Numeric ID of the tweet to ${what}`,
});

const tweetText = (what: string): EndpointParam => ({
	displayName: 'Text',
	name: 'text',
	in: 'body',
	type: 'string',
	required: true,
	default: '',
	description: what,
});

const quoteUrl = (apiName: string): EndpointParam => ({
	displayName: 'Quote Tweet URL',
	name: 'quoteUrl',
	apiName,
	in: 'body',
	type: 'string',
	default: '',
	placeholder: 'https://x.com/jack/status/20',
	description: 'URL of a tweet to quote',
});

/** conversation_id or user_id of a pending message request, chosen with "Identify Request By". */
const dmRequestTarget = (): EndpointParam[] => [
	{
		displayName: 'Identify Request By',
		name: 'requestBy',
		in: 'ui',
		type: 'options',
		required: true,
		default: 'conversation',
		description: 'Whether to identify the request by conversation ID or by the user who sent it',
		options: [
			{ name: 'Conversation', value: 'conversation' },
			{ name: 'User', value: 'user' },
		],
	},
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		apiName: 'conversation_id',
		in: 'body',
		type: 'string',
		required: true,
		default: '',
		placeholder: '12:44196397',
		description: 'Conversation ID from Get DM Requests',
		showWhen: { requestBy: ['conversation'] },
	},
	{
		displayName: 'User ID',
		name: 'userId',
		apiName: 'user_id',
		in: 'body',
		type: 'string',
		required: true,
		default: '',
		placeholder: '44196397',
		description: 'Numeric ID of the person who sent the request',
		showWhen: { requestBy: ['user'] },
	},
];

/** user_id or username in the body, chosen with "Identify User By". */
const bodyUser = (): EndpointParam[] => [
	{
		displayName: 'Identify User By',
		name: 'userBy',
		in: 'ui',
		type: 'options',
		required: true,
		default: 'username',
		description: 'Whether to identify the user by numeric ID or by username',
		options: [
			{ name: 'User ID', value: 'id' },
			{ name: 'Username', value: 'username' },
		],
	},
	{
		displayName: 'User ID',
		name: 'userId',
		apiName: 'user_id',
		in: 'body',
		type: 'string',
		required: true,
		default: '',
		placeholder: '44196397',
		description: 'Numeric user ID',
		showWhen: { userBy: ['id'] },
	},
	{
		displayName: 'Username',
		name: 'username',
		in: 'body',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'elonmusk',
		description: 'Username without or with a leading @',
		stripAt: true,
		showWhen: { userBy: ['username'] },
	},
];

const listIdBody: EndpointParam = {
	...listId,
	apiName: 'list_id',
	in: 'body',
	description: 'Numeric ID of your list',
};

const tweetAction = (
	operation: string,
	name: string,
	action: string,
	path: string,
	what: string,
): Endpoint => ({
	resource: 'account',
	operation,
	name,
	action,
	description: `${action.charAt(0).toUpperCase()}${action.slice(1)} from your X account`,
	method: 'POST',
	path,
	params: [tweetIdBody(what)],
	xSession: true,
});

const articleIdBody = (what: string): EndpointParam => ({
	displayName: 'Article ID',
	name: 'articleId',
	apiName: 'article_id',
	in: 'body',
	type: 'string',
	required: true,
	default: '',
	placeholder: '1790000000000000000',
	description: `Numeric ID of the article to ${what}, from Get Articles`,
});

/** Title and content of an article. All optional: a new draft can start empty. */
const articleContent: EndpointParam[] = [
	{
		displayName: 'Title',
		name: 'title',
		in: 'body',
		type: 'string',
		default: '',
		description: 'Title of the article',
	},
	{
		displayName: 'Text',
		name: 'text',
		in: 'body',
		type: 'string',
		default: '',
		rows: 5,
		description: 'Content as plain text, one paragraph per line. Use Text or Content State.',
	},
	{
		displayName: 'Content State',
		name: 'contentState',
		apiName: 'content_state',
		in: 'body',
		type: 'json',
		default: '',
		description:
			'Content in the x.com editor format, {"blocks": [...], "entity_map": [...]}, as Get Article returns it. For headings, links and styles. Use Text or Content State.',
	},
];

const ACCOUNT_ENDPOINTS: Endpoint[] = [
	{
		resource: 'account',
		operation: 'createTweet',
		name: 'Create Tweet',
		action: 'Post a tweet',
		description:
			'Post a tweet from your X account, optionally with a quote, a poll or a reply limit',
		method: 'POST',
		path: '/client/create',
		params: [
			tweetText('Tweet text. Over 280 characters it is posted as a long post (needs X Premium).'),
			quoteUrl('quote_url'),
			{
				displayName: 'Poll Choices',
				name: 'pollChoices',
				apiName: 'poll.choices',
				in: 'body',
				type: 'string',
				default: '',
				placeholder: 'Yes,No',
				description:
					'Comma-separated, 2 to 4 choices of up to 25 characters. A poll tweet has at most 280 characters and no quote.',
				list: true,
			},
			{
				displayName: 'Poll Duration (Minutes)',
				name: 'pollDurationMinutes',
				apiName: 'poll.duration_minutes',
				in: 'body',
				type: 'number',
				default: 1440,
				minValue: 5,
				maxValue: 10080,
				description: 'How long the poll runs, 5 to 10080 minutes (7 days). Needs Poll Choices.',
			},
			{
				displayName: 'Who Can Reply',
				name: 'whoCanReply',
				apiName: 'conversation_control_mode',
				in: 'body',
				type: 'options',
				default: 'only_follows',
				description: 'Limit who can reply. Leave out for everyone.',
				options: [
					{ name: 'Accounts You Follow', value: 'only_follows' },
					{ name: 'Mentioned Accounts', value: 'only_mentioned' },
					{ name: 'Verified Accounts', value: 'only_verified' },
				],
			},
		],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'replyToTweet',
		name: 'Reply to Tweet',
		action: 'Reply to a tweet',
		description: 'Reply to a tweet from your X account',
		method: 'POST',
		path: '/client/reply',
		params: [
			{ ...tweetIdBody('reply to'), apiName: 'id' },
			tweetText('Reply text'),
			quoteUrl('attachment_url'),
		],
		xSession: true,
	},
	tweetAction(
		'deleteTweet',
		'Delete Tweet',
		'delete a tweet',
		'/client/deleteTweet',
		'delete (one of your own)',
	),
	tweetAction('likeTweet', 'Like Tweet', 'like a tweet', '/client/like', 'like'),
	tweetAction('unlikeTweet', 'Unlike Tweet', 'unlike a tweet', '/client/unlike', 'unlike'),
	tweetAction('retweet', 'Retweet', 'retweet a tweet', '/client/retweet', 'retweet'),
	tweetAction('unretweet', 'Undo Retweet', 'undo a retweet', '/client/unretweet', 'unretweet'),
	tweetAction(
		'bookmarkTweet',
		'Bookmark Tweet',
		'bookmark a tweet',
		'/client/bookmark',
		'bookmark',
	),
	tweetAction(
		'unbookmarkTweet',
		'Remove Bookmark',
		'remove a bookmark',
		'/client/unbookmark',
		'remove from your bookmarks',
	),
	{
		resource: 'account',
		operation: 'followUser',
		name: 'Follow User',
		action: 'Follow a user',
		description: 'Follow an account from your X account',
		method: 'POST',
		path: '/client/follow',
		params: bodyUser(),
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'unfollowUser',
		name: 'Unfollow User',
		action: 'Unfollow a user',
		description: 'Unfollow an account',
		method: 'POST',
		path: '/client/unfollow',
		params: bodyUser(),
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'getDmInbox',
		name: 'Get DM Inbox',
		action: 'Get your DM conversations',
		description:
			'Your direct message conversations. With the X Chat passcode in the credential, also their latest messages.',
		method: 'POST',
		path: '/client/dm/inbox',
		params: [
			{
				displayName: 'Count',
				name: 'count',
				in: 'body',
				type: 'number',
				default: 20,
				minValue: 1,
				maxValue: 50,
				description: 'Conversations to return, 1 to 50',
			},
		],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'sendDm',
		name: 'Send DM',
		action: 'Send a direct message',
		description:
			'Send an encrypted text message to a user or a conversation. Needs the X Chat passcode in the credential.',
		method: 'POST',
		path: '/client/dm/send',
		params: [
			{
				displayName: 'Send To',
				name: 'sendTo',
				in: 'ui',
				type: 'options',
				required: true,
				default: 'user',
				description: 'Whether to write to a user or to an existing conversation',
				options: [
					{ name: 'User', value: 'user' },
					{ name: 'Conversation', value: 'conversation' },
				],
			},
			{
				displayName: 'User ID',
				name: 'userId',
				apiName: 'user_id',
				in: 'body',
				type: 'string',
				required: true,
				default: '',
				placeholder: '44196397',
				description: 'Numeric ID of the person, for a one-to-one chat',
				showWhen: { sendTo: ['user'] },
			},
			{
				displayName: 'Conversation ID',
				name: 'conversationId',
				apiName: 'conversation_id',
				in: 'body',
				type: 'string',
				required: true,
				default: '',
				placeholder: '12:44196397',
				description: 'Conversation ID from Get DM Inbox',
				showWhen: { sendTo: ['conversation'] },
			},
			tweetText('Message text, up to 10,000 characters'),
		],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'getDmRequests',
		name: 'Get DM Requests',
		action: 'Get your pending message requests',
		description:
			'Your pending message requests with participants and latest messages. Listing does not accept them or mark them as seen. A request that is encrypted needs the X Chat passcode in the credential to be read.',
		method: 'POST',
		path: '/client/dm/requests',
		params: [
			{
				displayName: 'Folder',
				name: 'folder',
				in: 'body',
				type: 'options',
				default: 'you_may_know',
				description: 'Which requests to list. Leave out for both folders.',
				options: [
					{ name: 'Other', value: 'other' },
					{ name: 'You May Know', value: 'you_may_know' },
				],
			},
			{
				displayName: 'Count',
				name: 'count',
				in: 'body',
				type: 'number',
				default: 20,
				minValue: 1,
				maxValue: 50,
				description: 'Requests to return per folder, 1 to 50',
			},
		],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'acceptDmRequest',
		name: 'Accept DM Request',
		action: 'Accept a message request',
		description:
			'Accept one pending one-to-one message request and send the first reply in one call. Needs the X Chat passcode in the credential.',
		method: 'POST',
		path: '/client/dm/requests/accept',
		params: [...dmRequestTarget(), tweetText('Reply text, up to 10,000 characters')],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'declineDmRequest',
		name: 'Decline DM Request',
		action: 'Decline a message request',
		description:
			'Delete a pending message request from your inbox. The sender is not told. Needs the X Chat passcode in the credential.',
		method: 'POST',
		path: '/client/dm/requests/decline',
		params: dmRequestTarget(),
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'createList',
		name: 'Create List',
		action: 'Create a list',
		description: 'Create an X list owned by your account',
		method: 'POST',
		path: '/client/lists/create',
		params: [
			{
				displayName: 'Name',
				name: 'name',
				in: 'body',
				type: 'string',
				required: true,
				default: '',
				description: 'List name, up to 25 characters',
			},
			{
				displayName: 'Description',
				name: 'description',
				in: 'body',
				type: 'string',
				default: '',
				description: 'List description, up to 100 characters',
			},
			{
				displayName: 'Private',
				name: 'private',
				in: 'body',
				type: 'boolean',
				default: false,
				description: 'Whether only you can see the list',
			},
		],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'addListMember',
		name: 'Add List Member',
		action: 'Add a member to a list',
		description: 'Add an account to one of your lists',
		method: 'POST',
		path: '/client/lists/members/add',
		params: [listIdBody, ...bodyUser()],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'removeListMember',
		name: 'Remove List Member',
		action: 'Remove a member from a list',
		description: 'Remove an account from one of your lists',
		method: 'POST',
		path: '/client/lists/members/remove',
		params: [listIdBody, ...bodyUser()],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'createDraft',
		name: 'Create Draft',
		action: 'Save a tweet draft',
		description: 'Save a tweet as a draft in your X account (not posted)',
		method: 'POST',
		path: '/client/drafts/create',
		params: [tweetText('Draft text')],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'getDrafts',
		name: 'Get Drafts',
		action: 'Get your tweet drafts',
		description: 'Your saved tweet drafts, newest first',
		method: 'POST',
		path: '/client/drafts',
		params: [
			{
				displayName: 'Oldest First',
				name: 'ascending',
				in: 'body',
				type: 'boolean',
				default: false,
				description: 'Whether to return the oldest drafts first',
			},
		],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'getBookmarkFolders',
		name: 'Get Bookmark Folders',
		action: 'Get your bookmark folders',
		description: 'Your bookmark folders and their IDs. Needs X Premium.',
		method: 'POST',
		path: '/client/bookmarks/folders',
		params: [],
		paginated: true,
		noCount: true,
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'getBookmarkFolderTweets',
		name: 'Get Bookmark Folder Tweets',
		action: 'Get the tweets in a bookmark folder',
		description: 'The tweets in one of your bookmark folders. Needs X Premium.',
		method: 'POST',
		path: '/client/bookmarks/folder',
		params: [
			{
				displayName: 'Folder ID',
				name: 'folderId',
				apiName: 'folder_id',
				in: 'body',
				type: 'string',
				required: true,
				default: '',
				placeholder: '1790000000000000000',
				description: 'Numeric folder ID from Get Bookmark Folders',
			},
		],
		paginated: true,
		noCount: true,
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'searchBookmarks',
		name: 'Search Bookmarks',
		action: 'Search your bookmarks',
		description: 'Search the tweets in your bookmarks',
		method: 'POST',
		path: '/client/bookmarks/search',
		params: [
			{
				displayName: 'Query',
				name: 'query',
				in: 'body',
				type: 'string',
				required: true,
				default: '',
				description: 'Search text, up to 500 characters',
			},
		],
		paginated: true,
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'getCommunityMemberships',
		name: 'Get Your Communities',
		action: 'Get the communities you are a member of',
		description: 'The communities your X account is a member of',
		method: 'POST',
		path: '/client/communities/memberships',
		params: [],
		paginated: true,
		noCount: true,
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'getArticles',
		name: 'Get Articles',
		action: 'Get your articles',
		description: 'Your draft or published X articles and their IDs. Needs X Premium.',
		method: 'POST',
		path: '/client/articles',
		params: [
			{
				displayName: 'State',
				name: 'lifecycle',
				in: 'body',
				type: 'options',
				required: true,
				default: 'draft',
				description: 'Whether to list drafts or published articles',
				options: [
					{ name: 'Draft', value: 'draft' },
					{ name: 'Published', value: 'published' },
				],
			},
			{
				displayName: 'User ID',
				name: 'userId',
				apiName: 'user_id',
				in: 'body',
				type: 'string',
				default: '',
				placeholder: '44196397',
				description: 'Your own numeric user ID. Only needed when the cookie has no twid.',
			},
		],
		paginated: true,
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'getArticle',
		name: 'Get Article',
		action: 'Get one of your articles',
		description: 'One of your articles with its title, content, cover and state. Needs X Premium.',
		method: 'POST',
		path: '/client/articles/get',
		params: [articleIdBody('read')],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'createArticle',
		name: 'Create Article',
		action: 'Create an article draft',
		description: 'Save a new X article as a draft. Needs X Premium.',
		method: 'POST',
		path: '/client/articles/create',
		params: articleContent,
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'updateArticle',
		name: 'Update Article',
		action: 'Update an article',
		description:
			'Change the title, content or cover of an article. Fields you leave out stay as they are. Needs X Premium.',
		method: 'POST',
		path: '/client/articles/update',
		params: [
			articleIdBody('update'),
			...articleContent,
			{
				displayName: 'Cover Media ID',
				name: 'coverMediaId',
				apiName: 'cover_media_id',
				in: 'body',
				type: 'string',
				default: '',
				placeholder: '1790000000000000000',
				description: 'Numeric ID of an uploaded image or video to use as the cover',
			},
			{
				displayName: 'Cover Media Type',
				name: 'coverMediaCategory',
				apiName: 'cover_media_category',
				in: 'body',
				type: 'options',
				default: 'DraftTweetImage',
				description: 'Type of the cover media',
				options: [
					{ name: 'GIF', value: 'DraftTweetGif' },
					{ name: 'Image', value: 'DraftTweetImage' },
					{ name: 'Video', value: 'AmplifyVideo' },
				],
			},
			{
				displayName: 'Remove Cover',
				name: 'removeCover',
				apiName: 'remove_cover',
				in: 'body',
				type: 'boolean',
				default: false,
				description: 'Whether to remove the cover. Not together with Cover Media ID.',
			},
		],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'publishArticle',
		name: 'Publish Article',
		action: 'Publish an article',
		description: 'Publish a draft article as a post on your X account. Needs X Premium.',
		method: 'POST',
		path: '/client/articles/publish',
		params: [
			articleIdBody('publish'),
			{
				displayName: 'Visibility',
				name: 'visibility',
				in: 'body',
				type: 'options',
				default: 'public',
				description: 'Who can read the article',
				options: [
					{ name: 'Public', value: 'public' },
					{ name: 'Subscribers Only', value: 'subscribers' },
				],
			},
			{
				displayName: 'Who Can Reply',
				name: 'replyControl',
				apiName: 'reply_control',
				in: 'body',
				type: 'options',
				default: 'all',
				description: 'Who can reply to the post. Ignored for subscriber-only articles.',
				options: [
					{ name: 'Accounts You Follow', value: 'community' },
					{ name: 'Everyone', value: 'all' },
					{ name: 'Mentioned Accounts', value: 'byinvitation' },
					{ name: 'Verified Accounts', value: 'verified' },
				],
			},
			{
				displayName: 'Post Text',
				name: 'tweetText',
				apiName: 'tweet_text',
				in: 'body',
				type: 'string',
				default: '',
				description: 'Text of the post that shares the article, up to 256 characters',
			},
		],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'unpublishArticle',
		name: 'Unpublish Article',
		action: 'Unpublish an article',
		description: 'Turn a published article back into a draft. Needs X Premium.',
		method: 'POST',
		path: '/client/articles/unpublish',
		params: [articleIdBody('unpublish')],
		xSession: true,
	},
	{
		resource: 'account',
		operation: 'deleteArticle',
		name: 'Delete Article',
		action: 'Delete an article',
		description: 'Delete one of your articles. Needs X Premium.',
		method: 'POST',
		path: '/client/articles/delete',
		params: [articleIdBody('delete')],
		xSession: true,
	},
];

// Endpoints ----------------------------------------------------------------

export const ENDPOINTS: Endpoint[] = [
	// User
	{
		resource: 'user',
		operation: 'getByUsername',
		name: 'Get by Username',
		action: 'Get a user by username',
		description: 'Get a profile by username',
		method: 'GET',
		path: '/user/by/username/{username}',
		params: [usernamePath],
	},
	{
		resource: 'user',
		operation: 'getById',
		name: 'Get by ID',
		action: 'Get a user by ID',
		description: 'Get a profile by numeric user ID',
		method: 'GET',
		path: '/user/{userId}',
		params: [userId],
	},
	{
		resource: 'user',
		operation: 'usernameToId',
		name: 'Username to ID',
		action: 'Convert a username to a user ID',
		description: 'Resolve a username to its numeric user ID. Returns {"userId": "..."}.',
		method: 'GET',
		path: '/username/to/id/{username}',
		params: [usernamePath],
	},
	{
		resource: 'user',
		operation: 'getManyByIds',
		name: 'Get Many by IDs',
		action: 'Get many users by IDs',
		description: 'Get up to 500 profiles in one call',
		method: 'GET',
		path: '/user/users/by/ids',
		params: [
			{
				displayName: 'User IDs',
				name: 'ids',
				in: 'query',
				type: 'string',
				required: true,
				default: '',
				placeholder: '44196397,783214',
				description: 'Comma-separated numeric user IDs (max 500)',
				csv: true,
				maxItems: 500,
			},
		],
	},
	{
		resource: 'user',
		operation: 'getTweets',
		name: 'Get Tweets',
		action: "Get a user's tweets",
		description: 'Get the tweets timeline of a user',
		method: 'GET',
		path: '/user/{userId}/tweets',
		params: [userId],
		userLookup: true,
		paginated: true,
	},
	{
		resource: 'user',
		operation: 'getTweetsAndReplies',
		name: 'Get Tweets and Replies',
		action: "Get a user's tweets and replies",
		description: 'Get tweets and replies of a user',
		method: 'GET',
		path: '/user/{userId}/tweetsAndReplies',
		params: [userId],
		userLookup: true,
		paginated: true,
	},
	{
		resource: 'user',
		operation: 'getMedia',
		name: 'Get Media',
		action: "Get a user's media tweets",
		description: 'Get tweets with photos or videos posted by a user',
		method: 'GET',
		path: '/user/{userId}/media',
		params: [userId],
		userLookup: true,
		paginated: true,
	},
	{
		resource: 'user',
		operation: 'getFollowers',
		name: 'Get Followers',
		action: "Get a user's followers",
		description: 'Get accounts that follow a user',
		method: 'GET',
		path: '/user/{userId}/followers',
		params: [userId],
		userLookup: true,
		paginated: true,
	},
	{
		resource: 'user',
		operation: 'getFollowing',
		name: 'Get Following',
		action: 'Get accounts a user follows',
		description: 'Get accounts a user follows',
		method: 'GET',
		path: '/user/{userId}/followings',
		params: [userId],
		userLookup: true,
		paginated: true,
	},
	{
		resource: 'user',
		operation: 'getVerifiedFollowers',
		name: 'Get Verified Followers',
		action: "Get a user's verified followers",
		description: 'Get followers with a blue checkmark',
		method: 'GET',
		path: '/user/{userId}/verifiedFollowers',
		params: [userId],
		userLookup: true,
		paginated: true,
	},
	{
		resource: 'user',
		operation: 'getAffiliates',
		name: 'Get Affiliates',
		action: "Get an organization's affiliates",
		description: 'Get accounts affiliated with an organization (the Affiliates tab of its profile)',
		method: 'GET',
		path: '/user/{userId}/affiliates',
		params: [userId],
		userLookup: true,
		paginated: true,
	},
	{
		resource: 'user',
		operation: 'getAboutMany',
		name: 'Get About for Many',
		action: 'Get about data of many users',
		description:
			'Get the "About this account" data of up to 20 accounts in one request. Billed one call per username.',
		method: 'GET',
		path: '/user/about/batch',
		params: [
			{
				displayName: 'Usernames',
				name: 'usernames',
				in: 'query',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'jack,XDevelopers',
				description: 'Comma-separated usernames, with or without @ (max 20)',
				csv: true,
				maxItems: 20,
			},
		],
	},
	{
		resource: 'user',
		operation: 'getRelationships',
		name: 'Get Relationships',
		action: 'Check whether a user follows many others',
		description:
			'Whether one account follows up to 50 others, and the other way round. Billed one call per target username.',
		method: 'GET',
		path: '/user/friendships/batch',
		params: [
			{
				displayName: 'Source Username',
				name: 'sourceUsername',
				apiName: 'source_screen_name',
				in: 'query',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'jack',
				description: 'The account to compare with the others, with or without @',
				stripAt: true,
			},
			{
				displayName: 'Target Usernames',
				name: 'targetUsernames',
				apiName: 'target_screen_names',
				in: 'query',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'XDevelopers,TwitterDev',
				description: 'Comma-separated usernames, with or without @ (max 50)',
				csv: true,
				maxItems: 50,
			},
		],
	},

	// Tweet
	{
		resource: 'tweet',
		operation: 'get',
		name: 'Get',
		action: 'Get a tweet',
		description: 'Get a single tweet without its conversation',
		method: 'GET',
		path: '/simpletweet/{tweetId}',
		params: [tweetId],
	},
	{
		resource: 'tweet',
		operation: 'getConversation',
		name: 'Get Conversation',
		action: 'Get a tweet with its replies',
		description: 'Get a tweet together with its thread and replies',
		method: 'GET',
		path: '/tweet/{tweetId}',
		params: [tweetId, rankingMode(['Relevance', 'Recency', 'Likes'])],
		paginated: true,
	},
	{
		resource: 'tweet',
		operation: 'getRetweeters',
		name: 'Get Retweeters',
		action: 'Get users who retweeted a tweet',
		description: 'Get users who retweeted a tweet',
		method: 'GET',
		path: '/tweet/{tweetId}/retweets',
		params: [tweetId],
		paginated: true,
	},
	{
		resource: 'tweet',
		operation: 'getLikers',
		name: 'Get Likers',
		action: 'Get users who liked a tweet',
		description:
			'Get users who liked one of your own tweets. X shows likers only to the author, so use the cookie of the account that posted it.',
		method: 'POST',
		path: '/tweet/{tweetId}/favorites',
		params: [tweetId, cookie, proxy],
		paginated: true,
	},
	{
		resource: 'tweet',
		operation: 'getQuotes',
		name: 'Get Quotes',
		action: 'Get quote tweets of a tweet',
		description: 'Get tweets that quote a tweet',
		method: 'GET',
		path: '/tweet/{tweetId}/quotes',
		params: [tweetId, rankingMode(['Relevance', 'Recency'])],
		paginated: true,
	},
	{
		resource: 'tweet',
		operation: 'getReplies',
		name: 'Get Replies',
		action: 'Get the replies to a tweet',
		description: 'Get only the replies to a tweet, without the tweet itself or the tweets above it',
		method: 'GET',
		path: '/tweet/{tweetId}/replies',
		params: [
			tweetId,
			rankingMode(['Relevance', 'Recency', 'Likes']),
			{
				displayName: 'Include Promoted Content',
				name: 'includePromotedContent',
				in: 'query',
				type: 'boolean',
				default: false,
				description: 'Whether to include promoted tweets',
			},
		],
		paginated: true,
	},
	{
		resource: 'tweet',
		operation: 'getThread',
		name: 'Get Thread',
		action: "Get a tweet's thread",
		description:
			"Get the author's own thread around a tweet: their tweets above it and their replies to themselves below it",
		method: 'GET',
		path: '/tweet/{tweetId}/thread',
		params: [tweetId],
	},

	// Search
	{
		resource: 'search',
		operation: 'tweets',
		name: 'Search',
		action: 'Search tweets or people',
		description: 'Run an X search query. Supports operators like from:, since:, lang:, min_faves:.',
		method: 'GET',
		path: '/search',
		params: [
			{
				displayName: 'Query',
				name: 'query',
				in: 'query',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'n8n lang:en -filter:replies',
				description: 'Search query, same syntax as the search box on X (max 512 characters)',
			},
			{
				displayName: 'Category',
				name: 'category',
				in: 'query',
				type: 'options',
				required: true,
				default: 'Latest',
				description: 'Which search tab to return',
				options: [
					{ name: 'Latest', value: 'Latest' },
					{ name: 'People', value: 'People' },
					{ name: 'Photos', value: 'Photos' },
					{ name: 'Top', value: 'Top' },
					{ name: 'Videos', value: 'Videos' },
				],
			},
		],
		paginated: true,
	},

	// List
	{
		resource: 'list',
		operation: 'get',
		name: 'Get Details',
		action: 'Get list details',
		description: 'Get name, description, owner and counts of a list',
		method: 'GET',
		path: '/lists/details',
		params: [listId],
	},
	{
		resource: 'list',
		operation: 'getTweets',
		name: 'Get Tweets',
		action: 'Get tweets of a list',
		description: 'Get the tweet timeline of a list',
		method: 'GET',
		path: '/lists/tweets',
		params: [listId],
		paginated: true,
	},
	{
		resource: 'list',
		operation: 'getMembers',
		name: 'Get Members',
		action: 'Get members of a list',
		description: 'Get accounts that are members of a list',
		method: 'GET',
		path: '/lists/members',
		params: [listId],
		paginated: true,
	},

	// Community
	{
		resource: 'community',
		operation: 'get',
		name: 'Get',
		action: 'Get a community',
		description: 'Get details of a community',
		method: 'GET',
		path: '/communities/{communityId}',
		params: [communityId],
	},
	{
		resource: 'community',
		operation: 'getAbout',
		name: 'Get About',
		action: "Get a community's about page",
		description:
			'Get the About page of a community: description, rules, creation date and moderators',
		method: 'GET',
		path: '/communities/{communityId}/about',
		params: [communityId],
	},
	{
		resource: 'community',
		operation: 'getTweets',
		name: 'Get Tweets',
		action: 'Get tweets of a community',
		description: 'Get the tweet timeline of a community',
		method: 'GET',
		path: '/communities/{communityId}/tweets',
		params: [communityId],
		paginated: true,
	},
	{
		resource: 'community',
		operation: 'search',
		name: 'Search',
		action: 'Search communities',
		description: 'Find communities by keyword',
		method: 'GET',
		path: '/communities/search/{searchTerm}',
		params: [
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				in: 'path',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'automation',
				description: 'Keyword to search for',
			},
		],
		paginated: true,
	},

	// Trend
	{
		resource: 'trend',
		operation: 'get',
		name: 'Get by Location',
		action: 'Get trends by location',
		description: 'Get trending topics for a location (WOEID)',
		method: 'GET',
		path: '/trends/{woeid}',
		params: [
			{
				displayName: 'Location WOEID',
				name: 'woeid',
				in: 'path',
				type: 'string',
				required: true,
				default: '1',
				placeholder: '23424977',
				description:
					'Yahoo Where On Earth ID. 1 = worldwide, 23424977 = United States. Use "Get Locations" to list all.',
			},
		],
	},
	{
		resource: 'trend',
		operation: 'getLocations',
		name: 'Get Locations',
		action: 'Get trend locations',
		description: 'List all locations (with WOEID) that have trends',
		method: 'GET',
		path: '/misc/locations',
		params: [],
	},

	// Space
	{
		resource: 'space',
		operation: 'get',
		name: 'Get',
		action: 'Get a space',
		description: 'Get an X Space: title, state, host, participants and whether a replay exists',
		method: 'GET',
		path: '/spaces/{spaceId}',
		params: [
			{
				displayName: 'Space ID',
				name: 'spaceId',
				in: 'path',
				type: 'string',
				required: true,
				default: '',
				placeholder: '1YqKDqWqdPLsV',
				description: 'The letters and digits at the end of the Space URL (x.com/i/spaces/...)',
			},
		],
	},

	...ACCOUNT_ENDPOINTS,
];
