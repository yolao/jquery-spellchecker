/*
 * Filename:	init.js
 * Developer:	Richard Willis
 */

(function($){
	
	// initiate the tabs
	$("#tabs").tabs();

	// accordian links toggle
	$("a.accordian").each(function(){
		$(this).click(function(e){
			e.preventDefault();
			$("#"+this.href.replace(/[^#]+#/, '')).animate({height:"toggle",opacity:"toggle"}, 560, "jswing");
		});
	});
			
	// check the spelling on element
	$("#check-html").click(function(e){
		e.preventDefault();
		if ($(this).html().match(/^remove/i)) {
			$("#content").spellcheck("remove");
			$(this).html("Check Spelling");
		} else {
			$(".loading").show();
			var self = this;

			$("#content").spellcheck("check", function(result){
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

		$("#text-content").spellcheck("check", function(result){
			// spell checker has finished checking words
			$(".loading").hide();
			// if result is true then there are no badly spelt words
			if (result) {
				alert('There are no incorrectly spelt words.');
			}
		});
	});	

})(jQuery);
