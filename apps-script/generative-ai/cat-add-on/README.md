# AI Generated Cat - Google Workspace Add-on

This Google Workspace Add-on displays an AI-generated image of a cat in the Gmail side panel. Users can click a button to generate a new cat image.

The add-on leverages the Gemini 2.5 Flash image model via the Google Vertex AI API.

## Prerequisites

Before you begin, ensure you have the following:

1.  **Google Cloud Project:** A Google Cloud project to host the add-on and enable the Vertex AI API.
2.  **Google Cloud SDK:** The `gcloud` command-line tool installed and authenticated. You can find installation instructions [here](https://cloud.google.com/sdk/docs/install).
3.  **clasp:** The command-line tool for Apps Script development. Install it using npm:
    ```bash
    npm install -g @google/clasp
    ```

## Setup and Configuration

1.  **Enable the Vertex AI API:**

    Enable the Vertex AI API in your Google Cloud project:
    ```bash
    gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT_ID
    ```
    Replace `YOUR_PROJECT_ID` with your actual Google Cloud project ID.

2.  **Configure the Project ID:**

    Open the `Configuration.gs` file and update the `PROJECT_ID` constant with your Google Cloud project ID:
    ```javascript
    const PROJECT_ID = 'YOUR_PROJECT_ID';
    ```

3.  **Log in to clasp:**

    Authenticate `clasp` with your Google account:
    ```bash
    clasp login
    ```

## Deployment

1.  **Push the Apps Script Project:**

    Use `clasp` to push your local code to your Apps Script project:
    ```bash
    clasp push
    ```

2.  **Create a Google Workspace Add-on Deployment:**

    You can create a deployment using `gcloud` (recommended) or `clasp`.

    **Using `gcloud`:**
    Create a deployment for your add-on using the `gcloud` command:
    ```bash
    gcloud workspace-add-ons deployments create my-deployment --deployment-file=deployment.json
    ```

    **Using `clasp`:**
    Alternatively, you can create a deployment using `clasp`:
    ```bash
    clasp deploy
    ```

## Installation

To install the add-on for your own account, use the following command:

```bash
gcloud workspace-add-ons deployments install my-deployment
```

After installation, you should see the "AI Generated Cat" add-on in your Gmail side panel.

## OAuth Scopes

This add-on requires the following OAuth scopes:

*   `https://www.googleapis.com/auth/cloud-platform`: To access the Vertex AI API.
*   `https://www.googleapis.com/auth/gmail.addons.execute`: To run as a Gmail add-on.
*   `https://www.googleapis.com/auth/script.external_request`: To make external HTTP requests using `UrlFetchApp`.
