/*
 * @filename:	init.js
 * @auth:	richard willis
 */

(function($){

	// if the index.html document is viewed via subversion in google code, then re-direct to demo page
	if (/jquery-spellchecker\.googlecode\.com/.test(window.location.hostname) && /svn/.test(window.location)) {
		window.location = 'http://spellchecker.jquery.badsyntax.co.uk/';
		return false;
	}
	
	// initiate the select menu plugin
	$('select').selectmenu({
		width: 100,
		menuWidth: 100,
		style: "dropdown"
	});

	// initiate the tabs
	$("#tabs").tabs();

	// initiate pretty print syntax highlighter
	prettyPrint();

	// accordian links toggle
	$("a.accordian").each(function(){
		$(this).click(function(e){
			e.preventDefault();
			$("#"+this.href.replace(/[^#]+#/, '')).animate({height: "toggle", opacity: "toggle"}, 560, "jswing");
		});
	});
			
	// check the spelling on element
	$("#check-html").click(function(e){
		e.preventDefault();
		var self = this;
		
		if (/^remove/.test($(this).html())) {
			$("#content").spellchecker("remove");
			$(this).html("Check Spelling");
		} else {
			$(".loading").show();

			$("#content")
			.spellchecker({
				engine: $("#service").val()
			})
			.spellchecker("check", function(result){
				$(self).html("Remove Spelling");			
				// spell checker has finished checking words
				$(".loading").hide();
				// if result is true then there are no badly spelt words
				if (result) {
					alert('There are no incorrectly spelt words.');
				}
			});					
		}
	});	

	// check the spelling on a textarea
	$("#check-textarea").click(function(e){
		e.preventDefault();
		$(".loading").show();
		
		if ($("#spellcheck-badwords").length) {
			$("#text-content").spellchecker("remove");
		}
		$("#text-content")
		.spellchecker({
			engine: $("#textarea-service").val(),
			lang: $("#textarea-lang").val(),
			suggestBoxPosition: "above"
		})
		.spellchecker("check", function(result){
			// spell checker has finished checking words
			$(".loading").hide();
			// if result is true then there are no badly spelt words
			if (result) {
				alert('There are no incorrectly spelt words.');
			}
		});
	});	


})(jQuery);
