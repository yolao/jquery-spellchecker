/*
 * 
 * jquery.spellchecker.js - a simple jQuery Spell Checker
 * Copyright (c) 2009 Richard Willis
 * MIT license  : http://www.opensource.org/licenses/mit-license.php
 * Project      : http://jquery-spellchecker.googlecode.com
 * Contact      : willis.rh@gmail.com
 *
 */

(function($){

	$.fn.extend({
		
		spellchecker : function(options, callback){
			return this.each(function(){
				if ($(this).data('spellchecker') && $(this).data("spellchecker")[options]){
					$(this).data("spellchecker")[options](callback);
				} else {
					$(this).data('spellchecker', new SpellChecker(this, (options && options.constructor === Object) && options || null));
					(options && options.constructor == String) && $(this).data("spellchecker")[options](callback);
				}
			});
		}
	});

	var SpellChecker = function(domObj, options) {
		this.options = $.extend({
			url: "checkspelling.php",	// default spellcheck url
			lang: "en",			// default language 
			engine: "pspell",		// pspell or google
			wordlist: {
				action: "after",	// method of inserting wordlist into dom
				element: domObj		// which object to apply abover method
			},
			suggestBoxPosition: "bottom"	// default position of suggest box; top or bottom
		}, options || {});
		this.$domObj = $(domObj);
		this.elements = {};
		this.init();
	};

	SpellChecker.prototype = {

		init : function(){
			var self = this;
			this.createElements();
			this.$domObj.addClass("spellcheck-container");
			// hide the suggest box on document click
			$(document).bind("click", function(e){
				if (!$(e.target).hasClass(".spellcheck-word-highlight") && !$(e.target).parents().filter(".spellcheck-suggestbox").length) {
					self.hideBox();
				}
			});
		},

		// checks a chunk of text for bad words, then either shows the words below the original element (if texarea) or highlights the bad words
		check : function(callback){

			var self = this, node = this.$domObj.get(0).nodeName, 
			tagExp = '<[^>]+>', 
			puncExp = '^[^a-zA-Z0-9_\\u00A1-\\uFFFF]|[^a-zA-Z0-9_\\u00A1-\\uFFFF]+[^a-zA-Z0-9_\\u00A1-\\uFFFF]|[^a-zA-Z0-9_\\u00A1-\\uFFFF]$|\\n|\\t|\\s{2,}';
		
			if (node == "TEXTAREA" || node == "INPUT") {
				this.type = 'textarea';
				var text = $.trim(
					this.$domObj.val()
					.replace(new RegExp(tagExp, "g"), "")	// strip html tags
					.replace(new RegExp(puncExp, "g"), " ") // strip punctuation
				);
				this.postJson(this.options.url, {
					text: encodeURIComponent(text).replace(/%20/g, "+"), 
					lang: this.options.lang
				}, function(json){
					self.buildBadwordsBox(json, callback);
				});
			} else {
				this.type = 'html';
				var text = $.trim(
					this.$domObj.text()
					.replace(new RegExp(puncExp, "g"), " ") // strip punctuation
				);
				this.postJson(this.options.url, {
					text: encodeURIComponent(text).replace(/%20/g, "+"),
					lang: this.options.lang
				}, function(json){
					self.highlightWords(json, callback);
				});
			}
		},

		highlightWords : function(json, callback) {
			if (!json.length) { callback(true); return; }

			var self = this, html = this.$domObj.html();

			$.each(json, function(key, replaceWord){
				html = html.replace(
					new RegExp("\\b("+replaceWord+")\\b", "g"),
					'<span class=\"spellcheck-word-highlight\">$1</span>'
				);
			});
			this.$domObj.html(html);
			$(".spellcheck-word-highlight", this.domObj).click(function(){
				self.suggest(this);
			});
			(callback) && callback();
		},

		buildBadwordsBox : function(json, callback){
			if (!json.length) { callback(true); return; }

			var self = this, words = [];

			// insert badwords list into dom
			if (!$("#spellcheck-badwords").length) {
				$(this.options.wordlist.element)[this.options.wordlist.action](this.elements.$badwords);
			}
			// empty the badwords container
			this.elements.$badwords.empty()
			// append incorrectly spelt words
			$.each(json, function(key, badword) {
				if ($.inArray(badword, words) === -1) {
					$('<span class="spellcheck-word-highlight">'+badword+'</span>')
						.click(function(){ self.suggest(this); })
						.appendTo(self.elements.$badwords)
						.after("<span class=\"spellcheck-sep\">,</span> ");
					words.push(badword);
				}
			});
			$(".spellcheck-sep:last", self.elements.$badwords).addClass("spellcheck-sep-last");
			(callback) && callback();
		},

		// gets a list of suggested words, appends to the suggestbox and shows the suggestbox
		suggest : function(word){

			var self = this, $word = $(word), offset = $word.offset();
			this.$curWord = $word;
		
			this.elements.$suggestFoot.hide();	
			this.elements.$suggestWords.html('<em>Loading..</em>');
			this.elements.$suggestBox
			.css({
				width : "auto",
				left : offset.left + "px",
				top : 
					(this.options.suggestBoxPosition == "top" ?
					(offset.top - ($word.outerHeight() + 10)) + "px" :
					(offset.top + $word.outerHeight()) + "px")
			}).fadeIn(200);		

			this.postJson(this.options.url, {
				suggest: encodeURIComponent($.trim($word.text())), 
				lang: this.options.lang
			}, function(json){
				self.buildSuggestBox(json, offset);
			});
		},

		buildSuggestBox : function(json, offset){

			var self = this, $word = this.$curWord;

			this.elements.$suggestFoot.show();
			this.elements.$suggestWords.empty();

			// build suggest word list
			for(var i=0; i < (json.length < 5 ? json.length : 5); i++) {
				this.elements.$suggestWords.append(
					$('<a href="#">'+json[i]+'</a>').addClass((!i?'first':''))
					.click(function(e){
						e.preventDefault();
						self.replace(this.innerHTML);
					})
				);
			}								

			// no word suggestions
			(!i) && this.elements.$suggestWords.append('<em>(no suggestions)</em>');

			// get browser viewport height
			var viewportHeight = window.innerHeight ? window.innerHeight : $(window).height();
						
			// position the suggest box
			self.elements.$suggestBox
			.css({
				top :	(this.options.suggestBoxPosition == "top") ||
					(offset.top + $word.outerHeight() + this.elements.$suggestBox.outerHeight() > viewportHeight + 10) ?
					(offset.top - (this.elements.$suggestBox.height()+5)) + "px" : 
					(offset.top + $word.outerHeight() + "px"),
				width : "auto",
				left :	(this.elements.$suggestBox.outerWidth() + offset.left > $("body").width() ? 
					(offset.left - this.elements.$suggestBox.width()) + $word.outerWidth()+"px" : 
					offset.left+"px")
			});
		},

		// hides the suggest box	
		hideBox : function(callback) {
			this.elements.$suggestBox.fadeOut(250, function(){
				(callback != undefined) && callback();
			});				
		},
	
		// replace incorrectly spelt word with suggestion
		replace : function(replace) {
			this.hideBox();
			switch(this.type) {
				case "textarea": this.replaceTextbox(replace); break;
				case "html" : this.replaceHtml(replace); break;
			}
		},

		// replace word in a textarea
		replaceTextbox : function(replace){
			this.removeBadword(this.$curWord);
			this.$domObj.val(this.$domObj.val().replace(new RegExp("\\b"+this.$curWord.text()+"\\b", "ig"), replace));
		},

		// replace word in an HTML container
		replaceHtml : function(replace){
			$('.spellcheck-word-highlight:contains('+this.$curWord.text()+')', this.$domObj).after(replace).remove();
		},
		
		// remove spelling formatting from word to ignore in original element
		ignore : function() {
			this.hideBox();
			if (this.type == "textarea") {
				this.removeBadword(this.$curWord);
			} else {
				this.$curWord.after(this.$curWord.html()).remove();
			}
		},
		
		// remove seplling formatting from all words to ignore in original element
		ignoreAll : function() {
			var self = this;
			this.hideBox();
			if (this.type == "textarea") {
				this.removeBadword(this.$curWord);
			} else {
				$(".spellcheck-word-highlight", this.$domObj).each(function(){
					(new RegExp(self.$curWord.text(), "i").test(this.innerHTML)) && $(this).after(this.innerHTML).remove(); // remove anchor
				});
			}
		},

		removeBadword : function($domObj){
			($domObj.next().hasClass("spellcheck-sep")) && $domObj.next().remove();
			$domObj.remove();
			if (!$(".spellcheck-sep", this.elements.$badwords).length){
				this.remove();
			} else {
				$(".spellcheck-sep:last", this.elements.$badwords).addClass("spellcheck-sep-last");
			}
		},
		
		// add word to personal dictionary (pspell only)
		addToDictionary : function() {
			var self= this;
			this.hideBox(function(){
				confirm("Are you sure you want to add the word \""+self.$curWord.text()+"\" to the dictionary?") &&
				self.postJson(self.options.url, {addtodictionary: self.$curWord.text()}, function(){
					self.ignoreAll();
					self.check();
				});			
			});
		},
		
		// remove spell check formatting
		remove : function() {
			$(".spellcheck-word-highlight").each(function(){
				$(this).after(this.innerHTML).remove()
			});
			$("#spellcheck-badwords").remove();
			$(this.domObj).removeClass("spellcheck-container");
			this.elements.$suggestBox.remove();
			$(this.domObj).data('spellchecker', null);
		},
		
		// sends post request, return JSON object
		postJson : function(url, data, callback){
			var xhr = $.ajax({
				type : "POST",
				url : url,
				data : $.extend(data, {engine: this.options.engine}),
				dataType : "json",
				cache : false,
				error : function(XHR, status, error) {
					alert("Sorry, there was an error processing the request.");
				},
				success : function(json){
					(callback) && callback(json);
				}
			});
			return xhr;
		},

		// creates the suggestbox and stores the elements in an array for later use
		createElements : function(){
			var self = this;
			this.elements.$suggestWords = 
				$('<div></div>').addClass("spellcheck-suggestbox-words");
			this.elements.$ignoreWord = 
				$('<a href="#">Ignore Word</a>')
				.click(function(e){
					e.preventDefault();
					self.ignore();
				});
			this.elements.$ignoreAllWords = 
				$('<a href="#">Ignore all</a>')
				.click(function(e){
					e.preventDefault();
					self.ignoreAll();
				});
			this.elements.$ignoreWordsForever = 
				$('<a href="#" title="ignore word forever (add to dictionary)">Ignore forever</a>')
				.click(function(e){
					e.preventDefault();
					self.addToDictionary();
				});
			this.elements.$suggestFoot = 
				$("<div></div>")
				.addClass("spellcheck-suggestbox-foot")
				.append(this.elements.$ignoreWord)
				.append(this.elements.$ignoreAllWords)
				.append(this.options.engine == "pspell" ? this.elements.$ignoreWordsForever : false);
			this.elements.$badwords = 
				$('<div id="spellcheck-badwords"></div>');
			this.elements.$suggestBox = this.elements.$suggestBox ||  
				$("<div></div>")
				.addClass("spellcheck-suggestbox")
				.append(this.elements.$suggestWords)
				.append(this.elements.$suggestFoot)
				.prependTo("body");
		}
		
	};	

})(jQuery);
