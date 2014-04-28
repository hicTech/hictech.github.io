if(navigator.userAgent.indexOf("iPad") != -1 || navigator.userAgent.indexOf("iPhone") != -1  ){
	console.timers = {};
	console.time = function(label){
	  console.timers[label] = new Date().getTime();
	};
	console.timeEnd = function(label){
	   console.log(label+": "+(new Date().getTime()-console.timers[label]));
	};
}