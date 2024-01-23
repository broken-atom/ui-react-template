import { broken_init } from "../init/broken";
import { offline_init } from "../init/offline";
import { DEFAULT_RES_SINGLE_P } from "../types";
import { login_helper } from "./offline-helpers/auth";


const login = async (email: string, app_id: string, role?: string): DEFAULT_RES_SINGLE_P<any> => {
    const app = window.broken.offline?.app?.getValue();
    if (!app) return {
        success: false,
        code: 1007,
        errors: [`App ${app_id} not found`]
    };
    const login_type = app.login.type;
    if (!login_type) return {
        success: false,
        code: 1005,
        errors: [`Login type not found in app ${app_id}`]
    }
    if (login_type === "none") {
        return {
            success: false,
            code: 1008,
            errors: ["User trying to login to the application where it is not possible (Login type is none)"]
        }
    }
    else if (login_type === "public") {
        role = role || app.login.default_role;
    }
    else if (login_type === "private") {
        const emails_accepted: { email: string, role: string }[] = []; // @todo: Go to creators page, check if the person has access or just reject it.
        if (!emails_accepted.map(x => x.email).includes(email)) {
            return {
                success: false,
                code: 1003,
                errors: ["Unauthorised login to the application - User doesn't have permission to login to the private auth app"]
            }
        }
        role = role || emails_accepted.filter(x => x.email === email)[0].role;
    }
    else if (login_type === "domain") {
        let role_found = false;
        const domains = app.login.domains || [];
        for (let d of domains) {
            if (d.name === email.split("@")[1]) {
                role = role || d.default_role;
                role_found = true;
                break;
            }
            else {
                continue;
            }
        }
        if (!role_found) {
            return {
                success: false,
                code: 1004,
                errors: ["Unauthorised login to the application - User doesn't have permission to login to the domain auth app"]
            }
        }
    }
    else return {
        success: false,
        code: 1006,
        errors: [`Given login type ${login_type} is not valid`]
    }
    const r = login_helper({ type: "email", email }, app_id, role || "");
    return r;
}

const otp_create = async (phone_number: string, app_name: string, app_id: string, role?: string): DEFAULT_RES_SINGLE_P<any> => {
    const app = window.broken.offline?.app?.getValue();
    if (!app) return {
        success: false,
        code: 1007,
        errors: [`App ${app_id} not found`]
    };
    const login_type = app.login.type;
    if (!login_type) return {
        success: false,
        code: 1005,
        errors: [`Login type not found in app ${app_id}`]
    }
    if (login_type === "none") {
        return {
            success: false,
            code: 1008,
            errors: ["User trying to login to the application where it is not possible (Login type is none)"]
        }
    }
    else if (login_type === "public") {
        role = role || app.login.default_role;
    }
    else if (login_type === "private") {
        return {
            success: false,
            code: 1010,
            errors: [`Given login type ${login_type} is not valid for phone number login`]
        }
    }
    else if (login_type === "domain") {
        return {
            success: false,
            code: 1010,
            errors: [`Given login type ${login_type} is not valid for phone number login`]
        }
    }
    else return {
        success: false,
        code: 1006,
        errors: [`Given login type ${login_type} is not valid`]
    }
    const r = login_helper({ type: "number", number: phone_number }, app_id, role || "");
    return r;
}

const otp_verify = async (phone_number: string, otp: string, hash: string, app_id: string, role?: string): DEFAULT_RES_SINGLE_P<any> => {
    const app = window.broken.offline?.app?.getValue();
    if (!app) return {
        success: false,
        code: 1007,
        errors: [`App ${app_id} not found`]
    };
    const login_type = app.login.type;
    if (!login_type) return {
        success: false,
        code: 1005,
        errors: [`Login type not found in app ${app_id}`]
    }
    if (login_type === "none") {
        return {
            success: false,
            code: 1008,
            errors: ["User trying to login to the application where it is not possible (Login type is none)"]
        }
    }
    else if (login_type === "public") {
        role = role || app.login.default_role;
    }
    else if (login_type === "private") {
        return {
            success: false,
            code: 1010,
            errors: [`Given login type ${login_type} is not valid for phone number login`]
        }
    }
    else if (login_type === "domain") {
        return {
            success: false,
            code: 1010,
            errors: [`Given login type ${login_type} is not valid for phone number login`]
        }
    }
    else return {
        success: false,
        code: 1006,
        errors: [`Given login type ${login_type} is not valid`]
    }
    const r = login_helper({ type: "number", number: phone_number }, app_id, role || "");
    return r;
}

const logout = (app_id: string) => {
    window.broken = window.broken || broken_init;
    window.broken.offline = window.broken.offline || offline_init;
    window.localStorage.removeItem(`${app_id}_user_offline`);
    window.localStorage.removeItem(`${app_id}_token_offline`);
    window.broken.offline.auth.token = null;
    window.broken.offline.auth.user = null;
    return;
}

const oauth_login = async (app_id: string, provider: string, role?: string) => {
    const email = `${provider}@${provider}.com`;
    const r = await login(email, app_id, role);
    return r;
}

const offline = {
    user: window.broken ? (window.broken.offline ? window.broken.offline.auth.user : null) : null,
    token: window.broken ? (window.broken.offline ? window.broken.offline.auth.token : null) : null,
    login,
    otp: {
        create: otp_create,
        verify: otp_verify,
    },
    logout,
    signup: () => { },
    verify_token: () => { },
    refresh_token: () => { },
    oauth: {
        google: {
            login: (app_id: string, role?: string) => oauth_login(app_id, "google", role),
        },
        microsoft: {
            login: (app_id: string, role?: string) => oauth_login(app_id, "microsoft", role),
        },
        linkedin: {
            login: (app_id: string, role?: string) => oauth_login(app_id, "linkedin", role),
        },
        github: {
            login: (app_id: string, role?: string) => oauth_login(app_id, "github", role),
        },
        twitter: {
            login: (app_id: string, role?: string) => oauth_login(app_id, "twitter", role),
        },
    }
}

export default offline;