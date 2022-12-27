var activeTabId = 0; //the only assignment to this is when switchedToThisTab is called: activeTabId = String(message.ID);
var thisTabsTabId = 0;
var translateYhackOn = true;
let settingsObject = {}; //from var settingsObject because of https://stackoverflow.com/questions/30469755/why-a-variable-defined-global-is-undefined
var tabFontSize = "0.9rem"; //equals 14.4px
//FIXED: sometimes buttons appear when screen rotation event is not sent to all tabs
//default showButtons settings (to avoid undefined)
var showButtons = {
	horizontal: ["backButton", "forwardButton", "reloadButton"],
	vertical: ["backButton", "forwardButton", "reloadButton"]
}
settingsObject.to = "left";

var settingsTabURL = "";
var settingsTabId;
//FIXED: TELL ALL THE OTHER TABS ABOUT THE ORIENTATIONCHANGE EVENT

//FIXED by properly setting font size on all elements: TODO: FIX FONT SIZE JUMPING (after a different size was set by user)

function applySelectedStyle(wrapperId){ //for example w22
	let tab = document.getElementById(wrapperId);
	//I got it: this error is thrown on dynamic content generated (tab with id of wrapperId), something like 6ms AFTER (from console.log(tabElement) in createTAB ) the element was supposedly created
	//so is not available for document.getElementById
	//SOLUTION: add a select this tab paramater to createTAB
	if(tab == null){
		throw new TypeError("can't access property 'classList', tab with id '" + wrapperId + "' is null");
	}

	//let styles = "background:#b1b1b9;border-color: transparent;font-size:" + tabFontSize;
	//I could use Object.assign(element.style, styles) if I had more styles (https://stackoverflow.com/questions/3968593/how-can-i-set-multiple-css-styles-in-javascript)
	//TLDR: OBJECT.ASSIGN doesn't work in Firefox for CSS (it works only in Chrome nonstandard implementation). SRC: https://stackoverflow.com/questions/46077237/how-to-solve-css2properties-doesnt-have-an-indexed-property-setter-for-0-erro
	// try{
	// 	alert(tab === "null")
	// 	Object.assign(tab.style, styles);
	// }catch(error){
	// 	console.log(wrapperId, error.message);	//tab co v tab baru určitě je (shodou okolností nově active tab) podle tohoto tam není 
	// }

	//TAKŽE KLASICKY
	//klasika funguje, krása
	tab.classList.add("selected");
	// tab.style.background = "#b1b1b9";
	// tab.style.borderColor = "transparent";
	tab.style.fontSize = tabFontSize;
	
}


//TODO: When the tab bar is scrolled and the tab is switched, the tab bar ui jerks visibly (=> the tabswitched code runs after the tab has been switched to)
//make it on both the original placement on tabSwitch and tabs.onActivated so it covers all cases and is fast 
	//they would duplicate each other except for tab close, page popups, browsers native tabswitcher and swiping on the browser addressbar
		//the second call could cause jumps if the user already scrolled between the two messages, but OTHER than that it should work


//FIXED: removed the focusout event from document, since it was buggy (supposedly removing the button before the click event listener even fired; when I removed that in favor of blur event on the button, it started to work 
//FIXED by using inline styles: Interestingly, the v1 UI with injecting stylesheets does not work on Windows (v1 official version tested), but it does on Android (also tested v1 official version from the addon store)

// added UI for disabling the transform translateY hack on pages (causes cookies prompts on pages to shift out of view (so you can't consent and click them))
//this UI will be right click on the plus tab
document.getElementById("plus").addEventListener("contextmenu", function(e){
	e.preventDefault();
	document.getElementById("plusPicture").style.rotate = "45deg"; //rotating it, so the user know how to close the menu
	let button = document.createElement("button");
	button.id = "menuItem"
	button.style.cssText = "height: 35px;box-shadow: 1px 1px 2px 1px #979595;;max-width: calc(100vw - 2.5rem - 15px );overflow: clip;position:fixed;right:2.8rem" //
	if(translateYhackOn){

		button.innerText = "Let the Tab Bar cover page content; when cookie prompts are off screen";
		document.getElementById("plus").insertAdjacentElement("beforebegin", button);

		button.addEventListener("click", function(){
		//document.body.style.removeProperty("transform"); //aha, nefunguje to proto, že je to v iframe
		browser.runtime.sendMessage({action:"translateYhackOff"}).then(function(e){
			button.remove();
			document.getElementById("plusPicture").style.rotate = "0deg"
			window.translateYhackOn = false;
		});

		});
	}else{
		button.innerText = "Shift the page below the Tab Bar";
		document.getElementById("plus").insertAdjacentElement("beforebegin", button);

		button.addEventListener("click", function(){
			//document.body.style.removeProperty("transform"); //aha, nefunguje to proto, že je to v iframe
			browser.runtime.sendMessage({action:"translateYhackOn"}).then(function(e){
				button.remove();
				document.getElementById("plusPicture").style.rotate = "0deg"
				translateYhackOn = true;
			});
		
		});
	}

});

// document.addEventListener("focusout",function(){ //fired immediately when the button is CLICKED on Windows, not only when you click anything else
// 	//NO: also not reliable: maybe use the blur event on the popup instead
// 	let menu = document.getElementById("menuItem");
// 	if(menu != null){
// 		//menu.remove();
// 	}	
// });


//								{id: id, title: title, adress: url, appendAfterId: id, favicon: url, selectThisTAB: true/false, scrollTabIntoView: true/false}
function createTAB(e){ //id, title, adress, appendAfterId, favicon, selectThisTAB, scrollIntoView

		var wrapperDiv = document.createElement("div");
		var faviconImg = document.createElement("img"); //initializing it either way, its src might be updated later (in tabCreated, when navigating to different page sent from shareWithContentScripts )
		faviconImg.onerror = function(){faviconImg.style.display='none'}; //for pages that have no icon
		faviconImg.id = "i" + e.id;
		if(e.favicon){
			faviconImg.height =  24; // window.innerHeight  * 0.4; //16
			faviconImg.width = 24; //window.innerHeight  * 0.4; //24; //16
			faviconImg.src = e.favicon;	
		}

		wrapperDiv.appendChild(faviconImg);
		var tabElement = document.createElement("a"); //changed to a for android native menu //div //originally button, but changed for nesting buttons in html
		var decorative = document.createElement('div');
		decorative.className = "tabseparator";

		wrapperDiv.className = "tab";
		tabElement.className = "tabTitle";
		if(e.selectThisTAB == true){
			//wrapperDiv.className += "selected"; //breaks it completely lol
			//THAT works. But after the className property has been set, className does override classList.add
			wrapperDiv.classList.add("selected");
		}

		if(tabFontSize != "0.9rem"){
			tabElement.style.fontSize = tabFontSize;
		}
		wrapperDiv.id = "w" + e.id;
		tabElement.id = e.id;
		tabElement.href = e.adress; //"http://www.seznam.cz" //right click MENU WORKs // this is link href - ie URL where it points to
		//When the text is too long, the close button gets pushed out of the tab under other tabs => position the button absolutely to its parent
		//clip text currently max width is 12em
		//So clip to 10 characters

		//možná if title tak title. slice
		if(e.title !== undefined){
			if(e.title.length < 7){
				//this hack because display flex on wrapperdiv breaks the tab bar layout completely

			/*				Since none of the other answers explain why your code doesn’t work:
			 in a nutshell, it’s because innerText represents the rendered text on a page, 
			 which means applying the element’s white-space rules.
			  The effect in your case is that surrounding whitespace is stripped off. – 
			Konrad Rudolph*/
			//comment from https://stackoverflow.com/questions/47768523/empty-spaces-are-ignored-by-the-innertext-property
				let text = e.title + " ".repeat(8 - e.title.length)
				tabElement.textContent = text;
			}else{
				tabElement.textContent = e.title.slice(0, 11); //"Text" + counter + " "; //text displayed on tab
			}
		}else{
			tabElement.textContent = "loading";
		}
		//for pages with very short titles (like Bing), after I changed the .tab min width from 65px to 80px, so the button displays on the right
		//let alignCloseButtonRight = document.createElement("div");
		//alignCloseButtonRight.style = "text-align:right;display: inline-block";
		//that code with text align didn't work here, probably because the button has not text, only an icon
		//=> just add trailing spaces if the text is too short (CSS property white-space: pre; had to be applied, else innerText ignores the trailing spaces)
		let close = document.createElement("button");
		close.id = "c" + e.id;
		close.className = "closeButton";
		close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" fill-opacity="context-fill-opacity"> <path d="m9.108 7.776 4.709-4.709a.626.626 0 0 0-.884-.885L8.244 6.871l-.488 0-4.689-4.688a.625.625 0 1 0-.884.885L6.87 7.754l0 .491-4.687 4.687a.626.626 0 0 0 .884.885L7.754 9.13l.491 0 4.687 4.687a.627.627 0 0 0 .885 0 .626.626 0 0 0 0-.885L9.108 8.223l0-.447z"/></svg>'
		
		wrapperDiv.appendChild(tabElement);
		wrapperDiv.appendChild(close);
		wrapperDiv.appendChild(decorative);

		console.log("tabElement", tabElement, "wrapperDiv", wrapperDiv);

		//alignCloseButtonRight.appendChild(close);
		//wrapperDiv.appendChild(alignCloseButtonRight);


		//return to appendAfterId from appendAtIndex because Android sets every tab's index property to 0 (https://github.com/mozilla-mobile/fenix/issues/26369)
		if(e.appendAfterId !== undefined){
			console.log(e.appendAfterId);
			let thatRapper = document.getElementById("w" + e.appendAfterId);

			if(thatRapper == null){
				document.getElementById("tabcontainer").appendChild(wrapperDiv);
			}else{
				console.log("thatRapper", thatRapper)
				thatRapper.insertAdjacentElement("afterend", wrapperDiv);
			}

		}else{
			document.getElementById("tabcontainer").appendChild(wrapperDiv); 
		}

		//THIS LINE HAS CAUSED 2H OF DEBUGGING - IT SPOILED THE EVENT LISTENER 
		//document.getElementById("tabcontainer").innerHTML += "&nbsp"; //BUGprone: experiment with padding instead //to make it consistent with the first tab

		tabElement.addEventListener ("click", function(e) {
			e.preventDefault(); //so the browser doesn't navigate to that link onclick

	  	//add tab bar scroll state sync (the idea works well on a landscape orientation, but it doesn't (I think, not tested on mobile) on a narrow screen (portrait orientation), where the tab switched to is fully scrolled into view )
	  	let tabBarPosition = document.getElementById("tabcontainer").scrollLeft;
	  	let sending = browser.runtime.sendMessage({action: "switchTab", tabID: tabElement.id, scrolled: tabBarPosition});

	  	//try{
	  		//switch from CSS text to setting properties one by one because the cssText property overrides a custom font size selected by the user
	  		//font sizes not jumping good
	  		
	  		//lets check if activeTabId is always 0 on this tab => it is (until switchedToThisTab is ran)
	  		//so lets assign activeTabId the value of thisTabsTabId as an initial value
	  		console.log("eEeeeeeeeeeeeeeeeEEEEEEEEEEEEEEEEEEEEEEEEEE", activeTabId == 0);

	  		let wrapper = document.getElementById("w" + activeTabId); //"w" + activeTabId
	  		wrapper.classList.remove("selected");

	  	// }catch(error){
	  	// 	console.error(error);
	  	// }

	  console.log("tabElement.id", tabElement.id);

		});

		//document.getElementById(id).scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
		 
		document.getElementById("c" + e.id).addEventListener("click", function(){ 
			//detect if this is an active tab (something like checking the selected class)
			let switchToTabId = "";
			let a = ""
			if(document.getElementById("w" + e.id).classList.contains("selected")){
				//Either with or without window prefix: Uncaught TypeError: can't access property "to", settingsObject is undefined
				//So called hoisting https://stackoverflow.com/questions/30469755/why-a-variable-defined-global-is-undefined
				if(settingsObject.to == "left"){
					console.log("left")
					a = "left"
					try{
						switchToTabId = document.getElementById("w" + e.id).previousElementSibling.children[1].id;
					}catch{
						//the first tab on a list would have a previousElementSibling null, and .children would throw a TypeError
						//so setting it to nextElementSibling
						try{
							switchToTabId = document.getElementById("w" + e.id).nextElementSibling.children[1].id;
						}catch{
							//when we only have one tab loaded
							//let the browser handle it (same as don't interfere wit browser)
						}
					}
				}else if(settingsObject.to == "right"){
					console.log("right")
					a = "right"
					try{
						switchToTabId = document.getElementById("w" + e.id).nextElementSibling.children[1].id;
					}catch{
						//the last tab on a list would have a nextElementSibling null, and .children would throw a TypeError
						//so setting it to previousElementSibling
						try{
							switchToTabId = document.getElementById("w" + e.id).previousElementSibling.children[1].id;
						}catch{
							//when we only have one tab loaded
							//let the browser handle it (same as don't interfere wit browser)
						}
					}
				}else{
					console.log("don't interfere wit browser")
				}
			}
			console.log("switchToTabId " +  switchToTabId + " " + a)
			//if the tab closed is not the active tab, the switchToTabId variable is undefined and  Uncaught ReferenceError: switchToTabId is not defined
			//if it is defined, it is a string with the tab id to switch to after the tab was closed
			let sending = browser.runtime.sendMessage({action: "closeTab", tabID: e.id, switchToTab: switchToTabId}); //tabElement.id //message to background script
		});

		//Add the right click listener on the tabs
		document.getElementById(e.id).addEventListener("contextmenu", function(){
			//tell the background script, that the new tab may be from that right click
			//until the user touches anything other on the page, it is safe to assume this
			document.getElementById("w" + e.id).style.background = "indianred";

			browser.runtime.sendMessage({action: "activeTabOnRightClickChangeHack", tabID: e.id});
		});

		//a tooltip for debugging
		wrapperDiv.title = e.id;
		//works on Windows, not on Android => moving to click listener on content scriot
		// document.addEventListener("focusout",function(){
		// 	document.getElementById("reloadButton").style.background = "gold";
		// 	//alert("runs")
		// 	browser.runtime.sendMessage({action: "activeTabOnRightClickChangeHackOff", tabID: id});
		// });


		//for testing only
		// document.addEventListener("focusin",function(){
		// 	document.getElementById("reloadButton").style.background = "white";
		// })
		if(e.scrollTabIntoView == true){
			wrapperDiv.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
		}

}
	//tab next to me = adjacentElement
	//open tab to the right of this tab = insertBefore the right adjacentElement

function actuallyCreateNewTab(){
	document.getElementById("plusPicture").style.rotate = "0deg"
	let menu = document.getElementById("menuItem");
	if(menu != null){
		menu.remove();
	}else{
		browser.runtime.sendMessage({action: "createTab"});
	}
}
document.getElementById("plus").addEventListener("click", actuallyCreateNewTab);

//NOW lets get the functionality
function handleResponse(message){ //response to getAllTabs
	//handle settings first => special function for that
	handleSettings(message.settings);
	//create the tabs	in tab bar
	console.log('%c ****** RUN STARTED ****** ', 'background: #222; color: #bada55');
	console.log("message.favicons", message.favicons);
	console.log("message.adresat", message.adresat);
	for (let i = 0; i < message.length; i++) { //var in for loop delcaration caused out of range errors for message[i] for some reason
		console.log("id in for loop, listed from message", message[i].id)
		//TODO: MOVE tabOrderModifications LOGIC TO BACKGROUND.JS (it si not always synced right to all tabs, so do it in th ebacg)
		//update tab position according to tabOrderModifications 
		let appendAfter = "";
		if(message[i].id in message.tabOrderMods){
			appendAfter = message.tabOrderMods[message[i].id];
		}else{
			appendAfter = undefined; //createTAB handles that
		}

		//sometimes there is an about:blank tab in TabsObject (browser.tabs.query({})), which is a blank page
		//the blank page then appears as a tab with title loading and a random icon
		//it is not a tab that can be switched to (it is also not in the browser official tab switcher)
		//so hide it
		if(message[i].url == "about:blank"){
			//maybe also add a check for a tab like this in tabCreated
			continue;
		}

		let x = message[i].url.split("/"); //like https://www.google.com/search?client=firefox-b-d&q=linux+pdf+editor
		let base = x[0] + "//" + x[2]; //like https://www.google.com
		console.log("base", base);

		let baseConfig = {
			"id": message[i].id,
			"title": message[i].title,
			"adress": message[i].url,
			"appendAfterId": appendAfter,
			"selectThisTAB": false, //handled by message[i].id == message.adresat check
			"scrollTabIntoView": true
		}
		if(message.favicons[base] == undefined && message[i].url !== undefined){
			browser.runtime.sendMessage({action:"getFaviconURL", url: base}).then(response=>{				
				//possible (this is an async call back, that it runs after the next iteration (maybe) in the else statement)
				//so added id check
				if(document.getElementById(message[i].id) != null){
					if(message[i].id == message.adresat){
						//the tab was just created
						console.log("wrapper with id w" + message.adresat + "to be selected FROM EXCEPTION");
						applySelectedStyle("w" + String(message.adresat));
					}
					return;
				} 
				//either check if the message[i].id == message.adresat here to pass selectThisTAB=true (the first boolean parameter) only to the right tab
				//Or, simply call applySelectedStyle AND scrollIntoView after all tabs have been created
				baseConfig.favicon = response;
				createTAB(baseConfig); //message[i].id, message[i].title, message[i].url, appendAfter, response, false, true
				console.warn("tab id", message[i].id,"adresat id", message.adresat);
				if(message[i].id == message.adresat){
					//the tab was just created
					//alert("r");
					console.log("wrapper with id w" + message.adresat + " to be selected");
					applySelectedStyle("w" + message.adresat);
				}
				console.log('%c ****** RUN ACTUALLY ENDED IN ASYNC ****** ', 'background: #222; color: #bada55');
				//applySelectedStyle("w" + String(message.adresat)); //replaced by selectThisTAB=true paramater
				//document.getElementById("w" + String(message.adresat)).scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"}); //replaced by scrollIntoView=true paramater
			});
		}else{
			//the favicon is defined in cache
			//check if its not just a tab being created after a tab with the id exists
			//THAT IS WHERE THE BUG WAS
			//String(variable) does make "null" from null
			//but there should not be an element with the id of null, so that is weird
			if(document.getElementById(message[i].id) != null){
				return; //seems to work great (URL was updated with history api or something => reload => new getAllTabs => duplicate tabs)
			}
			baseConfig.favicon = message.favicons[base];
			createTAB(baseConfig); //message[i].id, message[i].title, message[i].url, appendAfter, message.favicons[base], false, true
			console.warn("(the favicon is in memory) tab id", message[i].id,"adresat id", message.adresat);
			if(message[i].id == message.adresat){
				//the tab was just created
				console.log("wrapper with id w" + message.adresat + "to be selected");
				applySelectedStyle("w" + String(message.adresat));
			}
			//applySelectedStyle("w" + String(message.adresat)); //replaced by selectThisTAB=true paramater
			//document.getElementById("w" + String(message.adresat)).scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});//replaced by scrollIntoView=true paramater
		}			
				
	}

	thisTabsTabId = message.adresat

	//lets assign activeTabId the value of thisTabsTabId as an initial value
	//so removing selected style (to make the user experience better) on click always works in tabElement.addEventListener("click")
	//it isn't needed to remove the styling of the selected tab at all, it was implemented for UI responsiveness
	//the value to give tab styling back is in thisTabsTabId
	if(activeTabId == 0){
		activeTabId = thisTabsTabId;
	}
	console.log('%c ****** RUN ENDED ****** ', 'background: #222; color: #bada55'); //reminded me that the function is async
}


let sending = browser.runtime.sendMessage({action: "getAllTabs"}); //remade to json //message to background script
sending.then(handleResponse);

function handleMessagesFromBackgroundScript(message){
	if(message.action === "phoneRotated"){
		//alert(message.orientation);
		hideButtons();
		displayButtons(message.orientation);
	}
	if(message.action === "updateScroll"){
		document.getElementById("tabcontainer").scrollTo({
		  left: message.scrolled,
		  behavior: 'instant'
		});
	}
	if(message.action === "updateSettings"){
		//PERHAPS REPORT TO BUGZILLA: the alert displaying while settings are open can freeze the tab bar upon closing settings page
		//to workaround, the only way it so switch away using built in tab switcher and switch back
		//alert("updateSettings ran, fontSize " +  message.settings.fontSize)
		settingsObject = message.settings;
		console.log(message.settings.fontSize)
		window.tabFontSize = message.settings.fontSize + "px"; //NENÍ APPLIED PRO STÁVAJÍCÍ //podle mě tohle nebude applied, třeba editovat .class v CSS
	
		//applied to existing tabs
		//GOT IT: the new font size is applied to the tab divs, but not to its link children
		//SRC:
		// <div class="tab" id="w10001" title="10001" style="font-size: 22px;">
		// <a style="font-size: 18px;" id="10001" href="https://www.google.com/imghp?client=firefox-b-m&amp;channel=ts&amp;tbm=isch">Google</a></button>
		// </div>
		//maybe sent font size to inherit, or add a new class name to the links => class="tabTitle" for <a> in div class="tab"
		let rappers = document.getElementsByClassName("tabTitle");

		for (var i = 0; i < rappers.length; i++) {
			console.log(message.settings.fontSize.endsWith("px"))
			rappers[i].style.fontSize = message.settings.fontSize + "px";
		}
		hideButtons();
		//JENOM testing, proverit aby vzdy spravna tlacitka 
		showButtons = {
			horizontal: [],
			vertical: []
		}
		makeShowButtonsObject(message.settings); //maybe move the makeShow to background
		let orientation = screen.orientation.type;
		displayButtons(orientation); //didnt even throw error at undefined parameter lol, adding let orientation = screen.orientation.type;

	}
	//this current tab got selected
	if(message.action == "switchedToThisTab"){ 
		//alert(message.scrolled) //works
		//that or the same scrolled state on all tabs, TODO: make a user pref for it
		//document.getElementById("w" + message.ID).scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
		document.getElementById("tabcontainer").scrollTo({
		  left: message.scrolled,
		  behavior: 'instant'
		});
		if(tabFontSize !== "0.9rem"){
			if(!tabFontSize.endsWith("px")){
				tabFontSize += "px"; //works
			}
		}
		//document.getElementById("w" + String(message.ID)).style.cssText = "background:#b1b1b9;border-color: transparent;font-size:" + tabFontSize;
		let x = "w" + String(message.ID);
		applySelectedStyle(x);
		activeTabId = String(message.ID);
	}
	if(message.action == "faviconUpdated"){
		//IT WORKSSS!
		let img = document.getElementById("i" + message.tabWhoseFaviconIsUpdated);
		img.height = 24;
		img.width = 24;
		//img.style.transform = "rotateZ(90deg)"; //to make it visible
		console.log(message.faviconUrl);
		img.src = message.faviconUrl;
	}
	if(message.action == "tabCreated"){ //new tab created or updated
 		//so the tab knows its own tab id so new tabs can be created to the right
 		//thisTabsTabId is now sent on getAllTabs response
		//thisTabsTabId = message.yourID;
	
		if(message.title == "Tablet UI for Firefox Settings" || message.ID == settingsTabId){ 
			settingsTabId = message.ID;
			console.log(message.ID) 
			//Vybere správný element, ale z nějakého důvodu nefunguje metoda .click() je třeba to udělat manuálně
			//document.getElementById("c" + message.ID).click();
			let wrapperDiv = document.getElementById("w" + String(message.ID));
			while(wrapperDiv.firstChild) wrapperDiv.removeChild(wrapperDiv.firstChild)
			wrapperDiv.remove()

			return;
		}

		//when the tab loads, some of these properties are undefined, so this was be redesigned to update only the data which is defined
		console.log("tabCreated " + message.title + " id "+ message.ID + "url " + message.url + " delivered to this frame " );

		let a = document.getElementById(String(message.ID));
		console.log("tabCreated code in content script ran, tabs found", a);
		let title = "";
		//https://stackoverflow.com/questions/5629684/how-can-i-check-if-an-element-exists-in-the-visible-dom

		if(a == null){ 
			//ANDROID only BUG: the index property is the same for all tabs
			// Array [ {…}, {…} ]
			//
			// 0: Object { id: 10051, index: 0, windowId: 51, … }
			//
			// 1: Object { id: 10058, index: 0, windowId: 58, … }

			//So the fix is to listen for all rightlick events on a page (and then say the next opened tab is from that)
				//So, the next opened tab is always opened to the right of the active tab, unless the user opens rightlick menu on one of the tabs in tab bar, then the activeTab is changed to that tabs id, so the new tab is open right next to it

				console.log("tab Created RAN in openNewTab.js, got data:", message);
				let config = {
					"id": message.ID,
					"title": message.title,
					"adress": message.url,
					"appendAfterId": message.activeTabID,
					"favicon": message.iconUrl,
					"selectThisTAB": false, //handled by message[i].id == message.adresat check
					"scrollTabIntoView": false
				}
				createTAB(config); //String(message.ID), message.url, message.title, message.activeTabID, message.iconUrl //createTAB can handle undefined message.iconUrl

			//doesn't scroll where wadocument.getElementById("w" + String(message.ID)).scrollIntoView({behavior: "smooth", block: "end", inline: "end"});
		}else{
			//tab element exists
			//a.style.background = "red"; 
			if("url" in message){
				a.href = message.url;
			}
			if("title" in message){
				//display first 10 characters of the title
				title = message.title.slice(0,11); //slice so the close button fits
				a.innerText = title; 
			}
			//FUNGUJE vymena ikony na stejnem panelu diky faviconUpdated
			//predtim, vytvoření nového panelu s jinou ikonou funguje, ale ne vymena ikony na stejnem panelu
			if("iconUrl" in message){
				let img = document.getElementById("i" + String(message.ID));
				img.height = 24;
				img.width = 24;
				//img.style.transform = "rotateZ(90deg)"; //to make it visible
				console.log(message.iconUrl);
				img.src = message.iconUrl;

			}
				
		}
	}
	if(message.action == "tabClosed"){
		//document.getElementById(String(message.ID)).remove(); //when user closes a tab from other tab
		let wrapperDiv = document.getElementById("w" + String(message.ID));
		while(wrapperDiv.firstChild) wrapperDiv.removeChild(wrapperDiv.firstChild)
		wrapperDiv.remove()
	}
	//add tab updated
	///FIXED: see comment about setTimeout in settings.js
	//settingsAreOpen is not RAN here: browser.runtime.sendMessage does not send to content scripts
	if(message.action == "closeGraphicalSettingsTab"){
		settingsTabURL = message.url;
		console.log("settingsTabURL", message.url)
	}
}
browser.runtime.onMessage.addListener(handleMessagesFromBackgroundScript);

//Make the navigation buttons work
var back = document.getElementById("backButton");
var forward = document.getElementById("forwardButton");
var reload = document.getElementById("reloadButton");

function backButtonClick(){
	browser.runtime.sendMessage({action: "backButton"}).catch((error) => {
		if(error.message == "can't access dead object"){
			reload();
		}else{
			console.error(error.message);
		}
	});
}
back.addEventListener("click", backButtonClick);

function forwardButtonClick(){
	browser.runtime.sendMessage({action: "forwardButton"})
	.sending.catch((error) => { //right now, after closing the browser and reopening it again, with this catch function broken THE BUTTONS WORKS!(it's (.sending has no place there) browser.runtime.sendMessage({action: "forwardButton"}).sending.catch )
		//SO BEST SOLUTION FOR THIS IS TO TELL USERS TO CLOSE AND OPEN THEIR BROWSER AFTER INSTALLING THIS ADDON
		console.log("e" + error.message)
		alert(error.message);
		if(error.message == "can't access dead object"){
			reload();
		}else{
			console.error(error.message);
		}
	});
}
forward.addEventListener("click", forwardButtonClick);

function reloadButtonClick(){
	let sending = browser.runtime.sendMessage({action: "reloadButton"});
}
reload.addEventListener("click", reloadButtonClick);

function makeShowButtonsObject(settings){

	window.showButtons = {}; //window prefix necessary lol, otherwise JS thought it was a local variable and did not overwrite the global one
		window.showButtons.vertical = []; //the more narrow side
		window.showButtons.horizontal = []; //the wider side
		if("showBackButtonVertical" in settings){
			window.showButtons.vertical.push("backButton");
		}
		if("showForwardButtonVertical" in settings){
			window.showButtons.vertical.push("forwardButton"); //forward
		}
		if("showReloadButtonVertical" in settings){
			window.showButtons.vertical.push("reloadButton");
		}
		if("showBackButtonHorizontal" in settings){
			window.showButtons.horizontal.push("backButton");
		}
		if("showForwardButtonHorizontal" in settings){
			window.showButtons.horizontal.push("forwardButton");
		}
		if("showReloadButtonHorizontal" in settings){
			window.showButtons.horizontal.push("reloadButton");
		}
		console.log(window.showButtons);
}

//handle settings 
function handleSettings(settings){
	if(settings !== undefined){
		console.log(settings);
		settingsObject = settings;
		console.log(settingsObject.to);
		if("fontSize" in settings){
			window.tabFontSize = settings.fontSize + "px";
		}
			// operátor || vlastně nefungoval
		 //window.tabFontSize = settings.fontSize || "0.9rem"; //tady se to možná při response na getAllTabs resetuje na 0.9rem (protože pathway updateSettings má svoji window.tabFontSize = message.settings.fontSize + "px")
		makeShowButtonsObject(settings);
		let orientation = screen.orientation.type;
		hideButtons();
		displayButtons(orientation);
	}
}

function displayButtons(deviceOrientation){
	console.log(deviceOrientation, window.showButtons);
  if(deviceOrientation == "portrait-primary" || deviceOrientation == "portrait-secondary"){
  	let vertical = window.showButtons.vertical; //window. prefixed console log printed the correct object, the unprefixed version was undefined lol
  	for (var i = 0; i < vertical.length; i++) {
  		console.log("removing hidden attribute from ", document.getElementById(vertical[i])); 
  		//overwriting styles using style.display is actually a bad idea, not reliable; adding and removing hidden class in class attr is reliable .hidden{ display: none }
  		//document.getElementById(vertical[i]).style.display = "block";
  		document.getElementById(vertical[i]).classList.remove("hidden");
  	}
  }else if(deviceOrientation == "landscape-primary" || deviceOrientation == "landscape-secondary"){
  	let horizontal = window.showButtons.horizontal;
  	for (var i = 0; i < horizontal.length; i++) {
  		console.log("removing hidden attribute from ", document.getElementById(horizontal[i]));
  		//document.getElementById(horizontal[i]).style.display = "block";
  		document.getElementById(horizontal[i]).classList.remove("hidden");
  	}
  }
}
function hideButtons(){
	document.getElementById("backButton").classList.add("hidden");
  document.getElementById("forwardButton").classList.add("hidden");
  document.getElementById("reloadButton").classList.add("hidden");
}

//FIX the buttons having display:none but still displaying (look at: https://stackoverflow.com/questions/20663712/css-display-none-not-working)
//IDEA: use CSS classes (add a .hidden{ display:none} to CSS and add or remove the hidden class)
screen.orientation.onchange = (event) => {
	console.log(event.target.type)
	let deviceOrientation = String(event.target.type);

	browser.runtime.sendMessage({action: "phoneRotated", orientation: deviceOrientation});
	console.log("showButtons", showButtons) //in this standard event works without window prefix
	//first hide the buttons so we can then show the ones user has selected
	if(showButtons !== undefined){
		//Toggling buttons visibility using style.display none and block was buggy,
		//so the new implementation add and removes the hidden class
		// document.getElementById("backButton").style.display = "none";
	// 	document.getElementById("forwardButton").style.display = "none";
	// 	document.getElementById("reloadButton").style.display = "none";
		hideButtons();
	}else{
		// document.getElementById("backButton").style.display = "block";
		// document.getElementById("forwardButton").style.display = "block";
		// document.getElementById("reloadButton").style.display = "block";

		//show all buttons
		document.getElementById("backButton").classList.remove("hidden");
		document.getElementById("forwardButton").classList.remove("hidden");
		document.getElementById("reloadButton").classList.remove("hidden");
		//return;
	}
	displayButtons(deviceOrientation);

}

//test
//the same as mouseenter on a touchscreen in practice, the user has to press something, not just scroll
// document.addEventListener("blur", function(event){
// 	console.log("using the page");
// });
