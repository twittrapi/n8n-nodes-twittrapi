import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { BASE_URL_EXPRESSION } from '../../credentials/TwittrApiApi.credentials';
import { buildProperties } from './descriptions';
import { xSessionTest } from './xSession';

export class TwittrApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TwittrAPI',
		name: 'twittrApi',
		icon: { light: 'file:../../icons/twittrapi.svg', dark: 'file:../../icons/twittrapi.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Read public X (Twitter) data and act on your own X account (post, like, follow, DMs) via TwittrAPI',
		defaults: {
			name: 'TwittrAPI',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		// Two credentials: the API key authenticates every request (selected by the
		// hidden "authentication" parameter), the X session is only for the Account
		// resource and is added to the body (xSession.ts).
		credentials: [
			{
				name: 'twittrApiApi',
				required: true,
				displayOptions: { show: { authentication: ['twittrApiApi'] } },
			},
			{
				name: 'twittrApiXSessionApi',
				required: true,
				testedBy: 'xSessionTest',
				displayOptions: { show: { resource: ['account'] } },
			},
		],
		requestDefaults: {
			baseURL: BASE_URL_EXPRESSION,
			headers: {
				Accept: 'application/json',
			},
			// Errors are handled in errors.ts so the API's message is shown.
			ignoreHttpStatusErrors: true,
		},
		properties: buildProperties(),
	};

	methods = {
		credentialTest: { xSessionTest },
	};
}
