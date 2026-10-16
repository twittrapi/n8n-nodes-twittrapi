# Changelog

## [1.1.0] - 2026-10-16

- New **Account** resource that acts on your own X account: Create Tweet (with quote, poll and reply limit), Reply to Tweet, Delete Tweet, Like and Unlike Tweet, Retweet and Undo Retweet, Bookmark Tweet and Remove Bookmark, Follow and Unfollow User, Get DM Inbox, Send DM, Create List, Add and Remove List Member, Create Draft and Get Drafts.
- New **TwittrAPI X Session API** credential for these operations: Cookie, Proxy and an optional X Chat Passcode, all password fields. They are added to the request body and are never node parameters. See https://twittrapi.com/docs/x-session.
- Fixed: **User > Get Many by IDs** now accepts up to 500 IDs as the API does. 1.0.0 still stopped at 100.

## [1.0.0] - 2026-10-15

First stable release: the API is stable and follows semantic versioning.

- **Breaking:** **Tweet > Get Likers** is now a POST and needs two new required fields: **Cookie** (the Cookie header of the X account that posted the tweet, with `auth_token` and `ct0`) and **Proxy** (`http://user:pass@host:port`). Count and Cursor are sent in the request body; **Return All** works as before. It works only for your own tweets: X shows who liked a tweet only to its author. Existing workflows using Get Likers must fill in both fields.
- **User > Get Users by IDs** accepts up to 500 IDs per call (was 100), matching the API.
- The **RapidAPI Host** field of the credential says it can be changed for other TwittrAPI listings on RapidAPI. It already set both the URL and the `x-rapidapi-host` header.

## 0.2.5

- New TwittrAPI logo for the node and the credential. No functional changes.

## 0.2.4

- Package contact email updated. No functional changes.

## 0.2.3

- Published from GitHub Actions with an npm provenance statement (required for n8n verified community nodes). No functional changes. (0.2.1 and 0.2.2 were not published.)

## 0.2.0

- New **Output Format** field on every operation: **Raw** (default, X's JSON unchanged, same requests as before) or **Simple**, which sends `format=simple` and returns compact camelCase tweets, users, lists and communities in a `{data, nextCursor, previousCursor, hasNextPage}` envelope.
- **Return All** follows `nextCursor` for Simple responses and stops when `hasNextPage` is false.

## 0.1.0

- First version: User, Tweet, Search, List, Community and Trend operations, Direct and RapidAPI credentials, cursor pagination.
