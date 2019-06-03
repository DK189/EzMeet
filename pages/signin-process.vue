<template>
<v-layout column justify-center align-center>
    <v-flex xs12 sm8 md6>
        <v-card>
            <v-card-title class="headline" v-text="msg"></v-card-title>
        </v-card>
    </v-flex>
</v-layout>
</template>

<script>
var message = "Kiểm tra thông tin đăng nhập...";

export default {
    layout: "none",
    computed: {
        msg: function () {
            return message;
        }
    },
    data: () => {
        return {

        }
    },
    async validate({
        params,
        query,
        store,
        router,
        redirect
    }) {
        if (window.hasOwnProperty("firebase")) {
            if (firebase.auth().isSignInWithEmailLink(location.href)) {
                var email = query.email;
                if (!email) {
                    email = window.localStorage.getItem('emailForSignIn');
                }
                if (!email) {
                    return false;
                }

                var result = await firebase.auth().signInWithEmailLink(email, location.href);
                window.localStorage.removeItem('emailForSignIn');
                console.log(result);
                if (!result) {
                    message = "Thông tin đăng nhập không hợp lệ!!";
                    return true;
                }
                redirect("/meeting");
                return true;
            } else {
                message = "Lỗi ứng dụng!!";
                return true;
            }
        } else {
            var email = query.email;
            if (!email) {
                message = "Thông tin đăng nhập không hợp lệ!!";
                return true;
            }
            redirect("/meeting");
        }
        return true;
    },
    methods: {

    }
}
</script>
