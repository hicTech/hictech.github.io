
BgStudio = {
	
	start: function(game_info_json, game_props_json){
		BG = new BgGame(game_info_json, game_props_json);
		//_.log("BGStudio started, game info: "+_.toStr(BG.allInfos())+", game properties: "+_.toStr(BG.allProps()));
	}

};

BG = null;


BgUtil = {

	adjustPath: function(path, to_bg){
		if(_.isNotEmptyString(path)){
			if(!!to_bg){
				if(path.indexOf("/")>0)
					return _.replaceInString(path, "/", ".");
			}
			else{
				if(path.indexOf(".")>0)
					return _.replaceInString(path, ".", "/");
			}
		}
		return path;
	},
	
	pathArr: function(path){
		if(_.isNotEmptyString(path)){
			var sep = (path.indexOf('.')>0) ? "." : "/";
			return path.split(sep);
		}
		else
			return new Array();
	},
	pathStr: function(path_arr){
		var ret = "";
		if(_.isNotEmptyArray(path_arr)){
			for(var i=0;i<path_arr.length;i++){
				ret += path_arr[i];
				if(i<path_arr.length-1)
					ret += "/";
			}
		}
		return ret;
	},
	
	withoutFirst: function(path){
		var arr = this.pathArr(path);
		if(_.isArray(arr) && arr.length>1){
			arr = _.rest(arr);
			return this.pathStr(arr);
		}
		else
			return "";
	},
	withoutLast: function(path){
		var arr = this.pathArr(path);
		if(_.isArray(arr) && arr.length>1){
			arr = _.initial(arr);
			return this.pathStr(arr);
		}
		else
			return "";
	},
	
	split: function(dims, fixed, pos, ret){
		if(!_.is(ret)){
			ret = new Array();
			if(!_.isNotEmptyArray(dims)){
				if(_.isNotEmptyString(dims))
					dims = [dims];
				else
					return ret;
			}
		}
		if(!_.is(pos))
			pos = 0;
		var last_dim = (pos==(dims.length-1));
		var dim = BG.bgDim(dims[pos]);
		var name = dim.name();
		var vals = dim.values();
		
		_.each(vals, function(val){
			var new_fixed = _.extendObj({}, fixed);
			new_fixed[name] = val;
			if(last_dim)
				ret.push(new_fixed);
			else
				this.split(dims, new_fixed, (pos+1), ret);
		}, this);
		
		return ret;
	}
		
};


BgStudioObject = function(props_json_or_obj){
	this.props = {
		// Default values	
	};
	if(_.isNotEmptyString(props_json_or_obj)){
		this.props.bg_path = props_json_or_obj;
		if(_.is(BG))
			props_json_or_obj = BG.prop(props_json_or_obj);
	}
	
	try{
		props_json_or_obj = _.parse(props_json_or_obj);
	}catch(err){}
	if(_.isObject(props_json_or_obj))
		this.props = _.extendObj(this.props,props_json_or_obj);
	
	this.props = _.nav(this.props,"/");
};
BgStudioObject.prototype = {
	allProps: function(){
		return this.props.root();
	},
	prop: function(prop, def){
		var ret = this.props.get(prop);
		return _.is(ret) ? ret : def;
	},
	setProp: function(prop, value){
		this.props.set(prop, value);
	},
	mergeProps: function(properties){
		var props = this.props.root();
		props = _.extendObj(props, properties, true);
		this.props = _.nav(props, "/");
	},
	
	path: function(){
		return this.prop("bg_path");
	},
	pathArr: function(){
		return BgUtil.pathArr(this.path());
	},
	name: function(){
		var name = this.prop("name");
		if(_.isNotEmptyString(name))
			return name;
		
		var path_arr = this.pathArr();
		return _.isNotEmptyArray(path_arr) ? _.last(path_arr) : null;
	},
	label: function(){
		var label = this.prop("label");
		return _.isNotEmptyString(label) ? label : this.name();
	}
};





BgGame = _.extendFn( BgStudioObject, function(game_info_json, game_props_json){
	this.infos = {
		// Default values
	};
	game_info_json = _.parse(game_info_json);
	if(_.isObject(game_info_json))
		this.infos = _.extendObj(this.infos,game_info_json);
	
	this.props = {
		// Default values	
	};
	game_props_json = _.parse(game_props_json);
	if(_.isObject(game_props_json)){
		if(_.isObject(game_props_json.bg_info))
			this.infos = _.extendObj(this.infos, game_props_json.bg_info);
		//_.log("BG INFO: "+JSON.stringify(this.infos));
		
		
		if(_.is(game_props_json.model))
			this.props = _.extendObj(this.props,_.parse(game_props_json.model),true);
		if(_.is(game_props_json.game))
			this.props = _.extendObj(this.props,_.parse(game_props_json.game),true);
	}
	
	this.infos = _.nav(this.infos,"/");
	this.props = _.nav(this.props,"/");
	
	this.handleGroups();
	this.initDynVars();
},{
	
	allInfos: function(){
		return this.infos.root();
	},
	info: function(info){
		return this.handlePropVal(this.infos.get(info)); 
	},

	label: function(name){
		// label generiche del gioco
		return this.handlePropVal(this.prop("labels/"+name)); 
	},
	
	handlePropVal: function(str){
		return _.isString(str) ? ((str!="null") ? str : null ) : str;
	},
	
	handleGroups: function(){
		//_.log("GROUPS:\n"+JSON.stringify(this.info("scopes")));
		var groups = this.prop("bg_groups",{});
		var player = this.company();
		var period = this.period();
		
		if(_.isNotEmptyString(player)){
			if(!_.is(groups.input)){
				var tmp = {};
				groups.input = _.extendObj(tmp, this.info("scopes/company_in"), true);
				groups.input.BG_DIMS = {
					companies: player,
					time: (period+1)
				};
			}
			if(!_.is(groups.state)){
				var tmp = {};
				tmp = _.extendObj(tmp, this.info("scopes/company_state"), true);
				tmp = _.extendObj(tmp, this.info("scopes/company_out"), true);
				groups.state = tmp;
				groups.state.BG_DIMS = {
					companies: player	
				};
			}	
			if(!_.is(groups.cuncurrents)){
				var tmp = {};
				groups.cuncurrents = _.extendObj(tmp, this.info("scopes/company_out"), true);
			}
			if(!_.is(groups.market)){
				var tmp = {};
				groups.market = _.extendObj(tmp, this.info("scopes/market_out"), true);
				
			}
		}
		else{
			if(!_.is(groups.admin_input)){
				var tmp = {};
				groups.admin_input = _.extendObj(tmp, this.info("scopes/market_in"), true);
				groups.admin_input.BG_DIMS = {
					time: (period+1)
				};
			}
			if(!_.is(groups.admin_market)){
				var tmp = {};
				tmp = _.extendObj(tmp, this.info("scopes/market_state"), true);
				tmp = _.extendObj(tmp, this.info("scopes/market_out"), true);
				groups.admin_market = tmp;
			}	
			if(!_.is(groups.companies)){
				var tmp = {};
				tmp = _.extendObj(tmp, this.info("scopes/company_in"), true);
				tmp = _.extendObj(tmp, this.info("scopes/company_state"), true);
				tmp = _.extendObj(tmp, this.info("scopes/company_out"), true);
				groups.companies = tmp;
			}
		}
		
		this.setProp("bg_groups", groups);
	},
	
	
	initDynVars: function(){
		var proc_trigs = {};
		var bg_triggers = {};
		var bg_props_triggers = {};
		var dyn_vars = {};
		
		var triggers = this.info("triggers");
		if(_.isObject(triggers)){
			var that = this;
			
			// funzione ricorsiva di processing dei triggers
			var processTriggers = function(trig_var){
				if(!_.is(proc_trigs[trig_var]))
					proc_trigs[trig_var] = new Array(); // this should avoid cycles: the real value will be set at the end...
				
				var arr = triggers[trig_var];
				_.each(arr, function(trigged_var){
					if(!_.is(proc_trigs[trigged_var]))
						processTriggers(trigged_var);
					arr = _.addUnique(arr, proc_trigs[trigged_var]);
				}, this);
				
				proc_trigs[trig_var] = arr;
			};
			
			// funzione di inclusione nei triggers visibili
			var includeInTriggers = function(var_path){
				// var visibili e proprieta' (sempre visibili in genere: potremmo fare il controllo sulla var madre ma non è il caso (ottimizziamo...))
				try{
					var bg_var = that.bgVar(var_path);
					return (_.is(bg_var) && bg_var.visible()) ? "var" : null;
				}catch(err){
					return "prop"; // proprieta': non controlliamo perchè funzione interna..
				}
			};
			
			// calcolo dei triggers delle var e delle prop
			_.each(triggers, function(trigged_vars, trig_var){
				processTriggers(trig_var, triggers, proc_trigs);
				var inc_type = includeInTriggers(trig_var); 
				if(inc_type=="var"){ 
					var prop_trigs = new Array();
					bg_triggers[trig_var] = _.filter(proc_trigs[trig_var], function(trigged_var){
						var inc = includeInTriggers(trigged_var);
						if(inc=="prop")
							prop_trigs = _.add(prop_trigs, trigged_var);
						return (inc=="var");
					});
					if(_.isNotEmptyArray(prop_trigs))
						bg_props_triggers[trig_var] = prop_trigs;
				}
			}, this);
			
			// calcolo delle variabili del previsionale (var dinamiche) con dipendenze
			_.each(bg_triggers, function(trigged_vars, trig_var){
				_.each(trigged_vars, function(trigged_var){
					dyn_vars[trigged_var] = _.add(dyn_vars[trigged_var], trig_var);
				}, this);
			}, this);
		}
		
		this.all_triggers = proc_trigs;
		this.bg_triggers = bg_triggers;
		this.bg_props_triggers = bg_props_triggers;
		this.dyn_vars = dyn_vars;
		
//		_.log("\n\n\n\nECCO TRIGGERS: "+_.toStr(this.bg_triggers));
//		_.log("\n\n\n\nPROPS TRIGGERS: "+_.toStr(this.bg_props_triggers));
//		_.log("\n\n\n\nDYN VARS: "+_.toStr(this.dyn_vars));
//		_.log("\n\n\n\nALL TRIGGERS: "+_.toStr(this.all_triggers));
	},
	
	
	
	findVar: function(path){
		//GWT
	},
	
	varGroupPath: function(path){
		if(_.isNotEmptyString(path)){
			var arr = BgUtil.pathArr(path);
			if(_.isNotEmptyArray(arr) && arr.length>1)
				arr = _.first(arr, arr.length-1);
			return BgUtil.pathStr(arr);
		}
	},
	
	bgVar: function(path, dims, implicit_dims){
		path = this.findVar(path);
		var group_path = this.varGroupPath(path);
		var group = _.isNotEmptyString(group_path) ? this.bgGroup(group_path) : null;
		return _.is(group) ? group.bgVar(path) : (_.isNotEmptyString(path) ? new BgVar(path, dims, implicit_dims) : null);
	},
	
	bgGroup: function(path){
		path = BgUtil.adjustPath(path);
		var group = this.prop("bg_groups/"+path);
		if(_.isObject(group)){
			var obj = new BgGroup(path);
			
			var group_path = BgUtil.withoutFirst(path);
			var obj_props = this.prop("bg_properties/"+group_path);
			if(_.isObject(obj_props))
				obj.mergeProps(obj_props);
			
			obj_props = this.prop("ui_properties/"+path);
			if(_.isObject(obj_props))
				obj.mergeProps(obj_props);
			
			return obj; 
		}
	},
	
	bgDim: function(name){
		var ret = new BgDim(name);
		var props = this.prop("dimensions/"+name);
		if(_.isObject(props))
			ret.mergeProps(props);
		return ret;
	},
	
	subgroupsOrder: function(){
		//GWT
	},
	
	subGroups: function(path){
		var group = this.prop("bg_groups/"+path);
		var subgroups = _.isObject(group) ? _.without(_.keys(group),"BG_VARS","BG_DIMS") : new Array();
		var bg_path = this.bgPath(path);
		var path_arr = BgUtil.pathArr(bg_path);
		var market = (path_arr[0]=="market");
		if(path_arr.length>1)
			bg_path = BgUtil.adjustPath(bg_path, true);
		else
			bg_path = "";
		var bg_groups = this.subgroupsOrder(bg_path, market);
		return _.orderBy(subgroups, bg_groups);
	},
	
	groupVars: function(path){
		var group = this.prop("bg_groups/"+path+"/BG_VARS");
		return _.isArray(group) ? group : new Array();
	},
	
	groupDims: function(path){
		var dims = {};
		var arr = BgUtil.pathArr(path);
		var group_path = "";
		_.each(arr, function(item, pos){
			group_path += (group_path.length>0) ? ("/"+item) : item;
			dims = _.extendObj(dims, this.prop("bg_groups/"+group_path+"/BG_DIMS"), true);
		}, this);
		return dims;
	},
	
	bgPath: function(ui_path){
		var arr = BgUtil.pathArr(ui_path);
		arr[0] = (arr[0].indexOf("admin")>=0 || arr[0].indexOf("market")>=0) ? "market" : "company";
		return BgUtil.pathStr(arr);
	},
	
	
	save: function(and_quit){
		this.user_saving = true;
		var saved = this.doSave(and_quit);
		if(!saved)
			alert("Le leve non sono state modificate dall'ultimo salvataggio");
	},
	confirm: function(and_quit){
		this.user_saving = true;
		var saved = this.doConfirm(and_quit);
		if(!saved)
			alert("Le leve non sono state modificate dall'ultimo salvataggio");
	},
	exit: function(){
		this.doExit();
	},
	
	onSave: function(confirmed, exiting, period_played){
		if(!!this.user_saving){
			if((!!confirmed) || (!!period_played))
				location.reload();
			else{
				alert("Il salvataggio e' stato effettuato con successo");
				this.user_saving = false;
			}
		}
	},
	onSaveError: function(error_msg){
		alert("Attenzione: si e' verificato un errore nel salvataggio delle modifiche");
	},
	
	
	mode: function(){
		// "multi_player", "single_player", "just_in_time", ecc.. (da definire meglio con server)
		return this.prop("mode");
	},	
		
	period: function(){
		return this.info("period");
	},
	periods: function(){
		return this.info("periods");
	},
	periodExpiration: function(){
		return this.prop("period_expiration");
	},
	leftTime: function(){
		// mostra il tempo residuo del turno in corso
		//TODO
		return "07:46";
	},
	
	
	
	
	companies: function(){
		// ritorna String[]
		return this.info("companies");
	},
	company: function(){
		// ritorna la company, se giocatore
		return this.info("company");
	},
	isAdmin: function(){
		return (! _.isNotEmptyString(this.company()));
	},
	playerInfo: function(company_name){
		// ritorna le informazioni sulla company come BgPlayer
		if(!_.isNotEmptyString(company_name))
			company_name = this.company();
		var prop = this.prop("players/"+company_name);
		return _.isObject(prop) ? new BgPlayerInfo(prop) : null;
	},
	
	
	uiGroups: function(){
		var group = this.prop("bg_groups");
		return _.is(group) ? _.keys(group) : new Array();
	},
	
	uiGroup: function(ui_group){
		if(ui_group=="input"){
			var ret = this.isAdmin() ? this.bgGroup("admin_input") : this.bgGroup("input");
			var sub_groups = ret.groupNames();
			return (_.isNotEmptyArray(sub_groups) && sub_groups.length==1) ? ret.bgGroup(sub_groups[0]) : ret;
		}
		else if(ui_group=="custom_input")
			return this.isAdmin() ? this.bgGroup("custom_admin_input") : this.bgGroup("custom_input");
		else if(ui_group=="state")
			return this.isAdmin() ? null : this.bgGroup("state");
		else if(ui_group=="companies")
			return this.isAdmin() ? this.bgGroup("companies") : this.bgGroup("cuncurrents");
		else if(ui_group=="market")
			return this.isAdmin() ? this.bgGroup("admin_market") : this.bgGroup("market");
		else if(ui_group=="reports")
			return this.isAdmin() ? this.bgGroup("admin_reports") : this.bgGroup("reports");
		else
			return this.bgGroup(ui_group);
	},
	
	
	
	
	miv: function(view_current){
		// ritorna la MIV (Most Important Variable), mostrata sulla barra
		// in questo caso Budget Residuo..
		var path = this.prop("MIV");
		var ret = this.bgVar(path);
		if(_.is(ret))
			return (!!view_current) ? ret.currentView() : ret;
	},
	
	viv: function(view_current){
		// ritorna le VIV (Very Important Variables), mostrate nel riquadro Report
		// in questo caso valore impresa e fatturato...
		var arr = this.prop("VIV");
		var ret = new Array();
		if(_.isNotEmptyArray(arr)){
			for(var i=0;i<arr.length;i++){
				var bg_var = this.bgVar(arr[i]);
				if(_.is(bg_var)){
					if(!!view_current)
						bg_var = bg_var.currentView();
					ret = _.add(ret, bg_var);
				}
			}
		}
		return ret;
	},
	
	
	
	
	previsionals: function(group_or_var__path_or_obj){
		// ritorna array di vars. Se c'e' path, relative; altrimenti, tutte.
		var rel = this.varPaths(group_or_var__path_or_obj);
		var ret = new Array();
		_.each(this.dyn_vars, function(triggers, dyn_var){
			if(_.isNotEmptyArray(rel)){
				var found_rel = _.find(rel, function(rel_var){
					return _.include(triggers, rel_var);
				}, this);
				if(_.is(found_rel))
					ret.push(dyn_var);
			}
			else
				ret.push(dyn_var);
		}, this);
		return ret;
	},
	
	previsionalVars: function(previsional, current_group){
		// ritorna le var coinvolte in un previsionale (array).
		// se c'e' current_group, ritorna solo quelle del gruppo
		var ret = _.isNotEmptyString(previsional) ? this.dyn_vars[previsional] : null;
		if(_.isNotEmptyArray(ret)){
			var rel = this.varPaths(current_group);
			if(_.isNotEmptyArray(rel)){
				ret = _.filter(ret, function(var_path){
					return _.include(rel, var_path);
				}, this);
			}
		}
		return ret;
	},
	
	previsionalGroups: function(previsional, current_group){
		// ritorna i gruppi coinvolti in un previsionale.
		// se c'e' current group, lo esclude dal risultato.
		var ret = new Array();
		var prev_vars = _.isNotEmptyString(previsional) ? this.dyn_vars[previsional] : null;
		if(_.isNotEmptyArray(prev_vars)){
			var current_path = _.is(current_group, BgGroup) ? current_group.path() : current_group; 
			_.each(prev_vars, function(prev_var){
				var group_path = this.varGroupPath(prev_var);
				if(!(group_path==current_path))
					ret = _.addUnique(ret, group_path);
			}, this);
		}
		return ret;
	},
	
	varPaths: function(group_or_var__path_or_obj){
		var obj = this.varOrGroup(group_or_var__path_or_obj);
		if(_.is(obj, BgGroup))
			return obj.varPaths();
		else if(_.is(obj, BgVar))
			return [obj.path()];
		else
			return new Array();
	},
	
	varOrGroup: function(group_or_var__path_or_obj){
		if(_.isObject(group_or_var__path_or_obj))
			return (_.is(group_or_var__path_or_obj, BgGroup) || _.is(group_or_var__path_or_obj, BgVar)) ? group_or_var__path_or_obj : null;
		else if(_.isNotEmptyString(group_or_var__path_or_obj)){
			try{
				var ret = BG.bgVar(group_or_var__path_or_obj);
				if(_.is(ret))
					return ret;
			}catch(err){}
			try{
				var ret = BG.bgGroup(group_or_var__path_or_obj);
				if(_.is(ret))
					return ret;
			}catch(err){}
		}
	},
	
	
	
	news: function(){
		// ritorna le news, come array di oggetti { title: "", text: "" }
		// eventualmente, prevediamo anche (opzionali) date e icon....
		//TODO
	},
	
	
	help: function(help_key){
		// ritorna il messaggio dell'help
		return this.label("helps/"+help_key);
	},
	
	
	logos: function(){
		// ritorna le immagini da visualizzare nella sbarra
		return this.prop("logos");
	},
	
	
	publicForum: function(){
		//TODO
	}
		
});


// = _.extendFn( BgStudioObject,
BgPlayerInfo = _.extendFn( BgStudioObject, {
	
	icon: function(){
		// ritorna path
		return this.prop("icon");
	},
	
	color: function(){
		// ritorna il colore dell'azienda
		return this.prop("color");
	},
	
	human: function(){
		// ritorna true se il giocatore e' umano
		return this.prop("human", true);
	}
	
});


BgPlayer = _.extendFn( BgStudioObject, {
	
	playerInfo: function(){
		// ritorna il BgPlayerInfo dell'azienda
		return new BgPlayerInfo(this.prop("info"));
	},
	
	notes: function(){
		// ritorna le note della squadra
		return this.prop("notes");
	},
	
	addNote: function(note_text){
		var notes = _.add(this.notes(), note_text);
		this.setProp("notes",notes);
	},
	
	deleteNote: function(note_text_or_pos){
		var notes = this.notes();
		if(_.isNotEmptyArray(notes)){
			var pos = _.tryParse(note_text_or_pos,null,true);
			if(_.is(pos) && pos>=0 && pos<notes.length)
				notes = notes.splice(pos,1);
			this.setProp("notes",notes);
		}
	},
	
	
	sawHelp: function(help_key, set_saw){
		// ritorna true se il Player ha visto l'help (o setta...)
		help_key = "helps/"+help_key;
		if(!!set_saw){
			this.setProp(help_key, true);
			return true;
		}
		else
			return this.prop(help_key);
		
	},
	
	
	adminForum: function(){
		
	},
	
	teamForum: function(){
		
	},
	
	
	socialMessage: function(){
		// ritorna il messaggio preimpostato per la condivisione social,
		// in base ai risultati dell'impresa
		return "Sono stato molto bravo nel business game!";
	}
	
		
});


BgGroup = _.extendFn( BgStudioObject, /*function(path_or_props){
	
},*/{
	
	icon: function(){
		return this.prop("icon");
	},
	
	parent: function(include_macro_group){
		// ritorna Group se ha un parent (escludendo i macrogruppi se include_macro_group non viene specificata a true)
		var path = BgUtil.withoutLast(this.path());
		var has_to_ret = (_.isNotEmptyString(path) && ( (!!include_macro_group) || (path.indexOf("/")>0))); 
		return has_to_ret ? BG.bgGroup(path) : null;
	},
	
	groups: function(){
		var ret = new Array();
		var groups = this.groupNames();
		if(_.isNotEmptyArray(groups)){
			var path = this.path();
			_.each(groups, function(group){
				var group_path = path+"/"+group;
				ret = _.add(ret, BG.bgGroup(group_path));
			});
		}
		return ret;
	},
	
	groupNames: function(){
		return BG.subGroups(this.path());
	},
	
	vars: function(){
		var paths = this.varPaths();
		var ret = new Array();
		_.each(paths, function(path){
			ret.push(_.last(BgUtil.pathArr(path)));
		});
		return ret;
	},
	
	varPaths: function(){
		return BG.groupVars(this.path());
	},
	
	varPath: function(var_name){
		if(_.isNotEmptyString(var_name)){
			if(var_name.indexOf(".")>0)
				return var_name;
			
			var paths = this.varPaths();
			for(var i=0;i<paths.length;i++){
				if(_.endsWith(paths[i],"."+var_name))
					return paths[i];
			}
		}
	},
	
	howManyVars: function(){
		var names = this.vars();
		var ret = 0;
		_.each(names, function(name){
			var bg_var = this.bgVar(name);
			var splits = bg_var.split();
			if(_.isNotEmptyArray(splits))
				ret += splits.length;
			else
				ret += 1;
		}, this);
		return ret;
	},
	
	howManyGroups: function(){
		var groups = this.groupNames();
		return _.isNotEmptyArray(groups) ? groups.length : 0;
	},
	
	getDims: function(){
		return BG.groupDims(this.path());
	},
	
	bgVar: function(name){
		//alert("DIMS DI "+this.name()+": "+_.toStr(this.getDims()));
		return BG.bgVar(this.varPath(name), this.getDims(), true);
	},
	
	bgVars: function(){
		var ret = new Array();
		var names = this.vars();
		_.each(names, function(name){
			_.add(ret, this.bgVar(name));
		}, this);
		return ret;
	},
	
	bgGroup: function(sub_group){
		if(_.isNotEmptyString(sub_group)){
			var path = this.path()+"/"+sub_group;
			return BG.bgGroup(path);
		}
	}
	
});


BgVar = _.extendFn( BgStudioObject, function(path_or_props, dims, implicit_dims){
	
	this.bg_dims = this.bgDims();
	this.fixed_dims = {};
	if(_.isObject(dims))
		this.fixDims(dims, implicit_dims);
	
},{
	
	type: function(){
		var info = this.typeInfo();
		info.bg_path = this.path();
		var ret = new BgType(info);
		ret.bgOwner(this);
		return ret;
	},
	
	typeInfo: function(){
		//GWT
	},
	
	bgDims: function(){
		//GWT
	},
	
	bgBound: function(min){
		//GWT
	},
	
	isBGVariable: function(min){
		//GWT
	},
	
	isVar: function(){
		return this.isBGVariable(); 
	},
	
	jsType: function(){
		var type = this.type();
		return type.isEnum() ? "string" : ( type.isBool() ? "boolean" : "number" );
	},
	
	fixDims: function(dims, implicit_dims){
		if(_.isObject(dims)){
			_.each(dims, function(val, key){
				this.fixDim(key, val, implicit_dims);
			}, this);
		}
	},
	
	fixDim: function(dim, val, implicit){
		// se val � settato a null, la dim viene sbloccata
		// se implicit � true durante il settaggio della dim, questa non viene mostrata nel titolo o tra le selezionabili (es: grafico..)
		if(_.isNotEmptyString(dim)){
			if(_.is(val))
				this.fixed_dims[dim] = {
					value: _.isObject(val) ? val.value : val,
					implicit: _.isObject(val) ? val.implicit : (!!implicit)
				};
			else
				delete this.fixed_dims[dim];
		}
		
		var fixed = this.fixed_dims[dim];
		return _.is(fixed) ? fixed.value : null;
	},
	
	fixedObj: function(include_implicit){
		var ret = {};
		_.each(this.fixed_dims, function(val, key){
			if((!val.implicit) || (!!include_implicit))
				ret[key] = val.value;
		});
		return ret;
	},
	/*
	bgFixedNames: function(){
		return _.keys(this.fixedObj(true));
	},
	bgFixedValues: function(){
		return _.values(this.fixedObj(true));
	},
	*/
	
	fixedDims: function(include_implicit, only_implicit){
		var keys = _.keys(this.fixed_dims);
		return ((!!include_implicit) && (!only_implicit)) ? keys : _.filter(keys, function(key){
			return (!!include_implicit) ? (!!this.fixed_dims[key].implicit) : (!this.fixed_dims[key].implicit); 
		}, this);
	},
	
	fixedDimValues: function(include_implicit, only_implicit){
		var ret = new Array();
		var dims = this.fixedDims(include_implicit, only_implicit);
		_.each(dims, function(dim){
			var fixed = this.fixed_dims[dim];
			if(_.isObject(fixed))
				ret.push(fixed.value);
		},this);
		return ret;
	},
	
	// ritorna le dimensioni libere della var. Se get_all_dims e' true, ritorna tutte le dimensioni (anche quelle fissate), eccetto 
	// quelle fissate implicitamente (quindi trasparenti alla ui, che le vede direttamente come viste a seconda delle props del bg...)
	dims: function(get_all_dims){
		var fixed = this.fixedDims(true, (!!get_all_dims));
		var ret = new Array();
		_.each(this.bg_dims, function(dim){
			if(_.indexOf(fixed,dim)<0)
				ret.push(dim);
		});
		return ret;
	},
	
	
	allDims: function(){
		return this.dims(true);
	},
	
	dimFixing: function(dim){
		return this.fixed_dims[dim];
	},
	
	dimVal: function(dim){
		var fixed = this.dimFixing(dim);
		if(_.isObject(fixed))
			return fixed.value;
	},
	
	clone: function(){
		return new BgVar(this.allProps(),this.fixed_dims);
	},
	
	view: function(dims, implicit){
		var ret = this.clone();
		ret.fixDims(dims, implicit);
		return ret;
	},
	
	companyView: function(company){
		return this.view({
			companies: _.isNotEmptyString(company) ? company : BG.company()
		}, true);
	},
	periodView: function(time){
		return this.view({
			time: _.is(time) ? time : BG.period()
		}, true);
	},
	currentView: function(company, time){
		return this.view({
			companies: _.isNotEmptyString(company) ? company : BG.company(),
			time: _.is(time) ? time : BG.period()
		}, true);
	},
	
	split: function(dims){
		// ritorna un array (se realmente splittato) di var, ciascuna con tutte le dim fissate
		// se non si passano le dims da splittare, la var viene splittata in tutte le dim libere
		if(!_.is(dims))
			dims = this.dims();
		var split = BgUtil.split(dims);
		if(_.isNotEmptyArray(split)){
			for(var i=0;i<split.length;i++){
				split[i] = this.view(split[i]);
			}
			return split;
		}
		else
			return [this];
	},
	
	value: function(dims){
		var val_str = this.getBgValue(dims);
		return this.type().jsValue(val_str);
	},
	showValue: function(dims){
		var val_str = this.getBgValue(dims);
		return this.type().showValue(val_str, true);
	},
	getBgValue: function(dims){
		// ritorna il valore della var, nell'incrocio di dim passate (se presenti)
		var bg_var = this;
		if(_.is(dims))
			bg_var = this.view(dims);
		return bg_var.bgValue();
	},
	bgValue: function(){
		// ritorna il valore bg di questa var in questo incrocio dimensionale (anche multiplo) come valore bg
		//GWT
	},
	setValue: function(value, dims_or_get_all_changed, get_all_changed){
		// imposta il valore bg di questa variabile, eventualmente specificando le dimensioni su cui agire.
		// inoltre, esegue i calcoli di validazione e le esecuzioni associate al cambiamento e ritorna le variabili cambiate
		var type = this.type();
		value = type.jsValue(value);
		
		////// NOTA: questo perchè il BG considera il valore percentuale tra 0 e 1 in inserimento, anche se poi lo mostra tra 0 e 100...
		if(type.isPerc())
			value = (value/100);
		if(type.isDependentPerc()){
			if(value<0)
				value = 0;
			else if(value>1)
				value = 1;
		}
		
		var dims = dims_or_get_all_changed;
		if(_.isBoolean(dims)){
			dims = null;
			get_all_changed = dims_or_get_all_changed;
		}
		var obj = _.is(dims) ? this.view(dims) : this;
		var changeds = obj.setBgValue(value, get_all_changed);
		return {
			new_value: this.value(dims),
			changed_vars: _.isArray(changeds) ? changeds : (_.isNotEmptyString(changeds) ? _.parse(changeds) : new Array())
		};
	},
	setBgValue: function(value, get_all_changed){
		// imposta il valore bg di questa variabile, eventualmente specificando le dimensioni su cui agire.
		// inoltre, esegue i calcoli di validazione e le esecuzioni associate al cambiamento e ritorna le variabili cambiate
		// ritorna un'oggetto che contiene il nuovo valore della variabile e le variabili cambiate (solo quelle di input se get_all_changed non e' true)
		//GWT
	},
	setAndGet: function(value, dims){
		var changed = this.setValue(value, dims);
		return this.value(dims);
	},
	
	help: function(){
		return BG.help("bg/"+this.path());
	},
	
	modifiable: function(){
		//GWT
	},
	modified: function(){
		//GWT
	},
	visible: function(){
		//GWT
	},
	bgUm: function(){
		//GWT
	},
	bgDescription: function(){
		//GWT
	},
	
	
	showName: function(){
		var ret = this.name();
		var dims = this.fixedDims();
		if(_.isNotEmptyArray(dims)){
			var dims_str = "";
			for(var i=0; i<dims.length; i++){
				var val = this.dimFixing(dims[i]);
				if(_.is(val)){
					if(dims_str.length>0)
						dims_str += ", ";
					dims_str += _.isObject(val) ? val.value : val;
				}
 			}
			ret += " ("+dims_str+")";
		}
		return ret;
	},
	um: function(){
		var prop = this.prop("um");
		return _.isNotEmptyString(prop) ? prop : this.bgUm();
	},
	description:function(){
		var prop = this.prop("description");
		return _.isNotEmptyString(prop) ? prop : this.bgDescription();
	},
	graphic: function(view_mode){
		return new BgGraphic("charts",this,view_mode);
	}

});


BgType = _.extendFn( BgStudioObject, {
	type: function(){
		return this.prop("type");
	},
	isBool: function(){
		return this.prop("info/is_bool");
	},
	isNum: function(){
		return this.prop("info/is_num");
	},
	isInt: function(){
		// TODO @Fabris
		return false;
	},
	isPerc: function(){
		return this.prop("info/is_perc");
	},
	isEnum: function(){
		return this.prop("info/is_enum");
	},
	
	isDependentPerc: function(){
		return _.is(this.percOn());
	},
	
	percOn: function(){
		return this.prop("info/perc_on");
	},
	
	bounds: function(){
		return this.prop("bounds");
	},
	min: function(){
		var dyn = this.dynMin() ? this.bgBound(true) : null; 
		return _.is(dyn) ? dyn : this.prop("bounds/min/value");
	},
	dynMin: function(){
		return this.prop("bounds/min/dynamic");
	},
	max: function(){
		var dyn = this.dynMax() ? this.bgBound(false) : null;
		return _.is(dyn) ? dyn : this.prop("bounds/max/value");
	},
	dynMax: function(){
		return this.prop("bounds/max/dynamic");
	},
	
	bgOwner: function(owner){
		if(_.is(owner))
			this.owner = owner;
		return this.owner;
	},
	
	bgBound: function(min){
		var owner = this.bgOwner();
		if(_.is(owner) && _.isFunction(owner.bgBound))
			return owner.bgBound(min);
	},
	
	values: function(){
		return this.prop("enum_values");
	},
	
	numValues: function(){
		var values = this.isEnum() ? this.values : (this.isBool() ? [true, false] : null);
		if(_.is(values)){
			var ret = new Array();
			_.each(values, function(value){
				ret.push(this.numValue(value, values));
			}, this);
			return ret;
		}
	},
	
	numValue: function(value, values){
		if(_.isNotEmptyString(value)){
			var pos = _.indexOf(values, value);
			if(pos>=0){
				var weights = this.prop("enum_weights");
				return _.isNotEmptyArray(weights) ? weights[pos] : pos;
			}
			else
				return 0;
		}
		else if(_.isBoolean(value))
			return (value) ? 1 : -1;
		else
			return value;
	},
	
	boolValue: function(val){
		return _.isNotEmptyString(val) ? (val=="Si" || val=="true") : (_.isBoolean(val) ? val : false); /*((!!val) ? "Si" : "No");*/
	},
	
	showValue: function(val, from_var){
		if(_.is(val)){
			if(_.isBoolean(val)) 
				return ( val ? "Si" : "No" );
			/*else if(this.isPerc() && (!from_var))
				val = (_.tryParse(val)/100);*/
			return BG.printable(val);
		}
	},
	
	jsValue: function(val, from_input){
		if(_.is(val)){
			if(this.isEnum())
				return (""+val);
			else if(this.isBool()) 
				return  _.tryParse(val, null, false); 
			else{
				var ret = (!!from_input) ? BG.computable(val) : val;
				if(_.isNotEmptyString(ret))
					ret = _.tryParse(ret);
				/*if(this.isPerc())
					ret = (ret / 100);*/
				return ret;
			}
		}
	}
	
});


BgDim = _.extendFn( BgStudioObject, {
	
	type: function(){
		var info = this.typeInfo();
		info.bg_path = this.path();
		var ret = new BgType(info);
		ret.bgOwner(this);
		return ret;
	},
	
	typeInfo: function(){
		//GWT
	},
	
	values: function(){
		//GWT
	},
	
	def: function(){
		var name = this.name();
		if(name=="time")
			return BG.period();
		else if(name=="companies" && (!BG.isAdmin()))
			return BG.company();
		
		var vals = this.values();
		return _.isNotEmptyArray(vals) ? vals[0] : null;
	},
	
	size: function(){
		return this.values().length;
	},
	
	value: function(pos){
		var vals = this.values();
		if(pos>=0 && pos<vals.length)
			return vals[pos];
	},
	
	pos: function(value){
		value = (""+value).toLowerCase();
		var vals = this.values();
		for(var i=0; i<vals.length; i++)
			if((""+vals[i]).toLowerCase()==value)
				return i;
	},
	
	label: function(value, pre_path){
		var prop = _.isNotEmptyString(value) ? ("value_labels/"+value) : "label";
		if(_.isNotEmptyString(pre_path))
			prop = pre_path+"/"+prop;
		return this.prop(prop);
	},
	
	labelOrDef: function(label, def){
		var ret = this.label(label);
		return _.isNotEmptyString(ret) ? ret : def;
	},
	
	chartLabel: function(value){
		return this.label(value,"chart");
	},
	
	orderValues: function(values){
		var all_values = this.values();
		return _.orderBy(values, all_values);
	}
});



BgGraphic = _.extendFn( BgStudioObject, function(path_or_props, bg_var, view_mode){
	if(_.is(bg_var))
		this.init(bg_var, view_mode);
},{
	
	init: function(bg_var, view_mode){
		this.bg_var = bg_var.clone();
		
		if(_.isNotEmptyString(view_mode))
			this.view_mode = view_mode;
		else{
			this.view_mode = this.prop("view_mode");
			if(!_.is(this.view_mode))
				this.view_mode = "bars";
		}
		
		this.resetDims();
		this.autoSet();
	},
	
	chartLibrary: function(){
		// chart library: visualization | highcharts
		var def_library = "visualization";
		var ret = this.chartProp("chart_library");
		return _.is(ret) ? ret : def_library;
	},
	onVisualization: function(){
		return (this.chartLibrary()=="visualization");
	},
	onHighCharts: function(){
		return (this.chartLibrary()=="highcharts");
	},
	
	
	resetDims: function(){
		var dims = this.allDims();
		var x = this.selectX(dims);
		//_.log("Selezionata X "+x+" tra dims "+_.toStr(dims)+", info: "+_.toStr(this.dimsInfo()));
		var bg_var = this.bgVar();
		this.dim_values = {};
		_.each(dims, function(dim){
			var dim_val = (dim!=x) ? BG.bgDim(dim).def() : null;                                                                                                
			this.dim_values[dim] = dim_val;
			//_.log("BG: impostata dim "+dim+" a "+dim_val+" in var "+bg_var.name());
		}, this);
		//_.log("Fissate dimensioni: "+bg_var.fixed_dims+", dims grafico: "+_.toStr(this.dim_values));
	},
	
	dimsInfo: function(dims){
		var ret = {
			time: false,
			companies: false,
			var_dims: new Array()
		};
		
		if(!_.is(dims))
			dims = this.allDims();
		if(_.isNotEmptyArray(dims)){
			_.each(dims, function(dim){
				if(_.isObject(dim))
					dim = dim.name();
				if(dim=="time")
					ret.time = true;
				else if(dim=="companies")
					ret.companies = true;
				else if(_.isNotEmptyString(dim))
					ret.var_dims.push(dim);
			}, this);
		}
		
		return ret;
	},
	
	selectX: function(dims_or_info){
		var info = _.isObject(dims_or_info) ? dims_or_info : this.dimsInfo(dims_or_info);
		if(_.isObject(info)){
//			versione che seleziona l'azienda, se presente, nella dim companies: commentato per gestione nei gruppi, per cui le var
//			con dim companies sono gia' quelle di uscita, per cui ha senso il confronto, e non avrebbe senso selezionarne una...
//			return _.isNotEmptyArray(info.var_dims) ? ( (BG.isAdmin() && (!!info.companies)) ? "companies" : _.last(info.var_dims) ) : 
//						( (!!info.companies) ? "companies" : "time" );
//			
			var mode = this.mode();
			if(mode=="lines")
				return "time";
			else if(mode=="pie")
				return _.isNotEmptyArray(info.var_dims) ? _.last(info.var_dims) : ( (!!info.companies) ? "companies" : "time" );
			else if(mode=="bars" || mode=="table")
				return (!!info.companies) ? "companies" : (_.isNotEmptyArray(info.var_dims) ? _.last(info.var_dims) : "time");
		}
	},
	
	
	bgVar: function(){
		return this.bg_var;
	},
	
	// modi possibili: bars, lines, table, pie
	mode: function(mode){  
		// ritorna o setta la modalita' di visualizzazione (grafico, lista, ecc.)
		if(!!mode)
			this.view_mode = mode;
		return this.view_mode;
	},
	
	autoSet: function(dim){
		if(!_.is(dim))
			dim = this.xDim();
		var bg_type = this.bgVar().type();
		/*
		if(bg_type.isEnum() || bg_type.isBool())
			this.mode("bars");
		else if(bg_type.isPerc()){
			if(bg_type.isDependentPerc()){
				var deps = bg_type.percOn();
				if(_.include(deps, dim))
					this.mode("pie");
				else
					this.mode("bars");
			}
			else{
				if(dim=="companies")
					this.mode("pie");
				else
					this.mode("bars");
			}
		}
		else if(dim=="time")
			this.mode("lines");
		else
			this.mode("bars");
		*/
		this.mode("bars");
	},
	
	dims: function(all_dims){
		return this.bgVar().dims(all_dims);
	},
	allDims: function(){
		return this.dims(true);
	},
	
	dim: function(dim, val){
		if(!_.isUndefined(val)){
			var dim_type = BG.bgDim(dim).type();
			if(_.isArray(val)){
				var new_val = new Array();
				_.each(val, function(single_val){
					new_val.push(dim_type.jsValue(single_val));
				}, this);
				val = new_val;
			}
			else if(_.is(val))
				val = dim_type.jsValue(val);
			this.dim_values[dim] = val;
		}
		return this.dim_values[dim];
	},
	
	dimInfo: function(dim){
		var val = this.dim(dim);
		return {
			x: (!_.is(val)),
			split: (_.isArray(val)),
			value: val,
		}
	},
	
	controllerInfo: function(dim){
		if(_.is(dim)){
			var ret = { x: true, split: true };
			
			if(_.tryParse(this.prop("dynamic_controller"), false, false)){
				var mode = this.mode();
				if(mode=="table")
					ret = { x: false, split: false };
				else if(mode=="pie")
					ret = { x: true, split: false };
				else{
					if(mode=="lines"){
						ret.x = false;
						if(dim=="time")
							ret.split = false;
					}
					else if(dim=="time")
						ret.x = false;
				}
				
				ret.show = ( (!!ret.x) || (!!ret.split) );
			}
			else
				ret.show = true;
			
			return ret;
		}
		else{
			var ret = {};
			var dims = this.dims();
			_.each(dims, function(dim){
				ret[dim] = this.controllerInfo(dim);
			}, this);
			return ret;
		}
	},
	
	
	findDim: function(x_or_split){
		return _.find(this.allDims(), function(dim){
			return (!!x_or_split) ? (!_.is(this.dim_values[dim])) : _.isArray(this.dim_values[dim]);
		}, this);
	},
	
	xDim: function(dim, keep_mode){
		var prev_x = this.findDim(true);
		if(_.isNotEmptyString(dim)){
			var prev_x_val = BG.bgDim(prev_x).def();
			this.dim(prev_x, prev_x_val);
			this.dim(dim,null);
			
			if((!keep_mode) || ((!_.is(keep_mode)) && (this.mode()!="table")))
				this.autoSet(dim);
			
			_.log("Impostata "+dim+" come X. Dimensioni: "+_.toStr(this.dim_values));
			return dim;
		}
		else
			return prev_x;
	},
	
	xValues: function(x_dim){
		if(!_.isNotEmptyString(x_dim))
			x_dim = this.xDim();
		return BG.bgDim(x_dim).values();
	},
	
	splitDim: function(dim, internal){
		if((!internal) && this.companySplit())
			return "companies";
		var prev_split = this.findDim(false);
		if(_.isNotEmptyString(dim)){
			if(_.is(prev_split)){
				var prev_split_val = _.first(this.dim(prev_split));
				this.dim(prev_split, prev_split_val);
			}
			var dim_val = this.dim(dim);
			if(!_.is(dim_val))
				dim_val = BG.bgDim(dim).def();
			this.dim(dim,[dim_val]);
			
			_.log("Impostata "+dim+" come SPLIT. Dimensioni: "+_.toStr(this.dim_values));
			return dim;
		}
		else
			return prev_split;
	},
	
	splitValues: function(dim, internal){
		if((!internal) && this.companySplit())
			return BG.bgDim("companies").values();
		if(!_.is(dim))
			dim = this.splitDim(null, internal);
		if(_.is(dim))
			return this.dim(dim);
	},
	
	internalSplitDim: function(dim){
		return this.splitDim(dim, true);
	}, 
	internalSplitValues: function(){
		return this.splitValues(null, true);
	}, 
	
	
	autoSplit: function(){
		var auto = _.tryParse(this.prop("auto_split"),null,false);
		if(_.is(auto))
			return auto;
		else 
			return true; //this.onHighCharts();
	},
	
	toggleDimValue: function(dim, value){
		var val = this.dim(dim);
		if(!_.is(val)){
			var dims = _.without(this.allDims(), dim);
			var x_dim = this.selectX(dims);
			this.xDim(x_dim);
			this.dim(dim, value);
		}
		else if(_.isArray(val)){
			var present = _.weakInclude(val, value);
			if(present){
				if(val.length>1)
					val = _.remove(val, value, true);
				if(this.autoSplit() && val.length==1)
					val = val[0];
			}
			else
				val = _.add(val, value);
			
			if(_.isNotEmptyArray(val))
				val = BG.bgDim(dim).orderValues(val);
			this.dim(dim, val);
		}
		else{
			if(this.autoSplit() && (!_.is(this.internalSplitDim()))){
				this.internalSplitDim(dim);
				this.toggleDimValue(dim, value);
			}
			else
				this.dim(dim, value);
		}
		
		_.log("Toggle del valore "+value+" per la dimensione "+dim+". Dimensioni: "+_.toStr(this.dim_values));
		return this.dim(dim);
	},
	
	varView: function(additional_dim_values){
		var view_dims = {};
		
		var dims = this.dims();
		_.each(dims, function(dim){
			var val = this.dim(dim);
			if(_.is(val) && (!_.isArray(val)))
				view_dims[dim] = val;
		}, this);
		
		if(_.isObject(additional_dim_values))
			view_dims = _.extendObj(view_dims, additional_dim_values);
		
		return this.bg_var.view(view_dims);
	},
	
	values: function(split_value, split_as_array){
		var x_dim = this.xDim();
		var split_dim = this.internalSplitDim();
		return this.tableValues(x_dim, split_dim);
	},
	
	tableValues: function(x_dim, split_dim, split_value, split_as_array){
		if(!_.is(x_dim))
			x_dim = this.xDim();
		if(!_.is(split_dim))
			split_dim = this.splitDim();
		
		if( _.is(split_dim) && (!_.is(split_value)) ){
			var ret = (!!split_as_array) ? new Array() : {};
			
			var splits = this.dim(split_dim);
			if(!_.isNotEmptyArray(splits))
				splits = BG.bgDim(split_dim).values();
			if(_.isNotEmptyArray(splits)){
				_.each(splits, function(split){
					if(!!split_as_array)
						ret.push(this.tableValues(x_dim, split_dim, split, true));
					else
						ret[split] = this.tableValues(x_dim, split_dim, split);
				}, this);
			}
			
			return ret;
		}
		else{
			var ret = new Array();
			
			var dims = this.dims(); 
			var view_dims = {};
			_.each(dims, function(dim){
				var dim_val = this.dim(dim);
				if(_.is(dim_val) && (!_.isArray(dim_val)))
					view_dims[dim] = dim_val;
			}, this);
			
			if(_.is(split_value))
				view_dims[split_dim] = split_value;
			
			var x_vals = this.highChartsCompanySplit() ? this.dim(x_dim) : null;
			if(!_.isNotEmptyArray(x_vals))
				x_vals = BG.bgDim(x_dim).values();
			_.each(x_vals, function(x_val){
				view_dims[x_dim] = x_val;
				var bg_var = this.varView(view_dims);
				ret = _.add(ret, bg_var.value());
			}, this);
			
			return ret;
		}
	},
	
	// CALCOLA LA LABEL DELL'INCROCIO DIMENSIONALE O UN ARRAY DI LABEL, IN CASO DI SPLIT
	dimsLabel: function(split_value){
		var split_dim = this.internalSplitDim();
		
		if( _.is(split_dim) && (!_.is(split_value)) ){
			var ret = {};
			
			var splits = this.internalSplitValues();
			if(_.isNotEmptyArray(splits)){
				_.each(splits, function(split){
					ret[split] = this.values(split);
				}, this);
			}
			
			return ret;
		}
		else{
			var ret = "";
			
			var dims = this.dims();
			_.each(dims, function(dim){
				if( ! (_.is(split_dim) && dim==split_dim) ){
					var dim_val = this.dim(dim);
					if(_.is(dim_val))
						ret += ( _.isNotEmptyString(ret) ? ", " : "" ) + this.xValueLabel(dim_val, dim);
				}
			}, this);
			if(_.is(split_value))
				ret += ( _.isNotEmptyString(ret) ? ", " : "" ) + split_value;
			
			return ret;
		}
	},
	
	chartProp: function(prop, mode){
		if(!_.isNotEmptyString(mode))
			mode = this.mode();
		var ret = this.prop(mode+"/"+prop);
		return _.is(ret) ? ret : this.prop(prop);
	},
	
	dimProp: function(prop, dim, dim_val){
		var path = dim+"/"+prop;
		if(_.is(dim_val))
			path += "/"+dim_val;
		var prop = this.chartProp("dims/"+path);
		return _.is(prop) ? prop : BG.prop("dimensions/"+path);
	},
	
	yLabel: function(){
		return this.bgVar().showName();
	},
	
	yValues: function(){
		// only for enum and boolean types
		var bg_type = this.bgVar().type();
		if(bg_type.isEnum())
			return bg_type.values();
		else if(bg_type.isBool())
			return [true,false];
	},
	
	yValueLabel: function(value){
		// only for enum and boolean types
		var bg_type = this.bgVar().type();
		if(bg_type.isEnum())
			return value;
		else if(bg_type.isBool())
			return (value=="true" || value=="Si" || (value===true)) ? "Si" : "No";
	},
	
	yValueLabels: function(){
		var values = this.yValues();
		if(_.isNotEmptyArray(values)){
			var ret = new Array();
			_.each(values, function(value){
				ret = _.add(ret, this.yValueLabel(value));
			}, this);
			return ret;
		}
	},
	
	xLabel: function(x_dim){
		var dim = _.isNotEmptyString(x_dim) ? x_dim : this.xDim();
		var prop = this.dimProp("label", dim);
		return _.is(prop) ? prop : dim;
	},
	
	xValueLabel: function(value, x_dim){
		var dim = _.isNotEmptyString(x_dim) ? x_dim : this.xDim();
		var prop = this.dimProp("value_labels",dim,value);
		return _.is(prop) ? prop : value;
	},
	
	xValueLabels: function(x_dim){
		var dim = _.isNotEmptyString(x_dim) ? x_dim : this.xDim();
		var values = this.xValues(dim);
		
		var ret = new Array();
		_.each(values, function(value){
			ret = _.add(ret, this.xValueLabel(value, dim));
		},this);
		return ret;
	},
	
	splitLabel: function(split_dim){
		var dim = _.isNotEmptyString(split_dim) ? split_dim : this.splitDim();
		if(_.is(dim)){
			var prop = this.dimProp("split_label", dim);
			return _.is(prop) ? prop : this.xLabel(dim);
		}
	},
	
	splitValueLabel: function(value, split_dim){
		var dim = _.isNotEmptyString(split_dim) ? split_dim : this.splitDim();
		var prop = this.dimProp("split_value_labels",dim,value);
		return _.is(prop) ? prop : this.xValueLabel(value);
	},
	
	splitValueLabels: function(split_dim){
		var dim = _.isNotEmptyString(split_dim) ? split_dim : this.splitDim();
		var values = this.splitValues(dim);
		
		var ret = new Array();
		_.each(values, function(value){
			ret = _.add(ret, this.splitValueLabel(value, dim));
		},this);
		return ret;
	},
	
	
	
	
	
	companySplit: function(){ 
		return (this.onVisualization()) ? ((!!this.chartProp("companies_colors")) && (this.xDim()=="companies")) : false;
	},
	
	columns: function(){
		// RAGIONAMENTO IN CASO DI TABLE
		
		if(this.companySplit()){
			var split_values = this.internalSplitValues();
			if(_.isNotEmptyArray(split_values)){
				var ret = new Array();
				var split_dim = this.internalSplitDim(); 
				_.each(split_values, function(split_value){
					var label = this.xValueLabel(split_value, split_dim)
					ret.push(this.dimsLabel(label));
				}, this);
				return ret;
			}
			else
				return this.dimsLabel();
		}
		else
			return this.xValueLabels();
	},
	
	isMultiRows: function(){
		return _.is(this.internalSplitDim());
	},
	
	row: function(){
		return this.isMultiRows() ? this.rows() : this.values();
	},
	
	rows: function(){
		// RAGIONAMENTO IN CASO DI TABLE
		
		var split_dim = this.internalSplitDim();
		var ret = new Array();
		
		if(this.companySplit()){
			var comps = BG.companies();
			var split_values = this.internalSplitValues();
			
			var view_dims = {}
			_.each(comps, function(comp){
				
				view_dims.companies = comp;
				
				var comp_arr = new Array();
				if(_.isNotEmptyArray(split_values)){
					_.each(split_values, function(split_value){
						
						view_dims[split_dim] = split_value;
						
						var bg_var = this.varView(view_dims);
						comp_arr = _.add(comp_arr, bg_var.value());
						
					}, this);
				}
				else{
					var bg_var = this.varView(view_dims);
					comp_arr = _.add(comp_arr, bg_var.value());
				}
				
				ret.push(comp_arr);
				
			}, this);
		}
		else{
			if(_.isNotEmptyString(split_dim))
				ret = this.values(null, true);
			else 
				ret.push(this.values());
			
			/*
			var split_values = this.internalSplitValues();
			if(_.isNotEmptyArray(split_values)){
				_.each(split_values, function(split_value){
					ret.push(this.values(split_value));
				}, this);
			}
			else
				ret.push(this.values());
			*/
		}
		
		return ret;
	},
	
	rowNames: function(){
		// RAGIONAMENTO IN CASO DI TABLE
		
		var rows_dim = this.companySplit() ? "companies" : null; 
		return this.splitValueLabels(rows_dim);
	},
	
	companiesColors: function(){
		var ret = this.prop("fixed_companies_colors");
		var comps = BG.companies();
		_.each(comps, function(comp, pos){
			var comp_info = BG.playerInfo(comp);
			if(_.is(comp_info)){
				if(pos>=ret.length)
					ret.push(comp_info.color());
				else
					ret[pos] = comp_info.color();
			}
		},this);
		return ret;
	},
	
	companyColor: function(company){
		if(!_.is(company)){
			company = this.dim("companies");
			if(_.isNotEmptyArray(company))
				company = _.first(company);
		}
		if(_.is(company)){
			var companies = BG.bgDim("companies").values();
			var companies_colors = this.companiesColors();
			var pos = _.indexOf(companies, company);
			return companies_colors[pos];
		}
	},
	
	dimColors: function(dim){
		// default se manca qualche configurazione: dovrebbero essere tutti diversi a sfumare, magari (meglio se sul colore riservato, arancio)
		var colors = ["#d46b31","#d48331","#df9065","#dfa265","#e9b598","#e9c198","#f4dacb","#f4e0cb",
		              "#d46b31","#d48331","#df9065","#dfa265","#e9b598","#e9c198","#f4dacb","#f4e0cb",
		              "#d46b31","#d48331","#df9065","#dfa265","#e9b598","#e9c198","#f4dacb","#f4e0cb"];
		var fixed_colors = (_.is(dim) && dim=="companies") ? this.companiesColors() : this.prop("chart_colors");
		if(_.isNotEmptyArray(fixed_colors)){
			_.each(fixed_colors, function(fixed_color, index){
				colors[index] = fixed_color;
			}, this);
		}
		return colors;		
	},
	
	rowColors: function(){
		var companies_colors = _.tryParse(this.prop("companies_colors"), true, false);
		var dim = this.xDim();
		if(companies_colors){
			var split_dim = this.internalSplitDim();
			companies_colors = ((dim=="companies" || split_dim=="companies"));
		}
		return this.dimColors( companies_colors ? "companies" : dim );
	},
	
	multiplePositions: function(width, height, elems){
		// height max bounds
		var bottom_marg = 110;
		var h_marg = height * 0.1;
		var h = height - (h_marg * 2) - bottom_marg;
		// width max bounds
		var w_marg = width * 0.1;
		var w = width - (w_marg * 2);
		var distance = 20;
		var size = ((w-(distance * (elems-1)))/elems);
		// get size and vertical center
		if(size>h){
			size = h;
			distance = ( (w - (size * elems)) / elems );
			w_marg = distance/2;
		}
		h_marg = ((height - size)/2);
		h = height - bottom_marg - (h_marg * 2);
		var h_center = h_marg + (h/2);
		
		var ret = {
			size: _.round(size),
			h_center: _.round(h_center),
			w_centers:[]
		};
		var bound = w_marg;
		for(var i=0; i<elems; i++){
			var w_center = _.round(bound + (size/2)); 
			ret.w_centers.push(w_center);
			bound += (size + distance);
		}
		return ret;
	},
	
	
//////////////////////////////////////////////////////////////////////////////////////////////////////
//	HIGHCHARTS
/////////////////////////////////////////////////////////////////////////////////////////////////////
	
	
	highChartsData: function(width, height){
		var type = this.highChartsType();
		var split_dim = this.highChartsSplitDim();
		if(_.is(type)){
			var bg_var = this.bgVar();
			var chart_opts = {
				chart:{
					type: type,
					width: width,
            		height: height
            	},
				title: {
					text: bg_var.showName()
				},
				series: this.highChartsSeries(width, height),
				colors: this.highChartsColors(),
				xAxis: this.highChartsX(),
				yAxis: this.highChartsY(),
				tooltip: this.highChartsTooltip(),
				legend: {
					enabled: _.is(split_dim)
				},
				exporting: {
					enabled: false
				},
				credits:{
					enabled: false
				}
			};
			if(type=="pie" && _.isNotEmptyArray(chart_opts.series) && chart_opts.series.length>1){
				//delete chart_opts.colors; 
				this.adjustHighChartsPies(chart_opts, width, height);
			}
				
			return chart_opts;
		}
	},
	
	highChartsType: function(mode){
		// highcharts types: line, spline, area, areaspline, column, bar, pie, scatter
		if(!_.isNotEmptyString(mode))
            mode = this.mode();
        if(mode=="lines")
            return "line";
        else if(mode=="table")
            return null;
        else if(mode=="pie")
            return "pie";
        else // bars
            return "column";
	},
	
	highChartsXDim: function(){
		var x_dim = this.xDim();
		var split_dim = this.splitDim();
		if(x_dim=="time")
			return "time";
		else if(this.highChartsCompanySplit(x_dim, split_dim))
			return _.isNotEmptyString(split_dim) ? split_dim : x_dim;
		else
			return x_dim;
	},
	
	highChartsSplitDim: function(){
		var split_dim = this.splitDim();
		if(_.isNotEmptyString(split_dim)){
			var x_dim = this.xDim();
			return (x_dim=="companies") ? x_dim : split_dim;
		}
	},
	
	highChartsCompanySplit: function(x_dim, split_dim){
		if(!_.is(x_dim))
			x_dim = this.xDim();
		return (x_dim=="companies") ? _.isNotEmptyString(this.splitDim()) : false;
	},
	
	highChartsPieSplit: function(){
		return (this.highChartsType()=="pie" && ( this.highChartsSplitDim()=="companies" ));
	},
	
	
	highChartsX: function(){
		var x = this.highChartsXDim();
		var cats = new Array();
		if(this.highChartsCompanySplit()){
			var vals = this.dim(x);
			if(_.isNotEmptyArray(vals)){
				_.each(vals, function(val){
					cats.push(this.xValueLabel(val, x));
				}, this);
			}
		}
		else 
			cats = this.xValueLabels(x);
		return { title: this.xLabel(x), categories: cats };
	},
	
	highChartsY: function(){
		var ret = { 
			title: this.yLabel(),
		};
		var values = this.yValues();
		if(_.is(values)){
			var that = this;
			ret.formatter = function(){
				return that.yValueLabel(this.value);
			}
		}
		return ret;
	},
	
	highChartsColors: function(){
		var comp_if_poss = _.tryParse(this.prop("companies_colors_if_possible"), true, false); 
		if(comp_if_poss && _.include(this.dims(),"companies")){
			var comp = this.dim("companies");
			return _.isNotEmptyString(comp) ? [this.companyColor(comp)] : this.companiesColors();
		}
		else{
			var dim = this.highChartsSplitDim();
			if(_.is(dim))
				return this.dimColors(dim);
			else
				return this.dimColors(this.highChartsXDim());
		}
	},
	
	highChartsTooltip: function(){
		var that = this;
		var bg_var = that.bgVar();
		var x = this.highChartsXDim();
		var split = this.highChartsSplitDim();
		var chart_dims = this.dim_values;
		return {
			formatter: function(){
				breakpoint();
				var dim_vals = (_.isObject(this.point) && _.isNotEmptyString(this.point.id)) ? this.point.id.split("---") :
						( _.isNotEmptyString(this.id) ? this.id.split("---") : new Array() );
				var x_val = (dim_vals.length>0) ? dim_vals[0] : this.x;
				var split_val = (dim_vals.length>1) ? dim_vals[1] : this.series.name; // don't work on pies..
				var ret = ( "<span><i>"+that.yLabel()+"</i>:<b>"+bg_var.type().showValue(this.y)+" "+bg_var.um()+"</b>" );
				ret += ( "<br/><br/>"+that.xLabel(x)+":<b>"+that.xValueLabel(x_val, x)+"</b>" );
				if(_.isNotEmptyString(split))
					ret += ("<br/>"+that.splitLabel(split)+":<b>"+that.splitValueLabel(split_val, split)+"</b>");
				_.each(chart_dims, function(dim_val, dim_name){
					if(dim_name!=x && ((!_.isNotEmptyString(split)) || dim_name!=split))
						ret += ( "<br/>"+that.xLabel(dim_name)+": "+that.xValueLabel(dim_val, dim_name) );
				});
				ret += "</span>";
				return ret;
			}
		};
	},
	
	highChartsSeries: function(){
		var ret = new Array();
		
		// get data objects
		var bg_type = this.bgVar().type();
		var mode = this.mode();
		var x = this.highChartsXDim();
		var split = this.highChartsSplitDim();
		var vals = this.tableValues(x, split);
		var x_values = BG.bgDim(x).values();
		
		// chart configs and managements
		var splitted_pie = this.highChartsPieSplit();
		var splitted_companies = this.highChartsCompanySplit();
		var colors = null;
		if((x!="companies") && _.tryParse(this.prop("companies_colors_if_possible"), true, false))
			colors = this.companyColor();
		if(!_.is(colors))
			colors = this.dimColors( _.is(split) ? split : x );
		var sliced_pie = true;
		
		// chart series
		if(_.is(split)){
			_.each(vals, function(split_value, split_key){
				var row = {
					name: this.splitValueLabel(split_key)
				};
				
				var data = new Array();
				if(_.isNotEmptyArray(split_value)){
					_.each(split_value, function(splitted_value, index){
						var data_value = {
							id: (""+x_values[index]+"---"+split_key),
							name: this.xValueLabel(x_values[index], x),
							y: bg_type.numValue(splitted_value)
						};
						if(splitted_companies || (splitted_pie))
							data_value.color = this.companyColor(split_key);
						if(sliced_pie)
							data_value.sliced = true;
						data.push(data_value);
					}, this);
				}
				
				row.data = data;
				ret.push(row);
			}, this);
		}
		else if(_.isArray(vals)){
			var data = new Array();
			if(_.isNotEmptyArray(vals)){
				var on_comps = (x=="companies");
				_.each(vals, function(val, index){
					var data_value = {
						id: (""+x_values[index]),
						name: this.xValueLabel(x_values[index], x),
						y: bg_type.numValue(val)
					};
					if(on_comps)
						data_value.color = ( _.isNotEmptyArray(colors) ? (index<colors.length ? colors[index] : colors[0]) : colors );
					if(sliced_pie)
						data_value.sliced = true;
					data.push(data_value);
				}, this);
			}
			
			ret.push({
				name: "",
				data: data
			});
		}
		
		return ret;
	},
	
	adjustHighChartsPies: function(data, width, height){
		if(_.isNotEmptyArray(data.series) && data.series.length>1){
			var infos = this.multiplePositions(width, height, data.series.length);
			
			if(!_.is(data.plotOptions))
				data.plotOptions = {};
			if(!_.is(data.plotOptions.pie))
				data.plotOptions.pie = {};
			data.plotOptions.pie.size = infos.size;
			
			_.each(data.series, function(serie, index){
				serie.center = [ infos.w_centers[index], infos.h_center ];
				//serie.showInLegend = (index==0);
			}, this);
		}
	},
	
	
	
	
//////////////////////////////////////////////////////////////////////////////////////////////////////
//	GOOGLE VISUALIZATION (GOOGLE CHARTS)
/////////////////////////////////////////////////////////////////////////////////////////////////////
	
	
	visualizationChartType: function(mode){
        if(!_.isNotEmptyString(mode))
            mode = this.mode();
        if(mode=="lines")
            return "LineChart";
        else if(mode=="table")
            return "Table";
        else if(mode=="pie")
            return "PieChart";
        else // bars
            return "ColumnChart";
    },
    
    visualizationColors: function(){
    	var split = this.splitDim();
    	if(_.isNotEmptyString(split) && split=="companies"){
    		var ret = new Array();
    		var split_values = this.splitValues();
    		_.each(split_values, function(split_value){
    			ret.push(this.companyColor(split_value));
    		}, this);
    		return ret;
    	}
    	else{
    		var comp_if_poss = _.tryParse(this.prop("companies_colors_if_possible"), true, false); 
    		if(comp_if_poss){
    			var comp = this.dim("companies");
    			if(_.isNotEmptyString(comp)) 
    				return [this.companyColor(comp)];
    		}
    		return this.rowColors();
    	}
    },

	// Get chart values for Google Visualization
	visualizationDataTable: function(){
		var cols = this.columns();
		var rows = this.rows();
		
		var bg_var = this.bgVar();
		var bg_type = bg_var.type();
		var value_type = "number"; /*bg_var.jsType();
		if(value_type=="boolean")
			value_type="string";*/
		var values_name = bg_var.name();
		
		var x_label = this.xLabel();
		var x_labels = this.xValueLabels();
		var split_label = this.splitLabel();
		var split_labels = this.splitValueLabels();
		
		/*
		var split_dim = this.splitDim();
		var split_values = this.internalSplitValues();
		if(this.companySplit()){
			split_dim = "companies";
			
			var temp = x_label;
			x_label = split_label;
			split_label = temp;
			
			x_labels = this.splitValueLabels();
			split_values = BG.companies();
		}
		*/
		
		var values = this.values();
		
		
		// Visualization takes a row for each value, and the columns are: 1) labels, 2) one for each x value, 3) splitted values
		var v = {}; 
		v.cols = new Array();
		v.rows = new Array();
		
		// visualization columns
		
		v.cols.push( { id: "x_labels", label: x_label, type: "string" } );
		
		/*if(this.companySplit()){*/
			if(_.isNotEmptyArray(split_labels)){
				for(var i=0; i<split_labels.length; i++){
					v.cols.push( { id: ("y_split_"+i), label: split_labels[i], type: value_type } );
				}
			}
			else
				v.cols.push( { id: "y_values", label: values_name, type: value_type } );
		/*}
		else{
			if(_.isNotEmptyArray(x_labels)){
				for(var i=0; i<x_labels.length; i++){
					v.cols.push( { id: ("y_"+x_labels[i]), label: x_labels[i], type: value_type } );
				}
			}
		}*/
		
		
		// visualization rows
		if(_.isNotEmptyArray(cols)){
			_.each(cols, function(col){
				v.rows.push( { c: [ { v: col } ] } );
			}, this);
		}
		else
			v.rows.push( { c: [ { v: cols } ] } );
		
		_.each(rows, function(row){
			var pos = 0;
			_.each(v.rows, function(v_row){
				v_row.c.push( { v: bg_type.numValue(row[pos]), f: bg_type.showValue(row[pos]) } );
				pos++;
			}, this);
		}, this);
		
		_.log("Visualization object: "+_.toStr(v));
		
		/*
		v.rows = new Array();
		_.each(x_labels, function(x_label){
			var row_obj = { c: new Array() };
			row_obj.c.push( { v: x_label } );
			v.rows.push(row_obj);
		}, this);
		for(var i=1; i<v.cols.length; i++){
			_.each(v.rows, function(v_row){
				v_row.c.push( {  } );
			}, this);
		}
		*/
		
		return v;
	}    
    
	
});











