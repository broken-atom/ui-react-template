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

import {observer} from "mobx-react-lite"

import FallbackRender from "../utility/ErrorBoundaryFallback";
import { expose_state } from "../utility/expose-state"; 


import g_fn from '../g_fn';
const AS = g_fn.AS;



// INJECT IMPORTS HERE
// b@imports





// REPLACE INFO HERE - NEXT LINE after b@
// b@info
const INFO:any = { "model_id": "", "model_name": "", "op": "get_one", "comp_id": "comp_bkuni6", query: {}};




const EN_BROKEN_COMP_LOGS = window.EN_BROKEN_COMP_LOGS || {};




// local code - e.g sub components
// b@locals


const BROKEN_JSX = () => <div className="h-screen w-screen flex items-center justify-center text-gray-500 font-semibold bg-gray-100">DEFAULT MAIN JSX</div>






// b@comp-name
const COMP_NAME = (props: any) => {


	// for main component only
	const navigate = useNavigate();
	AS.navigate = navigate;

	


	// FOR IS_MANY
	let idx = props.idx;   // also for protection from error when we might think is many but it's not
	let V = props.V || {}; // for protection from error


	// QUERY
	// b@query
	const query = {op: "eq", prop_name: "id", prop_value: "{[user].id}"};


	// RELATION
	// b@relation
	const relation = null;




	// STATES
	const [M, set_M] = useState(props.M || {})
	const [PM, set_PM] = useState(props.PM || []); // parent model
	const [selected_M, set_selected_M] = useState(null);
	const [errors,				set_errors			]	= useState([]);
	const [warnings,			set_warnings		]	= useState([]);


    // USER DEFINED STATES
    // b@states

	


    // REFS
    // USER DEFINED REFS
    // b@refs





	// EFFECTS FOR GET_ONE
	useEffect(()=>{
		const deinit =  init();

		return () => {
			if(deinit && typeof(deinit) === "function") deinit();
		}
	}, []);

	// FROM PARENT
	useEffect(()=>{
		g_fn.bro_get_one(INFO, set_M, props);
	}, [props]);



	// SET SELECTED M;
	useEffect(()=>{
		if(!INFO.model_id) return;

		if(query) INFO.query = query; // fall back to query if there is no selected entity for the model id;
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
	const init = ()=>{

		if(!INFO.model_id) return;


		INFO.query = query; // @todo : make it possible to change in UI editor
		const id = g_fn.get_one_find_id(props, INFO);
		if(!id) {
			// errors => [{code:string, msg:string}]
			// warning => []
			console.warn("NO ID FOUND FOR GET_ONE : ", INFO);
			// return;
		}

		// subscription
		const sub = AS.GSTORE.subscribe_one(INFO.model_id, id, (e)=>{
			console.log("USER RE-RENDERED");
			const data = e.data;
			set_M(data);
		});


		// first time
		AS.GSTORE.get_one_entity(INFO.model_id, id, INFO.query);



		return ()=>{
			sub.unsubscribe();
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