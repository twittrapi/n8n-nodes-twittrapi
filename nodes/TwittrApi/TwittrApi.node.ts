import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { BASE_URL_EXPRESSION } from '../../credentials/TwittrApiApi.credentials';
import { buildProperties } from './descriptions';

export class TwittrApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TwittrAPI',
		name: 'twittrApi',
		icon: { light: 'file:../../icons/twittrapi.svg', dark: 'file:../../icons/twittrapi.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Read public X (Twitter) profiles, tweets, followers, search, lists, communities and trends via TwittrAPI',
		defaults: {
			name: 'TwittrAPI',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'twittrApiApi',
				required: true,
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
}
