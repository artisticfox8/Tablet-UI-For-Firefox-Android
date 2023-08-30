"use strict";
var TabsObject;
var SettingsObject;
var newTabURL = "https://www.google.com"; //issue was not var vs let, but newTabUrl being overwritten to the undefined items.searchEngine property
var sendPositionModMessageToContent = false;
//for tabs which are loaded after the 
var tabOrderModifications = {}; //{tabId: insertAfterId}

//both trueActiveTabId and activeTabId have their place
var activeTabId = 0;
var trueActiveTabId = 0; //always the real tab active tab id
let previousActiveTabId = 0

var tabBarPosition = 0; //same as let tabBarPosition in openNewTab

var debuggingTabURl = ""; //only for debugging

//when extension settings are opened, their tab gets added to tab bars => if we know the id of the tab, we can filter it in tabs.onUpdated listener easily (otherwise the details like url and title are loaded in separate events => as a result settings tab tabs with about:blank urls etc)
var settingsTabId = 0;
var settingsTabURL = "";

var faviconCache = {}; //page host (www.google.com) : faviconUrl

browser.tabs.query({active:true}).then(function(tabs){
	let tab = tabs[0];
	activeTabId = tab.id;
});

function handleGetFaviconURLResponse(request, sender, sendResponse, url){
	var resp = sendResponse;
	browser.tabs.sendMessage(sender.tab.id, {action: "getFaviconUrl"}).then(r =>{ //getThatFavicon //, url: request.url
		if(url in faviconCache){
			//without this check (icons for particular websites should only be written once, and not overwritten),
			//the faviconCache object gets overwritten to THIS:
			/*
			Object { "https://www.gme.cz": "https://cs.m.wikipedia.org/static/apple-touch/wikipedia.png", 
				"https://cs.m.wikipedia.org": "https://cs.m.wikipedia.org/static/apple-touch/wikipedia.png" }
			*/
			//AS A RESULT, ALL ICONS ARE WIKIPEDIA ICONS
			//happens despite this check, but only while reloading extension without reloading browser
		}else{
			faviconCache[url] = r;
			//co kdybychom to rekli ostatnim tady
			//resp(r) na to cekat nemusi, posleme to async
			console.log("TabsObject in handleGetFaviconURLResponse", TabsObject);
			//lets use tabsObject for list of tab ids  (we dont have to query tabs.query, because tabsObject is updated everytime a tab is opened: using updateTabObject )
			for (let i = 0; i < TabsObject.length; i++) {
				let id = TabsObject[i].id;
				//using tabCreated for this is messy, creates bugs
				//browser.tabs.sendMessage(id, {action: "tabCreated", ID: id, faviconUrl: r});
				//SO send a new event
				browser.tabs.sendMessage(id, {action: "faviconUpdated", tabWhoseFaviconIsUpdated: sender.tab.id, faviconUrl: r});

			}
			console.log(url,"FAVICON URL SIIIUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU", r) //WORKS
			resp(r);
		}	
	});
}
/*async*/ function handleMessage(request, sender, sendResponse) { //message from tab

	if(request.action == "getFaviconURL"){
		//https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
		//https://stackoverflow.com/questions/54442175/onmessage-addlistener-sendresponse
		//YASSSSSSS returning true after async call was the solution!
		handleGetFaviconURLResponse(request,sender,sendResponse, request.url);
		return true;

	}

	if(request.action === "phoneRotated"){

		browser.tabs.query({status: "complete"}).then(function(tabs){
			for (var i = 0; i < tabs.length; i++) {
				if(tabs[i].url.startsWith("about:")){
						//do nothing
				}else{
					if(tabs[i].id !== sender.tab.id){
						browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "phoneRotated", orientation: request.orientation});
					}
					
				}
			}
		});
	}
	//from tab bar iframe
	if(request.action === "translateYhackOff"){
		//to the content script
		browser.tabs.sendMessage(sender.tab.id, {action: "translateYhackOff"});
	}
	//from tab bar iframe
	if(request.action === "translateYhackOn"){
		//to the content script
		browser.tabs.sendMessage(sender.tab.id, {action: "translateYhackOn"});
	}


	//On Windows, this works, on Android it produces a correct position on the tab it was opened from, but not on other tabs
		//So, the idea is to store an object of tab position modifications, because 
		//getAllTabs has a different tab order
			//tab order depends on the order the tabs are being loaded
				//NOT to their position on the tab bar
					//(if you swipe left on the native adressbar, you will load a new tab (which was browsed during a previous session) and it will open to the right) 
						//if you swipe right, that new tab loaded will also load to the right

			//this all stems from the fact, that tabs which are not loaded, are not available with browser.tabs.query({})
			// => So store an object with tab order modifications

	//activeTabOnRightClickChangeHack and activeTabOnRightClickChangeHackOff work on Android
	if(request.action === "activeTabOnRightClickChangeHack"){
		//OK, this UI hack works, it positions the new tab to the right of right clicked tab
		//netřeba nějak resetovat, protože při dalším tab switch se activeTabId přehodí na správnou hodnotu: tohle je prostě fix pro otevírání z tab baru 
		//no need to reset it because after the next tab switch the activeTabId is overwritten to the real value: this is just a fix for opening tabs from the tab bar
		console.log(request.tabID);
		
		activeTabId = parseInt(request.tabID);
	}
	//from touchstart on content.js (user interacts with the page, not the tab bar)
	if(request.action === "activeTabOnRightClickChangeHackOff"){
		activeTabId = parseInt(trueActiveTabId);
	}

	//if activeTabOnRightClickChangeHack is activated, and the user CLOSES THE MENU, withou opening a new tab,
	//the new tab is created next to the => fixed with activeTabOnRightClickChangeHackOff
	if(request.action === "switchTab"){
		
		tabBarPosition = request.scrolled;

		//switches the tab in browser
		//switch the tab telling logic to activeTabChanged function in this script = that relies on browser tabs onActivated (=onActiveChanged)

		browser.tabs.sendMessage(parseInt(request.tabID), {action: "updateScroll", scrolled: tabBarPosition }).catch(function(e){
				if(e.message != "Could not establish connection. Receiving end does not exist."){
					console.error(e.message);
				}
		});

			//so that should be the same as .then() on this browser.tabs.update
		browser.tabs.update(parseInt(request.tabID), {active: true}); ///request.tabID is the tab we're switching to

	}
	if(request.action === "createTab"){
		//on Windows browser.tabs.create({}); opens the browser about:newtab tab page
		//on Android, it opens about:blank
		//if the user clicks the adressbar on that new tab, he could navigate to a different page
		//but the about:blank will still be open
		//=> So, a temporary fix is to open google.com instead
		if(newTabURL == undefined){
			throw new Error("newTabURL is undefined wtf");
		}
		previousActiveTabId = sender.tab.id
		browser.tabs.create({url: newTabURL}); //"https://www.google.com"
	}

	if(request.action === "closeTab"){ //Add tab selected styling to tab browser will navigate to after this
		if(request.switchToTab != ""){
			console.log("tab switch after close tab, active tab is " + request.tabID + " switching to " + request.switchToTab);
			browser.tabs.update(parseInt(request.switchToTab), {active: true});
		} 	
		let removing = browser.tabs.remove(parseInt(request.tabID));

		removing.then(function(e){ // integer or integer array)
			//add a response so other tabs know
			browser.tabs.query({}).then(function(tabs){
				console.log(tabs); 
				for (var i = 0; i < tabs.length; i++) {
					//still althought new tab query Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
						//if(parseInt(tabs[i].id) != request.tabID){
							let xd= browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "tabClosed", ID: request.tabID});
							xd.catch(err=> console.log(err));
						//}
						
					}
				});

		});
		

	}
	if(request.action === "backButton"){
		console.log("back");
		//TODO: add tab description update IF NEEDED: ON PAGES LIKE GITHUB.COM, when the whole page isn't reloaded
		browser.tabs.goBack(); //tabId : The ID of the tab to navigate. Defaults to the active tab of the current window.

	}

	if(request.action === "forwardButton"){
		browser.tabs.goForward();
	}
	console.log(request.action);

	if(request.action === "reloadButton"){
		browser.tabs.reload();
	}
	//INTERMITTENTLY NEEDED, IF storage.onUpdated doesn't fire
	//Without it, for some reason, settings are updated only on the active tab, and not on the other loaded tabs
	if(request.action === "sendUpdateSettings"){
		console.log("sendUpdateSettings request received")
		//FOR SOME REASON IT TAKES LIKE 200 ms to display
				browser.tabs.sendMessage(parseInt(trueActiveTabId), {action: "updateSettings", settings: request.settings})
			browser.tabs.query({}).then(function(tabs){
				for (var i = 0; i < tabs.length; i++) {
					if(tabs[i].url.startsWith("about:")){
						//do nothing
					}else{
						browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "updateSettings", settings: request.settings})
					}
				}
			});	
	}
	if(request.action === "settingsAreOpen"){
		//only logging the sender object allowed us to see, why sender.tab.id does not work 

		//TL:DR: the settings page sender does not have a tab.id property, though it appears as a tab
		//so the option is destroying the tab in the tab bar after the moz-extension:// url is detected (then the id is known in openNewTab.js)


		//the sender object looks like this:
		/* Object {
		  "contextId": 448,
		  "id": "4b3513fa4116075313f3e98669b476cd062d1fac@temporary-addon",
		  "envType": "addon_child",
		  "url": "moz-extension://a430bbbc-b55d-45b4-a35c-8febccebc356/Tablet%20UI%20for%20Firefox%20settings.html"
		}*/

		//so the TAB's ID (10091 in this case) is not available from this data

		//even the url is set in multiple steps, so blocking the tab by url moz-extension:// would mean there would be a tab with a "loading" title
		//so the option is destroying the tab in the tab bar after the moz-extension:// url is detected (then the id is known in openNewTab.js)
		
		//settingsTabId = sender;
		//console.log("settingsAreOpen", settingsTabId);
		settingsTabURL = sender.url;
		console.log(sender.url)
		console.log(request.url) //those two are the same good, the checks are going to be moved to openNewTab.js

			browser.tabs.query({}).then(function(tabs){
				for (var i = 0; i < tabs.length; i++) {
					if(tabs[i].url.startsWith("about:")){
						//do nothing
						console.log("wat", tabs[i].url);
					}else{
						browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "closeGraphicalSettingsTab", url: request.url})
					}
				}
			});
	}

	if(request.action === "getAllTabs"){
		
		//switched to using TabsObject to make it faster
		TabsObject.adresat = sender.tab.id.toString();
		console.log("settings to be sent before fix", TabsObject.settings);
		TabsObject.settings = SettingsObject;
		console.log("settings to be sent after fix", TabsObject.settings);

		//added missing TabOrderModifications sync (in v2.3 pre release lol => no wonder it wasn't syncing)
		TabsObject.tabOrderMods = tabOrderModifications;
		
		//TabsObject on Android doesn't have info about page favicons, on desktop it would have faviconUrl property of every tab in browser.tabs.query({})
		//so adding support for favicons using an object with their urls and img tags in tab bar
		TabsObject.favicons = faviconCache;
		sendResponse(TabsObject); //for normal function //FALSE: TlDR: making this function async does not work, sendResponse followed by return true doesnt work, sendResponse alone doesnt work, return TabsObject doesnt work
		//return TabsObject; //for async function
	}
}

//Fix for pages like github (which use history api to when going between pages - iframe is not reloaded by default (as content scripts are only reset on new complete pageload ))
//github doesn't like iframes, outputs: Security Error: Content at https://github.com/mozilla/mozilla-central may not load or link to moz-extension://6b99713d-fe4d-4ccb-9dc9-f152888c2de6/tab%20bar%20v4.html.
//and deletes the iframe
//SO, LET'S EXPERIMENT WITH HIDDEN SHADOW DOM //
//TL:DR works 80% of the time, when you navigate a github repo without reloading any of the URLs; when you do reload a page on github, it's not gonna load when you navigate the repo//
//that's what this function does:
function requestToContentScript(details){
	console.log("URL updated using History API", details)
	//WORKS, but sometimes Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
	//So maybe run this after say 50ms

	//apparently this line caused Content Security Policy: The page’s settings blocked the loading of a resource at eval (“script-src”).
	//although I called the browser.tabs.sendMessage FUNCTION, not any kind of string lol
	//So wrapping it in function(){}

	//experimental idea to add a height info 
	//(sometimes on news sites, it is reloaded this way and new height is not sent)
	//reproducible on dictionary.cambridge.com

	let data = {action: "reload"};
	if(SettingsObject.height !== "50"){
		console.log(SettingsObject.height) //outputs 60 as it should, but tab bar on content script is still very tall (that was an invalid value issue, basically px appended twice so 60pxpx)
		data.height = SettingsObject.height; 
	}
	browser.tabs.sendMessage(parseInt(details.tabId), data)

}

browser.webNavigation.onHistoryStateUpdated.addListener(requestToContentScript);


browser.runtime.onMessage.addListener(handleMessage);


function activeTabChanged(activeInfo){
	//The ID of the tab that has become active
	//stores the id in a global var
	activeTabId = activeInfo.tabId;
	trueActiveTabId = activeInfo.tabId;

	//NVM it works!!! (but a bit slower at applying active tab style on tab bar, just introduces that and a bit of gitter as the tab scroll position is updated (jumps) in front of the use (DOES NOT AFFECT THE LOADING TIME
	//it works when switching tabs normally, but not when the active tab is closed so this didn't improve it
	//works just as well as the code it replaced in tabswitch, but there sometimes is a tiny but visible delay, after the tab has been switched to, but before it looks selected in the tab bar
	//so, sorting it out in onRemoved
	console.log("activeTabChanged") //gets logged after closeTab idk


	//what if we put this line twice (here and in switchTab)
	//this line (it works), but when sending a message to tab which starts with about, gives an errorError: Could not establish connection. Receiving end does not exist 
	console.warn("activeInfo",activeInfo)
	browser.tabs.sendMessage(parseInt(activeInfo.tabId), {action: "switchedToThisTab", ID: activeInfo.tabId, scrolled: tabBarPosition }).catch(function(e){
				if(e.message != "Could not establish connection. Receiving end does not exist."){
					console.error(e.message);
				}
	});
	

	//TL:DR put the switchedToThisTab logic exclusively here in this tab

	//send the new active tab that it is active, so it is selected in tab bar after a closed tab (switchedToThisTab styling part may be thrown out - switchedToThisTab will remain for syncing the tab bar scrolling across tabs

	//(NOT using focus events on either content or openNewTab js, they would not work reliably - switching between content and tab bar would trigger the effect)

}

browser.tabs.onActivated.addListener(activeTabChanged);


//Add tab updates
//When new tab is opened using right click for example

//tabCreated is fired everytime when:
// a completely new tab is created
// user navigates to different page in an existing tab
// the active tab changes (EVERYTIME WHEN USER SWITCHES TABS)

//but NOT sent to active tab when user reloads it, or navigates active tab
//but not when tab is closed


function shareWithContentScripts(tabId, changeInfo, tab){
	//same as sendPositionModMessageToContent
	//SPEEDS IT UP A LOT! THE TAB BAR ISN'T JUMPING AT ALL (TESTED ON WIKIPEDIA)
	//THE ONLY THING is that when the user changes the position from top to bottom, the position may still be top when the user navigates back, so on cached pages (where the page is not reloaded when it's navigated to through the back button: idea send a message on browser.tabs.goBack().then(), as the JS is stil responsive on these pages (when the user has changed settings in that session) )
	if(SettingsObject.place == "top"){
		let data = {action: "updateTabBarPos", place: "top"}
		//send updated tab bar height and tab position update in one message to make it look better (to avoid jumping effects)
		if(SettingsObject.height != "50"){
			data.height = SettingsObject.height;
		}
		//browser.tabs.sendMessage(tabId, {action: "updateTabBarPos", place: "top"});
		browser.tabs.sendMessage(tabId, data);
	}else{
		if(SettingsObject.height != "50"){
			browser.tabs.sendMessage(tabId, {action:"tabBarHeightMod", height: SettingsObject.height});
		}
	}
	//this line revealed, that all necessary info is in the tab Object
	//no need to figure out what is in changeInfo with if statements and send partial updates (tabs with text of loading a lot of the time)
	console.log("tab as seen in shareWithContentScripts (tabs.onUpdated listener)", tab);
	//the tab object here looks like this (some properties listed here)
	/*
												active: true
												audible: undefined
												height: 838
												id: 10001
												status: "complete"
												title: "Google"
												url: "https://www.google.com/"
												width: 414
	*/
	let changedStuff = {action: "tabCreated", ID: tabId.toString()}
	let url = tab.url.split("/")
	let base = url[0] + "//" + url[2]; //https://www.google.com

	console.log("faviconCache", faviconCache);
	//if favicon cache has this url, send it 
	//so it is a bit faster (than calling getFaviconUrl in content.js and getting the response)
	if(base in faviconCache){
		changedStuff.iconUrl = faviconCache[base];
	}
	changedStuff.title = tab.title;
	changedStuff.url = tab.url;

	//what if I send tabOrderModifications always and everywhere?
	//=> That's what I do, but this part is not about sending, but about adding more keys
	if(String(tabId) in tabOrderModifications){
		//tabId already, there, tab exists
		//the only data updated are the title and url properties
		//the tab position stays the same
	}else{
		//that tab is always inserted after a tab with a certain id
		//does it REALLY make sense to have tabOrderModifications keys like this? 10059: 10059
		//SO:
		// if(tabId != activeTabId){
		// 	tabOrderModifications[tabId] = activeTabId;
		// }
		if(SettingsObject.placeNewTab == "insertAfterCurrent"){
			tabOrderModifications[tabId] = previousActiveTabId;
		}else{
			tabOrderModifications[tabId] = activeTabId
		}
	}


	changedStuff.tabOrderMods = tabOrderModifications;

	browser.tabs.query({}).then(function(tabs){

		TabsObject = tabs;	
		//ahaaa => this is a sync of the properties to TabsObject, which is sent to the newly loaded tab, but not a sync of the property to changedStuff, which I now want => added changedStuff.tabOrderMods = tabOrderModifications; a few lines above
		TabsObject.favicons = faviconCache;
		TabsObject.tabOrderMods = tabOrderModifications;
		console.log("copak jsou tabOrderModifications undefined?: ", tabOrderModifications);
		TabsObject.settings = SettingsObject;

		console.log(changeInfo); 
		//sometimes the changeInfo is only {status: "complete"}
		//so no changes to title or url
		//sometimes its { status: "complete", url: "https://www.google.com/" } though

		console.error("run tabCreated")
		for (var i = 0; i < tabs.length; i++) {
			if(tabs[i].url.startsWith("about:")){
				//do nothing
			}else{
				//send position changes to all tabs
				if(sendPositionModMessageToContent){
					browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "updateTabBarPos", place: "top"});
				}
				let xd= browser.tabs.sendMessage(parseInt(tabs[i].id), changedStuff);
			}
		}
	});
}



//a bunch of these events are fired before all tabs are even loaded, so register this listener only after all iframes have been loaded)

//To filter out tab switch
//Wow, gets seems to get rid of errors on startup : But filter it's not supported on Android
// const filter = {
// 	properties: ["url","title"] //added title to filter (changeInfo only includes the properties here) //So work around without using filter to make it compatible with Android
// }

//Experiment with navigation.onCompleted
//not really, because there is no way how to get tab title
//web navigation supports tab.url and tab.id
//so then get tab title using browser.tabs.get(tab.id)
// chrome.webNavigation.onCompleted.addListener(function(tab) {
//     if(tab.frameId==0){ //only main page navigation change, not iframe navigation change

    	
//     }
// });

browser.tabs.onUpdated.addListener(shareWithContentScripts); //,filter //IDEA: how about using navigation.onCompleted

//for tabs closed programatically
//browser.tabs.onClosed


//perf experiment: CACHE the browser.tabs.query({}) object so page loads are faster => returns the object when getAllTabs is called instantly 
//(loads a new copy everytime while a new tab is loading)

//TL;Dr: is dramatically faster, but does not update when getAllTabs is called from a tab previosly opened, but not loaded in memory => basically any session restore tab (ESPECIALLY IMPORTANT ON ANDROID)
function updateTabObject(firstRun){
	browser.tabs.query({}).then(function(panely){
		TabsObject = panely;
		
		TabsObject.favicons = faviconCache;
		TabsObject.tabOrderMods = tabOrderModifications;
		TabsObject.settings = SettingsObject;
		console.error(TabsObject)

		console.log("SettingsObject updated", SettingsObject);

		//sometimes settings are not applied to the first opened tab on startup 
		//probably because the tab is loaded and __tabs.onCreated is called__ before SettingsObject is set in onGot)
		//so this updateTabObject callback is called before the settings are read from storage
		//so putting a updateSettings event in onGot, in case any tabs were loaded before  this updateTabObject function runs

		//in onGot, the updateSettings event IS sent, but it only to tabs with {status: "complete"} 
		//so if our first tab is still loading while onGot runs (and after updateTabObject runs with no settings to tell it)
		//THE TAB NEVER GETS TOLD THE SETTINGS

		//maybe filtering for loaded tabs in onGot is outdated because our content script runs on "document_start" now, not the default "document_idle"
		//so looking up all tabs with browser.tabs.query({}) and sending settings to loading tabs (which surely have content2.js initialized)
		//	=> YES, FIXED

		//SO THE SOLUTION is probably to remove the {status: "complete"} filter and to send settings to all tabs
		//also added TabsObject.settings = SettingsObject; in getAllTabs (it needed to be added 
		//because when updateTabObject is called, the settings aren't read from storage yet )
		//	=> WORKS 

	});
}

browser.tabs.onCreated.addListener(updateTabObject); //how about calling this from the handler which opens the new tab

//so it works on session restore 
updateTabObject(true);


//Add settings support
//Load settings in memory to SettingsObject from browser.storage.local
//Send the settings to the tab at getAllTabs
//and browser.storage.onChanged.addListener(callback)
function isEmptyObject(obj) {
		var name;
		//checks if the user has stored anything
		for (name in obj) {
		    if (obj.hasOwnProperty(name)) {
		        return false;
		    }
		}
		return true;
}
//browser.storage.local.get().then(onGot)
function onGot(items){
		console.log("read storage", items);
		if(items == undefined || isEmptyObject(items)){ //isEmptyObject(items) prolly doesnt work
			//default settings

			//added height to avoid sending undefined to page after URL updated using History API has ran, if the user hasn't changed the height
			//set default checkbox settings so they're displayed in the settings page propertly (all checkboxes being checked without using checked attribute)
			let v = {
  			"showBackButtonVertical": true,
				"showReloadButtonVertical": true,
				"showForwardButtonVertical": true,
				"showBackButtonHorizontal": true,
				"showReloadButtonHorizontal": true,
				"showForwardButtonHorizontal": true,
				"height": "50",
				"place": "bottom",
				"searchEngine": "https://google.com",
				"to": "left"
  		}
			browser.storage.local.set(v)		
		}else{
			//user has set anything
			SettingsObject = items;
			console.error(items.searchEngine == undefined); //used to ouput true before I add the items == undefined check  => isEmptyObject check fails = isn't searchEngine always defined if settings are defined
			//if(items.searchEngine != undefined){
				newTabURL = items.searchEngine;
			//}
			console.error("is it undefined on first run",items.place == undefined);
			if(items["place"] == "bottom"){ //works

				sendPositionModMessageToContent = false;
				console.error("řřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřř")

				//our content script isn't loaded on "document_idle" but on "document_start"
				//so why are we checking for loaded tabs({status: "complete"})?
				//what about tabs that are still loading
				//test sending it to all tabs
				browser.tabs.query({}).then(function(tabs){ //{status: "complete"}
					for (var i = 0; i < tabs.length; i++) {
						if(tabs[i].url.startsWith("about:")){
							//do nothing
						}else{
							browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "updateTabBarPos", place: "bottom"});
							//same as the settings key in getAllTabs response, this is for sending changes before tabs reload
							browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "updateSettings", settings: items});
							console.log("updateSettings to send correct settings sent")

							if(items.height != "50"){
								browser.tabs.sendMessage(parseInt(tabs[i].id), {action:"tabBarHeightMod", height: items.height});
							}

						}
					}
				});				

			}else if(items["place"] == "top"){

					sendPositionModMessageToContent = true;
					//test sending it to all tabs
					browser.tabs.query({}).then(function(tabs){ //status: "complete"
						for (var i = 0; i < tabs.length; i++) {
							if(tabs[i].url.startsWith("about:")){
								//do nothing
							}else{
								browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "updateTabBarPos", place: "top"});
								//same as the settings key in getAllTabs response, this is for sending changes before tabs reload
								browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "updateSettings", settings: items});

								if(items.height != "50"){
									browser.tabs.sendMessage(parseInt(tabs[i].id), {action:"tabBarHeightMod", height: items.height});
								}
								
							}
						}
					});
				}
		}
}
function launchSettings(){
	let gettingItem = browser.storage.local.get();
	gettingItem.then(onGot);
}
launchSettings();
//That was just setting the fontSize wrong (see the fontSize and getElementsByClassName(tabTitle) comment)
//for some reason, it is not always fired reliably (maybe testing for too long, resetting settings many times per session)
browser.storage.onChanged.addListener(launchSettings);
