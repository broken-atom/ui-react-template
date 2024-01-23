import g_fn from "../g_fn";

export const subscribe_selected_one = (e:any, M:any, INFO:any, props: any, set_selected_M: (m)=>void) => {
    if(!INFO.model_id) return;

    // if(query) INFO.query = query; // fall back to query if there is no selected entity for the model id;
    // @what's this for

    const AS = g_fn.AS;


    const id = g_fn.get_selected_entity_id(props, INFO);
    if(!id) {
        return console.warn("NO ID FOUND TO UPDATE ENTITY");
    }

    (async () => {
        const r = await AS.GSTORE.get_one_entity(INFO.model_id, id);
        console.log("GSTORE GET ONE ENTITY : ", r);
        if(r) set_selected_M(r);
    })();

    const sub = AS.GSTORE.subscribe_selected_entities(INFO.model_id, (e) => {
        const id = g_fn.get_selected_entity_id(props, INFO);
        if(!id) return console.warn("NO ID FOUND TO UPDATE ENTITY IN SUBSCRIPTION");
        (async () => {
            const r = await AS.GSTORE.get_one_entity(INFO.model_id, id);
            console.log("GSTORE GET ONE ENTITY IN SUBSCRIPTION : ", r, INFO.model_id, INFO.comp_id);
            if(r) set_selected_M(r);
        })();
    });

    return () => {
        sub.unsubscribe();
    }
}