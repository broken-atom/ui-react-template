import { z } from "zod";
import { model_prop_type, model_type, DEFAULT_RES_SINGLE, zod_image_file } from "../../types";

export const zod_string_types = ["text", "date", "time", "password", "color", "description", "url"];
export const zod_number_types = ["number", "datetime"];


export const zod_type_from_prop = (p: model_prop_type) => {

    let type = p.type;
    let z_type = null;

    if (p.is_relation === true){
        if(p.relation_type) {
            type = p.relation_type;
        }
        else{
            type = 'text';
        }
    }


    if(p.is_json){
        z_type  = z.record(z.any());
    }
    else if(["string", "text", "date", "time", "description", "color", "password", "user_id"].includes(type)){
        z_type = z.string()
    }
    else if(type === "url"){
        z_type = z.string().url();
    }
    else if(["image", "img", "file"].includes(type)){
        z_type = zod_image_file; // @todo: { url: z.string().url(), name: z.string(), size: z. number() }
    }
    else if(["number", "integer", "datetime"].includes(type)){
        z_type = z.number();
    }
    else if(type === "email"){
        z_type =  z.string().email()
    }
    else if(type === "serial"){
        z_type =  z.string().length(26)
    }
    else if(type === "boolean"){
        z_type = z.boolean()
    }
    else if(["any_one_of", "many_of"].includes(type)){

        let prop = p;
        let options = prop.options;
        // let _z_type : any = z.literal("");
        if(!options || !options.length){
            z_type = z.literal("");
        }else {
            if(options.length > 1){
                let lit = []
                for(let op of options){
                    lit.push(z.literal(op));
                }
                //z.union requires atleast 2 items 
                let lit_1 = lit.shift();
                let lit_2 = lit.shift();

                if(lit_1 && lit_2){
                    z_type = z.union([lit_1, lit_2, ...lit]);
                }else{
                    z_type = z.literal("");
                }
            }
            else{
                z_type = z.literal(options[0]);
            }

            if(type === "many_of"){
                z_type = z_type.array();
            }
        }
    }
    else{
        z_type  = z.record(z.any());
    }

    if(p.is_relation && z_type){
        const curr_z    =   z_type;
        const obj_type  =   z.record(z.any());
        z_type = z.union([curr_z, obj_type]);
    }

    if (p.is_many === true ) {
        if(!p.is_relation){
            z_type = z.object({id: z.string(), v: z_type});
        }
        z_type = z_type.array();
    }
    

   
    if(p.is_required === false){
        z_type  = z.union([z_type, z.null()]).optional()
    }


    return z_type
}

export const create_zod_validator = (model: model_type, strict?: boolean) => {
    let obj: any = {};
    for (let p of model.props) {
        obj[p.name] = zod_type_from_prop(p);
    }
    if (strict === false) {
        return z.object(obj);
    }

    return z.object(obj).strict();
}

export const validate_data_with_model = (model: model_type, data: any, errors: string[], is_many: boolean, strict?: boolean): DEFAULT_RES_SINGLE<any> => {
    let z_validator = create_zod_validator(model, strict);
    if (is_many) {
        let r = z_validator.array().safeParse(data);
        if (!r.success) {
            console.warn("error while validating data: ", String(r.error));
            errors.push("error while validating data: " + String(r.error))
            return { success: false, errors, code: 1091 }
        }
        return { success: true, data: r.data, code: 200 }
    }
    else {
        let r = z_validator.safeParse(data);
        if (!r.success) {
            console.warn("error while validating data: ", String(r.error));
            errors.push("error while validating data: " + String(r.error))
            return { success: false, errors, code: 1091 }
        }
        return { success: true, data: r.data, code: 200 }
    }
}

