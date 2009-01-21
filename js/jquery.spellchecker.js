/*
 * 
 * jquery.spellchecker.js - a simple jQuery Spell Checker
 * Copyright (c) 2008 Richard Willis
 * MIT license  : http://www.opensource.org/licenses/mit-license.php
 * Project      : http://jquery-spellchecker.googlecode.com
 * Contact      : willis.rh@gmail.com
 *
 */

var Spelling = {

	rpc : "checkspelling.php",
	engine : "google", // pspell || google
	$container : {}, $curWord : {},	$suggestBox : {}, $suggestWords : {}, $suggestFoot : {}, suggestShow : false,
	
	init : function(containerID){
		Spelling._url = Spelling.rpc+"?engine="+Spelling.engine;
		Spelling.$container = $("#"+containerID);	
		Spelling.$suggestWords = $('<div id="suggestwords"></div>');
		Spelling.$suggestFoot = $(
			'<div id="suggestfoot" class="foot">'+
			'<a title="ignore word" href="javascript:;" onmousedown="Spelling.ignore()">Ignore word</a>'+
			'<a title="ignore all words" href="javascript:;" onmousedown="Spelling.ignoreAll()">Ignore all</a>'+
			(Spelling.engine=="pspell"?
			'<a title="ignore word forever (add to dictionary)" href="javascript:;" onmousedown="Spelling.addToDictionary()">Ignore forever</a>':'')
		+'</div>');
		Spelling.$suggestBox = 
		$('<div id="suggestbox" class="suggestDrop"></div>')
		.append(Spelling.$suggestWords)
		.append(Spelling.$suggestFoot)
		.prependTo("body");	
	},

	// check chunk of text for incorrectly spelt words
	check : function(callback){
		Spelling.remove();	
		
		var 
			html = Spelling.$container.html(),
			text = $.trim(Spelling.$container.text()
			// remove punctuation and special characters
			.replace(/^[^\w]|[^\w]+[^\w]|\n|\t|\s{2,}/g, " "));

		$.ajax({
			type : "POST",
			url : Spelling._url,
			data : 'text='+text,
			dataType : "json",
			error : function(XHR, status, error) {
				alert("There was an error processing the request.\n\n"+XHR.responseText);
			},
			success : function(json){
				if (!json.length) {
					alert('There are no incorrectly spelt words :)');
				} else {
					// highlight bad words
					$text = "";
					for(var badword in json) {
						var replaceWord = Spelling.engine=='pspell' ? json[badword] : text.substr(json[badword][0], json[badword][1]);
						// we only want unique word replacements
						if (!new RegExp(replaceWord, "i").test($text)) {
							$text += replaceWord+" ";
							html = html.replace(
								new RegExp("\\b("+replaceWord+")\\b", "ig"), 
								'<span onclick=\"Spelling.suggest(this);\" class=\"badspelling\">$1</span>'
							);
						}
					}							
				}
				Spelling.$container.html(html);	
				// execute callback function, if any
				(callback != undefined) && callback(); 
			}
		});
	},
	
	// build & show word suggestion box 
	suggest : function(wordobj) {
		Spelling.$suggestFoot.hide();	
		Spelling.$curWord = $(wordobj);
		
		Spelling.$suggestWords.empty().append('<em>Loading..</em>');
		var offset = Spelling.$curWord.offset();

		// show the loading message
		Spelling.$suggestBox
		.css({
			width : Spelling.$suggestBox.outerWidth() < Spelling.$curWord.outerWidth() ? Spelling.$curWord.innerWidth()+"px" : "auto",
			left : offset.left+"px",
			top : (offset.top + Spelling.$curWord.outerHeight()) + "px"
		}).fadeIn(200);		

		Spelling.suggestShow = true;		
		setTimeout(function(){
			$("body").bind("click", function(){
				$(this).unbind();
				!Spelling.suggestShow && Spelling.$suggestBox.fadeOut(250);				
			});
		}, 1);
		setTimeout(function(){
			Spelling.suggestShow = false;
		}, 2);		
		
		$.ajax({
			type : "POST",
			url : Spelling._url,
			data : "suggest="+wordobj.innerHTML,
			dataType : "json",
			error : function(XHR, status, error) {
				alert("There was an error processing the request.\n\n"+XHR.responseText);
			},
			success : function(json){			
				// build suggest word list
				Spelling.$suggestWords.empty();
				for(var i=0;i<(json.length<5?json.length:5);i++) {
					Spelling.$suggestWords.append('<a href="javascript:;" '+(!i?'class="first" ':'')+'onmousedown="Spelling.replace(this)">'+json[i]+'</a>');
				}								
				// no suggestions
				!i && Spelling.$suggestWords.append('<em>(no suggestions)</em>');
							
				// show the suggested words
				Spelling.$suggestFoot.show();
				Spelling.$suggestBox
				.css({
					width : Spelling.$suggestBox.outerWidth() < Spelling.$curWord.outerWidth() ? Spelling.$curWord.innerWidth()+"px" : "auto",
					left : Spelling.$suggestBox.outerWidth()+offset.left > $("body").width() ? (offset.left-Spelling.$suggestBox.width())+Spelling.$curWord.outerWidth()+"px" : offset.left+"px"
				});				
			}
		});
	},
	
	// ignore this word
	ignore : function() {
		Spelling.$curWord.after(Spelling.$curWord.html()).remove();
	},
	
	// ignore all words in this chunk of text
	ignoreAll : function() {
		$("span.badspelling", Spelling.$container).each(function(){
			(new RegExp(Spelling.$curWord.html(), "i").test(this.innerHTML)) && $(this).after(this.innerHTML).remove(); // remove anchor
		});
	},
	
	// add word to personal dictionary (pspell only)
	addToDictionary : function() {
		confirm("Are you sure you want to add \""+Spelling.$curWord.html()+"\" to the dictionary?") &&
		$.ajax({
			type : "POST",
			url : Spelling._url,
			data : 'addtodictionary='+Spelling.$curWord.html(),
			dataType : "json",
			error : function(XHR, status, error) {
				alert("There was an error processing the request.\n\n"+XHR.responseText);
			},
			success: Spelling.check
		});			
	},
	
	// replace incorrectly spelt word with suggestion
	replace : function(replace) {
		Spelling.$curWord.after(replace.innerHTML).remove();
	},
	
	// remove spell check formatting
	remove : function() {
		$("span.badspelling", Spelling.$container).each(function(){
			$(this).after(this.innerHTML).remove()
		});
	}

};
