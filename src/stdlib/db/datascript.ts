import { DEFAULT_RES_SINGLE, model_type, OBJECT_TYPE, tx_meta } from "../types";
// @ts-ignore
import * as datascript from "datascript";


// @ts-ignore
let DS: any = datascript;
let conn: any = null;
let db: any = null;

if (window.broken && window.broken.offline) db = window.broken.offline.ds.db;


export const create_schema = (models: model_type[]) => {
	const schema: OBJECT_TYPE<any> = {};
	for (let model of models) {
		const model_id = model.id;
		for (let p of model.props) {
			if (p.is_many === true || p.type === "many_of") {
				schema[`${model_id}:${p.name}`] = {}
				schema[`${model_id}:${p.name}`][":db/cardinality"] = ":db.cardinality/many"
			}
			if (p.is_unique === true) {
				if (!schema[`${model_id}:${p.name}`]) {
					schema[`${model_id}:${p.name}`] = {}
				}
				schema[`${model_id}:${p.name}`][":db/unique"] = ":db.unique/value"
			}
			if (p.is_relation === true) {
				if (!schema[`${model_id}:${p.name}`]) {
					schema[`${model_id}:${p.name}`] = {}
				}
				schema[`${model_id}:${p.name}`][":db/valueType"] = ":db.type/ref"
			}
		}
		schema[`${model_id}:${model.primarykey}`] = {}
		schema[`${model_id}:${model.primarykey}`][":db/unique"] = ":db.unique/identity"
	}
	return schema;
}

const init_db = (models: model_type[], app_id: string) => {
	if (!DS) return;

	console.log('init db');

	const schema: OBJECT_TYPE<any> = create_schema(models);

	// db = DS.empty_db(schema);
	// conn = DS.conn_from_db(db);

	// if (!window.broken.offline) return;
	// window.broken.offline.ds.db = db;
	// return db;

	let stored_datoms: any = [];
	const datoms_s = window.localStorage.getItem(`${app_id}_app_data_datoms`);
	if (datoms_s) {
		try {
			stored_datoms = JSON.parse(datoms_s);
		} catch (error) {
			console.error(`error: while parsing stored datom of ${app_id}: `, error);
		}
	}
	db = DS.init_db(stored_datoms, schema);
	conn = DS.conn_from_db(db);

	if (!window.broken.offline) return;
	window.broken.offline.ds.db = db;
	return db;
};

export const init_DS = (models: model_type[], app_id: string) => {
	if (!DS) {
		// @ts-ignore
		DS = datascript;

		if (!window.broken.offline) return;
		window.broken.offline.ds.datascript = DS;
	}
	else {
		if (!window.broken.offline) return;
		window.broken.offline.ds.datascript = DS;
	}

	init_db(models, app_id);
};

export const transact_DS = (tx: any[], meta: tx_meta, errors: string[]): DEFAULT_RES_SINGLE<any> => {

	if (!DS || !db || !conn) {
		return {success: false, errors: ['one of db or conn not found'], code: 1000}
	}

	try {
		const tx_report = DS.transact(
			conn,
			tx,
			meta || {
				origin: '',
				operation: ''
			}
		);
	
		if (tx_report) {
			db = tx_report.db_after;
			const tx_data = tx_report.tx_data;
			const tempids = tx_report.tempids;
			if (window.broken.offline) {
				window.broken.offline.ds.db = db;
			};
			if (window.broken.app_id) {
				save_to_localstorage(window.broken.app_id);
			}
	
			return {success: true, data : {db_new: db, tx_data, tempids}, code: 200}
		}
		else{
			return {success: true, data: {}, code: 200}
		}
		
	} catch (error) {
		const m = "error while transaction : "+ error
		console.warn(m);
		errors.push(m)
		return {
			success: false,
			code: 1042,
			errors
		}
	}
};

export const save_to_localstorage = (app_id: string) => {
	if (!DS || !conn || !db) return;

	const datoms = DS.datoms(db, ':eavt');
	console.log('saving datoms process initiated with length: ', datoms.length);

	const datom_str = JSON.stringify(datoms);
	localStorage.setItem(`${app_id}_app_data_datoms`, datom_str);
};













export const get_DS_conn = () => {
	if (!DS) return;
	if (conn) return conn;

	// const db = global_state_use.getState().db;
	if (!db) return console.log('no db created yet in global state');

	conn = DS.conn_from_db(db);
	return conn;
};

export const query_DS = (q: string, errors: string[], add_inputs?: any): DEFAULT_RES_SINGLE<any>  => {
	if (!DS || !db ) {
		const m = "datascript initialisation issue : " + ( DS? "db not found":"DS not found")
		console.warn(m);
		errors.push(m);
		return ({
			success: false,
			code: 1048,
			errors
		})
	} 

	try {
		if(add_inputs){
			const res = DS.q(q, db, add_inputs);
			return {success: true,code: 200,data: res}
		}
		else{
			const res = DS.q(q, db);
			return {success: true,code: 200,data: res}
		}
	} catch (error: any) {
		const m = "error while querying  : " +  error;
		console.warn(m);
		errors.push(m);
		return {
			success: false,
			code: 1041,
			errors
		}
	}
};

export const pull_DS = (q: string, id: any): DEFAULT_RES_SINGLE<any>  => {
	
	if (!DS || !db ) {
		const m = "datascript initialisation issue : " + ( DS? "db not found":"DS not found")
		console.warn(m);
		return ({
			success: false,
			code: 1048,
			errors: [m]
		})
	};

	try {
		const res = DS.pull(db, q, id);
		return {
			success: true,
			code: 200,
			data: res
		}
	} catch (error: any) {
		return {
			success: false,
			code: 1043,
			errors: [error.message]
		}
	}
};

export const pull_with_unique_id_DS = (q: string, id: any): DEFAULT_RES_SINGLE<any>  => {
	if (!DS || !db ) {
		const m = "datascript initialisation issue : " + ( DS? "db not found":"DS not found")
		console.warn(m);
		return ({
			success: false,
			code: 1048,
			errors: [m]
		})
	};;

	try {
		const res = DS.pull(db, q, id);
		if (!res) {
			const m = "invalid pull response";
			return {
				success: false,
				code: 1043,
				errors: [m]
			};
		}
		if (Object.keys(res).length < 2) {
			const m = `ref id ${id} for pull doesn't exist in db`;
			return {
				success: false,
				code: 1043,
				errors: [m]
			};
		}
		return {
			success: true,
			code: 200,
			data: res
		}
	} catch (error: any) {
		return {
			success: false,
			code: 1043,
			errors: [error.message]
		}
	}
};

export const rule_DS = (q: string, r: string) => {
	if (!DS || !db || !conn) return;

	return DS.q(q, db, r);
};

export const query_DS_get_eav = (q: string) => {
	if (!DS || !db || !conn) return;


	// const q = '[:find ?e ?a ?v :in $ :where [?e ?a ?v] [?e "cat" "attr"]]';
	const r = DS.q(q, db);

	const ets = prepare_entities(r);
	return ets;
};

export const prepare_entities = (r: any): Array<any> => {
	const els: { [key: number]: any } = {};
	if (Array.isArray(r)) {
		for (const da of r) {
			let d = els[da[0]];
			if (!d) {
				d = { _id: da[0] };
			}
			d[da[1]] = da[2]; // k:v
			els[da[0]] = d;

		}
	}
	return Object.values(els);
};

export const DS_unzip_one = (arr: any, n: number): string[] => {
	if (arr && Array.isArray(arr) && arr.length) {
		return arr.map(a => {
			if (a && Array.isArray(a) && a.length) {
				return a[0];
			}
		});
	}
	return [];
};

export const clear_entities = () => {
	if (!DS || !db || !conn) return;

	const q = '[:find ?e :where [?e ?a ?v]]';
	const r = DS.q(q, db);

	if (!r || !Array.isArray(r) || !r.length) return console.log('no entities found to clear');

	const entity_ids = Array.from(new Set(r.map(e => e[0])));

	const tx = entity_ids.map(e => {
		return [':db/retractEntity', e];
	});

	transact_DS(tx, {
		origin: 'clear_entities',
		operation: 'retractEntity'
	}, []);
}