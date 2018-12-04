var whiteboardId = getQueryVariable("whiteboardid");
whiteboardId = whiteboardId; //|| "SampleWhiteBoard";
var myUsername = getQueryVariable("username");
myUsername = myUsername; //|| "unknown" + (Math.random() + "").substring(2, 6);


var url = document.URL.substr(0, document.URL.lastIndexOf('/'));
var signaling_socket = null;
var urlSplit = url.split("/");
var subdir = "";
for (var i = 3; i < urlSplit.length; i++) {
    subdir = subdir + '/' + urlSplit[i];
}
if (subdir != "") {
    signaling_socket = io("", { "path": subdir + "/socket.io" }); //Connect even if we are in a subdir behind a reverse proxy
} else {
    signaling_socket = io();
}

signaling_socket.on('connect', function () {
    console.log("Websocket connected!");

    signaling_socket.on('drawToWhiteboard', function (content) {
        whiteboard.handleEventsAndData(content, true);
    });

    signaling_socket.on('refreshUserBadges', function () {
        whiteboard.refreshUserBadges();
    });
    signaling_socket.emit('joinWhiteboard', whiteboardId);
    signaling_socket.emit('join-user', myUsername);
    
});

$(document).ready(function () {
    whiteboard.loadWhiteboard("#whiteboardContainer", { //Load the whiteboard
        whiteboardId: whiteboardId,
        username: myUsername,
        sendFunction: function (content) {
            signaling_socket.emit('drawToWhiteboard', content);
        }
    });
    signaling_socket.emit('send-nickname', {'roomname':whiteboardId,'username':myUsername});
    //console.log("FUCK YOU ",myUsername);
    //console.log("FUCK YOU ",{'roomname':whiteboardId,'username':myUsername});
    $.get(subdir + "/loadwhiteboard", { wid: whiteboardId }).done(function (data) {
        whiteboard.loadData(data)
    });

    /*----------------/
	Whiteboard actions
    /----------------*/

    $("#whiteboardTrashBtn").click(function () {
        whiteboard.clearWhiteboard();
    });

    $("#whiteboardUndoBtn").click(function () {
        whiteboard.undoWhiteboardClick();
    });

    $(".whiteboardTool").click(function () {
        $(".whiteboardTool").removeClass("active");
        $(this).addClass("active");
        whiteboard.setTool($(this).attr("tool"));
    });

    $("#addImgToCanvasBtn").click(function () {
        alert("Just drag and drop images in!");
    });

    $("#saveAsImageBtn").click(function () {
        var imgData = whiteboard.getImageDataBase64();
        var a = document.createElement('a');
        a.href = imgData;
        a.download = 'whiteboard.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    $("#saveAsJSONBtn").click(function () {
        var imgData = whiteboard.getImageDataJson();
        var a = window.document.createElement('a');
        a.href = window.URL.createObjectURL(new Blob([imgData], { type: 'text/json' }));
        a.download = 'whiteboard.json';
        // Append anchor to body.
        document.body.appendChild(a);
        a.click();
        // Remove anchor from body
        document.body.removeChild(a);
    });

    $("#uploadJsonBtn").click(function () {
        $("#myFile").click();
    });

    $("#myFile").on("change", function () {
        var file = document.getElementById("myFile").files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var j = JSON.parse(e.target.result);
                whiteboard.loadJsonData(j);
            } catch (e) {
                alert("File was not a valid JSON!");
            }
        };
        reader.readAsText(file);
        $(this).val("");
    });

    var dragCounter = 0;
    $('#whiteboardContainer').on("dragenter", function (e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        whiteboard.dropIndicator.show();
    });

    $('#whiteboardContainer').on("dragleave", function (e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            whiteboard.dropIndicator.hide();
        }
    });

    $("#whiteboardThicknessSlider").on("change", function () {
        whiteboard.thickness = $(this).val();
    });

    $('#whiteboardContainer').on('drop', function (e) { //Handle drag & drop
        if (e.originalEvent.dataTransfer) {
            if (e.originalEvent.dataTransfer.files.length) { //File from harddisc
                e.preventDefault();
                e.stopPropagation();

                var filename = e.originalEvent.dataTransfer.files[0]["name"];
                if (isImageFileName(filename)) {
                    var blob = e.originalEvent.dataTransfer.files[0];
                    var reader = new window.FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = function () {
                        base64data = reader.result;
                        uploadImgAndAddToWhiteboard(base64data);
                    }
                } else {
                    console.error("File must be an image!");
                }
            } else { //File from other browser
                var fileUrl = e.originalEvent.dataTransfer.getData('URL');
                var imageUrl = e.originalEvent.dataTransfer.getData('text/html');
                var rex = /src="?([^"\s]+)"?\s*/;
                var url = rex.exec(imageUrl);
                if (url && url.length > 1) {
                    url = url[1];
                } else {
                    url = "";
                }

                isValidImageUrl(fileUrl, function (isImage) {
                    if (isImage && isImageFileName(url)) {
                        whiteboard.addImgToCanvasByUrl(fileUrl);
                    } else {
                        isValidImageUrl(url, function (isImage) {
                            if (isImage) {
                                if (isImageFileName(url)) {
                                    whiteboard.addImgToCanvasByUrl(url);
                                } else {
                                    var blob = items[i].getAsFile();
                                    uploadImgAndAddToWhiteboard(url);
                                }
                            } else {
                                console.error("Can only upload imagedata!");
                            }
                        });
                    }
                });
            }
        }
        dragCounter = 0;
        whiteboard.dropIndicator.hide();
    });

    // $('#whiteboardColorpicker').colorPicker({
    //     renderCallback: function (elm) {
    //         whiteboard.drawcolor = elm.val();
    //     }
    // });
});

//Prevent site from changing tab on drag&drop
window.addEventListener("dragover", function (e) {
    e = e || event;
    e.preventDefault();
}, false);
window.addEventListener("drop", function (e) {
    e = e || event;
    e.preventDefault();
}, false);

function submitContactForm(){
   
    var roomname = $('#roomname').val();
    var username = $('#username').val();

     if ((typeof roomname != 'undefined' && roomname) && (typeof username != 'undefined' && username)) {
        $('#basicExampleModal').modal('hide')
        window.location = "demo.html?whiteboardid="+roomname+"&username="+username;
     }
    
    
    console.log("From submit");
}

function createUserList(message){
    var arrayLength = message.length;
    var tbl = document.getElementById('kkbc');
    for (var i = 0; i < arrayLength; i++) {
        var output = document.getElementById('listuser');
        var row = document.createElement("tr");
        var name = document.createElement("td"); 
        var two = document.createElement("td"); 
        name.setAttribute('width', '100%');
        name.setAttribute('align', 'center');
        name.setAttribute('class', 'user');
        var kk = document.createElement("i");
        kk.setAttribute("class","fa fa-2x fa-user fw");
        name.appendChild(kk);
        var i1 = document.createElement("i");
        var i2 = document.createElement("i");
        i1.setAttribute("class","fa fa-comments");
        i2.setAttribute("class","fa fa-phone");
        two.textContent = message[i].username;
        var mybr = document.createElement('br');
        two.appendChild(mybr);
        two.appendChild(i1);
        two.appendChild(i2);
        row.appendChild(name);
        row.appendChild(two);
        output.appendChild(row);
    }
}
function uploadImgAndAddToWhiteboard(base64data) {
    var date = (+new Date());
    $.ajax({
        type: 'POST',
        url: document.URL.substr(0, document.URL.lastIndexOf('/')) + '/upload',
        data: {
            'imagedata': base64data,
            'whiteboardId': whiteboardId,
            'date': date
        },
        success: function (msg) {
            var filename = whiteboardId + "_" + date + ".png";
            whiteboard.addImgToCanvasByUrl(document.URL.substr(0, document.URL.lastIndexOf('/')) + "/uploads/" + filename); //Add image to canvas
            console.log("Image uploaded!");
        },
        error: function (err) {
            console.error("Failed to upload frame: " + JSON.stringify(err));
        }
    });
}

function isImageFileName(filename) {
    var ending = filename.split(".")[filename.split(".").length - 1];
    if (ending.toLowerCase() == "png" || ending.toLowerCase() == "jpg" || ending.toLowerCase() == "jpeg" || ending.toLowerCase() == "gif" || ending.toLowerCase() == "tiff") {
        return true;
    }
    return false;
}

function isValidImageUrl(url, callback) { //Check if given url it is a vaild img url
    var img = new Image();
    var timer = null;
    img.onerror = img.onabort = function () {
        clearTimeout(timer);
        callback(false);
    };
    img.onload = function () {
        clearTimeout(timer);
        callback(true);
    };
    timer = setTimeout(function () {
        callback(false);
    }, 2000);
    img.src = url;
}

window.addEventListener("paste", function (e) { //Even do copy & paste from clipboard
    if (e.clipboardData) {
        var items = e.clipboardData.items;
        if (items) {
            // Loop through all items, looking for any kind of image
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    // We need to represent the image as a file,
                    var blob = items[i].getAsFile();

                    var reader = new window.FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = function () {
                        console.log("Uploading image!");
                        base64data = reader.result;
                        uploadImgAndAddToWhiteboard(base64data);
                    }
                }
            }
        }
    }
});

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }
    return false;
}