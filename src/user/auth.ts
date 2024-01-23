import { GC } from "../global_state";
const authz = {
    get_user_role: function(user){
        if (!user) return {
            success: false,
            errors: ["user should login to create data"]
        }
        const roles = GC.APP_JSON.roles;
        if(!roles) return {
            success: false,
            errors: ["App should have atleast one role"]
        }
        if( user.role === "creator") {
            return {
                success:true,
                role:user.role
            }
        }
        const user_role = roles.find((r) => r === user.role);
        if (!user_role) return {
            success:false,
            errors: ["user role is not there in the app roles"]
        };
        return {
            success:true,
            role:user_role
        };
    },
    create: function (model_id, data, user) {
        let r = this.get_user_role(user);
        let user_role;
        if(!r.success) {
            return {
                allowed:false,
                // @ts-ignore
                reason:r.errors[0]
            }
        }
        else {
            if( r.role === "creator") {
                return {
                    allowed:true,
                    role:"creator"
                }
            } else {
                user_role = r.role;
            }
        }        
        const app_level_auth = GC.APP_JSON.authz.app.role[user_role];
        const app_level_create = app_level_auth.find((r) => r === "create");
        const model_level_auth = GC.APP_JSON.authz.models[model_id]?.role[user_role];
        const model_level_create = model_level_auth ? model_level_auth.find((r) => r === "create") : false;

        let permission = false;
        if (app_level_create || model_level_create) permission = true;
        if(!permission){
            return {
                allowed: permission, //false
                reason: `user with ${user_role} role not allowed to create data`
            }
        }
        else{
            return {
                allowed: true,
                role: user_role
            }
        }
    },
    get: function (model_id, user) {
        let r = this.get_user_role(user);
        let user_role;
        if(!r.success) {
            return {
                allowed:false,
                // @ts-ignore
                reason:r.errors[0]
            }
        }
        else {
            if( r.role === "creator") {
                return {
                    allowed:true,
                    role:"creator"
                }
            } else {
                user_role = r.role;
            }
        }    

        const app_level_auth = GC.APP_JSON.authz.app.role[user_role];
        const app_level_read = app_level_auth.find((r) => r === "read")
        const model_level_auth = GC.APP_JSON.authz.models[model_id]?.role[user_role];
        const model_level_read = model_level_auth ? model_level_auth.find((r) => r === "read") : false;

        let permission = false;
        if (app_level_read || model_level_read) permission = true;
        if(!permission) {
            return {
                allowed: permission, //true / false
                reason: `user with ${user_role} role not allowed to read data`
            }
        } 
        else{
            return {
                allowed: true,
                role: user_role
            }
        }
    },
    update: function (model_id, data, user) {
        let r = this.get_user_role(user);
        let user_role;
        if(!r.success) {
            return {
                allowed:false,
                // @ts-ignore
                reason:r.errors[0]
            }
        }
        else {
            if( r.role === "creator") {
                return {
                    allowed:true,
                    role:"creator"
                }
            } else {
                user_role = r.role;
            }
        }    
        const app_level_auth = GC.APP_JSON.authz.app.role[user_role];
        const app_level_update = app_level_auth.find((r) => r === "update")
        const model_level_auth = GC.APP_JSON.authz.models[model_id]?.role[user_role];
        const model_level_update = model_level_auth ? model_level_auth.find((r) => r === "update") : false;

        let permission = false;
        if (app_level_update || model_level_update) permission = true;
        if(!permission) {
            return {
                allowed: permission, //true / false
                reason: `user with ${user_role} role not allowed to update data`
            }
        } 
        else{
            return {
                allowed: true,
                role: user_role
            }
        }
    },
    delete: function (model_id, user) {
        let r = this.get_user_role(user);
        let user_role;
        if(!r.success) {
            return {
                allowed:false,
                // @ts-ignore
                reason:r.errors[0]
            }
        }
        else {
            if( r.role === "creator") {
                return {
                    allowed:true,
                    role:"creator"
                }
            } else {
                user_role = r.role;
            }
        }    

        const app_level_auth = GC.APP_JSON.authz.app.role[user_role];
        const app_level_delete = app_level_auth.find((r) => r === "delete");
        const model_level_auth = GC.APP_JSON.authz.models[model_id]?.role[user_role];
        const model_level_delete = model_level_auth ? model_level_auth.find((r) => r === "delete") : false;

        let permission = false;
        if (app_level_delete || model_level_delete) permission = true;
        if(!permission) {
            return {
                allowed: permission, //true / false
                reason: `user with ${user_role} role not allowed to delete data`
            }
        } 
        else{
            return {
                allowed: true,
                role: user_role
            }
        }
    },
}
export default authz;