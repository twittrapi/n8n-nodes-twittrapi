import type { ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

/**
 * Your own X session for the Account operations (post, like, follow, DMs, ...).
 * Kept apart from the API key so the cookie and proxy are stored encrypted like
 * any credential and never appear as node parameters. The node adds them to the
 * request body (see nodes/TwittrApi/xSession.ts). The credential test checks the
 * format locally (testedBy in the node); it makes no request to X.
 */
export class TwittrApiXSessionApi implements ICredentialType {
	name = 'twittrApiXSessionApi';

	displayName = 'TwittrAPI X Session API';

	icon: Icon = { light: 'file:../icons/twittrapi.svg', dark: 'file:../icons/twittrapi.dark.svg' };

	documentationUrl = 'https://twittrapi.com/docs/x-session';

	properties: INodeProperties[] = [
		// The value is a secret (session cookie, proxy credentials, passcode) and must stay hidden.
		// eslint-disable-next-line @n8n/community-nodes/credential-unnecessary-password
		{
			displayName: 'Cookie',
			name: 'cookie',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'auth_token=...; ct0=...; twid=u%3D...',
			description:
				'Cookie of your own logged-in x.com session. Must contain auth_token and ct0; direct messages also need twid. See https://twittrapi.com/docs/x-session.',
		},
		// The value is a secret (session cookie, proxy credentials, passcode) and must stay hidden.
		// eslint-disable-next-line @n8n/community-nodes/credential-unnecessary-password
		{
			displayName: 'Proxy',
			name: 'proxy',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'http://user:pass@host:port',
			description: 'Your proxy. The requests to X go out through it.',
		},
		// The value is a secret (session cookie, proxy credentials, passcode) and must stay hidden.
		// eslint-disable-next-line @n8n/community-nodes/credential-unnecessary-password
		{
			displayName: 'X Chat Passcode',
			name: 'chatPasscode',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Optional. Your X Chat passcode, needed to send direct messages and to read message text in the inbox.',
		},
	];
}
