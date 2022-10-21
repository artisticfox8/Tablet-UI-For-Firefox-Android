var TabsObject;
var SettingsObject;
var newTabURL = "https://www.google.com";
var sendPositionModMessageToContent = false;
//for tabs which are loaded after the 
var tabOrderModifications = {}; //{tabId: insertAfterId}

//both trueActiveTabId and activeTabId have their place
var activeTabId = 0;
var trueActiveTabId = 0; //always the real tab active tab id

var tabBarPosition = 0; //same as let tabBarPosition in openNewTab

var debuggingTabURl = ""; //only for debugging

//when extension settings are opened, their tab gets added to tab bars => if we know the id of the tab, we can filter it in tabs.onUpdated listener easily (otherwise the details like url and title are loaded in separate events => as a result settings tab tabs with about:blank urls etc)
var settingsTabId = 0;
var settingsTabURL = "";

browser.tabs.query({active:true}).then(function(tabs){
	let tab = tabs[0];
	activeTabId = tab.id;
});
function handleMessage(request, sender, sendResponse) { //message from tab

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
		browser.tabs.create({url: newTabURL}); //"https://www.google.com"
	}

	if(request.action === "closeTab"){ //Add tab selected styling to tab browser will navigate to after this
		let removing = browser.tabs.remove(parseInt(request.tabID));
		removing.then(function(e){ // integer or integer array)
			//add a response so other tabs know
			browser.tabs.query({}).then(function(tabs){
				console.log(tabs); 
				for (var i = 0; i < tabs.length; i++) {
					//still althought new tab query Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
						if(parseInt(tabs[i].id) != request.tabID){
							let xd= browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "tabClosed", ID: request.tabID});
							xd.catch(err=> console.log(err));
						}
						
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
		console.log("FUCKING WERGRWEGFFFFFFFFFFFFFFR RECIIEVED OKAY")
		//FOR SOME REASON IT TAKES LIKE FUCKING 200 ms to display
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
		//EUREKA! WORKS! followed https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage#examples for correct promise based
		// return browser.tabs.query({}).then(function(panely){
		// 	console.log("sender",sender.tab);
		// 	//testing 
		// 	panely.adresat = sender.tab.id; //add info, where this is sent -> that tab will be higlighted

		// 	panely.tabOrderMods = tabOrderModifications;

		// 	return panely;
		// });

		//switched to using TabsObject to make it faster
		TabsObject.adresat = sender.tab.id;
		sendResponse(TabsObject);
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

		updateTabObject(); //to make sure right tab titles are sent => possible perf idea to maintian a list of tabs and add changes to it to gain perfromance (right now we're querying the browser.tabs.query often, and that is like 30ms slow)
		//OK, this gets logged
		//TODO: filter isn't supported on Android: by default browser.tabs.onUpdated reports changes of any kind: url, tab switch, status (ie if ant tab is loading), audible, etc
	  var changedStuff = {action: "tabCreated", ID: parseInt(tabId)}
		if("url" in changeInfo){
			changedStuff.url = changeInfo.url;

		}
		if("title" in changeInfo){
			changedStuff.title = changeInfo.title;
		}

		//activeTabId sent, so new tab insert after activeTabId
		//for Android - store the position of these newly opened tabs, because getAllTabs positions them differently (already explained in openNewTab js)
		//so it's OK: tabs can't be moved in Android and tabIds are unique per session
		if(String(tabId) in tabOrderModifications){
			//tabId already, there, tab exists
			//the only data updated are the title and url properties
			//the tab position stays the same
		}else{
			//that tab is always inserted after a tab with a certain id
			tabOrderModifications[tabId] = activeTabId;
			
		}
		console.warn("tabOrderModifications",tabOrderModifications);

		console.log("fewwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdated")
		//IDEA: remove "status: complete" to stop the tab bar jumping when setting tab bar position to top
		browser.tabs.query({}).then(function(tabs){ //added status: "complete"
		//OOH right, so that active reloading tab only gets getAllTabs response and not tab created
					console.log(changeInfo); 
				for (var i = 0; i < tabs.length; i++) {
					if(tabs[i].url.startsWith("about:")){
						//do nothing
					}else{
						//send position changes to all tabs
						if(sendPositionModMessageToContent){
							browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "updateTabBarPos", place: "top"});
						}
						//if statement so that we don't send the tabs update info to the new tab, which is polling getAllTabs anyways
						//actually, with the architecture change that the tab bar gets a cached version of tabs (TabsObject),
						// it makes sense to send the update to the active tab (otherwise the active tabs title stays loading on that tab)
						//for example: 
						//1) go to google.com, you will see it says loading in the tab title
						//2) go to any other tab, the title of that google tab is going to be google
						//so we need to send the title update (google) to that google tab as well
						//if(tabs[i].id != tabId){

							//already in getAllTabs: also lets send the tab its id, so it knows its own id
							//changedStuff.yourID = tabs[i].id;

							//console.error("real tab.index", tab.index);
	
						changedStuff.activeTabID = activeTabId;
						console.log("sending to right tabs " + tab.title);
						debuggingTabURl = tabs[i].url;
						let xd= browser.tabs.sendMessage(parseInt(tabs[i].id), changedStuff);
							
						//let xd= browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "tabCreated", ID: parseInt(tabId), title: changeInfo.title, url: changeInfo.url}); //apparently title should be changeInfo title
					
						xd.catch(function(err){
							//idk, normal tabs on which the tab bar is working normally, idk why throws error: Could not establish connection. Receiving end does not exist.
							//closing other tabs from that tab with URL of debuggingTabURl works, opening tabs works.
							console.error(err.message, debuggingTabURl)
						});
								//}
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
function updateTabObject(){
	browser.tabs.query({}).then(function(panely){
		TabsObject = panely;
		console.error(TabsObject)
		TabsObject.tabOrderMods = tabOrderModifications;
		TabsObject.settings = SettingsObject;

	});
}

browser.tabs.onCreated.addListener(updateTabObject);

//so it works on session restore 
updateTabObject();


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
		if(isEmptyObject(items)){
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
				"height": "50"
  		}
			browser.storage.local.set(v)		
		}else{
			//user has set anything
			SettingsObject = items;
			newTabURL = items.searchEngine;
			if(items["place"] == "bottom"){ //works

				sendPositionModMessageToContent = false;
				console.error("řřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřřř")

				browser.tabs.query({status: "complete"}).then(function(tabs){
					for (var i = 0; i < tabs.length; i++) {
						if(tabs[i].url.startsWith("about:")){
							//do nothing
						}else{
							browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "updateTabBarPos", place: "bottom"});
							//same as the settings key in getAllTabs response, this is for sending changes before tabs reload
							browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "updateSettings", settings: items});

							if(items.height != "50"){
								browser.tabs.sendMessage(parseInt(tabs[i].id), {action:"tabBarHeightMod", height: items.height});
							}

						}
					}
				});				

			}else if(items["place"] == "top"){

					sendPositionModMessageToContent = true;

					browser.tabs.query({status: "complete"}).then(function(tabs){
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
