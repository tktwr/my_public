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

## Shared folder
~~~
sudo apt install build-essential dkms linux-headers-$(uname -r)
sudo VBoxLinuxAdditions.run
sudo usermod -a -G vboxsf {USER_NAME}
id
~~~

## Setup
~~~
LC_ALL=C xdg-user-dirs-gtk-update
~~~

## Fonts
~~~
HackGenConsoleNF-Bold.ttf
HackGenConsoleNF-Regular.ttf
~~~
