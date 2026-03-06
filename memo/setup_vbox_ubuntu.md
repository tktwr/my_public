# Setup:vbox:ubuntu

## Update
~~~
sudo apt update
sudo apt upgrade
sudo apt autoremove
~~~

## git
~~~
sudo apt install -y git
wget https://github.com/git-ecosystem/git-credential-manager/releases/download/v2.7.0/gcm-linux-x64-2.7.0.deb
sudo dpkg -i gcm-linux-x64-2.7.0.deb
sudo apt install -f  # 念のための依存関係修復
git-credential-manager configure
git config --global credential.credentialStore secretservice
~~~
