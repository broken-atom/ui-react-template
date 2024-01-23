import { app_object_type } from "./types/app-json"
import { PAGE_TYPE } from "./types/g-fn"

export const GC:{
    APP_ID: string,
    PAGES: PAGE_TYPE[],
    PAGE: PAGE_TYPE,
    APP_JSON: app_object_type,
    SHOW_LOGIN: string,
    CREATOR_ID: string

} = {
    APP_ID: "REPLACE_WITH_APP_ID",

    // @ts-ignore
    PAGES: "REPLACE_WITH_PAGES",

    // @ts-ignore
    PAGE: "REPLACE_WITH_PAGE",

    // @ts-ignore
    APP_JSON: "REPLACE_WITH_APP_JSON",
    SHOW_LOGIN: "REPLACE_WITH_SHOW_LOGIN", // if true login page will be shown first
    CREATOR_ID: "REPLACE_WITH_CREATOR_ID" // Creator's user_id of the application [For displaying brokenatom tag dynamically. If the creator upgrades/downgrades the account, this should reflect automatically and show/hide "Built with BrokenAtom" tag."]
}