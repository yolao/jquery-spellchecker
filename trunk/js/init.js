/*
 *
 * Filename:	init.js
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
	
	// cache images
	var images = [
		[,"img/spellchecker/shadow.png"],
		[,"img/ajax-loader.gif"]
	];
	for(var i=0;i<images.length;i++){
		images[i][0] = new Image();
		images[i][0].src = images[i][1];
	}
	
	// initiate the tabs
        $("#main, #tabs").tabs();

	// accordian links toggle
	$("a.accordian").each(function(){
		$(this).click(function(e){
			e.preventDefault();
			$("#"+this.href.replace(/[^#]+#/, '')).animate({height:"toggle",opacity:"toggle"}, 560, "jswing");
		});
	});

	
	// initiate the spell checker
	Spelling.init("content");
			
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

});

/* end of file */
