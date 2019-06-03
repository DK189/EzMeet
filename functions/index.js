const url = require('url');
const crypto = require('crypto');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require("nodemailer");
const axios = require("axios");
const cors = require('cors')({
    origin: true
});


admin.initializeApp(functions.config().firebase);

var store = axios.create({
    baseURL: 'https://labs.kingdark.org/'
});
store.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

exports.updateEzId = functions.https.onCall((data, context) => {
    return new Promise(function(resolve, reject) {
        var utoken = data.utoken;
        var ezid = data.ezid;
        admin.auth().verifyIdToken(utoken)
            .then(function(decodedToken) {
                var email = decodedToken.email;
                var emailHash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest("hex");
                console.log(email, emailHash, ezid);

                // var params = new url.URLSearchParams();
                // params.append(emailHash, ezid);
                store.post("/Storage/session.php?__SID=org.kingdark.ezmeet", emailHash + "=" + ezid)
                    .then(function(r){
                        console.log(r);
                        resolve({
                            status: true,
                            body: "OK"
                        });
                    },function(err){
                        console.log(err);
                        resolve({
                            status: false,
                            body: "-_-!!"
                        });
                    });
            }).catch(function(error) {
                console.log(error);
                resolve({
                    status: false,
                    body: "KingDark vạn tuế!"
                });
            });
    });
});

exports.findEzIDByEmail = functions.https.onCall((data, context) => {
    console.log(context);
    return new Promise(function(resolve, reject) {
        var email = data.email;
        var emailHash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest("hex");
        store.get(
            "/Storage/session.php?__SID=org.kingdark.ezmeet",
            {
                params: {
                    ezid: emailHash
                }
            }
        )
            .then(function (result) {
                console.log(result.data);
                resolve({
                    status: true,
                    body: result.data.body.ezid
                });
            }, function (err) {
                console.log(err);
                resolve({
                    status: false,
                    body: "KingDark vạn tuế!"
                });
            });
    });
});
