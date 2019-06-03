export default async function({
    store,
    redirect
}) {
    return new Promise(function(resolve, reject) {
        if (window.hasOwnProperty("firebase")) {
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    store.commit("session/setUser", user);
                    resolve(true);
                } else {
                    store.commit("session/setUser", {email:""});
                    resolve(redirect('/'));
                }
                console.log(user);
                console.log(store.state.session);
            });
        } else {
            store.commit("session/setUser", {
                email: "test@kingdark.org"
            });
            console.log(store.state.session);
            resolve(true);
        }
    });
}
