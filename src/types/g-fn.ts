declare global {
    namespace JSX {
        interface IntrinisicElements {
            react: { },
        }
    }
    interface Window {
        init_relay: () => void;
        EN_BROKEN_COMP_LOGS: any;
        EN_BROKEN_G_FN_LOGS: any;

        broken_on_login_success: (token: any, user: any) => void;

    }
}

export type PAGE_TYPE = {
    bid: string,
    name: string,
    icon: string
}

export type DEFAULT_RES_SINGLE<T> =
    { success: false, errors: string[], data?: T, warnings?: string[]}
    | { success: true, data: T, warnings?: string[]};
export type DEFAULT_RES_SINGLE_P<T> = Promise<DEFAULT_RES_SINGLE<T>>;

export type DEFAULT_RES_ARR<T> =
    { success: false, errors: string[], data?: T[], warnings?: string[]}
    | { success: true, data: T[], warnings?: string[]};

export type DEFAULT_RES_ARR_P<T> = Promise<DEFAULT_RES_ARR<T>>;


export default {}