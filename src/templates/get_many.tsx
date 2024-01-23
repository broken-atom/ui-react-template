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
import { FILTER_OBJECT } from "../types/query";
import { COLLECTION_EVENT_TYPE } from "../types/g-type";
const AS = g_fn.AS;



// INJECT IMPORTS HERE
// b@imports





// REPLACE INFO HERE - NEXT LINE after b@
// b@info
const INFO:any = { model_id: "", model_name: "", op: "get_many", comp_id: "comp_manyid", query: {}};




const EN_BROKEN_COMP_LOGS = window.EN_BROKEN_COMP_LOGS || {};




// local code - e.g sub components
// b@locals

const BROKEN_JSX = () => <div className="flex items-center justify-center text-gray-500 font-semibold bg-gray-100">DEFAULT GET_MANY </div>






// b@comp-name
const COMP_NAME = (props: any) => {

	


	// FOR IS_MANY
	let idx = props.idx;   // also for protection from error when we might think is many but it's not
	let V = props.V || {}; // for protection from error





	// STATES
	const [M, set_M]     				= useState(g_fn.array_or_null(props.M) || [])
	const [PM, set_PM] 					= useState(props.PM || []); // parent model
	const [selected_M, set_selected_M] 	= useState(null);
	const [errors,				set_errors			]	= useState([]);
	const [warnings,			set_warnings		]	= useState([]);
	const [filter_object,		set_filter_object	]	= useState({});



    // USER DEFINED STATES
    // b@states

	


    // REFS
    // USER DEFINED REFS
    // b@refs




	// QUERY
	// b@query
	const query = {op: "eq", prop_name: "id", prop_value: "{[user].id}"};


	// FILTERS - for get_many


	// RELATION
	// b@relation
	let relation:{model_id: string, comp_id: string, prop_name: string}|null = null;

	


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
	
		if(!INFO.model_id || !INFO.comp_id) return;

		const subs:any[] = [];

		const model_id = INFO.model_id;
		const comp_id = INFO.comp_id;


		// init FO in GSTORE
		// b@filters-object
		const FO:FILTER_OBJECT = {static_filters : {}, text_filters : [], filters : {}, sorts : [], limit : 16 };


		let fstore = AS.GSTORE.filters[model_id];
		if(!fstore){
			fstore = {};
			AS.GSTORE.filters[model_id] = fstore;
		}
		fstore[comp_id] = FO;
		set_filter_object(FO);



		subs.push(AS.GSTORE.subscribe_many(model_id, comp_id, (e)=>{
			console.warn("GET MANY SUBSCRIBE");
			const data = e.data;
			set_M(data);
		}));


		// on delete or update
		subs.push(AS.GSTORE.subscribe((e)=>{
			if(e.model_id !== model_id) return;

			// if delete
			if(!["delete"].includes(e.type)) return; // including set here causes infinite loop
			if(!["set"].includes(e.type) && (e as COLLECTION_EVENT_TYPE).qid) return; // checking for qid to avoid infinite, by checking that the event is not 'many' event

			const fstore = AS.GSTORE.filters[model_id];

			if(!fstore) return console.warn("NO FSTORE FOR THE MODEL_ID : ", model_id);

			const FO = fstore[comp_id];
			if(!FO) return console.warn("NO FO");

			g_fn.bro_get_many(INFO, FO);
		}));


		// on filter change => subs
		subs.push(AS.GSTORE.subscribe((e)=>{
			if(e.type !== "filter") return;
			if(e.model_id !== model_id) return;
			if(e.comp_id !== comp_id) return;
			console.log("FILTER3 : ", e);
			const FO = e.filters;

			if(!FO) return console.warn("NO FO FROM GSTORE");

			set_filter_object(FO);

			g_fn.bro_get_many(INFO, FO);
		}));

		g_fn.bro_get_many(INFO, FO);

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