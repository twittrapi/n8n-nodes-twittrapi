import {
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type JsonObject,
} from 'n8n-workflow';

const HINTS: Record<number, string> = {
	400: 'The API rejected the request. Check the IDs, usernames or query you passed.',
	401: 'Check the API key and the connection type (Direct or RapidAPI) in the credential. For Account operations, the X session cookie may be logged out: copy a fresh one into the X Session credential.',
	402: 'Your TwittrAPI balance is empty. Top up your account, then run the node again.',
	403: 'The key is not allowed to use this endpoint, or the content is not available.',
	404: 'Nothing was found for the given ID or username.',
	407: 'The proxy in the X Session credential could not be reached.',
	422: 'One of the parameters has an invalid format (for example a non-numeric ID).',
	429: 'Rate limit reached. Wait a moment, or enable "Retry On Fail" in the node settings.',
};

/** Pull a readable message out of an error body such as {"error": "..."}. */
export function apiErrorMessage(body: unknown): string | undefined {
	if (typeof body === 'string') return body.trim() ? body.trim().slice(0, 500) : undefined;
	if (!body || typeof body !== 'object') return undefined;
	const b = body as IDataObject;
	for (const key of ['error', 'message', 'detail']) {
		const v = b[key];
		if (typeof v === 'string' && v) return v;
		if (v && typeof v === 'object' && typeof (v as IDataObject).message === 'string') {
			return (v as IDataObject).message as string;
		}
	}
	return undefined;
}

/**
 * postReceive hook for every operation. Requests run with
 * ignoreHttpStatusErrors, so 4xx/5xx land here and are turned into an
 * error that shows the API's own message plus a hint.
 */
export async function throwOnApiError(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const status = Number(response.statusCode);
	if (!status || status < 400) return items;

	const apiMessage = apiErrorMessage(response.body);
	const hint =
		HINTS[status] ??
		(status >= 500 ? 'The API had a temporary problem. Try again shortly.' : undefined);
	const errorBody: JsonObject =
		response.body && typeof response.body === 'object'
			? (response.body as JsonObject)
			: { error: String(response.body ?? '') };

	throw new NodeApiError(this.getNode(), errorBody, {
		message: `TwittrAPI error ${status}${apiMessage ? `: ${apiMessage}` : ''}`,
		description: hint,
		httpCode: String(status),
	});
}
