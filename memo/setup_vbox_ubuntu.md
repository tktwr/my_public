# Setup:vbox:ubuntu

~~~
sudo apt update
sudo apt upgrade
sudo apt autoremove

sudo apt install git
wget https://github.com/git-ecosystem/git-credential-manager/releases/latest/download/gcm-linux_amd64.deb
sudo dpkg -i gcm-linux_amd64.deb
git config --global credential.helper manager
~~~
