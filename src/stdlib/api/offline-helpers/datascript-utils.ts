import { query_DS, pull_DS, transact_DS } from "../../db/datascript";
import { filter, pagination_cond, query_obj_type, sort, t_update_patch } from "../../interfaces";
import { DEFAULT_RES_SINGLE, DEFAULT_RES_SINGLE_P, OBJECT_TYPE, app_object_type, model_type, user_type } from "../../types";
import { validate_data_with_model } from "./data-validation";
import { transact } from "./datascript";
import file, { get_one_file } from "./file";
import { get_one_image } from "./image";
import { get_entity_id_with_pk } from "./utils";

export const js_add_fns = {
    sort: (entities: any[], sort: sort) => {
        const attr = sort.attr;
        const order = sort.order;


        if (order === "ASC") {
            entities.sort((a: any, b: any) => {
                if (a[attr] && b[attr]) {
                    if (a[attr] > b[attr]) {
                        return 1
                    }
                    else if (a[attr] < b[attr]) {
                        return -1
                    }
                    else if (a["id"] > b["id"]) {
                        return 1
                    }
                    else if (a["id"] < b["id"]) {
                        return -1
                    }
                    else {
                        return 0
                    }
                }
                else {
                    return 0
                }
            });
        }
        else {
            entities.sort((a, b) => {
                if (a[attr] && b[attr]) {
                    if (a[attr] > b[attr]) {
                        return -1
                    }
                    else if (a[attr] < b[attr]) {
                        return +1
                    }
                    else if (a["id"] > b["id"]) {
                        return -1
                    }
                    else if (a["id"] < b["id"]) {
                        return +1
                    }
                    else {
                        return 0
                    }
                }
                else {
                    return 0
                }
            });
        }
        return entities;
    },

    filter: (entities: any[], filters: filter[]) => {
        for (let filter of filters) {
            let a = filter;
            const attr = a.attr;
            if ((a.op === "eq") || (a.op === "neq")) {
                let val = a.val
                if (a.op === "eq") {
                    entities = entities.filter(e => e[attr] === val)
                }
                else {
                    entities = entities.filter(e => e[attr] !== val)
                }
            }
            else if ((a.op === "gt") || (a.op === "geq")) {
                let val = a.val
                if (a.op === "gt") {
                    entities = entities.filter(e => e[attr] > val)
                }
                else {
                    entities = entities.filter(e => e[attr] >= val)
                }
            }
            else if ((a.op === "lt") || (a.op === "leq")) {
                let val = a.val
                if (a.op === "lt") {
                    entities = entities.filter(e => e[attr] < val)
                }
                else {
                    entities = entities.filter(e => e[attr] <= val)
                }
            }
        }

        return entities;

    },
};



export const add_reqd_props_to_entity = (entity: OBJECT_TYPE<any>, user: user_type) => {
    if(!entity["created_at"]) entity["created_at"] = Date.now();
    if(!entity["updated_at"]) entity["updated_at"] = Date.now();
    if(!entity["created_by"]) entity["created_by"] = user.id;
    if(!entity["updated_by"]) entity["updated_by"] = user.id;

    if(!entity["id"] || (entity["id"] && !isNaN(entity["id"]) && entity["id"]<0) ){
        let id = window.broken.utils.ulid().toLowerCase();
        entity["id"] = id;
        return id;
    }
    return;

}

export const add_reqd_props_to_all_entities = (entities:OBJECT_TYPE<any>[], user: user_type) => {
    for(let entity of entities){
        add_reqd_props_to_entity(entity, user);
    }
}

export const generate_ds_query = (app_json: app_object_type, model: model_type, filters: {attr: string, op: string, val?: any}[], pagination_cond?: {attr: string, order: "ASC"|"DESC", curr_val?: any, id?: any}, add_inputs?: {e?: any, a?: any, v?: any} ) => {
    
    const model_id = model.id;
    const find_spec = `?e ?a ?v`;
    let query   = `[:find ?e ?a ?v :where [?e ?a ?v ] `;
    //default filter to get the data of the particular model
    filters.push({attr: "created_at", op: "gt", val: 0});

    const op_map: any = {
        "gt" : " > ",
        "lt" : " < ",
        "eq" : " == ",
        "leq" : " <= ",
        "geq" : " >= ",
        "neq" : " != " 
    };
     
    let v = "f";
    let i = 0;

    let basic_clauses   =    [];
    basic_clauses.push(`[?e ?a ?v]`);
    //cond clauses are for and and or clauses
    let cond_clauses    =    [];
    const in_sts   =    [ `$`];
    if(add_inputs){
        if(add_inputs.e){
            if(Array.isArray(add_inputs.e)){
                in_sts.push( `[?e ...]`);
            }
            else{
                in_sts.push(`?e`)
            }
        }
        if(add_inputs.a){
            if(Array.isArray(add_inputs.a)){
                in_sts.push( `[?a ...]`);
            }
            else{
                in_sts.push(`?a`)
            }
        }
        if(add_inputs.v){
            if(Array.isArray(add_inputs.v)){
                in_sts.push( `[?v ...]`);
            }
            else{
                in_sts.push(`?v`)
            }
        }
    }

    for(let filter of filters){
        let attr    =   filter.attr;
        attr        =   attr.split(".")[0]; // queries with relations are sent as {user.name eq ""}
        const pr = model.props.find(p => p.name === attr);
        
        if(!pr) continue;

        let val = filter.val;
        if(typeof(filter.val) === "string"){
            val = `"${filter.val}"`
        }
        
        let op      =   op_map[filter.op];
        if(!op) continue; // we will send js filters like (match) which datascript doesn't know how to apply

        let f       =   v+i;
        if(pr.is_relation){
            let attr_list = filter.attr.split(".");
            attr_list.splice(0, 1);
            basic_clauses.push(`[?e "${model_id}:${attr}" ?${f}]`);
            let rel_model = app_json.models.find(m => m.id === pr.type);
            if(!rel_model) continue;
            const recursive_rel_cl = (attr_list: string[]) => {
                for(let attr of attr_list){
                    let model = rel_model;
                    if(!model) continue;
                    const pr = model?.props.find(p => p.name === attr);
                    if(!pr) continue;
                    if(pr.is_relation){
                        let rel_model = app_json.models.find(m => m.id === pr.type);
                        if(!rel_model) break;
                        let e = f;
                        i++;
                        f = v+i;
                        basic_clauses.push(`[?${e} "${model.id}:${attr}" ?${f}]`);
                        model = rel_model;
                    }
                    else{
                        let e = f;
                        i++;
                        f = v+i;
                        basic_clauses.push(`[?${e} "${model.id}:${attr}" ?${f}]`);
                        break;
                    }
                }
            }
            recursive_rel_cl(attr_list);
        }
        else{
            basic_clauses.push(`[?e "${model_id}:${attr}" ?${f}]`);
        }
        if(Array.isArray(val)){
            let sts = []
            for(let v of val){
                if(typeof(v) === "string"){
                    v = `"${v}"`
                }
                sts.push(`[(${op} ?${f} ${v})]`);
            }
            let c = `( or ${sts.join(" ")} )`
            cond_clauses.push(c)
        }
        else{
            cond_clauses.push(`[(${op} ?${f} ${val})]`);
        }
        i++;
    }

    if(pagination_cond){
        const attr      =   pagination_cond.attr;
        let val = pagination_cond.curr_val;
        if(typeof(pagination_cond.curr_val) === "string"){
            val = `"${pagination_cond.curr_val}"`
        }
        const id        =   pagination_cond.id;
        const order     =   pagination_cond.order;
        let f1 = v + i; i++;
        let f2 = v + i; i++;

        basic_clauses.push(`[?e "${model_id}:${attr}" ?${f1}]`)
        basic_clauses.push(`[?e "${model_id}:id" ?${f2}]`)

        let op = order === "ASC"? ">" : "<" 
        const c1 = `[( ${op} ?${f1} ${val} )]`

        const c2 = `[( == ?${f1} ${val} )]`
        const c3 =  `[(${op} ?${f2} "${id}")]`

        const and_cond  = `( and ${c2}  ${c3})`;
        const or_cond   = `( or ${c1} ${and_cond})`;

        cond_clauses.push(or_cond); 

    }

    query = `[` + ":find" + " " + find_spec + " "+ " :in " + in_sts.join(" ") + " " + " :where " +  basic_clauses.join(" ") + " " + cond_clauses.join(" ") + "]";
    return query;
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
    return {tx_arr, index};
}


export const entities_to_tx = (model_id: string, entities: OBJECT_TYPE<any>[]) => {
    let tx_arr = [];
    let i = -1;
    const indices = []
    for(let entity of entities){
        const tx = entity_to_tx(model_id, entity, i);
        tx_arr.push(...tx.tx_arr);
        indices.push(tx.index);
        i--;
    }
    return {tx_arr, indices}
}


export const patches_to_tx = (model_id: string,  index: number, patches: t_update_patch[]) => {


    let tx_arr : any[][] = [];
    let idx = index || -1;
    for(let patch of patches){
        let fn = ":db/add";
        if(patch.op === "remove"){
            fn = ":db/retract";
        }
        const key = patch.path.split("/")[1]
        let a =  model_id + ":" + key;
        let v = patch.value;


        if (!v && patch.op === "remove"){
            let t = [fn, idx, a];
            tx_arr.push(t);
        }
        else if(Array.isArray(v)){
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
            let t = [fn, idx, a, v];
            tx_arr.push(t);
        }
        else{
            let t = [fn, idx, a, v];
            tx_arr.push(t);
        }
    }
    

    
    return {tx_arr, idx};
}

export const tuples_to_obj = (data: any[][], schema: any) => {

    if (data.length) {
        if (!Array.isArray(data[0])) {
            return data
        }
    }
    if (!data.length) return [];

    let entities: OBJECT_TYPE<any> = {}
    data.map(d => {
        if (d.length && d.length > 2) {
            if (!entities[d[0]]) {
                entities[d[0]] = {};
            }
            let is_many = false;
            if (schema[d[1]] && schema[d[1]][":db/cardinality"] === ":db.cardinality/many") {
                is_many = true;
            }
            let _p = d[1].split(":");
            if (_p.length > 0) {
                const prop = d[1].split(":")[1];
                if (!is_many) {
                    entities[d[0]][prop] = d[2];
                }
                else {
                    if (!entities[d[0]][prop]) {
                        entities[d[0]][prop] = [];
                    }
                    entities[d[0]][prop].push(d[2]);

                }
            }
        }
    });
    return Object.values(entities);
}



const get_valid_file_obj = async(file_obj: any): DEFAULT_RES_SINGLE_P<any> => {
   
    const stored_url = file_obj.url;

    if(!stored_url){
        const m = `Unable to find key "url" for file`;
        console.warn(m);
        return {
            success: false,
            code: 1056,
            errors: [m]
        }
    }

    if (stored_url.startsWith('@resource:')) {
        const s = stored_url.split(":");
        if(s.length < 2) {
            const m = "invalid file url found";
            console.warn(m);
            return {success: false, errors: [m], code: 1057}
        }
        const type  = s[1];
        const key   = s[2];
        const [app_id, model_id, entity_id, prop_id, uid] = key ? key.split('/') : ["", "", "", "", ""];
        // Check if everything is defined
        if (!app_id || !model_id || !entity_id || !prop_id || !uid) {
            console.warn("invalid file key found ", key);
            return {
                success: false,
                code: 1057,
                errors: ["invalid file key found"]
            };
        }
        if (type === "file") {
            // get the file data from the db
            const r = await get_one_file("PRIVATE", app_id, model_id, entity_id, prop_id, uid);
            if (!r.success) {
                return {
                    success: false,
                    code: r.code,
                    errors: r.errors
                };
            }
            file_obj.url = r.data.url;
        }
        else if (type === "image") {
            // get the image data from the db
            const r = await get_one_image("PRIVATE", app_id, model_id, entity_id, prop_id, uid);

            if (!r.success) {
                return {
                    success: false,
                    code: r.code,
                    errors: r.errors
                };
            }
            file_obj.url = r.data.url;
        }
    }
    else{
        return {success: true, data: file_obj, code: 200}
    }

    return {success: true, data: file_obj, code: 200}
}

export const parse_entities = async (model: model_type, data: OBJECT_TYPE<any>[]) => {

    const res: OBJECT_TYPE<any>[] = [];

    const r = await Promise.all(
        data.map(async (d, idx) => {
            res[idx] = data[idx];
            for (let [k, v] of Object.entries(d)) {
                const prop = model.props.find(p => p.name === k);
                if(!prop) continue;
                if(prop.is_many && !prop.is_relation){
                    if(!v || !Array.isArray(v)) continue;
                    res[idx][k] = [];
                    for(let each_v of v){
                        try {
                            each_v = JSON.parse(each_v);
                            if(["file", "image"].includes(prop.type)){
                                const r  = await get_valid_file_obj(each_v.v);
                                if(!r.success) continue;
                                each_v.v = r.data;
                            }
                            res[idx][k].push(each_v);
                        } catch (error) {
                            console.warn("invalid val found : ", v);
                            continue;
                        }
                    }
                    res[idx][k].sort((a: any, b: any)=>{
                        if(!a.id || !b.id){
                            return 0
                        }
                        if(a.id > b.id){
                            return 1
                        }
                        else if(a.id < b.id){
                            return -1
                        }
                        else {
                            return 0
                        }
                    });
                }
                else if (prop.is_json) {
                    try {
                        v = JSON.parse(v);
                        res[idx][k] = v;
                    } catch (error) {
                        console.warn("invalid value found for property " + k);
                        continue;
                    }
                    
                }
                else if (["file", "image"].includes(prop.type)) {

                    let file_obj : any = null;
                    try {
                        file_obj = JSON.parse(v)
                    } catch (error) {
                        const m = "invalid object stored for file : " + v;
                        console.warn(m);
                        return {success: false, errors: [m], code: 1000}
                    }
                    const r  = await get_valid_file_obj(file_obj);
                    if(!r.success){
                        return r;
                    }
                    else{
                        res[idx][k] = r.data
                    }
                }
            }
        }
    ));

    if (!r) return [];
    return res;
}

export const sort_data = (data: any[], sort: sort) => {
    return js_add_fns.sort(data, sort);
}

export const limit_data = (data: any[], limit: number) => {
    return data.slice(0, limit);
}

export const apply_js_filters = (data: any[], filters: filter[])=>{
    for(let f of filters){
        // pick js filters only
        if(f.op === "match"){
            // first full text search on all property
            data = data.filter(d=>{
                if(!d) return false;
                // @todo: recursively only take values
                const values = Object.values(d);
                const s = String(values);
                if(s.match(f.val)){
                    return true;
                }
            })

        }
    }

    return data;
}

export const add_entity_id_if_relation = (model: model_type, data: any, errors: string[]): DEFAULT_RES_SINGLE<any> => {
    for (let prop of model.props) {
        const prop_name = prop.name;
        if (!prop.is_relation) continue;
        const prop_val = data[prop_name];
        if (!prop_val) continue;
        const rel_model_id = prop.type;
        if (Array.isArray(prop_val)) {
            data[prop_name] = [];
            for (let v of prop_val) {
                const e_id = get_entity_id_with_pk(rel_model_id, "id", v, errors );
                if (!e_id.success) return e_id;
                data[prop_name].push(e_id.data);
            }
        }
        else {
            const e_id = get_entity_id_with_pk(rel_model_id, "id", prop_val, errors);
            if (!e_id.success) return e_id;
            data[prop_name] = e_id.data;
        }
    }

    return { success: true, data: data, code: 200 }
}

export const create_relation = (  user: user_type, app_object: app_object_type, model: model_type, data: OBJECT_TYPE<any>, errors: string[]): DEFAULT_RES_SINGLE<any> => {
    //case 1  => relation id present(check if it exists, thats it)
    //case 2 => relation object sent, with id 
        // case a =>  if entity already exists with that id => update if other properties which are sent along with id and add tx id to parent M
        // case b =>  if entity does not exist, check for the complete model data and create a new entity and update parent M
    //case 3 => relation object sent without id
        // create a new entity (check for valid data ) and update parent M
    
    for(let prop of model.props){
        const prop_name = prop.name;
        if(!prop.is_relation) continue;
        let prop_val = data[prop_name];
        if(!prop_val) continue;
        const rel_model_id = prop.type;
        const rel_model = app_object.models.find(m => m.id === rel_model_id);
        if(!rel_model){
            const m = 'rel model not found for id : '+ rel_model_id;
            console.warn(m);
            errors.push(m);
            return {success: false, errors, code: 500}
        }
        if(!prop.is_many){
            
            if(typeof(prop_val) !== 'object'){
                const e_id =  get_entity_id_with_pk( rel_model_id, rel_model.primarykey, prop_val, errors);
                if(!e_id.success) return e_id;
                data[prop_name] = e_id.data;
            }
            else{
                const id = prop_val.id;
                if(!id){
                    //create new relation entity
                    let r = add_reqd_props_to_entity(prop_val, user);
                    let v = validate_data_with_model(rel_model, prop_val, errors, false, false);
                    if(!v.success) return v;
                    const c =  create_relation(user, app_object, rel_model, prop_val, errors);
                    if(!c) return c;
                    const index = -1
                    const tx    =   entity_to_tx(rel_model_id, prop_val, index).tx_arr;
                    const p     =   transact_DS( tx, {origin: 'create_one_datascript',operation: 'create_one'}, errors);
                    if(!p.success) return p;
                    console.log("created new entity for prop : ", prop.name, " with id  : ", prop_val.id)

                    data[prop_name] = p.data.tempids[""+index]; // tempids => { "-1" : 6, ":db/current-tx": 536870933}
                }
                else{
                    //id is present
                    const e_id =  get_entity_id_with_pk(rel_model_id, rel_model.primarykey, id, errors);
                    if(!e_id.success){
                        if(e_id.code !== 1075) return e_id;
                        else{
                            // create entity
                            //create new relation entity
                            add_reqd_props_to_entity(prop_val, user);
                            let v = validate_data_with_model(rel_model, prop_val, errors, false, false);
                            if(!v.success) return v;
                            const c =  create_relation(user, app_object, rel_model, prop_val, errors);
                            if(!c.success) return c;
                            const index = -1;
                            prop_val = c.data;
                            const tx = entity_to_tx(rel_model_id, prop_val, index).tx_arr;
                            const p     =   transact_DS( tx, {origin: 'create_one_datascript',operation: 'create_one'}, errors);
                            if(!p.success) return p;
                            console.log("created new entity for prop : ", prop.name, " with id  : ", prop_val.id)
                            data[prop_name] = p.data.tempids[""+index]; // tempids => { "-1" : 6, ":db/current-tx": 536870933}
                        }
                    }
                    else{
                        data[prop_name] = e_id.data;
                    }
                }
            }
        }
        else{
            data[prop_name] = [];
            for(let val of prop_val){
                if(typeof(val) !== 'object'){
                    const e_id =  get_entity_id_with_pk( rel_model_id, model.primarykey, val, errors);
                    if(!e_id.success) return e_id;
                    data[prop_name].push(e_id.data);
                }
                else{
                    const id = val.id;
                    if(!id){
                        //create new relation entity
                        let r = add_reqd_props_to_entity(val, user);
                        let v = validate_data_with_model(rel_model, val, errors, false, false);
                        if(!v.success) return v;
                        const c =  create_relation( user, app_object, rel_model, val, errors);
                        if(!c) return c;
                        const index = -1
                        const tx = entity_to_tx(rel_model_id, val, index).tx_arr;
                        const p     =   transact_DS( tx, {origin: 'create_one_datascript',operation: 'create_one'}, errors);
                        if(!p.success) return p;
                        data[prop_name].push(p.data.tempids[""+index]); // tempids => { "-1" : 6, ":db/current-tx": 536870933}
                    }
                    else{
                        //id is present
                        const e_id =  get_entity_id_with_pk( rel_model_id, model.primarykey,  id, errors);
                        if(!e_id.success){
                            if(e_id.code !== 1075) return e_id;
                            else{
                                // create entity
                                //create new relation entity
                                let r = add_reqd_props_to_entity(val, user);
                                let v = validate_data_with_model(rel_model, val, errors, false, false);
                                if(!v.success) return v;
                                const c =  create_relation(user, app_object, rel_model, val, errors);
                                if(!c.success) return c;
                                const index = -1;
                                val = c.data;
                                const tx =  entity_to_tx(rel_model_id, val, index).tx_arr;
                                const p  =   transact_DS( tx, {origin: 'create_one_datascript',operation: 'create_one'}, errors);
                                if(!p.success) return p;
                                data[prop_name].push(p.data.tempids[""+index]); // tempids => { "-1" : 6, ":db/current-tx": 536870933}
                            }
                        }
                        else{
                            data[prop_name].push(e_id.data);
                        }
                    }
                }
            }
            
        }

    }

    return {success: true, data, code: 200}
}

export const create_relation_for_patches = ( user: user_type, app_object: app_object_type, model: model_type, patches: t_update_patch[], errors: string[]): DEFAULT_RES_SINGLE<any> => {


    for(let i = 0; i < patches.length;  i++){
        const patch     =   patches[i];
        const pr        =   patch.path.split("/")[1];
        const prop      =   model.props.find(p => p.name === pr);
        if(!prop)continue;
        if(!prop.is_relation) continue;
        let prop_val  =   patch.value;
        if(!prop_val) continue;

        const rel_model_id  =   prop.type;
        const rel_model     =   app_object.models.find(m => m.id === rel_model_id);
        if(!rel_model){
            const m = 'rel model not found for id : '+ rel_model_id;
            console.warn(m);
            errors.push(m);
            return {success: false, errors, code: 500}
        }

        if(!prop.is_many){
            if(typeof(prop_val) !== 'object'){
                const e_id =  get_entity_id_with_pk(  rel_model_id, rel_model.primarykey,  prop_val, errors);
                if(!e_id.success) return e_id;
                patches[i].value = e_id.data;
            }
            else{
                const id = prop_val.id;
                if(!id){
                    //create new relation entity
                    let r = add_reqd_props_to_entity(prop_val, user);
                    let v = validate_data_with_model(rel_model, prop_val, errors, false, false);
                    if(!v.success) return v;
                    const c =  create_relation( user, app_object, rel_model, prop_val, errors);
                    if(!c) return c;
                    const index = -1
                    const tx = entity_to_tx(rel_model_id, prop_val, index).tx_arr;
                    const p =  transact_DS( tx, {origin: 'create_one_datascript',operation: 'create_one'}, errors);
                    if(!p.success) return p;
                    console.log("created new entity for prop : ", prop.name, " with id  : ", prop_val.id)
                    
                    patches[i].value = p.data.tempids[""+index]; // tempids => { "-1" : 6, ":db/current-tx": 536870933}
                }
                else{
                    //id is present
                    const e_id =  get_entity_id_with_pk(  rel_model_id, rel_model.id, id, errors);
                    if(!e_id.success){
                        if(e_id.code !== 1075) return e_id;
                        else{
                            // create entity
                            //create new relation entity
                            let r = add_reqd_props_to_entity(prop_val, user);
                            let v = validate_data_with_model(rel_model, prop_val, errors, false, false);
                            if(!v.success) return v;
                            const c =  create_relation( user, app_object, rel_model, prop_val, errors);
                            if(!c.success) return c;
                            const index = -1;
                            prop_val = c.data;
                            const tx = entity_to_tx(rel_model_id, prop_val, index).tx_arr;
                            const p = transact_DS( tx, {origin: 'create_one_datascript',operation: 'create_one'}, errors);
                            if(!p.success) return p;
                            console.log("created new entity for prop : ", prop.name, " with id  : ", prop_val.id)
                            patches[i].value = p.data.tempids[""+index]; // tempids => { "-1" : 6, ":db/current-tx": 536870933}
                        }
                    }
                    else{
                        patches[i].value = e_id.data;
                    }
                }
            }
        }
        else{
            patches[i].value = [];
            for(let val of prop_val){
                if(typeof(val) !== 'object'){
                    const e_id  =  get_entity_id_with_pk( rel_model_id, rel_model.primarykey, val, errors);
                    if(!e_id.success) return e_id;
                    patches[i].value.push(e_id.data);
                }
                else{
                    const id = val.id;
                    if(!id){
                        //create new relation entity
                        let r = add_reqd_props_to_entity(val, user);
                        let v = validate_data_with_model(rel_model, val, errors, false, false);
                        if(!v.success) return v;
                        const c =  create_relation(user, app_object, rel_model, val, errors);
                        if(!c) return c;
                        const index = -1
                        const tx = entity_to_tx(rel_model_id, val, index).tx_arr;
                        const p =   transact_DS( tx, {origin: 'create_one_datascript',operation: 'create_one'}, errors);
                        if(!p.success) return p;
                        console.log("created new entity for prop : ", prop.name, " with id  : ", val.id)

                        patches[i].value.push(p.data.tempids[""+index]); // tempids => { "-1" : 6, ":db/current-tx": 536870933}
                    }
                    else{
                        //id is present
                        const e_id =  get_entity_id_with_pk(  rel_model_id, rel_model.primarykey, id, errors);
                        if(!e_id.success){
                            if(e_id.code !== 1075) return e_id;
                            else{
                                // create entity
                                //create new relation entity
                                let r = add_reqd_props_to_entity(val, user);
                                let v = validate_data_with_model(rel_model, val, errors, false, false);
                                if(!v.success) return v;
                                const c =  create_relation( user, app_object, rel_model, val, errors);
                                if(!c.success) return c;
                                const index = -1;
                                val = c.data;
                                const tx = entity_to_tx(rel_model_id, val, index).tx_arr;
                                const p = transact_DS( tx, {origin: 'create_one_datascript',operation: 'create_one'}, errors);
                                if(!p.success) return p;
                                console.log("created new entity for prop : ", prop.name, " with id  : ", val.id)
                                patches[i].value.push(p.data.tempids[""+index]); // tempids => { "-1" : 6, ":db/current-tx": 536870933}
                            }
                        }
                        else{
                            patches[i].value.push(e_id.data);
                        }
                    }
                }
            }
            
        }
        
    }
    

    return {success: true, data: patches, code: 200}
}

export const parse_pull_result = async(app_object: app_object_type, data :  OBJECT_TYPE<any>, model_id: string) => {
    const parsed_res: OBJECT_TYPE<any> = {} 
    for(let key of Object.keys(data)){
        // if(key === ":db/id") continue;
        let a = model_id + ":";
        let r = data[key];
        key = key.replace(a, "");
        parsed_res[key] = r
    }
    const model = app_object.models.find(m => m.id === model_id);
    if(!model) return parsed_res;
    const pe = await parse_entities(model, [parsed_res]);
    if(pe &&  pe.length){
        return pe[0];
    }
    return parsed_res
}




export const update_arr_from_meta = (entity:OBJECT_TYPE<any>) => {
    let meta = entity["__meta"];

    if(!meta) return;
    try {
        meta = JSON.parse(meta);
    } catch (error) {
        console.warn("invalid meta property found (parsing issue) :", meta);
        return;
    }
    for(let [k,v] of Object.entries(entity)){
        if(v === undefined || !Array.isArray(v)) continue;
        if(!meta[k] ||  !Array.isArray(meta[k])) continue;
        entity[k] = meta[k];
    }
}

export const update_meta_for_entity = (model:model_type, prev_meta: any, add: OBJECT_TYPE<any>, remove: OBJECT_TYPE<any>, errors: string[]): DEFAULT_RES_SINGLE<any> => {
    //for arrays, stringify actual value and keep it in meta;

    if(prev_meta){
        try {
            prev_meta = JSON.parse(prev_meta)
        } catch (error) {
            const m = "invalid meta value present"
            console.warn(m);
            errors.push(m);
            return {success: false, errors, code: 500}
        }
    }
    else{
        prev_meta = {}
    }

    for(let [k,vals] of Object.entries(remove)){
        if(!Array.isArray(vals)) continue;
        const prop = model.props.find(p => p.name === k);
        if(!prop) continue;
        if(!prop.is_many || prop.is_relation ) continue;

        const m = prev_meta[k];
        if(!m) continue;
        if(!Array.isArray(m)){
            console.warn("invalid data found for property : "+ k + " in meta");
            delete prev_meta[k];
            continue;
        } 

        for(let v of vals){
            const f = m.findIndex(p => JSON.stringify(p) === JSON.stringify(v));
            if(f > -1){
                m.splice(f, 1);
            }
        }

        prev_meta[k] = m;


    }

    for(let [k,vals] of Object.entries(add)){
        if(!Array.isArray(vals)) continue;
        const prop = model.props.find(p => p.name === k);
        if(!prop) continue;
        if(!prop.is_many || prop.is_relation) continue;

        let m : any = prev_meta[k];
        if(!m) m = [];
        if(Array.isArray(m)){
            console.warn("invalid data found for property : "+ k + " in meta");
            delete prev_meta[k];
            m = []
        } 

        for(let v of vals){
            const f = m.find((p:any) => JSON.stringify(p) === JSON.stringify(v));
            if(!f){
                m.push(v);
            }
        }

        prev_meta[k] = m;

    }


    return {success: true, data: JSON.stringify(prev_meta), code: 200}



}

export const get_prev_meta_for_entity = ( model_id: string,  e_id: any): DEFAULT_RES_SINGLE<any> => {

    const q = '[*]';
    const r =  pull_DS( q, e_id);
    if(!r.success){
        return r;
    }
    const meta_key: string = model_id + ":__meta";
    return {success: true, data: r.data[meta_key], code: 200};
}

export const get_entity_from_entity_id_if_relation = async (app_json: app_object_type, model: model_type, data: any) => {
    for (let key of Object.keys(data)) {
        if (!data[key]) continue;
        const pr = model.props.find(p => p.name === key);
        if (!pr) continue;
        if (!pr.is_relation) continue;
        const rel_model = pr.type;
        if (Array.isArray(data[key])) {
            let res = [];
            for (let e_id of data[key]) {
                const pull_q = '[*]'
                let r =  pull_DS(pull_q, e_id);
                if(!r.success) continue;
                let d = r.data;
                d = await parse_pull_result(app_json, d, rel_model)
                res.push(d);
            }
            data[key] = res;
        }
        else {
            const e_id = data[key];
            const pull_q = '[*]'
            let r =  pull_DS( pull_q, e_id);
            if(!r) {
                console.warn("property is missing");
                continue;
            };
            if(!r.success) continue;
            let d = r.data;
            d = await parse_pull_result(app_json, d, rel_model)
            data[key] = d


            
        }
    }
}

export const map_data = ( map: OBJECT_TYPE<any>, entities: OBJECT_TYPE<any>[]) => {
    const r = entities.map(e => {
        let a:OBJECT_TYPE<any> = {}
        for(let [key, val] of Object.entries(map)){
            if(e[val]){
                a[key] = e[val]
            }
        }
        return a;
    });

    return r;
}

export const query_for_props = async( app_json: app_object_type, model: model_type, schema: any,  query: query_obj_type, entities: OBJECT_TYPE<any>[], errors: string[]): DEFAULT_RES_SINGLE_P<any> => {
    for(let entity of entities){
        for(let key of Object.keys(query)){
            if(key.startsWith("__")) continue;
            if(!entity[key]) continue;
            const prop      =   model.props.find(p => p.name === key);
            if(!prop)  continue;
            let a = query[key];
            const __meta    =   query[key].__meta;
            const __map     =   query[key].__map;
            const __find    =   query[key].__find;
            if(prop.is_relation){

                const rel_model_id = prop.type;
                const rel_model = app_json.models.find(m => m.id === rel_model_id);
                if(!rel_model) continue;
                //expected entity ids here
                const filters       =   __meta?.filters || [];
                const query         =   generate_ds_query(app_json, rel_model, filters || [], undefined, {e: entity[key]} );
                const tuples        =   query_DS( query, errors, entity[key]);
                if(!tuples.success) continue;
                let prop_entities    =   tuples_to_obj(tuples.data ,schema);
                // apply js filters
                prop_entities             =   await parse_entities(rel_model, prop_entities);
                prop_entities             =   apply_js_filters(prop_entities, filters );
                if(__meta?.sort)     prop_entities  =   sort_data(prop_entities, __meta.sort);
                if(__meta?.limit)    prop_entities  =   limit_data(prop_entities, __meta.limit);

                if(__find){
                    let ids = __find.map(o => o.id);
                    if(ids.length){
                        const q = generate_ds_query(app_json, model, [{attr: "id", op: "eq", val: ids}], undefined);
                        const tuples        =    query_DS( q, errors );
                        if(tuples.success){
                            let obj    =   tuples_to_obj(tuples.data ,schema);
                            entities.push(...obj);
                        }
                    }
                }
                
                await query_for_props( app_json, rel_model, schema, a, prop_entities, errors);
                if(__map){
                    prop_entities = map_data(__map, prop_entities);
                }

                if(!prop.is_many){
                    if(prop_entities && prop_entities.length) entity[key] = prop_entities[0];
                }
                else{
                    const total_count = entity[key].length;
                    entity[key] = prop_entities;
                    if(!entity["__meta"]) entity["__meta"] = {[key] : {}};
                    entity["__meta"][key]["total_count"] = total_count
                }
            }
            else if(prop.is_json && prop.is_many){
                if(!Array.isArray(entity[key])) continue;
                let prop_entities   =   entity[key];
                const total_count   =  prop_entities.length
                if(__meta?.filters)  prop_entities   =  js_add_fns.filter(prop_entities, __meta.filters);
                if(__meta?.sort)     prop_entities   =  js_add_fns.sort(prop_entities, __meta.sort);
                if(__meta?.limit)    prop_entities   =  limit_data(prop_entities, __meta.limit);
                if(__map)   prop_entities = map_data(__map, prop_entities);
                
                entity[key] = prop_entities;      
                if(!entity["__meta"]) entity["__meta"] = {[key] : {}}; 
                entity["__meta"][key]["total_count"] = total_count

            }
            else if(prop.is_many){
                if(!Array.isArray(entity[key])) continue;
                const total_count   =  entity[key].length;

                const limit = __meta?.limit;
                if(limit !== undefined) entity[key] = entity[key].slice(0, limit);
                if(!entity["__meta"]) entity["__meta"] = {[key] : {}}; 
                entity["__meta"][key]["total_count"] = total_count
                
            }
        }
    }

    return {success: true, data: entities, code: 200};
}

export const generate_aggregate_ds_query = (app_id: string, model_id: string, aggregate: any) => {
    const group_by: { [key: string]: any } = aggregate.group_by;
    const aggregate_fns = ["count", "max", "min", "sum", "avg"];
    if (group_by) {
        const keys = [];
        const req_vals = [];
        const tuples = []
        let _id: any = "id";
        for (let [k, v] of Object.entries(group_by)) {
            if (k === "_id") {

                _id = v;
                keys.push(k);
                req_vals.push(`?v`);
                tuples.push(`[?e  "${model_id}:${_id}" ?v]`)
                continue;
            }
            for (let [f, attr] of Object.entries(v)) {
                if (aggregate_fns.includes(f)) {

                    keys.push(k);
                    tuples.push(`[?e  "${model_id}:${attr}" ?${attr}]`)
                    req_vals.push(`(${f} ?${attr})`);
                }
            }
        }

        const query = `[:find ${req_vals.join(" ")} :keys ${keys.join(" ")}   :where [?e ?a ?v] ${tuples.join(" ")}]`
        return query;
    }
}

export default {};