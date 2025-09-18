# Google Chat Connectivity App

This sample demonstrates how to create a Google Chat app that requests
authorization from the user to make API calls on their behalf. The first
time the user interacts with the app, it requests offline OAuth credentials for the
user and saves them to storage. If the user interacts with the app
again, the saved credentials are used so the app can make API calls on behalf of the
user without asking for authorization again. Once saved, the OAuth credentials could
even be used without any further user interactions.

This app is built using Node.js on Google App Engine (Standard Environment) and
leverages Google's OAuth2 for authorization and Firestore for data storage. It
replies with a Chat message that contains the link to a Meet space that was created
calling the Google Meet API with their consent.

**Key Features:**

* **User Authorization:** Securely requests user consent to call Meet API with
  their credentials.
* **Meet API Integration:** Calls Meet API to create a new Meet space on behalf
  of the user.
* **Google Chat Integration:** Responds to DMs and @mentions in Google Chat. If
  necessary, request configuration to start an OAuth authorization flow.
* **App Engine Deployment:** Provides step-by-step instructions for deploying
  to App Engine.
* **Cloud Firestore:** Stores user credentials in a Firestore database.

## Prerequisites

* **Node.js:**  [Download](https://www.nodejs.org/)
* **Google Cloud SDK:**  [Install](https://cloud.google.com/sdk/docs/install)
* **Google Cloud Project:**  [Create](https://console.cloud.google.com/projectcreate)

##  Deployment Steps

1. **Enable APIs:**

   * Enable the Cloud Firestore, Meet, and Google Chat APIs using the
     [console](https://console.cloud.google.com/apis/enableflow?apiid=firestore.googleapis.com,meet.googleapis.com,chat.googleapis.com)
     or gcloud:

     ```bash
     gcloud services enable firestore.googleapis.com meet.googleapis.com chat.googleapis.com
     ```

1. **Initiate Deployment to App Engine:**

   * Go to [App Engine](https://console.cloud.google.com/appengine) and
     initialize an application.

   * Deploy the app to App Engine:

     ```bash
     gcloud app deploy
     ```

1. **Create and Use OAuth Client ID:**

   * Get the app hostname:

     ```bash
     gcloud app describe | grep defaultHostname
     ```

   * In your Google Cloud project, go to
     [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials).
   * Click `Create Credentials > OAuth client ID`.
   * Select `Web application` as the application type.
   * Add `<hostname from the previous step>/oauth2` to `Authorized redirect URIs`.
   * Download the JSON file and rename it to `client_secrets.json` in your
     project directory.
   * Redeploy the app with the file `client_secrets.json`:

     ```bash
     gcloud app deploy
     ```

1. **Create a Firestore Database:**

   *  Create a Firestore database in native mode named `auth-data` using the
      [console](https://console.cloud.google.com/firestore) or gcloud:

      ```bash
      gcloud firestore databases create \
      --database=auth-data \
      --location=REGION \
      --type=firestore-native
      ```

      Replace `REGION` with a
      [Firestore location](https://cloud.google.com/firestore/docs/locations#types)
      such as `nam5` or `eur3`.

## Create the Google Chat app

* Go to
  [Google Chat API](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat)
  and click `Configuration`.
* In **App name**, enter `Connectivity App`.
* In **Avatar URL**, enter `https://developers.google.com/chat/images/quickstart-app-avatar.png`.
* In **Description**, enter `Connectivity app`.
* Under **Functionality**, select **Join spaces and group conversations**.
* Under **Connection settings**, select **HTTP endpoint URL**.
* Under **Triggers**, select **Use a common HTTP endpoint URL for all triggers**.
* In **HTTP endpoint URL** enter your App Engine app's URL (obtained in the previous
  deployment steps).
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
