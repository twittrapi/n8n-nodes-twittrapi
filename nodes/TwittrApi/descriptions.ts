import {
	NodeOperationError,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeProperties,
	type INodePropertyOptions,
} from 'n8n-workflow';
import { ENDPOINTS, RESOURCES, type Endpoint, type EndpointParam } from './endpoints';
import { throwOnApiError } from './errors';
import { DEFAULT_MAX_PAGES, paginateByCursor } from './pagination';

const show = (ep: Endpoint, extra: Record<string, unknown[]> = {}) => ({
	show: { resource: [ep.resource], operation: [ep.operation], ...extra },
});

/** Expression that reads a parameter and cleans it for use in a URL path segment. */
function pathValueExpression(param: EndpointParam): string {
	let expr = `String($parameter["${param.name}"] ?? '').trim()`;
	if (param.stripAt) expr += `.replace(/^@/, '')`;
	return `encodeURIComponent(${expr})`;
}

/** Build the `url` expression for an endpoint from its path template. */
export function buildUrlExpression(ep: Endpoint): string {
	const url = ep.path.replace(/\{(\w+)\}/g, (_match, name: string) => {
		if (ep.userLookup && name === 'userId') {
			const byId = pathValueExpression({ name: 'userId' } as EndpointParam);
			return `{{ $parameter["userBy"] === 'username' ? '-1' : ${byId} }}`;
		}
		const param = ep.params.find((p) => p.name === name && p.in === 'path');
		if (!param) throw new Error(`Endpoint ${ep.path}: no path param named "${name}"`);
		return `{{ ${pathValueExpression(param)} }}`;
	});
	return url.includes('{{') ? `=${url}` : url;
}

/** Expression for a query value, applying the param's cleanup rules. */
function queryValueExpression(param: EndpointParam): string | undefined {
	if (param.csv) {
		return `={{ String($value).split(',').map((s) => s.trim()).filter((s) => s).join(',') }}`;
	}
	if (param.stripAt) return `={{ String($value).trim().replace(/^@/, '') }}`;
	if (param.type === 'string') return `={{ String($value).trim() }}`;
	return undefined;
}

/** preSend hook that rejects comma-separated lists longer than `maxItems`. */
function maxItemsCheck(param: EndpointParam) {
	return async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const raw = String(this.getNodeParameter(param.name, '') ?? '');
		const items = raw
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s);
		if (param.maxItems !== undefined && items.length > param.maxItems) {
			throw new NodeOperationError(
				this.getNode(),
				`${param.displayName}: at most ${param.maxItems} values per request (got ${items.length})`,
				{
					description:
						'Split the list into smaller batches, for example with the Loop Over Items node',
				},
			);
		}
		return requestOptions;
	};
}

function paramToProperty(
	ep: Endpoint,
	param: EndpointParam,
	inCollection: boolean,
): INodeProperties {
	const prop: INodeProperties = {
		displayName: param.displayName,
		name: param.name,
		type: param.type,
		default: param.default ?? (param.type === 'number' ? 0 : param.type === 'boolean' ? false : ''),
		description: param.description,
	};
	if (param.placeholder) prop.placeholder = param.placeholder;
	if (param.options) prop.options = param.options;
	if (param.minValue !== undefined || param.maxValue !== undefined) {
		prop.typeOptions = { minValue: param.minValue, maxValue: param.maxValue };
	}
	if (!inCollection) {
		prop.displayOptions = show(ep);
		if (param.required && param.type === 'string') prop.required = true;
	}
	if (param.in === 'query') {
		const value = queryValueExpression(param);
		prop.routing = {
			send: {
				type: 'query',
				property: param.apiName ?? param.name,
				...(value ? { value } : {}),
				...(param.maxItems !== undefined ? { preSend: [maxItemsCheck(param)] } : {}),
			},
		};
	}
	return prop;
}

function userLookupProperties(ep: Endpoint): INodeProperties[] {
	return [
		{
			displayName: 'Identify User By',
			name: 'userBy',
			type: 'options',
			options: [
				{ name: 'User ID', value: 'id' },
				{ name: 'Username', value: 'username' },
			],
			default: 'username',
			description: 'Whether to identify the user by numeric ID or by username',
			displayOptions: show(ep),
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'elonmusk',
			description: 'Username without or with a leading @',
			displayOptions: show(ep, { userBy: ['username'] }),
			routing: {
				send: {
					type: 'query',
					property: 'username',
					value: `={{ String($value).trim().replace(/^@/, '') }}`,
				},
			},
		},
	];
}

function paginationProperties(ep: Endpoint): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			hint: 'Follows the bottom cursor page by page until there are no more results or Max Pages is reached. Each page is one billed API call and one output item.',
			displayOptions: show(ep),
			routing: {
				send: {
					paginate: '={{ $value }}',
				},
				operations: {
					pagination: paginateByCursor,
				},
			},
		},
		{
			displayName: 'Max Pages',
			name: 'maxPages',
			type: 'number',
			default: DEFAULT_MAX_PAGES,
			typeOptions: { minValue: 1, maxValue: 1000 },
			description: 'Stop after this many pages (API calls) even if more results exist',
			displayOptions: show(ep, { returnAll: [true] }),
		},
	];
}

function optionsCollection(ep: Endpoint): INodeProperties | undefined {
	const options: INodeProperties[] = ep.params
		.filter((p) => !p.required)
		.map((p) => paramToProperty(ep, p, true));

	if (ep.paginated) {
		options.push(
			{
				displayName: 'Count',
				name: 'count',
				type: 'number',
				default: 20,
				typeOptions: { minValue: 1, maxValue: 100 },
				description:
					'Results requested per page. X treats this as a hint, so pages may contain fewer or more entries.',
				routing: { send: { type: 'query', property: 'count' } },
			},
			{
				displayName: 'Cursor',
				name: 'cursor',
				type: 'string',
				default: '',
				description:
					'Cursor from a previous response to continue from (the "value" of the entry with cursorType "Bottom"). Leave empty for the first page.',
				routing: {
					send: {
						type: 'query',
						property: 'cursor',
						value: '={{ String($value).trim() || undefined }}',
					},
				},
			},
		);
	}

	if (!options.length) return undefined;
	options.sort((a, b) => a.displayName.localeCompare(b.displayName));
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show(ep),
		options,
	};
}

function operationOption(ep: Endpoint): INodePropertyOptions {
	return {
		name: ep.name,
		value: ep.operation,
		action: ep.action,
		description: ep.description,
		routing: {
			request: {
				method: ep.method,
				url: buildUrlExpression(ep),
			},
			output: {
				postReceive: [throwOnApiError],
			},
		},
	};
}

export function buildProperties(): INodeProperties[] {
	const properties: INodeProperties[] = [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: RESOURCES.map(({ name, value, description }) => ({ name, value, description })),
			default: 'user',
		},
	];

	for (const resource of RESOURCES) {
		const endpoints = ENDPOINTS.filter((ep) => ep.resource === resource.value);
		if (!endpoints.length) continue;
		const defaultOperation = endpoints[0].operation;
		const options = endpoints.map(operationOption).sort((a, b) => a.name.localeCompare(b.name));
		properties.push({
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: [resource.value] } },
			options,
			default: defaultOperation,
		});
	}

	for (const ep of ENDPOINTS) {
		if (ep.userLookup) properties.push(...userLookupProperties(ep));
		for (const param of ep.params.filter((p) => p.required)) {
			const prop = paramToProperty(ep, param, false);
			if (ep.userLookup && param.name === 'userId') {
				prop.displayOptions = show(ep, { userBy: ['id'] });
			}
			properties.push(prop);
		}
		if (ep.paginated) properties.push(...paginationProperties(ep));
		const collection = optionsCollection(ep);
		if (collection) properties.push(collection);
	}

	return properties;
}
