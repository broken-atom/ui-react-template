import { z } from 'zod';

export type OBJECT_TYPE<T> = {
	[key: string]: T;
}

export type get_many_filters = {
	attribute: string,
	start_key?: string,
	end_key?: string,
	limit?: number,
	forward?: boolean,
	values?: string[]
}

export type tx_meta = {
	origin: string,
	operation: string
}

export type DEFAULT_RES_SINGLE<T> =
	{ success: false, code: number, errors: string[], data?: T, warnings?: string[] }
	| { success: true, code: number, data: T, warnings?: string[] };
export type DEFAULT_RES_SINGLE_P<T> = Promise<DEFAULT_RES_SINGLE<T>>;

export type DEFAULT_RES_ARR<T> =
	{ success: false, code: number, errors: string[], data?: T[], warnings?: string[] }
	| { success: true, code: number, data: T[], warnings?: string[] };

export type DEFAULT_RES_ARR_P<T> = Promise<DEFAULT_RES_ARR<T>>;

export const GEN_SINGLE_SUCCESS = <T>(code: number, data: T): DEFAULT_RES_SINGLE<T> => {
	return {
		success: true,
		code,
		data
	};
};

export const GEN_SINGLE_FAILURE = <T>(code: number, errors: string[], data?: T): DEFAULT_RES_SINGLE<T> => {
	return {
		success: false,
		code,
		errors,
		data
	};
};

export const GEN_ARR_SUCCESS = <T>(code: number, data: T[]): DEFAULT_RES_ARR<T> => {
	return {
		success: true,
		code,
		data
	};
};

export const GEN_ARR_FAILURE = <T>(code: number, errors: string[], data?: T[]): DEFAULT_RES_ARR<T> => {
	return {
		success: false,
		code,
		errors,
		data
	};
};


export type access = "PUBLIC" | "PRIVATE"
export type resource = "IMAGE" | "FILE"
export type ds_native_api = "QUERY" | "TRANSACT" | "PULL"
export type ds_extended_api = "CREATE_ONE" | "CREATE_MANY" | "GET_MANY" | "DELETE_ONE" | "GET_ONE" | "UPDATE_ONE" | "AGGREGATE" | "GET_USER_PROFILE"




export type basic_prop_type = 'serial' | 'text' | 'number' | 'date' | 'time' | 'datetime' | 'password' | 'color' | 'boolean' | 'url' | 'email' | 'description' | 'image' | 'file' | 'range.text' | 'range.number' | 'range.date' | 'range.time' | 'range.datetime' | 'any_one_of' | 'many_of'
export const basic_props: basic_prop_type[] = ['serial', 'text', 'number', 'date', 'time', 'datetime', 'password', 'color', 'boolean', 'url', 'email', 'description', 'image', 'file', 'range.text', 'range.number', 'range.date', 'range.time', 'range.datetime', 'any_one_of', 'many_of'];
export type system_prop_type = 'created_at' | 'created_by' | 'updated_at' | 'updated_by'
export const system_props: system_prop_type[] = ['created_at', 'created_by', 'updated_at', 'updated_by'];






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
	options: z.array(z.string()).optional(), // If the type is any_one_of or many_of, then this is the list of values
	is_required: z.boolean(),
	is_many: z.boolean(),
	is_unique: z.boolean(),
	is_range: z.boolean().optional(),
	is_json: z.boolean().optional(),
	is_searchable: z.boolean().optional(),
	is_indexable: z.boolean().optional(),
	is_relation: z.boolean().optional(),
	constraints: z.array(z.string()),
	derived_keys: z.object({
		expression: z.string(),
		conditions: z.array(z.string()).optional()
	}).optional(),
	documenation: z.string().optional(),
	relation_type: z.string().optional()

});

export const zod_middleware = z.object({
	pre: z.object({
		put_one: z.array(z.string()).optional(),
		put_many: z.array(z.string()).optional(),
		get_one: z.array(z.string()).optional(),
		get_many: z.array(z.string()).optional(),
		delete_one: z.array(z.string()).optional(),
		delete_many: z.array(z.string()).optional(),
		update_one: z.array(z.string()).optional(),
		update_many: z.array(z.string()).optional()
	}).optional(),
	post: z.object({
		put_one: z.array(z.string()).optional(),
		put_many: z.array(z.string()).optional(),
		get_one: z.array(z.string()).optional(),
		get_many: z.array(z.string()).optional(),
		delete_one: z.array(z.string()).optional(),
		delete_many: z.array(z.string()).optional(),
		update_one: z.array(z.string()).optional(),
		update_many: z.array(z.string()).optional()
	}).optional()
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
	documenation: z.string().optional(),
});

export const zod_api = z.object({
	app: z.any(),
	models: z.record(
		z.object({
			create: z.array(z.string()),
			read: z.array(z.string()),
			update: z.array(z.string()),
			delete: z.array(z.string())
		})
	)
});

export const zod_authz = z.object({
	app: z.object({
		role: z.record(
			z.array(zod_operation)
		),
		resource: z.array(z.any()),
		attribute: z.array(z.any()),
	}),
	models: z.record(
		z.object({
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
		})
	)
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
)

export const zod_db = z.union([ // Default is dynamodb
	z.object({
		type: z.literal('dynamodb')
	}),
	z.object({
		type: z.literal('datascript'),
		level: zod_datascript_level
	})
])

export const zod_app_store = z.object({
	id: z.string(),
	name: z.string(),
	logo_url: z.string(),
})

export const zod_apps_store = z.array(zod_app_store);

const zod_user_props = z.object({
	id: z.string(),
	name: z.string(),
	image_url: z.string(),
	role: z.string(),
	universe: z.number(),
	level: z.number(),
	app_id: z.string().optional(),
	scope: z.record(z.string()).optional(),
	created_at: z.number(),
	org: z.string().optional(),
	team: z.string().optional(),
	verified_at: z.number(),
	modified_at: z.number().optional()
})

export const zod_user_with_mobile = zod_user_props.extend({
	mobile: z.string(),
	email: z.string().email().optional()
});

export const zod_user_with_email = zod_user_props.extend({
	mobile: z.string().optional(),
	email: z.string().email()
});

export const zod_user = z.union([zod_user_with_email, zod_user_with_mobile]);

export const zod_login_response = z.object({
	response: z.string(),
	token: z.string(),
	user: zod_user
})

export const zod_user_acc = z.union([
	z.literal('free'),
	z.literal('standard'),
	z.literal('professional')
])

export const zod_subscribe_reccurence = z.union([
	z.literal('MONTHLY'),
	z.literal('YEARLY')
])

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
	ui: z.any(),
	creator: zod_user.optional(),
	favicon: z.string().optional(), // svg paste
	meta_name: z.string().optional(),
	meta_content: z.string().optional(),
	title: z.string().optional(),
	enable_otp_login: z.boolean().optional(),
});

export const zod_image_file = z.object({
	name: z.string(),
	type: z.string(),
	size: z.number(),
	url: z.string(),
});


export type operation_type = z.infer<typeof zod_operation>;
export type comparitive_type = z.infer<typeof zod_comparitive>;
export type model_prop_type = z.infer<typeof zod_model_prop>;
export type middleware_type = z.infer<typeof zod_middleware>;
export type model_type = z.infer<typeof zod_model>;
export type api_type = z.infer<typeof zod_api>;
export type authz_type = z.infer<typeof zod_authz>;
export type private_login_type = z.infer<typeof zod_private_login>;
export type public_login_type = z.infer<typeof zod_public_login>;
export type domain_login_type = z.infer<typeof zod_domain_login>;
export type login_type = z.infer<typeof zod_login>;
export type datascript_level_type = z.infer<typeof zod_datascript_level>;
export type db_type = z.infer<typeof zod_db>;
export type app_store_type = z.infer<typeof zod_app_store>;
export type apps_store_type = z.infer<typeof zod_apps_store>;
export type user_type = z.infer<typeof zod_user>;
export type login_response_type = z.infer<typeof zod_login_response>;
export type user_acc_type = z.infer<typeof zod_user_acc>;
export type subscribe_reccurence_type = z.infer<typeof zod_subscribe_reccurence>;
export type app_object_type = z.infer<typeof zod_app_object>;
export type image_file_type = z.infer<typeof zod_image_file>;

export default {};