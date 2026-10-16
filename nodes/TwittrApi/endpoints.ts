/**
 * Single source of truth for every TwittrAPI endpoint the node exposes.
 *
 * To add or change an operation, edit this file only. The node UI (resources,
 * operations, fields, routing and pagination) is generated from these entries
 * in `descriptions.ts`.
 *
 * Path placeholders use `{name}` and must match the `name` of a path param.
 */

export type ParamType = 'string' | 'number' | 'boolean' | 'options';

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
		description: 'Act on your own X account: post, like, follow, DMs, lists, drafts',
	},
	{ name: 'Community', value: 'community', description: 'X Communities' },
	{ name: 'List', value: 'list', description: 'X Lists' },
	{ name: 'Search', value: 'search', description: 'Search tweets and people' },
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

	...ACCOUNT_ENDPOINTS,
];
