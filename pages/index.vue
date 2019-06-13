<template>
<v-layout column justify-center align-center>
    <v-flex xs12 sm8 md6>
        <div class="text-xs-center">
            <vuetify-logo />
        </div>
        <v-card>
            <v-card-title class="headline">Đăng nhập</v-card-title>
            <v-form v-on:submit.prevent="doSignin" ref="signinForm" v-model="valid" lazy-validation>
                <v-card-text>
                    <v-text-field :disabled="signinBtnDisabled"  v-model="email" :rules="emailRules" label="E-mail" required></v-text-field>
                    <p>Sử dụng email để đăng nhập.</p>
                    <p>Sau khi tiếp tục, một mail chứa thông tin đăng nhập sẽ được gửi vào hộp thư trên.</p>
                    <p>Vui lòng làm theo hướng dẫn đó để truy cập ứng dụng.</p>
                </v-card-text>
            </v-form>
            <v-card-actions>
                <v-spacer />
                <v-btn color="primary" :disabled="signinBtnDisabled" flat @click.stop="doSignin">Continue</v-btn>
            </v-card-actions>
        </v-card>
    </v-flex>
    <v-dialog v-model="dialog" width="500">
        <v-card>
            <v-card-title class="headline grey lighten-2" primary-title>
                Thao tác thành công
            </v-card-title>

            <v-card-text>
                Vui lòng kiểm tra hộp thư đến để tiếp tục đăng nhập!
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" flat @click="dialog = false">
                    OK
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</v-layout>
</template>

<script>
import Logo from '~/components/Logo.vue'
import VuetifyLogo from '~/components/VuetifyLogo.vue'

export default {
    layout: "none",
    components: {
        Logo,
        VuetifyLogo
    },
    data: () => {
        return {
            dialog: false,
            valid: false,
            email: '',
            emailRules: [
                v => !!v || 'E-mail is required',
                v => /.+@.+/.test(v) || 'E-mail must be valid'
            ],
            signinBtnDisabled: false
        }
    },
    methods: {
        doSignin: function(e) {
            var self = this;
            this.signinBtnDisabled = true;
            if (this.$refs.signinForm.validate()) {
                console.log(this.valid, this.email);

                if (window.hasOwnProperty("firebase")) {
                    firebase.auth().sendSignInLinkToEmail(this.email, {
                        url: location.origin + "/signin-process?login=quick-email&email=" + this.email,
                        handleCodeInApp: true
                    }).then(function () {
                        window.localStorage.setItem('emailForSignIn', self.email);
                        self.dialog = true;
                        self.signinBtnDisabled = false;
                    }, function () {
                        alert("Lỗi hệ thống!");
                        self.signinBtnDisabled = false;
                    });
                } else {
                    setTimeout(function () {
                        self.dialog = true;
                        self.signinBtnDisabled = false;
                        console.log(123);
                    }, 800);

                    console.log(1234);
                }
            } else {
                this.signinBtnDisabled = false;
            }
            return false;
        },
    }
}
</script>
