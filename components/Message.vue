<template>
    <div :class="own ? 'message own' : 'message'">
        <div style="margin-top: 5px;"></div>
        <div class="content">
            <div v-text="msg"></div>
        </div>
    </div>
</template>
<script>
    export default {
        props: ["own", "msg"]
    }
</script>
<style>
    .message {
        margin-bottom: 3px;
    }

    .message.own {
        text-align: right;
    }

    .content {
        padding: 8px;
        background-color: #ececec;
        border-radius: 10px;
        display: inline-block;
        box-shadow: 0 1px 3px 0 rgba(0,0,0,.2), 0 1px 1px 0 rgba(0,0,0,.14), 0 2px 1px -1px rgba(0,0,0,.12);
        max-width: 50%;
        word-wrap: break-word;
    }
</style>
