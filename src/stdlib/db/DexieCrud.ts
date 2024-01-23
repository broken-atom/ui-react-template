import Dexie, { Table, IndexableType } from "dexie";

export const get_db_version = (db: Dexie) => {
    return db.verno;
}

export const get_db_tables = (db: Dexie): Table<any, IndexableType>[] => {
    return db.tables;
}

export const add_data = async (db: Dexie, table: string, props: any) => {
    try {
        const res = await db.table(table).add(props);
        return {
            success: true,
            data: {
                id: res
            }
        };
    }
    catch(e) {
        return {
            success: false,
            errors: e
        }
    }
}

// add is insert, put is upsert
export const put_data = async (db: Dexie, table: string, props: any) => {
    try {
        const res = await db.table(table).put(props);
        return {
            success: true,
            data: {
                id: res
            }
        };
    }
    catch(e) {
        return {
            success: false,
            errors: e
        }
    }
}

export const get_data = async (db: Dexie, table: string, props: any) => { // This is filter, not with pk
    // https://dexie.org/docs/Table/Table.get()
    try {
        const res = await db.table(table).get(props);
        if(res === undefined){
            const m = "no value found for props : "+ JSON.stringify(props);
            console.warn(m);
        }
        return res;
    }
    catch(e) {
        console.warn(`Error: ${e}`);
        return (`Error: ${e}`)
    }
}

export const delete_data = async (db: Dexie, table: string, pk: string) => {
    // https://dexie.org/docs/Table/Table.delete()
    try {
        const res = await db.table(table).delete(pk);
        return res;
    }
    catch(e) {
        return (`Error: ${e}`)
    }
}

export default {};