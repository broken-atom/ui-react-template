import { fetch_post } from "../Fetch";
import { broken_init } from "../init/broken";
import { online_init } from "../init/online";
import { DEFAULT_RES_SINGLE_P } from "../types";

const login_url = "https://user-api.brokenatom.io/api/v1/login/app/email";
const otp_base_url = "https://user-api.brokenatom.workers.dev/api/v1/login/app/otp";
const oauth_redirect_url = "https://user-api.brokenatom.io/api/v1/login/callback/";
const google_redirect_url = oauth_redirect_url + "google/app";
const microsoft_redirect_url = oauth_redirect_url + "microsoft/app";
const linkedin_redirect_url = oauth_redirect_url + "linkedin/app";
const github_redirect_url = oauth_redirect_url + "github/app";
const twitter_redirect_url = oauth_redirect_url + "twitter/app"
const google_client_id = '1027174537777-un09m7gfcah2l4coiq8ef8eru0jir9c0.apps.googleusercontent.com';
const microsoft_client_id = '3875c7bd-2b84-4868-a115-fc001403e351';
const linkedin_client_id = '868uso32rirzl3';
const github_client_id = '70ab8ce114c160b23b96';


const login = async (email: string, app_id: string, role?: string): DEFAULT_RES_SINGLE_P<any> => {
    const client_id = window.localStorage.getItem(`${app_id}_client_id`) || '';
    if (!client_id) {
        const post_object = {
            email,
            app_id
        }

        const res = await fetch_post(login_url, post_object);

        if (!res.success) {
            console.warn(`ERROR WHILE LOGGING IN WITH NO CLIENT ID : ${res.errors}`);
            return res;
        }

        window.localStorage.setItem(`${app_id}_client_id`, res.data.client_id);

        return res;
    }

    const post_object = {
        email,
        app_id,
        client_id
    }

    const res = await fetch_post(login_url, post_object);

    if (!res.success) {
        console.warn(`ERROR WHILE LOGGING IN WITH CLIENT ID - ${client_id} : ${res.errors}`);
        console.log("Removing client_id");
        window.localStorage.removeItem(`${app_id}_client_id`);
        return res;
    }

    window.localStorage.removeItem(`${app_id}_client_id`);

    // Set token and user in online auth
    window.broken = window.broken || broken_init;
    window.broken.online = window.broken.online || online_init;
    window.localStorage.setItem(`${app_id}_user_online`, JSON.stringify(res.data.user) || '');
    window.localStorage.setItem(`${app_id}_token_online`, res.data.token || '');
    window.broken.online.auth.user = res.data.user;
    window.broken.online.auth.token = res.data.token;
    return res;
}

const otp_create = async (phone_number: string, app_name: string, app_id: string, role?: string): DEFAULT_RES_SINGLE_P<any> => {
    const post_object = {
        app_name: app_name,
        phone_number: `91${phone_number}`,
        app_id: app_id
    }

    const res = await fetch_post(`${otp_base_url}/create`, post_object);

    if (!res.success) {
        console.warn(`ERROR WHILE CREATING OTP : ${res.errors}`);
        return res;
    }

    return res;
}

const otp_verify = async (phone_number: string, otp: string, hash: string, app_id: string, role?: string): DEFAULT_RES_SINGLE_P<any> => {
    const post_object = {
        phone_number: `91${phone_number}`,
        otp: otp,
        hash: hash,
        app_id: app_id
    }

    const res = await fetch_post(`${otp_base_url}/verify`, post_object);

    if (!res.success) {
        console.warn(`ERROR WHILE VERIFYING OTP : ${res.errors}`);
        return res;
    }

    // Set token and user in online auth
    window.broken = window.broken || broken_init;
    window.broken.online = window.broken.online || online_init;
    window.localStorage.setItem(`${app_id}_user_online`, JSON.stringify(res.data.user) || '');
    window.localStorage.setItem(`${app_id}_token_online`, res.data.token || '');
    window.broken.online.auth.user = res.data.user;
    window.broken.online.auth.token = res.data.token;
    return res;
}

const logout = (app_id: string) => {
    window.broken = window.broken || broken_init;
    window.broken.online = window.broken.online || online_init;
    window.localStorage.removeItem(`${app_id}_user_online`);
    window.localStorage.removeItem(`${app_id}_client_id`);
    window.localStorage.removeItem(`${app_id}_token_online`);
    window.broken.online.auth.user = null;
    window.broken.online.auth.token = null;
    return;
}

const google_login = async (app_id: string, role?: string) => {
    var oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

    // Parameters to pass to OAuth 2.0 endpoint.
    var params: any = {
        'client_id': google_client_id,
        'redirect_uri': google_redirect_url,
        'response_type': 'token',
        'scope': "email profile https://www.googleapis.com/auth/userinfo.email openid https://www.googleapis.com/auth/userinfo.profile",
        'include_granted_scopes': 'true',
        'state': JSON.stringify({
            app_id,
            pathname: window.location.pathname,
            search: window.location.search.slice(1),
            origin: window.location.origin
        }),
    };

    // Create <form> element to submit parameters to OAuth 2.0 endpoint.
    var form = document.createElement('form');
    form.setAttribute('method', 'GET'); // Send as a GET request.
    form.setAttribute('action', oauth2Endpoint);

    // Add form parameters as hidden input values.
    for (var p in params) {
        var input = document.createElement('input');
        input.setAttribute('type', 'hidden');
        input.setAttribute('name', p);
        input.setAttribute('value', params[p]);
        form.appendChild(input);
    }

    // Add form to page and submit it to open the OAuth 2.0 endpoint.
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}

const microsoft_login = async (app_id: string, role?: string) => {
    const oauth2Endpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

    const params: any = {
        'client_id': microsoft_client_id,
        'redirect_uri': microsoft_redirect_url,
        'response_type': 'token',
        'scope': "user.read openid profile email offline_access",
        'state': JSON.stringify({
            app_id,
            pathname: window.location.pathname,
            search: window.location.search.slice(1),
            origin: window.location.origin
        }),
    };

    var form = document.createElement('form');
    form.setAttribute('method', 'GET'); // Send as a POST request.
    form.setAttribute('action', oauth2Endpoint);

    for (var p in params) {
        var input = document.createElement('input');
        input.setAttribute('type', 'hidden');
        input.setAttribute('name', p);
        input.setAttribute('value', params[p]);
        form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}

const linkedin_login = async (app_id: string, role?: string) => { // https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow?context=linkedin%2Fcontext&tabs=HTTPS1
    const oauth2Endpoint = 'https://www.linkedin.com/oauth/v2/authorization';

    const params: any = {
        'client_id': linkedin_client_id,
        'redirect_uri': linkedin_redirect_url,
        'response_type': 'code', // Code should be used to get token
        'scope': "openid profile email",
        'state': JSON.stringify({
            app_id,
            pathname: window.location.pathname,
            search: window.location.search.slice(1),
            origin: window.location.origin
        }),
    };

    // Create <form> element to submit parameters to OAuth 2.0 endpoint.
    var form = document.createElement('form');
    form.setAttribute('method', 'GET'); // Send as a POST request.
    form.setAttribute('action', oauth2Endpoint);

    // Add form parameters as hidden input values.
    for (var p in params) {
        var input = document.createElement('input');
        input.setAttribute('type', 'hidden');
        input.setAttribute('name', p);
        input.setAttribute('value', params[p]);
        form.appendChild(input);
    }

    // Add form to page and submit it to open the OAuth 2.0 endpoint.
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}

const github_login = async (app_id: string, role?: string) => {
    var oauth2Endpoint = 'https://github.com/login/oauth/authorize';

    // Parameters to pass to OAuth 2.0 endpoint.
    var params: any = {
        'client_id': github_client_id,
        'redirect_uri': github_redirect_url,
        'scope': "user",
        'state': JSON.stringify({
            app_id,
            pathname: window.location.pathname,
            search: window.location.search.slice(1),
            origin: window.location.origin
        }),
    };

    // Create <form> element to submit parameters to OAuth 2.0 endpoint.
    var form = document.createElement('form');
    form.setAttribute('method', 'GET'); // Send as a GET request.
    form.setAttribute('action', oauth2Endpoint);

    // Add form parameters as hidden input values.
    for (var p in params) {
        var input = document.createElement('input');
        input.setAttribute('type', 'hidden');
        input.setAttribute('name', p);
        input.setAttribute('value', params[p]);
        form.appendChild(input);
    }

    // Add form to page and submit it to open the OAuth 2.0 endpoint.
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}

const twitter_login = async (app_id: string, role?: string) => {
    return console.log("Twitter login not implemented yet");
}

const online = {
    user: window.broken ? (window.broken.online ? window.broken.online.auth.user : null) : null,
    token: window.broken ? (window.broken.online ? window.broken.online.auth.token : null) : null,
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
            login: google_login,
        },
        microsoft: {
            login: microsoft_login,
        },
        linkedin: {
            login: linkedin_login,
        },
        github: {
            login: github_login,
        },
        twitter: {
            login: twitter_login,
        },
    }
}

export default online;