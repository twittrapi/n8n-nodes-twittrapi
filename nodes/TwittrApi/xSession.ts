import {
	NodeOperationError,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeCredentialTestResult,
} from 'n8n-workflow';

export const X_SESSION_CREDENTIAL = 'twittrApiXSessionApi';

/**
 * preSend hook of the Account operations: adds cookie and proxy from the
 * "TwittrAPI X Session" credential to the JSON body, and the X Chat passcode
 * for direct messages. The values never become node parameters.
 */
export async function addXSession(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const credentials = await this.getCredentials(X_SESSION_CREDENTIAL);
	const cookie = String(credentials.cookie ?? '').trim();
	const proxy = String(credentials.proxy ?? '').trim();
	if (!cookie || !proxy) {
		throw new NodeOperationError(
			this.getNode(),
			'The X session credential needs a cookie and a proxy',
			{
				description: 'See https://twittrapi.com/docs/x-session',
			},
		);
	}
	const body: IDataObject = {
		...((requestOptions.body as IDataObject | undefined) ?? {}),
		cookie,
		proxy,
	};
	const passcode = String(credentials.chatPasscode ?? '').trim();
	if (passcode && String(requestOptions.url ?? '').startsWith('/client/dm/'))
		body.passcode = passcode;
	return { ...requestOptions, body };
}

/** Checks cookie and proxy format. Returns an error message, or undefined when both look valid. */
export function checkXSession(data: IDataObject | undefined): string | undefined {
	const cookie = String(data?.cookie ?? '').trim();
	const proxy = String(data?.proxy ?? '').trim();
	if (!/(?:^|;\s*)auth_token=[^;\s]+/.test(cookie) || !/(?:^|;\s*)ct0=[^;\s]+/.test(cookie)) {
		return 'The cookie must contain auth_token and ct0 (copy it from a logged-in x.com session)';
	}
	let url: URL | undefined;
	try {
		url = new URL(proxy);
	} catch {
		url = undefined;
	}
	if (!url || !/^https?:$/.test(url.protocol) || !url.hostname) {
		return 'The proxy must look like http://user:pass@host:port';
	}
	return undefined;
}

/**
 * Credential test for the X session (methods.credentialTest of the node). It
 * checks the format only and makes no request, so testing is free and does
 * not touch the X account. Whether X accepts the session shows on the first
 * Account operation.
 */
export async function xSessionTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const message = checkXSession(credential.data);
	return message
		? { status: 'Error', message }
		: { status: 'OK', message: 'Cookie and proxy look valid' };
}
