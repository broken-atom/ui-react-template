import { DEFAULT_RES_SINGLE_P } from "./types";

export const fetch_get = async (url: string): DEFAULT_RES_SINGLE_P<any> => {
    const errors: string[] = [];

    const res = await fetch(url, {
        method: 'GET',
    }).catch(e => {
        console.log(e);
        errors.push(JSON.stringify(e));
        return null;
    });

    if (!res) return {
        success: false,
        code: 2001,
        errors
    };

    const readable_res = await res.json().catch(e => {
        console.log(e);
        errors.push(JSON.stringify(e));
        return null;
    });

    if (!readable_res) return {
        success: false,
        code: 2002,
        errors
    };


    if (!readable_res.success) return {
        success: false,
        code: readable_res.code || 2003,
        errors: readable_res.errors
    }

    return {
        success: true,
        code: 200,
        data: readable_res.data
    };
}

export const fetch_post = async (url: string, post_object: any): DEFAULT_RES_SINGLE_P<any> => {
    const errors: string[] = [];

    const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(post_object)
    }).catch(e => {
        console.log(e);
        errors.push(JSON.stringify(e));
        return null;
    });

    if (!res) return {
        success: false,
        code: 2001,
        errors
    };

    const readable_res = await res.json().catch(e => {
        console.log(e);
        errors.push(JSON.stringify(e));
        return null;
    });

    if (!readable_res) return {
        success: false,
        code: 2002,
        errors
    };

    if (!readable_res.success) return {
        success: false,
        code: readable_res.code || 2003,
        errors: readable_res.errors
    }

    return {
        success: true,
        code: 200,
        data: readable_res.data
    };
}

export const fetch_put = async (url: string, put_object: any): DEFAULT_RES_SINGLE_P<any> => {
    const errors: string[] = [];

    const res = await fetch(url, {
        method: 'PUT',
        body: JSON.stringify(put_object)
    }).catch(e => {
        console.log(e);
        errors.push(JSON.stringify(e));
        return null;
    });

    if (!res) return {
        success: false,
        code: 2001,
        errors
    };

    const readable_res = await res.json().catch(e => {
        console.log(e);
        errors.push(JSON.stringify(e));
        return null;
    });

    if (!readable_res) return {
        success: false,
        code: 2002,
        errors
    };

    if (!readable_res.success) return {
        success: false,
        code: readable_res.code || 2003,
        errors: readable_res.errors
    }

    return {
        success: true,
        code: 200,
        data: readable_res.data
    };
}

export const fetch_delete = async (url: string): DEFAULT_RES_SINGLE_P<any> => {
    const errors: string[] = [];

    const res = await fetch(url, {
        method: 'DELETE',
    }).catch(e => {
        console.log(e);
        errors.push(JSON.stringify(e));
        return null;
    });

    if (!res) return {
        success: false,
        code: 2001,
        errors
    };

    const readable_res = await res.json().catch(e => {
        console.log(e);
        errors.push(JSON.stringify(e));
        return null;
    });

    if (!readable_res) return {
        success: false,
        code: 2002,
        errors
    };

    if (!readable_res.success) return {
        success: false,
        code: readable_res.code || 2003,
        errors: readable_res.errors
    }

    return {
        success: true,
        code: 200,
        data: readable_res.data
    };
}


export default {};