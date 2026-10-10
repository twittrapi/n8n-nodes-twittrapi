import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export const DEFAULT_BASE_URL = 'https://api.twittrapi.com';
export const DEFAULT_RAPIDAPI_HOST = 'twitter-aio.p.rapidapi.com';

/**
 * Base URL expression shared by the credential test and the node.
 * Direct mode uses the configurable base URL, RapidAPI mode uses the RapidAPI host.
 */
export const BASE_URL_EXPRESSION =
	"={{ $credentials.apiType === 'rapidApi' ? 'https://' + String($credentials.rapidApiHost || '" +
	DEFAULT_RAPIDAPI_HOST +
	"').trim().replace(/^https?:\\/\\//, '').replace(/\\/+$/, '') : String($credentials.baseUrl || '" +
	DEFAULT_BASE_URL +
	"').trim().replace(/\\/+$/, '') }}";

export class TwittrApiApi implements ICredentialType {
	name = 'twittrApiApi';

	displayName = 'TwittrAPI API';

	icon: Icon = { light: 'file:../icons/twittrapi.svg', dark: 'file:../icons/twittrapi.dark.svg' };

	documentationUrl = 'https://www.twittrapi.com/docs';

	properties: INodeProperties[] = [
		{
			displayName: 'Connection Type',
			name: 'apiType',
			type: 'options',
			options: [
				{
					name: 'Direct API Key',
					value: 'direct',
					description: 'Use a key from the TwittrAPI dashboard (X-API-KEY header)',
				},
				{
					name: 'RapidAPI Key',
					value: 'rapidApi',
					description: 'Use your RapidAPI key for the TwittrAPI listing on RapidAPI',
				},
			],
			default: 'direct',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Direct mode: your TwittrAPI key. RapidAPI mode: your RapidAPI application key (X-RapidAPI-Key).',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: DEFAULT_BASE_URL,
			description: 'Only change this if you were given a different API host',
			displayOptions: {
				show: {
					apiType: ['direct'],
				},
			},
		},
		{
			displayName: 'RapidAPI Host',
			name: 'rapidApiHost',
			type: 'string',
			default: DEFAULT_RAPIDAPI_HOST,
			description: 'Value of the X-RapidAPI-Host header',
			displayOptions: {
				show: {
					apiType: ['rapidApi'],
				},
			},
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const headers = { ...(requestOptions.headers ?? {}) };
		const apiKey = String(credentials.apiKey ?? '').trim();
		if (credentials.apiType === 'rapidApi') {
			const host = String(credentials.rapidApiHost || DEFAULT_RAPIDAPI_HOST)
				.trim()
				.replace(/^https?:\/\//, '')
				.replace(/\/+$/, '');
			headers['x-rapidapi-key'] = apiKey;
			headers['x-rapidapi-host'] = host;
		} else {
			headers['X-API-KEY'] = apiKey;
		}
		return { ...requestOptions, headers };
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: BASE_URL_EXPRESSION,
			url: '/user/by/username/X',
			method: 'GET',
		},
	};
}
