import { broken_init } from "../../init/broken";
import { offline_init } from "../../init/offline";
import { DEFAULT_RES_SINGLE, OBJECT_TYPE, app_object_type, user_type } from "../../types";
import { generate_ulid } from "../../utils";

const gen_user_with_email = (email: string, app_id: string, role: string): user_type => {
    const user: user_type = {
        // id is email, email id is supposed to be unique
        id: email,
        app_id: app_id,
        name: email.split('@')[0],
        image_url: 'https://cdn-icons-png.flaticon.com/512/1159/1159740.png',
        role,
        universe: 0,
        level: 1,
        created_at: Date.now(),
        org: 'Self',
        team: 'Core',
        verified_at: Date.now(),
        email: email,
        modified_at: Date.now()
    }
    return user;
}

const gen_user_with_number = (phone_number: string, app_id: string, role: string): user_type => {
    const user: user_type = {
        // id is phone_number, phone_number is supposed to be unique
        id: phone_number,
        app_id: app_id,
        name: phone_number,
        image_url: 'https://cdn-icons-png.flaticon.com/512/1159/1159740.png',
        role,
        universe: 0,
        level: 1,
        created_at: Date.now(),
        org: 'Self',
        team: 'Core',
        verified_at: Date.now(),
        mobile: phone_number,
        modified_at: Date.now()
    }
    return user;
}

export const login_helper = (login_params: { type: 'email', email: string } | { type: 'number', number: string }, app_id: string, role: string): DEFAULT_RES_SINGLE<OBJECT_TYPE<any>> => {
    let user: user_type | null = null;

    if (login_params.type === 'email') {
        user = gen_user_with_email(login_params.email, app_id, role);
    }
    else if (login_params.type === 'number') {
        user = gen_user_with_number(login_params.number, app_id, role);
    }

    if (!user) {
        return {
            success: false,
            code: 1009,
            errors: ["User is null. Generation failed for user"]
        }
    }

    window.broken = window.broken || broken_init;
    window.broken.offline = window.broken.offline || offline_init;
    window.localStorage.setItem(`${app_id}_user_offline`, JSON.stringify(user));
    window.localStorage.setItem(`${app_id}_token_offline`, JSON.stringify(user));
    window.broken.offline.auth.token = JSON.stringify(user);
    window.broken.offline.auth.user = user;

    return {
        success: true,
        code: 200,
        data: {
            user: user,
            token: JSON.stringify(user),
            response: "JWT TOKEN SUCCESSFULLY CREATED"
        }
    }
}

export default {};