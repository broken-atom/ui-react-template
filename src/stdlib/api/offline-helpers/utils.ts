import { pull_DS, query_DS } from "../../db/datascript";
import { DEFAULT_RES_ARR_P, authz_type, user_type, DEFAULT_RES_SINGLE, DEFAULT_RES_ARR, OBJECT_TYPE, model_type } from "../../types";
import { get_one_file } from "./file";
import { get_one_image } from "./image";

export const is_base64_url_image = async (base64String: string): Promise<boolean> => {
    let image = new Image();
    image.src = base64String;
    return await (new Promise((resolve) => {
        image.onload = function () {
            if (image.height === 0 || image.width === 0) {
                resolve(false);
                return;
            }
            resolve(true)
        }
        image.onerror = () => {
            resolve(false)
        }
    }))
}

export const file_to_base64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
}

export const get_first_entity_match = (arr: any, model_id: string, primarykey: string) => {
    const t = arr.find((a: any) => a[1] === `${model_id}:${primarykey}`);
    const entity_id = t[0];
    const r = arr.filter((a: any) => a[0] === entity_id);
    return r;
}

export const group_entities_in_tuples = (arr: any[]) => {
    const s: any = {};

    arr.map(x => {
        if (!s[x[0]]) {
            s[x[0]] = [x];
        }
        else {
            s[x[0]].push(x);
        }
    })

    return Object.values(s);
}

export const filter_entities = (entities: any[], filters: { attribute: string, start_key?: string | number | undefined, end_key?: string | number | undefined, limit?: number | undefined }): any[] => { // This function takes the entities and filters them based on the filters provided
    const { attribute, start_key, end_key, limit } = filters;
    let filtered_entities: any[] = entities;
    if (start_key && end_key) {
        filtered_entities = entities.filter(x => x[attribute] >= start_key && x[attribute] <= end_key);
    }
    else if (start_key) {
        filtered_entities = entities.filter(x => x[attribute] >= start_key);
    }
    else if (end_key) {
        filtered_entities = entities.filter(x => x[attribute] <= end_key);
    }

    if (limit) {
        filtered_entities = filtered_entities.slice(0, limit);
    }

    return filtered_entities;
}

export const get_all_entities_for_model = async (model_id: string, forward: boolean, model_object: model_type): DEFAULT_RES_ARR_P<any> => {
    const errors: string[] = [];
    const es: any[] = [];
    const q = `[:find ?e ?a ?v :where [?e ?a ?v]]`;

    const res = query_DS(q, errors);
    if (!res) return {
        success: false,
        code: 1048,
        errors: ["Error in querying ds in get_all_entities_for_model. Response undefined."]
    }

    if (!res.success) return {
        success: false,
        code: res.code,
        errors: [
            "Error in querying ds in get_all_entities_for_model",
            ...res.errors
        ]
    }

    if (!Array.isArray(res.data)) {
        errors.push("Response while querying ds in get_all_entities_for_model is not an array");
        return {
            success: false,
            code: 1046,
            errors
        }
    }

    if (!res.data.length) {
        return {
            success: true,
            code: 200,
            data: res.data
        }
    }

    // Filter response with model_id
    const filtered_res = res.data.filter((i: any) => i[1].startsWith(model_id));

    const r = group_entities_in_tuples(filtered_res);
    for (let x of r) {
        const r = await tuples_to_obj(x, model_object);

        if (!r.success) {
            errors.push(...r.errors);
            return {
                success: false,
                code: r.code,
                errors
            }
        }

        es.push(r.data[0]);
    }

    // Order by ID
    es.sort((a: any, b: any) => {
        if (a.id < b.id) {
            return -1;
        }
        if (a.id > b.id) {
            return 1
        }
        return 0;
    })

    if (!forward) {
        es.reverse();
    }

    return {
        success: true,
        code: 200,
        data: es
    }
}

export const get_entity_id_with_pk = (model_id: string, pk_name: string, pk_val: string, errors: string[]): DEFAULT_RES_ARR<OBJECT_TYPE<any>> => {
    const q = `[:find ?e :keys entity :where [?e "${model_id}:${pk_name}" "${pk_val}"]]`;

    const res = query_DS(q, errors);
   

    if (!res.success) return {
        success: false,
        code: res.code,
        errors: [
            "Error in querying ds in get_entity_id_with_pk",
            ...res.errors
        ]
    }

    if (!Array.isArray(res.data)) {
        errors.push("Response while querying ds in get_entity_id_with_pk is not an array");
        return {
            success: false,
            code: 1046,
            errors
        }
    }

    if (!res.data.length) {
        errors.push(`Entity is not found in data with given ID ${pk_val}`);
        return {
            success: false,
            code: 1075,
            errors
        }
    }

    let r = res.data[0].entity;
    return {
        success: true,
        code: 200,
        data: r
    }
}

export const check_authorisation = (app_id: string, model_id: string, auth: authz_type, user: user_type, operation: "read" | "create" | "update" | "delete"): DEFAULT_RES_SINGLE<any> => {
    const errors: string[] = [];
    const model_auth = auth.models[model_id];

    if (!model_auth) {
        errors.push(`Authorisation information for model ${model_id} is not found in the app ${app_id}`);
        return {
            success: false,
            code: 1015,
            errors
        }
    }

    if (!user.app_id) {
        errors.push(`User ${user.id} has not logged into the app ${app_id}`)
        return {
            success: false,
            code: 1016,
            errors
        }
    }

    if (user.app_id !== app_id) {
        errors.push(`User ${user.id} is not authorised to login to the app ${app_id}`);
        return {
            success: false,
            code: 1017,
            errors
        }
    }

    if (user.role === "creator") {
        return {
            success: true,
            code: 200,
            data: {}
        }
    }

    const model_level_role = model_auth.role;

    if (model_level_role[user.role].includes(operation)) {
        return {
            success: true,
            code: 200,
            data: {}
        }
    }

    const app_level_role = auth.app.role;

    if (!app_level_role[user.role].includes(operation)) {
        errors.push(`User ${user.id} is not authorised to perform the operation ${operation}`);
        return {
            success: false,
            code: 1018,
            errors
        }
    }

    return {
        success: true,
        code: 200,
        data: {}
    }
}

export const tuples_to_obj = async (arr: any, model_object: model_type): DEFAULT_RES_ARR_P<OBJECT_TYPE<any>> => {
    const obj: OBJECT_TYPE<any> = {}

    for (let t of arr) {
        if (!Array.isArray(t)) {
            return {
                success: false,
                code: 1047,
                errors: [`In query response, one of the element ${t} in the response array is not a tuple`]
            };
        }
        const tuple_key = t[1];
        const tuple_value = t[2];
        const prop_name = tuple_key.split(":")[1];
        const prop_type = model_object.props.find(p => p.name === prop_name)?.type;
        const prop_is_many = model_object.props.find(p => p.name === prop_name)?.is_many;
        if (!prop_type) {
            return {
                success: false,
                code: 1073,
                errors: [`Unable to find prop info for prop ${tuple_key} in model ${model_object.id}`]
            };
        }
        if (tuple_value) {
            let v = tuple_value;
            // If the value is of file type or image type, then we should take the actual data instead of key used to just store the data for efficiency
            if (["image", "file"].includes(prop_type)) {
                if (typeof v === "number") {
                    const pull_resource_data = pull_DS("[*]", v);
                    if (!pull_resource_data) return {
                        success: false,
                        code: 1044,
                        errors: ["Error in pulling ds in tuples_to_obj. Response undefined."]
                    }
                    v = pull_resource_data.data;
                    delete v[":db/id"];
                    const stored_url = v.url;
                    if (stored_url) {
                        if (stored_url.startsWith('@resource:')) {
                            const type = stored_url.split(':')[1];
                            const key = stored_url.split(':')[2];
                            const [app_id, model_id, entity_id, prop_id, uid] = key.split('/');
                            // Check if everything is defined
                            if (!app_id || !model_id || !entity_id || !prop_id || !uid) {
                                return {
                                    success: false,
                                    code: 1057,
                                    errors: ["invalid file key found"]
                                };
                            }
                            if (type === "file") {
                                // get the file data from the db
                                const r = await get_one_file("PRIVATE", app_id, model_id, entity_id, prop_id, uid);
                                if (!r.success) {
                                    return {
                                        success: false,
                                        code: r.code,
                                        errors: r.errors
                                    };
                                }
                                v.url = r.data.url;
                            }
                            else if (type === "image") {
                                // get the image data from the db
                                const r = await get_one_image("PRIVATE", app_id, model_id, entity_id, prop_id, uid);
                                if (!r.success) {
                                    return {
                                        success: false,
                                        code: r.code,
                                        errors: r.errors
                                    };
                                }
                                v.url = r.data.url;
                            }
                        }
                    }
                    else {
                        return {
                            success: false,
                            code: 1056,
                            errors: [`Unable to find key "url" in prop ${tuple_key} in model ${model_object.id}`]
                        }
                    }
                }
                else {
                    return {
                        success: false,
                        code: 1055,
                        errors: [`Invalid value found for prop ${tuple_key} in model ${model_object.id}. Expected number since it is a reference but got ${v}`]
                    }
                }
            }
            if (!prop_is_many) {
                obj[tuple_key] = v;
            }
            else {
                if (!obj[tuple_key]) {
                    obj[tuple_key] = [v];
                }
                else { // This is the case when the object already has the key value pair and is_many. So push the value to the array
                    const obj_val = obj[tuple_key];
                    if (!Array.isArray(obj_val)) {
                        obj[tuple_key] = [obj_val]
                    }
                    obj[tuple_key].push(v);
                }
            }
        }
        else {
            obj[tuple_key] = null
        }
    }

    const modified_attr: OBJECT_TYPE<any> = {}
    for (let key of Object.keys(obj)) {
        let k = key.split(":");
        if (k.length !== 2) {
            return {
                success: false,
                code: 1080,
                errors: ["invalid key found " + key]
            };
        }
        const attr = k[1];
        modified_attr[attr] = obj[key];
    }
    return {
        success: true,
        code: 200,
        data: [modified_attr]
    }
}

export default {};