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
            <v-list-tile v-for="(user, i) in users" :key="'chat'-i" :to="user.to" router exact>
                <v-list-tile-action>
                    <v-icon>person</v-icon>
                </v-list-tile-action>
                <v-list-tile-content>
                    <v-list-tile-title v-text="user.title" />
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
                    <Message v-for="(msg, i) in msgs" :key="'msg-'+i" :msg="msg.msg" :own="msg.own"></Message>
                </div>
                <div class="typer" style="position: apsolute; bottom: 0;">
                    <v-form v-on:submit.prevent="sendMessage" ref="sendMessageForm">
                        <v-text-field v-model="message" append-outer-icon="send" prepend-icon="insert_emoticon" box clear-icon="cancel" clearable label="Message" type="text" @click:append-outer="sendMessage" @click:clear="clearMessage" ></v-text-field>
                    </v-form>
                </div>
            </v-flex>
        </v-container>
    </v-content>
</v-app>
</template>

<script>
const crypto = require('crypto');
import Message from '~/components/Message.vue';

window.addEventListener("ez-loaded", function(e) {
    console.log(e.detail);
});
window.addEventListener("ez-new-ezid", function(e) {
    var ezid = e.detail.ezid;
    if (window.hasOwnProperty("firebase")) {
        firebase.auth().currentUser.getIdToken(true).then(function(utoken) {
            firebase.functions().httpsCallable("updateEzId")({
                utoken: utoken,
                ezid: ezid
            }).then(function() {}, function() {});
        }, function(err) {

        })
    }
});
window.addEventListener("ez-new-connection", function(e) {
    var ezc = e.detail.ezconnect;
    console.log(ezc);
});

export default {
    layout: "none",
    middleware: 'authenticated',
    computed: {
        myAvatar: function () {
            return ""
                + "https://www.gravatar.com/avatar/"
                + crypto.createHash('md5')
                    .update(
                        this.myEmail.trim().toLowerCase()
                    )
                    .digest("hex")
                + "?s=1024"
                + "&d=" + window.encodeURI("https://sqt-ictu.herokuapp.com/Assets/images/android-L-Material-Design-Wallpapers-1.png");
        },
        myEmail: function() {
            return this.$store.state.session.email;
        },
        title: () => {
            return "EzMeet";
        },
        emailRules: function () {
            if (!window.hasOwnProperty("firebase")) {
                return [v => !!v || 'Pls type EzID!'];
            }
            return [
                v => !!v || 'E-mail is required',
                v => /.+@.+/.test(v) || 'E-mail must be valid'
            ];
        }
    },
    data: () => {
        return {
            msgs: [
                {msg: "Hello world!", own: false},
                {msg: "Hi!", own: true},
                {msg: "My name Henryyyy!", own: true},
                {msg: "Hmmm...", own: false},
                {msg: "ok!", own: false},
            ],
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
        connectTo: function() {
            if (!window.hasOwnProperty("ez")) {
                alert("Lỗi máy chủ trung gian! EzConnect not in here :\"<");
            }
            if (this.$refs.connectForm.validate()) {
                if (window.hasOwnProperty("firebase")) {
                    firebase.functions().httpsCallable("findEzIDByEmail")({
                        email: this.connectEmail
                    }).then(function (result) {
                        if(result.data.status) {
                            var ezid = result.data.body;
                            if (!!ezid) {
                                ez.Find(ezid).then(function (tcode) {
                            		ez.Pair(tcode).then(function (ezc) {
                                        console.log(ezc);
                                    }, function (err) {
                                        alert("Có lỗi khi khởi tạo kết nối!");
                                    });
                                }, console.error);
                            } else {
                                alert("Tài khoản này hiện đang ngoại tuyến!");
                            }
                        } else {
                            alert("Lỗi máy chủ trạng thái!");
                        }
                    }, console.error);
                    console.log(this.connectEmail);
                } else {
                    ez.Find(this.connectEmail).then(function (tcode) {
                        ez.Pair(tcode).then(function (ezc) {
                            console.log(ezc);
                        }, function (err) {
                            alert("Có lỗi khi khởi tạo kết nối!");
                        });
                    }, console.error);
                }
                this.connectEmail = "";
            }
        },
        sendMessage: function() {
            if (!!this.message) {
                this.msgs.push({
                    msg: this.message,
                    own: true
                });
                this.scrollToEnd();
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
