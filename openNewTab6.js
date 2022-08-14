var tabArray = [];
var activeTabId = 0;
var thisTabsTabId = 0;
var closeTabInt = false; //if tab closed in this window
var counter = 1;//for assigning unique ids to all tabs
var translateYhackOn = true;


//TODO: add UI for disabling the transform translateY hack on pages (causes cookies prompts on pages to shift out of view (so you can't consent and click them))
//this UI will be right click on the plus tab
document.getElementById("plus").addEventListener("contextmenu", function(e){
	e.preventDefault();
	let button = document.createElement("button");
	button.id = "menuItem"
	button.style.cssText = "height: 32px;box-shadow: 1px 1px 2px 1px #979595;transition:max-width 0.3s linear;max-width: 100em"
	if(translateYhackOn){

		button.innerText = "Let the Tab Bar cover page content; when cookie prompts are off screen";
		document.getElementById("plus").insertAdjacentElement("beforebegin", button);

		button.addEventListener("click", function(){
		//aha, nefunguje to proto, že je to v iframe
		//document.body.style.removeProperty("transform");
		browser.runtime.sendMessage({action:"translateYhackOff"});
		button.remove();
		translateYhackOn = false;
		});
	}else{
		button.innerText = "Shift the page below the Tab Bar";
		document.getElementById("plus").insertAdjacentElement("beforebegin", button);

		button.addEventListener("click", function(){
		//aha, nefunguje to proto, že je to v iframe
		//document.body.style.removeProperty("transform");
		browser.runtime.sendMessage({action:"translateYhackOn"});
		button.remove();
		translateYhackOn = true;
		});

	}

});

document.addEventListener("focusout",function(){
	let menu = document.getElementById("menuItem");
	if(menu != null){
		menu.remove();
	}	
});




function createTAB(id, title, adress, appendAfterId){ //appendAtIndex //TL DR; classes in JS are fucking nonseÅ„se; they don't behave like civilzed Python classes at all! (what would a class be that couldn't remember its self object! (here in click event listener))
		counter += 1;
		var wrapperDiv = document.createElement("div");
		var tabElement = document.createElement("a"); //changed to a for android native menu //div //originally button, but changed for nesting buttons in html
		wrapperDiv.className = "tab";
		wrapperDiv.id = "w" + id;
		tabElement.id = id; //counter
		tabElement.href = adress; //"http://www.seznam.cz" //right click MENU WORKs // this is link href - ie URL where it points to
		//When the text is too long, the close button gets pushed out of the tab under other tabs => position the button absolutely to its parent
		//clip text currently max width is 12em
		//So clip to 10 characters

		//možná if title tak title. slice
		if(title !== undefined){
			tabElement.innerText = title.slice(0, 11); //"Text" + counter + " "; //text displayed on tab
		}else{
			tabElement.innerText = "loading";
		}
		
		let close = document.createElement("button");
		close.id = "c" + id;
		close.className = "closeButton";
		close.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12" fill="context-fill" fill-opacity="context-fill-opacity"> <path d="m9.108 7.776 4.709-4.709a.626.626 0 0 0-.884-.885L8.244 6.871l-.488 0-4.689-4.688a.625.625 0 1 0-.884.885L6.87 7.754l0 .491-4.687 4.687a.626.626 0 0 0 .884.885L7.754 9.13l.491 0 4.687 4.687a.627.627 0 0 0 .885 0 .626.626 0 0 0 0-.885L9.108 8.223l0-.447z"/></svg>'
		
		console.log(typeof(tabElement)); //defined, is an object
		console.log(tabElement);

		wrapperDiv.appendChild(tabElement);
		wrapperDiv.appendChild(close);

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
		  	let sending = browser.runtime.sendMessage({action: "switchTab", tabID: tabElement.id});
		  	
		  	//unset selected style of the tab selected before
		  	//the reason why we change the styling of the active tab on switchedToThisTab action is because  WE NAVIGATE TO A different TAB (the user may switch tab using the browser too
		  	try{
		  		document.getElementById("w" + activeTabId).style.cssText = "background: #e9e9ed;border: 1px solid #ddd;";
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
			//document.getElementById("w" + id).style.background = "indianred";

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
	let menu = document.getElementById("menuItem");
	if(menu != null){
		menu.remove();
	}else{
		browser.runtime.sendMessage({action: "createTab"});
	}
}
document.getElementById("plus").addEventListener("click", actuallyCreateNewTab);

//NOW lets get the functionality
function handleResponse(message){
	console.log(message);
	//alert(message);
	for (var i = 0; i < message.length; i++) {
		//update tab position according to tabOrderModifications 
		if(message[i].id in message.tabOrderMods){

			createTAB(message[i].id, message[i].title, message[i].url, message.tabOrderMods[message[i].id]);

		}else{

			createTAB(message[i].id, message[i].title, message[i].url);
		}
	}
	//select this tab (what this does is it selects the title tab on every tab)
	document.getElementById("w" + String(message.adresat)).style.cssText = "background:#b1b1b9;border-color: transparent;"
	document.getElementById("w" + String(message.adresat)).scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
	thisTabsTabId = message.adresat


}


let sending = browser.runtime.sendMessage({action: "getAllTabs"}); //remade to json //message to background script
sending.then(handleResponse);

function handleMessagesFromBackgroundScript(message){
	//this current tab got selected
	if(message.action == "switchedToThisTab"){ 
		document.getElementById("w" + message.ID).scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});

		document.getElementById("w" + String(message.ID)).style.cssText = "background:#b1b1b9;border-color: transparent;";
		activeTabId = String(message.ID);
	}
	if(message.action == "tabCreated"){ //new tab created or updated
 		//so the tab knows its own tab id so new tabs can be created to the right
 		//thisTabsTabId is now sent on getAllTabs response
		//thisTabsTabId = message.yourID;

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
			// back = document.getElementById("backButton");
			// forward = document.getElementById("forwardButton");
		}
	});
}
back.addEventListener("click", backButtonClick);

function forwardButtonClick(){
	browser.runtime.sendMessage({action: "forwardButton"})
	.sending.catch((error) => { //right now, after closing the browser and reopening it again, with this catch function broken THE BUTTONS FUCKING WORKS!(it's (.sending has no place there) browser.runtime.sendMessage({action: "forwardButton"}).sending.catch )
		//SO BEST SOLUTION FOR THIS IS TO TELL USERS TO CLOSE AND OPEN THEIR BROWSER AFTER INSTALLING THIS ADDON
		console.log("e" + error.message)
		alert(error.message);
		if(error.message == "can't access dead object"){
			// back = document.getElementById("backButton");
			// forward = document.getElementById("forwardButton");
			reload();
		}
	});
}
forward.addEventListener("click", forwardButtonClick);

function reloadButtonClick(){
	let sending = browser.runtime.sendMessage({action: "reloadButton"});
}
reload.addEventListener("click", reloadButtonClick);
