var wsUrl = "ws://" + location.host + "/websocket";
var socket = new WebSocket(wsUrl);

var PUBLIC_KEY = "";
var dialogs = {} // словарь, где ключ - это ключ собеседника, а значение - список сообщений
var lazyMessages = [];

socket.onopen = function() {
    if (PUBLIC_KEY == "") {
        socket.send(JSON.stringify({ Type: "GetMyKey" }));
    }
    socket.send(JSON.stringify({ Type: "GetMessages" }));
    socket.send(JSON.stringify({ Type: "GetContacts" }));
};

socket.onclose = function() {
    console.log("WS closed");
    socket = new WebSocket(wsUrl);
}

function sendMessage() {
    text = $('#texxt').val();
    if (text === "") {
        return
    }

    var newPublicKey = false
    if ($("#receiver-key").length === 0) {
        receiver = $("#top-name").attr("name");
        appendMessage(true, "ME: " + PUBLIC_KEY, text);
    } else if ($("#receiver-key").val() !== "") {
        receiver = $("#receiver-key").val();
        newPublicKey = true
    } else {
        return
    }
    msg = {
        Type: "SendMessage",
        Messages: [{
            Receiver: receiver,
            Sender: PUBLIC_KEY,
            Text: text,
            Time: Date.now(),
            NewPublicKey: newPublicKey
        }]
    }
    socket.send(JSON.stringify(msg))
}

socket.onmessage = function(event) {
    var message = JSON.parse(event.data);

    if (message['Type'] === 'AllMessages') {
        console.log("ALL MESSAGES");
        if (PUBLIC_KEY != "") {
            handleMessages(message['Messages']);
        } else {
            console.log("PUSHED");
            lazyMessages = lazyMessages.concat(message['Messages']);
        }
    } else if (message['Type'] === 'Key') {
        console.log("KEY");
        handlePublicKey(message['Key']);
        handleMessages(lazyMessages);
        lazyMessages = [];
    } else if (message['Type'] === 'NewMessage') {
        console.log("NEW MESSAGE: " + message['']);
        handleMessages(message['Messages']);
        addNewMessagesToViews(message['Messages']);
    } else if (message['Type'] === 'NewKeyHash') {
        addNewDialog(message['Key'], message['Messages']);
        viewDialogs();
        changeDialog(message['Key']).call();
    } else if (message['Type'] === 'AllContacts') {
        console.log("ALL CONTACTS");
        handleContacts(message['Contacts']);
    }
};

function handleMessages(messages) {
    messages.forEach(function (o) {
        if (o['Sender'] === PUBLIC_KEY || o['Receiver'] === PUBLIC_KEY) {
            if (o['Sender'] === PUBLIC_KEY) {
                dictAppend(dialogs, o['Receiver'], o);
            } else {
                dictAppend(dialogs, o['Sender'], o);
            }
        }
    });

    viewDialogs();
}

function handlePublicKey(key) {
    PUBLIC_KEY = key;
    console.log(PUBLIC_KEY);
}

function handleContacts(contacts) {
    console.log(contacts);
    contacts.forEach(function (o) {
        dictAppend(dialogs, o, null);
    });
    viewDialogs();
}

$(document).ready(function() {
    $("#new-user").click(function () {
        $(".messages").empty();
        $("#top-name").text("Новый получатель");
        if ($("#receiver-key").length === 0) {
            $(".top")
                .append($('<textarea placeholder="Публичный ключ получателя" name="e" id="receiver-key" rows="1"></textarea>'));
        }
    });
});


function dictAppend(dict, key, value_nullable) {
    // если значение null, то добавлять имеет смысл только пустой список
    // в случае не существования словаря
    if (value_nullable === null) {
        if (dict[key] === undefined) {
            dict[key] = [];
        }
        return
    }

    if (dict[key] !== undefined) {
        dict[key].push(value_nullable);
    } else {
        dict[key] = [value_nullable];
    }
}

function viewDialogs() {
    $(".dialog-list-elem").attr('active', 'no')
    $(".dialog-list-elem").remove();
    for (var user in dialogs) {
        listElem = $("<li></li>")
            .attr('id', "dialog-" + user)
            .attr('data', user)
            .attr('active', 'yes')
            .addClass('dialog-list-elem')
            .append($("<div></div>")
                .addClass("info")
                .append($("<div></div>")
                    .addClass("user")
                    .text(user.slice(0, 20) + "...")
                )
            );
        $(".list-friends").append(listElem)
    }
    console.log(dialogs);
    console.log($('.dialog-list-elem'));
    $("body").on('click', ".dialog-list-elem", function () {
        changeDialog($(this).attr('data')).call();
        $("#dialog-" + $(this).attr('data')).find("div.user").attr("style", "");
    });
}

function changeDialog(userKey) {
    return function () {
        $("#top-name").text(userKey);
        $("#top-name").attr("name", userKey);
        $(".messages").empty();
        $("#receiver-key").remove();
        dialogs[userKey].sort(function (a, b) {
            if (parseInt(a['Time']) > parseInt(b['Time'])) return 1;
            if (parseInt(a['Time']) < parseInt(b['Time'])) return -1;
        });
        for (var i in dialogs[userKey]) {
            msg = dialogs[userKey][i];
            if (msg["Sender"] === PUBLIC_KEY) {
                appendMessage(true, "ME: " + PUBLIC_KEY, msg["Text"]);
            } else {
                appendMessage(false, msg["Sender"], msg["Text"]);
            }
            console.log(dialogs[userKey][i]);
        }
    }
}

function appendMessage(my, sender, text) {
    var messageClass = "friend-with-a-SVAGina";
    if (my) {
        messageClass = "i";
    }

    $(".messages").append($("<li></li>")
        .attr("id", sender)
        .addClass(messageClass)
        .append($("<div></div>")
            .addClass("head")
//            .append($("<span></span>")
//                .addClass("time")
//                .text("10:13, 10.06.2016")
            .append($("<span></span>")
                .addClass("name")
                .text(sender.slice(0, 20) + "...")))
        .append($("<div></div>")
            .addClass("message")
            .text(text)));
}

function addNewMessagesToViews(messages) {
    messages.forEach(function (o) {
        if (o['Sender'] === PUBLIC_KEY || o['Receiver'] === PUBLIC_KEY) {
            if (o['Sender'] === PUBLIC_KEY) {
                addNewMessage(true, o['Receiver'], o);
            } else {
                console.log(o['Sender']);
                addNewMessage(false, o['Sender'], o);
            }
        }
    });
}

function addNewMessage(my, user, message) {
    console.log(user);
    console.log(message);
    console.log($("#top-name").val());
    if ($("#top-name").html() === user) {
        appendMessage(my, user, message['Text'])
    } else {
        $("#dialog-" + user).find("div.user").attr("style", "font-weight:bold");
    }
}

function addNewDialog(user, messages) {
    for (var i in messages) {
        dictAppend(dialogs, user, messages[i]);
    }
}