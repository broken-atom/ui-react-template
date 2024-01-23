import offline_api from "../api/offline";
import offline_auth from "../auth/offline";
import { clear_entities } from "../db/datascript";
import { BehaviorSubject } from "rxjs"
import { app_object_type } from "../types";
import { offline } from "../interfaces";


export const offline_init: offline = {
    api: offline_api,
    auth: offline_auth,
    app: new BehaviorSubject<app_object_type | null>(null),
    ds: {
        db: null,
        datascript: null,
        clear_entities: clear_entities
    }
}

export default {};