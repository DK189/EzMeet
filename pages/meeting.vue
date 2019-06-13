<template>
<v-app>
    <v-navigation-drawer v-model="drawer" clipped="clipped" fixed app>
        <v-card>
            <v-img :src="myAvatar" height="250px">
                <v-layout column fill-height>
                    <v-card-title>
                        <v-spacer></v-spacer>
                        <v-menu bottom left>
                            <template v-slot:activator="{ on }">
                                <v-btn dark icon v-on="on">
                                    <v-icon>more_vert</v-icon>
                                </v-btn>
                            </template>

                            <v-list>
                                <v-list-tile key="signout" @click="signout">
                                    <v-list-tile-title>Đăng xuất</v-list-tile-title>
                                </v-list-tile>
                            </v-list>
                        </v-menu>
                    </v-card-title>

                    <v-spacer></v-spacer>
                    <v-card-title class="white--text pl-5 pt-5">
                        <div class="pl-5 pt-5" v-text="myEmail"></div>
                    </v-card-title>
                </v-layout>
            </v-img>

            <v-list two-line>
                <v-form v-on:submit.prevent="connectTo" ref="connectForm" v-model="valid" lazy-validation>
                    <v-text-field v-model="connectEmail" :rules="emailRules" append-icon="done" box clear-icon="cancel" clearable label="Kết nối tới:" type="text" @click:append="connectTo"></v-text-field>
                </v-form>
            </v-list>
        </v-card>
        <v-list>
            <v-list-tile v-for="(user, i) in users" :key="'chat-'+i" @click.stop="chooseChat(user);">
                <v-list-tile-action>
                    <v-icon v-text="!!user.state ? user.state : (user.connected ? 'person' : 'warning')"></v-icon>
                </v-list-tile-action>
                <v-list-tile-content>
                    <v-list-tile-title v-text="user.title + (user.new_msg_count > 0 ? '(' + user.new_msg_count + ')' : '')" />
                </v-list-tile-content>
            </v-list-tile>
        </v-list>
    </v-navigation-drawer>
    <v-toolbar :clipped-left="true" fixed app>
        <v-toolbar-side-icon @click="drawer = !drawer" />
        <v-toolbar-title v-text="title" />
    </v-toolbar>
    <v-content>
        <v-container>
            <v-flex class="chat-area" xs12 sm12 md12 style="position: relative;">
                <div ref="msgArea" class="messages-area" style="position: apsolute;">
                    <div v-if="!current_chat.email">
                        No User
                    </div>
                    <Message v-if="msgs.length > 0" v-for="(msg, i) in msgs" :key="'msg-'+i" :msg="msg.msg" :own="msg.own"></Message>
                    <!-- <div v-if="!!current_chat.email && msgs.length <= 0">
                        loading...
                    </div> -->
                </div>
                <div class="typer" style="position: apsolute; bottom: 0;">
                    <v-form v-on:submit.prevent="sendMessage" ref="sendMessageForm">
                        <v-text-field v-model="message" append-outer-icon="send" prepend-icon="insert_emoticon" box clear-icon="cancel" clearable label="Message" type="text" @click:append-outer="sendMessage" @click:clear="clearMessage"></v-text-field>
                    </v-form>
                </div>
            </v-flex>
        </v-container>
    </v-content>
</v-app>
</template>

<script>
const DB_NAME = "ezmeet-data";
const crypto = require('crypto');
import Message from '~/components/Message.vue';

// indexedDB.deleteDatabase(DB_NAME); // remove it for release

var db;
var dbReq = window.indexedDB.open(DB_NAME, 1);
dbReq.onupgradeneeded = function(e) {
    console.log("dbReq.onupgradeneeded", e);
    var dbSchema = e.target.result;
    switch (e.oldVersion) {
        case 0:
            if (!dbSchema.objectStoreNames.contains('connector')) {
                var connectorsOS = dbSchema.createObjectStore('connector', {
                    keyPath: 'email'
                });
                connectorsOS.createIndex("time", "time", {
                    unique: false
                });
            }
            if (!dbSchema.objectStoreNames.contains('message')) {
                var messagesOS = dbSchema.createObjectStore('message', {
                    keyPath: 'mid'
                });
                messagesOS.createIndex("from", "from", {
                    unique: false
                });
                messagesOS.createIndex("to", "to", {
                    unique: false
                });
                messagesOS.createIndex("time", "time", {
                    unique: false
                });
            }
            // connectorsOS.createIndex("time", "time", {unique: false});
        case 1:
            //
        case 2:
            //
        case 3:
            //
    }
};


window.addEventListener("ez-loaded", function(e) {
    console.log(e);
});
window.addEventListener("ez-new-ezid", function(e) {
    var ezid = e.detail.ezid;
    if (window.hasOwnProperty("firebase")) {
        firebase.auth().onAuthStateChanged(function(user) {
            user.getIdToken(true).then(function(utoken) {
                firebase.functions().httpsCallable("updateEzId")({
                    utoken: utoken,
                    ezid: ezid
                }).then(function() {}, function() {});
            }, function(err) {

            })
        });
    }
});

const hak_vue = () => {
    return $nuxt.$children[1].$children[0].$children[0].$children[0];
};

var _users, _msgs, _current_chat, _miniUsers = {};
var Connections = {};
var Chats = {};

function chooseChat(user) {
    if (!user || _current_chat.email == user.email) {
        return;
    }
    _current_chat.user = user;
    _current_chat.email = user.email;
    if (!!_current_chat.email) {
        var tx = db.transaction("message", "readwrite");
        var mOS;
        mOS = tx.objectStore("message").index("from");
        mOS.getAll(_current_chat.email).onsuccess = function(e1) {
            mOS = tx.objectStore("message").index("to");
            mOS.getAll(_current_chat.email).onsuccess = function(e2) {
                var msgs = e1.target.result.concat(e2.target.result).sort(function(x, y) {
                    return x.time == y.time ? 0 : (x.time > y.time ? 1 : -1);
                });
                msgs.forEach(function(msg) {
                    _msgs.push({
                        msg: msg.message,
                        own: msg.from != _current_chat.email
                    });
                });
                if (!Connections[_current_chat.email] || Connections[_current_chat.email].connectionState == "disconnected") {
                    hak_vue().connectToMail(_current_chat.email);
                }
                setTimeout(function() {
                    hak_vue().scrollToEnd();
                }, 200);
            }
        };
        _miniUsers[_current_chat.email].new_msg_count = 0;
    }
}

function connectTo(email) {

}

function receiveMsgHandle(e) {
    var channel = e.currentTarget;
    var data = JSON.parse(e.data);
    console.log(channel._email, data);

    firebase.auth().onAuthStateChanged(function(user) {
        (function(email, user, data) {
            var from, to, now, msg;
            now = Date.now();
            msg = data.msg;

            from = email;
            to = user.email;

            var tx = db.transaction("message", "readwrite");
            var mOS = tx.objectStore("message");
            mOS.add({
                mid: from + "$" + to + "$" + now,
                from: from,
                to: to,
                time: now,
                message: msg
            });
            if (_current_chat.email == email) {
                _msgs.push({
                    msg: msg,
                    own: false
                });
                setTimeout(function () {
                    hak_vue().scrollToEnd();
                }, 200);
            } else {
                _miniUsers[email].new_msg_count += 1;
            }
        })(channel._email, user, data);
    });
}

export default {
    layout: "none",
    middleware: 'authenticated',
    validate(ctx) {
        // ctx.$set(ctx, "msgs", [{msg: "dsad", own: true}]);

        console.log("this", this, hak_vue);
        console.log("validate", arguments);
        const JOB_COUNT = 4;
        var doneResult = true;
        var doneCounter = 0;

        const doneReport = function(result, resolve, doneCallback, progressCallback) {
            if (!result) {
                doneResult = false;
            }
            doneCounter += 1;
            if (doneCounter >= JOB_COUNT) {
                resolve(doneResult);


                setTimeout(function() {

                    window._current_chat = _current_chat = hak_vue().$set(hak_vue(), "current_chat", {});
                    window._users = _users = hak_vue().$set(hak_vue(), "users", []);
                    window._msgs = _msgs = hak_vue().$set(hak_vue(), "msgs", []);

                    new Promise(function(resolve, reject) {
                        var tx = db.transaction("connector", "readonly");
                        var cOS = tx.objectStore("connector");
                        cOS = cOS.index("time");
                        cOS.getAll().onsuccess = function(e) {
                            console.log(e.target.result);
                            var users = e.target.result.sort(function(x, y) {
                                return x.time == y.time ? 0 : (x.time > y.time ? -1 : 1);
                            });
                            users.forEach(function(conn) {
                                var count = _users.push({
                                    state: "warning",
                                    title: conn.email,
                                    email: conn.email,
                                    to: "#" + conn.email,
                                    new_msg_count: 0
                                });
                                _miniUsers[conn.email] = _users[count - 1];
                            });
                            console.log(_users);
                            resolve(_users.length > 0 ? _users[0] : null);
                        };
                    }).then(function(firstUser) {
                        chooseChat(firstUser);
                    });

                }, 0);
            }
            console.log("doneReport", doneCounter, "/", JOB_COUNT, result);
            return doneCounter >= JOB_COUNT;
        };


        window.addEventListener("ez-new-connection", function(e) {
            console.log("ez-new-connection", ctx);
            var ezc = e.detail.ezconnect;
            console.log(ezc);
            ezc.onconnectionstatechange = function(e) {
                var peer = e.target;
                console.log(peer.connectionState);
                if (peer.connectionState == "connected") {
                    var email;
                    peer.ondatachannel = function(dc_evt) {
                        console.log(dc_evt);
                        var channel = dc_evt.channel;
                        if (channel.label == "system") {
                            channel.onmessage = function(e) {
                                console.log(e.data);
                                var cmd = JSON.parse(e.data);
                                if (cmd.cmd == "connect-from") {
                                    email = cmd.email;

                                    Connections[email] = peer;

                                    var user;
                                    var check = _users.filter(function(user) {
                                        return user.email == email;
                                    });
                                    if (check.length > 0) {
                                        user = check[0];
                                        user.state = "person";
                                    } else {
                                        var tx = db.transaction("connector", "readwrite");
                                        var cOS = tx.objectStore("connector");
                                        cOS.add({
                                            email: email,
                                            time: Date.now(),
                                        });

                                        user = _users.push({
                                            state: "warning",
                                            email: email,
                                            title: email,
                                            to: "#" + email,
                                            new_msg_count: 0
                                        });
                                        user = _users[user - 1];
                                        user.state = "person";
                                        _miniUsers[email] = user;
                                    }
                                    if (_users.length == 1) {
                                        chooseChat(user);
                                    }
                                }
                            }
                        } else if (channel.label == "chat") {
                            console.log(email, channel);
                            Chats[email] = channel;
                            channel._email = email;
                            channel.onmessage = receiveMsgHandle;
                        }
                    };
                }
            }
        });
        window.addEventListener("onhashchange", function(e) {
            console.log("onhashchange", e, ctx);
        });


        return new Promise(function(resolve, reject) {
            if (window.hasOwnProperty("ez")) {
                doneReport(true, resolve);
                console.log("ez");
            } else {
                window.addEventListener("ez-loaded", function(e) {
                    console.log("ez-loaded");
                    doneReport(true, resolve);
                });
            }
            if (dbReq.readyState != "done") {
                dbReq.onerror = function(e) {
                    console.log("dbReq.onerror", e);
                    doneReport(false, resolve);
                }
                dbReq.onsuccess = function(e) {
                    console.log("dbReq.onsuccess", e);
                    window.db = db = e.target.result;
                    doneReport(true, resolve);
                };
            } else {
                console.log("dbReq-done");
                window.db = db = dbReq.result;
                doneReport(true, resolve);
            }

            if (window.hasOwnProperty("firebase")) {
                firebase.auth().onAuthStateChanged(function() {
                    console.log("firebase-auth");
                    doneReport(true, resolve);
                });
            } else {
                console.log("firebase-not");
                doneReport(true, resolve);
            }
            setTimeout(function() {
                doneReport(true, resolve);
                console.log("delay0s", doneCounter);
            }, 0);
        });
    },
    computed: {
        urihash: function() {
            return location.hash;
        },
        myAvatar: function() {
            return "" +
                "https://www.gravatar.com/avatar/" +
                crypto.createHash('md5')
                .update(
                    this.myEmail.trim().toLowerCase()
                )
                .digest("hex") +
                "?s=1024" +
                "&d=" + window.encodeURI("https://sqt-ictu.herokuapp.com/Assets/images/android-L-Material-Design-Wallpapers-1.png");
        },
        myEmail: function() {
            return this.$store.state.session.email;
        },
        title: () => {
            return "EzMeet";
        },
        emailRules: function() {
            if (!window.hasOwnProperty("firebase")) {
                return [v => !!v || 'Pls type EzID!'];
            }
            return [
                v => !!v || 'E-mail is required',
                v => /.+@.+/.test(v) || 'E-mail must be valid'
            ];
        },
        abc: async function() {
            return new Promise(function(resolve, reject) {
                set
            });
        }
    },
    data: () => {
        return {
            current_chat: {
                email: null
            },
            msgs: [],
            drawer: true,
            valid: false,
            connectEmail: "",
            message: "",
            users: [{
                title: 'tada@kingdark.org',
                to: '#tada@kingdark.org'
            }, ]
        }
    },
    methods: {
        w: function() {
            return window;
        },
        self() {
            return this;
        },
        chooseChat(user) {
            chooseChat(user);
        },
        doConnectTo: function(ezid, displayname, email) {
            var self = this;
            email = email || "test@ezmeet.kingdark.org";
            ez.Find(ezid).then(function(tcode) {
                ez.Pair(tcode).then(function(ezc) {
                    console.log(ezc);
                    Connections[email] = ezc;

                    var user;
                    var check = _users.filter(function(user) {
                        return user.email == email;
                    });
                    if (check.length > 0) {
                        user = check[0];
                        user.state = "warning";
                    } else {
                        var tx = db.transaction("connector", "readwrite");
                        var cOS = tx.objectStore("connector");
                        cOS.add({
                            email: email,
                            time: Date.now(),
                        });

                        user = _users.push({
                            state: "warning",
                            email: email,
                            title: email,
                            to: "#" + email,
                            new_msg_count: 0
                        });
                        user = _users[user - 1];
                        _miniUsers[email] = user;
                    }

                    ezc.onconnectionstatechange = function(e) {
                        console.log(e);
                        console.log(e.target.connectionState);
                        if (e.target.connectionState == "connected") {
                            user.state = "person";
                            var sysChan = ezc.createDataChannel("system");
                            sysChan.onopen = function(e) {
                                console.log(e);
                                firebase.auth().onAuthStateChanged(function(user) {
                                    sysChan.send(JSON.stringify({
                                        "cmd": "connect-from",
                                        "email": user.email
                                    }));
                                    var chatChan = ezc.createDataChannel("chat");
                                    chatChan.onopen = function(e) {
                                        console.log(email, chatChan);
                                        Chats[email] = chatChan;
                                        chatChan._email = email;
                                        chatChan.onmessage = receiveMsgHandle;
                                    }
                                });
                            };
                        }
                    }
                }, function(err) {
                    setTimeout(function() {
                        self.connectToMail(email);
                    }, 500);
                });
            }, console.error);
        },
        connectToMail: function(email) {
            var self = this;
            if (typeof(email) == "string") {
                if (!!Connections[email]) {
                    if (Connections[email].connectionState != "disconnected") {
                        return;
                    }
                }

                console.log("connect", email, window.hasOwnProperty("firebase"));
                if (window.hasOwnProperty("firebase")) {
                    firebase.functions().httpsCallable("findEzIDByEmail")({
                        email: email
                    }).then(function(result) {
                        if (result.data.status) {
                            var ezid = result.data.body;
                            if (!!ezid) {
                                self.doConnectTo(ezid, email.toLowerCase(), email.toLowerCase());
                            } else {
                                alert("Tài khoản này hiện đang ngoại tuyến!");
                            }
                        } else {
                            alert("Lỗi máy chủ trạng thái!");
                        }
                    }, console.error);
                }
            }
        },
        connectTo: function() {
            if (!window.hasOwnProperty("ez")) {
                alert("Lỗi máy chủ trung gian! EzConnect not in here :\"<");
            }
            this.connectEmail = this.connectEmail.trim();
            if (this.$refs.connectForm.validate()) {
                if (window.hasOwnProperty("firebase")) {
                    this.connectToMail(this.connectEmail);
                    console.log(this.connectEmail);
                } else {
                    this.doConnectTo(this.connectEmail, this.connectEmail);
                }
                this.$refs.connectForm.reset();
            }
        },
        sendMessage: function() {
            if (!_current_chat.email || !Connections[_current_chat.email] || !Chats[_current_chat.email]) {
                alert("Vui lòng chờ kết nối hoàn tất trước khi bắt đầu nhắn tin!");
                return;
            }
            if (Connections[_current_chat.email].connectionState == "disconnected") {
                alert("Người dùng đã thoát, vui lòng thử lại sau!");
                return;
            }
            var self = this;
            if (!!this.message) {
                var msg = this.message;
                var data = {msg: msg};

                Chats[_current_chat.email].send(JSON.stringify(data));

                firebase.auth().onAuthStateChanged(function(user) {
                    (function(email, user, data) {
                        var from, to, now, msg;
                        now = Date.now();
                        msg = data.msg;

                        from = user.email;
                        to = email;

                        var tx = db.transaction("message", "readwrite");
                        var mOS = tx.objectStore("message");
                        mOS.add({
                            mid: from + "$" + to + "$" + now,
                            from: from,
                            to: to,
                            time: now,
                            message: msg
                        });
                        _msgs.push({
                            msg: msg,
                            own: true
                        });
                        setTimeout(function () {
                            self.scrollToEnd();
                        }, 200);
                    })(_current_chat.email, user, data);
                });

                this.message = "";
            }
        },
        clearMessage: function() {

        },
        openEmoji: function() {

        },
        scrollToEnd: function() {
            var container = this.$refs.msgArea;
            container.scrollTop = container.scrollHeight;
        },
        signout: function() {
            if (window.hasOwnProperty("firebase")) {
                firebase.auth().signOut();
            } else {
                console.log("logout_done");
            }
            window.indexedDB.deleteDatabase(DB_NAME);
            this.redirect("/");
        }
    },
    components: {
        Message,
    }
}
</script>
<style media="screen">
.chat-area {}

.messages-area {
    height: calc(100vh - 14rem);
    overflow-y: auto;
}

.typer {}
</style>
