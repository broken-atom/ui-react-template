import { fetch_post, fetch_get } from "../../Fetch";
import { OBJECT_TYPE, DEFAULT_RES_ARR_P, get_many_filters, DEFAULT_RES_SINGLE_P } from "../../types";
import { generate_entity_base_url, generate_entity_get_many_url } from "./utils";


export const put_one_entity = async (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_entity_base_url('put_one', app_id, model_id, token);
    const put_one_url = `${base_url}`;

    const post_object = {
        entity: {
            data
        }
    }

    const r = await fetch_post(put_one_url, post_object);
    if(!r.success) return r;
    return {
        success: true,
        code: r.code,
        data: r.data[0]
    }
}

export const get_one_entity = async (app_id: string, model_id: string, token: string, filter: { attribute: string, value: string }): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_entity_base_url('get_one', app_id, model_id, token);
    const get_one_url = `${base_url}&attribute=${filter.attribute}&value=${filter.value}`;

    const r = await fetch_get(get_one_url);
    if(!r.success) return r;
    return {
        success: true,
        code: r.code,
        data: r.data[0]
    }
}

export const update_one_entity = async (app_id: string, model_id: string, token: string, data: { id: string, add: OBJECT_TYPE<any>, delete: OBJECT_TYPE<any> }): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_entity_base_url('update_one', app_id, model_id, token);
    const update_one_url = `${base_url}`;

    const post_object = {
        entity: {
            data
        }
    }

    const r = await fetch_post(update_one_url, post_object);
    if(!r.success) return r;
    return {
        success: true,
        code: r.code,
        data: r.data[0]
    }
}

export const delete_one_entity = async (app_id: string, model_id: string, token: string, data: { id: string }): DEFAULT_RES_SINGLE_P<any> => {
    const base_url: string = generate_entity_base_url('delete_one', app_id, model_id, token);
    const delete_one_url = `${base_url}`;

    const post_object = {
        entity: {
            data
        }
    }

    const r = await fetch_post(delete_one_url, post_object);
    if(!r.success) return r;
    return {
        success: true,
        code: r.code,
        data: r.data[0]
    }
}

export const put_many_entities = async (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>[]): DEFAULT_RES_ARR_P<any> => {
    const base_url: string = generate_entity_base_url('put_many', app_id, model_id, token);
    const put_many_url = `${base_url}`;

    const post_object = {
        entities: {
            data
        }
    }

    const r = await fetch_post(put_many_url, post_object);
    return r;
}

export const get_many_entities = async (app_id: string, model_id: string, token: string, filters?: get_many_filters): DEFAULT_RES_ARR_P<any> => {
    const base_url: string = generate_entity_base_url('get_many', app_id, model_id, token);
    const get_many_url = generate_entity_get_many_url(base_url, filters);

    const r = await fetch_get(get_many_url);
    return r;
}

export const update_many_entities = async (app_id: string, model_id: string, token: string, data: { id: string, add: OBJECT_TYPE<any>, delete: OBJECT_TYPE<any> }[]): DEFAULT_RES_ARR_P<any> => {
    const base_url: string = generate_entity_base_url('update_many', app_id, model_id, token);
    const update_many_url = `${base_url}`;

    const post_object = {
        entities: {
            data
        }
    }

    const r = await fetch_post(update_many_url, post_object);
    return r;
}

export const delete_many_entities = async (app_id: string, model_id: string, token: string, data: { id: string }[]): DEFAULT_RES_ARR_P<any> => {
    const base_url: string = generate_entity_base_url('delete_many', app_id, model_id, token);
    const delete_many_url = `${base_url}`;

    const post_object = {
        entities: {
            data
        }
    }

    const r = await fetch_post(delete_many_url, post_object);
    return r;
}


export default {};