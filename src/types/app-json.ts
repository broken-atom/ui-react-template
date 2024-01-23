import { z } from 'zod';
import { zod_user } from './app-user';

export const zod_operation = z.union([
	z.literal('create'),
	z.literal('read'),
	z.literal('update'),
	z.literal('delete')
]);

export const zod_comparitive = z.union([
	z.literal('eq'),
	z.literal('ne'),
	z.literal('gt'),
	z.literal('lt'),
	z.literal('ge'),
	z.literal('le')
]);

export const zod_model_prop = z.object({
	id: z.string(),
	prop_id: z.string(),
	name: z.string(),
	type: z.string(),
	created_at: z.number(),
	created_by: z.string(),
	updated_at: z.number(),
	updated_by: z.string(),
	options: z.array(z.string()).optional(), // If the type is any_one_of or many_of, then this is the list of values
	is_required: z.boolean(),
	is_many: z.boolean(),
	is_unique: z.boolean(),
	is_range: z.boolean().optional(),
	is_json: z.boolean().optional(),
	is_relation: z.boolean().optional(),
	is_searchable: z.boolean().optional(),
	is_indexable: z.boolean().optional(),
	constraints: z.string().optional(), // Array of constraints won't make sense since we can't really assume they are always ANDed or ORed
	derived_keys: z.object({
		expression: z.string(),
		conditions: z.array(z.string()).optional()
	}).optional(),
	documentation: z.string().optional()
});

export const zod_middleware_ops = z.object({
	put_one: z.array(z.string()).optional(),
	put_many: z.array(z.string()).optional(),
	get_one: z.array(z.string()).optional(),
	get_many: z.array(z.string()).optional(),
	delete_one: z.array(z.string()).optional(),
	delete_many: z.array(z.string()).optional(),
	update_one: z.array(z.string()).optional(),
	update_many: z.array(z.string()).optional()
});

export const zod_middleware = z.object({
	pre: zod_middleware_ops.optional(),
	post: zod_middleware_ops.optional()
});

export const zod_model = z.object({
	version: z.number(),
	name: z.string(),
	id: z.string(),
	ns: z.string(),
	hash_id: z.string(),
	primarykey: z.string(),
	source: z.string(),
	created_at: z.number(),
	created_by: z.string(),
	updated_at: z.number(),
	updated_by: z.string(),
	deployed_at: z.number(),
	props: z.array(zod_model_prop),
	middleware: zod_middleware.optional(),
	forward_to_queue: z.string().optional(),
	db: z.record(z.string()).optional(),
	documentation: z.string().optional()
});

export const zod_app_api = z.any();

export const zod_model_api = z.record(
	z.object({
		create: z.array(z.string()),
		read: z.array(z.string()),
		update: z.array(z.string()),
		delete: z.array(z.string())
	})
);

export const zod_api = z.object({
	app: zod_app_api,
	models: zod_model_api
});

export const zod_app_authz = z.object({
	role: z.record(
		z.array(zod_operation)
	),
	resource: z.array(z.object({
		rule: z.object({
			lhs: z.string(),
			condition: zod_comparitive,
			rhs: z.string()
		}),
		permissions: z.record(
			z.array(zod_operation)
		)
	})),
	attribute: z.array(z.any()),
});

export const zod_model_authz = z.record(zod_app_api);

export const zod_authz = z.object({
	app: zod_app_authz,
	models: zod_model_authz
});

export const zod_none_login = z.object({
	type: z.literal('none'),
});

export const zod_public_login = z.object({
	type: z.literal('public'),
	default_role: z.string()
});

export const zod_private_login = z.object({
	type: z.literal('private'),
});

export const zod_domain_login = z.object({
	type: z.literal('domain'),
	domains: z.array(z.object({
		name: z.string(),
		default_role: z.string()
	}))
});

export const zod_login = z.union([
	zod_none_login,
	zod_public_login,
	zod_private_login,
	zod_domain_login
]);

export const zod_datascript_level = z.tuple([
	z.literal('application')
]).rest(
	z.union([
		z.literal('user'),
		z.literal('entity')
	])
);

export const zod_db = z.union([ // Default is dynamodb
	z.object({
		type: z.literal('dynamodb')
	}),
	z.object({
		type: z.literal('datascript'),
		level: zod_datascript_level
	})
]);


export const zod_login_methods = z.object({
	email: z.boolean().optional(),
	otp: z.boolean().optional(),
	oauth: z.object({
		google: z.boolean().optional(),
		microsoft: z.boolean().optional(),
		github: z.boolean().optional(),
		linkedin: z.boolean().optional(),
		twitter: z.boolean().optional(),
		gitlab: z.boolean().optional(),
		facebook: z.boolean().optional(),
		instagram: z.boolean().optional(),
		apple: z.boolean().optional(),
		amazon: z.boolean().optional(),
		yahoo: z.boolean().optional(),
		wordpress: z.boolean().optional(),
		wordpresscom: z.boolean().optional(),
		tumblr: z.boolean().optional(),
		medium: z.boolean().optional(),
		pinterest: z.boolean().optional(),
		reddit: z.boolean().optional(),
		figma: z.boolean().optional(),
	}).optional(),
});

export const zod_browser_permissions = z.object({
	"Location": z.boolean().optional(),
	"Notifications": z.boolean().optional(),
	"Microphone": z.boolean().optional(),
	"Camera": z.boolean().optional(),
	"Sound": z.boolean().optional(),
});

export const zod_payment_details = z.object({
	key: z.string(),
	secret: z.string()
});

export const zod_app_object = z.object({
	version: z.number(),
	id: z.string(),
	name: z.string(),
	logo_url: z.string(),
	models: z.array(zod_model),
	apis: zod_api,
	authz: zod_authz,
	login: zod_login,
	db_type: zod_db,
	roles: z.array(z.string()),
	creator: zod_user.optional(),
	favicon: z.string().optional(), // svg paste
	meta_name: z.string().optional(),
	meta_content: z.string().optional(),
	title: z.string().optional(),
	login_methods: zod_login_methods.optional(),
	description: z.string().optional(),
	browser_permissions: zod_browser_permissions.optional(),
	payments: z.object({
		razorpay: zod_payment_details.optional(),
		stripe: zod_payment_details.optional(),
	}).optional(),
});




export type operation_type = z.infer<typeof zod_operation>;
export type comparitive_type = z.infer<typeof zod_comparitive>;
export type model_prop_type = z.infer<typeof zod_model_prop>;
export type middleware_ops_type = z.infer<typeof zod_middleware_ops>;
export type middleware_type = z.infer<typeof zod_middleware>;
export type model_type = z.infer<typeof zod_model>;
export type app_api_type = z.infer<typeof zod_app_api>;
export type model_api_type = z.infer<typeof zod_model_api>;
export type api_type = z.infer<typeof zod_api>;
export type app_authz_type = z.infer<typeof zod_app_authz>;
export type model_authz_type = z.infer<typeof zod_model_authz>;
export type authz_type = z.infer<typeof zod_authz>;
export type none_login_type = z.infer<typeof zod_none_login>;
export type private_login_type = z.infer<typeof zod_private_login>;
export type public_login_type = z.infer<typeof zod_public_login>;
export type domain_login_type = z.infer<typeof zod_domain_login>;
export type login_type = z.infer<typeof zod_login>;
export type datascript_level_type = z.infer<typeof zod_datascript_level>;
export type db_type = z.infer<typeof zod_db>;
export type login_methods_type = z.infer<typeof zod_login_methods>;
export type browser_permissions_type = z.infer<typeof zod_browser_permissions>;
export type payment_details_type = z.infer<typeof zod_payment_details>;
export type app_object_type = z.infer<typeof zod_app_object>;


export default {};