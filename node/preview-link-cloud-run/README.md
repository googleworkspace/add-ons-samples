# Preview Links with Smart Chips and Cloud Run

<!-- TODO: Replace guide link -->
For more information on preview link with Smart Chips, please read the [guide]().

## Setup

### Authenticate

```sh
gcloud auth list
```

### Set active account

```sh
gcloud config set account <ACCOUNT>
```

### Set Project

```sh
gcloud config set project <PROJECT_ID>
```

## Enable Cloud APIs

```sh
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  cloudresourcemanager.googleapis.com \
  gsuiteaddons.googleapis.com
```

## Deploy to Cloud Run

### Grant Cloud Build permission to deploy

```sh
PROJECT_ID=$(gcloud config list --format='value(core.project)')
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
    --role=roles/run.admin
gcloud iam service-accounts add-iam-policy-binding \
    $PROJECT_NUMBER-compute@developer.gserviceaccount.com \
    --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
    --role=roles/iam.serviceAccountUser
```

### Start the build

```sh
gcloud builds submit
```

### Verify service is deployed

```sh
gcloud run services list --platform managed
```

## Register the add-on

### Upload the deployment descriptor

```sh
gcloud workspace-add-ons deployments create preview-link
```

### Authorize access to the add-on backend

```sh
SERVICE_ACCOUNT_EMAIL=$(gcloud workspace-add-ons get-authorization --format="value(serviceAccountEmail)")
gcloud run services add-iam-policy-binding preview-link --platform managed --region us-west1 --role roles/run.invoker --member "serviceAccount:$SERVICE_ACCOUNT_EMAIL"
```

###  Install the add-on

```sh
gcloud workspace-add-ons deployments install preview-link
```
