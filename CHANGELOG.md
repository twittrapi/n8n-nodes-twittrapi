# Changelog

## 0.2.3

- Published from GitHub Actions with an npm provenance statement (required for n8n verified community nodes). No functional changes. (0.2.1 and 0.2.2 were not published.)

## 0.2.0

- New **Output Format** field on every operation: **Raw** (default, X's JSON unchanged, same requests as before) or **Simple**, which sends `format=simple` and returns compact camelCase tweets, users, lists and communities in a `{data, nextCursor, previousCursor, hasNextPage}` envelope.
- **Return All** follows `nextCursor` for Simple responses and stops when `hasNextPage` is false.

## 0.1.0

- First version: User, Tweet, Search, List, Community and Trend operations, Direct and RapidAPI credentials, cursor pagination.
