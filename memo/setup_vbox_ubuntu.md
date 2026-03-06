# Setup:vbox:ubuntu

~~~
sudo apt update
sudo apt upgrade
sudo apt autoremove

sudo apt install git

wget https://github.com/git-ecosystem/git-credential-manager/releases/download/v2.7.0/gcm-linux-x64-2.7.0.deb
sudo dpkg -i gcm-linux-x64-2.7.0.deb

git config --global credential.helper manager
~~~
