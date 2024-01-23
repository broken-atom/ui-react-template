import { broken_init } from "./init/broken";
import { online_init } from "./init/online";

console.log("BROKEN STDLIB - LOADED ONLINE MODULE");
window.broken = window.broken || broken_init;
window.broken.online = window.broken.online || online_init;
window.broken_on_login_success = window.broken_on_login_success || null;

const module_init = (app_id: string) => {
    const B = window.broken;
    if (!B || !B.online) return console.warn("window.broken or window.broken.online is not present");

    window.broken.app_id = app_id;

    // Get token and user from localStorage
    const token_online = window.localStorage.getItem(`${app_id}_token_online`);
    const user_online = window.localStorage.getItem(`${app_id}_user_online`);

    if (!token_online) console.warn("No token found in localStorage");
    if (!user_online) console.warn("No user found in localStorage");

    let user_online_parsed: any = {};
    try {
        user_online_parsed = JSON.parse(user_online || '{}');
    }
    catch (e) {
        console.warn("Could not parse user object from localStorage");
    }

    B.online.auth.token = token_online ? token_online : null;
    B.online.auth.user = user_online ? user_online_parsed : null;
}

const check_for_token = () => {
    const p = new URLSearchParams(window.location.search);
    let ss: any = {};
    for (const [key, value] of p.entries()) {
        ss[key] = value;
    }

    const app_id = ss.app_id;
    const token = ss.token;
    const module = ss.module;
    const user = ss.user;
    const login_errors = ss.login_errors;

    if (token && module && user && app_id) {
        if (module === "online") {
            window.localStorage.setItem(`${app_id}_user_online`, user || '');
            window.localStorage.setItem(`${app_id}_token_online`, token || '');
        }
        // Remove token, module, app_id and user from url
        const url = window.location.href;
        const url_obj = new URL(url);
        url_obj.searchParams.delete('token');
        url_obj.searchParams.delete('module');
        url_obj.searchParams.delete('app_id');
        url_obj.searchParams.delete('user');
        window.history.replaceState({}, document.title, url_obj.href);

        // Let the application know the login is successful.
        let user_parsed: any = null;

        try {
            user_parsed = JSON.parse(user);
        }
        catch (e) {
            console.warn("Could not parse user object from url");
        }

        if (window.broken_on_login_success) window.broken_on_login_success(token, user_parsed);
    }

    if (login_errors && module) {
        const url = window.location.href;
        const url_obj = new URL(url);
        url_obj.searchParams.delete('module');
        url_obj.searchParams.delete('login_errors');
        window.history.replaceState({}, document.title, url_obj.href);

        // Show the errors in the application
        let errors: string[] = [];

        try {
            errors = JSON.parse(login_errors);
        }
        catch (e) {
            console.warn("Could not parse login_errors object from url");
        }

        window.broken.utils.feedback(`error while logging in : ${errors.join(", ")}`);
    }
}

const init = (app_id: string) => {
    module_init(app_id);
    check_for_token();
}


window.broken.init = init;

export default {
    init
};