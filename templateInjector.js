const StorageID = "rdbrck-JiraDescriptions-test2";

$(document).on('click', "#description", function() {
    var text = $(this).val();
    var cursorStart = $(this).prop("selectionStart");
    var cursorFinish = $(this).prop("selectionEnd");
    var selectStart = null;
    var selectEnd = null;

    // Only proceed if this is a click. i.e. not a highlight
    if (cursorStart == cursorFinish) {
        // Look for opening tag "<DT>"
        for(var i = cursorStart; i >= 4; i--){
            if(i != 4){
                if(text.slice((i-5),(i)) == "</TI>"){
                    // Found closing tag before opening tag -> We are not withing any valid tags
                    break;
                }
            }
            if(text.slice((i-4),(i)) == "<TI>"){
                // Found opening Tag!
                selectStart = (i-4);
                break;
            }
        }

        if(selectStart){
            // Look for closing tag "</DT>"
            var end = (text.length - 5);
            for(var i = cursorStart; i <= end; i++) {

                if(text.slice((i), (i+4)) == "<TI>"){
                    // Found another opening bracket before closing bracket. Exit search
                    break;
                }
                if(text.slice((i), (i+5)) == "</TI>") {
                    // Found closing Tag!
                    selectEnd = (i+5);
                    break;
                }
            }
            if(selectEnd){
                // Select all the text between the two tags
                $(this)[0].setSelectionRange(selectStart, selectEnd);
            }
        }
    }
});

function isDefaultDescription(value, callback) {
    chrome.storage.sync.get(StorageID, function(templates) {
        templates = templates[StorageID];
        var match = false;
        
        // Check if it's empty
        if (value == "") {
            match = true;
        }

        //Check if we've already loaded a template
        if (!match){
            $.each(templates, function(key, template) {
                if(value == template['text']){
                    match = true;
                    return false;
                }
            });
        }

        callback(match);
    });
}


function injectDescriptionTemplate(descriptionElement) {
    // Each issue type can have its own template
    chrome.storage.sync.get(StorageID, function(templates) {
        templates = templates[StorageID];

        // Load default template if set. Individual Templates will over ride it.
        var templateText = "";
        if(templates['DEFAULT TEMPLATE']){
            templateText = templates['DEFAULT TEMPLATE']['text'];
        }

        var issueTypeElement = document.getElementById('issuetype-field');
        if (issueTypeElement != null) {
            $.each(templates, function(key, template) {
                if(issueTypeElement.value == template['issuetype-field']){
                    templateText = template['text'];
                    return false;
                }
            });
            descriptionElement.value = templateText;
        } else {
            console.error("*** Error: Element Id 'issuetype-field' not found.");
        }
    });
}


function descriptionChangeEvent(changeEvent) {
    // the description field has been changed, turn the dirtyDialogMessage back on and remove the listener
    changeEvent.target.className = changeEvent.target.className.replace(" ajs-dirty-warning-exempt", "");
    changeEvent.target.removeEventListener("change", descriptionChangeEvent);
    
}

function observeDocumentBody(mutation) {
    if (document.getElementById("create-issue-dialog") != null) { // only interested in document changes related to Create Issue Dialog box        
        if (mutation.target.id == "description") { // only interested in the description field
            var descriptionElement = mutation.target
            isDefaultDescription(descriptionElement.value, function(result){
                if (result) { // only inject if description field has not been modified by the user
                    injectDescriptionTemplate(descriptionElement);
                    if (descriptionElement.className.indexOf("ajs-dirty-warning-exempt") == -1) { // default template injection should not pop up dirtyDialogMessage
                        descriptionElement.className += " ajs-dirty-warning-exempt";
                        descriptionElement.addEventListener("change", descriptionChangeEvent);
                    }
                }
            });
        }
    }
}

var observer = new MutationObserver(function(mutations) {
	mutations.forEach(observeDocumentBody);
});

observer.observe(document.body, {subtree: true, attributes: true, attributeFilter: ["resolved"]});
