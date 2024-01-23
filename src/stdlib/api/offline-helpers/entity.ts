import { OBJECT_TYPE, DEFAULT_RES_ARR_P, get_many_filters, DEFAULT_RES_SINGLE_P } from "../../types";
import { delete_many_entities_helper, delete_one_entity_helper, get_many_entities_helper, get_one_entity_helper, put_many_entities_helper, put_one_entity_helper, update_many_entities_helper, update_one_entity_helper } from "./crud-utils";


export const put_one_entity = async (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>): DEFAULT_RES_SINGLE_P<any> => {
    const r = await put_one_entity_helper(app_id, model_id, token, data);
    if(!r.success) return r;
    return {
        success: true,
        code: 200,
        data: r.data[0]
    }
}

export const get_one_entity = async (app_id: string, model_id: string, token: string, filter: { attribute: string, value: string }): DEFAULT_RES_SINGLE_P<any> => {
    const r = await get_one_entity_helper(app_id, model_id, token, filter);
    if(!r.success) return r;
    return {
        success: true,
        code: 200,
        data: r.data[0]
    }
}

export const update_one_entity = async (app_id: string, model_id: string, token: string, data: { id: string, add: OBJECT_TYPE<any>, delete: OBJECT_TYPE<any> }): DEFAULT_RES_SINGLE_P<any> => {
    const r = await update_one_entity_helper(app_id, model_id, token, data);
    if(!r.success) return r;
    return {
        success: true,
        code: 200,
        data: r.data[0]
    }
}

export const delete_one_entity = async (app_id: string, model_id: string, token: string, data: { id: string }): DEFAULT_RES_SINGLE_P<any> => {
    const r = await delete_one_entity_helper(app_id, model_id, token, data);
    if(!r.success) return r;
    return {
        success: true,
        code: 200,
        data: r.data[0]
    }
}

export const put_many_entities = async (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>[]): DEFAULT_RES_ARR_P<any> => {
    const r = await put_many_entities_helper(app_id, model_id, token, data);
    return r;
}

export const get_many_entities = async (app_id: string, model_id: string, token: string, filters?: get_many_filters): DEFAULT_RES_ARR_P<any> => {
    const r = await get_many_entities_helper(app_id, model_id, token, filters);
    return r;
}

export const update_many_entities = async (app_id: string, model_id: string, token: string, data: { id: string, add: OBJECT_TYPE<any>, delete: OBJECT_TYPE<any> }[]): DEFAULT_RES_ARR_P<any> => {
    const r = await update_many_entities_helper(app_id, model_id, token, data);
    return r;
}

export const delete_many_entities = async (app_id: string, model_id: string, token: string, data: { id: string }[]): DEFAULT_RES_ARR_P<any> => {
    const r = await delete_many_entities_helper(app_id, model_id, token, data);
    return r;
}


export default {};