var ajaxStart = true;

$(document).ready(function(){

	$(document).ajaxStart(function(){
		ajaxStart = false;
	});

	$(document).ajaxStop(function() {
		ajaxStart = true;
	});

});