# Tablet-UI-For-Firefox-Android
This add-on re-implements the tab bar from desktop we all love, on Android tablets, on Firefox. It has all the familiar buttons like back, forward, reload and new tab. You can scroll the list of your opened tabs, you can close or duplicate tabs, just like on desktop


## How to install on Android
1.	Download Firefox Nightly from Google Play
2.	In Firefox Nightly settings, open About Firefox Nightly
3.	Tap the Firefox logo on that page 5 times, the advanced options appear
4.	Go back to see all settings
5.	Under Addons, select Your own Addon collection
6.	Paste the following for user id: 15613358  and for collection name: Android-compatible-addons-by-J

![obrazek](https://user-images.githubusercontent.com/77014769/208732919-0b606e25-f41b-4af0-bae4-a9f7d4bc11bd.png)


You can see screenshots at: https://addons.mozilla.org/en-US/firefox/addon/tablet-ui-for-firefox/

## Changelog
**v2.3 fixed three user interface bugs:** 
- Settings were not applied to the first loaded tab (basically the tab was loaded before the storage was read)
- Tab order was not always consistent (basically TabOrderModifications were not sent to every tab like they should have)
- The selected style was not always applied to the active tab (due to tabs being drawn async because getting favicons)

v2.2 SHIPPED FAVICON SUPPORT (those little pictures you see in the screenshot)

v2.0 Added settings and customization for users

v1.0 Initial release
