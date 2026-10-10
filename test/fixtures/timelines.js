'use strict';

// Trimmed shapes of real X GraphQL responses, as returned by TwittrAPI.

const userEntry = (id) => ({
	entryId: `user-${id}`,
	sortIndex: id,
	content: {
		entryType: 'TimelineTimelineItem',
		itemContent: { itemType: 'TimelineUser', user_results: { result: { rest_id: id } } },
	},
});

const cursorEntry = (type, value) => ({
	entryId: `cursor-${type.toLowerCase()}-${value}`,
	sortIndex: '0',
	content: { entryType: 'TimelineTimelineCursor', value, cursorType: type },
});

/** Followers page (TimelineAddEntries with cursor entries). */
const followersPage = (ids, bottom) => ({
	data: {
		user: {
			result: {
				timeline: {
					timeline: {
						instructions: [
							{ type: 'TimelineClearCache' },
							{
								type: 'TimelineAddEntries',
								entries: [
									...ids.map(userEntry),
									cursorEntry('Top', 'TOP_' + bottom),
									cursorEntry('Bottom', bottom),
								],
							},
						],
					},
				},
			},
		},
	},
});

/** Search page after the first one: cursors arrive as TimelineReplaceEntry. */
const searchReplacePage = (tweetIds, bottom) => ({
	category: 'Latest',
	entries: [
		{
			type: 'TimelineAddEntries',
			entries: tweetIds.map((id) => ({
				entryId: `tweet-${id}`,
				content: { entryType: 'TimelineTimelineItem' },
			})),
		},
		{
			type: 'TimelineReplaceEntry',
			entry_id_to_replace: 'cursor-top-x',
			entry: cursorEntry('Top', 'T'),
		},
		{
			type: 'TimelineReplaceEntry',
			entry_id_to_replace: 'cursor-bottom-x',
			entry: cursorEntry('Bottom', bottom),
		},
	],
});

/** Empty page that still carries a bottom cursor (X does this at the end). */
const emptyPage = (bottom) => ({
	data: {
		list: {
			tweets_timeline: {
				timeline: {
					instructions: [
						{
							type: 'TimelineAddEntries',
							entries: [cursorEntry('Top', 'T'), cursorEntry('Bottom', bottom)],
						},
					],
				},
			},
		},
	},
});

/** Slice-style response (some community endpoints). */
const slicePage = (n, next) => ({
	data: {
		community_search: {
			items: Array.from({ length: n }, (_, i) => ({ id: String(i) })),
			slice_info: { next_cursor: next },
		},
	},
});

module.exports = { followersPage, searchReplacePage, emptyPage, slicePage };
