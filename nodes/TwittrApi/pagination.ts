import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

export const DEFAULT_MAX_PAGES = 10;

/** Walk every nested object/array once (iterative, depth-limited). */
function walk(root: unknown, visit: (obj: Record<string, unknown>) => void, maxDepth = 64): void {
	const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];
	while (stack.length) {
		const { value, depth } = stack.pop()!;
		if (value === null || typeof value !== 'object' || depth > maxDepth) continue;
		if (Array.isArray(value)) {
			for (let i = value.length - 1; i >= 0; i--) stack.push({ value: value[i], depth: depth + 1 });
			continue;
		}
		const obj = value as Record<string, unknown>;
		visit(obj);
		for (const key of Object.keys(obj)) stack.push({ value: obj[key], depth: depth + 1 });
	}
}

/**
 * Find the "next page" cursor in a raw X GraphQL response.
 *
 * Handles timeline cursors (`{ cursorType: "Bottom", value }`, also inside
 * TimelineReplaceEntry instructions), entries named `cursor-bottom-*`, and
 * slice-style responses (`slice_info.next_cursor`, e.g. community search,
 * community members, job search). A next_cursor of "0" means "no more pages".
 * Top cursors are never returned.
 */
export function extractBottomCursor(data: unknown): string | undefined {
	let found: string | undefined;
	walk(data, (obj) => {
		if (found !== undefined) return;
		if (obj.cursorType === 'Bottom' && typeof obj.value === 'string' && obj.value) {
			found = obj.value;
			return;
		}
		if (
			typeof obj.entryId === 'string' &&
			obj.entryId.startsWith('cursor-bottom') &&
			obj.content &&
			typeof (obj.content as IDataObject).value === 'string'
		) {
			found = (obj.content as IDataObject).value as string;
			return;
		}
		const slice = obj.slice_info as IDataObject | undefined;
		if (
			slice &&
			typeof slice === 'object' &&
			typeof slice.next_cursor === 'string' &&
			slice.next_cursor &&
			slice.next_cursor !== '0'
		) {
			found = slice.next_cursor;
		}
	});
	return found;
}

/**
 * Count the content entries (tweets, users, modules) in a page, ignoring
 * cursor entries. X keeps returning a bottom cursor on empty pages, so an
 * empty page is the signal to stop.
 */
export function countContentEntries(data: unknown): number {
	let count = 0;
	walk(data, (obj) => {
		if (typeof obj.entryId === 'string' && !obj.entryId.startsWith('cursor-')) count++;
		if (obj.slice_info && Array.isArray(obj.items_results)) count += obj.items_results.length;
		else if (obj.slice_info && Array.isArray(obj.items)) count += obj.items.length;
	});
	return count;
}

/**
 * Whether `data` is a page in the simple format (format=simple):
 * `{ data: [...], nextCursor, previousCursor, hasNextPage }`.
 */
export function isSimplePage(data: unknown): data is {
	data: unknown[];
	nextCursor: string | null;
	hasNextPage: boolean;
} {
	if (data === null || typeof data !== 'object' || Array.isArray(data)) return false;
	const obj = data as IDataObject;
	return typeof obj.hasNextPage === 'boolean' && Array.isArray(obj.data);
}

/**
 * Decide whether to fetch another page after receiving `data`.
 * Returns the cursor to use, or undefined to stop.
 *
 * Simple-format pages carry the answer themselves: nextCursor is null and
 * hasNextPage false on the last page.
 */
export function nextCursor(data: unknown, previousCursors: Set<string>): string | undefined {
	if (isSimplePage(data)) {
		const cursor = data.nextCursor;
		if (!data.hasNextPage || data.data.length === 0) return undefined;
		if (typeof cursor !== 'string' || !cursor || previousCursors.has(cursor)) return undefined;
		return cursor;
	}
	if (countContentEntries(data) === 0) return undefined;
	const cursor = extractBottomCursor(data);
	if (!cursor || previousCursors.has(cursor)) return undefined;
	return cursor;
}

/**
 * Declarative pagination handler used when "Return All" is on.
 * Requests pages until there is no new bottom cursor, a page is empty,
 * or "Max Pages" is reached. Each page is returned as one item.
 * The cursor goes in the query, or in the JSON body for POST requests.
 */
export async function paginateByCursor(
	this: IExecutePaginationFunctions,
	requestOptions: DeclarativeRestApiSettings.ResultOptions,
): Promise<INodeExecutionData[]> {
	const maxPagesRaw = Number(this.getNodeParameter('maxPages', DEFAULT_MAX_PAGES));
	const maxPages =
		Number.isFinite(maxPagesRaw) && maxPagesRaw > 0 ? Math.floor(maxPagesRaw) : DEFAULT_MAX_PAGES;

	const field = requestOptions.options.method === 'POST' ? 'body' : 'qs';
	const results: INodeExecutionData[] = [];
	const seen = new Set<string>();
	const startCursor = (requestOptions.options[field] as IDataObject | undefined)?.cursor;
	if (typeof startCursor === 'string' && startCursor) seen.add(startCursor);

	let cursor: string | undefined = typeof startCursor === 'string' ? startCursor : undefined;
	for (let page = 0; page < maxPages; page++) {
		const params: IDataObject = { ...((requestOptions.options[field] as IDataObject) ?? {}) };
		if (cursor) params.cursor = cursor;
		else delete params.cursor;

		const pageItems = await this.makeRoutingRequest({
			...requestOptions,
			options: { ...requestOptions.options, [field]: params },
		});
		results.push(...pageItems);

		const last = pageItems[pageItems.length - 1];
		cursor = last ? nextCursor(last.json, seen) : undefined;
		if (!cursor) break;
		seen.add(cursor);
	}
	return results;
}
