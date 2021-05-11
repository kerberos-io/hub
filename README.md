# Kerberos Hub

Kerberos Hub is the single pane of glass for your Kerberos agents. It comes with a best of breed best practices and allows you to build and maintain an everless scaling video surveillance and video analytics landscape.

## What's in the repo?
This repo describes how to install Kerberos Hub inside your own cluster using a helm chart.
A couple of dependency need to be installed first:
- A Kafka message queue,
- A Mongodb database,
- and a MQTT message broker (Vernemq).

Next to that one can use an Nginx ingress controller or Traefik for orchestrating the ingresses. Once all dependency are installed the appropriate values should be updated in the **values.yaml** file.

![hubdashboard](hub-dashboard.png)

## Add helm repos

    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add jetstack https://charts.jetstack.io
    helm repo add traefik https://helm.traefik.io/traefik
    helm repo update

## Install Kafka

Before installing the kafka helm chart, go and have a look in the kafka/values.yaml file. You should update the clientUsers and clientPasswords. Have a look at the zookeeper credentials as well and update accordingly.

    helm install kafka bitnami/kafka  -f ./kafka/values.yaml

## Install MongoDB

    kubectl apply -f ./mongodb/fast.yaml

Before installing the mongodb helm chart, go and have a look in the `mongodb/values.yaml` file. You should update the root password to a custom secure value.

    helm install mongodb bitnami/mongodb --values ./mongodb/values.yaml

## Vernemq

### Cert manager
    
    kubectl create namespace vernemq
    helm install cert-manager jetstack/cert-manager --namespace vernemq --set installCRDs=true

### Certificates

    kubectl apply -f vernemq/vernemq-issuer.yaml --namespace vernemq
    kubectl apply -f vernemq/vernemq-certificate.yaml --namespace vernemq

### Vernemq

    helm repo add vernemq https://vernemq.github.io/docker-vernemq
    helm install vernemq vernemq/vernemq -f vernemq/values.yaml  --namespace vernemq

## Install Nginx ingress

    kubectl apply -f nginx/nginx-issuer.yaml
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.46.0/deploy/static/provider/cloud/deploy.yaml

## or (option) Install traefik

     helm install traefik traefik/traefik -f ./traefik/values-ssl.yaml

### Kerberos Hub 

Install the `registry credentials` to download the Kerberos Hub and Kerberos Pipeline. You'll need to request the `regcred.yaml` from the Kerberos team, to be able to download the Kerberos Hub images.

    kubectl apply -f kerberoshub/regcred.yaml

Install the Kerberos Hub chart
    
    helm install kerberoshub kerberoshub --values kerberoshub/values.yaml

Uninstall the Kerberos Hub chart

    helm uninstall kerberoshub

### Post installation

After the installation you'll need to initialise the Mongodb with some objects. Have a look at the `mongodb/` folder, you'll find three files available:

- settings.nosql
- subscriptions.nosql
- users.nosql

Open your favourite Mongodb client (or cli) and connect to your Mongodb database as previously created (or have already installed). Import the previous mentioned `.nosql` files.
Once done you should be able to sign in with following credentials:

- username: youruser
- password: yourpassword