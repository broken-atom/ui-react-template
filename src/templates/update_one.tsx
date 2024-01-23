import React, { useEffect, useRef, useState } from "react";
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
const INFO:any = { model_id: "", model_name: "", op: "update_one", comp_id: "comp_updateid", query: {}};




const EN_BROKEN_COMP_LOGS = window.EN_BROKEN_COMP_LOGS || {};




// local code - e.g sub components
// b@locals

const BROKEN_JSX = () => <div className="flex items-center justify-center text-gray-500 font-semibold bg-gray-100">DEFAULT UPDATE_ONE </div>






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






	// EFFECTS FOR UPDATE_ONE
	useEffect(()=>{
		const deinit =  init();

		return () => {
			if(deinit && typeof(deinit) === "function") deinit();
		}
	}, []);

	// FROM PARENT
	useEffect(()=>{
		console.log("PROPS : ", props, INFO, relation);
	}, [props]);



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
	const init = () => {
		if(!INFO.model_id) return;

		if(query) INFO.query = query; // fall back to query if there is no selected entity for the model id;
		let id = g_fn.get_selected_entity_id(props, INFO);
		console.log("RELATION AND PROPS AND INFO : ", relation, props, INFO, g_fn.get_one_find_id(props, INFO));
		if(!id && !relation) {
			return console.warn("NO ID FOUND TO UPDATE ENTITY");
		}

		if(!id && relation) {
			const parent_M = (props.PM && Array.isArray(props.PM) && props.PM[0]) ? props.PM[0] : null;
			console.log("PM AND PARENT_M : ", props.PM, parent_M);
			if(parent_M) {
				const prop = parent_M[relation.prop_name];
				if(!prop) return console.warn("NO PROP FOUND FROM PARENT TO UPDATE ENTITY");
				if(typeof(prop) === "string") {
					id = prop;
				}
				else {
					id = prop.id;
				}
			}
		}

		(async () => {
			const r = await AS.GSTORE.get_one_entity(INFO.model_id, id);
			console.log("GSTORE GET ONE ENTITY : ", r);
			if(r) {
				const r_copy = JSON.parse(JSON.stringify(r));
				set_M(r_copy);
			}
		})();

		const subs: Subscription[] = [];

		subs.push(AS.GSTORE.subscribe_selected_entities(INFO.model_id, (e) => {
			const id = g_fn.get_selected_entity_id(props, INFO);
			if(!id) return console.warn("NO ID FOUND TO UPDATE ENTITY IN SUBSCRIPTION");
			(async () => {
				const r = await AS.GSTORE.get_one_entity(INFO.model_id, id);
				console.log("GSTORE GET ONE ENTITY IN SUBSCRIPTION -> UPDATE_ONE : ", INFO.model_id, r);
				if(r) {
					const r_copy = JSON.parse(JSON.stringify(r));
					set_M(r_copy);
				}
			})();
		}));

		return () => {
			subs.forEach(sub=>sub.unsubscribe());
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