# Setup:vbox:ubuntu

## Update
~~~
sudo apt update
sudo apt upgrade
sudo apt autoremove
~~~

## git
~~~
# 1. Gitのインストール
sudo apt update && sudo apt install -y git

# 2. GCMのダウンロード（2.7.0を例に）
wget https://github.com/git-ecosystem/git-credential-manager/releases/download/v2.7.0/gcm-linux-x64-2.7.0.deb

# 3. インストール
sudo dpkg -i gcm-linux-x64-2.7.0.deb
sudo apt install -f  # 念のための依存関係修復

# 4. GCMの設定（manager-coreではなくmanagerでOK）
git-credential-manager configure

# 5. 保存先をUbuntu標準のキーチェーンに設定
git config --global credential.credentialStore secretservice
~~~
