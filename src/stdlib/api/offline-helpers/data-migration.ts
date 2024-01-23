

//@ts-ignore
import datascript from "datascript"
import { DEFAULT_RES_SINGLE, OBJECT_TYPE, app_object_type } from "../../types";

const is_object_same = (obj1: OBJECT_TYPE<any>, obj2: any) => {

    if(typeof(obj2) !== "object") return false;

    const keys1  = Object.keys(obj1);
    const keys2  = Object.keys(obj2);

    if(keys1.length !== keys2.length) return false;

    for(let key of keys1){
        if(Array.isArray(obj1[key])){
            const r = is_array_same(obj1[key], obj2[key]);
            if(!r) return false
        }
        else if (typeof(obj1[key]) === "object"){
            const r = is_object_same(obj1[key], obj2[key]);
            if(!r) return false;
        }
        else{
            if(obj1[key] !== obj2[key]) return false;
        }
    }
    return true;

}

const is_array_same = (arr1: any, arr2: any): boolean => {
    if(!Array.isArray(arr2)) return false;
    if(arr1.length !== arr1.length) return false;
    let idx = 0;
    for(let a of arr1){

        if(Array.isArray(a)){
            const r = is_array_same(a, arr2[idx]);
            if(!r) return false
        }
        else if (typeof(a) === "object"){
            const r = is_object_same(a, arr2[idx]);
            if(!r) return false;
        }
        else{
            if(!arr2.includes(a)) return false;
        }

        idx = idx+1;
    }
    return true;
}

type migration =  {
    type: "prop",
    prop : string, 
    model_id : string,
    remove: boolean
} | {
    type: "model",
    model_id : string,
    remove: boolean
} 

export interface ldb  {
    db : any,
    conn : any
}

//this file is to specifically check 
export const get_migration_req = (curr_app: app_object_type, prev_app: app_object_type) : migration[] => {
    //case 1 check if a model is deleted
    const mig_list: migration[] = [];

    for(let model of prev_app.models){
        const curr_model = curr_app.models.find(m => m.id === model.id);
        //if a model is deleted 
        if(!curr_model){
            
            mig_list.push({
                type: "model",
                model_id : model.id,
                remove : true
            })
            continue;
        }
        const prev_props = model.props;
        for(let prop of prev_props){
            const curr_prop = curr_model.props.find(p => p.name === prop.name);
            //prop is deleted, 
            if(!curr_prop) {
                mig_list.push({
                    type: "prop",
                    model_id: curr_model.id,
                    prop : prop.name,
                    remove: true
                })
                continue;
            }
               
            const type = prop.type;
            const curr_type = curr_prop.type;
            //type changed
            //sometimes, there is no need to delete :eg :  any_one_of to text
            if(type !==  curr_type) {
                mig_list.push({
                    type: "prop",
                    model_id: curr_model.id,
                    prop : prop.name,
                    remove: true
                })
                continue;
            };
            if(type === "any_one_of" || type === "many_of"){
                //check if options are not same
                const options = prop.options;
                const curr_options = curr_prop.options;
                if(options){
                    for(let o of options){
                        //if curr options donot includes the prev options 
                        if(!curr_options?.includes(o)) {
                            mig_list.push({
                                type: "prop",
                                model_id: curr_model.id,
                                prop : prop.name,
                                remove: true
                            })
                            continue;
                        };
                    }
                }
            }

            //check for uniqueness 
            //think of it, have to decie on this 
            if(!prop.is_unique && curr_prop.is_unique) {
                mig_list.push({
                    type: "prop",
                    model_id: curr_model.id,
                    prop : prop.name,
                    remove: true
                })
                continue;

            }
            
            
        }

    }

    return mig_list

    
}




export const entity_to_tx = (model_id: string, entity: OBJECT_TYPE<any> , index?: number, db_fn?: "retract"|"add") => {

    let fn = ":db/add";
    if(db_fn && db_fn === "retract"){
        fn = ":db/retract";
    }

    let tx_arr : any[][] = [];
    let idx = index || -1;
    for(let [k,v] of Object.entries(entity)){
        let a =  model_id + ":" + k;

        if(Array.isArray(v)){
            v.map((i) => {
                if(typeof(i) === "object"){
                    i = JSON.stringify(i);
                }
                let t = [fn, idx, a, i];
                tx_arr.push(t);
            })
            continue;
        }
        else if ((typeof(v) === "object")){
            v = JSON.stringify(v);
        }
        let t = [fn, idx, a, v];
        tx_arr.push(t);
    }
    return tx_arr;
}


const init_ldb = ( ldb: ldb, data: any, meta: any,  errors: string[]): DEFAULT_RES_SINGLE<any>=>{
    
    
    const schema = meta?.schema || {};
    
    try {
        let db1     = datascript.init_db(data, schema);
        let conn    = datascript.conn_from_db(db1);
        ldb.db = db1;
        ldb.conn = conn;
        return {success: true, data: {}, code: 200}
    } catch (error) {
        console.warn("error in initialising db : ", error);
        errors.push("error in initialising db : " + error)
        return {success: false, errors,code: 500}
    }
    // get the data if it doesn't exist
}

const transact_DS = (tx:any,  ldb: ldb, meta: any,  errors: string[]): DEFAULT_RES_SINGLE<any> => {

    
    const db = ldb.db;
    const conn = ldb.conn;
    const DS = datascript;

    try {
        const tx_report = DS.transact(
            conn,
            tx,
            meta
        );
        if (tx_report?.tx_data?.length) {
    
            const db_new = tx_report.db_after;
            ldb.db = db_new
            return {success: true, data : db_new, code: 200}
        }
        return {success: true, data : db, code: 200}
    } catch (error) {
        const m = "error while transaction : "+ error;
        return {success: false, errors, code: 500}
    }


};

const create_tx = (ldb: ldb, mig: migration, errors: string[]): DEFAULT_RES_SINGLE<any> => {

    const fn = ":db/retract";
    const type = mig.type;
    const tx: string[][] = [];
    if(type === "prop"){
        const p = mig.prop;
        const m = mig.model_id;
        const a = m + ":" + p;

        const q = `[:find ?e :keys entity :where [?e "${a}" _] ]`

        const res = query_DS(q, ldb, errors);

        if(!res.success){
            return res
        }

        for(let d of res.data){
            const entity_id = d.entity;
            tx.push([fn, entity_id, a]);
        }
        
    }

    if(type === "model"){
        const m = mig.model_id;
        const a = m + ":id";
        const q = `[:find ?e ?a :keys entity attr :where [?e ?a _] [?e "${a}" _]]`;
        const res = query_DS(q, ldb, errors);

        if(!res.success){
            return res
        }

        for(let d of res.data){
            const entity_id = d.entity;
            const attr = d.attr;
            tx.push([fn, entity_id]);
        }


    }

    return {success: true, data: tx, code: 200};

}

const query_DS = (q:any, ldb: ldb,   errors: string[], add_inputs?:any): DEFAULT_RES_SINGLE<any> => {
    
    const DS= datascript;
    const db = ldb.db;
    try {
        if(add_inputs){
            let r = DS.q(q, db, add_inputs);
            return {success: true, data: r, code: 200}
        }
        else{
            let r = DS.q(q, db);
            return {success: true, data: r, code: 200}

        }
    } catch (error) {
        
        errors.push(" query is : "+ q)
        const m = " error while querying : "+ String(error) ;
        errors.push(m);
        return {success: false, errors, code: 500}
    }
};

export const apply_migartions = (data: any, meta: any, mig_list : migration[], errors: string[] ):DEFAULT_RES_SINGLE<any> => {
    //ldb => local variable containing info about ds, and passes thorugh the functions
    const ldb: ldb = { db: null, conn: null};

    let init = init_ldb(ldb, data, meta,  errors);
    if(!init.success) return init;
    const tx_arr = [];
    for(let mig of mig_list){
        const tx = create_tx(ldb, mig, errors);
        if(!tx.success) return tx;
        tx_arr.push(...tx.data);
    }
    const r = transact_DS(tx_arr, ldb, meta, errors);
    if(!r.success) return r;
    let updated_datoms = datascript.datoms(r.data, ":eavt");
    return {success: true, data: updated_datoms, code:200};
}


