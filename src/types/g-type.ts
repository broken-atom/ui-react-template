import type {ACTION} from './actions';
import { FILTER_OBJECT, FILTER_PARAMS } from './query';

export interface G_TYPE {
    actions: {[name: string]: ACTION}
}



export type ENTITY_EVENT_NAME = 'set' | 'set_prop' | 'delete' | 'delete_prop' | 'select';
export type COLLECTION_EVENT_NAME = 'set';

export type ENTITY_EVENT_TYPE = {
    type: ENTITY_EVENT_NAME,
    model_id: string, 
    eid: string, 
    data: any
}
export type SELECT_EVENT_TYPE = {
    type : 'select',
    model_id : string,
    eids : string[]
}
export type COLLECTION_EVENT_TYPE = {
    type: COLLECTION_EVENT_NAME,
    model_id: string,
    qid: string,
    filter_params: FILTER_PARAMS,
    data: any[]
}
export type FILTER_EVENT_TYPE = {
    type: 'filter',
    model_id: string,
    comp_id: string,
    filters: FILTER_OBJECT
}

export type MESSAGE_EVENT_TYPE = {
    type: "message",
    level: "error"|"warning"|"debug"|"log"|"verbose",
    model_id: string,
    eid?: string,
    comp_id?:string,
    message : string,
    data : any
}

export type DRAFT_EVENT_TYPE = {
    type : "draft",
    model_id : string,
    comp_id : string,
    eid? : string,
    data : any
}

export type UPDATE_BODY = {
    id : string,
    add : {
        [key : string] : any
    },
    delete : {
        [key : string] : any
    }
}

export type OBJECT_TYPE = {
    [key : string] : any
}