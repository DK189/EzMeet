export const state = () => ({
    email: ""
})

export const mutations = {
    setUser (state, u) {
        state.email = u.email;
    },
}
