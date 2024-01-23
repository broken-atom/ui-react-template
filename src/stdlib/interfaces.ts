import { z } from "zod";
import { app_object_type, user_type, OBJECT_TYPE, get_many_filters, DEFAULT_RES_SINGLE_P, DEFAULT_RES_ARR_P, access } from "./types";
import type { BehaviorSubject } from "rxjs"
export interface utils {
    ulid: () => string,
    findex: any,
    nanoid: (size?: number) => string,
    nanoid_al: (size?: number) => string,
    feedback: (text: string, type?: "log" | "error" | "warn" | "success", timer?: number) => void
}

// Data in get_many: {id: string, filters?:{attribute: string, value: string}}

export interface entity_api {
    put_one: (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>) => DEFAULT_RES_SINGLE_P<any>,
    get_one: (app_id: string, model_id: string, token: string, filter: { attribute: string, value: string }) => DEFAULT_RES_SINGLE_P<any>, // In filter, all unqiue keys are allowed as attribute and their value can be used to filter with lsi
    update_one: (app_id: string, model_id: string, token: string, data: { id: string, add: OBJECT_TYPE<any>, delete: OBJECT_TYPE<any> }) => DEFAULT_RES_SINGLE_P<any>,
    delete_one: (app_id: string, model_id: string, token: string, data: { id: string }) => DEFAULT_RES_SINGLE_P<any>,
    put_many: (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>[]) => DEFAULT_RES_ARR_P<any>,
    get_many: (app_id: string, model_id: string, token: string, filters?: get_many_filters) => DEFAULT_RES_ARR_P<any>,
    update_many: (app_id: string, model_id: string, token: string, data: { id: string, add: OBJECT_TYPE<any>, delete: OBJECT_TYPE<any> }[]) => DEFAULT_RES_ARR_P<any>,
    delete_many: (app_id: string, model_id: string, token: string, data: { id: string }[]) => DEFAULT_RES_ARR_P<any>
}

export interface file_api_data {
    file: File,
    name: string,
    uid: string
}

export interface file_api {
    put_one: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: file_api_data) => DEFAULT_RES_SINGLE_P<{ message: string, url: string }>,
    get_one: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uid: string) => DEFAULT_RES_SINGLE_P<{ message: string, url: string }>,
    update_one: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: file_api_data) => DEFAULT_RES_SINGLE_P<{ message: string, url: string }>,
    delete_one: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uid: string) => DEFAULT_RES_SINGLE_P<{ message: string }>,
    put_many: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: file_api_data[]) => DEFAULT_RES_ARR_P<{ message: string, url: string }>,
    get_many: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uids: string[]) => DEFAULT_RES_ARR_P<{ message: string, url: string }>,
    update_many: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: file_api_data[]) => DEFAULT_RES_ARR_P<{ message: string, url: string }>,
    delete_many: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uids: string[]) => DEFAULT_RES_ARR_P<{ message: string }>,
    get_valid_url: (canonical_url: string) => Promise<string | undefined>
}

export interface image_api_data {
    image: File | string, // Can be image or base64 string
    name: string,
    uid: string
}

export interface image_api {
    put_one: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: image_api_data) => DEFAULT_RES_SINGLE_P<{ message: string, url: string, variants: string[] }>,
    get_one: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uid: string) => DEFAULT_RES_SINGLE_P<{ message: string, url: string }>,
    update_one: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: image_api_data) => DEFAULT_RES_SINGLE_P<{ message: string, url: string, variants: string[] }>,
    delete_one: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uid: string) => DEFAULT_RES_SINGLE_P<{ message: string }>,
    put_many: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: image_api_data[]) => DEFAULT_RES_ARR_P<{ message: string, url: string, variants: string[] }>,
    get_many: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uids: string[]) => DEFAULT_RES_ARR_P<{ message: string, url: string }>,
    update_many: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: image_api_data[]) => DEFAULT_RES_ARR_P<{ message: string, url: string, variants: string[] }>,
    delete_many: (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uids: string[]) => DEFAULT_RES_ARR_P<{ message: string }>
}

export interface sort {
    attr: string,
    order: "ASC" | "DESC"
}



export interface pagination_cond {
    attr: string,
    order: "ASC" | "DESC",
    curr_val: any,
    id: any
}

export interface datascript_query_params {
    sort?: sort,
    filters?: filter[],
    limit?: number,
    pagination_cond?: pagination_cond
}

export const z_sort = z.object({
    attr: z.string(),
    order : z.union([z.literal("ASC"), z.literal("DESC")])
} )

export const z_filters = z.object({
    attr    :   z.string(),
    val     :   z.any(),
    op      :   z.union([z.literal("gt"), z.literal("lt"), z.literal("eq"), z.literal("geq"), z.literal("leq"), z.literal("neq"), z.literal("match") ])
})

export const z_pagination = z.object({
    attr: z.string(), 
    order : z.union([z.literal("ASC"), z.literal("DESC")]),
    curr_val: z.any(),
    id : z.any()

})

export const  z_query_obj = z.object({
    sort    :   z_sort.optional(),
    filters :   z.array(z_filters).optional(),
    limit   :   z.number().max(50).optional(),
    pagination_cond: z_pagination.optional()
})

export const base_query = z.object({
    __meta      :  z_query_obj.optional(),
    __map       :  z.record(z.string(), z.string()).optional(),
    __find      :  z.object({id: z.union([z.string(), z.number()])}).array().optional()
});

export type q = z.infer<typeof base_query>&{
    [key: string]: q
}

export const z_q: z.ZodType<q>  = base_query.catchall(z.lazy(() => z_q))

export type filter = z.infer<typeof z_filters>;

export type query_obj = z.infer<typeof base_query> & {
    [key: string] : query_obj
};

export const query_obj_schema: z.ZodType<query_obj> = base_query.catchall(z.lazy(() => z_q));
export type query_obj_type = z.infer<typeof query_obj_schema>;

export const z_patch_type = z.object({
    op : z.union([z.literal("replace"), z.literal("add"), z.literal("remove"),z.literal("test")  ]),
    path : z.string(),
    value : z.any()
})
export type t_update_patch = z.infer<typeof z_patch_type>


export interface datascript_api {
    query: (app_id: string, model_id: string, token: string, query: string, entity_id?: string) => DEFAULT_RES_ARR_P<any>,
    transact: (app_id: string, model_id: string, token: string, tx: any[], entity_id?: string) => DEFAULT_RES_ARR_P<any>,
    pull: (app_id: string, model_id: string, token: string, query: string, _id: number, entity_id?: string) => DEFAULT_RES_SINGLE_P<any>,
    create_one: (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>) => DEFAULT_RES_SINGLE_P<any>,
    create_many: (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>[]) => DEFAULT_RES_ARR_P<any>,
    get_many: (app_id: string, model_id: string, token: string, params: query_obj_type) => DEFAULT_RES_ARR_P<any>,
    delete_one: (app_id: string, model_id: string, token: string, id: string) => DEFAULT_RES_SINGLE_P<any>,
    get_one: (app_id: string, model_id: string, token: string, id: string) => DEFAULT_RES_SINGLE_P<any>,
    // update_one: (app_id: string, model_id: string, token: string, data: { id: string, add: OBJECT_TYPE<any>, delete: OBJECT_TYPE<any> }) => DEFAULT_RES_SINGLE_P<any>,
    update_one: (app_id: string, model_id: string, token: string, data: { id: string, patches: t_update_patch[] }) => DEFAULT_RES_SINGLE_P<any>,
    
    aggregate: (app_id: string, model_id: string, token: string, options: OBJECT_TYPE<any>) => DEFAULT_RES_ARR_P<any>,
    get_user_profile: (app_id: string, model_id: string, token: string) => DEFAULT_RES_SINGLE_P<any>,
    // remove_recursively: () => DEFAULT_RES_SINGLE_P<any>
}

export interface api {
    entity: entity_api,
    file: file_api,
    image: image_api,
    datascript: datascript_api
}

export interface auth {
    token: string | null,
    user: user_type | null,
    login: (email: string, app_id: string, role?: string) => DEFAULT_RES_SINGLE_P<any>,
    otp: {
        create: (phone_number: string, app_name: string, app_id: string, role?: string) => DEFAULT_RES_SINGLE_P<any>,
        verify: (phone_number: string, otp: string, hash: string, app_id: string, role?: string) => DEFAULT_RES_SINGLE_P<any>,
    }
    logout: (app_id: string) => void,
    signup: () => any,
    verify_token: () => any,
    refresh_token: () => any,
    oauth: {
        google: {
            login: (app_id: string, role?: string) => any,
        },
        microsoft: {
            login: (app_id: string, role?: string) => any,
        },
        linkedin: {
            login: (app_id: string, role?: string) => any,
        },
        github: {
            login: (app_id: string, role?: string) => any,
        },
        twitter: {
            login: (app_id: string, role?: string) => any,
        },
    }
}

export interface offline {
    api: api,
    auth: auth,
    app: app_object_type | null,
    ds: {
        datascript: any,
        db: any,
        clear_entities: () => void,
    }
}

export interface online {
    api: api,
    auth: auth,
    app?: app_object_type,
}

export default {};