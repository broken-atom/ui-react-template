import { ulid } from "ulid";
import { OBJECT_TYPE } from "./types";
import "./toast-classes.css";
import { customAlphabet } from 'nanoid/non-secure';


export const check_entity_url_params = (params: URLSearchParams): string[] => {
    const errors: string[] = [];
    const app_id = params.get('app_id');
    const model_id = params.get('model_id');
    const token = params.get('token');
    if (!app_id) errors.push('app_id is not in the url provided as param');
    if (!model_id) errors.push('model_id is not in the url provided as param');
    if (!token) errors.push('token is not in the url provided as param');
    return errors;
}

export const check_resource_url_params = (params: URLSearchParams): string[] => {
    const errors: string[] = [];
    const app_id = params.get('app_id');
    const model_id = params.get('model_id');
    const entity_id = params.get('entity_id');
    const prop_id = params.get('prop_id');
    const uid = params.get('uid');
    if (!app_id) errors.push('app_id is not in the url provided as param');
    if (!model_id) errors.push('model_id is not in the url provided as param');
    if (!entity_id) errors.push('entity_id is not in the url provided as param');
    if (!prop_id) errors.push('prop_id is not in the url provided as param');
    if (!uid) errors.push('uid is not in the url provided as param');
    return errors;
}

export const generate_resource_id_from_url = (params: URLSearchParams): string => {
    const app_id = params.get('app_id');
    const model_id = params.get('model_id');
    const entity_id = params.get('entity_id');
    const prop_id = params.get('prop_id');
    const uid = params.get('uid');
    return `${app_id}/${model_id}/${entity_id}/${prop_id}/${uid}`;
}

export const generate_ulid = (): string => {
    return ulid().toLowerCase();
}

export const generate_nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 5);
export const generate_nanoid_al = customAlphabet('abcdefghijklmnopqrstuvwxyz', 5);

export const create_toast = (text: string, type?: "log" | "error" | "warn" | "success", timer?: number) => { // Timer is in seconds
    const toast = document.createElement('div');
    toast.className = type ? type : "log";
    toast.id = 'toast';
    toast.innerText = text;
    document.querySelector('body')?.appendChild(toast);
    // If timer is given, then use that timer, otherwise use 2 seconds
    const timeout = timer ? timer * 1000 : 2000;
    setTimeout(() => {
        toast.className = toast.className.replace("show", "");
        document.querySelector('body')?.removeChild(toast);
    }, timeout);
}


export const generate_search_params_object = (params: URLSearchParams): OBJECT_TYPE<string> => {
    const obj: OBJECT_TYPE<string> = {};
    for (const [key, value] of params) {
        obj[key] = value;
    }
    return obj;
}

export default {};