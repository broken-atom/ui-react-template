import { utils, offline, online } from '../interfaces';

declare global {
    interface Window {
        broken_on_login_success: (token: string, user: user_type) => void | null,
        broken: {
            app_id: string | null,
            is_offline?: boolean,
            utils: utils,
            offline?: offline,
            online?: online,
            current?: online | offline,
            rxjs: any,
            init: (app_id: string) => void,
        }
    }
}

export { };