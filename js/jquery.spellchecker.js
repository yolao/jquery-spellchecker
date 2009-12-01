/*
 * 
 * jquery.spellchecker.js - a simple jQuery Spell Checker
 * Copyright (c) 2008 Richard Willis
 * MIT license  : http://www.opensource.org/licenses/mit-license.php
 * Project      : http://jquery-spellchecker.googlecode.com
 * Contact      : willis.rh@gmail.com
 *
 */

(function($){

	$.fn.extend({
		
		spellcheck : function(options, callback){

			return this.each(function(){

				if ($(this).data('spellchecker') && $(this).data("spellchecker")[options]){
					$(this).data("spellchecker")[options](callback);
				} else {
					$(this).data('spellchecker', new SpellChecker(this, options.constructor === Object && options || null));
					(options.constructor == String) && $(this).data("spellchecker")[options](callback);
				}
			});

		}
	});

	var SpellChecker = function(domObj, options) {
		this.domObj = domObj;
		this.options = $.extend({
			rpc: "checkspelling.php",
			engine: "google" // pspell or google
		}, options || {});
		this.options.url = this.options.rpc+"?engine="+this.options.engine;
		this.elements = {};
		this.init();
	};

	SpellChecker.prototype = {

		init : function(){
			this.createElements();
		},

		createElements : function(){
			var self = this;
			this.elements.$suggestWords = 
				$("<div></div>").attr({id: "suggestwords"});
			this.elements.$ignoreWord = 
				$("<a></a>").attr({ title: "ignore word", href: "#" })
				.mousedown(function(){self.ignore();}).text("Ignore word");
			this.elements.$ignoreAllWords = 
				$("<a></a>").attr({ title: "ignore all words", href: "#"})
				.mousedown(function(){self.ignoreAll();}).text("Ignore all");
			this.elements.$ignoreWordsForever = 
				$("<a></a>").attr({title: "ignore word forever (add to dictionary)", href: "#"})
				.mousedown(function(){self.addToDictionary;}).text("Ignore forever");
			this.elements.$suggestFoot = 
				$("<div></div>").attr({id: "suggestfoot", class: "foot"})
				.append(this.elements.$ignoreWord)
				.append(this.elements.$ignoreAllWords)
				.append(this.elements.$ignoreWordsForever);
			this.elements.$suggestBox = 
				$("<div></div>").attr({id: "suggestbox", class: "suggestDrop"})
				.append(this.elements.$suggestWords)
				.append(this.elements.$suggestFoot)
				.prependTo("body");
		},

		check : function(callback){

			var self = this, node = this.domObj.nodeName, text, html;

			text = $.trim(((node != "TEXTAREA" && node != "INPUT") ? 
				$(this.domObj).text() : 
				$(this.domObj).val()).replace(/^\W|[\W]+\W|\W$|\n|\t|\s{2,}/g, " "));

			html = (node != "TEXTAREA" && node != "INPUT") ? 
				$(this.domObj).html() : 
				$(this.domObj).val().replace(/\n/g, "<br />");

			if (node == "TEXTAREA") {
				this.type = 'textarea';
				this.checkText(text, function(json){
					if (!self.elements.$badwords) {
						self.elements.$badwords = $("<div></div>").attr("id", "spellcheck-badwords");
						$(self.domObj).after(self.elements.$badwords);
					} else {
						self.elements.$badwords.html("");
					}
					for(var badword in json) {
						$("<span></span>")
						.addClass("spellcheck-badspelling")
						.text(self.options.engine == 'pspell' ? json[badword] : text.substr(json[badword][0], json[badword][1]))
						.appendTo(self.elements.$badwords);
					}
					$(".spellcheck-badspelling", self.elements.$badwords).click(function(){
						self.suggest(this);
					}).after(", ");
					(callback) && callback();
				});
			} else {
				this.type = 'html';
				this.checkText(text, function(json){
					var replace = "";
					// highlight bad words
					for(var badword in json) {
						var replaceWord = self.options.engine == 'pspell' ? json[badword] : text.substr(json[badword][0], json[badword][1]);
						// we only want unique word replacements
						if (!new RegExp(replaceWord, "i").test(replace)) {
							replace += replaceWord;
							html = html.replace(
								new RegExp("\\b("+replaceWord+")\\b", "ig"),
								'<span class=\"spellcheck-badspelling\">$1</span>'
							);
						}
					}							
					$(self.domObj).html(html);
					$(".spellcheck-badspelling", self.domObj).click(function(){
						self.suggest(this);
					});
					(callback) && callback();
				});
			}
			$(document).bind("click", function(e){
				if (!$(e.target).hasClass(".spellcheck-badspelling") && !$(e.target).parents().filter(".suggestDrop").length) {
					self.hideBox();
				}
			});
		},

		suggest : function(domObj){

			var self = this, $domObj = $(domObj), offset = $domObj.offset();
			this.$curWord = $(domObj);
		
			this.elements.$suggestFoot.hide();	
			this.elements.$suggestWords.html('<em>Loading..</em>');
			this.elements.$suggestBox
			.css({
				width : this.elements.$suggestBox.outerWidth() < $domObj.outerWidth() ? $domObj.innerWidth()+"px" : "auto",
				left : offset.left+"px",
				top : (offset.top + $domObj.outerHeight()) + "px"
			}).fadeIn(200);		

			this.getWordSuggestions($.trim($domObj.text()), function(json){
				// build suggest word list
				self.elements.$suggestWords.empty();
				for(var i=0;i<(json.length<5?json.length:5);i++) {
					var $replaceWord = $("<a></a>").attr({href: "#",class: (!i?'first':'')}).mousedown(function(){self.replace(domObj, this);}).text(json[i]);
					self.elements.$suggestWords.append($replaceWord);
				}								
				// no suggestions
				(!i) && self.elements.$suggestWords.append('<em>(no suggestions)</em>');
							
				// show the suggest box
				self.elements.$suggestFoot.show();
				self.elements.$suggestBox
				.css({
					width : self.elements.$suggestBox.outerWidth() < $domObj.outerWidth() ? $domObj.innerWidth()+"px" : "auto",
					left : self.elements.$suggestBox.outerWidth() + offset.left > $("body").width() ? 
						(offset.left - self.elements.$suggestBox.width()) + $domObj.outerWidth()+"px":offset.left+"px"
				});				

			});
		},

		checkText : function(text, callback){
			var self = this,
			xhr = $.ajax({
				type : "POST",
				url : this.options.url,
				data : 'text='+text,
				dataType : "json",
				error : function(XHR, status, error) {
					alert("Sorry, there was an error processing the request.");
				},
				success : function(json){
					if (!json.length) {
						$(".loading").hide();
						alert('There are no incorrectly spelt words :)');
					} else {
						(callback) && callback(json);
					}
				}
			});
			return xhr;
		},

		getWordSuggestions : function(text, callback) {
			var self = this,
			xhr = $.ajax({
				type : "POST",
				url : this.options.url,
				data : "suggest="+text,
				dataType : "json",
				error : function(XHR, status, error) {
					alert("Sorry, there was an error processing the request.");
				},
				success : function(json){			
					(callback) && callback(json);
				}
			});
			return xhr;
		},
		
		// hides the suggest box	
		hideBox : function(callback) {
			this.elements.$suggestBox.fadeOut(250, function(){
				(callback != undefined) && callback();
			});				
		},
	
		// replace incorrectly spelt word with suggestion
		replace : function(domObj, replace) {
			this.hideBox();
			$(domObj).after(replace.innerHTML).remove();
		},
		
		// build & show word suggestion box 
		ignore : function() {
			this.$curWord.after(this.$curWord.html()).remove();
			this.hideBox();
		},
		
		// ignore all words in this chunk of text
		ignoreAll : function() {
			var self = this;
			$("span.spellcheck-badspelling", self.domObj).each(function(){
				(new RegExp(self.$curWord.html(), "i").test(this.innerHTML)) && $(this).after(this.innerHTML).remove(); // remove anchor
			});
			this.hideBox();
		},
		
		// add word to personal dictionary (pspell only)
		addToDictionary : function() {
			var self= this;
			this.hideBox(function(){
				confirm("Are you sure you want to add the word \""+this.$curWord.html()+"\" to the dictionary?") &&
				$.ajax({
					type : "POST",
					url : self.options.url,
					data : 'addtodictionary='+self.$curWord.html(),
					dataType : "json",
					error : function(XHR, status, error) {
						alert("Sorry, there was an error processing the request.");
					},
					success: self.check
				});			
			});
		},
		
		// remove spell check formatting
		removeFormatting : function() {
			$("span.spellcheck-badspelling", this.domObj).each(function(){
				$(this).after(this.innerHTML).remove()
			});
		},

		// removes all
		remove : function(speed) {
			(!speed) && (speed = 100);
			$("#speller-overlay").fadeOut(speed, function(){
				var $which = $(this);
				if ($which.length) {
					$which_text = $which
					.html()
					.replace(/<br\s?\/?>/g, "\n")
					.replace(/<[^>]+\/?>/g, "");
					if (Spelling.$container.length && Spelling.$container[0].nodeName.toLowerCase() == "form") {
						$("textarea", Spelling.$container).each(function(){
							$(this).val($which_text).fadeIn();
						});
					}
					$(this).remove();
				}
			});
		}
	};	

})(jQuery);
