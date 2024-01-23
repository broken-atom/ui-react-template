import { BehaviorSubject, Subject, Subscription} from 'rxjs';
import { GC } from "./global_state";
import {add_sub, remove_subs} from "./utils.jsx"
import { generateNKeysBetween,  generateKeyBetween } from 'fractional-indexing';
import { produce, Patch } from "structurajs"
import authz from "./user/auth";

import type { DEFAULT_RES_ARR, DEFAULT_RES_ARR_P, DEFAULT_RES_SINGLE, DEFAULT_RES_SINGLE_P, PAGE_TYPE } from "./types/g-fn";
import type { FILTER_OBJECT, FILTER_PARAMS, FINAL_FILTERS, QUERY_PARAMS, T_NODE_FILTERS } from './types/query';
import { COLLECTION_EVENT_TYPE, DRAFT_EVENT_TYPE, ENTITY_EVENT_TYPE, FILTER_EVENT_TYPE, MESSAGE_EVENT_TYPE, SELECT_EVENT_TYPE } from './types/g-type.js';




const EN_BROKEN_G_FN_LOGS = {
    PAGE_CHANGED: false,
    URL_POP_STATE: false,
    LOGIN: true,
    DATE_TIME_CREATE: false,
    GET_MANY: false,
    GET_ONE: false,
    FILTERS: false,
}
window.EN_BROKEN_G_FN_LOGS = EN_BROKEN_G_FN_LOGS;

// Filter OBJ is used to create filters in the UI. It is converted to FILTER_PARAMS before sending to the server



const hashJoaat = function (b: string) {
	for (var a = 0, c = b.length; c--;)a += b.charCodeAt(c), a += a << 10, a ^= a >> 6; a += a << 3; a ^= a >> 11; return ((a + (a << 15) & 4294967295) >>> 0).toString(16);
};


class GLOBAL_STORE {

    // get one
    // entity maintains data fetched from database
    entity: {
        [model_id:string]: {
            [eid:string]: any
        }
    } = {};

    // draft handles form data
    draft : {
        [model_id:string] : {
            [comp_id:string] : any
        }
    } = {};


    // patches for update
    patches: {
        [model_id:string]: {
            [eid:string]: undefined|Patch[]
        }
    } = {
    }
    // it has stored diff for each entity between (GSTORE,DB) and React state. The react state has latest data, GSTORE has old data



    // get many
    // this will be a cache, but we will always query fresh data from db
    // because get_many data could be stale
    list: {
        [model_id:string]: {
            // query id => hash of (filters, sorts, limit, cursor_first, cursor_last, offset)
            [qid: string]: any
        }
    } = {}


    // every component will have a filters for each model, this filters could be changed in runtime to query a different set of data
    filters: {
        [model_id:string]: {
            [comp_id: string]: FILTER_OBJECT
        }
    } = {
    }



    // Global state that can be accessed from anywhere, 
    // Use it for global filters, search
    state: {
        [k:string]: any
    } = {}


    any_event = new Subject<any>(); // {model_id, *}
    one_event = new Subject<ENTITY_EVENT_TYPE>(); // {model_id, eid, data}
    many_event = new Subject<COLLECTION_EVENT_TYPE>(); // {model_id, qid, data[]}
    filter_event = new Subject<FILTER_EVENT_TYPE>(); // {model_id, comp_id, data}
    message_event = new Subject<MESSAGE_EVENT_TYPE>(); // 
    select_event = new Subject<SELECT_EVENT_TYPE>(); // 

    draft_event = new Subject<DRAFT_EVENT_TYPE>();

    // selcted entity ids, for update and highlight
    selected_entity: {
        [model_id: string]: string[]
    } = {}


    constructor() {}

    // on change  
    emit(e: ENTITY_EVENT_TYPE | COLLECTION_EVENT_TYPE | FILTER_EVENT_TYPE | SELECT_EVENT_TYPE | MESSAGE_EVENT_TYPE | DRAFT_EVENT_TYPE){
        this.any_event.next(e);
    }

    emit_one(e: ENTITY_EVENT_TYPE){
        this.one_event.next(e);
        this.emit(e);
    }
    emit_many(e: COLLECTION_EVENT_TYPE){
        this.many_event.next(e);
        this.emit(e);
    }
    emit_filter(e: FILTER_EVENT_TYPE){
        this.filter_event.next(e);
        this.emit(e);
    }
    emit_selected_entities(e: SELECT_EVENT_TYPE){
        this.select_event.next(e);
        this.emit(e);
    }
    emit_message(e: MESSAGE_EVENT_TYPE){
        this.message_event.next(e);
        this.emit(e);
    }
    emit_draft(e: DRAFT_EVENT_TYPE){
        this.draft_event.next(e);
        this.emit(e);
    }




    async get_from_db(model_id: string, eid: string){
        const params = {
            filters: null,
            sort: null,
            limit: null,
            id: eid
        }
        const data = await g_fn.get_one(model_id, params);


        // data queried but not found
        if(!data){

            // if this data was set in a different way use it, it's for user at the moment
            // let data = this.get(model_id, eid);
            // if(data) {
            //     console.error("@TODO : Save the user in database");
            //     return data;
            // }

            return {
                id: eid,
                __meta: {queried_at: Date.now(), reason: "NOT_FOUND"}
            }
        }

        return data;
    }

    async get_one_entity(model_id: string, eid: string, query? : {op : string, prop_name : string, prop_value : string}){
        let mstore = this.entity[model_id];
        if(!mstore) mstore = {};
        this.entity[model_id] = mstore;

        if(!eid && !query) return console.warn("NO EID OR QUERY FOUND IN GET ONE ENTITY");

        if(!eid && query) {
            console.log("QUERY FOUND TO QUERY : ", query);
            const op = query.op;
            const prop_name = query.prop_name;
            const prop_value = g_fn.get_prop_value_from_query(query.prop_value);
            const r = await this.get_many(model_id, {filters: [{op, attr : prop_name, val : prop_value}], sort: {attr : "updated_at", order : "DESC"}, unique: false, limit: 1, id : "custom"});
            console.log("QUERY FOUND TO QUERY RESULT : ", r);
            if(!r.success) {
                console.warn("ERROR IN GET ONE QUERY ENTITY : ", r);
                return;
            }
            if(!r.data || !r.data.length) return console.warn("NO DATA FOUND IN GET ONE QUERY ENTITY");
            const entity = r.data[0];
            this.set(model_id, entity.id, entity);
            return entity;
        }

        let data = mstore[eid];

        // not found in store
        if(!data){
            console.log("GSTORE GET ONE ENTITY FROM DATABASE : ", model_id, eid);
            data = await this.get_from_db(model_id, eid);
        }

        if(data){
            this.set(model_id, eid, data);
        }

        return data;
    }

    async get_many(model_id: string, params: QUERY_PARAMS, qid?: string){ // qid of the query, could be comp_id
        // get many will always query from db

        if(params.unique === true){ // get one
            if(!qid) qid = params.id;
        }
        else if (params.id && params.id !== undefined) {
            if(!qid) qid = params.id
        }
        else if(params.id === undefined && params.unique === false){
            if(!qid){
                const q = {
                    filters: params.filters,
                    sorts: params.sorts,
                    limit: params.limit,
                    cursor_first: params.cursor_first,
                    cursor_last: params.cursor_last,
                    offset: params.offset
                }
                // generate a unique hash for q
                qid = hashJoaat(JSON.stringify(q));
            }
        }
        else {
            if(!qid) qid = "";
        }

        AS.GSTORE.emit_message({type : "message", level : "log", message : "FETCHING", model_id, data : null});
        
        // // @think: should we do this. WHY? is this for optimisation? Cache get_many is not a good idea
        // if(this.list[model_id] && this.list[model_id][qid]){
        //     // query already exists
        //     const data = this.list[model_id][qid];
        //     if(data && Array.isArray(data)){
        //         const r:DEFAULT_RES_SINGLE<any> = {
        //             success: true,
        //             data,
        //             warnings: ["DATA_FROM_UI_CACHE"],
        //         }
        //         return r;
        //     }
        // }


        let r:any = null;

        if(params.id && params.id !== undefined && params.unique === false) {
            r = await g_fn.get_many_with_final_filters(model_id, params);
        }



        // query doesn't exist => query from db
        else r = await g_fn.get_many(model_id, params);

        if(!r) return console.warn("GET MANY FAILED");

        if(!r.success) {
            AS.GSTORE.emit_message({type : "message", level : "error", message : "FETCH_FAILED", model_id, data : null});
        }

        
        if(r.success && Array.isArray(r.data)){
            // for get many => store each entity in the store
            for(let d of r.data){
                if(!d || !d.id) continue;
                this.set(model_id, d.id, d);
            }

            if(params.unique !== true && params.id === undefined){
                this.set_many(model_id, qid, params, r.data);
            }
            AS.GSTORE.emit_message({type : "message", level : "log", message : "FETCHED", model_id, data : r.data});
        }


        // set the get_many result in list @todo:

        return r;
    }

    set_selected_entities(model_id: string, eid: string, append?: boolean){
        if(append){
            if(!this.selected_entity[model_id]) this.selected_entity[model_id] = [];
            this.selected_entity[model_id].unshift(eid);
            this.emit_selected_entities({type : "select", model_id, eids : this.selected_entity[model_id]})
        }
        else{
            this.selected_entity[model_id] = [eid];
            this.emit_selected_entities({type : "select", model_id, eids : this.selected_entity[model_id]})
        }
    }

    get_selected_entities(model_id : string) {
        let sstore = this.selected_entity[model_id];
        if(!sstore) {
            sstore = [];
            this.selected_entity[model_id] = sstore;
        }
        return sstore;
    }


    async create_one(model_id: string, data: any){
        console.log("GSTORE CREATE ONE DATA : ", data);
        // if(!data) data = {id: eid};
        if(!data) data = {id : g_fn.get_ulid()}; // id will be assigned on page load in the component itself

        if(!data.id) data.id = g_fn.get_ulid();

        let data_copy = null;

        try {
            data_copy = JSON.parse(JSON.stringify(data));
        } catch (e:any) {
            console.error("JSON PARSE ERROR : ", e.message);
            data_copy = {...data};
        }

        // data = {...data, __meta: {...(data.__meta), status: "CREATING"}}
        // data = produce(data, (draft)=>{
        //     if(!draft.__meta) draft.__meta = {};
        //     draft.__meta.status = "CREATING";
        // });
        // this.set(model_id, data.id, data);

        this.emit_message({level : "log", message : "CREATING", model_id, type : "message", eid : data.id, data});

        
        
        
        const r = await g_fn.create_one(model_id, data);
        
        // this will also be used as react state
        if(r.success === false){
            // data = produce(data, (draft)=>{
            //     if(!draft.__meta) draft.__meta = {};
            //     draft.__meta.success = false;
            //     draft.__meta.status = "CREATE_FAILED";
            //     draft.__meta.errors = r.errors;
            // })
            this.emit_message({type : "message", model_id, level : "error", message : "CREATE_FAILED", eid : data.id, data});
            return r;

            // data = { 
            //     ...data, 
            //     __meta: {
            //         ...(data.__meta), 
            //         success: false,
            //         status: "CREATE_FAILED",
            //         errors: r.errors
            //     }
            // };
        }
        else{
            // data = produce(data, (draft)=>{
            //     if(!draft.__meta) draft.__meta = {};
            //     draft.__meta.success = true;
            //     draft.__meta.status = "CREATED";
            //     draft.__meta.errors = undefined;
            // })
            this.emit_message({type : "message", model_id, level : "log", message : "CREATED", eid : data.id, data});
            // data = {
            //     ...data, 
            //     __meta: {
            //         ...(data.__meta), 
            //         success: true,
            //         status: "CREATED",
            //         errors: undefined
            //     }
            // };
        }

        console.log("SETTING DATA IN GSTORE AFTER CREATE : ", model_id, data_copy);
        this.set(model_id, data.id, data_copy); // set unmodified data in global store
        // delete draft after successful creation

        return r;

    }

    // async create_many


    async update_one(model_id: string, eid: string, data: any){ // data is model data here, i.e. M
        if(!data) data = {id: eid};

        // check
        const ustore = this.patches[model_id];
        if(!ustore) this.patches[model_id] = {};
        const patches = this.patches[model_id][eid];
        if(!patches) this.patches[model_id][eid] = [];
        console.log("PATCHES : ", patches);

        let data_copy : any = null;

        try {
            data_copy = JSON.parse(JSON.stringify(data));
        } catch (e:any) {
            console.error("JSON PARSE ERROR : ", e.message);
            data_copy = {...data};
        }



        // data = {...data, __meta: {...(data.__meta), status: "UPDATING"}}
        // data = produce(data, (draft)=>{
        //     if(!draft.__meta) draft.__meta = {};
        //     draft.__meta.status = "UPDATING";
        // });
        // this.set(model_id, eid, data);

        this.emit_message({type : "message", model_id, level : "log", message : "UPDATING", eid, data});

        console.log("UPDATE ONE DATA INSIDE GSTORE.UPDATE_ONE : ", data);
        // @warning: data will be modified gy g_fn.update_one when we prepare for update. Most likely __meta will be deleted, we should use immutable data for all operation, than this will not be a problem
        const r = await g_fn.update_one(GC.APP_ID, model_id, eid, data, patches||[]);
        if(!r) {
            return console.error("UPDATE ONE : ", r);
        }

        // this will also be used as react state
        if((r.success as boolean) === false){
            // data = produce(data, (draft)=>{
            //     if(!draft.__meta) draft.__meta = {};
            //     draft.__meta.success = false;
            //     draft.__meta.status = "UPDATE_FAILED";
            //     draft.__meta.errors = r.errors;
            // })

            this.emit_message({type : "message", model_id, level : "error", message : "UPDATE_FAILED", eid, data : data_copy});
            // data = { 
            //     ...data, 
            //     __meta: {
            //         ...(data.__meta), 
            //         success: false,
            //         status: "UPDATE_FAILED",
            //         errors: r.errors
            //     }
            // };
            // do not set data on failed update
            return r;
        }
        else{
            // data = produce(data, (draft)=>{
            //     if(!draft.__meta) draft.__meta = {};
            //     draft.__meta.success = true;
            //     draft.__meta.status = "UPDATED";
            //     draft.__meta.errors = undefined;
            // })

            if(data.id && data.add && data.delete) {
                const entity = await this.get_one_entity(model_id, eid);
                if(!entity) return console.warn('Entity not found in GSTORE, this should not happen');
                const updated_entity = produce(entity, (draft) => {
                    draft = {...data.add};
                    for(let key in data.delete) {
                        if(!Array.isArray(draft[key])) {
                            delete draft[key];
                            continue;
                        }
                        else {
                            draft[key] = draft[key].filter((e : any) => {
                                if(typeof(e) === "object") {
                                    return !data.delete[key]?.map(d=>d.id).includes(e.id);
                                }
                                else {
                                    return !data.delete[key]?.includes(e);
                                }
                            });
                            continue;
                        }
                    }
                });

                this.emit_message({type : "message", model_id, level : "log", message : "UPDATED", eid, data : updated_entity});
                this.set(model_id, eid, updated_entity);
                this.patches[model_id][eid] = [];
                return r;
            }

            this.emit_message({type : "message", model_id, level : "log", message : "UPDATED", eid, data : data_copy});
            // data = {
            //     ...data, 
            //     __meta: {
            //         ...(data.__meta), 
            //         success: true,
            //         status: "UPDATED",
            //         errors: undefined
            //     }
            // };


            // remove patches on success
            this.patches[model_id][eid] = [];
        }


        this.set(model_id, eid, data_copy);
        return r;
    }

    async delete_one(model_id: string, eid: string){
        let data = this.get(model_id, eid);

        if(!data) data = {id: eid}; // data may not be in GSTORE, but we still want to delete it

        // data = produce(data, (draft)=>{
        //     if(!draft.__meta) draft.__meta = {};
        //     draft.__meta.status = "DELETING";
        // });
        // this.set(model_id, eid, data);
        this.emit_message({type : "message", model_id, level : "log", message : "DELETING", eid, data});

        const r = await g_fn.delete_one(model_id, eid);

        if(r.success === false){
            // data = produce(data, (draft)=>{
            //     if(!draft.__meta) draft.__meta = {};
            //     draft.__meta.success = false;
            //     draft.__meta.status = "DELETE_FAILED";
            //     draft.__meta.errors = r.errors;
            // })
            this.emit_message({type : "message", model_id, level : "log", message : "DELETE_FAILED", eid, data});
            // data = { 
            //     ...data, 
            //     __meta: {
            //         ...(data.__meta), 
            //         success: false,
            //         status: "DELETE_FAILED",
            //         errors: r.errors
            //     }
            // };
        }
        else{
            // data = produce(data, (draft)=>{
            //     if(!draft.__meta) draft.__meta = {};
            //     draft.__meta.success = true;
            //     draft.__meta.status = "DELETED";
            //     draft.__meta.errors = undefined;
            // })
            this.emit_message({type : "message", model_id, level : "log", message : "DELETED", eid, data});
            // data = {
            //     ...data, 
            //     __meta: {
            //         ...(data.__meta), 
            //         success: true,
            //         status: "DELETED",
            //         errors: undefined
            //     }
            // };
        }

        this.delete(model_id, eid, data);
        return r;
    }

    async update_filters(model_id: string, comp_id: string, filters: FILTER_OBJECT){
        let fstore = this.filters[model_id];
        if(!fstore){
            fstore = {};
            this.filters[model_id] = fstore;
        }
        fstore[comp_id] = filters;

        this.emit_filter({type: 'filter', model_id, comp_id, filters});
    }




    set(model_id: string, eid: string, data: any){
        let mstore = this.entity[model_id];
        if(!mstore){
            mstore = {};
            this.entity[model_id] = mstore;
        }
        mstore[eid] = data;
        this.emit_one({type:'set', model_id, eid, data});

        if(!data) return; // may be we want to empty it


        // relations data - update only if it is not set
        this.set_relations(model_id, data);
    }
    set_many(model_id: string, qid: string, filter_params: FILTER_PARAMS, data: any[]){
        let lstore = this.list[model_id];
        if(!lstore){
            lstore = {};
            this.list[model_id] = lstore;
        }
        lstore[qid] = data;
        this.emit_many({type: 'set', model_id, qid, filter_params, data});
    }

    get_filters(model_id : string, comp_id : string) : FILTER_OBJECT {
        let fstore = this.filters[model_id];
        if(!fstore) {
            fstore = {};
            this.filters[model_id] = fstore;
        }

        return fstore[comp_id];
    }

    set_filters(model_id : string, comp_id : string, filter_object : any) {
        let fstore = this.filters[model_id];
        if(!fstore) {
            fstore = {};
            this.filters[model_id] = fstore;
        }

        const filter_obj = fstore[comp_id];

        const new_filter_object = produce(filter_obj, (draft) => {
            draft = {...filter_object};
        }) as FILTER_OBJECT;

        AS.GSTORE.emit_filter({comp_id, model_id, type : "filter", filters : new_filter_object});
    }

    set_draft(model_id : string, comp_id : string, data : any, eid?: string|null){
        let draft_store = this.draft[model_id];

        if(!draft_store) {
            draft_store = {};
            this.draft[model_id] = draft_store;
        }
        if(!eid) {
            const CD = draft_store[comp_id];
            if(CD === data) return; // same object reference
            draft_store[comp_id] = data;
            this.emit_draft({type: "draft", comp_id, model_id, data, eid : data.id});
        }
        if(eid) {
            let CD = draft_store[comp_id];
            if(!CD) {
                CD = {};
                draft_store[comp_id] = CD;
            }
            if(CD[eid] === data) return; // same object reference
            CD[eid] = data;
            this.emit_draft({type: "draft", comp_id, model_id, data, eid});
        }

    }

    update_draft(model_id: string, comp_id: string, eid : string | null, updates: any){
        console.log("UPDATE DRAFT : ", model_id, comp_id, updates);
        if(!updates || typeof(updates) !== "object") return;

        const D = this.get_draft(model_id, comp_id, eid);
        if(!D) return this.set_draft(model_id, comp_id, updates, eid);

        // const ND = {...D, ...updates};

        // to retain the object reference and preventing infinite loops on mount
        for(let [k,v] of Object.entries(updates)) {
            if(D[k] === v) continue;
            D[k] = v;
        }

        this.set_draft(model_id, comp_id, D, eid);
        // this.emit_draft({type : "draft", comp_id, model_id, data : ND, eid : eid || ND.id});
    }

    clear_draft(model_id : string, comp_id : string){
        let draft_store = this.draft[model_id];

        if(!draft_store) {
            draft_store = {};
            this.draft[model_id] = draft_store;
        }

        draft_store[comp_id] = null;
        this.emit_draft({type: "draft", comp_id, model_id, data : null});
    }

    // simply get if exits
    get(model_id: string, eid: string){
        const mstore = this.entity[model_id];
        if(!mstore) return null;
        const data = mstore[eid];
        if(!data) return null;
        return data;
    }
    exits(model_id: string, eid: string){
        const mstore = this.entity[model_id];
        if(!mstore) return false;

        const data = mstore[eid];
        if(!data) return false;

        return true;
    }


    get_draft(model_id : string, comp_id : string, eid ? : string|null) {
        let draft_store = this.draft[model_id];

        if(!draft_store) {
            draft_store = {};
            this.draft[model_id] = draft_store;
        }

        const draft = this.draft[model_id][comp_id];

        if(eid) {
            if(!draft) return null;
            if(!draft[eid]) return null;
            return draft[eid];
        }

        return draft;
    }
    

    // given a data find all the relations and set them => ignore if already exits
    // ignore if exists because we might want to keep some meta properties
    set_relations(model_id: string, data: any, force?: boolean){
        // data is supposed to be an object, but still check it
        if(typeof(data) !== "object") return; // no relations data
        
        
        console.log("SET RELATIONS : ", model_id, data);
        // example product with seller & bought_by
        // product = {
        //     id: "p0",
        //     name: "product 1",
        //     seller: {
        //         id: "s0",
        //         name: "seller 1"
        //     },
        //     bought_by: [
        //         {
        //             id: "u0",
        //             name: "user 1"
        //         },
        //         {
        //             id: "u1",
        //             name: "user 2"
        //         }
        //     ]
        // }

        const relations = Object.entries(data as {[k: string]: any}).filter(([k, v])=>{
            if(typeof(v) !== "object")  return false; // array or object
            if(k.startsWith("__"))      return false; // ignore __meta
            return true;
        });

        if(!relations.length) return; // no relations data

        
        const model = g_fn.get_model(model_id);
        if(!model) return;

        for(let [k, v] of relations){
            const prop = model.props.find(p=>p.name === k);
            if(!prop) continue; // no prop found

            // prop.type => model_id of the relation
            const model_id = prop.type;
            if(!model_id) continue;

            // v is an array => many
            if(Array.isArray(v)){
                for(let e of v){
                    if(!e.id) continue;
                    const exits = this.exits(model_id, e.id);
                    if(exits) continue;
                    this.set(model_id, e.id, e);
                }
            }
            else{
                if(!v.id) continue;
                const exits = this.exits(model_id, v.id);
                if(exits) continue;
                this.set(model_id, v.id, v);
            }
        }
    }

    set_prop(model_id: string, eid: string, prop_name: string, prop_value: any){
        const mstore = this.entity[model_id];
        if(!mstore) return;
        const data = mstore[eid];
        if(!data) return;
        data[prop_name] = prop_value;
        this.emit_one({type: 'set_prop', model_id, eid, data});
    }
    delete(model_id: string, eid: string, data : any){
        const mstore = this.entity[model_id];
        if(!mstore) return;
        delete mstore[eid];
        this.emit_one({type: 'delete', model_id, eid, data});
    }

    delete_prop (model_id: string, eid: string, prop_name: string){
        const mstore = this.entity[model_id];
        if(!mstore) return;
        const data = mstore[eid];
        if(!data) return;
        delete data[prop_name];
        this.emit_one({type: 'delete_prop', model_id, eid, data});
    }

    // simply clear from the store : no emit event, no delete from server
    clear(model_id: string, eid: string){
        const mstore = this.entity[model_id];
        if(!mstore) return;
        delete mstore[eid];
    }




    // subscribe
    subscribe_one(model_id: string, eid: string, fn: (e: ENTITY_EVENT_TYPE) => void){
        const sub = this.one_event.subscribe((e)=>{
            if(e.model_id !== model_id) return;
            if(eid && e.eid !== eid) return; // eid won't be there in case get_one happens via query attribute
            fn(e);
        });
        return sub;
    }

    subscribe_many(model_id: string, qid: string, fn: (e: COLLECTION_EVENT_TYPE) => void){
        const sub = this.many_event.subscribe((e)=>{
            if(e.model_id !== model_id) return;
            if(e.qid !== qid) return;
            fn(e);
        });
        return sub;
    }

    subscribe_filter(model_id: string, comp_id: string, fn: (e: FILTER_EVENT_TYPE) => void){
        const sub = this.filter_event.subscribe((e)=>{
            if(e.model_id !== model_id) return;
            if(e.comp_id !== comp_id) return;
            fn(e);
        });
        return sub;
    }

    subscribe_selected_entities(model_id : string, fn : (e : SELECT_EVENT_TYPE) => void){
        const sub = this.select_event.subscribe((e)=>{
            if(e.model_id !== model_id) return;
            fn(e);
        });
        return sub;
    }

    subscribe_message(model_id : string, fn : (e : MESSAGE_EVENT_TYPE) => void, eid? : string, comp_id? : string) {
        const sub = this.message_event.subscribe((e) => {
            if(e.model_id !== model_id) return;
            if(eid && e.eid !== eid) return;
            // if(comp_id && e.comp_id !== comp_id) return; // commented out because we don't have component id while emitting message events
            fn(e);
        });
        return sub;
    }

    subscribe_draft(model_id : string, comp_id : string, eid : string | null, fn : (e : DRAFT_EVENT_TYPE) => void){
        const sub = this.draft_event.subscribe((e) => {
            if(e.model_id !== model_id) return;
            /* if the comp_id is the same, the subscription is present in the same component where user is making changes */
            if(eid && e.eid !== eid) return;
            fn(e);
        });
        return sub;
    }



    subscribe(fn: (e: ENTITY_EVENT_TYPE | COLLECTION_EVENT_TYPE | FILTER_EVENT_TYPE) => void){
        const sub = this.any_event.subscribe(fn);
        return sub;
    }

}

const g_fn = {
    _magic_identifier: () => g_fn,
    _logger: (text) => {
        console.log(
            'Feedback in broken module not found. So logging in console => ',
            text
        );
    },

    // level: log, warn, error, success; duration is in seconds
    feedback: function (msg, level?: any, duration?: number) {
        const _feedback = g_fn.get_feedback();
        if (!_feedback) return g_fn._logger(msg);
        _feedback(msg, ["log", "warn", "error", "success"].includes(level) ? level : 'log', duration || 2);
    },

    get_feedback: function () {
        const U = g_fn.get_utils();
        if (!U) return g_fn._logger;
        const feedback = U.feedback;
        if (!feedback) return g_fn._logger;
        return feedback;
    },

    get_broken: function () {
        // @ts-ignore
        const broken = window.broken;
        if (!broken) return null;
        return broken;
    },
    get_current: function () {
        const B = g_fn.get_broken();
        if (!B) return;
        if (!B.current) return null;
        return B.current;
    },
    get_api: function () {
        const C = g_fn.get_current();
        if (!C) return;
        return C.api;
    },
    get_roles: function () {
        const AJ = GC.APP_JSON as any;
        if (!AJ) {
            console.warn("No APP_JSON found in global state. Can't get roles");
            return null;
        }

        const roles = AJ.roles;
        if (!roles || !Array.isArray(roles)) {
            console.warn('roles not found in APP_JSON or is not an array', roles);
            return null;
        }

        return roles;
    },
    get_otp_login: function () {
        const AJ = GC.APP_JSON as any;
        if (!AJ) {
            console.warn("No APP_JSON found in global state. Can't get otp_login");
            return null;
        }

        const login_methods = AJ.login_methods;
        if (!login_methods || !login_methods.otp) {
            console.warn('login_methods not found in APP_JSON or does not having otp', login_methods);
            return null;
        }
        return login_methods.otp || false;
    },

    get_auth: function () {
        const C = g_fn.get_current();
        if (!C) return;
        if (!C.auth) return;
        return C.auth;
    },
    get_token: function () {
        if(!g_fn.AS.enable_login) return "{msg:'NO_TOKEN_REQUIRED_LOGIN_TYPE_IS_NONE'}";

        const auth = g_fn.get_auth();
        if (!auth) return;
        if (!auth.token) return;
        return auth.token;
    },
    get_user: function () {
        const auth = g_fn.get_auth();
        if (!auth) return;
        if (!auth.user) return;
        return auth.user;
    },
    get_utils: function () {
        const B = g_fn.get_broken();
        if (!B) return;
        if (!B.utils) return;
        return B.utils;
    },
    get_ulid: function () {
        const utils = g_fn.get_utils();
        if (!utils) return;
        if (!utils.ulid) return;
        if (typeof utils.ulid !== 'function') return;
        return utils.ulid();
    },

    get_user_token_api: function(alert?: boolean){
        const errors: {code: string, message: string}[] = [];
        const user = g_fn.get_user();
        const token = g_fn.get_token();
        const api = g_fn.get_api();

        if (!api) errors.push({code: "NO_API", message: "No API found in broken"});
        if (!user) errors.push({code: "NO_USER", message: "No user found in broken"});
        if (!token) errors.push({code: "NO_TOKEN", message: "No token found in broken"});

        // on success 
        if(api && user && token) return {success: true, api, user, token};

        // on error
        if(alert){
            const msg = errors.map(e=>e.message).join("\n");
            g_fn.feedback(msg, "error");
        }
        return {success: false, errors};
    },

    push_state_to_history: (state) => {
        const url = new URL(window.location.href);
        const prev_state = url.searchParams.get('state');
        if (prev_state === state) return;

        url.searchParams.set('state', state);
        history.pushState({}, state, url);
    },

    get_valid_target_value: function (e: any, converter?: (v:any)=>any) {
        if (!e.target) {
            console.warn(`target is empty`, e.target);
            return;
        }

        const b_type = g_fn.get_attr_from_event(e, ['b_type', 'type']);

        let value = e.target.value;


        // quill js
        if(b_type === 'rich-text'){
            console.log("RICH TEXT => ", value, e);
            const quill = e.target.__quill;
            if(quill){
                value = quill.root.innerHTML;
            }
            else {
                // get contenteditable='true' tag

                const ce = e.target.querySelector('[contenteditable="true"]');
                if(ce){
                    value = ce.innerHTML;
                }
            }
        }


        // const text_types = ["text", "email", "url", "any_one_of", "description", "date"]

        if (!converter) {
            const type = e.target.type;

            // use all broken types
            if (type === 'number') {
                converter = (v)=>{
                    const num = parseFloat(v);
                    if(isNaN(num)) return undefined;
                    return num;
                }
            } else if (type === 'checkbox') {
                if(b_type === "select-many") {} // select_many take exact value
                else {value = e.target.checked;} // boolean
            } else if (type === 'time') {
                // time is set same as html format
            } else if (type === 'datetime') {
                converter = (v) => new Date(v).getTime();
            } else if (type === 'date') {
                //
            } else if (type === 'datetime-local') {
                converter = (v) => new Date(v).getTime();
            }
            else if(type === 'rich-text'){
                value = e.target.innerHTML;
            }
            //if empty string, return undefined
            else if (['email', 'text', 'any_one_of', 'url', 'description', 'user_id', 'serial', 'password']){
                if(!value || !value.length){
                    converter = () => undefined;
                }
            }

            // IMAGES
            // inpute text into text input box but keep b_type="image" then we will be able to display the image
            if (b_type === 'image' && type === 'text') {
                value = { name: '', url: value, size: 0, type: 'image' };
            }
        }

        if (value === undefined) {
            console.warn(`value is undefined`, value, e.target);
            return;
        }

        if (converter) value = converter(value); // e.g Number(value)

        if (value === undefined) {
            console.warn(`value is undefined`, value, e.target);
            return;
        }

        return value;
    },

    to_iso_string: (date) => {
        const pad = (num) => {
            return (num < 10 ? '0' : '') + num;
        };
        return (
            date.getFullYear() +
            '-' +
            pad(date.getMonth() + 1) +
            '-' +
            pad(date.getDate()) +
            'T' +
            pad(date.getHours()) +
            ':' +
            pad(date.getMinutes())
        );
    },
    get_formated_state: (state, prop) => {
        // e.g m_state.dob  => new Date(m_state.dob).toISOString()
        let v = state;

        if (prop.type === 'datetime') {
            v = g_fn.to_iso_string(new Date(state)); //`\${g_fn.to_iso_string(new Date(${state}))}`;
        } else if (prop.type === 'boolean') {
            v = state ? 'true' : 'false';
        } else if (prop.type === 'many_of') {
            if (Array.isArray(state)) {
                v = state.join(', ');
            }
        } else if (prop.type === 'image') {
            if (typeof state === 'string') {
                v = state;
            } else {
                v = URL.createObjectURL(state);
            }
        } else if (prop.type === 'file') {
            if (typeof state === 'string') {
                v = state;
            } else {
                v = URL.createObjectURL(state);
            }
        }

        return v;
    },

    runtime_select_next_page: function (is_reverse) {
        const AS = g_fn.AS;

        if (AS.is_dev) return;


        const pages = AS.pages as PAGE_TYPE[];
        if (pages.length < 2) return;

        const sp = AS.page as PAGE_TYPE;
        if (!sp || !sp.bid) return AS.rx_page.next(pages[0]);

        const i = pages.findIndex((p) => p.bid === sp.bid);
        if (i === -1) return;

        let ni = (i + 1) % pages.length;
        if (is_reverse) {
            ni = (i - 1 + pages.length) % pages.length;
        }

        const next_page = pages[ni];
        AS.rx_page.next(next_page);
    },

    // we aren't using this
    runtime_set_page_effect: function (set_page, subs, listeners) {
        // assume already logged in

        // onload: set page from url
        g_fn.runtime_set_page_from_url(); // do this first so that page is set before page change subscription is called

        const S = g_fn.AS;
        subs.push(
            S.rx_page.subscribe((page) => {
                console.log('PAGE CHANGED: ', page);
                set_page(page);

                const us = S.rx_url_state.value;
                S.rx_url_state.next({ ...us, page: page.bid });
            })
        );

        // on url state change save to browser history
        subs.push(
            S.rx_url_state.subscribe((us) => {
                const state = JSON.stringify(us);
                g_fn.push_state_to_history(state);
            })
        );

        const on_key_up = (e) => {
            if (e.key === 'p' || e.key === 'P') {
                if (g_fn.is_event_in_editing_mode(e)) return;
                g_fn.runtime_select_next_page(e.key === 'P');
            }
        };

        const on_pop_state = (e) => {
            g_fn.runtime_set_page_from_url();
            const state = e.state;
            if(EN_BROKEN_G_FN_LOGS.URL_POP_STATE){
                console.log('POP STATE: ', state, e);
            }
        };

        window.addEventListener('popstate', on_pop_state);
        window.addEventListener('keyup', on_key_up);

        // we will remove this on unmount and on hmr reload
        listeners.push({event: "popstate", fn: on_pop_state});
        listeners.push({event: "keyup", fn: on_key_up});
    },
    runtime_set_app_effect: function (set_user, subs, listeners) {
        // assume that all apps requires login

        const token = g_fn.get_token();
        if (!token) {
            set_user(null);
        }

        const S = g_fn.AS;
        subs.push(
            S.rx_user.subscribe((user) => {
                if (!user) return;
                set_user(user);
            })
        );
    },
    runtime_set_page: function (bid?: string) {
        const S = g_fn.AS;
        const pages = S.pages as PAGE_TYPE[];
        if (!pages || !pages.length) return console.warn('pages list is empty');

        if (!bid) {
            const curr_page_id = S.rx_page.getValue()?.bid;
            if(!curr_page_id){
                console.warn('page not found in pages, id: ', bid, curr_page_id, pages);
                console.warn("setting to first page");
                S.rx_page.next(pages[0]);
                return;
            }

            if(pages.find(p=>p.bid === curr_page_id)){
                // just keep the same page
                return;
            }

            // set to first page
            S.rx_page.next(pages[0]);
            return;
        }


        const curr_page = S.rx_page.getValue();
        if(curr_page.bid === bid) return console.warn("page is already set to ", bid); // no need to set again


        const page = pages.find((p) => p.bid === bid);
        if (!page) return console.warn('page not found in pages, id: ', bid, pages);


        if(EN_BROKEN_G_FN_LOGS.PAGE_CHANGED){
            console.log('SETTING NEXT PAGE: ', page);
        }

        S.rx_page.next(page);
    },
    runtime_get_url_state: function () {
        const url = new URL(window.location.href);
        const state_str = url.searchParams.get('state');

        let state:any = {};
        if (state_str && state_str !== 'undefined') {
            try {
                const state_obj = JSON.parse(state_str);
                state = state_obj;
            } catch (error) {
                console.warn('gencode: error parsing state from url, state => ', state_str);
            }
        }

        return state;
    },
    runtime_set_url_state: function () {
        const url = new URL(window.location.href);
        const state_str = url.searchParams.get('state');

        let state = {};
        if (state_str && state_str !== 'undefined') {
            try {
                const state_obj = JSON.parse(state_str);
                state = state_obj;
            } catch (error) {
                console.warn('gencode: error parsing state from url, state => ', state_str);
            }
        }

        const url_state = AS.rx_url_state.getValue();

        if(!state_str && url_state) {
            state = url_state;
        }

        g_fn.AS.rx_url_state.next(state);
    },
    runtime_set_page_from_url: function () {
        const state = g_fn.runtime_get_url_state();
        console.log("setting page from url state: ", state, "current page: ", g_fn.AS.rx_page.getValue()?.bid || "none");

        let page_id = state.page as string;

        if (!page_id) return g_fn.runtime_set_page();

        g_fn.runtime_set_page(page_id);
    },
    g_app_state_init: function () {
        const S = g_fn.AS;

        if (
            S.is_dev &&
            S.rx_user.getValue() &&
            S.rx_token.getValue() &&
            S.rx_page.getValue()
        ) {
            console.warn(
                'WE ARE IN DEV MODE AND G_APP_STATE ALREADY INITIALISED. WE WILL NOT DO IT AGAIN'
            );
            // this is so that the page don't flicker while development
            return;
        }


        // Login => later put in login effects
        let key = GC.APP_ID + '_token' + (S.is_dev ? '_offline' : '_online');
        const token = localStorage.getItem(key);
        if (!token)
            return console.warn('token not found in local storage with key: ', key);

        const user_key = GC.APP_ID + '_user' + (S.is_dev ? '_offline' : '_online');
        const user_str = localStorage.getItem(user_key);
        if (!user_str)
            return console.warn(
                'user not found in local storage with key: ',
                user_key
            );

        let user = null;
        try {
            user = JSON.parse(user_str);
        } catch (error) {
            console.warn('Error parsing user from local storage: ', error);
        }
        if (!user) return;

        // finally set everything up
        if (token && user) {
            S.rx_token.next(token);
            S.rx_user.next(user);

            const A = g_fn.get_auth();
            if(A){
                A.token = token;
                A.user = user;
            }
        }

        return;
    },
    g_app_init: function (broken: any) {
        // const A = g_fn.get_auth();
        // if (A && A.token && A.user) {
        //     const C = g_fn.get_current();
        //     console.log("g_app_init: token and user already set");
        //     return;
        // }


        const S = g_fn.AS;


        const setup_app_json_for_std_lib = () => {
            const APP_JSON = GC.APP_JSON as any;
            if (APP_JSON) {
                const C = g_fn.get_current();
                if(C){
                    // @todo: TYPES
                    C.app = APP_JSON;
                }

                g_fn.AS.app = {id: APP_JSON.id, name: APP_JSON.name, logo_url: APP_JSON.logo_url};
            }

            // we might have token before broken module is loaded
            const A = g_fn.get_auth();
            if(A && S.user && S.token){
                A.token = S.token;
                A.user = S.user;
            }
        }


        // std.lib may take time to load
        // const timer = setInterval(()=>{
        //     const B = g_fn.get_broken();
        //     if(!B) return;


        //     B.init(GC.APP_ID, GC.APP_JSON);



        //     setup_app_json_for_std_lib();
        //     S.rx_boken_module.next(B); // broken module loaded




        //     clearInterval(timer);
        // }, 100);


        setup_app_json_for_std_lib(); // once in the beginning, this will set enable login


        // we will put a callback for B.current.auth to set token and user
        // this is useful for oauth login like Google, Facebook, etc
        // because they are called using url callback ther eis no way for the bro_login() function to set this
        // bro_login() will not return anything for OAuth
        // The window will reload and broken module will get the token and user from local storage
        // broken module will call this calback and we will update the AS
        window.broken_on_login_success = (token, user) => {
            if(!token) return;
            if(!user) return;
            g_fn.AS.rx_token.next(token);
            g_fn.AS.rx_user.next(user);
        }



        return g_fn.g_app_state_init();
    },
    init_online: function () {
        // @ts-ignore
        const broken = g_fn.get_broken();
        if (!broken) return 'broken not found';
        if (!broken.online) return 'online module not found';

        console.log('INIT: online module');
        broken.current = broken.online;

        return g_fn.g_app_init(broken);
    },
    init_offline: function () {
        const broken = g_fn.get_broken();
        if (!broken) return 'broken not found';
        if (!broken.offline) return 'offline module not found';

        console.log('INIT: offline module');
        broken.current = broken.offline;

        return g_fn.g_app_init(broken);
    },

    // @deprecated
    find_login_comp: function (RT, CR) {
        let Login = null;
        for (let [k, v] of Object.entries(CR)) {
            if (k.match('login')) {
                // Login = v.comp; 
                break;
            }
        }

        return Login;
    },
    get_nearest_size: (size) => {
        // Give nearest size in GB/MB/KB
        if (size >= 1000000000) return `${(size / 1000000000).toFixed(2)} GB`;
        if (size >= 1000000) return `${(size / 1000000).toFixed(2)} MB`;
        if (size >= 1000) return `${(size / 1000).toFixed(2)} KB`;
        return `${size} B`;
    },
    get_file_obj_from_string: (s) => {
        let obj = {
            name: 'name',
            url: 'url',
            size: '0 bytes',
            type: 'none',
        };

        try {
            const o = JSON.parse(s);

            if (o.name) obj.name = o.name;
            if (o.url) obj.url = o.url;
            if (o.size) obj.size = g_fn.get_nearest_size(o.size);
            if (o.type) obj.type = o.type;
        } catch (error) {
            console.warn(`get_file_obj_from_string: ${JSON.stringify(error)}`);
        }

        return obj;
    },

    // Input functions
    get_attr_from_event: (e, any_of) => {
        const el = e.currentTarget;
        let value:any = null;
        for (let n of any_of) {
            value = el?.getAttribute(n); // if the elment is removed from DOM during action the element doesn't exists anymore
            if (value) return value;
        }

        if (!value) {
            console.warn(
                `@b_code_error: any_of ${any_of.join(', ')} must be present in el`,
                el
            );
        }
    },
    is_event_in_editing_mode: function (e) {
        const el = e.target;
        const nn = el.nodeName;
        if (nn === 'BODY') return false;

        const tags = ['INPUT', 'TEXTAREA', 'SELECT'];
        if (tags.includes(nn)) return true;

        if (el.contentEditable === 'true') return true;

        return false;
    },

    on_key_up: function (e, set_m_state, prop_name, converter?: ()=>void) {
        const value = g_fn.get_valid_target_value(e, converter);
        // if (value === undefined) return;
        //donot return on undefined, empty string is undefined and we will set the value to undefined and pass it
        if (!prop_name) return console.warn('prop_name is empty', e);
        set_m_state((s) => ({ ...s, [prop_name]: value })); // while setting no need to check
    },
    bro_on_key_up: function (e, set_m_state) {
        const name = g_fn.get_attr_from_event(e, ['b_name', 'name']);
        if (!name) return; // error will be logged in prev fn
        g_fn.on_key_up(e, set_m_state, name);
    },

    on_key_up_idx: (e, set_m_state, prop_name, idx, converter?: (v: any)=>any) => {
        const value = g_fn.get_valid_target_value(e, converter);
        if (value === undefined) return;

        set_m_state((s) => {
            const prop_state = s[prop_name];
            if (!prop_state) return s;
            if (!Array.isArray(prop_state)) {
                console.warn(
                    `prop state for : ${prop_name} is not an array`,
                    prop_state,
                    s
                );
                return s;
            }
            prop_state[idx] = value;
            return { ...s, [prop_name]: [...prop_state] };
        });

        // if(e.key === "Enter"){
        //     // @todo: fix state function

        // }
    },
    bro_on_key_up_idx: function (e, set_m_state) {
        const name = g_fn.get_attr_from_event(e, ['b_name', 'name']);
        if (!name) return; // error will be logged in prev fn
        const idx_s = g_fn.get_attr_from_event(e, ['b_idx', 'idx']);
        if (!idx_s) return; // error will be logged in prev fn
        const idx = parseInt(idx_s) || 0;
        g_fn.on_key_up_idx(e, set_m_state, name, idx);
    },

    on_input: function (e, set_m_state, prop_name, converter?: (v: any)=>any) {
        const value = g_fn.get_valid_target_value(e, converter);
        // if (value === undefined) return;
        // set_m_state((s) => ({ ...s, [prop_name]: value }));
        
        // save the patch
        set_m_state((s:any)=> {
            const new_state = produce(s, (draft)=>{
                draft[prop_name] = value;
            }, (_patch: Patch[], _inverse: Patch[])=>{
                // g_fn.AS.GSTORE.patches[]
            });
            return new_state;
        });
    },
    bro_on_input: function (e, INFO) {
        const set_M = INFO.set_M;
        const name = g_fn.get_attr_from_event(e, ['b_name', 'name']);
        if (!name) return; // error will be logged in prev fn
        g_fn.on_input(e, set_M, name);
    },

    on_input_select_many: (e, set_m_state, prop_name, converter?: (v: any)=>any) => {
        const value = g_fn.get_valid_target_value(e, converter);
        if (value === undefined) return;

        set_m_state((s) => {
            const prop_state = s[prop_name] || [];
            if (!prop_state) return s;
            if (!Array.isArray(prop_state)) {
                console.warn(
                    `prop state for : ${prop_name} is not an array`,
                    prop_state,
                    s
                );
                return s;
            }
            if(!prop_state.includes(value)) prop_state.push(value);
            else prop_state.splice(prop_state.indexOf(value), 1);
            return { ...s, [prop_name]: [...prop_state] };
        });
    },
    bro_on_input_select_any: function (e, INFO) {},
    bro_on_input_select_many: function (e, INFO) {
        const set_M = INFO.set_M;
        const name = g_fn.get_attr_from_event(e, ['b_name', 'name']);
        if (!name) return; // error will be logged in prev fn
        g_fn.on_input_select_many(e, set_M, name);
    },

    bro_on_input_filter: function (e, set_m_state) {
        const value = g_fn.get_valid_target_value(e);
        if (value === undefined) return;
        set_m_state((s) => ({ ...s, _meta: { filter: value } }));
    },


    on_input_idx: (e, set_m_state, prop_name, idx, converter?: (v:any)=>any) => {
        // @todo: fix state function

        const value = g_fn.get_valid_target_value(e, converter);
        if (value === undefined) return;

        set_m_state((s) => {
            const prop_state = s[prop_name];
            if (!prop_state) {
                console.warn(
                    `prop state for : ${prop_name} doesn't exists: `,
                    prop_state,
                    s
                );
                return s;
            }
            if (!Array.isArray(prop_state)) {
                console.warn(
                    `prop state for : ${prop_name} is not an array`,
                    prop_state,
                    s
                );
                return s;
            }
            prop_state[idx].v = value;
            return { ...s, [prop_name]: [...prop_state] };
        });
    },
    bro_on_input_idx: function (e, INFO) {
        const set_M = INFO.set_M;
        const name = g_fn.get_attr_from_event(e, ['b_name', 'name']);
        if (!name) return; // error will be logged in prev fn
        const idx_s = g_fn.get_attr_from_event(e, ['b_idx', 'idx']);
        if (!idx_s) return; // error will be logged in prev fn
        const idx = parseInt(idx_s) || 0;
        g_fn.on_input_idx(e, set_M, name, idx);
    },

    on_input_file: function(e, set_m_state, prop_name) {
        // @todo: fix state function

        if (!e.target) {
            console.warn(`target is empty`, e.target);
            return;
        }

        const files = e.target.files;
        if (!files) {
            console.warn(`files is empty`, files);
            return;
        }

        if (files.length === 0) {
            console.warn(`files is empty`, files);
            return;
        }

        const value = files[0];

        if (value === undefined) {
            console.warn(`value is undefined`, value);
            return;
        }

        console.log("Single file upload => ", value);

        value.url = URL.createObjectURL(value); // name, type, size already exits
        set_m_state((s) => ({ ...s, [prop_name]: value }));
    },
    bro_on_input_file: function (e, INFO) {
        const set_M = INFO.set_M;
        const name = g_fn.get_attr_from_event(e, ['b_name', 'name']);
        if (!name) return; // error will be logged in prev fn
        g_fn.on_input_file(e, set_M, name);
    },

    add_meta_key_to_state: function (M, prop_name) {
        const prop = M[prop_name];
        if(!prop) return;
        if(!Array.isArray(prop)) return;

        const _meta = M._meta || {};
        const K = 'keys_' + prop_name;
        const keys = _meta[K] || [];

        if(keys.length === prop.length) return; // already added

        for(let i=keys.length; i<prop.length; i++){
            keys.push(g_fn.get_ulid());
        }

        M._meta = {..._meta, [K]: keys};
    },

    on_input_file_idx: (e, set_m_state, prop_name, idx) => {
        // @todo: fix state function

        if (!e.target) {
            console.warn(`target is empty`, e.target);
            return;
        }

        const files = e.target.files as FileList|null;
        if (!files) {
            console.warn(`files is empty`, files);
            return;
        }

        if (Array.from(files).length === 0) {
            console.warn(`files is empty`, files);
            return;
        }

        Array.from(files).forEach((f) => {
            (f as File & {url: string}).url = URL.createObjectURL(f); // name, type, size already exits
        });
        const values = files;

        if (values === undefined) {
            console.warn(`value is undefined`, values);
            return;
        }

        set_m_state((s) => {
            const prop_state = s[prop_name];
            if (!prop_state) return s;

            if (!Array.isArray(prop_state)) {
                console.warn(
                    `prop state for : ${prop_name} is not an array`,
                    prop_state,
                    s
                );
                return s;
            }
            let l  = prop_state.length;
            const vals_len = values.length;
            const prev_key = idx > 0 ? prop_state[idx-1]?.id : null;
            const next_key = idx < l-1 ?  prop_state[idx+1].id : null;
            const vs:{id: string, v: File}[] = [];
            const ids = generateNKeysBetween(prev_key, next_key, vals_len);
            Array.from(values).map((f, i) => {
                vs.push({id: ids[i], v: f});
            })
            
            prop_state.splice(idx, 1, ...vs);

            // g_fn.add_meta_key_to_state(s, prop_name); // because we might have many items selected

            return { ...s, [prop_name]: [...prop_state] };
        });
    },
    bro_on_input_file_idx: function (e, INFO) {
        const set_M = INFO.set_M;
        const name = g_fn.get_attr_from_event(e, ['b_name', 'name']);
        if (!name) return; // error will be logged in prev fn
        const idx_s = g_fn.get_attr_from_event(e, ['b_idx', 'idx']);
        if (!idx_s) return; // error will be logged in prev fn
        const idx = parseInt(idx_s) || 0;
        g_fn.on_input_file_idx(e, set_M, name, idx);
    },

    bro_add_rel_item : function(rel_prop, set_M, cm, idx){

        const name = rel_prop;
        set_M((M) => {
            let _meta = M._meta;
            if (!_meta) {
                _meta = {};
                M._meta = _meta;
            }
            const K = 'keys_' + name;
            if (!_meta[K]) _meta[K] = [];
            const keys = _meta[K];
            // keys are for react to organise the list
            let p = M[name];
            if (!p) {
                M[name] = [];
            }
            p = M[name];
            if (!Array.isArray(p)) return M;

            let v = cm.id;

            let l = p.length;
            if(l === 0){
                p.push(v);
                keys.push(g_fn.get_ulid());
            }
            else if(p[l-1] === undefined){
                p[l-1] = v;
            }
            else{
                p.push(v);
                keys.push(g_fn.get_ulid())
            }

            // if(p.length > idx)p[idx] = v;
            // else{
            //     p.push(v);
            // }

            // if(keys.length > idx){
            //     keys.push(g_fn.get_ulid());
            // }
            // else{
            //     keys.push(g_fn.get_ulid());
            // }

            return { ...M, [name]: [...p] };
        })
    },

    bro_add_prop_item: function (e, INFO) {
        const set_M = INFO.set_M;
        const name = g_fn.get_attr_from_event(e, ['b_name', 'name']);
        if (!name) return;
        const b_type = g_fn.get_attr_from_event(e, ['b_type', 'type']);
        if (!b_type) return;

        const is_rel = g_fn.get_attr_from_event(e, ["is_rel"]);

        
        

        set_M((M) => {
            
            // keys are for react to organise the list
            let p = M[name];
            if (!p) {
                M[name] = [];
            }
            p = M[name];
            if (!Array.isArray(p)) return M;

            if(is_rel === "true"){
                const id = g_fn.get_ulid() || Math.random().toString(36).substring(0, 8);
                p.push({id:id});
                return { ...M, [name]: [...p] };
            }


            
            let v:boolean|undefined = undefined;
            if (b_type === 'boolean') v = false;
        
            p.sort((a, b) => {
                if(a.id > b.id){
                    return 1
                }
                else if (a.id < b.id){
                    return -1
                }
                else{
                    return 0
                }
            });

            let id = generateKeyBetween(null, null); // a0
            if(p.length > 0){
                const last_item = p[p.length - 1];
                id = generateKeyBetween(last_item.id, null);
            }

            p.push({id: id, v});
          
            return { ...M, [name]: [...p] };
        });
    },


    bro_delete_prop_item: function (e, INFO) {
        const set_M = INFO.set_M;
        const name = g_fn.get_attr_from_event(e, ['b_name', 'name']);
        if (!name) return;
        const idx_s = g_fn.get_attr_from_event(e, ['b_idx', 'idx']);
        if (!idx_s) return;
        const idx = parseInt(idx_s);
        if (isNaN(idx)) return;
        set_M((M) => {
            let p = M[name];
            if (!p) return M;
            if (!Array.isArray(p)) return M;
            console.log("idx : ", idx);
            p.splice(idx, 1);
            return { ...M, [name]: [...p] };
        });
    },

    bro_delete_prop: function(e, INFO){
        const set_M = INFO.set_M;
        const name = g_fn.get_attr_from_event(e, ['b_name', 'name']);
        if (!name) return;
        console.log("name : ", name);
        set_M((M) => {
            if(!M) return M;
            let p = M[name];
            console.log("p : ", p);
            if(p === undefined) return M;
            delete M[name];
            return {...M};
        })
    },

    on_input_relation: function (e, value, set_M, prop_name, idx) {
        console.log("ON INPUT RELATION : ", e, value, set_M, prop_name);
        set_M(M=>{
            console.log("ON INPUT RELATION : ", JSON.stringify(M));
            // is_one
            if(idx === undefined){
                M[prop_name] = value || {}; // {id: ulid, ...}
                return {...M};
            }
            // is_many
            else{
                // array
                if(!isNaN(idx)){
                    const P = M[prop_name];
                    if(!Array.isArray(P) || P.length < idx+1) return M;
    
                    M[prop_name][idx] = value || {}; // {id: ulid, ...}
                    // seller: {id: ulid}
                    // seller: id
                    return {...M, [prop_name]: [...P]};
                }
                else console.warn("INVALID IDX for relation: ", e, value, set_M, prop_name, idx);
            }
            return M
        })
    },

    on_is_json_change: function (M, props) {
        console.log("MY INFO => ", props.INFO);
        const parent_set_M = props.INFO.set_M;
        if(!parent_set_M) return console.warn("@BROKEN INTERNAL ERROR: CAN'T FIND set_M IN PARENT");
        if(typeof(parent_set_M) !== "function") return console.warn("@BROKEN INTERNAL ERROR: set_M IS NOT A FUNCTION");

        const prop_name = props.prop_name;
        if(!prop_name) return console.warn("@BROKEN INTERNAL ERROR: CAN'T FIND PROP_NAME IN PROPS");

        const idx = props.IDX;


        console.log("M : ", M);

        if(isNaN(idx)){
            parent_set_M(PM=>{
                if(!M) PM[prop_name] = {};
                if(M && M.id) PM[prop_name] = M || {};
                if(M && !M.id) PM[prop_name] = {...M, id : g_fn.get_ulid()} || {};
                return {...PM};
            });
        }
        else{

            parent_set_M(PM=>{
                console.log("PM : ", PM, "M is: ", M);
                console.log("propname : ", prop_name);
                const P = PM[prop_name];
                console.log("P : ", P);
                if(!Array.isArray(P) || P.length < idx) return PM;
                if(!P[idx].id){
                    console.warn("id not found for item with index : ", idx);
                    return PM;
                }
                if(!M) P[idx].v = {};
                if(M && M.id) P[idx].v = M || {};
                if(M && !M.id) P[idx].v = {...M, id : g_fn.get_ulid()} || {}
                return {...PM, [prop_name]: [...P]};

            });
        }


    },



    bro_download_file: async function (cf_src_url) {
        if (!cf_src_url) return {success: false, message: 'No URL provided'};

        const r = await fetch(cf_src_url);
        if (!r) return {success: false, message: 'Error fetching URL'};

        const p = await r.json();
        if (!p || !p.success) return {success: false, message: 'Error parsing JSON'};

        const data = p.data;
        if (!data || !Array.isArray(data) || !data[0] || !data[0].url) return {success: false, message: 'Error parsing JSON'};
        const url = p.data[0].url;

        window.open(url, '_blank');
        return {success: true};
    },




    increment: function (INFO) {
        const set_M = INFO.set_M;
        set_M((m) => {
            // @ts-ignore
            if (Object.hasOwn(m, 'count')) m.count += 1;
            else {
                for (let [k, v] of Object.entries(m)) {
                    if (typeof v === 'number') {
                        m[k] += 1;
                        break;
                    }
                }
            }
            return { ...m };
        });
    },
    decrement: function (INFO) {
        alert("@todo: decrement");
    },

    check_email_format: (email) => {
        const parts1 = email.split('@');
        if (parts1.length !== 2) return false;
        const parts2 = parts1[1].split('.');
        if (parts2.length !== 2) return false;
        if (parts2[1].length < 2) return false;
        return true;
    },

    // Returns true if client_id is set - To show state in login page for applications
    set_token_after_login: function (r, set_M?: any) {
        if (!r) return;
        if (!r.success) {
            g_fn.feedback("Unable to login, please try again!", "error");
            console.error('error while logging in : ', r.errors.join(' , '));
            return;
        }

        if (!r.data) {
            g_fn.feedback("Unable to login, please try again!", "error");
            console.error('data not found in response');
            return;
        }

        if (!r.data.token) {
            if(set_M) set_M((s) => ({ ...s, email_sent: true }));
            g_fn.feedback('Email sent to your inbox. Please check your email and click on the link to login', "log");
            return true;
        }

        if (r.data.token) {
            if(set_M) set_M((s) => ({ ...s, email_sent: false, token: r.data.token }));

            if (g_fn.AS.rx_user) {
                if (g_fn.AS.rx_user.next) {
                    g_fn.AS.rx_user.next(r.data.user);
                }
                if (g_fn.AS.rx_token.next) {
                    g_fn.AS.rx_token.next(r.data.token);
                }
            }

            g_fn.feedback('Login Successful!', "success");
        }

        return false;
    },

    // broken std.lib
    bro_login: async function (e, M, INFO, role) { // @how: would one get role
        const set_M = INFO.set_M;

        if (!M.email) return g_fn.feedback('NO EMAIL FOUND', "warn");

        const email_is_valid = g_fn.check_email_format(M.email);
        if (!email_is_valid) {
            g_fn.feedback('Please enter a valid email', "warn");
            return;
        }

        const auth = g_fn.get_auth();
        if (!auth) return g_fn.feedback('Error in broken std.lib: auth not found', "error");

        const r = await auth.login(M.email, GC.APP_ID, role);
        return g_fn.set_token_after_login(r, set_M);
    },
    bro_otp_create: async function (phone_number, app_name, app_id, role) {
        const auth = g_fn.get_auth();
        if (!auth) return g_fn.feedback('Error in broken std.lib: auth not found', "error");

        const r = await auth.otp.create(phone_number, app_name, app_id, role);
        return r;
    },
    bro_otp_verify: async function (phone_number, otp, hash, app_id, role) {
        const auth = g_fn.get_auth();
        if (!auth) return g_fn.feedback('Error in broken std.lib: auth not found', "error");

        const r = await auth.otp.verify(phone_number, otp, hash, app_id, role);
        g_fn.set_token_after_login(r);
        return r;
    },
    bro_google_login: async function (role) {
        const auth = g_fn.get_auth();
        if (!auth) return g_fn.feedback('Error in broken std.lib: auth not found', "error");

        const r = await auth.oauth.google.login(GC.APP_ID, role);
        g_fn.set_token_after_login(r);
    },
    bro_microsoft_login: async function (role) {
        const auth = g_fn.get_auth();
        if (!auth) return g_fn.feedback('Error in broken std.lib: auth not found', "error");

        const r = await auth.oauth.microsoft.login(GC.APP_ID, role);
        g_fn.set_token_after_login(r);
    },
    bro_github_login: async function (role) {
        const auth = g_fn.get_auth();
        if (!auth) return g_fn.feedback('Error in broken std.lib: auth not found', "error");

        const r = await auth.oauth.github.login(GC.APP_ID, role);
        g_fn.set_token_after_login(r);
    },
    bro_linkedin_login: async function (role) {
        const auth = g_fn.get_auth();
        if (!auth) return g_fn.feedback('Error in broken std.lib: auth not found', "error");

        const r = await auth.oauth.linkedin.login(GC.APP_ID, role);
        g_fn.set_token_after_login(r);
    },
    bro_twitter_login: async function (role) {
        const auth = g_fn.get_auth();
        if (!auth) return g_fn.feedback('Error in broken std.lib: auth not found', "error");

        const r = await auth.oauth.twitter.login(GC.APP_ID, role);
        g_fn.set_token_after_login(r);
    },

    bro_logout: async function () {
        const auth = g_fn.get_auth();
        if (!auth) return g_fn.feedback('Error in broken std.lib: auth not found', "error");

        const app_id = GC.APP_ID;
        await auth.logout(app_id);

        g_fn.AS.rx_user.next(null);
        g_fn.AS.rx_token.next('');

        g_fn.AS.navigate("");

        g_fn.feedback('Logout Successful', "success");
    },

    inc_tx: function (type, model_id, entity_ids, prop_names, data) {
        g_fn.AS.db.count++;
        const new_tx = {
            type,
            count: g_fn.AS.db.count,
            model_id,
            entity_ids,
            prop_names,
            data,
        }
        g_fn.AS.db.tx.next(new_tx);
    },

    bro_go_to_page: function (e, M, INFO, props) {
        // if(!INFO) return g_fn.feedback("Can't go to page: INFO not found", "error");

        const page_id = g_fn.get_attr_from_event(e, ['page_id', 'page']);
        if (!page_id) return g_fn.feedback("Can't go to page: page_id not found", "error");

        const model_id = INFO.model_id;
        const id = M?.id;

        const url_state = g_fn.AS.rx_url_state.getValue();
        const state = {...url_state, model_id, entity_id: id};

        const url = new URL(window.location.href);
        url.searchParams.set('state', JSON.stringify(state));

        const navigate = AS.navigate;
        if(!navigate || typeof(navigate) !== "function") return g_fn.feedback("Can't go to page: navigate function not found", "error");
        AS.rx_url_state.next(state);
        navigate(page_id + url.search);



        g_fn.runtime_set_page(page_id);
    },

    bro_go_to_page_by_name : function (name : string) {
        const pages = g_fn.AS.pages;
        if(typeof(pages) === "string") return;

        const page = pages.find(p=>p.name === name);

        if(!page) return;

        const navigate = AS.navigate;
        if(!navigate || typeof(navigate) !== "function") return g_fn.feedback("Can't go to page: navigate function not found", "error");

        navigate(page.bid);
        g_fn.runtime_set_page(page.bid);
    },




    bro_navigate: function (e) {
        // if(!INFO) return g_fn.feedback("Can't go to page: INFO not found", "error");

        const page_id = g_fn.get_attr_from_event(e, ['page_id', 'page']);
        if (!page_id) return g_fn.feedback("Can't go to page: page_id not found", "error");

        const state = g_fn.get_attr_from_event(e, ['navigate_state']); // This is JSON stringified

        const navigate = AS.navigate;
        if (!navigate || typeof (navigate) !== "function") return g_fn.feedback("Can't go to page: navigate function not found", "error");

        // Check if the state is for getting user profile
        let state_obj = {} as any;

        try {
            state_obj = JSON.parse(state);
        }
        catch (error) {
            console.warn("Error parsing state: ", error);
            return;
        }

        const model_id = state_obj.model_id;
        const entity_id = state_obj.entity_id;

        if (model_id && model_id === "user_profile") {
            // Replace the model_id with actual model id of user model
            const user_model = g_fn.get_model_by_name("user");
            if (user_model) state_obj.model_id = user_model.id;
        }

        if (entity_id && entity_id === "logged_in_user") {
            // Replace the entity_id with actual logged in user id
            const user = g_fn.AS.rx_user.getValue();
            if (user) state_obj.entity_id = user.id;
        }

        navigate(page_id+"?state="+JSON.stringify(state_obj));

        // Set the page state
        g_fn.runtime_set_url_state();



        g_fn.runtime_set_page(page_id);
    },




    bro_alert: function (e) {
        const msg = g_fn.get_attr_from_event(e, ['alert']);

        alert(msg);
    },

    bro_toast: function (e) {
        const msg = g_fn.get_attr_from_event(e, ['toast']);
        if (!msg) return g_fn.feedback("Can't toast: msg not found", "error");

        g_fn.feedback(msg, "log");
    },

    bro_formula: function (e, state) {
        const formula = g_fn.get_attr_from_event(e, ['formula']);
        if (!formula) return g_fn.feedback("Can't calculate: formula not found", "error");

        const evalWithVariables = (func, vars) => {
            return new Function('v', 'with (v) { return (' + func + ')}')(vars);
        };

        const res = evalWithVariables(formula, state);
        g_fn.feedback(`The value is ${res}`, "log");
    },

    bro_accordion: function (e) {
        const current_el = e.currentTarget;

        const sibling_el = current_el.nextElementSibling;
        if (!sibling_el) return g_fn.feedback("Can't find sibling element", "error");

        // if open, close. if closed, open
        sibling_el.classList.toggle('collapse');
    },
    bro_dropdown: function (e) {
        const sel_el = e.currentTarget;
        const val = sel_el.value;
        sel_el.setAttribute('chosen_value', val);
    },
    bro_print: function (e) {
        const sel_el_sibling_el = e.currentTarget?.previousElementSibling;
        const old_doc_val = document.body.innerHTML;
        document.body.innerHTML = sel_el_sibling_el.innerHTML;
        window.print();
        document.body.innerHTML = old_doc_val;
    },

    get_model: function (model_id : string) {
        const AJ = GC.APP_JSON as any;
        if (!AJ) return null;

        const model = AJ.models.find((m) => m.id === model_id);
        if (!model) return null;

        return model;
    },
    get_model_by_name: function (name : string) {
        const AJ = GC.APP_JSON as any;
        if (!AJ) return null;

        const model = AJ.models.find((m) => m.name.toLowerCase() === name.toLowerCase());
        if (!model) return null;

        return model;
    },

    assign_id_and_user_and_time: function (data: any, is_update?: boolean) {
        // set user and id
        if(is_update){
            // NO NEED - THESE ARE BEING SET IN BACKEND!!!
            const user = g_fn.get_user();
            if(!user) return console.warn("User not found", "error");
            data.updated_by = user.id;
            data.updated_at = new Date().getTime();
        }
        else{
            if(!data.id) data.id = g_fn.get_ulid() || data.id;

            // NO NEED - THESE ARE BEING SET IN BACKEND!!!
            const user = g_fn.AS.rx_user.getValue() || {};
            data.created_by = user.id;
            data.updated_by = user.id;
            data.created_at = new Date().getTime();
            data.updated_at = new Date().getTime();
        }
    },



    prepare_data_for_create: async function (model_id: string, data: any, is_update?: boolean) {
        if(!data || !data.id) return null;

        const MODEL = g_fn.get_model(model_id);
        if(!MODEL) {
            g_fn.feedback(`Model not found: ${model_id}`, "error");
            return null;
        }

        const app_id = GC.APP_ID;

        const api = g_fn.get_api();
        if (!api) return g_fn.feedback('Unable to get api', "error");


        // set id and user and time
        g_fn.assign_id_and_user_and_time(data, is_update);



        // any of the props of data could be image, images[], file or files[]
        // const images: File[] = [];
        // const files:  File[] = [];

        const get_url = (r) => {
            if (!r || !r.success || !r.data) {
                g_fn.feedback('Unable to upload ', "error");
                return;
            }
            const o = r.data;

            if (!o) {
                g_fn.feedback('Invalid response for upload ', "error");
                return;
            }

            if (o.url) return o.url;

            return null;
        };


        const DEFAULT_FILE_URL = "https://image.lexica.art/full_jpg/1716b9b9-3bdc-4f9f-a933-ecac5b141cbd"

        const get_file_json_obj = async (F, eid, prop_name, idx, IS_IMAGE) => {
            if(typeof(F) === "string"){
                return {name: F, url: F, size: 1, type: "image/jpeg"};
            }
            else if(!(F instanceof File)){
                if(F && F.url && F.name && F.size && F.type) return F; // already formated json obj
                return {name: "", url: DEFAULT_FILE_URL, size: 0, type: "jpg"};
            }


            let r:any = {};
            if (IS_IMAGE) {
                const file = { image: F, name: F.name || 'file', uid: idx.toString() };
                r = await api.image
                    .put_one('PUBLIC', app_id, model_id, eid, prop_name, file)
                    .catch((e) => {
                        g_fn.feedback(`Error in file upload: ${e.message} `, "error");
                    });
            }
            else{
                const file = { file: F, name: F.name || 'file', uid: idx.toString() };
                r = await api.file
                .put_one('PRIVATE', app_id, model_id, eid, prop_name, file)
                .catch((e) => {
                    g_fn.feedback(`Error in file upload: ${e.message} `, "error");
                });
            }

            const url = get_url(r) || DEFAULT_FILE_URL;
            return {name: F.name, url, size: F.size, type: F.type};
        }

        const get_file_json_obj_for_arr = async(Fitem, eid, prop_name, idx, IS_IMAGE) => {
            const r = await get_file_json_obj(Fitem.v, eid, prop_name, idx, IS_IMAGE);
            return {id: Fitem.id, v: r};
        }


        // Images && Files
        // app_json?.models[0].props[0].type
        for(let p of MODEL.props){
            if (!["file", "image"].includes(p.type)) continue;

            const k = p.name;
            const v = data[k];

            // v is not a required property
            if(v === undefined) continue;


            const IS_IMAGE = p.type === "image";

            if(p.is_many){
                if(Array.isArray(v)) {
                    data[k] = await Promise.all(v.map(async (f, i)=> await get_file_json_obj_for_arr(f, data.id, k, i, IS_IMAGE)));
                }
                else {
                    data[k] = [];
                }
            }
            else{
                data[k] = await get_file_json_obj(v, data.id, k, 0, IS_IMAGE);
            }
        }


        // relations
        // convert object to id before saving
        for(let p of MODEL.props){
            if(!p.is_relation) continue;

            const k = p.name;
            const v = data[k];

            if(p.is_many){
                if(Array.isArray(v)) {
                    data[k] = v.map((rm)=>{
                        if(typeof(rm) === "object") return rm.id;
                        return rm;
                    }).filter((rm)=>rm);
                }
            }
            else{
                if(typeof(v) === "object") data[k] = v.id || "SYSTEM";
                if(typeof(v) === "string") data[k] = v;
                if(!data[k]) delete data[k];
            }
        }



        // if relation is user the user id has to be 26 character
        // remove this limitation




        // Default value for boolean
        // @for boolean type if it is not selected then it should be false
        // if it is not in UI it should be undefined
        for(let p of MODEL.props){
            if(p.type !== "boolean") continue;

            if(p.is_many){
                const ds = data[p.name];
                if(Array.isArray(ds)){
                    data[p.name] = ds.map((d)=> d || false);
                }
            }
            else{
                data[p.name] = data[p.name] || false;
            }
        }



    },
    prepare_data_for_update: async function (model_id: string, PM: any, M: any) {
        // @commented by ashish on 17th Dec 2023. _meta __prevM no longer used

        if(M.id && M.add && M.delete) return M;

        if(!PM) return console.warn("PREPARE DATA FOR UPDATE PM is null");

        console.log("PREPARE DATA FOR UPDATE PM and M : ", PM, M);
        
        // let's remove unnecessary props
        // for(let [k, v] of Object.entries(M)){
        //     if(k.startsWith("_")) delete M[k]; // for _meta and __prevM
        // }
        // for(let [k, v] of Object.entries(PM)){
        //     if(k.startsWith("_")) delete PM[k]; // for _meta and __prevM
        // }


        // FIRST
        // update: // images, files, default values, id and user and time
        await g_fn.prepare_data_for_create(model_id, M, true);


        const all_keys      = [...Object.keys(M), ...Object.keys(PM)];
        const unique_keys   = [...new Set(all_keys)];


        const updates = {id: M.id, add : {}, delete: {}}; // {prop_name: [1, 2],  prop_name: "1"}
        // let's compare
        for(let k of unique_keys){
            if(k.startsWith("__")) continue; // ignore __meta

            let a = PM[k];
            let b = M[k];

            const u = g_fn.update_one_get_changed_values(a, b);

            if(u.set !== null)      updates.add[k] = u.set;
            if(u.unset !== null)    updates.delete[k] = u.unset;

            if(u.added.length)      updates.add[k] = u.added;
            if(u.deleted.length)    updates.delete[k] = u.deleted;
        }

        return updates;

    },

    upload_csv_data: function (e, model_id) {
        const file = e.target.files[0];
        if (!file) return;

        if (!model_id) return console.warn('model_id not found for uploading csv');

        const model = g_fn.get_model(model_id);
        const upload_data:any[] = [];

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const text = ev.target?.result;

            // check if string or ArrayBuffer
            if (typeof text !== 'string') return console.warn('text is not string');

            const rows = text.split('\n');
            const header = rows[0].split(',');
            const data = rows.slice(1).map((r) => r.split(','));

            data.forEach((d) => {
                const obj:any = {};
                d.forEach((v, i) => {
                    // the cases of file/image are handled in prepare_data_for_create
                    obj[header[i]] = v;
                });
                upload_data.push(obj);
            });

            // add id, created_by, updated_by, created_at, updated_at if not exists
            upload_data.forEach((d) => {
                if (!d.id) d.id = g_fn.get_ulid();

                const now = Date.now();
                if (!d.created_at) d.created_at = now;
                if (!d.updated_at) d.updated_at = now;

                const user = g_fn.get_user();
                if(!user) return console.warn("User not found", "error");
                if (!d.created_by) d.created_by = user.id;
                if (!d.updated_by) d.updated_by = user.id;
            });
            console.log('upload_data : ', upload_data);

            const res = await g_fn.create_many(model.id, upload_data);

            if (!res || !res.success) return;

            // on success
            g_fn.feedback('Uploaded Successfully', "success");
            // clear the input
            e.target.value = null;
        };
        reader.readAsText(file);
    },
    download_csv_data: async function (model_id) {
        if (!model_id) return console.warn('model_id not found for downloading csv');

        const app_id = GC.APP_ID;

        const query: FILTER_PARAMS = {filters: [], sorts: [], unique: false, limit: 50, id: undefined};
        const r = await g_fn.get_many(model_id, query); // limit is set to be max 50 in backend
        if (!r || !r.success) return g_fn.feedback('Getting data failure', "error");

        const data = r.data;

        const model = g_fn.get_model(model_id);

        // convert json into csv
        const header:string[] = [];
        const rows:string[] = [];

        const prop_types_mapping = {};
        model.props.forEach((p:any) => {
            prop_types_mapping[p.name] = p.type;
            header.push(p.name);
        });

        data.forEach((d) => {
            const row:any = [];
            header.forEach((h) => {
                // created_by, updated_by, created_at, updated_at are not shown in csv
                if (['created_by', 'updated_by', 'created_at', 'updated_at'].includes(h)) return;
                const prop_type = prop_types_mapping[h];
                if (!prop_type) return;
                if (prop_type === 'file' || prop_type === 'image') {
                    // modify the structure assuming a link is given
                    row.push(d[h]?.url);
                }
                else {
                    row.push(d[h]);
                }
            });
            rows.push(row);
        });

        // @ts-ignore
        const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${model.name}.csv`);

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    create_one: async function (model_id: string, state: any): DEFAULT_RES_SINGLE_P<any> {
        console.log("G_FN CREATE ONE DATA : ", state, model_id);
        if (!state){
            g_fn.feedback('No state found to create entity', "error");
            return {success: false, errors: ['NO_DATA']};
        }


        // const data = JSON.parse(JSON.stringify(state)); // clone
        // @warn: If we clone this then file object will get converted to {} when stringified, we will loose all file info
        // const data = state; // // don't clone here first prepare data and clone just before sending to server
        let data = state;

        



        const token = g_fn.get_token();
        if (!token){
            g_fn.feedback('Unable to get token', "error");
            return {success: false, errors: ["NO_TOKEN"]};
        }


        const api = g_fn.get_api();
        if (!api){
            g_fn.feedback('Unable to get api', "error");
            return {success: false, errors: ["NO_API"]};
        }



        //Doing auth based on roles before img adding in the frontend
        const user = g_fn.get_user();
        const permission = authz.create(model_id, data, user);
        if(!permission.allowed) {
            g_fn.feedback(`Creation Unsuccessfull: ${permission.reason}`)
            return {success: false, errors: ["NO_PERMISSION", String(permission.reason)]};
        }



        

        await g_fn.prepare_data_for_create(model_id, data);

        

        // const d = JSON.parse(JSON.stringify(data));
        // delete d._meta;     // where have we used _meta?
        // delete d.__meta;    // remove all __meta properties
        // data = produce(data, (draft) => {
        //     delete draft._meta;     // // where have we used _meta?
        //     delete draft.__meta;    // remove all __meta properties
        // });

        console.log("API DATASCRIPT CREATE ONE : ", data);
        const app_id = GC.APP_ID;
        const r = await api.datascript.create_one(app_id, model_id, token, data);

        if (!r || !r.success) {
            g_fn.feedback(`Creation unsuccessful`, "error");
            console.warn(
                `Failed to create one entity with id :  ${data.id}`,
                r.errors,
                app_id,
                model_id,
                data
            );
            return {success: false, errors: r.errors};
        }


        g_fn.feedback(`Created Successfully`, "success");


        g_fn.inc_tx("create", model_id, [r.data.id], ["*"], r.data);
        g_fn.AS.session.last_data = data;
        return { success: true, data };
    },
    bro_create_one: async function (e:any, data:any, INFO: any, props: any) {
        const model_id = INFO.model_id;
        if (!model_id) return console.warn("model_id not found Can't create item");

        console.log("BRO CREATE ONE : ", data);

        const r = await AS.GSTORE.create_one(model_id, data);
        if (!r || !r.success) return;

        // on success
        if (r.data && props.on_created && typeof(props.on_created) === 'function') {
            props.on_created(e, r.data, INFO, props);
        }
    },
    create_many: async function (model_id, data) {
        if (!model_id || !data || !Array.isArray(data) || !data.length) return g_fn.feedback('No data found to create_many', "error");

        data.forEach((d) => {
            // remove the _meta property. It is only useful for preview we don't have to store it in db
            delete d._meta;
        });


        const token = g_fn.get_token();
        if (!token) return g_fn.feedback('Unable to get token', "error");

        const api = g_fn.get_api();
        if (!api) return g_fn.feedback('Unable to get api', "error");

        //Doing auth based on roles before img adding in the frontend
        const user = g_fn.get_user();
        const permission = authz.create(model_id, data, user);
        if(!permission) {
            return;
        }
        if(!permission.allowed) {
            g_fn.feedback(`Creation Unsuccessfull: ${permission.reason}`)
            return ;
        }
        for(let d of data){
            await g_fn.prepare_data_for_create(model_id, d);
        }

        const app_id = GC.APP_ID;
        const r = await api.datascript.create_many(app_id, model_id, token, data);

        if (!r || !r.success) {
            g_fn.feedback(`Creation unsuccessful`, "error");
            console.warn(
                `Failed to create many entity with ids :  ${data.map(d=>d.id).join(", ")}`,
                r.errors,
                app_id,
                model_id,
                data
            );
            return;
        }

        g_fn.feedback(`Created Successfully`, "success");

        g_fn.inc_tx("create", model_id, r.data.map(d=>d.id), ["*"], r.data);
        g_fn.AS.session.last_data = data[0];
        return { success: true, data };

    },
    bro_select_one: async function (e, state, INFO, props) {
        let model_id = g_fn.get_attr_from_event(e, ['model_id']);
        if (!model_id) {
            model_id = INFO.model_id;
        }
        if(!model_id) return console.warn("model_id not found Can't select item");

        const selected = g_fn.AS.rx_selected_entity;

        const v = selected.getValue();
        v[model_id] = state;
        selected.next(v);

        AS.GSTORE.set_selected_entities(model_id, state.id, false);

        if (!props.on_selected && typeof props.on_selected !== 'function') return console.warn('on_selected fn not found', props);

        // const cloned_data = JSON.parse(JSON.stringify(state)); // files maynot be cloned , so just send the state
        props.on_selected(e, state);
    },
    get_one : async function (model_id: string, {filters, sort, limit, id}) {
        if(id){
            //get with id val
            const user = g_fn.get_user();
            const token = g_fn.get_token();
            const api = g_fn.get_api();
            if (!user || !token || !api)
                return g_fn.feedback('Unable to get user || token || api', "error");

            // Doing auth based on roles before img adding in the frontend
            const permission = authz.get(model_id, user);
            if(!permission.allowed) {
                g_fn.feedback(`Fetching data Unsuccessfull: ${permission.reason}`)
                return ;
            }


            const app_id = GC.APP_ID;
            const r = await api.datascript.get_one(app_id, model_id, token, id);
            if (!r || !r.success) {
                g_fn.feedback(`Get one unsuccessful`, "error");
                console.warn(
                    `Failed to get one entity with id :  ${id}`,
                    r.errors,
                    app_id,
                    model_id,
                    id
                );
                return;
            }

            // console.log("@debug: THE DATA IN GET ONE DATASCRIPT IS => ", r, app_id, model_id, token, id);

            if(r.data){
                const data = r.data;
                // g_fn.add_meta_to_data(data); // this also done in useeffect inside the model
                return data;
            }
            return console.error("NO DATA FOUND IN GET ONE DATASCRIPT");
        }
        else{
            //limit is 1
            const r = await g_fn.get_many(model_id, {unique: false, filters, sorts: [], limit:1, id: undefined});
            if(r && Array.isArray(r) && r.length){
                return r[0];
            }
            return;
        }
    },
    get_one_find_id: function (props: any, INFO:any){
        const model_id = INFO.model_id;
        if(!model_id) return console.warn("NO MODEL ID FOUND TO FIND ID FOR GET ONE");
        // take from props
        if(props && props.M){
            if(typeof(props.M) === "string") {
                return props.M;
            }
            else if(props.M.id) {
                return props.M.id
            }
            else {
                // do nothing
            }
        }

        // filters => this will not give id without querying db

        // url
        const url_state = g_fn.runtime_get_url_state();
        if(url_state && url_state.model_id && url_state.entity_id){
            // check INFO.model_id === url_state.model_id

            return url_state.entity_id;
        }

        // INFO.query
        // e.g: INFO.query = {[user].id}
        // const q = INFO.query;
        // if(q){
        //     const prop_name = q.prop_name;
        //     const prop_value = g_fn.get_prop_value_from_query(q.prop_value);
        //     const op = q.op;
        //     if(op === "eq" ) {
        //         const entity_store = AS.GSTORE.entity[model_id];
        //         if(entity_store) {
        //             const id = Object.entries(entity_store).find(e=>(e[0] === prop_name) && (e[1] === prop_value));
        //             if(id) return id[0];
        //         }
        //     }
        //     // const entity_store = AS.GSTORE.entity[model_id];
        //     // if(entity_store) {
        //     //     Object.entries(entity_store).find(e=>(e[0] === q.prop_name) && (e[1] === q.prop_value));
        //     // }
        //     if(q === "{[user].id}"){
        //         console.warn("QUERY FOUND : ", q, g_fn.AS.user)
        //         return g_fn.AS.user?.id
        //     }
        // }

        return null;
    },
    get_one_query_entity : async function (props: any, INFO:any){
        const model_id = INFO.model_id;
        if(!model_id) return console.warn("NO MODEL ID FOUND TO QUERY ENTITY FOR GET ONE");
        const query = INFO.query;
        if(!query) return console.warn("NO QUERY FOUND TO GET ONE ENTITY");
        const op = query.op;
        const prop_name = query.prop_name;
        const prop_value = g_fn.get_prop_value_from_query(query.prop_value);
        const r = await AS.GSTORE.get_many(model_id, {filters: [{op, attr : prop_name, val : prop_value}], sort: {attr : "updated_at", order : "DESC"}, unique: false, limit: 1, id : "custom"});
        if(!r.success) {
            console.warn("ERROR IN GET ONE QUERY ENTITY : ", r);
            return;
        }
        if(!r.data || !r.data.length) return console.warn("NO DATA FOUND IN GET ONE QUERY ENTITY");
        const entity = r.data[0];
        return entity;
    },
    get_prop_value_from_query : function (prop_value : string) {
        if(prop_value === "{[user].id}") {
            return g_fn.AS.user?.id;
        }
        return prop_value;
    },
    get_selected_entity_id : function (props : any, INFO : any) {
        const model_id = INFO.model_id;
        if(!model_id) return console.warn("NO MODEL ID FOUND FROM INFO TO GET SELECTED ENTITY ID");
        const selected_entities = AS.GSTORE.selected_entity[model_id];
        if(selected_entities && selected_entities.length === 1) {
            return selected_entities[0];
        }
        else if(INFO.query) {
            if(INFO.query === "{[user].id}") {
                return g_fn.AS.user?.id;
            }
        }
        else {
            return;
        }
    },
    get_selected_entity : async function (props : any, INFO : any) {
        const id = g_fn.get_selected_entity_id(props, INFO);
        if(!id) return console.warn("COULD NOT GET SELECTED ENTITY ID");
        const selected_entity = await AS.GSTORE.get_one_entity(INFO.model_id, id);
        if(!selected_entity) return console.warn("COULD NOT GET SELECTED ENTITY");
        return selected_entity;
    },
    generate_user_id_by_email : async function (data : any) {
        const email = data?.email;
        if(!email) return;
        const myText = new TextEncoder().encode(email);

        const myDigest = await crypto.subtle.digest(
            {
            name: 'SHA-256',
            },
            myText // The data you want to hash as an ArrayBuffer
        );
        const hashArray = Array.from(new Uint8Array(myDigest)) 
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        //return first 32 characters
        let hash_str = hashHex.substring(0, 32);

        return hash_str;
    },
    get_many_qid : function (FO:any) {
        const FILTERS = g_fn.generate_filters(FO);

        const q = {
            filters: FILTERS,
            sorts: FO.sorts,
            limit: FO.limit,
            cursor_first: FO.cursor_first,
            cursor_last: FO.cursor_last,
            offset: FO.offset
        };

        const qid = hashJoaat(JSON.stringify(q));

        return qid;
    },
    bro_get_one: async function (INFO, set_M, props) {

        const app_id    = GC.APP_ID;
        const mid       = INFO.model_id;

        async function get_one_and_set(model_id, {filters, sort, limit, id}){

            const r = await g_fn.get_one(
                model_id,
                {filters, sort, limit, id},
            );

            // console.log("@debug get_one_and_set : ", id, r, INFO);

            if(r){
                set_M((v) => {
                    return r
                })
            }
        }

        // @todo: it's better to use props.INFO.set_M

        // take from props.M
        if(props && props.M && props.M.id){
            const M = await g_fn.AS.GSTORE.get_one_entity(mid, props.M.id);
            
            // const M = props.M;

            // M & M.id exits
            if(Object.keys(M).length === 1){
                // only id is present
                const params = {
                    filters: null, sort: null, limit: 1,
                    id: M.id
                };
                await get_one_and_set(mid, params);
                // console.log("@debug: from the props : ", props.prop_name, props);
                return;
            }

            // M & M.id + other props exits
            set_M(M);
            return;
        }

        // take from filters
        if(props && props.filters && g_fn.non_empty_array_or_null(props.filters)){
            const params = {
                filters: props.filters,
                sort: props.sort,
                limit: 1,
                id: null
            }
            await get_one_and_set(mid, params);
            // console.log("@debug: from the filters : ", props.prop_name, props);
            return;
        }

        // take from selected entity only for get selected one
        // if(mid){
        //     const se = g_fn.AS.selected_entity;
        //     const selm = se[mid];
        //     if(selm && selm.id){
        //         if(Object.keys(selm).length === 1){
        //             // only id is present
        //             const params = {id: selm.id};
        //             await get_one_and_set(params);
        //             return;
        //         }

        //         // selm & selm.id + other props exits
        //         set_M(selm);
        //         return;
        //     }
        // }



        // get from url
        // get it from query params ?state={model_id:xq012,entity_id:01xqyuyuwyuwyuw}
        const url_state = g_fn.runtime_get_url_state();
        // Set the page state
        g_fn.runtime_set_url_state();
        if (url_state && url_state.model_id && url_state.entity_id) {
            const params = { 
                filters: null, sort: null, limit: 1,
                id: url_state.entity_id
            };
            await get_one_and_set(url_state.model_id, params);
            // console.log("@debug: from the url : ", props);
            return;
        }


        // @LEGACY FUNCTION:    // take from url_state
        // const state = g_fn.runtime_get_url_state();
        // if(mid && state){
        //     const se = state.selected_entity;
        //     if(!se) return;
        //     const eid = se[mid];
        //     const params = {id: eid};
        //     await get_one_and_set(mid, params);
        //     // console.log("@debug: from the url : ", props.prop_name, props);
        //     return;
        // }


        // just let them no no data was found
        // set_M({
        //     __no_data_found: true
        // });

    },
    update_one_get_changed_values: function (a, b) {
        let set:any = null;
        let unset:any = null;

        let added:any[] = [];
        let deleted:any[] = [];


        const is_object_same = (a, b) => {
            return JSON.stringify(a) === JSON.stringify(b);
        }



        const get_deleted_items_in_array = (a, b) => {
            // all removed or b is undefined
            if(!b || !Array.isArray(b)){
                console.log("pushing all into deleted from a... ", a);
                const arr = a.map(m=>{
                    if(typeof(m) === "object") {
                        return m.id;
                    }
                    else return m;
                })
                deleted.push(...arr);
                return;
            }
            // a is array & b is array
            for(let item of a){
                const aitems = JSON.stringify(item);
                const bitem = b.find((bitem)=>{
                    if(typeof(item) === "object") return item.id === bitem;
                    return JSON.stringify(bitem) === aitems;
                });

                if(bitem) continue;
                deleted.push(item);
            }
        }

        const get_added_items_in_array = (a, b) => {
            if(!b || !Array.isArray(b)){
                return; // nothing is added
            }

            if(!a || !Array.isArray(a)){
                added.push(...b); // everything is added
                return;
            }


            // a is array & b is array
            for(let bitem of b){
                const bitems = JSON.stringify(bitem);
                const aitem = a.find((aitem)=>{
                    if(typeof(aitem) === "object") return aitem.id === bitem;
                    return JSON.stringify(aitem) === bitems;
                });

                if(aitem) continue;
                added.push(bitem);
            }
        }


        if(Array.isArray(a) && Array.isArray(b)){
            get_deleted_items_in_array(a, b);
            get_added_items_in_array(a, b);
        }
        else if(Array.isArray(a) && !Array.isArray(b)){
            get_deleted_items_in_array(a, b);
        }
        else if(Array.isArray(b) && !Array.isArray(a)){
            get_added_items_in_array(a, b);
        }
        else if(typeof(a) === "object" && typeof(b) === "object"){
            if(!is_object_same(a, b)){
                set  = b; // new value
            }
        }
        // b cannot be object unless it is is_json, but id is now implemented in is_json, so it will be replaced with id
        else if (typeof(a) === "object" && typeof(b) === "string") { // relation with is_many = false
            if(b === "SYSTEM" || !a.id) {
                set = null;
                unset = null;
            }
            else if (a.id === b) {
                set = null;
                unset = null;
            }
            else {
                set = b;
            }
        }
        else if(a !== b){
            if(b === undefined){
                unset = a;
            }
            else{
                set = b;
            }
        }


        return {set, unset, added, deleted};
    },
    update_one: async function (app_id: string, model_id:string, eid: string, data: any, patches:Patch[], prev_data?: any) {

        const token = g_fn.get_token();
        if (!token) return g_fn.feedback('Unable to get token', "error");

        const api = g_fn.get_api();
        if (!api) return g_fn.feedback('Unable to get api', "error");

        //Doing auth based on roles in the frontend 
        const user = g_fn.get_user();
        const permission = authz.update(model_id, data, user);
        if(!permission) {
            return;
        }
        if(!permission.allowed) {
            g_fn.feedback(`Updation Unsuccessfull: ${permission.reason}`)
            return ;
        }

        // updates is a special object which has the diff
        // use this until the patch api is ready, after that use the patches directly
        console.log("UPDATE ONE DATA : ", data);
        let PM = g_fn.AS.GSTORE.get(model_id, eid);
        // don't check for PM if update body is directly passed to the function
        if((!PM || !PM.id) && !(data.id && data.add && data.delete)) return console.warn("PM not found Can't update item", PM);
        const updates = await g_fn.prepare_data_for_update(model_id, PM, data);


        const r = await api.datascript.update_one(app_id, model_id, token, updates);

        console.log("UPDATE ENTITY : ", r, updates, data);

        if (!r || !r.success) {
            g_fn.feedback(`Updation unsuccessful`, "error");
            console.warn(
                `Failed to update one entity with id :  ${updates.id}`,
                r.errors,
                app_id,
                model_id,
                updates
            );
            return;
        }
        g_fn.inc_tx("update", model_id, [updates.id], ["*"], r.data);
        g_fn.feedback(`Updated Successfully`, "success");
        return r;
    },
    bro_update_one: async function (e : any, M:any, INFO:any, props : any) {
        const model_id = INFO.model_id;
        if(!M || !M.id) return console.warn("M || M.id not found Can't update item", M);
        console.log("UPDATE ONE DATE INSIDE BRO_UPDATE_ONE : ", M.created_by, M);
        await g_fn.AS.GSTORE.update_one(model_id, M.id, M);
    },

    // takes a update object which has the diff and changes the DB
    apply_updates: async function (app_id: string, model_id: string, updates: any) {
        if (!updates.id) return g_fn.feedback('No id found to update entity', "error");

        const token = g_fn.get_token();
        if (!token) return g_fn.feedback('Unable to get token', "error");

        const api = g_fn.get_api();
        if (!api) return g_fn.feedback('Unable to get api', "error");

        //Doing auth based on roles in the frontend 
        const user = g_fn.get_user();
        const permission = authz.update(model_id, updates, user);
        if(!permission) {
            return;
        }
        if(!permission.allowed) {
            g_fn.feedback(`Updation Unsuccessfull: ${permission.reason}`)
            return ;
        }

        const r = await api.datascript.update_one(app_id, model_id, token, updates);

        if (!r || !r.success) {
            g_fn.feedback(`Updation unsuccessful`, "error");
            console.warn(
                `Failed to update one entity with id :  ${updates.id}`,
                r.errors,
                app_id,
                model_id,
                updates
            );
            return;
        }
        g_fn.inc_tx("update", model_id, [updates.id], ["*"], r.data);
        g_fn.feedback(`Updated Successfully`, "success");
        return r;
    },
    bro_apply_updates: async function (e, M, INFO) {
        const app_id = GC.APP_ID;

        const user = g_fn.get_user();
        const token = g_fn.get_token();
        const api = g_fn.get_api();
        if (!user || !token || !api) return g_fn.feedback('Unable to get user || token || api', "error");
        const updates_str = g_fn.get_attr_from_event(e, ['updates']);
        if(!updates_str) return;
        const updates = g_fn.json_parse(updates_str);
        if(!updates) return;
        if(!Array.isArray(updates)) return;

        // if(!updates.length) return;
        // if(!updates.every(u=>u.source && u.action && u.dest)) return; console.warn("Invalid updates: ", updates);


        // const update
        /**
         * add to cart
         * user.cart[product_id]
         * product
         */
        console.log("UPDATES : ", updates);
        for(let u of updates){
            /* Actions like unset does not need source for execution */
           
            if((!u.source || !u.action || !u.dest) && !(["unset"].includes(u.action) && u.dest)) {
                if(!u.code) continue; // condition not included in above if statement to make it look neat
            }


            const update_body  = {id: null, add: {}, delete: {}}
            // M:product.id = > set => M:logedinuser.cart
           
            const des_a = u.dest.trim().split(".");
            if(des_a.length !== 2) continue;

            const dest_prop_name  =   des_a[1];

            let dest_model_id:any   =   null;
            let dest_model:any      =   null;
            let dest_entity:any     =   null;


            if(des_a[0].startsWith("M:") || des_a[0].startsWith("S:")){
                const m         =   des_a[0].split(":");
                if(m.length !== 2)  continue;
                dest_model_id   =   m[1];
                dest_model      =   g_fn.get_model(dest_model_id);
                if(m[0] === "M"){
                    dest_entity    =    M;
                    // dest_entity_id =    M.id;    
                }
                else if(m[0] === "S"){
                    dest_entity    = AS.selected_entity[dest_model_id]
                }
                else{
                    //continue for now;
                    continue
                }

            }
            else if (des_a[0].startsWith("user") || des_a.startsWith("logedinuser")){
                const user_model    =   g_fn.get_model_by_name("user");
                dest_model          =   user_model;
                dest_model_id       =   user_model?.id;
                dest_entity         =   AS.user;
            }
            else{
                //continue for now
                continue;
            }

            if(!dest_model){
                console.warn("destination model not found");
                continue;
            };
            const p = dest_model.props.find(p => p.name === dest_prop_name);
            if(!p) {
                console.warn("destination prop not found");
                continue;
            }
            if(!dest_entity){
                console.warn("destination entity not found");
                continue;
            }
            const dest_entity_id = dest_entity.id;

            if(!dest_entity_id){
                console.warn(`destination id in ${JSON.stringify(dest_entity)} not found`);
                continue;
            }
            update_body.id = dest_entity_id;

            //source

            let source_val:any = undefined;
            const source_a = u.source?.trim();
            let source_entity = undefined; // to make the source entity available in the eval code;

            if(source_a.startsWith("M:") || source_a.startsWith("S:") ){
                const s = source_a.split(".");
                if(s.length !== 2) continue;
                const source_prop = s[1];
                const s_m = s[0].split(":");
                if(s_m.length !== 2) continue;
                const source_model_id = s_m[1];
                if(source_a.startsWith("M:")){
                    source_val = M[source_prop];
                    source_entity = M;
                }
                else{
                    source_entity = AS.selected_entity[source_model_id];
                    if(!source_entity){
                        console.warn("source entity not found");
                        continue;
                    }
                    source_val = source_entity[source_prop];
                }
            }
            else if(source_a.startsWith("user.")||source_a.startsWith("logedinuser.")){
                const s = source_a.split(".");
                if(s.length !== 2) continue;
                const source_prop = s[1];
                if(!AS.user){
                    console.warn("user is not found in app state");
                    continue;
                }
                source_val = AS.user[source_prop];
                source_entity = AS.user;
                //
            }
            else {
                source_val = source_a;
            }

            if(source_val === undefined){
                if(!u.code) {
                    console.warn("source value is undefined");
                    continue;
                }
            }

            const code = u.code;
            if (code) {
                try {
                    /*
                        variables available inside the text area :
                            1. update_body : {id, add : {}, delete : {}}
                            2. dest_entity
                            4. source_entity
                            5. global variables like AS.user
                    */
                   console.log("SOURCE ENTITY : ", source_entity);
                    eval(code); // update_body should be updated inside the code written by the user.
                } catch (e) {
                    console.log("ERROR DURING EVAL : ", e);
                }
            }

            //actions

            let action_a = u.action;
            if(!action_a){
                if(!u.code) {
                    console.warn("id not found for action ", u.action);
                    continue;
                }
            }
            if(u.code) action_a = null;
            //array add ops
            if(["push", "push_unique", "push_and_inc", "push_and_group", "push_and_set"].includes(action_a)){
                const add_val:any[]  = [];
                //@to-do : check the type of sourceval with dest prop type
                if(Array.isArray(source_val)){
                    const a = source_val.filter(s => s);
                    add_val.push(...a)
                }
                else{
                    add_val.push(source_val);
                }

                update_body.add[dest_prop_name] = add_val;
            }
            else if (["remove", "remove_and_set", "remove_and_unset"].includes(action_a)){
                const del_val:any[] = [];
                //@to-do : check the type of sourceval with dest prop type
                if(Array.isArray(source_val)){
                    const a = source_val.filter(s => s).map(s=>{
                        if(typeof(s) === "object") return s.id;
                        return s;
                    });
                    del_val.push(...a)
                }
                else{
                    if(typeof(source_val) === "object") del_val.push(source_val.id);
                    else  del_val.push(source_val);
                }
                update_body.delete[dest_prop_name] = del_val;
            }
            else if (["set", "unset"].includes(action_a)){

                if(action_a === "set"){
                    update_body.add[dest_prop_name] = source_val;
                }
                else{
                    const prop_name = u.dest.split(".").filter(r=>r)[1];
                    if(!prop_name) continue;
                    console.log("DESTINATION PROP : ", dest_entity[prop_name]);
                    const prop_value = dest_entity[prop_name];
                    if(typeof(prop_value) === "object") {
                        update_body.delete[dest_prop_name] = prop_value.id;
                    }
                    else {
                        update_body.delete[dest_prop_name] = prop_value;
                    }
                }
            }
            else if (["increment", "decrement"].includes(action_a)){
                if(isNaN(Number(source_val))) {
                    console.warn("invalid action, source type is not number");
                    continue;
                }
                const dest_value = dest_entity[dest_prop_name];
                if(action_a === "increment") source_val = dest_entity[dest_prop_name] + Number(source_val);
                if(action_a === "decrement") source_val = dest_entity[dest_prop_name] - Number(source_val);
                update_body.add[dest_prop_name] = source_val;
            }
            else if (["set_true", "set_false", "toggle"].includes(action_a)){
                if(action_a === "set_true") source_val = true;
                if(action_a === "set_false") source_val = false;
                if(action_a === "toggle"){
                    if(dest_entity[dest_prop_name]) source_val = false;
                    else source_val =  true;
                }
                update_body.add[dest_prop_name] = source_val
            }
            else{
                // new update actions
            }
            
            const r = await g_fn.apply_updates(app_id, dest_model_id, update_body);
            console.group();
            console.log("updates : ", updates);
            console.log("response: ", r);
            console.log("update body : ", update_body);
            console.groupEnd();
        }
    },
    delete_one: async (model_id: string, id: string):DEFAULT_RES_SINGLE_P<any> => {

        
        const m = g_fn.get_user_token_api(true); // alert = true;
        if(!m.success || !m.token || !m.api) return {success: false, errors: m.errors?.map(e=>e.message) || []};
        const {user, token, api} = m;
        
        //Doing auth based on roles in the frontend 
        const permission = authz.delete(model_id, user);
        if(!permission.allowed) {
            g_fn.feedback(`Deletion Unsuccessfull: ${permission.reason}`)
            return {success: false, errors: ["NO_PERMISSION", String(permission.reason)]};
        }



        const app_id = GC.APP_ID;
        const r = await api.datascript.delete_one(app_id, model_id, token, id);
        if (!r || !r.success) {
            g_fn.feedback(`Deletion unsuccessful`, "error");
            console.warn(
                `Failed to delete one entity with id :  ${id}`,
                r.errors,
                app_id,
                model_id,
                id
            );
            return {success: false, errors: r.errors};
        }

        g_fn.feedback(`Deleted Successfully`, "success");

        return { success: true, data: {} };
    },
    bro_delete_one: async function (e:any, M:any, INFO: any, props: any) {
        const model_id = INFO.model_id;
        if (!model_id) return console.warn("model_id not found Can't delete item");
        if(!M || !M.id) return console.warn("id not found Can't delete item", M);

        const r = await g_fn.AS.GSTORE.delete_one(model_id, M.id);
        if (!r || !r.success) return;

        g_fn.inc_tx("delete", model_id, [M.id], ["*"], {});
    },
    get_many : async function (model_id: string, params: QUERY_PARAMS):DEFAULT_RES_ARR_P<any> {
        const MODEL = g_fn.get_model(model_id);
        if(!MODEL) {
            console.warn('Model not found: ', model_id);
            return {success: false, errors: ["MODEL_NOT_FOUND"]};
        };


        const api = g_fn.get_api();
        if (!api){
            g_fn.feedback("broken api not found !", "error");
            return {success: false, errors: ["BROKEN_API_NOT_FOUND"]};
        }


        const token = g_fn.get_token();
        if(!token){
            g_fn.feedback("Login token not found !", "error");
            return {success: false, errors: ["LOGIN_TOKEN_NOT_FOUND"]};
        }

        //Doing auth based on roles in the frontend 
        const user = g_fn.get_user();
        const permission = authz.get(model_id, user);
        if(!permission) {
            return {success: false, errors: ["NO_PERMISSION"]};
        }
        if(!permission.allowed) {
            g_fn.feedback(`Fetching data Unsuccessfull: ${permission.reason}`)
            return {success: false, errors: ["NO_PERMISSION", String(permission.reason)]};
        }

        const modify_filters = (params: FILTER_PARAMS) => {
            const filters = params.filters;
            if(!filters || !Array.isArray(filters)) return;
            for(let filter of filters){
                let val = filter.val;

                if(val === undefined || val === null) continue;

                // user
                if(val === "{user.id}"){
                    val = g_fn.AS.rx_user?.getValue()?.id;
                    filter.val = val;
                }
                if(val === "{user.mobile}"){
                    val = g_fn.AS.rx_user?.getValue()?.mobile;
                    console.log("val is: ", val, "type is :", typeof(val));
                    filter.val = val;
                }

                else if(val === "{Date.now()}"){
                    val = Date.now();
                    filter.val = Date.now();
                }
                else if(val === "{recent}"){
                    filter.op = "geq"; // datascript => [:find ?e ?a ?v :where [?e ?a ?v] [(> ?v 1617225600000) (> ?v 1617225600000]]
                    filter.val = Date.now() - 1000*60*60*24*7; // 7 days
                }
                else if(val === "{latest}"){
                    filter.op = "leq";
                    filter.val = Date.now();
                }
                else if(val === "{today}"){
                    // bounded by 12:00 am and 11:59 pm
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);

                    const f1 = {attr: filter.attr, op: "geq", val: today.getTime()};
                    const f2 = {attr: filter.attr, op: "lt", val: tomorrow.getTime()};

                    filter.attr = f1.attr;
                    filter.op = f1.op;
                    filter.val = f1.val

                    filters.push(f2);
                }
                else if (val.toString().startsWith("(")) {
                     // fn ()=>{}
                    // ()=>{return new Date().getTime() -  7 * 24 * 3600}
                    let value:any = undefined;
                    try {
                        eval(`value = (${val})()`); // @warn: this is not safe
                    } catch (error) {
                        console.warn("EVAL ERROR FOR RUNTIME FILTERS");
                    }
                    if(!isNaN(value)){
                        const f1 = {attr: filter.attr, op: "geq", val: value};
                        const f2 = {attr: filter.attr, op: "lt", val: new Date().getTime()};

                        filter.attr = f1.attr;
                        filter.op = f1.op;
                        filter.val = f1.val
                        filters.push(f2);
                    }
                }
                else if(filter.op === "starts_with"){
                    const f1 = {attr: filter.attr, op: "geq", val: filter.val};
                    const f2 = {attr: filter.attr, op: "leq", val: filter.val + "~"};

                    filter.attr = f1.attr;
                    filter.op = f1.op;
                    filter.val = f1.val
                    filters.push(f2);
                }
                else if(filter.op === "ends_with"){
                    // @not-sure: if this is correct
                    const f1 = {attr: filter.attr, op: "leq", val: "~" + filter.val};
                    const f2 = {attr: filter.attr, op: "geq", val: filter.val};

                    filter.attr = f1.attr;
                    filter.op = f1.op;
                    filter.val = f1.val
                    filters.push(f2);
                }
            }
        }

        
        
        // @todo: convert sort into sorts and make it array
        let sort = null;
        
        
        if(params.unique === true){ // id is provided
            params.limit = 1;
        }
        else{
            // @ts-ignore
            modify_filters(params);
            params.limit = 16;

            // @todo: convert sort into sorts
            // @ts-ignore
            if(params.sorts && params.sorts.length){
                // @ts-ignore
                sort = params.sorts[0];
            }
        }



        if(EN_BROKEN_G_FN_LOGS.FILTERS){
            console.log("filters in the get many is  :", params);
        }


        const app_id = GC.APP_ID;
        // @todo: convert sort into sorts 
        // @ts-ignore   => Type 'string' is not assignable to type '"eq" | "gt" | "lt" | "geq" | "leq" | "neq" | "match"'.
        let r = await api.datascript.get_many(app_id, model_id, token, {__meta : {...params, sort : sort || undefined}}) as DEFAULT_RES_ARR<any>;

        return r;

        // if (r.success && r.data && Array.isArray(r.data)) {
        //     const data = r.data;
        //     return data;
        // }
        // else {
        //     if(!r.success){
        //         g_fn.feedback(`Get many unsuccessful`, "error");
        //         console.warn("Invalid response for get many", r);
        //     }
        //     return
        // }

    },
    get_many_with_final_filters : async function(model_id : string, params : FINAL_FILTERS) {
        const api = g_fn.get_api();
        if (!api){
            g_fn.feedback("broken api not found !", "error");
            return ;
        }


        const token = g_fn.get_token();
        if(!token){
            g_fn.feedback("Login token not found !", "error");
            return ;
        }
        const app_id = GC.APP_ID;
        // @ts-ignore => Type 'string' is not assignable to type '"eq" | "gt" | "lt" | "geq" | "leq" | "neq" | "match"'.
        let r = await api.datascript.get_many(app_id, model_id, token, {__meta : {...params}}) as DEFAULT_RES_ARR<any>;
        return r;
    },
    get_aggregate : async function (model_id, prop_name, {count, sum, avg, max, min}) {
        const MODEL = g_fn.get_model(model_id);
        if(!MODEL) {
            console.warn('Model not found: ', model_id);
            return;
        };

        const api = g_fn.get_api();
        if (!api){
            g_fn.feedback("broken api not found !", "error");
            return ;
        }

        const token = g_fn.get_token();
        if(!token){
            g_fn.feedback("Login token not found !", "error");
            return ;
        }

        const app_id = GC.APP_ID;
        const r = await api.datascript.aggregate(app_id, model_id,  token, {
            group_by: {
                _id: prop_name,
                count: {
                    count: "id"
                }
            }
        });

        if(r.success && r.data && Array.isArray(r.data)){
            return r.data;
        }

        return null;

        /**
         * {
                "success": true,
                "code": 200,
                "data": [
                    {
                        "_id": "A",
                        "count": 2
                    },
                    {
                        "_id": "B",
                        "count": 1
                    }
                ]
            }
         */


    },
    get_many_pagination: async function (app_id, model_id, set_M, {filters, sort, limit, prev}) {


        const api = g_fn.get_api(), token = g_fn.get_token();
        if (!api){
            g_fn.feedback("broken api not found", "error");
            return ;
        }
        if (!token){
            g_fn.feedback("broken token not found, @todo: public app get_many shouldn't require token", "error");
            return ;
        }

        let curr_val = null;
        let id = null;

        if (!prev) {

            set_M((m) => {
                if (Array.isArray(m) && m.length) {
                    curr_val = m.slice(-1)[0][sort.attr];
                    id = m.slice(-1)[0]["id"]
                }
                return m
            })
        }

        let order = sort.order
        if (prev) {
            set_M((m) => {
                if (Array.isArray(m) && m.length) {
                    curr_val = m[0][sort.attr];
                    id = m[0]["id"]
                }
                return m
            })
            if (order === "ASC") {
                order = "DESC"
            }
            else {
                order = "ASC"
            }
        }

        const pagination_cond = { ...sort, order, curr_val, id };

        //Doing auth based on roles in the frontend
        const user = g_fn.get_user(); 
        const permission = authz.get(model_id, user);
        if(!permission) {
            return;
        }
        if(!permission.allowed) {
            g_fn.feedback(`Fetching data Unsuccessfull: ${permission.reason}`);
            return ;
        }
        let r = await api.datascript.get_many(app_id, model_id, token, {__meta : { sort: { ...sort, order }, filters, limit, pagination_cond }})

        if (r.success && r.data && Array.isArray(r.data)) {
            if(r.data.length){

                if(!prev){
                    return r.data;
                }
                else{
                    return [...r.data].reverse();
                }
            }
            else{
                g_fn.feedback("No more data found", "error");
            }
        }
        else {
            g_fn.feedback(`Invalid response for get many ${JSON.stringify(r)}`, "error");
            console.warn("Invalid response for get many", r);
            return;
        }

    },
    generate_final_filters: function (filters_obj: T_NODE_FILTERS, always_enabled: boolean) {
        const FINAL_FILTERS:any[] = []; // [{attr, op, val}]
        const prepare_filters = (filters_obj: T_NODE_FILTERS, always_enabled: boolean) => {
            // {
            //      filA: [{id, enabled, filter: [{attr, op, val}]}, {id, enabled, filter: [{attr, op, val}]}]
            //      filB: [{id, enabled, filter: [{attr, op, val}]}, {id, enabled, filter: [{attr, op, val}]}]
            // }
            Object.values(filters_obj).forEach(filters=>{
                // all_filters => [ [{}] , [{}] ]
                if(Array.isArray(filters)){
                    filters.forEach(f=>{
                        // filters => {id, enabled, filter: [{attr, op, val}]}, {id, enabled, filter: [{attr, op, val}]}
                        if(always_enabled || f.enabled){
                            FINAL_FILTERS.push(...f.filter);
                        }
                    })
                }
                else{
                    console.warn("@INVALID FILTERS", filters);
                }
            });
        }

        prepare_filters(filters_obj, always_enabled);

        return FINAL_FILTERS;
    },
    generate_filters: function (FO: FILTER_OBJECT){
        // create FILTERS from static_filters and filters
        // and sort from sorts
        const FILTERS:any[] = [];

        const SF = g_fn.generate_final_filters(FO.static_filters, true); // static filters are always enabled
        const F = g_fn.generate_final_filters(FO.filters, false); // filters are not always enabled

        FILTERS.push(...SF);
        FILTERS.push(...F);

        //text filters
        if(FO.text_filters && FO.text_filters.length) {
            FILTERS.push({attr:"*", op:"match", val:FO.text_filters});
        }

        return FILTERS;
    },



    bro_get_many: async function (INFO:any, FO: FILTER_OBJECT) {

        const FILTERS = g_fn.generate_filters(FO);


        // const sort = {attr: "created_at", order: "DESC"}
        // if(sorts && sorts.length){
        //     sort.attr = sorts[0].attr;
        //     sort.order = sorts[0].order;
        // }

        
        const params:QUERY_PARAMS = {
            unique: false,
            filters: FILTERS,
            sorts: FO.sorts,
            limit: FO.limit,
            id: undefined
        }
        
        const GSTORE = g_fn.AS.GSTORE;
        const r = await GSTORE.get_many(INFO.model_id, params, INFO.comp_id);



        if(EN_BROKEN_G_FN_LOGS.GET_MANY){
            const name = g_fn.get_model(INFO.model_id)?.name;
            console.log(`${name}.get_many: r => `, r);
        }

        

        // No more set_M here, we will have subscription in the component instead
        // if(r &&  Array.isArray(r)){
        //     set_M((v) => {
        //         if (Array.isArray(v)) return r; // get many
        //     });
        // };
        
    },
    bro_get_many_for_pagination : async function (set_M, INFO, {static_filters, text_filters, filters, sorts, limit, prev}){
        const app_id = GC.APP_ID;


        // create FILTERS from static_filters and filters
        // and sort from sorts
        const FILTERS: any[] = [];

        const SF = g_fn.generate_final_filters(static_filters, true); // static filters are always enabled
        const F = g_fn.generate_final_filters(filters, false); // filters are not always enabled

        FILTERS.push(...SF);
        FILTERS.push(...F);

        // text filters
        if(text_filters && text_filters.length){
            FILTERS.push({attr: "*", op: "match", val: text_filters});
        }

        const sort = {attr: "created_at", order: "DESC"}
        if(sorts && sorts.length){
            sort.attr = sorts[0].attr;
            sort.order = sorts[0].order;
        }



        const r = await g_fn.get_many_pagination(app_id, INFO.model_id, set_M, {filters: FILTERS, sort, limit, prev});
        if(r &&  Array.isArray(r)){
            set_M((v) => {
                if (Array.isArray(v)) return r; // get many
            });
        };
    },
    bro_apply_filters: async function (e, INFO) {
        const filters_id = g_fn.get_attr_from_event(e, ['filters-id']);
        const filter_id = g_fn.get_attr_from_event(e, ['filter-id']);
        const filter_action = g_fn.get_attr_from_event(e, ['filter-action']) || "toggle";
        console.log('filters id :', filters_id);
        if (!filters_id || !filter_id) {
            console.warn("filters_id || filter_id not found", filters_id, filter_id, INFO);
            return;
        }

        const model_id = INFO.model_id;
        const comp_id  = INFO.comp_id;
        if(!model_id) return console.warn("NO MODEL IF FOUND TO SET FILTERS");
        if(!comp_id) return console.warn("NO COMP ID FOUND TO SET FILTERS");


        const apply_filters = (FILTERS) =>{
            // FILTERS = {}; // {[filters_id]: [{filter_id, enabled, filter: [{attr, op, val}]}]}

            const FILTERS_LIST = FILTERS[filters_id];
            if (!FILTERS_LIST) {
                console.warn("FILTERS_LIST not found", FILTERS, filters_id, INFO);
                return;
            }

            // find the filter
            const filter = FILTERS_LIST.find((f) => f.id === filter_id);
            if (!filter) {
                console.warn("filter not found", filter_id, FILTERS_LIST);
                return;
            }

            // action
            if (filter_action === "toggle") {
                filter.enabled = !filter.enabled;
            }
            else if (filter_action === "set") {
                // disable rest
                FILTERS_LIST.forEach((f) => f.enabled = false);
                filter.enabled = true;
            }
            else if (filter_action === "unset") {
                // enable rest
                FILTERS_LIST.forEach((f) => f.enabled = true);
                filter.enabled = false;
            }
            else if (filter_action === "add") {
                filter.enabled = true;
            }
            else if (filter_action === "add-all") {
                FILTERS_LIST.forEach((f) => f.enabled = true);
            }
            else if (filter_action === "remove") {
                filter.enabled = false;
            }
            else if (filter_action === "remove-all") {
                FILTERS_LIST.forEach((f) => f.enabled = false);
            }
            else { // set
                FILTERS_LIST.forEach((f) => f.enabled = false);
                filter.enabled = true;
            }


            // update state
            // if (INFO.set_filters) {
            //     INFO.set_filters((f) => ({
            //         ...f,
            //         [filters_id]: [...FILTERS_LIST]
            //     }))
            // }

            const par = e.target.parentElement;
            if (!par) {
                console.warn("No parent element found for target in filters => ", e.target);
                return;
            }

            FILTERS_LIST.forEach(f => {
                const fil = par.querySelector(`[filter-id="${f.id}"]`);
                if (!fil) return console.error("No filter element found for filter => ", f);
                if (!fil.classList) return console.error("No classList found for filter => ", f);
                // set selected class
                if (f.enabled) {
                    fil.classList.add("selected");
                }
                else {
                    fil.classList.remove("selected");
                }
            });



            return ({
                ...FILTERS,
                [filters_id]: [...FILTERS_LIST]
            })
        }

        let fstore = AS.GSTORE.get_filters(model_id, comp_id);

        if(!fstore || !fstore.filters) {
            return console.warn("FILTERS NOT FOUND IN GSTORE");
        }

        const new_filters = apply_filters(fstore.filters);

        AS.GSTORE.set_filters(model_id, comp_id, {...fstore, filters : new_filters});

        // if(INFO.set_filters){INFO.set_filters((f) => {
        //     const new_f = apply_filters(f);
        //     if(new_f) return new_f;
        //     return f;
        // })}
    },
    bro_on_input_set_text_filters: async function (e, INFO) {
        const model_id = INFO.model_id;
        const comp_id  = INFO.comp_id;
        if(!model_id) return console.warn("NO MODEL ID FOUND TO SET TEXT FILTERS");
        if(!comp_id) return console.warn("NO COMP ID FOUND TO SET TEXT FILTERS");

        let fstore = AS.GSTORE.filters[model_id];
        if(!fstore) {
            fstore = {};
            AS.GSTORE.filters[model_id] = fstore;
        }

        fstore[comp_id] = {...fstore[comp_id], text_filters : e.target.value};

        // if(INFO.set_text_filters && typeof(INFO.set_text_filters) === "function"){
        //     INFO.set_text_filters(e.target.value);
        // }
    },
    bro_get_is_json: async function (INFO, props) {
        // whenever we have a is_json prop inside a model with op=get-one
        // we will just get data from the parent model and set it to the current model
        const set_M = INFO.set_M;
        if(!set_M) return console.warn("set_M not found", INFO, props);

        const set_parent_M = props.INFO?.set_M;
        if(!set_parent_M) return console.warn("set_parent_M not found", INFO, props);

        const idx = props.IDX;

        const prop_name = props.prop_name;
        if(!prop_name) return console.warn("prop_name not found", INFO, props);


        if(isNaN(idx)){
            set_parent_M((PM) => {
                const P = PM[prop_name] || {};
                set_M(P);
                return PM;
            });
        }
        else{
            set_parent_M((PM) => {
                const P = PM[prop_name] || [];
                if(Array.isArray(P) && P.length > idx){
                    set_M(P[idx]);
                }
                return PM;
            });
        }

    },


    call_server_side_comp : async function (INFO, props) {
        if(!INFO || INFO.set_M) return console.warn("INFO || INFO.set_M not found", INFO, props);

        const set_M = INFO.set_M;

        const APP_ID = GC.APP_ID;
        const MODEL_ID = INFO.model_id;
        const TOKEN = g_fn.get_token();

        const COMP_ID = "hello";
        const FN_ID = "say_hello";


        const call = async (M)=>{
            const URL = `https://datascript.brokenatom.io/api/v1/module?app_id=${APP_ID}&model_id=${MODEL_ID}&token=${TOKEN}`;

            const body = {
                module: COMP_ID,
                function: FN_ID,
                params : {
                    M : {
                        data: {
                            id: M.id
                        },
                        model_id: MODEL_ID
                    }
                }
            }

            const errors:string[] = [];

            const r = await fetch(URL, {
                method: "POST",
                body: JSON.stringify(body),
            }).catch(e=> {
                errors.push(String(e));
            });


            if(!r || errors.length) return console.warn("Unable to call server side component", errors, r);

            const json = await r.json().catch(e=> {
                errors.push(String(e));
            });

            if(!json || errors.length) return console.warn("Unable to call server side component", errors, json);

            if(!json.success) return console.warn("Unable to call server side component", json.errors);

            const data = json.data;

            console.log("data : ", data);
        }

        set_M(M=>{
            call(M);
            return M;
        })
    },





    clear_db: async function (app_id) {
        // Remove local storage inside the iframe with key {app_id}_app_data_datoms
        localStorage.removeItem(`${app_id}_app_data_datoms`);
        return { success: true, data: {} };
    },

    bro_subs_for_get_many_on_tx: async function (INFO) {
        const SUB_ID = INFO.comp_id + "_get_many_on_tx"; // make a unique id
        remove_subs(SUB_ID);


        add_sub(SUB_ID,
            g_fn.AS.db.tx.subscribe((tx) => {
                if (!tx) return;
                if(tx.count === 0) return;
                if (tx.model_id !== INFO.model_id) return;
                if(tx.count === 0) return;

                const fstore = g_fn.AS.GSTORE.filters[INFO.model_id];
                if(!fstore) return;
                const FO = fstore[INFO.comp_id];
                if(!FO) return;

                g_fn.bro_get_many(INFO, FO);
            })
        );

        return () => remove_subs(SUB_ID);
    },
    bro_subs_for_get_selected_one: async function (INFO) {

        if(!INFO.model_id) {
            console.warn("model_id not found");
            return;
        }

        const set_M = INFO.set_M;
        if(!set_M) return console.warn("set_M not found", INFO);

        const SUB_ID = INFO.comp_id + "_get_selected_one"; // make a unique id
        remove_subs(SUB_ID);



        add_sub(SUB_ID,
            g_fn.AS.rx_selected_entity.subscribe((selected) => {
                if (!selected) return;

                const se = selected[INFO.model_id];
                if (!se) return;
                set_M(se);
            })
        );

        return () => remove_subs(SUB_ID);
    },

    bro_subs_for_selected_entity: async function (set_selected_M, INFO) {
        const subs:Subscription[] = [];

        subs.push(AS.rx_selected_entity.subscribe((entity_kv)=>{
            if(!entity_kv) return;
            const M = entity_kv[INFO.model_id];
            set_selected_M(M);
        }));

        return ()=>{
            subs.forEach(s=>s.unsubscribe());
        }
    },



    // Server side component

    // This is the user model in our app
    get_user_profile: async function () {
        const AJ = GC.APP_JSON as any;
        if (!AJ) return null;

        const user = g_fn.AS.rx_user.getValue();
        const token = g_fn.AS.rx_token.getValue();
        if(!user || !user.id || !token) return console.warn("Unable to get user profile: ", user, token);

        // maybe we already have it
        if(user.from_database) {
            if(EN_BROKEN_G_FN_LOGS.LOGIN){
                console.log("User profile already fetched from database", user);
            }
            return;
        }

        const model = AJ.models.find((m) => m.name?.toLowerCase() === "user");
        if(!model) return console.warn("Unable to get user model: ", AJ.models);

        const api = g_fn.get_api();
        if(!api) return console.log("Unable to get api");

        const app_id = AJ.id;
        const model_id = model.id;
        const r = await api.datascript.get_user_profile(app_id, model_id, token);
        console.log("@GETTING_USER_PROFILE", r);
        if(!r || !r.success) return console.warn("Unable to get user profile: ", r);
        if(!r.data) return console.warn("Unable to get user profile: ", r);
        const profile = r.data;

        if(!profile || !profile.id) return;

        const new_user = {...user, ...profile, from_database: true};
        console.log("THE NEW USER IS => ", new_user);
        AS.rx_user.next(new_user);
    },

    // utils
    array_or_null: function (value: any, sub_props?: string[]) {
        // array_or_null(A, [b,c,d]) => we will check if A.b.c.d is array or not
        if (!value) return null;
        if (!Array.isArray(value)) return null;

        if(sub_props && Array.isArray(sub_props)){
            let error:any = null;
            const recurse = (v, i)=>{
                if(i >= sub_props.length) return;
                const prop = sub_props[i];
                if(!v) {error = "error:at"+prop; return;}
                if(!prop) return;
                if(!v[prop]) {error = "error:at"+prop; return;}
                if(!Array.isArray(v[prop])) {error = "error:at"+prop; return;}

                recurse(v[prop], i+1);
            }
            recurse(value, 0);
            if(error){
                console.warn("array_or_null: ", value, sub_props, error);
                return null;
            }
        }

        return value;
    },
    safe_array: function (value, sub_props) {
        // array_or_null(A, [b,c,d]) => we will check if A.b.c.d is array or not
        if (!value) return [];
        if (!Array.isArray(value)) return [];

        if(!sub_props) return value;
        if(!Array.isArray(sub_props)) return value;
        if(!sub_props.length) return value;



        if(sub_props && Array.isArray(sub_props)){
            let error:any = null;
            let final_value = [];
            const recurse = (v, i)=>{
                if(i >= sub_props.length) return;
                const prop = sub_props[i];
                if(!v) {error = "error:at"+prop; return;}
                if(!prop) return;
                if(!v[prop]) {error = "error:at"+prop; return;}
                if(!Array.isArray(v[prop])) {error = "error:at"+prop; return;}

                final_value = v[prop];
                recurse(v[prop], i+1);
            }
            recurse(value, 0);
            if(error){
                console.warn("array_or_null: ", value, sub_props, error);
                return [];
            }

            return final_value;
        }

        return value;
    },
    non_empty_array_or_null: function (value) {
        if (!value) return null;
        if (!Array.isArray(value)) return null;
        if (!value.length) return null;
        return value;
    },

    get_key_from_meta: function (M, prop_name, idx) {
        if (!M) return 'error:meta-key';
        if(!M[prop_name]) return 'error:meta-key';
        if(!Array.isArray(M[prop_name])) return 'error:meta-key';
        if(idx >= M[prop_name].length)   return 'error:meta-key';
        if(!M[prop_name][idx]) return 'error:meta-key'; // for relation we might just have undefined
        if(!M[prop_name][idx].id) return 'error:meta-key';
        return M[prop_name][idx].id;
    },

    get_safe_condition: function(){},
    json_parse: function (str) {
        // if json5 use that
        // for now temp solution

        try {
            return JSON.parse(str);
        } catch (error) {
            try {
                console.warn("@risky: eval is use for data, add json5 to std.lib and use it");
                const obj = (0, eval)('(' + str + ')');
                return obj;
            } catch (error) {
                console.warn("eval also failed on josn_parse");
                return null;
            }
            console.warn("json_parse: ", error, str);
            return null;
        }
    },
    add_meta_to_data: function(M){
        const add_meta = (m) =>{
            if(!m || typeof(m) !== "object") return;

            const _meta = m._meta || {};
            for(let [k, v] of Object.entries(m)){
                if(Array.isArray(v)){
                    const K = "keys_" + k;
                    _meta[K] = [];
                    for(let item of v){
                        const RID = g_fn.get_ulid() || Math.random().toString(36).substring(0, 8);
                        _meta[K].push(RID);
                    }
                }
                else if(typeof(v) === "object"){
                    add_meta(v);
                }
            }
            m._meta = _meta;
        }

        if(Array.isArray(M)){
            for(let m of M){
                add_meta(m);
            }
        }
        else{
            add_meta(M);
        }
    },

    // time
    time_utils: {
        get_valid_date: function (date) {
            console.log("let's check: ", date);
            // '1970-01-01'
            if (!date) return undefined;

            const d = new Date(date);
            if(String(d) === "Invalid Date") return undefined;

            return d.toISOString().split('T')[0]; // @todo: this will have timezone offset, remove it
        },
        get_valid_time: function (time) {
            // '12:00'
            if (!time) return undefined;

            // check if it's valid time
            // const d = new Date(`1970-01-01T${time}`);
            // if(String(d) === "Invalid Date") return undefined;

            // return d.toLocaleTimeString();
            return time;
        },
        get_valid_datetime: function (datetime) {
            // '1970-01-01T12:00'
            // or
            // 1637837738783
            if (!datetime) return undefined;

            const d = new Date(datetime);
            if(String(d) === "Invalid Date") return undefined;
            return d.toISOString().replace("Z", "");
        }
    },

    add_script: function(id, url, callback) {
        // first check if script is already loaded
        if (document.getElementById(id)) {
            callback();
            return;
        }
    
        const script = document.createElement("script") as HTMLScriptElement & {readyState: any, onreadystatechange: any}
        script.type = "text/javascript";
    
        if (script.readyState) {  //IE
            script.onreadystatechange = function () {
                if (script.readyState === "loaded" ||
                    script.readyState === "complete") {
                    script.onreadystatechange = null;
                    callback();
                }
            };
        } else {  //Others
            script.onload = () => callback();
        }
    
        script.src = url;
        script.id = id;
        document.getElementsByTagName("head")[0].appendChild(script);
    },
    add_style: function(id, url, callback) {
        // first check if script is already loaded
        if (document.getElementById(id)) {
            callback();
            return;
        }
    
        const link = document.createElement("link") as HTMLLinkElement & {readyState: any, onreadystatechange: any}
        link.type = "text/css";
        link.rel = "stylesheet";
    
        if (link.readyState) {  //IE
            link.onreadystatechange = function () {
                if (link.readyState === "loaded" ||
                    link.readyState === "complete") {
                    link.onreadystatechange = null;
                    callback();
                }
            };
        } else {  //Others
            link.onload = () => callback();
        }
    
        link.href = url;
        link.id = id;
        document.getElementsByTagName("head")[0].appendChild(link);
    },


    // REACT_STATE
    toggle_state: function (e, REACT_STATES) {
        if (!REACT_STATES || !Object.keys(REACT_STATES)) return g_fn.feedback("Can't toggle state: REACT_STATES not found", "error");
        const state_name = g_fn.get_attr_from_event(e, ['state', 'state-name']);
        if (!state_name) return g_fn.feedback("Can't toggle state: state name not found", "error");
        const S = REACT_STATES[state_name];
        if (!S) return g_fn.feedback("Can't toggle state: state not found", "error");
        if (!S.set_state || typeof (S.set_state) !== "function") return g_fn.feedback(`Can't toggle state: set_state not found: ${JSON.stringify(S)}`, "error");
        S.set_state(s=>!s);
    },
    set_state: function (e, REACT_STATES) {
        if (!REACT_STATES || !Object.keys(REACT_STATES)) return g_fn.feedback("Can't set state: REACT_STATES not found", "error");
        const state_name = g_fn.get_attr_from_event(e, ['state', 'state-name']);
        if (!state_name) return g_fn.feedback("Can't set state: state name not found", "error");
        const S = REACT_STATES[state_name];
        if (!S) return g_fn.feedback("Can't set state: state not found", "error");
        if (!S.set_state || typeof (S.set_state) !== "function") return g_fn.feedback(`Can't set state: set_state not found: ${JSON.stringify(S)}`, "error");
        const value = g_fn.get_attr_from_event(e, ['state-value', 'value']);
        if (value === undefined) return g_fn.feedback("Can't set state: value not found", "error");
        S.set_state(value);
    },
    toggle_dark_mode: function (e) {
        const EL = document.body;
        if(EL.classList.contains("dark")){
            EL.classList.remove("dark");
        }
        else{
            EL.classList.add("dark");
        }
    },

    // CUSTOM ACTION
    bro_run_custom_action : function (e, M, INFO) {
        const code = e.currentTarget?.getAttribute('code');

        try {
            eval(code);
        } catch (e) {
            console.warn('ERROR WHILE EVALUATING CUSTOM ACTION : ', e);
            g_fn.feedback('error while evaluating custom action', 'error');
        }
    },



    // this will work only during development, in production it will be empty, we have to call init_app_state
    AS: {
        is_dev: false,
        is_dev_edit_mode: false, // will be set by relay.js. Otherwize always false

        enable_login: (GC.APP_JSON as any)?.login?.type !== 'none',
        rx_show_login: new BehaviorSubject(GC.SHOW_LOGIN || false), // show login page if enable_login is true
        db: {
            count: 0,                       // keep a count of all transaction
            tx: new Subject<{
                type: string,               // create, update, delete
                model_id: string,           // for what model id this transaction is for
                entity_ids: string[],       // what entites are updated
                prop_names: string[],       // what props are updated, * for all
                data: any[],                // what data is updated
                count: number,
            }>(),
        },
        app: { id: '', name: '', logo_url: '' }, // app
        session: {} as any,

        GSTORE: new GLOBAL_STORE(),


        pages: GC.PAGES || [{ bid: "", name: "", icon: "" }],
        rx_page: new BehaviorSubject<PAGE_TYPE>(typeof(GC.PAGE) === "string"?{
            bid: '',
            name: '',
            icon: '',
        }: GC.PAGE), // selected page
        page: GC.PAGE || {bid: '00000', name: '', icon: ''},

        // we will use this to render components to the main app
        utility_renderer: new BehaviorSubject(null), // component_renderer

        models: [], // models
        components: {}, // components => {comp_id: {REACT_STATES}}

        map_data: {}, // {[node_id]: [{}]} // map_data, whenever we map some data in any node we will have access to that here


        rx_token: new BehaviorSubject(''), // token
        token: null as string|null,
        rx_user: new BehaviorSubject<any>(null), // user,
        user: null as any,

        rx_selected_entity: new BehaviorSubject<{[k:string]: any}>({}), // selected entity
        selected_entity: {},

        rx_url_state: new BehaviorSubject({}), // url_state, this will be used  to store few state to the url as browser_history
        url_state: {},


        filters: {
            compiletime: new BehaviorSubject([]), // compiletime_filters
            runtime: new BehaviorSubject([]), // runtime_filters
        },
        navigate: (path) => {}, // react router navigate


        // std lib we store it to see when it's available
        rx_boken_module: new BehaviorSubject(null), // boken_module,
    },

    // this can't be async => it will be used inside JSX
    GET: function (M, keys) {
        if (!M || !keys || !keys.length) return undefined;
        let v = M;
        for (let k of keys) {
            if (!v) return undefined;
            v = v[k];
        }
        return v;
    },

    G_STATIC_DATA: {},

    GET_GC: function () {
        return GC;
    },



    // DEV
    dev: {
        emit_m: function (e, M, INFO) {
            // send a message to window
            // so that anyone can listen to it

            // const user = g_fn.AS.user || {}; // can't convert undefined or null to object
            // const ev = new CustomEvent("emit_m", {detail: {M : M || {}, INFO : INFO || {}, user : user || {}}});
            // window.dispatchEvent(ev);
        }
    }
};


// Static listeners

const AS = g_fn.AS;
AS.rx_page.subscribe((page) => {
    AS.page = page;
    AS.navigate(page.bid);
    
    
    if(EN_BROKEN_G_FN_LOGS.PAGE_CHANGED){
        console.log("rx_page sub: ", page);
    }
});
AS.rx_token.subscribe((token) => {AS.token = token});
AS.rx_user.subscribe((user) => {AS.user = user;
    if(user) {
        AS.GSTORE.set(g_fn.get_model_by_name('user').id, user.id, user);
        console.log("SETTING USER TO GSTORE FROM RX_USER SUBSCRIPTION : ", user);
    }
});

AS.rx_selected_entity.subscribe((selected_entity) => {AS.selected_entity = selected_entity});
AS.rx_url_state.subscribe((url_state) => {
    const runtime_url_state = g_fn.runtime_get_url_state();
    const state = {...runtime_url_state, ...url_state};
    AS.url_state = state;

    g_fn.push_state_to_history(JSON.stringify(state));
});


// Selected entity
AS.rx_selected_entity.subscribe(SE=>{
    const se = {};
    for(let [mid, entity] of Object.entries(SE)){
        if(!mid || !entity || !entity.id) continue;
        se[mid] = entity.id;
    }

    const state = g_fn.runtime_get_url_state() as any;
    if(Object.keys(se).length){
        state.selected_entity = se;
    }
    AS.rx_url_state.next(state);
})

export default g_fn;
