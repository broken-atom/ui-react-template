import { create_schema, pull_DS, pull_with_unique_id_DS, query_DS, transact_DS } from "../../db/datascript";
import { datascript_query_params, filter, query_obj_type, sort, t_update_patch } from "../../interfaces";
import { DEFAULT_RES_ARR_P, DEFAULT_RES_SINGLE, DEFAULT_RES_SINGLE_P, OBJECT_TYPE, app_object_type, authz_type, user_type, zod_user } from "../../types";
import { check_authorisation, get_entity_id_with_pk } from "./utils";
import { validate_data_with_model, zod_type_from_prop } from "./data-validation";
import {  add_reqd_props_to_all_entities, add_reqd_props_to_entity, apply_js_filters, create_relation, create_relation_for_patches, entities_to_tx, entity_to_tx, generate_aggregate_ds_query, generate_ds_query, get_entity_from_entity_id_if_relation, get_prev_meta_for_entity, limit_data, map_data, parse_entities, patches_to_tx, query_for_props, sort_data, tuples_to_obj, update_arr_from_meta, update_meta_for_entity } from "./datascript-utils";


const authorize_user = (app_id: string, model_id: string,  token: string, op: "create"|"read"|"delete"|"update",  errors: string[]): DEFAULT_RES_SINGLE<{app: app_object_type, user: user_type}> => {
    const app = window.broken.offline?.app.getValue();
    if (!app) {
        errors.push(`App object not found for ID: ${app_id}`);
        return {
            success: false,
            code: 1071,
            errors
        }
    }

    if (!token) {
        errors.push("Token is not provided in the request for create_one");
        return {
            success: false,
            code: 1019,
            errors
        }
    }

    const authz: authz_type = app.authz;

    let t: any = {};
    try {
        t = JSON.parse(token);
    }
    catch (error) {
        errors.push(`Error in parsing token in create_one ${token}`);
        return {
            success: false,
            code: 2000,
            errors
        }
    }

    const parsed_user = zod_user.safeParse(t);

    if (!parsed_user.success) {
        errors.push(parsed_user.error.toString());
        return {
            success: false,
            code: 1092,
            errors
        }
    }

    const user: user_type = parsed_user.data;

    const auth_check = check_authorisation(app_id, model_id, authz, user, op);

    if (!auth_check.success) {
        errors.push(...auth_check.errors);
        return {
            success: false,
            code: 1011,
            errors
        }
    }

    return {success: true, data: {app, user}, code: 200}
}

export const query = async (app_id: string, model_id: string, token: string, query: string, entity_id?: string): DEFAULT_RES_SINGLE_P<any> => {
    const errors: string[] = [];
    const auth_check = authorize_user(app_id, model_id, token, "read", errors);
    if(!auth_check.success) return auth_check;
    const {app, user} = auth_check.data;

    const model = app.models.find((i: any) => i.id === model_id);

    if (!model) {
        errors.push(`Model is not found in the app for given ID ${model_id}`);
        return {
            success: false,
            code: 1072,
            errors
        }
    }

    const res = query_DS(query, errors);
    if (!res) return {
        success: false,
        code: 1048,
        errors: ["Error in querying ds in get_one_entity_helper. Response undefined."]
    }

    if (!res.success) return {
        success: false,
        code: res.code,
        errors: [
            "Error in querying db for datascript api",
            ...res.errors
        ]
    }

    return {
        success: true,
        code: 200,
        data: res.data
    }
}

export const transact = async (app_id: string, model_id: string, token: string, tx: any[], entity_id?: string): DEFAULT_RES_SINGLE_P<any> => {
    const errors: string[] = [];

    const auth_check = authorize_user(app_id, model_id, token, "create", errors);
    if(!auth_check.success) return auth_check;
    const {app, user} = auth_check.data;

    const model = app.models.find((i: any) => i.id === model_id);

    if (!model) {
        errors.push(`Model is not found in the app for given ID ${model_id}`);
        return {
            success: false,
            code: 1072,
            errors
        }
    }
    const r = transact_DS(tx, {
        origin: 'datascript_api',
        operation: 'transact',
    }, errors);
    if(!r.success){
        errors.push("Error in transacting db for datascript api");
        return {success: false, errors,code:  r.code}
    }
    return {
        success: true,
        code: 200,
        data: []
    }
}

export const pull = async (app_id: string, model_id: string, token: string, query: string, _id: number, entity_id?: string): DEFAULT_RES_SINGLE_P<any> => {
    const errors: string[] = [];
    const auth_check = authorize_user(app_id, model_id, token, "read", errors);
    if(!auth_check.success) return auth_check;
    const {app, user} = auth_check.data;

    const model = app.models.find((i: any) => i.id === model_id);

    if (!model) {
        errors.push(`Model is not found in the app for given ID ${model_id}`);
        return {
            success: false,
            code: 1072,
            errors
        }
    }

    const res = pull_DS(query, _id);
    if (!res) return {
        success: false,
        code: 1044,
        errors: ["Error in pulling ds in get_one_entity_helper. Response undefined."]
    }

    if (!res.success) return {
        success: false,
        code: res.code,
        errors: [
            "Error in pulling db for datascript api",
            ...res.errors
        ]
    }

    if (Object.keys(res.data).length < 2) {
        return {
            success: false,
            code: 1045,
            errors: [`Reference ID ${_id} for pull doesn't exist in db`]
        }
    }

    return {
        success: true,
        code: 200,
        data: res.data
    }
}

export const create_one = async (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>): DEFAULT_RES_SINGLE_P<any> => {
    
    const errors: string[] = [];
    const auth_check = authorize_user(app_id, model_id, token, "create", errors);
    if(!auth_check.success) return auth_check;
    const {app, user} = auth_check.data;
    
    const model = app.models.find((i: any) => i.id === model_id);

    if (!model) {
        errors.push(`Model is not found in the app ${app_id} for given ID ${model_id}`);
        return {
            success: false,
            code: 1072,
            errors
        }
    }

    let res_for_tx: OBJECT_TYPE<any>|null = null;

    const add_props = add_reqd_props_to_entity(data, user);
    if(add_props){
        res_for_tx = [{id: add_props}]
    }

    const r_val         =   validate_data_with_model(model, data, errors, false, false);
    if (!r_val.success) return r_val;
    const cr_rel        =   create_relation(user, app, model, data, errors);
    if (!cr_rel.success) return cr_rel;

    const tx    =   entity_to_tx(model_id, data).tx_arr;
    const r     =   transact_DS(tx, {origin: 'create_one_datascript',operation: 'create_one',}, errors);
    if(!r.success){
        errors.push(" error while create one");
        return {success: false, errors, code: r.code};
    }
    if(!res_for_tx) res_for_tx = [{ operation: "create_one", status: "successful" }];
    return {
        success: true,
        code: 200,
        data: res_for_tx
    }
}

export const create_many = async (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>[]): DEFAULT_RES_SINGLE_P<any> => {

    const errors: string[] = [];
    const auth_check = authorize_user(app_id, model_id, token, "create", errors);
    if(!auth_check.success) return auth_check;
    const {app, user} = auth_check.data;
   

    const model = app.models.find((i: any) => i.id === model_id);

    if (!model) {
        errors.push(`Model is not found in the app ${app_id} for given ID ${model_id}`);
        return {
            success: false,
            code: 1072,
            errors
        }
    }


    add_reqd_props_to_all_entities(data, user);
    const v = validate_data_with_model(model, data, errors, true, false);
    if (!v.success) return v;

    for (let each_data of data) {
        const cr_rel        =   create_relation(user, app, model, each_data, errors);
        if (!cr_rel.success) return cr_rel;
    }

    const tx = entities_to_tx(model_id, data).tx_arr
    const r = transact_DS(tx, {origin: 'create_many_datascript',operation: 'create_many'}, errors);
    if(!r.success){
        errors.push("Error in creating data in datascript for create_many");
        return {success: false, errors, code: r.code};
    }
    return {
        success: true,
        code: 200,
        data: [{ operation: "create_many", status: "successful" }]
    }
}

export const get_many = async (app_id: string, model_id: string, token: string, params: query_obj_type): DEFAULT_RES_SINGLE_P<any> => {
    
    const errors: string[] = [];
    const auth_check = authorize_user(app_id, model_id, token, "read", errors);
    if(!auth_check.success) return auth_check;
    const {app, user} = auth_check.data;

    

    const model = app.models.find((i: any) => i.id === model_id);

    if (!model) {
        errors.push(`Model is not found in the app for given ID ${model_id}`);
        return {
            success: false,
            code: 1072,
            errors
        }
    }

    let sort                =   params.__meta?.sort || {order:"DESC", attr: "created_at"};
    const filters           =   params.__meta?.filters    ||  [];
    const limit             =   params.__meta?.limit      ||  50;
    const pagination_cond   =   params.__meta?.pagination_cond
    const __find            =   params.__find;
    
    const query = generate_ds_query(app, model, filters , pagination_cond);
    const res = query_DS(query, errors);

    if (!res.success) return {
        success: false,
        code: res.code,
        errors: [
            "Error in querying db for datascript api ",
            ...res.errors
        ]
    }

    
    const schema        =   create_schema(app.models);
    let entities        =   tuples_to_obj(res.data, schema);
    entities            =   await parse_entities(model, entities);
    entities            =   apply_js_filters(entities, filters );
    entities            =   sort_data(entities, sort);
    entities            =   limit_data(entities, limit);

    if(__find){
        let ids = __find.map(o => o.id);
        if(ids.length){
            const q = generate_ds_query(app, model, [{attr: "id", op: "eq", val: ids}], undefined);
            const tuples        =   query_DS(q, errors);
            if(!tuples.success){
                return tuples;
            }
            let find_entities     =   tuples_to_obj(tuples.data, schema);
            find_entities         =   await parse_entities(model, find_entities)
            entities.push(...find_entities);
        }
    }
    
    await query_for_props( app, model, schema, params, entities,errors)


    for (let entity of entities) {
        await get_entity_from_entity_id_if_relation(app, model, entity);
    }

    if(params.__map){
        const __map = params.__map;
        entities = map_data(__map, entities)
    }


    return {
        success: true,
        code: 200,
        data: entities
    }
}

export const delete_one = async (app_id: string, model_id: string, token: string, id: string): DEFAULT_RES_SINGLE_P<any> => {
    const errors: string[] = [];
    const auth_check = authorize_user(app_id, model_id, token, "delete", errors);
    if(!auth_check.success) return auth_check;
    const {app, user} = auth_check.data;

    const model = app.models.find((i: any) => i.id === model_id);

    if (!model) {
        errors.push(`Model is not found in the app ${app_id} for given ID ${model_id}`);
        return {
            success: false,
            code: 1072,
            errors
        }
    }

    const pk_name = model.primarykey;

    let entity_id = get_entity_id_with_pk(model_id, pk_name, id, errors);
    if (!entity_id.success) {
        return entity_id;
    }
    const tx: any[] = [[":db/retractEntity", entity_id.data]];
    const r = transact_DS(tx, {origin: 'delete_one_entity_helper',operation: 'delete_entity',}, errors);
    if(!r.success){
        errors.push("Error in deleting data in datascript for delete_one");
        return {success: false, errors, code: r.code}
    }
    return {
        success: true,
        code: 200,
        data: [{ operation: "delete_one", status: "successful" }]
    }
}

export const get_one = async (app_id: string, model_id: string, token: string, id: string): DEFAULT_RES_SINGLE_P<any> => {
    const errors: string[] = [];
    const auth_check = authorize_user(app_id, model_id, token, "read", errors);
    if(!auth_check.success) return auth_check;
    const {app, user} = auth_check.data;

    const model = app.models.find((i: any) => i.id === model_id);
    if (!model) {
        errors.push(`Model is not found in the app ${app_id} for given ID ${model_id}`);
        return {
            success: false,
            code: 1072,
            errors
        }
    }

    const filters: filter[] = [{
        attr: "id",
        op: "eq",
        val: id
    }];
    const sort: sort = { attr: "updated_at", order: "DESC" };
    const limit = 1;

    const query = generate_ds_query(app, model, filters);

    const res = query_DS(query, errors);

    if (!res.success) return {
        success: false,
        code: res.code,
        errors: [
            "Error in querying db for datascript api",
            ...res.errors
        ]
    }

    res.data = tuples_to_obj(res.data, create_schema(app.models));
    res.data = await parse_entities(model, res.data);
    res.data = sort_data(res.data, sort);
    res.data = limit_data(res.data, limit);


    for (let d of res.data) {
        await get_entity_from_entity_id_if_relation(app, model, d);
    }
    const entity = res.data[0] || null
    return {
        success: true,
        code: 200,
        data: entity
    }
}

export const update_one = async (app_id: string, model_id: string, token: string, data: {id: string, patches: t_update_patch[]} ): DEFAULT_RES_SINGLE_P<any> => {
    
    const errors: string[] = [];
    const auth_check = authorize_user(app_id, model_id, token, "update", errors);
    if(!auth_check.success) return auth_check;
    const {app, user} = auth_check.data;

    const model = app.models.find((i: any) => i.id === model_id);

    if (!model) {
        errors.push(`Model is not found in the app ${app_id} for given ID ${model_id}`);
        return {
            success: false,
            code: 1072,
            errors
        }
    }

    const id = data.id;

    const e_id = get_entity_id_with_pk(model_id, "id", id, errors);
    if (!e_id.success) return e_id;

    const entity_id: any    =   e_id.data;
    const patches           =   data.patches;

    for(let patch of patches){
        const p = patch.path.split("/"); //   "/a/b/c"
        if(p.length < 2) continue;
        const pr_name = p[1]; //   a

        if(patch.op === "remove" && !patch.value){
            //this case, deleting the whole property from the data, no need of value
            continue
        }
        const prop = model.props.find(p => p.name === pr_name);
        if(!prop) continue;
        const validate = zod_type_from_prop(prop).safeParse(patch.value);
        if(!validate.success){
            const m = "invalid data found for update error: " + String(validate.error);
            errors.push(m);
            return {
                success: false,
                code: 1091,
                errors
            }
        }
        
    }
    

    const s =  create_relation_for_patches( user, app, model, patches, errors);
    if(!s.success) return s;
    const tx = patches_to_tx(model_id, entity_id, s.data).tx_arr
    
    const r = transact_DS(tx, {
        origin: 'update_one_datascript',
        operation: 'update_one',
    }, errors);
    if(!r.success){
        errors.push("Error in updating data in datascript for update_one");
        return {success: false, errors, code: r.code}
    }
    

    return {
        success: true,
        code: 200,
        data: [{ operation: "update_one", status: "successful" }]
    }
}

export const aggregate = async (app_id: string, model_id: string, token: string, options: OBJECT_TYPE<any>): DEFAULT_RES_SINGLE_P<any> => {
    const errors: string[] = [];

    const auth_check = authorize_user(app_id, model_id, token, "read", errors);
    if(!auth_check.success) return auth_check;
    const {app, user} = auth_check.data;

    const model = app.models.find((i: any) => i.id === model_id);

    if (!model) {
        errors.push(`Model is not found in the app ${app_id} for given ID ${model_id}`);
        return {
            success: false,
            code: 1072,
            errors
        }
    }

    const query = generate_aggregate_ds_query(app_id, model_id, options);
    if (!query) {
        const m = "invalid req for aggregate";
        errors.push(m);
        return {
            success: false,
            code: 1091,
            errors
        }
    }
    const tuples = query_DS(query, errors);

    if (!tuples) return {
        success: false,
        code: 1048,
        errors: ["Error in querying ds in aggregate. Response undefined."]
    }

    if (!tuples.success) return {
        success: false,
        code: tuples.code,
        errors: [
            "Error in querying db for datascript api",
            ...tuples.errors
        ]
    }

    return {
        success: true,
        code: 200,
        data: tuples.data
    }
}

export const get_user_profile = async (app_id: string, model_id: string, token: string): DEFAULT_RES_SINGLE_P<any> => {
    const errors: string[] = [];

    const app = window.broken.offline?.app.getValue();
    if (!app) {
        errors.push(`App object not found for ID: ${app_id}`);
        return {
            success: false,
            code: 1071,
            errors
        }
    }

    if (!token) {
        errors.push("Token is not provided in the request for create_one");
        return {
            success: false,
            code: 1019,
            errors
        }
    }

    const authz: authz_type = app.authz;

    let t: any = {};
    try {
        t = JSON.parse(token);
    }
    catch (error) {
        errors.push(`Error in parsing token in create_one ${token}`);
        return {
            success: false,
            code: 2000,
            errors
        }
    }

    const parsed_user = zod_user.safeParse(t);

    if (!parsed_user.success) {
        errors.push(parsed_user.error.toString());
        return {
            success: false,
            code: 1092,
            errors
        }
    }

    const model = app.models.find((i: any) => i.id === model_id);

    if (!model) {
        errors.push(`Model is not found in the app ${app_id} for given ID ${model_id}`);
        return {
            success: false,
            code: 1072,
            errors
        }
    }

    const user: user_type = parsed_user.data;
    const filters: filter[] = [{ attr: "id", op: "eq", val: user.id }];
    const sort: sort = { attr: "updated_at", order: "DESC" };
    const limit = 1;

    if (model.name !== "user") {
        const m = "model id : " + model.id + " is not user model";
        errors.push(m);
        return {
            success: false,
            code: 1091,
            errors
        }
    }

    const query = generate_ds_query(app, model, filters);
    const res = query_DS(query, errors);



    if (!res.success) return {
        success: false,
        code: res.code,
        errors: [
            "Error in querying db for datascript api",
            ...res.errors
        ]
    }

    let entities = tuples_to_obj(res.data, create_schema(app.models));
    if (entities.length) {
        entities = await parse_entities(model, entities);
        entities = sort_data(entities, sort);
        entities = limit_data(entities, limit);

        for (let entity of entities) {
            await get_entity_from_entity_id_if_relation(app, model, entity);
        }

        return {
            success: true,
            code: 200,
            data: entities[0]
        }
    }
    else {
        const system_model = "SYSTEM";
        console.log("Initializing creation of SYSTEM ");
        const sys_id = system_model + ":" + "id";
        const pull_q = `[*]`
        const pull_res = pull_with_unique_id_DS(pull_q, [sys_id, "SYSTEM"]);



        if (!pull_res.success) {
            const sys_data = {
                id: "SYSTEM",
                name: "SYSTEM",
                created_at: Date.now(),
                updated_at: Date.now()
            }
            const tx = entity_to_tx(system_model, sys_data).tx_arr;
            const r = transact_DS(tx, {
                origin: 'get_user_profile_datascript',
                operation: 'get_user_profile',
            }, errors);
            if(!r.success){
                errors.push("Error in creating data in datascript for get_user_profile " );
                return {success: false, errors, code: r.code}
            }
        }


        console.log("Creating user profile");
        // create a user profile

        // add  system entity id to created_by and updated by
        const e_id = get_entity_id_with_pk("SYSTEM", "id", "SYSTEM", errors);
        if (!e_id.success) {
            return e_id;
        }
        let data: OBJECT_TYPE<any> = {
            id          :   user.id,
            name        :   user.name,
            email       :   user.email,
            image_url   :   user.image_url,
            app_id      :   user.app_id,
            mobile      :   user.mobile,
            created_by  :   e_id.data,
            updated_by  :   e_id.data,
            created_at  :   Date.now(),
            updated_at  :   Date.now()
        }

        for(let [k,v] of Object.entries(data)){
            if(k === "id") continue;
            if(!v) delete data[k];
        }

        const tx = entity_to_tx(model_id, data).tx_arr

        

        const r = transact_DS(tx, {
            origin: 'add_user_to_db_datascript',
            operation: 'add_user_to_db',
        }, errors);
        if(!r.success){
            errors.push("Error in creating data in datascript for add_user_to_db ");
            return {success: false, errors, code: r.code}
        }
        return {
            success: true,
            code: 200,
            data: data
        }
    }
}


export default {};