import { fetch_get, fetch_post } from "../../Fetch";
import { datascript_query_params, query_obj_type, t_update_patch } from "../../interfaces";
import { DEFAULT_RES_ARR_P, DEFAULT_RES_SINGLE_P, OBJECT_TYPE } from "../../types";
import { generate_datascript_native_base_url, generate_datascript_extended_base_url } from "./utils";


export const query = async (app_id: string, model_id: string, token: string, query: string, entity_id?: string): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_datascript_native_base_url('QUERY', app_id, token, entity_id);
    const query_url = `${base_url}`;

    const post_object = {
        query
    }

    const r = await fetch_post(query_url, post_object);
    return r;
}

export const transact = async (app_id: string, model_id: string, token: string, tx: any[], entity_id?: string): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_datascript_native_base_url('TRANSACT', app_id, token, entity_id);
    const transact_url = `${base_url}`;

    const post_object = {
        tx
    }

    const r = await fetch_post(transact_url, post_object);
    return r;
}

export const pull = async (app_id: string, model_id: string, token: string, query: string, _id: number, entity_id?: string): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_datascript_native_base_url('PULL', app_id, token, entity_id);
    const transact_url = `${base_url}`;

    const post_object = {
        query,
        _id
    }

    const r = await fetch_post(transact_url, post_object);
    return r;
}

export const create_one = async (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_datascript_extended_base_url('CREATE_ONE', app_id, model_id, token);
    const create_one_url = `${base_url}`;

    const post_object = {
        entity: {
            data
        }
    }

    const r = await fetch_post(create_one_url, post_object);
    return r;
}

export const create_many = async (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>[]): DEFAULT_RES_ARR_P<any> => {
    const base_url: string = generate_datascript_extended_base_url('CREATE_MANY', app_id, model_id, token);
    const create_many_url = `${base_url}`;

    const post_object = {
        entity: {
            data
        }
    }

    const r = await fetch_post(create_many_url, post_object);
    return r;
}

export const get_many = async (app_id: string, model_id: string, token: string, params: query_obj_type): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_datascript_extended_base_url('GET_MANY', app_id, model_id, token);
    const get_many_url = `${base_url}`;
    const r = await fetch_post(get_many_url, params);
    return r;
}

export const delete_one = async (app_id: string, model_id: string, token: string, id: string): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_datascript_extended_base_url('DELETE_ONE', app_id, model_id, token);
    const get_many_url = `${base_url}`;

    const post_object = {
        id: id
    }

    const r = await fetch_post(get_many_url, post_object);
    return r;
}

export const get_one = async (app_id: string, model_id: string, token: string, id: string): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_datascript_extended_base_url('GET_ONE', app_id, model_id, token);
    const get_many_url = `${base_url}&id=${id}`;

    const r = await fetch_get(get_many_url);
    return r;
}

export const update_one = async (app_id: string, model_id: string, token: string, data: { id: string, patches: t_update_patch[] }): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_datascript_extended_base_url('UPDATE_ONE', app_id, model_id, token);
    const update_one_url = `${base_url}`;

    const post_object = {
        entity: {
            data
        }
    }

    const r = await fetch_post(update_one_url, post_object);
    return r;
}

export const aggregate = async (app_id: string, model_id: string, token: string, options: OBJECT_TYPE<any>): DEFAULT_RES_ARR_P<any> => {
    const base_url: string = generate_datascript_extended_base_url('AGGREGATE', app_id, model_id, token);
    const aggregate_url = `${base_url}`;

    const post_object = options;

    const r = await fetch_post(aggregate_url, post_object);
    return r;
}

export const get_user_profile = async (app_id: string, model_id: string, token: string): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_datascript_extended_base_url('GET_USER_PROFILE', app_id, model_id, token);
    const get_user_profile_url = `${base_url}`;

    const r = await fetch_get(get_user_profile_url);
    return r;
}


export default {};