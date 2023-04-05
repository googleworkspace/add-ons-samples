# Preview Links with Smart Chips

<!-- TODO: Replace guide link -->
For more information on preview link with Smart Chips, please read the [guide]().

This Cloud Function specifies link previews for two link preview triggers.
Alternatively, you can specify a Cloud Function for each trigger.
To learn about writing Cloud Functions,
see the documentation: https://cloud.google.com/functions/docs/writing.

## Create and deploy a Cloud Function

### Turn on the Cloud Functions, Cloud Build, and the Add-ons API

```sh
gcloud services enable cloudfunctions cloudbuild.googleapis.com gsuiteaddons.googleapis.com
```

### Deploy the function

```sh
gcloud functions deploy create_link_preview --runtime python311 --trigger-http
```

## Create an add-on deployment

### Find the service account email for the add-on

```sh
gcloud workspace-add-ons get-authorization
```

### Grant the service account the ``cloudfunctions.invoker`` role

```sh
gcloud functions add-iam-policy-binding create_link_preview \
    --role roles/cloudfunctions.invoker \
    --member serviceAccount:SERVICE_ACCOUNT_EMAIL
```

### Get URL of the deployed function

```sh
gcloud functions describe create_link_preview
```

Replace `$URL` in deployment.json with the deployed function URL

### Create the deployment

```sh
gcloud workspace-add-ons deployments create linkpreview \
    --deployment-file=deployment.json
```

## Install the add-on

```sh
gcloud workspace-add-ons deployments install linkpreview
```

