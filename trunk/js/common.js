/*
 *
 * Filename:	common.js
 * Developer:	Richard Willis
 *
 */

$(function(){
	// FF2/Mac Opacity Bug
	($.browser.mozilla && parseFloat($.browser.version) < 1.9 && 
	navigator.appVersion.indexOf('Mac') !== -1) && 
	$('body').css('-moz-opacity',.999);
	
	// IE6 css background image (flicker on hover) bug
	(!$.browser.msie) && (function(){
		try{document.execCommand('BackgroundImageCache', false, true);}
		catch(e){};
	})();
	
	// initiate the spell checker
	Spelling.init("content");
			
	// preload the speller shadow imagecd 
	var loader = new Image();
	loader.src = "img/spellchecker/shadow.png";
		
	// check the spelling
	$("#check").click(function(e){
		e.preventDefault();
		if ($(this).html().match(/^remove/i)) {
			Spelling.remove();
			$(".center", this).html("Check Spelling");
		} else {
			$(".loading").show();
			var button = this;
			Spelling.check(function(){
				$(".center", button).html("Remove Spelling");			
				$(".loading").hide();
			});					
		}
	});			
			
	// remove the spell checker formatting
	$("#remove").click(function(){
		Spelling.remove();
	});


	// initiate the tabs
        $("#main, #tabs").tabs();
});
			

/* end of file */
