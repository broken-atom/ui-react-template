import { image_api_data } from "../../interfaces";
import { DEFAULT_RES_ARR_P, DEFAULT_RES_SINGLE_P, access } from "../../types";
import { generate_resource_signed_url, is_base64_url_image } from "./utils";


export const put_one_image = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: image_api_data): DEFAULT_RES_SINGLE_P<{message: string, url: string, variants: string[]}> => {
    // Check if the data.image is of instance File. If not, check if it is a valid base64 image string or else return error.
    if (!(data.image instanceof File)) {
        const s = await is_base64_url_image(data.image);
        if (!s) return {
            success: false,
            code: 1051,
            errors: ['Invalid base64 image string']
        }
    }
    const signed_url = await generate_resource_signed_url("IMAGE", access, 'POST', app_id, model_id, entity_id, prop_id, data.uid);
    if (!signed_url.success) {
        return {
            success: false,
            code: 1059,
            errors: ['Could not generate signed url', ...signed_url.errors]
        }
    }
    const form = new FormData();
    if (!(data.image instanceof File)) { // Here we know that data.image is a valid base64 image string
        form.append('url', data.image);
    }
    else { // Here we know that data.image is of instance File
        form.append('file', data.image);
    }

    const r = await fetch(signed_url.data.signed_url, {
        method: 'POST',
        body: form
    }).catch(e => {
        console.log(e)
        return null;
    })

    if (!r) {
        return {
            success: false,
            code: 1060,
            errors: [`Could not upload into signed url here: ${signed_url}`]
        }
    }

    const res = await r.json();

    if(!res.success) return {
        success: false,
        code: res.code || 2003,
        errors: [res.errors]
    }

    const public_url = res.result.variants.filter((x: string) => x.split("/").pop() === "public")[0];

    if (!public_url) return {
        success: false,
        code: 1061,
        errors: ['Could not find public url']
    }

    return {
        success: true,
        code: 200,
        data: {
            message: 'Image uploaded successfully',
            url: public_url,
            variants: res.result.variants as string[]
        }
    }
}

export const get_one_image = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uid: string): DEFAULT_RES_SINGLE_P<{message: string, url: string}> => {
    const signed_url = await generate_resource_signed_url("IMAGE", access, 'GET', app_id, model_id, entity_id, prop_id, uid);
    if (!signed_url.success) {
        return {
            success: false,
            code: 1059,
            errors: ['Could not generate signed url', ...signed_url.errors]
        }
    }
    // Special character is getting encoded in the put url, so the result should be encoded url
    return {
        success: true,
        code: 200,
        data: {
            message: 'Image fetched successfully',
            url: encodeURI(signed_url.data.signed_url)
        }
    }
}

export const update_one_image = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: image_api_data): DEFAULT_RES_SINGLE_P<{message: string, url: string, variants: string[]}> => {
    // Check if the data.image is of instance File. If not, check if it is a valid base64 image string or else return error.
    if (!(data.image instanceof File)) {
        const s = await is_base64_url_image(data.image);
        if (!s) return {
            success: false,
            code: 1051,
            errors: ['Invalid base64 image string']
        }
    }
    const signed_url = await generate_resource_signed_url("IMAGE", access, 'PUT', app_id, model_id, entity_id, prop_id, data.uid);
    if (!signed_url.success) {
        return {
            success: false,
            code: 1059,
            errors: ['Could not generate signed url', ...signed_url.errors]
        }
    }
    const form = new FormData();
    if (!(data.image instanceof File)) { // Here we know that data.image is a valid base64 image string
        form.append('url', data.image);
    }
    else { // Here we know that data.image is of instance File
        form.append('file', data.image);
    }

    const r = await fetch(signed_url.data.signed_url, {
        method: 'POST',
        body: form
    }).catch(e => {
        console.log(e)
        return null;
    })

    if (!r) {
        return {
            success: false,
            code: 1060,
            errors: [`Could not upload into signed url here: ${signed_url}`]
        }
    }

    const res = await r.json();

    if(!res.success) return {
        success: false,
        code: res.code || 2003,
        errors: [res.errors]
    }

    const public_url = res.result.variants.filter((x: string) => x.split("/").pop() === "public")[0];

    if (!public_url) return {
        success: false,
        code: 1061,
        errors: ['Could not find public url']
    }

    return {
        success: true,
        code: 200,
        data: {
            message: 'Image updated successfully',
            url: public_url,
            variants: res.result.variants as string[]
        }
    }
}

export const delete_one_image = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uid: string): DEFAULT_RES_SINGLE_P<{message: string}> => {
    const signed_url = await generate_resource_signed_url("IMAGE", access, 'DELETE', app_id, model_id, entity_id, prop_id, uid);
    if (!signed_url.success) {
        return {
            success: false,
            code: 1059,
            errors: ['Could not generate signed url', ...signed_url.errors]
        }
    }

    return {
        success: true,
        code: 200,
        data: {
            message: 'Image deleted successfully'
        }
    }
}

export const put_many_images = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: image_api_data[]): DEFAULT_RES_ARR_P<{message: string, url: string, variants: string[]}> => {
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
            code: 1062,
            errors
        }
    }
    return {
        success: true,
        code: 200,
        data: r.map(r => r.data as {message: string, url: string, variants: string[]})
    }
}

export const get_many_images = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uids: string[]): DEFAULT_RES_ARR_P<{message: string, url: string}> => {
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
            code: 1063,
            errors
        }
    }
    return {
        success: true,
        code: 200,
        data: r.map(r => r.data as {message: string, url: string})
    }
}

export const update_many_images = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, data: image_api_data[]): DEFAULT_RES_ARR_P<{message: string, url: string, variants: string[]}> => {
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
            code: 1064,
            errors
        }
    }
    return {
        success: true,
        code: 200,
        data: r.map(r => r.data as {message: string, url: string, variants: string[]})
    }
}

export const delete_many_images = async (access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uids: string[]): DEFAULT_RES_ARR_P<{message: string}> => {
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
            code: 1065,
            errors
        }
    }
    return {
        success: true,
        code: 200,
        data: r.map(r => r.data as {message: string})
    }
}


export default {};