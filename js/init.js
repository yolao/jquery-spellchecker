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
	$("#tabs a").click(function(){
		(/textarea\-example/.test(this.href)) && $("#text-content").focus();
		$("#content").spellcheck("remove");
	});

	// accordian links toggle
	$("a.accordian").each(function(){
		$(this).click(function(e){
			e.preventDefault();
			$("#"+this.href.replace(/[^#]+#/, '')).animate({height:"toggle",opacity:"toggle"}, 560, "jswing");
		});
	});
			
	// check the spelling
	$("#check-html").click(function(e){
		e.preventDefault();
		if ($(this).html().match(/^remove/i)) {
			$("#content").spellcheck("remove");
			$(".center", this).html("Check Spelling");
		} else {
			$(".loading").show();
			var button = this;
			$("#content").spellcheck();
			$("#content").spellcheck("check");
			//.check($("#content"), function(){
				$(".center", button).html("Remove Spelling");			
				$(".loading").hide();
			//});					
		}
	});	
	// check the spelling on a textarea
	$("#check-textarea").click(function(e){
		e.preventDefault();
		$(".loading").show();
		Spelling.check($("#text-content"), function(){
			$(".loading").hide()
		});
	});	
	// check the spelling on a form
	$("#check-form-spelling").click(function(e){
		e.preventDefault();
		this.blur();
		var $this = $(this);
		if ($this.hasClass("speller-icon-selected")) {
			$this.removeClass("speller-icon-selected");
			Spelling.remove();
		} else {
			$(this).addClass("speller-icon-selected");
			// pass in form id
			Spelling.check($("#contact-form"), function(){
				$(".loading").hide();
			});
		}
	});	
	$("#contact-form").submit(function(e){
		alert('hello');
	});	
			
	// remove the spell checker formatting
	$("#remove").click(function(){
		Spelling.remove();
	});

});

/* end of file */
