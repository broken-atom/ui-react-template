import { get_many_filters, DEFAULT_RES_SINGLE_P, access, resource, ds_extended_api, ds_native_api } from "../../types";


export const entity_worker_url_v1 = 'https://entity.brokenatom.io/api/v1/entity';
export const datascript_worker_url = 'https://datascript.brokenatom.io/api/v2';
export const uploads_worker_url = 'https://uploads.brokenatom.io';

export const generate_entity_base_url = (operation: string, app_id: string, model_id: string, token: string): string => {
    return `${entity_worker_url_v1}/${operation}?app_id=${app_id}&model_id=${model_id}&token=${token}`;
}

// This function is used to generate url for resource[File/Image].  Hierarchy => Type[What is the type of resource] -> Access[Is the resource public or private?] -> App ID -> Model ID -> Entity ID -> Prop ID -> File Name
export const generate_resource_base_url = (resource: resource, access: access, app_id: string, model_id: string, entity_id: string, prop_id: string, uid: string): string => {
    return `${uploads_worker_url}/${resource.toLowerCase()}/${access.toLowerCase()}?app_id=${app_id}&model_id=${model_id}&entity_id=${entity_id}&prop_id=${prop_id}&uid=${uid}`;
}

export const generate_datascript_native_base_url = (type: ds_native_api, app_id: string, token: string, entity_id?: string): string => {
    return `${datascript_worker_url}/${type.toLowerCase()}?app_id=${app_id}&token=${token}${entity_id ? '&entity_id=' + entity_id : ''}`;
}

export const generate_datascript_extended_base_url = (type: ds_extended_api, app_id: string, model_id: string, token: string): string => {
    return `${datascript_worker_url}/${type.toLowerCase()}?app_id=${app_id}&model_id=${model_id}&token=${token}`;
}

export const generate_resource_signed_url = async (resource: resource, access: access, method: 'POST' | 'GET' | 'PUT' | 'DELETE', app_id: string, model_id: string, entity_id: string, prop_id: string, uid: string): DEFAULT_RES_SINGLE_P<{ return_url: string, signed_url: string }> => {
    const errors: string[] = [];
    // We require signed url for image only in create which gives a return of multiple variants of urls. For get, we can directly access public link
    const url = generate_resource_base_url(resource, access, app_id, model_id, entity_id, prop_id, uid);
    const res = await fetch(url, {
        method: method
    }).catch(e => {
        errors.push(e);
        return null;
    });

    if (!res) return {
        success: false,
        code: 2001,
        errors
    };

    const r = await res.json();

    if (!r || !r.success) return {
        success: false,
        code: r.code || 2003,
        errors: r.errors
    };

    if (!r.data || !r.data[0] || !r.data[0].url) return {
        success: false,
        code: 1058,
        errors: ['No signed url found in the response in generate_resource_signed_url']
    }

    return {
        success: true,
        code: 200,
        data: {
            return_url: url,
            signed_url: r.data[0].url as string
        }
    }
}

export const generate_entity_get_many_url = (base_url: string, filters?: get_many_filters): string => {
    if (!filters) return base_url;

    const { attribute, start_key, end_key, limit, forward, values } = filters;

    let url = `${base_url}&attribute=${attribute}`;

    if (values) {
        url += `&values=${values.join(',')}`;
        return url;
    }

    if (start_key) url += `&start_key=${start_key}`;
    if (end_key) url += `&end_key=${end_key}`;
    if (limit) url += `&limit=${limit}`;
    if (forward) url += `&forward=${forward}`;

    return url;
}

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


export default {};