"use strict;"
browser.runtime.sendMessage({action:"settingsAreOpen", url: window.location.href});
//ENFORCED STRICT TYPE CONTROLS FOR INPUT TYPE URL using regex (IF IT DOES NOT START WITH HTTPS:// OR HTTP:// AND HAS A DOT IN IT)
//Without Regex THE TYPE IS URL, BUT WHEN I PUT STRING IN THERE, IT JUST IGNORES IT
document.getElementById("searchEngineOther").addEventListener("click", function(e) {
    document.getElementById("other").click();
});

document.getElementById("resetSettingsr").addEventListener("click", function(e){
		document.getElementsByClassName("reset")[0].classList.remove("hidden");
});
document.getElementById("cancel").addEventListener("click",function(){
	document.getElementsByClassName("reset")[0].classList.add("hidden");
});
document.getElementById("resetSettings").addEventListener("click",function(){
	browser.storage.local.clear().then(function(e){
			//set default radiobutton settings so the defaults are are displayed without a full page reload (when the checked attributes kick in), because we want to show the "Reset to default settings" text to users
			//set default checkbox settings so they're displayed in the settings page propertly (all checkboxes being checked without using checked attribute)
			let v = {
  			"showBackButtonVertical": true,
				"showReloadButtonVertical": true,
				"showForwardButtonVertical": true,

				"showBackButtonHorizontal": true,
				"showReloadButtonHorizontal": true,
				"showForwardButtonHorizontal": true,
				"fontSize": "14.4",
				"height": "50",
				"place": "bottom",
				"searchEngine": "https://www.google.com"
  		}
			browser.storage.local.set(v).then(function(e){
				document.getElementById("settingsResetIndicator").classList.remove("hidden");
				document.getElementById("storedInStorageIndicator").classList.add("hidden");
				restoreOptions();
			});
	});
	document.getElementsByClassName("reset")[0].classList.add("hidden");
});

// function sendSettingsChangeEvent(){
// 	browser.runtime.sendMessage({action:"sendUpdateSettings",settings: settingsObject});

// }

	  //form 
	  function saveOptions(e){
	  	e.preventDefault();


	  	document.getElementById("settingsResetIndicator").classList.add("hidden");

	  	document.getElementById("other").value = document.getElementById("searchEngineOther").value;

	    //https://stackoverflow.com/a/56857084/11844784
			
			const form = document.querySelector('form');

			const data = Object.fromEntries(new FormData(form).entries());
			console.log(data)

			if(document.getElementById("other").checked) {
				//alert(document.getElementById("searchEngineOther").reportValidity()) //this broke the form, so switching to regex
				//https://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url
				var expression = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
				var regex = new RegExp(expression);
				var t = document.getElementById("searchEngineOther").value;

				if (t.match(regex)) {
				  //alert("Successful match");
				  //works
				} else {
				  //alert("No match");
				  document.getElementsByClassName("dataNotSaved")[0].classList.remove("hidden");
					document.getElementById("confirm").addEventListener("click", function(){
						document.getElementsByClassName("dataNotSaved")[0].classList.add("hidden");
					});
					return;
				}


				data.customSearchPage = true; //to make it simpler in onGot (alternative would be comparing the saved value with a list of default search engines)
			}else{
				data.customSearchPage = false;
			}
			//alert(JSON.stringify(data, null, 2))
			if(data.searchEngine == ""){ //nefungovalo to, zničilo to ten form => !document.getElementById("searchEngineOther").reportValidity() ){ //other
				document.getElementsByClassName("dataNotSaved")[0].classList.remove("hidden");
				document.getElementById("confirm").addEventListener("click", function(){
					document.getElementsByClassName("dataNotSaved")[0].classList.add("hidden");
				});
				return;
			}

			//to avoid old data not being removed
			//(old data is removed only when THAT PROPERTY has a different value)
			//if the old property is not in the new data, it will not get overwritten, it will stay (in this app for checkboxes)
			//so basically remove all checkbox properties
			//(I could have used storage.clear too, this is just more efficient)
			browser.storage.local.remove([
				"showBackButtonVertical",
				"showReloadButtonVertical",
				"showForwardButtonVertical",

				"showBackButtonHorizontal",
				"showReloadButtonHorizontal",
				"showForwardButtonHorizontal",
			]).then(function(e){
				browser.storage.local.set(data).then((event) =>{
					document.getElementById("storedInStorageIndicator").classList.remove("hidden");
					console.log(data) //AHA, data je tady defined
					//OMG, Javascript neni blbej!!!!
					browser.runtime.sendMessage({action:"sendUpdateSettings",settings: data});

					browser.runtime.sendMessage({action:"settingsAreOpen", url: window.location.href});
					//sendSettingsChangeEvent(); //because the data variable is not available here
				});
			});

	  }
	  document.querySelector("form").addEventListener("submit", saveOptions);



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

function onGot(items){
		console.log("itemsssssssssssssssssssssssssssssssssssssssssssssss",items)
		if(isEmptyObject(items)){
				alert("dat shit")
		}else{
			for(let x of Object.keys(items)){
    		let elements = document.getElementsByName(x);
    		console.log("ran")
    		//console.log(elements);

    		for (var i = 0; i < elements.length; i++) {

    			let type = elements[i].type;
    				
    			if(type == "checkbox"){ //only checked checkboxes appear in items
    				elements[i].checked = true;
    				//console.log(elements[i]);
    				//alert(JSON.stringify(elements[i],null,2));
    			}
    			else if(type == "radio"){
    				console.log(elements[i].value, items[x]);
    				console.log(elements[i]);
						let value = items[x]; //saved value
						if(elements[i].value == value ){
								elements[i].click();
						}

					}
    			else if(type == "number"){ 
    				elements[i].value = items[x];
    			}

    		}
			}
			//fix for when other search engine is selected (i. e. https://seznam.cz)
			if(items.customSearchPage == true){
				document.getElementById("searchEngineOther").value = items.searchEngine;
				document.getElementById("searchEngineOther").click();
			}
		}
}

function restoreOptions(){
		let gettingItem = browser.storage.local.get();
		gettingItem.then(onGot);
}


document.addEventListener("DOMContentLoaded", restoreOptions);


//set timeout breaks it completely, it needs to be sent faster than all the checks on tabs.onUpdated
// setTimeout(()=>{
// 	//to run after all the tab.onUpdated events have been ran
// 	browser.runtime.sendMessage({action:"settingsAreOpen", url: window.location.href});
// }, 100);
