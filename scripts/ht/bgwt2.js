
BGwt = {
	
		
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//											INVOCATI DA JS VERSO GWT 
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		
		
		
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//											INVOCATI DA GWT VERSO JS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		
		
	/* mode: "" o null, "popup", "in_game" */	
	startLoading: function(message, mode){
		BGwt.log("startLoading ("+message+", "+mode+")");
	},
	
	/* mode: "" o null, "popup", "in_game" */	
	stopLoading: function(mode){
		BGwt.log("stopLoading ("+mode+")");
	},
	
	
	
	simulatorLoaded: function(){
		BGwt.log("Simulator loaded!");
	},
	gamePropsLoaded: function(game_info){
		BGwt.log("Game Properties loaded!");
	},
	/*
	reportLoaded: function(){
		BGwt.log("Reports loaded!");
	},
	*/
	xmlLoaded: function(){
		BGwt.log("XML loaded!");
	},
	gameLoaded: function(game_info_json,game_props_json){
		BGwt.log("Game loaded!");
		BgStudio.start(game_info_json,game_props_json);
		if(_.isFunction(window.bgOn))
			window.bgOn();
	},
	
	
	
	getJSessionId: function(){
		var query=location.href;
		var ret="";
		var cerca="jsessionid=";
		//alert("Query:"+query);
		if(query.indexOf(cerca)>0){
			var pos=query.indexOf(cerca)+cerca.length;
			return query.substring(pos,query.length);
		}
		else
			return "via-cookie";
	},
	
	
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//												UTILITA' 
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	
	log: function(message){
		if(!!console)
			console.log(message);
	}
		
};
