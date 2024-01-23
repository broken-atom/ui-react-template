import { useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
	Routes,
	Route,
	Link,
	useNavigate,
} from "react-router-dom";

import { 
    motion, 
    AnimatePresence 
} from "framer-motion";

import { Subscription } from "rxjs";
import {observer} from "mobx-react-lite"

// EVERY IMPORT HAS TO BE ../module/file-name
import FallbackRender from "../utility/ErrorBoundaryFallback";
import { expose_state } from "../utility/expose-state"; 
import { subscribe_selected_one } from "../utility/selected-one";


import g_fn from '../g_fn';
const AS = g_fn.AS;



// INJECT IMPORTS HERE
// b@imports





// REPLACE INFO HERE - NEXT LINE after b@
// b@info
const INFO:any = { "model_id": "", "model_name": "", "op": "create_one", "comp_id": "comp_creaid", query: {}};




const EN_BROKEN_COMP_LOGS = window.EN_BROKEN_COMP_LOGS || {};




// local code - e.g sub components
// b@locals

const BROKEN_JSX = () => <div className="flex items-center justify-center text-gray-500 font-semibold bg-gray-100">DEFAULT CREATE_ONE </div>






// b@comp-name
const COMP_NAME = (props: any) => {

	


	// FOR IS_MANY
	let idx = props.idx;   // also for protection from error when we might think is many but it's not
	let V = props.V || {}; // for protection from error



	// STATES
	const [M, set_M] 					= useState(props.M || {})
	const [PM, set_PM] 					= useState(props.PM || []); // parent model
	const [selected_M, set_selected_M] 	= useState(null);
	const [errors,				set_errors			]	= useState([]);
	const [warnings,			set_warnings		]	= useState([]);


    // USER DEFINED STATES
    // b@states

	


    // REFS
    // USER DEFINED REFS
    // b@refs





	// QUERY
	// b@query
	const query = {op: "eq", prop_name: "id", prop_value: "{[user].id}"};


	// RELATION
	// b@relation
	let relation:{model_id: string, comp_id: string, prop_name: string}|null = null;






	// EFFECTS FOR CREATE_ONE
	useEffect(()=>{
		const deinit = init();

		return () => {
			if(deinit && typeof(deinit) === "function") deinit();
		}
	},[]);
	

	// FROM PARENT
	// @todo: what's this for?
	useEffect(()=>{
		if(!relation) return;
		if(props.PM && Array.isArray(props.PM) && props.PM[0]) {
			const parent_M = props.PM[0];
			const parent_M_copy = JSON.parse(JSON.stringify(parent_M));
			delete parent_M_copy[':db/id'];
			set_M(parent_M_copy);
		}
	},[props]);


	// effect for draft handling where subscription to a message event happens in case of relation
	// @todo : this application of draft should be based on events user can customise from the front end.
		// a relation model can have its own create form without the need of immediately assigning it to some parent model
		// hence, whether to connect the form to some other model or not is up to the user using the front end while making the UI.
		// For now, we are generating based on layout, so by default we are assuming the parent model and assigning id to the prop.
		// @todo : user should be able to choose whether to connect to relation model at all, from the front end.
	// 
	useEffect(()=>{
		if(!M) return;
		if(!INFO.model_id || !INFO.comp_id) return;
		const model_id = INFO.model_id;
		const comp_id = INFO.comp_id;

		const idx = props.idx || props.IDX;

		const subscribe_id = (idx !== undefined ? M.id : null);

		const model = g_fn.get_model(model_id);
		if(!model) return;
		console.log('M : ', model_id, comp_id, M);
		const id_prop = model.props.find(p=>p.name === 'id');

		// @todo: user is a special case. We should handle it separately.
		if(model.name.toLowerCase() === 'user' && id_prop && id_prop.type === 'user_id') {
			if(M.email) {
				(async () => {
					const user_id = await g_fn.generate_user_id_by_email(M);
					// loop breaker for user_id in the following line, to be fixed properly
					if(user_id === M.id) return;
					if(user_id) {
						// not storing id in draft, if the same component is mapped, id will also be same for different entities
						set_M(PM => {
							PM.id = user_id;

							const subscribe_id = (idx !== undefined ? user_id : null);

							console.log("SETTING REACT STATE : ", PM);
							AS.GSTORE.update_draft(model_id, comp_id, subscribe_id, PM);
							return PM;
						});
						// set_M(PM=>({...PM, id : user_id}));
						return;
					}
				})();
				return;
			}
		}
		console.log("UPDATING DRAFT : " , M, model_id, comp_id);
		AS.GSTORE.update_draft(model_id, comp_id, subscribe_id, M);
	},[M]);


	// This was also part of create-one-json.tsx
	// @todo: What to do about this ask @broken-vmss
	// useEffect(()=>{
	// 	console.log("M CHANGED TO: ", INFO.model_name, INFO.op, " data: ",  M);
	// 	g_fn.on_is_json_change(M, props);
	// }, [M])



	// SUBS TO SELECTED ONE
	useEffect(()=>{
		return subscribe_selected_one({}, M, INFO, props, set_selected_M);
	},[]);

	

	// LOGS
	useEffect(()=>{
		if(EN_BROKEN_COMP_LOGS.MODEL_EFFECT){
			const MI = INFO.model_name.toUpperCase() + " : " + INFO.op.toUpperCase();
			console.log("MODEL CHANGED : " + MI + "   => ", "model", M, " props", props);
		}
	}, [M]);






	

    // USER DEFINED EFFECTS
    // b@effects



	// FUNCTIONS
	// @todo: This is part of CREATE_ONE not CREATE-ONE, verify this
	const init = () => {

		if(!INFO.model_id || !INFO.comp_id) return;

		const model_id = INFO.model_id;
		const comp_id = INFO.comp_id;

		const subs:Subscription[] = [];

		const id = g_fn.get_ulid();

		const idx = props.idx || props.IDX; // @@todo: decide capital or small

		const subscribe_id = (idx !== undefined ? id : null);

		subs.push(AS.GSTORE.subscribe_draft(model_id, comp_id, subscribe_id, (e)=>{

			console.log("SUBSCRIBE DRAFT : ", e, comp_id);

			if(e.data) {
				console.log("DRAFT DATA : ", e.data);
				const D = e.data;
				if(JSON.stringify(D) === JSON.stringify(M)) return console.warn("RECEIVED SAME OBJECT FROM DRAFT");
				set_M(M => {
					if((e.eid || D.id) !== M.id) {
						console.log("NOT SETTING DATA FROM A DIFFERENT FORM : ", D, M);
						return M; // ids are not equal which means data from a different form
					}
					if(D === M) return M; // same object
					console.log("SETTING M INSIDE STATE : ", D);
					return D;
				});
			}
		}));


		subs.push(AS.GSTORE.subscribe_message(model_id, (e) => {

			if(e.eid && e.message !== "CREATED") return;

			set_M(M => {
				return {id : g_fn.get_ulid()};
			});

			if(!relation) return;

			// if relation exists, update the parent model draft

			const rel_eid = props.id || null;
			console.log("RELATION ENTITY ID : ", rel_eid);

			console.log("RELATION : ", relation);
			const rel_mid = relation.model_id;
			const rel_cid = relation.comp_id || props.INFO?.comp_id;
			const updates = {[relation.prop_name] : e.data};
			AS.GSTORE.update_draft(rel_mid, rel_cid, subscribe_id, updates);
		}));

		
		// one time setup
		set_M(PM => {
			// @todo: if it is null ?
			const model = g_fn.get_model(model_id);
			let draft = AS.GSTORE.get_draft(model_id, comp_id, subscribe_id);
			if(!draft) {
				draft = {};
			}

			// drafts id can be same if the same component is mapped, so initialising new id every time
			if(PM) return {...PM, ...draft, id};

			return draft;
		});

		return () => {
			subs.forEach(s=>s.unsubscribe());
		}
	}

    // USER DEFINED FUNCTIONS
    // b@functions



	// STATEMENTS
	INFO.set_M          = set_M;
	INFO.on_created     = props.on_created || props.INFO?.on_created;
	INFO.on_selected    = props.on_selected || props.INFO?.on_selected;

    // USER DEFINED STATEMENTS
    // b@statements




	// CONDITIONALS ATTRS
	const COND_ATTRS = {};
	//b@cond-attrs







	// DYNAMIC REACT STATES
	const REACT_STATES: {[name: string]: {state: any, set_state: any, defaultValue?: any}} = {};
    // b@dynamic-states
    // we are also using REACT_STATES to generate some dynamic state from html <state> tag, or from state attr

	expose_state(REACT_STATES, AS, INFO, "M", M, set_M);
    // exposing this will help us in getting this data for debuging purpose



	// MAPPED DATA
	// b@mapped-data


	return (
		<ErrorBoundary fallbackRender={FallbackRender} onReset={(d) => { console.error(d) }}>
            <BROKEN_JSX />
		</ErrorBoundary>
	)
}

export default observer(COMP_NAME);