import axios from "axios";

export async function sendToWebhook(url: string, msg: string) {
    //send the timestamp and the args to the webhook
    try {
        await axios.post(url, {
          content: msg
        });
    } catch (err) {
        //if its an axios error, log the error message
        if(err.response) {
            console.fatal("Error sending to webhook", err.response.data);
            return;
        }
    }
}