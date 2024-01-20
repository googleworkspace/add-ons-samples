# Third-Party Resources

The solution is made of two Cloud Functions, one for the two link preview triggers and
one for the third-party resource create action trigger.
To learn about writing Cloud Functions,
see the documentation: https://cloud.google.com/functions/docs/writing.

For more information on preview link with Smart Chips, please read the
[guide](https://developers.google.com/apps-script/add-ons/editors/gsao/preview-links).

For more information on creating third-party resources from the @ menu, please read the
[guide](https://developers.devsite.corp.google.com/workspace/add-ons/guides/create-insert-resource-smart-chip).

## Create and deploy the Cloud Functions

### Turn on the Cloud Functions, Cloud Build, and the Add-ons API

```sh
gcloud services enable cloudfunctions cloudbuild.googleapis.com gsuiteaddons.googleapis.com
```

### Deploy the functions

```sh
gcloud functions deploy create_link_preview --runtime python312 --trigger-http --source ./create_link_preview
gcloud functions deploy create_3p_resources --runtime python312 --trigger-http --source ./create_3p_resources
```

### Set the URL of the create3pResources function

```sh
gcloud functions describe create_3p_resources
```

Run the following command after having replaced `$URL` with the deployed
function URL retrieved previously to set the environment variable `URL`.

```sh
gcloud functions deploy create_3p_resources --update-env-vars URL=$URL
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
gcloud functions add-iam-policy-binding create_3p_resources \
    --role roles/cloudfunctions.invoker \
    --member serviceAccount:SERVICE_ACCOUNT_EMAIL
```

### Set the URLs of the deployed functions

```sh
gcloud functions describe create_link_preview
gcloud functions describe create_3p_resources
```

Replace `$URL1` in deployment.json with the first deployed function URL
and replace `$URL2` in deployment.json with the second deployed function URL.

### Create the deployment

```sh
gcloud workspace-add-ons deployments create manageSupportCases \
    --deployment-file=deployment.json
```

## Install the add-on

```sh
gcloud workspace-add-ons deployments install manageSupportCases
```