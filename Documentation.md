The plugin has 2 default behaviours:
  * If bound to a HTML element that is not a textarea, the plugin will highlight the incorrectly spelt words. Clicking on the words will bring up the suggest box.
  * If bound to a textarea element, the plugin will add the incorrectly spelt words after the textarea. Clicking on the words will bring up the suggest box.
  * View the [demo](http://spellchecker.jquery.badsyntax.co.uk/) to get a better idea of the default behaviour.


---


**Server script**

The plugin comes with an example PHP script that supports two type of spell checking engines: php's pspell extension for aspell, or google's spell checking services. If you are able to use pspell, you will have greater control over your dictionary (with the ability to manage your dictionary words).

  * using pspell requires you to have aspell installed on the server, as well as the PHP pspell extension
  * using google requires minimal server adjustments, should work on most default PHP installations.
  * **Please note** - the example PHP file uses the json\_encode function, which requires the json package. This package comes default with PHP 5 >= 5.2.0. If you have an older version of PHP, you can install this package via PECL, or use a [custom json library](http://aurore.net/projects/php-json/).

If you would like to use a different server side language, then here outlines the expected server responses:

_Check chunk of text:_

checkspelling.php?engine=pspell
  * Request:
    * Content type: application/x-www-form-urlencoded;charset=UTF-8
    * Data: text="a chunk of text without any punctuation"
  * Response:
    * Content type: application/json
    * Example response: ["bbad","speltt","wwords"]

_Get suggestions for a word:_

checkspelling.php?engine=pspell
  * Request:
    * Content type: application/x-www-form-urlencoded;charset=UTF-8
    * Data: suggest="word"
  * Response:
    * Content type: application/json
    * Example response: ["suggest","snuggest","soggiest"]


---


**Supported languages**

_Pspell_

[Pspell](http://php.net/manual/en/book.pspell.php) is simply a php wrapper to the  [GNU aspell](http://aspell.net/) spell checker. So supporting large range of languages is as easy as installing the relevant aspell language dictionary. These dictionary packs are available in most GNU/Linux distro repositories. In debian/ubuntu, you can install a new dictionary like so:
```
sudo apt-get install aspell-LANG
```
(replace LANG with the language code)

If you want to search for a particular language dictionary, you can use apt-cache:
```
sudo apt-cache search aspell
```
or view the aspell [supported languages](http://aspell.net/man-html/Supported.html) page.

  * remember to restart apache after you have installed new dictionaries
  * if you having problems getting pspell to work with personal dictionaries, view the php errors!

Aspell also [works on windows](http://aspell.net/win32/)

_Google_

I couldn't find any information as to the languages google supports, but it's probably a lot.


---




**Usage**

Include the following in the head section of your html document:
```
<link rel="stylesheet" type="text/css" media="screen" href="css/spellchecker.css" />
<script type="text/javascript" src="js/jquery.js"></script>
<script type="text/javascript" src="js/jquery.spellchecker.js"></script>
```

Defaut usage:
```
// initiate the spell checker on an element, then fire off the 'check' function
$("textarea#text-content").spellchecker("check");
```
Plugin options: (all optional)
```
$("textarea#text-content")
.spellchecker({
        url: "checkspelling.php",       // default spellcheck url
        lang: "en",                     // default language 
        engine: "pspell",               // pspell or google
        addToDictionary: false,         // display option to add word to dictionary (pspell only)
        wordlist: {
                action: "after",               // which jquery dom insert action
                element: $("#text-content")    // which object to apply above method
        },      
        suggestBoxPosition: "below",    // position of suggest box; above or below the highlighted word
        innerDocument: false            // if you want the badwords highlighted in the html then set to true
});
```
You only want to execute the above code after an event has occured:
```
// initiating the spell checker is not necessary if using the default plugin options
$("a.check-spelling").click(function(e){
        e.preventDefault();
        $("textarea#text-content").spellchecker("check");
});
```
The plugin will fire off a callback function after it has finished checking words:
```
$("a.check-spelling").click(function(e){
        e.preventDefault();
        $("textarea#text-content").spellchecker("check", function(result){
                // if result is true then there are no incorrectly spelt words
                if (result) alert('There are no incorrectly spelt words.');
        });
});
```
And to remove all spellchecker html:
```
$("textarea#text-content").spellchecker("remove");
```

view the [demo](http://spellchecker.jquery.badsyntax.co.uk/example.html) to see it action