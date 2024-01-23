import { add_data, delete_data, get_data, put_data } from "../../db/DexieCrud";
import { db } from "../../db/DexieStores";
import { file_api_data } from "../../interfaces";
import { DEFAULT_RES_ARR_P, DEFAULT_RES_SINGLE_P, access } from "../../types";
import { file_to_base64 } from "./utils";


export const put_one_file = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: file_api_data): DEFAULT_RES_SINGLE_P<{ message: string, url: string }> => {
    const base64_string = await file_to_base64(data.file);

    const r = await add_data(db, 'files', {
        id: `${app_id}/${model_id}/${entity_id}/${prop_id}/${data.uid}`,
        file: base64_string
    })
    if (!r.success) return {
        success: false,
        code: 1052,
        errors: r.errors as string[]
    }

    return {
        success: true,
        code: 200,
        data: {
            message: "File uploaded successfully",
            url: `@resource:file:${r.data?.id}`
        }
    }
}

export const get_one_file = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uid: string): DEFAULT_RES_SINGLE_P<{ message: string, url: string }> => {
    const r = await get_data(db, 'files', {
        id: `${app_id}/${model_id}/${entity_id}/${prop_id}/${uid}`
    })
    if (!r) return {
        success: false,
        code: 1053,
        errors: ['File not found']
    }

    return {
        success: true,
        code: 200,
        data: {
            message: 'File fetched successfully',
            url: r.file
        }
    }
}

export const update_one_file = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: file_api_data): DEFAULT_RES_SINGLE_P<{ message: string, url: string }> => {
    const base64_string = await file_to_base64(data.file);

    const r = await put_data(db, 'files', {
        id: `${app_id}/${model_id}/${entity_id}/${prop_id}/${data.uid}`,
        file: base64_string
    })
    if (!r.success) return {
        success: false,
        code: 1052,
        errors: r.errors as string[]
    }

    return {
        success: true,
        code: 200,
        data: {
            message: "File updated successfully",
            url: `@resource:file:${r.data?.id}`
        }
    }
}

export const delete_one_file = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uid: string): DEFAULT_RES_SINGLE_P<{ message: string }> => {
    const r = await delete_data(db, 'files', `${app_id}/${model_id}/${entity_id}/${prop_id}/${uid}`)
    if (!r) {
        return {
            success: true,
            code: 200,
            data: {
                message: 'File deleted successfully'
            }
        };
    }

    return {
        success: false,
        code: 1054,
        errors: [r]
    };
}

export const put_many_files = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: file_api_data[]): DEFAULT_RES_ARR_P<{ message: string, url: string }> => {
    const r = await Promise.all(data.map(d => put_one_file(access, app_id, model_id, entity_id, prop_id, d)));
    const success = r.every(r => r.success);
    const errors: string[] = [];
    if (!success) {
        r.forEach(r => {
            if (!r.success) {
                errors.push(...r.errors as string[]);
            }
        })
        return {
            success: false,
            code: 1052,
            errors
        }
    }
    return {
        success: true,
        code: 200,
        data: r.map(r => r.data as { message: string, url: string, variants: string[] })
    }
}

export const get_many_files = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uids: string[]): DEFAULT_RES_ARR_P<{ message: string, url: string }> => {
    const r = await Promise.all(uids.map(uid => get_one_file(access, app_id, model_id, entity_id, prop_id, uid)));
    const success = r.every(r => r.success);
    const errors: string[] = [];
    if (!success) {
        r.forEach(r => {
            if (!r.success) {
                errors.push(...r.errors as string[]);
            }
        })
        return {
            success: false,
            code: 1053,
            errors
        }
    }
    return {
        success: true,
        code: 200,
        data: r.map(r => r.data as { message: string, url: string })
    }
}

export const update_many_files = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: file_api_data[]): DEFAULT_RES_ARR_P<{ message: string, url: string }> => {
    const r = await Promise.all(data.map(d => update_one_file(access, app_id, model_id, entity_id, prop_id, d)));
    const success = r.every(r => r.success);
    const errors: string[] = [];
    if (!success) {
        r.forEach(r => {
            if (!r.success) {
                errors.push(...r.errors as string[]);
            }
        })
        return {
            success: false,
            code: 1052,
            errors
        }
    }
    return {
        success: true,
        code: 200,
        data: r.map(r => r.data as { message: string, url: string, variants: string[] })
    }
}

export const delete_many_files = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uids: string[]): DEFAULT_RES_ARR_P<{ message: string }> => {
    const r = await Promise.all(uids.map(uid => delete_one_file(access, app_id, model_id, entity_id, prop_id, uid)));
    const success = r.every(r => r.success);
    const errors: string[] = [];
    if (!success) {
        r.forEach(r => {
            if (!r.success) {
                errors.push(...r.errors as string[]);
            }
        })
        return {
            success: false,
            code: 1054,
            errors
        }
    }
    return {
        success: true,
        code: 200,
        data: r.map(r => r.data as { message: string })
    }
}

export const get_viewable_url_from_canonical_url = async (canonical_url: string): Promise<string> => {
    return canonical_url;
}


export default {};