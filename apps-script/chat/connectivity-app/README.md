# Google Chat Connectivity App

This sample demonstrates how to create a Google Chat app that requests
authorization from the user to make API calls on their behalf. The first
time the user interacts with the app, it requests offline OAuth credentials for the
user and saves them to storage. If the user interacts with the app
again, the saved credentials are used so the app can make API calls on behalf of the
user without asking for authorization again. Once saved, the OAuth credentials could
even be used without any further user interactions.

This app is built using Apps Script and leverages Google's OAuth2 for authorization
and Apps Script's User Properties for data storage. It replies with a Chat message
that contains the link to a Meet space that was created calling the Google Meet API
with their consent.

**Key Features:**

* **User Authorization:** Securely requests user consent to call Meet API with
  their credentials.
* **Meet API Integration:** Calls Meet REST API to create a new Meet space on behalf
  of the user.
* **Google Chat Integration:** Responds to DMs and @mentions in Google Chat. If
  necessary, request configuration to start an OAuth authorization flow.
* **Apps Script Deployment:** Provides step-by-step instructions for deploying
  to Apps Script.

## Prerequisites

* **Apps Script Project:**  [Create](https://script.google.com/home/projects/create)
* **Google Cloud Project:**  [Create](https://console.cloud.google.com/projectcreate)

##  Deployment Steps

1. **Enable APIs:**

   * Enable the Meet, and Google Chat APIs using the
     [console](https://console.cloud.google.com/apis/enableflow?apiid=meet.googleapis.com,chat.googleapis.com).

1. **Deploy Apps Script Project:**

   * Open the project from [Apps Script console](ttps://script.google.com).
   * In `Project Settings`, enable the option
     `Show "appsscript.json" manifest file in editor` and copy the `Script ID`.
   * In `Editor`, replace the source files `appsscript.json` and `Code.gs` with
     the ones found in this directory.
   * Click `Deploy` then `Test deployments` from the top right corner.
   * In the opened dialog, click `Install` and copy the `Head Deployment ID`.

1. **Create and Use OAuth Client ID:**

   * In your Google Cloud project, go to
     [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials).
   * Click `Create Credentials > OAuth client ID`.
   * Select `Web application` as the application type.
   * Add `https://script.google.com/macros/d/<Script ID from the previous step>/usercallback`
     to `Authorized redirect URIs`.
   * Download the JSON file and rename it to `client_secrets.json`.

1. **Configure Apps Script Project Auth:**

   * Go to back to the project from [Apps Script console](ttps://script.google.com).
   * In `Editor`, open the source file `Code.gs`.
   * Set the varibale value `CLIENT_SECRETS` to the entire content of the file
     `client_secrets.json` from the previous step.
   * Save to automatically deploy the change.

## Create the Google Chat app

* Go to
  [Google Chat API](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat)
  and click `Configuration`.
* In **App name**, enter `Connectivity App`.
* In **Avatar URL**, enter `https://developers.google.com/chat/images/quickstart-app-avatar.png`.
* In **Description**, enter `Connectivity app`.
* Under **Functionality**, select **Join spaces and group conversations**.
* Under **Connection settings**, select **Apps Script** and enter the
  `Head Deployment ID` (obtained in the previous deployment steps) in
  **Deployment ID**.
* Under **Commands**, click **Add a command**, and click **Done** after setting:
    * **Command Id** to `1`.
    * **Description** and **Quick command name** to `Logout`.
* Under **Visibility**, select **Make this Google Chat app available to specific
  people and groups in your domain** and enter your email address.
* Click **Save**.

## Interact with the App

* Message the app.
* Follow the authorization link to grant the app access to your account.
* Once authorization is complete, the app will reply with a link to the newly
  created Meet space.
* Message the app again, it will reply without asking for authorization.
* Execute the quick command `Logout`, it will deauthorizes the app.

## Related Topics

* [Authenticate and authorize Chat apps and Google Chat API requests](https://developers.google.com/workspace/chat/authenticate-authorize)
* [Build Google Chat interfaces](https://developers.google.com/workspace/add-ons/chat/build)
