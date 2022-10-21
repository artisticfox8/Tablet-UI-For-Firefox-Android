var activeTabId = 0;
var thisTabsTabId = 0;
var closeTabInt = false; //if tab closed in this window
var translateYhackOn = true;
var settingsObject;
var tabFontSize = "0.9rem"; //equals 14.4px
//FIXED: sometimes buttons appear when screen rotation event is not sent to all tabs
//default showButtons settings (to avoid undefined)
var showButtons = {
	horizontal: ["backButton", "forwardButton", "reloadButton"],
	vertical: ["backButton", "forwardButton", "reloadButton"]
}

var settingsTabURL = "";
var settingsTabId;
//FIXED: TELL ALL THE OTHER TABS ABOUT THE ORIENTATIONCHANGE EVENT

//FIXED by properly setting font size on all elements: TODO: FIX FONT SIZE JUMPING (after a different size was set by user)

function applySelectedStyle(wrapperId){ //for example w22
	let tab = document.getElementById(wrapperId);

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
	tab.style.background = "#b1b1b9";
	tab.style.borderColor = "transparent";
	tab.style.fontSize = tabFontSize;
	
}


//TODO: When the tab bar is scrolled and the tab is switched, the tab bar ui jerks visibly (=> the tabswitched code runs after the tab has been switched to)
//make it on both the original placement on tabSwitch and tabs.onActivated so it covers all cases and is fast 
	//they would duplicate each other except for tab close, page popups, browsers native tabswitcher and swiping on the browser addressbar
		//the second call could cause jumps if the user already scrolled between the two messages, but OTHER than that it should work


//TODO: FIX Tab bar reloading when typing an entry in a search field on the main page of dictionary.cambridge.com
		


//FIXED: SEE COMMENT IN CONTENT JS (USING document.body.style now): NOW THIS UI WORKS ON DESKTOP, BUT DOESNT WORK ON ANDROID, IT IS THE SAME CODE!

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



function createTAB(id, title, adress, appendAfterId){ //appendAtIndex //TL DR; classes in JS are f*cking nonsense; they don't behave like civilized Python classes at all! (what would a class be that couldn't remember its self object! (here in click event listener))
		var wrapperDiv = document.createElement("div");
		var tabElement = document.createElement("a"); //changed to a for android native menu //div //originally button, but changed for nesting buttons in html
		wrapperDiv.className = "tab";
		tabElement.className = "tabTitle";

		if(tabFontSize != "0.9rem"){
			tabElement.style.fontSize = tabFontSize;
		}
		wrapperDiv.id = "w" + id;
		tabElement.id = id;
		tabElement.href = adress; //"http://www.seznam.cz" //right click MENU WORKs // this is link href - ie URL where it points to
		//When the text is too long, the close button gets pushed out of the tab under other tabs => position the button absolutely to its parent
		//clip text currently max width is 12em
		//So clip to 10 characters

		//možná if title tak title. slice
		if(title !== undefined){
			if(title.length < 7){
				//this hack because display flex on wrapperdiv breaks the tab bar layout completely

			/*				Since none of the other answers explain why your code doesn’t work:
			 in a nutshell, it’s because innerText represents the rendered text on a page, 
			 which means applying the element’s white-space rules.
			  The effect in your case is that surrounding whitespace is stripped off. – 
			Konrad Rudolph*/
			//comment from https://stackoverflow.com/questions/47768523/empty-spaces-are-ignored-by-the-innertext-property
				let text = title + " ".repeat(8 - title.length)
				tabElement.textContent = text;
			}else{
				tabElement.textContent = title.slice(0, 11); //"Text" + counter + " "; //text displayed on tab
			}
		}else{
			tabElement.innerText = "loading";
		}
		//for pages with very short titles (like Bing), after I changed the .tab min width from 65px to 80px, so the button displays on the right
		//let alignCloseButtonRight = document.createElement("div");
		//alignCloseButtonRight.style = "text-align:right;display: inline-block";
		//that code with text align didn't work here, probably because the button has not text, only an icon
		//=> just add trailing spaces if the text is too short (CSS property white-space: pre; had to be applied, else innerText ignores the trailing spaces)
		let close = document.createElement("button");
		close.id = "c" + id;
		close.className = "closeButton";
		close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12" fill="context-fill" fill-opacity="context-fill-opacity"> <path d="m9.108 7.776 4.709-4.709a.626.626 0 0 0-.884-.885L8.244 6.871l-.488 0-4.689-4.688a.625.625 0 1 0-.884.885L6.87 7.754l0 .491-4.687 4.687a.626.626 0 0 0 .884.885L7.754 9.13l.491 0 4.687 4.687a.627.627 0 0 0 .885 0 .626.626 0 0 0 0-.885L9.108 8.223l0-.447z"/></svg>'
		
		console.log(tabElement);

		wrapperDiv.appendChild(tabElement);
		wrapperDiv.appendChild(close);
		//alignCloseButtonRight.appendChild(close);
		//wrapperDiv.appendChild(alignCloseButtonRight);


		//return to appendAfterId from appendAtIndex because of https://github.com/mozilla-mobile/fenix/issues/26369
		if(appendAfterId !== undefined){
			console.log(appendAfterId);
			let thatRapper = document.getElementById("w" + String(appendAfterId));

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
			//if(e.target.classList.contains("tab")){
		  	//alert("did something " + tabElement.id); //add tabswitch logic
		  	//add tab bar scroll state sync (the idea works well on a landscape orientation, but it doesn't (I think, not tested on mobile) on a narrow screen (portrait orientation), where the tab switched to is fully scrolled into view )
		  	let tabBarPosition = document.getElementById("tabcontainer").scrollLeft;
		  	let sending = browser.runtime.sendMessage({action: "switchTab", tabID: tabElement.id, scrolled: tabBarPosition});
		  	
		  	//unset selected style of the tab selected before
		  	//the reason why we change the styling of the active tab on switchedToThisTab action is because  WE NAVIGATE TO A different TAB (the user may switch tab using the browser too
		  	try{
		  		//switch from CSS text to setting properties one by one because the cssText property overrides a custom font size selected by the user
		  		//font sizes not jumping good
		  		//document.getElementById("w" + activeTabId).style.cssText = "background: #e9e9ed;border: 1px solid #ddd;";
		  		let wrapper = document.getElementById("w" + activeTabId);
		  		wrapper.style.background = "#e9e9ed";
		  		wrapper.style.border = "1px solid #ddd";
		  	}
		  	catch(error){
		  		console.log(error);
		  	}

		  console.log(tabElement.id);
			//}
		});


		//document.getElementById(id).scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
		 
		document.getElementById("c" + id).addEventListener("click", function(){ 
			let sending = browser.runtime.sendMessage({action: "closeTab", tabID: id}); //tabElement.id //message to background script
			sending.then(function(e){
				closeTabInt = true;
				//tabElement.remove(); //leaves bits around
				while(wrapperDiv.firstChild) wrapperDiv.removeChild(wrapperDiv.firstChild)
				wrapperDiv.remove()
			});
		});

		//Add the right click listener on the tabs
		document.getElementById(id).addEventListener("contextmenu", function(){
			//tell the background script, that the new tab may be from that right click
			//until the user touches anything other on the page, it is safe to assume this
			document.getElementById("w" + id).style.background = "indianred";

			browser.runtime.sendMessage({action: "activeTabOnRightClickChangeHack", tabID: id});
		});

		//a tooltip for debugging
		wrapperDiv.title = id;
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
	// settings = message.settings;
	// if("showBackButtonVertical" in settings == false){
		//overwriting styles like this is actually a bad idea, not reliable; adding and removing hidden class in class attr is reliable .hidden{ display: none }
	// 	document.getElementById("backButton").style.display = "none";
	// }
	// if("showBackButtonVertical" in settings == false){
	// 	document.getElementById("backButton").style.display = "none";
	// }
	handleSettings(message.settings);
	//create the tabs	in tab bar
	console.log(message);
	for (var i = 0; i < message.length; i++) {
		//update tab position according to tabOrderModifications 
		if(message[i].id in message.tabOrderMods){

			createTAB(message[i].id, message[i].title, message[i].url, message.tabOrderMods[message[i].id]);

		}else{

			createTAB(message[i].id, message[i].title, message[i].url);
		}
	}
	//select this tab (what this does is it selects the title tab on every tab) = well this obviously did not work, because 

	//try{ 
		//now the page at https://appgallery.huawei.com/app/C101904093 works (it ouputs idk lol), but it works
		//document.getElementById("w" + String(message.adresat)).style.cssText = "background:#b1b1b9;border-color: transparent;font-size:" + tabFontSize; //cssText overrides fontSize set in CreateTAB
		applySelectedStyle("w" + String(message.adresat));
		document.getElementById("w" + String(message.adresat)).scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"}); //TODO: Test if it works correctly
	//}
	//catch{
	//	console.log("idk lol");
	//}
	thisTabsTabId = message.adresat


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


	//takovej trochu hack, uvidime, jak to bude fungovat

	//nefunguje, (tohle je ae neco jineho: dokonce to znásilní css stránky (ne našeho iframu), př na stackoverflow to odpali sticky header 
	//let sheet = document.styleSheets[0];
	//tak schválně
	//console.log(sheet.cssText)
	//stejne ustreli header, nechápu (ikdyž zbylo jenom let sheet a ten sheet.cssText pod tím)

	//fakt to nefunguje, vůbec (s různými hodnotami druhého paramatru)
	//sheet.insertRule(".tab{ font-size:" + tabFontSize + "}"); //sheet.length //-1 to prý dá jako poslední, tedy s nejvyšší prioritou
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
	if(message.action == "tabCreated"){ //new tab created or updated
 		//so the tab knows its own tab id so new tabs can be created to the right
 		//thisTabsTabId is now sent on getAllTabs response
		//thisTabsTabId = message.yourID;
	
		if(message.title == "Tablet UI for Firefox Settings" || message.ID == settingsTabId){ 
			console.log("tvoje máma")
			settingsTabId = message.ID;
			console.log(message.ID) 
			document.getElementById("c" + message.ID).click(); //TYVOLE YES PO DVOU HODINÁCH
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
		// ​
		// 0: Object { id: 10051, index: 0, windowId: 51, … }
		// ​
		// 1: Object { id: 10058, index: 0, windowId: 58, … }

		//So the fix is to listen for all rightlick events on a page (and then say the next opened tab is from that)
			//So, the next opened tab is always opened to the right of the active tab, unless the user opens rightlick menu on one of the tabs in tab bar, then the activeTab is changed to that tabs id, so the new tab is open right next to it

			createTAB(String(message.ID), message.url, message.title, message.activeTabID); //thisTabsTabId //message.thatTabsIndex

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
			
			//ADD THE TAB TO THE LIST OF TABS WITH MODIFIED INDEX, which doesn't match their order 
			//(not index property, just index in that array) in getAllTabs => TO PRESERVE THEIR POSITION IN NEWLY CREATED TABS
				///když duplikuješ panel pomocí rightlicku z tab baru, tak se zobrazí vedle ve všech otevřených panelech,
				//ale v novém otevřeném panelu se ten nový panel zobrazí ne za tím původním, ale až na konec úplně napravo
				// => moved this to background js		
		}
	}
	if(message.action == "tabClosed" && !closeTabInt){
		//document.getElementById(String(message.ID)).remove(); //when user closes a tab from other tab
		let wrapperDiv = document.getElementById("w" + String(message.ID));
		while(wrapperDiv.firstChild) wrapperDiv.removeChild(wrapperDiv.firstChild)
		wrapperDiv.remove()
	}
	closeTabInt = false;
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
