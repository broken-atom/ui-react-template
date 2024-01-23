import online_api from "../api/online";
import online_auth from "../auth/online";
import { online } from "../interfaces";

export const online_init: online = {
    api: online_api,
    auth: online_auth
}

export default {};