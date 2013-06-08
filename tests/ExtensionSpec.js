/**
 * @fileOverview tests.js Gives testing code for the Chrome Extension.
 * It is currently being used to develope new functionality, but test
 * cases will be added for complete code coverage. It recently changed 
 * to the Jasmine JS testing library, but full integration is not complete.
 * Notably, the testing style is not following Jasmine's conventions on
 * "wait."
 **/
 
describe("Extension", function() {

  /** 
   * Tests modal button functionality. This is a naively implemented
   * test case. Future versions should more gracefully handle Chrome's
   * callbacks. This example indicates that every function may need to 
   * support a callback parameter in order to support asynchronous testing.
   */
  it("should change the modal button", function() {
    //Get all the windows so we can get a tab
    var tab = null;
    var originalBadgeText= null;
    var flag,flag1;

    runs(function(){
      flag = false;
      chrome.windows.getAll({"populate" : true},function(windows){
        // Get a valid Tab
        for (var i = 0; i < windows.length; i++) {
          if(windows[i].tabs.length > 0) {
            tab = windows[i].tabs[0];
            flag = true;
            break;
          }
        }
      });
    });
    waitsFor(function(){
      return flag;
    }, "The tab should be defined",1000);
    runs(function(){
      flag1 = false;
      // Get the current setting of the badge text
      // so we can flip it.
      chrome.browserAction.getBadgeText({}, function(currentText) {
        originalBadgeText = currentText;
        flag1 = true;
      });
    });
    waitsFor(function(){
      return flag1;
    }, "The originalBadgeText should be defined",1000);
    runs(function(){
      // We define a callback for the function we are testing so we can
      // check the results without needing to use setTimeout
      function testingCallback() {
        if (originalBadgeText === "off") {
          chrome.browserAction.getBadgeText({},
            function(currentText) {
              expect(currentText).toEqual("on");
            }
          );
        } else if(originalBadgeText === "on") {
          chrome.browserAction.getBadgeText({},
            function(currentText) {
              expect(currentText).toEqual("off");
            }
          );
        } else {
          expect("false").toEqual("true");
        }
        
        // Attempt to toggle the modal button back to its prior state
        modalButtonCallback(tab);
      }
      
      // Now that we have setup the test, it is time to check the
      modalButtonCallback(tab, testingCallback);
    });
  });
});

describe ("First Run Suite", function() {
  var page = chrome.extension.getURL("pages/first_run.html");
  function close_window(){
    chrome.tabs.query({url:page},function(tabs){
      if(tabs[0]){
        chrome.windows.remove(tabs[0].windowId);
      }
    });
  }
  function get_windows(){
    console.log("Called get_windows");
    var windows1 = null;
    var flag1 = false;
    runs(function(){
      chrome.windows.getAll({populate:true},function(window_list){
        windows1 = window_list;
        flag1 = true;
      });
    });
    waitsFor(function(){
      return flag1;
    },"Windows Should be defined",1000);
    runs(function(){
      console.log(windows1);
      expect(windows1).not.toBe(null);
      return windows1;
    });
  }
  function count_of_tabs(page){
    console.log("Called count_of_tabs");
    var windows = get_windows();
    console.log("Got windows");
    var flag,flag1 = false;
    var tab_count = 0;
    for (var i = 0; i < windows.length; i++){
      runs(function(){
        flag = false;
        //return all tabs in each window that match the first_run url
        chrome.tabs.query({windowId:parseInt(windows[i].id,10),url:page},
          function(tab){
            //tab_count+=tab.length;
            tab_count+=1;
            flag = true;
          }
        );
      });
      waitsFor(function(){
        return flag;
      },"Should sum tabs",1000);
    }
    return tab_count;
  }
  /*
   * Test the function that gets the running privly version
   */
  it("tests getPrivlyVersion", function() {
      var output = getPrivlyVersion();
      expect(output).toMatch(/\d+\.\d+\.\d+/);
  });

  /*
   * Test the function that gets the version in local storage
   */
  it("tests getStoredVersion", function() {
      var output = getStoredVersion();
      expect(output).toEqual(localStorage["version"]);
  });

  /*
   * Test the function that updates local storage with the running version
   */
  it("tests update_version", function() {
      var existing = getStoredVersion();
      var modified = existing + "99";
      update_version(modified);
      expect(getStoredVersion()).toEqual(modified);
      update_version(existing);
  });

  /*
   * Test the function that launches the first_run.html page
   */
  it("tests firstrun function", function(){
    var tabs_before = count_of_tabs(page);
    var done = false;
    runs(function(){
      var result = firstrun();
      while (result !== "Done"){
        console.log("Waiting on firstrun");
      }
      done = true;
    });
    waitsFor(function(){
      return done;
    },"Should have launched new firstrun window",2000);
    runs(function(){
      var tabs_after = count_of_tabs(page);
      expect(tabs_after).toEqual(tabs_before+1);
    });
  });

  /*
   * Test the function that launches the first_run.html page when not updated or new
   */
  it("should not open firstrun html when not new or updated", function() {
    var tabs_before = 0;
    var tabs_after = 0;
    var flag1,flag2;
    runs(function(){
      flag1 = false;
      var stored = getStoredVersion();
      var running = getPrivlyVersion();
      chrome.windows.getAll({populate:true},function(window_list){
        for(var i = 0; i < window_list.length; i++){
          chrome.tabs.query({windowId:parseInt(window_list[i].id,10),url:page},function(tab){
            tabs_before+= tab.length;
          });
          waits(500);
          if (i === window_list.length-1 && stored === running){
            flag1 = true;
          }
        }
      });
    });
    waitsFor(function(){
      return flag1;
    }, "Should have counted all tabs before",2000);
    runs(function(){
      flag2 = false;
      run_firstrun();
      chrome.windows.getAll({populate:true},function(window_list){
        for (var i = 0; i < window_list.length; i++){
          chrome.tabs.query({windowId:parseInt(window_list[i].id,10),url:page},function(tab){
            tabs_after += tab.length;
          });
          waits(500);
          if (i === window_list.length-1){
            close_window();
            flag2 = true;
          }
        }
      });
    });
    waitsFor(function(){
      return flag2;
    }, "Should have counted all tabs after",2000);
    runs(function(){
      expect(tabs_after).toEqual(tabs_before);
    });
  });

  /*
   * Test the function that launches the first_run.html page when new
   */
  it("should open firstrun html when new", function() {
    var stored = getStoredVersion();
    var running = getPrivlyVersion();
    var tabs_before = 0;
    var tabs_after = 0;
    var flag1,flag2;
    runs(function(){
      flag1 = false;
      chrome.windows.getAll({populate:true},function(window_list){
        for(var i = 0; i < window_list.length; i++){
          chrome.tabs.query({windowId:parseInt(window_list[i].id,10),url:page},function(tab){
            tabs_before+= tab.length;
          });
          waits(500);
          if (i === window_list.length-1){
            flag1 = true;
          }
        }
      })
    });
    waitsFor(function(){
      return flag1;
    }, "Should have counted all tabs before",2000);
    runs(function(){
      flag2 = false;
      update_version(null);
      run_firstrun();
      update_version(stored);
      var tabs_after = 0;
      chrome.windows.getAll({populate:true},function(window_list){
        for (var i = 0; i < window_list.length; i++){
          chrome.tabs.query({windowId:parseInt(window_list[i].id,10),url:page},function(tab){
            tabs_after += tab.length;
          });
          waits(500);
          if (i === window_list.length-1){
            close_window();
            flag2 = true;
          }
        }
      });
    });
    waitsFor(function(){
      return flag2;
    }, "Should have counted all tabs after",2000);
    runs(function(){
      expect(tabs_after).toEqual(tabs_before+1);
    });
  });

  /*
   * Test the function that launches the first_run.html page when updated
   */
  it("should open firstrun html when updated", function() {
    var stored = getStoredVersion();
    var running = getPrivlyVersion();
    var tabs_before = 0;
    var tabs_after = 0;
    var flag1,flag2;
    runs(function(){
      flag1 = false;
      chrome.windows.getAll({populate:true},function(window_list){
        for(var i = 0; i < window_list.length; i++){
          chrome.tabs.query({windowId:parseInt(window_list[i].id,10),url:page},function(tab){
            //console.log(tabs_before,tab.length);
            tabs_before+= tab.length;
          });
          waits(1000);
          if (i === window_list.length-1){
            //console.log(tabs_before);
            flag1 = true;
          }
        }
      });
    });
    waitsFor(function(){
      return flag1;
    }, "Should have counted all tabs before",2000);
    runs(function(){
      flag2 = false;
      //modify version in local storage
      update_version(stored+"99");
      run_firstrun();
      //reset version to original
      var tabs_after = 0;
      chrome.windows.getAll({populate:true},function(window_list){
        for (var i = 0; i < window_list.length; i++){
          chrome.tabs.query({windowId:parseInt(window_list[i].id,10),url:page},function(tab){
            //console.log(tabs_after,tab.length);
            tabs_after += tab.length;
          });
          waits(1000);
          if (i === window_list.length-1){
            //console.log(tabs_after);
            update_version(stored);
            close_window();
            flag2 = true;
          }
        }
      });
    });
    waitsFor(function(){
      return flag2;
    }, "Should have counted all tabs after",2000);
    runs(function(){
      console.log(tabs_after,tabs_before);
      expect(tabs_after).toEqual(tabs_before+1);
    });
  });*/
});


(function() {
  jasmine.getEnv().addReporter(new jasmine.ConsoleReporter());
  var jasmineEnv = jasmine.getEnv();
  jasmineEnv.execute();
})();
