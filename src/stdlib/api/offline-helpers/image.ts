import { add_data, delete_data, get_data, put_data } from "../../db/DexieCrud";
import { db } from "../../db/DexieStores";
import { image_api_data } from "../../interfaces";
import { DEFAULT_RES_ARR_P, DEFAULT_RES_SINGLE_P, access } from "../../types";
import { file_to_base64, is_base64_url_image } from "./utils";


export const put_one_image = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: image_api_data): DEFAULT_RES_SINGLE_P<{ message: string, url: string, variants: string[] }> => {
    // Check if the data.image is of instance File. If not, check if it is a valid base64 image string or else return error.
    if (!(data.image instanceof File)) {
        const s = await is_base64_url_image(data.image);
        if (!s) return {
            success: false,
            code: 1051,
            errors: ['Invalid base64 image string']
        }
    }
    let base64_string: string = '';

    if (!(data.image instanceof File)) { // Here we know that data.image is a valid base64 image string
        base64_string = data.image;
    }
    else { // Here we know that data.image is of instance File
        base64_string = await file_to_base64(data.image);
    }

    const r = await add_data(db, 'images', {
        id: `${app_id}/${model_id}/${entity_id}/${prop_id}/${data.uid}`,
        image: base64_string
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
            message: "Image uploaded successfully",
            url: `@resource:image:${r.data?.id}`,
            variants: []
        }
    }
}

export const get_one_image = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uid: string): DEFAULT_RES_SINGLE_P<{ message: string, url: string }> => {
    const r = await get_data(db, 'images', {
        id: `${app_id}/${model_id}/${entity_id}/${prop_id}/${uid}`
    })
    if (!r) return {
        success: false,
        code: 1053,
        errors: ['Image not found']
    }

    return {
        success: true,
        code: 200,
        data: {
            message: 'Image fetched successfully',
            url: r.image
        }
    }
}

export const update_one_image = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: image_api_data): DEFAULT_RES_SINGLE_P<{ message: string, url: string, variants: string[] }> => {
    // Check if the data.image is of instance File. If not, check if it is a valid base64 image string or else return error.
    if (!(data.image instanceof File)) {
        const s = await is_base64_url_image(data.image);
        if (!s) return {
            success: false,
            code: 1051,
            errors: ['Invalid base64 image string']
        }
    }

    let base64_string: string = '';

    if (!(data.image instanceof File)) { // Here we know that data.image is a valid base64 image string
        base64_string = data.image;
    }
    else { // Here we know that data.image is of instance File
        base64_string = await file_to_base64(data.image);
    }

    const r = await put_data(db, 'images', {
        id: `${app_id}/${model_id}/${entity_id}/${prop_id}/${data.uid}`,
        image: base64_string
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
            message: "Image updated successfully",
            url: `@resource:image:${r.data?.id}`,
            variants: []
        }
    }
}

export const delete_one_image = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uid: string): DEFAULT_RES_SINGLE_P<{ message: string }> => {
    const r = await delete_data(db, 'images', `${app_id}/${model_id}/${entity_id}/${prop_id}/${uid}`)
    if (!r) {
        return {
            success: true,
            code: 200,
            data: {
                message: 'Image deleted successfully'
            }
        };
    }

    return {
        success: false,
        code: 1054,
        errors: [r]
    };
}

export const put_many_images = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: image_api_data[]): DEFAULT_RES_ARR_P<{ message: string, url: string, variants: string[] }> => {
    // Return success if all are success, else return error
    const r = await Promise.all(data.map(d => put_one_image(access, app_id, model_id, entity_id, prop_id, d)));
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

export const get_many_images = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uids: string[]): DEFAULT_RES_ARR_P<{ message: string, url: string }> => {
    const r = await Promise.all(uids.map(uid => get_one_image(access, app_id, model_id, entity_id, prop_id, uid)));
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

export const update_many_images = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: image_api_data[]): DEFAULT_RES_ARR_P<{ message: string, url: string, variants: string[] }> => {
    const r = await Promise.all(data.map(d => update_one_image(access, app_id, model_id, entity_id, prop_id, d)));
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

export const delete_many_images = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uids: string[]): DEFAULT_RES_ARR_P<{ message: string }> => {
    const r = await Promise.all(uids.map(uid => delete_one_image(access, app_id, model_id, entity_id, prop_id, uid)));
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


export default {};