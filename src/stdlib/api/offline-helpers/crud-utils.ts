import { transact_DS, query_DS } from "../../db/datascript";
import { OBJECT_TYPE, DEFAULT_RES_ARR_P, authz_type, zod_user, user_type, get_many_filters } from "../../types";
import { zod_type_from_prop, zod_number_types } from "./data-validation";
import { check_authorisation, get_entity_id_with_pk, get_first_entity_match, tuples_to_obj, get_all_entities_for_model, group_entities_in_tuples, filter_entities } from "./utils";

export const put_one_entity_helper = async (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>): DEFAULT_RES_ARR_P<OBJECT_TYPE<any>> => {
    const errors: string[] = [];

    const app = window.broken.offline?.app.getValue();;
    if (!app) {
        errors.push(`App object not found for ID: ${app_id}`);
        return {
            success: false,
            code: 1071,
            errors
        }
    }

    if (!token) {
        errors.push("Token is not provided in the request for put_one_entity_helper");
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
        errors.push(`Error in parsing token in put_one_entity_helper ${token}`);
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

    const auth_check = check_authorisation(app_id, model_id, authz, user, "create");

    if (!auth_check.success) {
        errors.push(...auth_check.errors);
        return {
            success: false,
            code: 1011,
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

    for (let attribute of Object.keys(data)) {
        let _prop = model.props.find((i: any) => i.name === attribute)
        if (!_prop) {
            errors.push(`Prop is not found in the model ${model_id} for given name ${attribute}`);
            return {
                success: false,
                code: 1073,
                errors
            }
        }
        let zod_type = zod_type_from_prop(_prop);
        let zod_check = zod_type.safeParse(data[attribute]);
        if (!zod_check.success) {
            errors.push(`Invalid data has been sent for prop ${_prop.name} of model ${model_id} to create. Zod Error: ${zod_check.error}`);
            return {
                success: false,
                code: 1092,
                errors
            }
        }
    }

    const tx: any[] = [];
    let i = 1;
    const data_id = -i;

    for (let attr of Object.keys(data)) {
        const modified_attr = `${model_id}:${attr}`
        if (Array.isArray(data[attr])) {
            for (let value of data[attr]) {
                if (typeof value === "object") {
                    i = i + 1;
                    const nested_data_id = -i;
                    tx.push([":db/add", data_id, modified_attr, nested_data_id])
                    for (let nested_attr of Object.keys(value)) {
                        // const nested_modified_attr = `${model_id}:${attr}:${nested_attr}` // Should we do this?
                        const nested_modified_attr = nested_attr;
                        tx.push([":db/add", nested_data_id, nested_modified_attr, value[nested_attr]])
                    }
                }
                else {
                    tx.push([":db/add", data_id, modified_attr, value])
                }
            }
        }
        else {
            const value = data[attr];
            if (typeof value === "object") {
                i = i + 1;
                const nested_data_id = -i;
                tx.push([":db/add", data_id, modified_attr, nested_data_id])
                for (let nested_attr of Object.keys(value)) {
                    // const nested_modified_attr = `${model_id}:${attr}:${nested_attr}` // Should we do this?
                    const nested_modified_attr = nested_attr;
                    tx.push([":db/add", nested_data_id, nested_modified_attr, value[nested_attr]])
                }
            }
            else {
                tx.push([":db/add", data_id, modified_attr, value])
            }
        }
    }
    const d = Date.now();
    tx.push([":db/add", data_id, `${model_id}:created_at`, d]);
    tx.push([":db/add", data_id, `${model_id}:updated_at`, d]);
    tx.push([":db/add", data_id, `${model_id}:created_by`, user.id]);
    tx.push([":db/add", data_id, `${model_id}:updated_by`, user.id]);

    try {
        transact_DS(tx, {
            origin: 'put_one_entity_helper',
            operation: 'create_entity',
        }, errors);
    } catch (error) {
        errors.push("Error in creating data in datascript for put_one => " + String(error));
        return {
            success: false,
            code: 1042,
            errors
        }
    }

    return {
        success: true,
        code: 200,
        data: [{ operation: "put_one", status: "successful" }]
    }
}

export const get_one_entity_helper = async (app_id: string, model_id: string, token: string, filter: { attribute: string, value: string }): DEFAULT_RES_ARR_P<OBJECT_TYPE<any>> => {
    const errors: string[] = [];
    const app = window.broken.offline?.app.getValue();;
    if (!app) {
        errors.push(`App object not found for ID: ${app_id}`);
        return {
            success: false,
            code: 1071,
            errors
        }
    }

    if (!token) {
        errors.push("Token is not provided in the request for get_one_entity_helper");
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
        errors.push(`Error in parsing token in get_one_entity_helper ${token}`);
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

    const auth_check = check_authorisation(app_id, model_id, authz, user, "read");

    if (!auth_check.success) {
        errors.push(...auth_check.errors);
        return {
            success: false,
            code: 1012,
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

    const pk_name = model.primarykey;
    let modified_attr = `${model_id}:${filter.attribute}`
    const q = `[:find ?e ?a ?v :in $ :where [?e ?a ?v] [?e "${modified_attr}" "${filter.value}"]]`;

    const res = query_DS(q, errors);
    if (!res) return {
        success: false,
        code: 1048,
        errors: ["Error in querying ds in get_one_entity_helper. Response undefined."]
    }

    if (!res.success) return {
        success: false,
        code: res.code,
        errors: [
            "Error in querying ds in get_one_entity_helper",
            ...res.errors
        ]
    }

    if (!Array.isArray(res.data)) {
        errors.push("Response while querying ds in get_one_entity_helper is not an array");
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

    const r1 = get_first_entity_match(res.data, model_id, pk_name);
    const r = await tuples_to_obj(r1, model);

    return r;
}

export const update_one_entity_helper = async (app_id: string, model_id: string, token: string, data: { id: string, add: OBJECT_TYPE<any>, delete: OBJECT_TYPE<any> }): DEFAULT_RES_ARR_P<OBJECT_TYPE<any>> => {
    const errors: string[] = [];
    const app = window.broken.offline?.app.getValue();;

    if (!app) {
        errors.push(`App object not found for ID: ${app_id}`);
        return {
            success: false,
            code: 1071,
            errors
        }
    }

    if (!token) {
        errors.push("Token is not provided in the request for update_one_entity_helper");
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
        errors.push(`Error in parsing token in update_one_entity_helper ${token}`);
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

    const auth_check = check_authorisation(app_id, model_id, authz, user, "update");

    if (!auth_check.success) {
        errors.push(...auth_check.errors);
        return {
            success: false,
            code: 1013,
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

    const add_attributes = data.add;
    const del_attributes = data.delete;
    const pk_val = data.id;
    const pk_name = model.primarykey;
    let e = get_entity_id_with_pk(model_id, pk_name, pk_val,errors);

    if (!e.success) {
        errors.push(`Entity is not found in data with given ID ${pk_val}`);
        return {
            success: false,
            code: 1075,
            errors
        }
    }

    const _id = e.data;
    const tx: any[] = [];

    for (let attribute of Object.keys(del_attributes)) {

        let _prop = model.props.find((i: any) => i.name === attribute);

        if (!_prop) {
            errors.push(`Prop is not found in the model ${model_id} for given name ${attribute}`);
            return {
                success: false,
                code: 1073,
                errors
            }
        }
        if (!_prop.is_many) {
            if (_prop.is_required) {
                errors.push(`Prop ${attribute} can't be deleted since it is required`)
                return {
                    success: false,
                    code: 1074,
                    errors
                }

            }
        }
        if (_prop.is_many) {
            let zod_type = zod_type_from_prop(_prop);
            let zod_check = zod_type.safeParse(del_attributes[attribute]);
            if (!zod_check.success) {
                errors.push(`Invalid data has been sent for prop ${_prop.name} of model ${model_id} to update in del_attributes. Zod Error: ${zod_check.error}`);
                return {
                    success: false,
                    code: 1092,
                    errors
                }
            }
        }

        if (attribute === "id") {
            errors.push(`Can't delete the entity ID of the data`)
            return {
                success: false,
                code: 1076,
                errors
            }
        }
        let modified_key = `${model_id}:${attribute}`;
        const value = del_attributes[attribute];
        const prop_type = _prop.type;

        if (Array.isArray(value)) {
            for (let each_v of value) {
                if (["image", "file"].includes(prop_type)) {
                    if (typeof each_v === "object") {
                        const query_array: any[] = [];
                        for (let each_key of Object.keys(each_v)) {
                            query_array.push(`[?e "${each_key}" ${typeof each_v[each_key] === "string" ? `"${each_v[each_key]}"` : each_v[each_key]}]`);
                        }
                        const query = `[:find ?e :where ${query_array.join(" ")}]`;
                        const res = query_DS(query, errors);
                        if (!res) {
                            errors.push("Error in querying ds in update_one_entity_helper while deleting image/file");
                            return {
                                success: false,
                                code: 1048,
                                errors
                            }
                        }
                        if (!res.success) {
                            errors.push("Error in querying ds in update_one_entity_helper while deleting image/file");
                            return {
                                success: false,
                                code: res.code,
                                errors: [
                                    "Error in querying ds in update_one_entity_helper while deleting image/file",
                                    ...res.errors
                                ]
                            }
                        }
                        if (!Array.isArray(res.data)) {
                            errors.push("Response while querying ds in update_one_entity_helper while deleting image/file is not an array");
                            return {
                                success: false,
                                code: 1046,
                                errors
                            }
                        }
                        if (!res.data.length) {
                            errors.push("No entity found while querying ds in update_one_entity_helper while deleting image/file");
                            return {
                                success: false,
                                code: 1047,
                                errors
                            }
                        }
                        const entity_id = res.data[0][0];
                        tx.push([":db/retractEntity", entity_id])
                    }
                    else {
                        return {
                            success: false,
                            code: 1067,
                            errors: [`Invalid value found for prop ${modified_key} in model ${model}. Expected object during update but got ${each_v}`]
                        }
                    }
                }
                else {
                    tx.push([":db/retract", _id, modified_key, each_v]);
                }
            }
        }
        else {
            if (["image", "file"].includes(prop_type)) {
                if (typeof value === "object") {
                    const query_array: any[] = [];
                    for (let each_key of Object.keys(value)) {
                        query_array.push(`[?e "${each_key}" ${typeof value[each_key] === "string" ? `"${value[each_key]}"` : value[each_key]}]`);
                    }
                    const query = `[:find ?e :where ${query_array.join(" ")}]`;
                    const res = query_DS(query, errors);
                    if (!res) {
                        errors.push("Error in querying ds in update_one_entity_helper while deleting image/file");
                        return {
                            success: false,
                            code: 1048,
                            errors
                        }
                    }
                    if (!res.success) {
                        errors.push("Error in querying ds in update_one_entity_helper while deleting image/file");
                        return {
                            success: false,
                            code: res.code,
                            errors: [
                                "Error in querying ds in update_one_entity_helper while deleting image/file",
                                ...res.errors
                            ]
                        }
                    }
                    if (!Array.isArray(res.data)) {
                        errors.push("Response while querying ds in update_one_entity_helper while deleting image/file is not an array");
                        return {
                            success: false,
                            code: 1046,
                            errors
                        }
                    }
                    if (!res.data.length) {
                        errors.push("No entity found while querying ds in update_one_entity_helper while deleting image/file");
                        return {
                            success: false,
                            code: 1047,
                            errors
                        }
                    }
                    const entity_id = res.data[0][0];
                    tx.push([":db/retractEntity", entity_id])
                }
                else {
                    return {
                        success: false,
                        code: 1067,
                        errors: [`Invalid value found for prop ${modified_key} in model ${model}. Expected object during update but got ${value}`]
                    }
                }
            }
            else {
                tx.push([":db/retract", _id, modified_key, value])
            }
        }
    }

    let i = 0;

    for (let attribute of Object.keys(add_attributes)) {

        let _prop = model.props.find((i: any) => i.name === attribute)
        if (!_prop) {
            errors.push(`Prop is not found in the model ${model_id} for given name ${attribute}`);
            return {
                success: false,
                code: 1073,
                errors
            }
        }
        let zod_type = zod_type_from_prop(_prop);
        let zod_check = zod_type.safeParse(add_attributes[attribute]);
        if (!zod_check.success) {
            errors.push(`Invalid data has been sent for prop ${_prop.name} of model ${model_id} to update in add_attributes. Zod Error: ${zod_check.error}`);
            return {
                success: false,
                code: 1092,
                errors
            }
        }

        if (attribute === "id") {
            errors.push(`Can't update the entity ID of the data`)
            return {
                success: false,
                code: 1077,
                errors
            }
        }
        let modified_key = `${model_id}:${attribute}`

        if (Array.isArray(add_attributes[attribute])) {
            for (let value of add_attributes[attribute]) {
                if (typeof value === "object") {
                    i = i + 1;
                    const nested_data_id = -i;
                    tx.push([":db/add", _id, modified_key, nested_data_id])
                    for (let nested_attr of Object.keys(value)) {
                        // const nested_modified_attr = `${model_id}:${attr}:${nested_attr}` // Should we do this?
                        const nested_modified_attr = nested_attr;
                        tx.push([":db/add", nested_data_id, nested_modified_attr, value[nested_attr]])
                    }
                }
                else {
                    tx.push([":db/add", _id, modified_key, value]);
                }
            }
        }
        else {
            const value = add_attributes[attribute];
            if (typeof value === "object") {
                i = i + 1;
                const nested_data_id = -i;
                tx.push([":db/add", _id, modified_key, nested_data_id])
                for (let nested_attr of Object.keys(value)) {
                    // const nested_modified_attr = `${model_id}:${attr}:${nested_attr}` // Should we do this?
                    const nested_modified_attr = nested_attr;
                    tx.push([":db/add", nested_data_id, nested_modified_attr, value[nested_attr]])
                }
            }
            else {
                tx.push([":db/add", _id, modified_key, value])
            }
        }
    }

    const d = Date.now()
    tx.push([":db/add", _id, `${model_id}:updated_at`, d]);
    tx.push([":db/add", _id, `${model_id}:updated_by`, user.id]);

    try {
        transact_DS(tx, {
            origin: "update_one_entity_helper",
            operation: "update_entity"
        }, errors);
    } catch (error) {
        errors.push("Error in updating data in datascript for update_one => " + String(error));
        return {
            success: false,
            code: 1042,
            errors
        }
    }

    return {
        success: true,
        code: 200,
        data: [{ operation: "update_one", status: "successful" }]
    }
}

export const delete_one_entity_helper = async (app_id: string, model_id: string, token: string, data: { id: string }): DEFAULT_RES_ARR_P<OBJECT_TYPE<any>> => {
    const errors: string[] = [];
    const app = window.broken.offline?.app.getValue();;
    if (!app) {
        errors.push(`App object not found for ID: ${app_id}`);
        return {
            success: false,
            code: 1071,
            errors
        }
    }

    if (!token) {
        errors.push("Token is not provided in the request for delete_one_entity_helper");
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
        errors.push(`Error in parsing token in delete_one_entity_helper ${token}`);
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

    const auth_check = check_authorisation(app_id, model_id, authz, user, "delete");

    if (!auth_check.success) {
        errors.push(...auth_check.errors);
        return {
            success: false,
            code: 1014,
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

    const pk_name = model.primarykey;

    let entity_id = get_entity_id_with_pk(model_id, pk_name, data.id, errors);
    if (!entity_id.success) {
        return entity_id;
    }
    const tx: any[] = [[":db/retractEntity", entity_id.data]];
    try {
        transact_DS(tx, {
            origin: 'delete_one_entity_helper',
            operation: 'delete_entity',
        }, errors);
    } catch (error) {
        errors.push("Error in deleting data in datascript for delete_one => " + String(error));
        return {
            success: false,
            code: 1042,
            errors
        }
    }

    return {
        success: true,
        code: 200,
        data: [{ operation: "delete_one", status: "successful" }]
    }
}

export const put_many_entities_helper = async (app_id: string, model_id: string, token: string, data: OBJECT_TYPE<any>[]): DEFAULT_RES_ARR_P<OBJECT_TYPE<any>> => {
    const errors: string[] = [];
    const app = window.broken.offline?.app.getValue();;
    if (!app) {
        errors.push(`App object not found for ID: ${app_id}`);
        return {
            success: false,
            code: 1071,
            errors
        }
    }

    if (!token) {
        errors.push("Token is not provided in the request for put_many_entities_helper");
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
        errors.push(`Error in parsing token in put_many_entities_helper ${token}`);
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

    const auth_check = check_authorisation(app_id, model_id, authz, user, "create");

    if (!auth_check.success) {
        errors.push(...auth_check.errors);
        return {
            success: false,
            code: 1011,
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

    const tx: any[] = [];
    let i = 0;

    for (let each_data of data) {
        i = i + 1;
        const data_id = -i;
        for (let attr of Object.keys(each_data)) {
            const modified_attr = `${model_id}:${attr}`
            if (Array.isArray(each_data[attr])) {
                for (let value of each_data[attr]) {
                    if (typeof value === "object") {
                        i = i + 1;
                        const nested_data_id = -i;
                        tx.push([":db/add", data_id, modified_attr, nested_data_id])
                        for (let nested_attr of Object.keys(value)) {
                            // const nested_modified_attr = `${model_id}:${attr}:${nested_attr}` // Should we do this?
                            const nested_modified_attr = nested_attr;
                            tx.push([":db/add", nested_data_id, nested_modified_attr, value[nested_attr]])
                        }
                    }
                    else {
                        tx.push([":db/add", data_id, modified_attr, JSON.stringify(value)])
                    }
                }
            }
            else {
                const value = each_data[attr];
                if (typeof value === "object") {
                    i = i + 1;
                    const nested_data_id = -i;
                    tx.push([":db/add", data_id, modified_attr, nested_data_id])
                    for (let nested_attr of Object.keys(value)) {
                        // const nested_modified_attr = `${model_id}:${attr}:${nested_attr}` // Should we do this?
                        const nested_modified_attr = nested_attr;
                        tx.push([":db/add", nested_data_id, nested_modified_attr, value[nested_attr]])
                    }
                }
                else {
                    tx.push([":db/add", data_id, modified_attr, JSON.stringify(value)])
                }
            }
        }
        const d = Date.now();
        tx.push([":db/add", data_id, `${model_id}:created_at`, d]);
        tx.push([":db/add", data_id, `${model_id}:updated_at`, d]);
        tx.push([":db/add", data_id, `${model_id}:created_by`, user.id]);
        tx.push([":db/add", data_id, `${model_id}:updated_by`, user.id]);
    }

    try {
        transact_DS(tx, {
            origin: 'create_many_entities_helper',
            operation: 'create_entities',
        }, errors);
    } catch (error) {
        errors.push("Error in creating data in datascript for put_many => " + String(error));
        return {
            success: false,
            code: 1042,
            errors
        }
    }

    return {
        success: true,
        code: 200,
        data: [{ operation: "put_many", status: "successful" }]
    }
}

export const get_many_entities_helper = async (app_id: string, model_id: string, token: string, filters?: get_many_filters): DEFAULT_RES_ARR_P<OBJECT_TYPE<any>> => { // @todo: add pagination
    const errors: string[] = [];
    const app = window.broken.offline?.app.getValue();;
    if (!app) {
        errors.push(`App object not found for ID: ${app_id}`);
        return {
            success: false,
            code: 1071,
            errors
        }
    }

    if (!token) {
        errors.push("Token is not provided in the request for get_many_entities_helper");
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
        errors.push(`Error in parsing token in get_many_entities_helper ${token}`);
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

    const auth_check = check_authorisation(app_id, model_id, authz, user, "read");

    if (!auth_check.success) {
        errors.push(...auth_check.errors);
        return {
            success: false,
            code: 1012,
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

    const es: any[] = [];

    if (!filters) { // Return everything if there is no filter
        const r = await get_all_entities_for_model(model_id, true, model);

        if (!r.success) {
            errors.push(...r.errors);
            return {
                success: false,
                code: r.code,
                errors
            }
        }

        return r;
    }


    let modified_attr = `${model_id}:${filters.attribute}`;
    const attr_type = model.props.find((i: any) => i.name === filters.attribute)?.type;

    if (!attr_type) {
        errors.push(`Prop is not found in the model ${model_id} for given name ${filters.attribute}`)
        return {
            success: false,
            code: 1073,
            errors
        }
    }


    // If values is there, ignore everything else
    if (filters.values) {
        if (filters.values.length) { // Get all entities with values given
            for (let v of filters.values) {
                const q = `[:find  ?e ?a ?v :in $ :where [?e ?a ?v] [?e "${modified_attr}" "${v}"]]`;

                const res = query_DS(q, errors);
                if (!res) return {
                    success: false,
                    code: 1048,
                    errors: ["Error in querying ds in get_many_entity_helper. Response undefined."]
                }

                if (!res.success) return {
                    success: false,
                    code: res.code,
                    errors: [
                        "Error in querying ds in get_many_entity_helper while getting all entities with values given",
                        ...res.errors
                    ]
                }

                if (!Array.isArray(res.data)) {
                    errors.push("Response while querying ds in get_many_entity_helper while getting all entities with values given is not an array");
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

                const r = group_entities_in_tuples(res.data);
                for (let x of r) {
                    const r = await tuples_to_obj(x, model);

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
            }
        }
        else { // Get all existing entities
            const q = `[:find  ?e ?a ?v :in $ :where [?e ?a ?v] [?e "${modified_attr}" ?v]]`;

            const res = query_DS(q, errors);
            if (!res) return {
                success: false,
                code: 1048,
                errors: ["Error in querying ds in get_many_entity_helper. Response undefined."]
            }

            if (!res.success) return {
                success: false,
                code: res.code,
                errors: [
                    "Error in querying ds in get_many_entity_helper while getting all entities",
                    ...res.errors
                ]
            }

            if (!Array.isArray(res.data)) {
                errors.push("Response while querying ds in get_many_entity_helper while getting all entities is not an array");
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

            const r = group_entities_in_tuples(res.data);

            for (let x of r) {
                const r = await tuples_to_obj(x, model);

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
        }
    }
    else { // Filtering
        let start_key: string | number | undefined = filters.start_key;
        let end_key: string | number | undefined = filters.end_key;
        if (zod_number_types.includes(attr_type)) {
            if (start_key) {
                if (!Number.isNaN(Number(start_key))) {
                    start_key = Number(start_key);
                }
                else {
                    errors.push(`Given start_key ${start_key} is not a number`);
                    return {
                        success: false,
                        code: 1078,
                        errors
                    }
                }
            }
            if (end_key) {
                if (!Number.isNaN(Number(end_key))) {
                    end_key = Number(end_key);
                }
                else {
                    errors.push(`Given end_key ${end_key} is not a number`);
                    return {
                        success: false,
                        code: 1079,
                        errors
                    }
                }
            }
        }
        const limit = filters.limit;
        const forward = typeof (filters.forward) === "boolean" ? filters.forward : true;
        const r = await get_all_entities_for_model(model_id, forward, model);

        if (!r.success) {
            errors.push(...r.errors);
            return {
                success: false,
                code: r.code,
                errors
            }
        }

        const filtered_r = filter_entities(r.data, { attribute: filters.attribute, start_key, end_key, limit });

        es.push(...filtered_r);
    }

    return {
        success: true,
        code: 200,
        data: es
    }
}

export const update_many_entities_helper = async (app_id: string, model_id: string, token: string, data: { id: string, add: OBJECT_TYPE<any>, delete: OBJECT_TYPE<any> }[]): DEFAULT_RES_ARR_P<OBJECT_TYPE<any>> => {
    const errors: string[] = [];
    const app = window.broken.offline?.app.getValue();;
    if (!app) {
        errors.push(`App object not found for ID: ${app_id}`);
        return {
            success: false,
            code: 1071,
            errors
        }
    }

    if (!token) {
        errors.push("Token is not provided in the request for update_many_entities_helper");
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
        errors.push(`Error in parsing token in update_many_entities_helper ${token}`);
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

    const auth_check = check_authorisation(app_id, model_id, authz, user, "update");

    if (!auth_check.success) {
        errors.push(...auth_check.errors);
        return {
            success: false,
            code: 1013,
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

    const tx: any[] = [];
    for (let each_data of data) {
        const add_attributes = each_data.add;
        const del_attributes = each_data.delete;
        const pk_val = each_data.id;

        for (let attribute of Object.keys(add_attributes)) {

            let _prop = model.props.find((i: any) => i.name === attribute)
            if (!_prop) {
                errors.push(`Prop is not found in the model ${model_id} for given name ${attribute}`);
                return {
                    success: false,
                    code: 1073,
                    errors
                }
            }
            let zod_type = zod_type_from_prop(_prop);
            let zod_check = zod_type.safeParse(add_attributes[attribute]);
            if (!zod_check.success) {
                errors.push(`Invalid data has been sent for prop ${_prop.name} of model ${model_id} to update in add_attributes. Zod Error: ${zod_check.error}`);
                return {
                    success: false,
                    code: 1092,
                    errors
                }
            }
        }

        for (let attribute of Object.keys(del_attributes)) {

            let _prop = model.props.find((i: any) => i.name === attribute);

            if (!_prop) {
                errors.push(`Prop is not found in the model ${model_id} for given name ${attribute}`);
                return {
                    success: false,
                    code: 1073,
                    errors
                }
            }
            if (!_prop.is_many) {
                if (_prop.is_required) {
                    errors.push(`Prop ${attribute} can't be deleted since it is required`)
                    return {
                        success: false,
                        code: 1074,
                        errors
                    }
                }
            }
            if (_prop.is_many) {
                let zod_type = zod_type_from_prop(_prop);
                let zod_check = zod_type.safeParse(del_attributes[attribute]);
                if (!zod_check.success) {
                    errors.push(`Invalid data has been sent for prop ${_prop.name} of model ${model_id} to update in del_attributes. Zod Error: ${zod_check.error}`);
                    return {
                        success: false,
                        code: 1092,
                        errors
                    }
                }
            }
        }

        const pk_name = model.primarykey;
        let e = get_entity_id_with_pk(model_id, pk_name, pk_val, errors);

        if (!e.success) {
            errors.push(`Entity is not found in data with given ID ${pk_val}`);
            return {
                success: false,
                code: 1075,
                errors
            }
        }

        const _id = e.data;

        for (let key of Object.keys(del_attributes)) {
            if (key === "id") {
                errors.push(`Can't delete the entity ID of the data`)
                return {
                    success: false,
                    code: 1076,
                    errors
                }
            }
            let modified_key = `${model_id}:${key}`
            if (Array.isArray(del_attributes[key])) {
                for (let k of del_attributes[key]) {
                    if (typeof k === "object") {
                        tx.push([":db/retractEntity", _id, modified_key, k])
                    }
                    tx.push([":db/retract", _id, modified_key, k]);
                }
            }
            else {
                const k = del_attributes[key];
                if (typeof k === "object") {
                    tx.push([":db/retractEntity", _id, modified_key, k])
                }
                tx.push([":db/retract", _id, modified_key, k])
            }
        }

        let i = 0;

        for (let key of Object.keys(add_attributes)) {
            if (key === "id") {
                errors.push(`Can't update the entity ID of the data`)
                return {
                    success: false,
                    code: 1077,
                    errors
                }
            }
            let modified_key = `${model_id}:${key}`

            if (Array.isArray(add_attributes[key])) {
                for (let k of add_attributes[key]) {
                    if (typeof k === "object") {
                        i = i + 1;
                        const nested_data_id = -i;
                        tx.push([":db/add", _id, modified_key, nested_data_id])
                        for (let nested_attr of Object.keys(k)) {
                            // const nested_modified_attr = `${model_id}:${attr}:${nested_attr}` // Should we do this?
                            const nested_modified_attr = nested_attr;
                            tx.push([":db/add", nested_data_id, nested_modified_attr, k[nested_attr]])
                        }
                    }
                    tx.push([":db/add", _id, modified_key, k]);
                }
            }
            else {
                const k = add_attributes[key];
                if (typeof k === "object") {
                    i = i + 1;
                    const nested_data_id = -i;
                    tx.push([":db/add", _id, modified_key, nested_data_id])
                    for (let nested_attr of Object.keys(k)) {
                        // const nested_modified_attr = `${model_id}:${attr}:${nested_attr}` // Should we do this?
                        const nested_modified_attr = nested_attr;
                        tx.push([":db/add", nested_data_id, nested_modified_attr, k[nested_attr]])
                    }
                }
                tx.push([":db/add", _id, modified_key, k])
            }
        }
        const d = Date.now()
        tx.push([":db/add", _id, `${model_id}:updated_at`, d]);
        tx.push([":db/add", _id, `${model_id}:updated_by`, user.id]);
    }

    if (errors.length > 0) return {
        success: false,
        code: 1999,
        errors: [
            `Error in update_many_entities_helper before transacting data in datascript`,
            ...errors
        ]
    }

    try {
        transact_DS(tx, {
            origin: "update_many_entities_helper",
            operation: "update_many_entities"
        }, errors);
    } catch (error) {
        errors.push("Error in updating data in datascript for update_many => " + String(error));
        return {
            success: false,
            code: 1042,
            errors
        }
    }

    return {
        success: true,
        code: 200,
        data: [{ operation: "update_many", status: "successful" }]
    }
}

export const delete_many_entities_helper = async (app_id: string, model_id: string, token: string, data: { id: string }[]): DEFAULT_RES_ARR_P<OBJECT_TYPE<any>> => {
    const errors: string[] = [];
    const app = window.broken.offline?.app.getValue();;
    if (!app) {
        errors.push(`App object not found for ID: ${app_id}`);
        return {
            success: false,
            code: 1071,
            errors
        }
    }

    if (!token) {
        errors.push("Token is not provided in the request for delete_many_entities_helper");
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
        errors.push(`Error in parsing token in delete_many_entities_helper ${token}`);
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

    const auth_check = check_authorisation(app_id, model_id, authz, user, "delete");

    if (!auth_check.success) {
        errors.push(...auth_check.errors);
        return {
            success: false,
            code: 1014,
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

    const pk_name = model.primarykey;

    const tx: any[] = [];

    for (let each_data of data) {
        let e = get_entity_id_with_pk(model_id, pk_name, each_data.id, errors);

        if (!e.success) {
            errors.push(`Entity is not found in data with given ID ${each_data.id}`);
            return {
                success: false,
                code: 1075,
                errors
            }
        }

        const _id = e.data;
        tx.push([":db/retractEntity", _id]);
    }

    try {
        transact_DS(tx, {
            origin: 'delete_many_entities_helper',
            operation: 'delete_entity',
        }, errors);
    } catch (error) {
        errors.push("Error in creating data in datascript for delete_many => " + String(error));
        return {
            success: false,
            code: 1042,
            errors
        }
    }

    return {
        success: true,
        code: 200,
        data: [{ operation: "delete_many", status: "successful" }]
    }
}

export default {};